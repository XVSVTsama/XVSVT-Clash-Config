#!/system/bin/sh
# 手动：打开热点共享代理（热点客户端走指定出口，本机不变）
#
# 一次做完，不需要再去别处点：
#   1. 拦掉热点网卡发出的 IPv6 路由通告（ip6tables 丢 icmpv6 type 134），
#      客户端配不出 v6 地址；规则按网卡名匹配，网卡重建后依然有效
#   2. 顺手关掉热点网卡自身的 IPv6（sysctl），当第二层保险
#   3. 把 HOTSPOT_SHARE 写进 box-auto.conf（状态留在配置里，可追溯）
#   4. 在覆写脚本 rules 最前面插入带标记的规则：IPv4 按网段，
#      IPv6 按当时在线客户端的 /128 兜底（万一 v6 还是出现了）
#   5. 重新生成启动配置，并重启核心让它生效
#
# 用法：
#   sh hotspot-on.sh               热点客户端直连（direct）
#   sh hotspot-on.sh '📲 热点组'    热点客户端走该策略组
#   sh hotspot-on.sh -n            只打印，什么都不改
#   sh hotspot-on.sh --no-restart   改完不重启核心（自己点重载）
#   sh hotspot-on.sh -h
#
# 网段默认按当前下联网卡地址自动算；要写死就在 box-auto.conf 里设 HOTSPOT_CIDR。
# 关热点再开后，重跑本脚本一次即可（网段、/128 清单、网卡设置都会刷新）。
# ============================================================================

BOX_HOME=/data/user/0/com.boxproxy.box/files/box
CONF=$BOX_HOME/scripts/box-auto.conf
JS_DIR=$BOX_HOME/mihomo/scripts
BOXCTL=$BOX_HOME/bin/boxctl
MARK=hotspot-lan
ANCHOR='  "rules": ['

DRY_RUN=0
DO_RESTART=1
VALUE=direct

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# ={10,}/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

log() { printf '%s\n' "$*" ; }
die() { printf '错误: %s\n' "$*" >&2 ; exit 2 ; }

# ---------------- 配置 ----------------

conf_value() {   # $1 = 变量名
    [ -f "$CONF" ] || return 1
    sed -n "s/^[[:space:]]*$1=['\"]\{0,1\}\([^'\"]*\)['\"]\{0,1\}[[:space:]]*$/\1/p" "$CONF" | tail -1
}

set_conf() {     # $1 = 值
    local val=$1 esc
    [ -f "$CONF" ] || die "找不到 $CONF"
    esc=$(printf '%s' "$val" | sed 's/[&|\\]/\\&/g')
    if grep -q '^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=' "$CONF" 2>/dev/null; then
        sed -i "s|^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=.*|HOTSPOT_SHARE='$esc'|" "$CONF" ||
            die "写 $CONF 失败"
    else
        printf "HOTSPOT_SHARE='%s'\n" "$val" >>"$CONF" || die "写 $CONF 失败"
    fi
    chown root:root "$CONF" 2>/dev/null
    chmod 644 "$CONF" 2>/dev/null
}

# ---------------- 网卡 ----------------

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

netmask_cidr() {    # $1 = a.b.c.d, $2 = 前缀长度
    local addr=$1 len=$2 a b c d v mask net i
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

iface_ipv4_cidr() { # $1 = 网卡
    local spec
    spec=$(ip -o -4 addr show dev "$1" 2>/dev/null | awk '{print $4}' | head -1)
    [ -n "$spec" ] || return 1
    case "${spec#*/}" in '' | *[!0-9]*) return 1 ;; esac
    netmask_cidr "${spec%/*}" "${spec#*/}"
}

# 下联邻居表里的全局 IPv6 地址（排除本机自己的）
client_ipv6_addrs() {   # $1 = 网卡
    local iface=$1 mine
    mine=$(ip -o -6 addr show dev "$iface" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | tr '\n' ' ')
    ip -6 neigh show dev "$iface" 2>/dev/null | awk -v mine="$mine" '
        BEGIN { n = split(mine, own, " ") }
        {
            addr = $1
            if (addr !~ /:/) next
            if (addr ~ /^fe80:/) next
            for (i = 1; i <= n; i++) if (own[i] == addr) next
            if (seen[addr]++) next
            print addr
        }'
}

# ---------------- IPv6：拦路由通告 + 关网卡 IPv6 ----------------

ra_block_add() {    # $1 = 网卡
    local iface=$1
    if ip6tables -S OUTPUT 2>/dev/null | grep -q "$MARK"; then
        log "热点共享: 已经是拦过 IPv6 通告的状态"
        return 0
    fi
    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] ip6tables -I OUTPUT 1 -o $iface -p ipv6-icmp --icmpv6-type 134 -m comment --comment $MARK -j DROP"
        return 0
    fi
    if ip6tables -I OUTPUT 1 -o "$iface" -p ipv6-icmp --icmpv6-type 134 \
        -m comment --comment "$MARK" -j DROP 2>/dev/null; then
        log "热点共享: 已拦掉 $iface 上的 IPv6 路由通告（客户端只拿到 IPv4）"
    else
        log "warn: 拦 IPv6 通告失败，客户端仍可能拿到 v6"
    fi
}

# 注意：BoxProxy 重启核心时会按自己的 IPv6 设置把网卡 v6 打开，
# 所以这一步在重启之后再补一次，并读回确认。
disable_iface_ipv6() {   # $1 = 网卡
    local iface=$1 now
    [ -n "$iface" ] || return 0
    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] sysctl -w net.ipv6.conf.$iface.disable_ipv6=1"
        return 0
    fi
    sysctl -w "net.ipv6.conf.$iface.disable_ipv6=1" >/dev/null 2>&1
    now=$(sysctl -n "net.ipv6.conf.$iface.disable_ipv6" 2>/dev/null)
    if [ "$now" = 1 ]; then
        log "热点共享: $iface 的 IPv6 已关闭（手机自己的 v6 不受影响）"
    else
        log "warn: $iface 的 IPv6 关不掉（现在是 $now），靠拦截通告兜底"
    fi
}

# ---------------- 规则 ----------------

drop_marked() {     # $1 = 文件，删掉带标记的行
    local file=$1 tmp
    tmp=$file.tmp.$$
    grep -v "// $MARK\$" "$file" >"$tmp" 2>/dev/null
    [ -s "$tmp" ] || { rm -f "$tmp"; return 1; }
    chmod 644 "$tmp" 2>/dev/null
    mv -f "$tmp" "$file"
}

insert_block() {    # $1 = 文件, $2 = 规则块文件
    local file=$1 block=$2 tmp
    tmp=$file.tmp.$$
    awk -v anchor="$ANCHOR" -v block="$block" '
        { print }
        $0 == anchor && !done {
            while ((getline line < block) > 0) print line
            close(block)
            done = 1
        }
    ' "$file" >"$tmp" || { rm -f "$tmp"; return 1; }
    chmod 644 "$tmp" 2>/dev/null
    mv -f "$tmp" "$file"
}

apply_block() {     # $1 = 规则块文件
    local block=$1 file any=0
    for file in "$JS_DIR"/*.js; do
        [ -f "$file" ] || continue
        grep -qxF "$ANCHOR" "$file" || continue
        any=1
        if [ "$DRY_RUN" = 1 ]; then
            log "  [dry-run] $(basename "$file"): 替换标记行"
            sed 's/^/      + /' "$block" 2>/dev/null
            continue
        fi
        grep -q "// $MARK\$" "$file" && drop_marked "$file"
        insert_block "$file" "$block" || { log "warn: 写入 $(basename "$file") 失败" ; continue ; }
        log "  $(basename "$file"): 已更新"
    done
    [ "$any" = 1 ] || log "  没有可用的覆写脚本（$JS_DIR 下没有 rules 数组）"
}

# ---------------- 生效 ----------------

make_effective() {
    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] boxctl config sync && boxctl restart"
        return 0
    fi
    log "重新生成启动配置…"
    "$BOXCTL" config sync >/dev/null 2>&1 || log "warn: 重新生成配置失败"
    if [ "$DO_RESTART" != 1 ]; then
        log "已跳过重启：回首页点一次「重载」即可"
        return 0
    fi
    if ! "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "服务当前没在运行，下次启动会直接用上新配置"
        return 0
    fi
    log "重启核心让它生效（会断几秒）…"
    "$BOXCTL" restart >/dev/null 2>&1
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "已生效：核心在跑，规则已加载"
    else
        log "warn: 重启后没检测到运行中的服务，回 App 看一眼"
    fi
}

# ---------------- 主流程 ----------------

main() {
    local iface cidr block v6 n addr
    while [ $# -gt 0 ]; do
        case "$1" in
            -h | --help) usage ; exit 0 ;;
            -n | --dry-run) DRY_RUN=1 ;;
            --no-restart) DO_RESTART=0 ;;
            -*) die "未知参数 $1（用 -h 看用法）" ;;
            *) VALUE=$1 ;;
        esac
        shift
    done
    case "$VALUE" in '' | off | OFF) die "hotspot-on.sh 不接受 off，用 hotspot-off.sh" ;; esac
    case "$VALUE" in *'"'* | *'\\'*) die "组名里不能有引号或反斜杠" ;; esac
    [ "$VALUE" = DIRECT ] && VALUE=direct
    if [ "$VALUE" = direct ]; then EXIT=DIRECT; else EXIT=$VALUE; fi

    iface=$(downstream_iface) || die "找不到热点网卡：先开热点让客户端连上，或在 box-auto.conf 里写 HOTSPOT_CIDR"
    cidr=$(conf_value HOTSPOT_CIDR)
    if [ -z "$cidr" ]; then
        cidr=$(iface_ipv4_cidr "$iface") || die "读不到 $iface 的 IPv4 地址"
        log "热点共享: 下联网卡 $iface → IPv4 网段 $cidr"
    else
        log "热点共享: 使用配置里的 IPv4 网段 $cidr"
    fi

    # 先收 v6 客户端（关掉网卡 v6 之后邻居表里就看不到了），再关 v6、拦通告
    v6=$(client_ipv6_addrs "$iface")
    ra_block_add "$iface"
    disable_iface_ipv6 "$iface"

    block=${TMPDIR:-/data/local/tmp}/hotspot-rules.$$
    : >"$block" || die "无法创建临时文件 $block"
    printf '    "SRC-IP-CIDR,%s,%s", // %s\n' "$cidr" "$EXIT" "$MARK" >>"$block"
    n=0
    for addr in $v6; do
        printf '    "SRC-IP-CIDR6,%s/128,%s", // %s\n' "$addr" "$EXIT" "$MARK" >>"$block"
        n=$((n + 1))
    done
    if [ "$n" = 0 ]; then
        log "热点共享: 当前没有在线 IPv6 客户端，只写 IPv4 规则"
    else
        log "热点共享: 在线 IPv6 客户端 $n 个，额外写 /128 兜底"
    fi

    log "配置: HOTSPOT_SHARE='$VALUE'，出口 $EXIT"
    if [ "$DRY_RUN" = 1 ]; then
        log "[dry-run] 不写配置"
    else
        set_conf "$VALUE"
    fi
    apply_block "$block"
    rm -f "$block"
    make_effective
    # 重启会把网卡 v6 重新打开，这里再补一次
    [ "$DO_RESTART" = 1 ] && disable_iface_ipv6 "$iface"

    [ "$DRY_RUN" = 1 ] && log "dry-run 完成，什么都没改"
    return 0
}

main "$@"
