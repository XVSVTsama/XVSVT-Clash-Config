#!/system/bin/sh
# 手动：关闭热点共享代理，把 hotspot-on.sh 做的事全部还原
#
# 做三件事（与 hotspot-on.sh 完全相反）：
#   1. 删掉 mihomo 覆写脚本 rules 里带 // hotspot-lan 标记的规则（v4 与 v6 /128 都删）
#   2. 把 box-auto.conf 的 HOTSPOT_SHARE 改回 off
#   3. 重新打开下联网卡的 IPv6（sysctl net.ipv6.conf.<网卡>.disable_ipv6=0）
#
# 用法：
#   sh hotspot-off.sh        关闭
#   sh hotspot-off.sh -n     只打印，不改配置、不写 js、不改 sysctl
#   sh hotspot-off.sh -h
#
# 关热点时下联网卡不存在，IPv6 那一步会跳过并说明——重开热点时 v6 会自己回来。
# 改完仍需「重新生成启动配置」再重启或重载服务，规则才离开内核。
# ============================================================================

BOX_HOME=/data/user/0/com.boxproxy.box/files/box
CONF=$BOX_HOME/scripts/box-auto.conf
JS_DIR=$BOX_HOME/mihomo/scripts
MARK=hotspot-lan

DRY_RUN=0

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

# 与 hotspot-on.sh 相同的识别逻辑：tetherable 名字规则里、有 IPv4、不是上联的那个
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

enable_client_ipv6() {   # $1 = 下联网卡（空 = 没有下联）
    local iface=$1 cur
    if [ -z "$iface" ]; then
        log "热点共享: 当前没有下联网卡（热点关着），IPv6 恢复跳过——重开热点时 v6 会自己回来"
        return 0
    fi
    cur=$(sysctl -n "net.ipv6.conf.$iface.disable_ipv6" 2>/dev/null)
    if [ "$cur" = 0 ]; then
        log "热点共享: $iface 的 IPv6 本来就是开的"
        return 0
    fi
    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] sysctl -w net.ipv6.conf.$iface.disable_ipv6=0（热点客户端恢复 IPv6）"
        return 0
    fi
    if sysctl -w "net.ipv6.conf.$iface.disable_ipv6=0" >/dev/null 2>&1; then
        log "热点共享: 已恢复 $iface 的 IPv6"
    else
        log "warn: 恢复不了 $iface 的 IPv6，重开热点也能恢复"
    fi
}

drop_marked() {     # $1 = 文件，删掉带标记的行
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
            log "  $(basename "$file"): 已清理"
        else
            log "warn: 清理 $(basename "$file") 失败"
        fi
    done
    [ "$any" = 1 ] || log "  没有找到标记行（本来就是关的）"
}

main() {
    local iface
    case "${1:-}" in
        -h | --help) usage ; exit 0 ;;
        -n | --dry-run) DRY_RUN=1 ;;
        '') ;;
        *) die "未知参数 $1（用 -h 看用法）" ;;
    esac

    iface=$(downstream_iface) || iface=''

    log "配置: HOTSPOT_SHARE='off'（热点客户端按核心原有分流走）"
    if [ "$DRY_RUN" = 1 ]; then
        log "[dry-run] 不写配置，也不写 js"
    else
        set_conf
    fi
    drop_rules
    enable_client_ipv6 "$iface"

    if [ "$DRY_RUN" = 1 ]; then
        log "dry-run 完成，未写任何文件"
        return 0
    fi
    log "下一步：设置 → 基础代理配置 → 重新生成启动配置，然后重启或重载服务"
}

main "$@"
