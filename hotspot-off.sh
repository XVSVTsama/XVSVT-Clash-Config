#!/system/bin/sh
# 手动：关闭热点共享代理，把 hotspot-on.sh 做的事全部还原
#
# 一次做完，不需要再去别处点：
#   1. 删掉 mihomo 覆写脚本 rules 里带 // hotspot-lan 标记的规则
#      （IPv4 一条 + 可能存在的 IPv6 /128）
#   2. 恢复热点网卡自身的 IPv6（sysctl）
#   3. 删掉拦 IPv6 路由通告的 ip6tables 规则
#   4. 把 box-auto.conf 的 HOTSPOT_SHARE 改回 off
#   5. 重新生成启动配置，并重启核心让它生效
#
# 用法：
#   sh hotspot-off.sh        关闭
#   sh hotspot-off.sh -n     只打印，什么都不改
#   sh hotspot-off.sh --no-apply     改完不自动让核心生效（自己点重载）
#   sh hotspot-off.sh -h
#
# 关热点时下联网卡不存在：IPv6 两项会跳过并说明，重开热点时 v6 会自己回来。
# ============================================================================

BOX_HOME=/data/user/0/com.boxproxy.box/files/box
CONF=$BOX_HOME/scripts/box-auto.conf
JS_DIR=$BOX_HOME/mihomo/scripts
BOXCTL=$BOX_HOME/bin/boxctl
MARK=hotspot-lan

DRY_RUN=0
DO_APPLY=1
APPLY_RESULT=''
DROPPED=''
MARK_LEFT=0

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# ={10,}/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

log() { printf '%s\n' "$*" ; }
die() { printf '错误: %s\n' "$*" >&2 ; exit 2 ; }

set_conf() {
    [ -f "$CONF" ] || die "找不到 $CONF"
    if grep -q '^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=' "$CONF" 2>/dev/null; then
        sed -i "s|^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=.*|HOTSPOT_SHARE='off'|" "$CONF" ||
            die "写 $CONF 失败"
    else
        printf "HOTSPOT_SHARE='%s'\n" off >>"$CONF" || die "写 $CONF 失败"
    fi
    chown root:root "$CONF" 2>/dev/null
    chmod 644 "$CONF" 2>/dev/null
}

# 与 hotspot-on.sh 相同的识别逻辑
downstream_iface() {
    local pattern upstream iface
    pattern=$(dumpsys tethering 2>/dev/null \
        | sed -n 's/.*tetherableWifiRegexs: \[\(.*\)\]/\1/p' | head -1 \
        | sed 's/\\d/[0-9]/g; s/, /|/g')
    [ -n "$pattern" ] || pattern='wlan[0-9]|softap[0-9]|ap_br_wlan[0-9]|ap_br_softap[0-9]|ap[0-9]|swlan[0-9]'
    upstream=$(ip route get 1.1.1.1 2>/dev/null | sed -n 's/.* dev \([A-Za-z0-9_@.-]*\).*/\1/p' | head -1)
    for iface in $(ip -o link show up 2>/dev/null | awk -F': ' '{print $2}' \
        | grep -E "^($pattern)$" | sort -u); do
        [ "$iface" = "$upstream" ] && continue
        ip -o -4 addr show "$iface" 2>/dev/null | grep -q ' inet ' || continue
        printf '%s\n' "$iface"
        return 0
    done
    return 1
}

# ---------------- IPv6 还原 ----------------

ra_block_clear() {
    local spec n=0
    if [ "$DRY_RUN" = 1 ]; then
        if ip6tables -S OUTPUT 2>/dev/null | grep -q "$MARK"; then
            log "  [dry-run] 删除拦 IPv6 通告的规则"
        else
            log "  [dry-run] 没有拦 IPv6 通告的规则"
        fi
        return 0
    fi
    ip6tables -S OUTPUT 2>/dev/null | grep -- "$MARK" | sed 's/^-A OUTPUT //' | \
    while IFS= read -r spec; do
        [ -n "$spec" ] || continue
        ip6tables -D OUTPUT $spec 2>/dev/null && log "  已删除拦 IPv6 通告的规则"
    done
}

enable_iface_ipv6() {   # $1 = 网卡（空 = 没有下联）
    local iface=$1
    if [ -z "$iface" ]; then
        log "热点共享: 当前没有下联网卡（热点关着），IPv6 恢复跳过——重开热点时 v6 会自己回来"
        return 0
    fi
    if [ "$(sysctl -n "net.ipv6.conf.$iface.disable_ipv6" 2>/dev/null)" = 0 ]; then
        log "热点共享: $iface 的 IPv6 本来就是开的"
        return 0
    fi
    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] sysctl -w net.ipv6.conf.$iface.disable_ipv6=0"
        return 0
    fi
    sysctl -w "net.ipv6.conf.$iface.disable_ipv6=0" >/dev/null 2>&1 &&
        log "热点共享: 已恢复 $iface 的 IPv6"
}

# ---------------- 规则 ----------------

drop_marked() {     # $1 = 文件
    local file=$1 tmp
    tmp=$file.tmp.$$
    grep -v "// $MARK\$" "$file" >"$tmp" 2>/dev/null
    [ -s "$tmp" ] || { rm -f "$tmp"; return 1; }
    chmod 644 "$tmp" 2>/dev/null
    mv -f "$tmp" "$file"
}

drop_rules() {
    local file any=0
    for file in "$JS_DIR"/*.js; do
        [ -f "$file" ] || continue
        grep -q "// $MARK\$" "$file" || continue
        any=1
        if [ "$DRY_RUN" = 1 ]; then
            log "  [dry-run] $(basename "$file"): 删除标记行"
            continue
        fi
        if drop_marked "$file"; then
            DROPPED="$DROPPED $(basename "$file")"
            log "  $(basename "$file"): 已清理"
        else
            log "warn: 清理 $(basename "$file") 失败"
        fi
    done
    [ "$any" = 1 ] || log "  没有找到标记行（本来就是关的）"
}

# ---------------- 生效 ----------------

# 让核心重载新配置：不重启进程，也就不会跑服务启动前脚本。
# 做法是把生成的启动配置复制进 mihomo 家目录（API 只接受家目录内的绝对路径），
# 再用 Clash API 的 PUT /configs 重载，最后删掉临时文件。
core_reload() {
    local cfg=$BOX_HOME/run/state/config/startup-config secret tmp code
    command -v curl >/dev/null 2>&1 || return 1
    [ -f "$cfg" ] || return 1
    "$BOXCTL" status 2>/dev/null | grep -q '正在运行' || return 1
    secret=$(sed -n 's/^secret: //p' "$cfg" | head -1)
    tmp=$BOX_HOME/mihomo/.hotspot-reload.yaml
    cp -f "$cfg" "$tmp" || return 1
    code=$(curl -s -o /dev/null -w '%{http_code}' -X PUT \
        -H "Authorization: Bearer $secret" -H 'Content-Type: application/json' \
        -d "{\"path\":\"$tmp\"}" 'http://127.0.0.1:9090/configs?force=true')
    rm -f "$tmp"
    case "$code" in 200 | 204) return 0 ;; esac
    return 1
}

print_summary() {
    local ra v6state left
    if [ "$DRY_RUN" = 1 ]; then
        log "—— 运行结果（dry-run）——"
        log "没做任何改动；正式运行会按上面的步骤执行"
        return 0
    fi
    ra=$(ip6tables -S OUTPUT 2>/dev/null | grep -c -- "$MARK")
    v6state=$(sysctl -n "net.ipv6.conf.${SUMMARY_IFACE:-wlan0}.disable_ipv6" 2>/dev/null)
    left=0
    for f in "$JS_DIR"/*.js; do
        [ -f "$f" ] || continue
        grep -q "// $MARK\$" "$f" && left=$((left + 1))
    done
    log "—— 运行结果 ——"
    log "热点出口: 已恢复核心原有分流（本机不受影响）"
    log "规则清理:${DROPPED:- 无标记行可删}（残留标记的脚本 $left 份，应为 0）"
    log "IPv6: 拦通告规则剩 $ra 条（应 0），网卡 ${SUMMARY_IFACE:-?} 的 disable_ipv6=$v6state"
    log "生效: ${APPLY_RESULT:-未执行}"
    log "配置: HOTSPOT_SHARE='off' 已写入 box-auto.conf"
    print_controls
}

# 这次运行到底动了什么：重新生成配置 / 重载 / 重启 / 停止
print_controls() {
    local svc
    svc=$("$BOXCTL" status 2>/dev/null | grep -q '正在运行' && echo '运行中' || echo '已停止')
    log "—— 生效操作 ——"
    if [ "$DRY_RUN" = 1 ]; then
        log "重新生成启动配置: 没做 | 重载: 没做 | 重启: 没做 | 停止: 没做（dry-run）"
        log "服务状态: $svc（未改变）"
        return 0
    fi
    if [ "$DID_SYNC" = 1 ]; then
        log "重新生成启动配置: 已做（boxctl config sync）"
    else
        log "重新生成启动配置: 没做"
    fi
    if [ "$DID_RELOAD" = 1 ]; then
        log "重载: 已做（核心重载配置，进程未重启，PID $(cat "$BOX_HOME/run/box.pid" 2>/dev/null) 不变）"
    else
        log "重载: 没做"
    fi
    if [ "$DID_RESTART" = 1 ]; then
        log "重启: 已做（新 PID $(cat "$BOX_HOME/run/box.pid" 2>/dev/null)，服务中断过几秒）"
    else
        log "重启: 没做"
    fi
    log "停止: 没做（服务一直是$svc，没有中断）"
    log "服务状态: $svc"
}

make_effective() {
    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] boxctl config sync + 重载核心（不重启进程）"
        return 0
    fi
    log "重新生成启动配置…"
    if "$BOXCTL" config sync >/dev/null 2>&1; then
        DID_SYNC=1
    else
        log "warn: 重新生成配置失败"
    fi
    if [ "$DO_APPLY" != 1 ]; then
        APPLY_RESULT='已跳过生效（需要你自己点一次「重载」）'
        log "已跳过生效：回首页点一次「重载」即可"
        return 0
    fi
    if ! "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        APPLY_RESULT='服务没在运行，下次启动自动生效'
        log "服务当前没在运行，下次启动会直接用上新配置"
        return 0
    fi
    if core_reload; then
        DID_RELOAD=1
        APPLY_RESULT="已重载核心（PID $(cat "$BOX_HOME/run/box.pid" 2>/dev/null) 未变，没跑启动前脚本）"
        log "已生效：核心重载了新配置（进程没重启，也没跑启动前脚本）"
        return 0
    fi
    log "重载不可用，改成重启核心（会断几秒）…"
    "$BOXCTL" restart >/dev/null 2>&1
    DID_RESTART=1
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        APPLY_RESULT="已重启核心（新 PID $(cat "$BOX_HOME/run/box.pid" 2>/dev/null)）"
        log "已生效：核心已重启，规则已撤掉"
    else
        log "warn: 重启后没检测到运行中的服务，回 App 看一眼"
    fi
}

# ---------------- 主流程 ----------------

main() {
    local iface
    while [ $# -gt 0 ]; do
        case "$1" in
            -h | --help) usage ; exit 0 ;;
            -n | --dry-run) DRY_RUN=1 ;;
            --no-apply | --no-restart) DO_APPLY=0 ;;
            *) die "未知参数 $1（用 -h 看用法）" ;;
        esac
        shift
    done

    iface=$(downstream_iface) || iface=''

    log "配置: HOTSPOT_SHARE='off'（热点客户端按核心原有分流走）"
    if [ "$DRY_RUN" = 1 ]; then
        log "[dry-run] 不写配置"
    else
        set_conf
    fi
    SUMMARY_IFACE=$iface
    drop_rules
    ra_block_clear
    enable_iface_ipv6 "$iface"
    make_effective
    print_summary

    [ "$DRY_RUN" = 1 ] && log "dry-run 完成，什么都没改"
    return 0
}

main "$@"
