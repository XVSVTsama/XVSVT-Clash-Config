#!/system/bin/sh
# 手动：热点客户端出口（只改交给核心的配置，不动路由、不动 iptables）
#
# 把一条 SRC-IP-CIDR 规则插进 mihomo 覆写脚本 rules 数组的第一条，
# 让热点客户端按规则走 DIRECT 或某个策略组，其余本机流量照旧。
# 规则带 // hotspot-lan 标记，重复运行只会替换自己那条。
#
# 读同目录 box-auto.conf：
#   HOTSPOT_SHARE='off'      删掉规则（默认，热点客户端按核心原有分流走）
#   HOTSPOT_SHARE='direct'   热点客户端直连
#   HOTSPOT_SHARE='组名'      热点客户端走该策略组
#   HOTSPOT_CIDR=''          手动指定 IPv4 网段；留空按当前下联网卡地址算
#
# 用法：
#   sh hotspot.sh              按 box-auto.conf 执行
#   sh hotspot.sh direct       临时改成直连（不改配置）
#   sh hotspot.sh off          临时删掉规则
#   sh hotspot.sh -n           只打印将要做什么，不写文件
#   sh hotspot.sh --sync       改完顺便重新生成启动配置（boxctl config sync）
#   sh hotspot.sh -h
#
# 注意：
#   - 改完要「重新生成启动配置」并重启/重载服务才进入内核；
#   - 覆写脚本被重新部署（从仓库拉一份新的）后标记行会消失，需要再跑一次；
#   - 只覆盖 IPv4 客户端；热点若下发了全局 IPv6，v6 流量仍按原分流走。
# ============================================================================

BOX_HOME=/data/user/0/com.boxproxy.box/files/box
JS_DIR=$BOX_HOME/mihomo/scripts
CONF=$BOX_HOME/scripts/box-auto.conf
MARK=hotspot-lan
ANCHOR='  "rules": ['

DRY_RUN=0
SYNC=0
SHARE=''
CIDR_OVERRIDE=''

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# ={10,}/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

log() { printf '%s\n' "$*" ; }
die() { printf '错误: %s\n' "$*" >&2 ; exit 2 ; }

parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            -n | --dry-run) DRY_RUN=1 ;;
            --sync) SYNC=1 ;;
            -h | --help) usage ; exit 0 ;;
            -*) die "未知参数 $1（用 -h 看用法）" ;;
            *) SHARE=$1 ;;
        esac
        shift
    done
}

load_conf() {
    [ -f "$CONF" ] || return 0
    # box-auto.conf 就是 sh 片段，直接读；只取需要的两项
    HOTSPOT_SHARE=$(sed -n "s/^[[:space:]]*HOTSPOT_SHARE=['\"]\{0,1\}\([^'\"]*\)['\"]\{0,1\}[[:space:]]*$/\1/p" "$CONF" | tail -1)
    HOTSPOT_CIDR=$(sed -n "s/^[[:space:]]*HOTSPOT_CIDR=['\"]\{0,1\}\([^'\"]*\)['\"]\{0,1\}[[:space:]]*$/\1/p" "$CONF" | tail -1)
    [ -n "$SHARE" ] || SHARE=${HOTSPOT_SHARE:-off}
    CIDR_OVERRIDE=${HOTSPOT_CIDR:-}
}

# 下联网卡：tetherable 名字规则里、有 IPv4 地址、且不是上联的那个
downstream_iface() {
    local pattern proto ifaces iface addr
    pattern=$(dumpsys tethering 2>/dev/null \
        | sed -n 's/.*tetherableWifiRegexs: \[\(.*\)\]/\1/p' | head -1 \
        | sed 's/\\d/[0-9]/g; s/, /|/g')
    [ -n "$pattern" ] || pattern='wlan[0-9]|softap[0-9]|ap_br_wlan[0-9]|ap_br_softap[0-9]|ap[0-9]|swlan[0-9]'
    addr=$(ip route get 1.1.1.1 2>/dev/null | sed -n 's/.* dev \([A-Za-z0-9_@.-]*\).*/\1/p' | head -1)
    ifaces=$(ip -o link show up 2>/dev/null | awk -F': ' '{print $2}' | grep -E "^($pattern)$" | sort -u)
    for iface in $ifaces; do
        [ "$iface" = "$addr" ] && continue
        ip -o -4 addr show "$iface" 2>/dev/null | grep -q ' inet ' || continue
        printf '%s\n' "$iface"
        return 0
    done
    return 1
}

# a.b.c.d/len → 网络地址/len
netmask_cidr() {
    local addr=$1 len=$2 a b c d i v mask net
    a=${addr%%.*}; addr=${addr#*.}
    b=${addr%%.*}; addr=${addr#*.}
    c=${addr%%.*}; d=${addr#*.}
    v=$(( (a << 24) + (b << 16) + (c << 8) + d ))
    mask=0
    i=0
    while [ "$i" -lt "$len" ]; do
        mask=$(( (mask << 1) + 1 ))
        i=$((i + 1))
    done
    mask=$(( mask << (32 - len) ))
    net=$(( v & mask ))
    printf '%d.%d.%d.%d/%d\n' $(( (net >> 24) & 255 )) $(( (net >> 16) & 255 )) \
        $(( (net >> 8) & 255 )) $(( net & 255 )) "$len"
}

iface_ipv4_cidr() {
    local iface=$1 spec addr len
    spec=$(ip -o -4 addr show dev "$iface" 2>/dev/null | awk '{print $4}' | head -1)
    [ -n "$spec" ] || return 1
    addr=${spec%/*}
    len=${spec#*/}
    case "$len" in '' | *[!0-9]*) return 1 ;; esac
    netmask_cidr "$addr" "$len"
}

write_rule() {
    local file=$1 rule=$2 tmp
    tmp=$file.tmp.$$
    awk -v anchor="$ANCHOR" -v rule="$rule" '
        { print }
        $0 == anchor && !done { print rule; done = 1 }
    ' "$file" >"$tmp" || { rm -f "$tmp"; return 1; }
    chmod 644 "$tmp" 2>/dev/null
    mv -f "$tmp" "$file"
}

apply_to_js() {
    local rule=$1 file touched=0 any=0
    for file in "$JS_DIR"/*.js; do
        [ -f "$file" ] || continue
        grep -qxF "$ANCHOR" "$file" || continue
        any=1
        touched=0
        if [ "$DRY_RUN" = 1 ]; then
            if [ -n "$rule" ]; then
                log "  [dry-run] $(basename "$file"): 插入 $(printf '%s' "$rule" | sed 's/^ *//')"
            else
                log "  [dry-run] $(basename "$file"): 删除标记行"
            fi
            continue
        fi
        if grep -q "// $MARK\$" "$file"; then
            sed -i "/\/\/ $MARK\$/d" "$file"
            touched=1
        fi
        if [ -n "$rule" ]; then
            write_rule "$file" "$rule" || { log "warn: 写入 $(basename "$file") 失败" ; continue ; }
            touched=1
        fi
        [ "$touched" = 1 ] && log "  $(basename "$file"): 已更新"
    done
    [ "$any" = 1 ] || log "  没有可用的覆写脚本（$JS_DIR 下没有 rules 数组）"
}

main() {
    local iface cidr rule exit_target
    parse_args "$@"
    load_conf

    case "$SHARE" in
        '' | off | OFF | no | false | 0) exit_target='' ;;
        *) exit_target=$SHARE ;;
    esac
    case "$exit_target" in
        direct | DIRECT) exit_target=DIRECT ;;
        *'"'* | *'\\'*) die "HOTSPOT_SHARE 里的组名不能包含引号或反斜杠" ;;
    esac

    if [ -z "$exit_target" ]; then
        log "热点共享: off（删除规则，热点客户端按核心原有分流走）"
        apply_to_js ''
        finish
        return 0
    fi

    cidr=$CIDR_OVERRIDE
    if [ -z "$cidr" ]; then
        iface=$(downstream_iface) || die "找不到热点网卡：先开热点让客户端连上，或直接在 box-auto.conf 写 HOTSPOT_CIDR"
        cidr=$(iface_ipv4_cidr "$iface") || die "读不到 $iface 的 IPv4 地址"
        log "热点共享: 下联网卡 $iface → 网段 $cidr"
    else
        log "热点共享: 使用配置里的网段 $cidr"
    fi

    rule="    \"SRC-IP-CIDR,$cidr,$exit_target\", // $MARK"
    log "热点共享: 出口 $exit_target（规则插到 rules 第一条）"
    apply_to_js "$rule"
    finish
}

finish() {
    if [ "$DRY_RUN" = 1 ]; then
        log "dry-run 完成，未写任何文件"
        return 0
    fi
    if [ "$SYNC" = 1 ]; then
        log "重新生成启动配置…"
        "$BOX_HOME/bin/boxctl" config sync 2>&1 | tail -3
    fi
    log "下一步：设置 → 基础代理配置 → 重新生成启动配置，然后重启或重载服务"
}

main "$@"
