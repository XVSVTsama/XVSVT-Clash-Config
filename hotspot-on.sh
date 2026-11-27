#!/system/bin/sh
# 手动：打开热点共享代理（热点客户端走指定出口，本机不变）
#
# 做两件事：
#   1. 把 box-auto.conf 的 HOTSPOT_SHARE 改成目标值（状态留在配置里，可追溯）
#   2. 在 mihomo 覆写脚本的 rules 最前面插入带标记的规则，由核心规则决定
#      热点客户端的出口，不动路由、不动 iptables
#
# 规则分两类：
#   - IPv4：一条 SRC-IP-CIDR，覆盖整个热点网段（新设备连上也有效）
#   - IPv6：热点客户端与手机共用运营商同一个 /64，按网段写会连带把手机自己
#     变成直连，所以按在线客户端的 /128 逐条写（取自下联网卡的邻居表）
#
# 用法：
#   sh hotspot-on.sh               热点客户端直连（direct）
#   sh hotspot-on.sh '📲 热点组'    热点客户端走该策略组
#   sh hotspot-on.sh -n            只打印，不改配置也不写 js
#   sh hotspot-on.sh -h
#
# 网段默认按当前下联网卡地址自动算；要写死就在 box-auto.conf 里设 HOTSPOT_CIDR。
# 改完仍需「重新生成启动配置」再重启或重载服务，规则才进入内核。
# 覆写脚本被重新部署后标记行会消失，需要再跑一次本脚本。
# IPv6 客户端离线或换了临时地址后，重跑本脚本即可刷新那份 /128 清单。
# ============================================================================

BOX_HOME=/data/user/0/com.boxproxy.box/files/box
CONF=$BOX_HOME/scripts/box-auto.conf
JS_DIR=$BOX_HOME/mihomo/scripts
MARK=hotspot-lan
ANCHOR='  "rules": ['

DRY_RUN=0
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

# ---------------- 网卡与网段 ----------------

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
    # 不筛状态：客户端的临时地址经常出现 FAILED 但仍在使用，宁可多写一条 /128
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

# ---------------- 写规则 ----------------

drop_marked() {     # $1 = 文件，删掉带标记的行
    local file=$1 tmp
    tmp=$file.tmp.$$
    grep -v "// $MARK\$" "$file" >"$tmp" 2>/dev/null
    [ -s "$tmp" ] || { rm -f "$tmp"; return 1; }
    chmod 644 "$tmp" 2>/dev/null
    mv -f "$tmp" "$file"
}

insert_block() {    # $1 = 文件, $2 = 规则块文件（多行）
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

apply_block() {     # $1 = 规则块文件（空文件 = 只清旧标记）
    local block=$1 file any=0 dropped
    for file in "$JS_DIR"/*.js; do
        [ -f "$file" ] || continue
        grep -qxF "$ANCHOR" "$file" || continue
        any=1
        if [ "$DRY_RUN" = 1 ]; then
            log "  [dry-run] $(basename "$file"):"
            if grep -q "// $MARK\$" "$file"; then log "      删除旧的标记行" ; fi
            sed 's/^/      + /' "$block" 2>/dev/null
            continue
        fi
        dropped=0
        grep -q "// $MARK\$" "$file" && { drop_marked "$file" && dropped=1 ; }
        if [ -s "$block" ]; then
            insert_block "$file" "$block" || { log "warn: 写入 $(basename "$file") 失败" ; continue ; }
            log "  $(basename "$file"): 已更新$([ "$dropped" = 1 ] && printf '（替换旧标记行）')"
        else
            [ "$dropped" = 1 ] && log "  $(basename "$file"): 已清理"
        fi
    done
    [ "$any" = 1 ] || log "  没有可用的覆写脚本（$JS_DIR 下没有 rules 数组）"
}

# ---------------- 主流程 ----------------

main() {
    local iface cidr block v6 n
    case "${1:-}" in
        -h | --help) usage ; exit 0 ;;
        -n | --dry-run) DRY_RUN=1; shift ;;
    esac
    [ $# -gt 0 ] && VALUE=$1
    case "$VALUE" in '' | off | OFF) die "hotspot-on.sh 不接受 off，用 hotspot-off.sh" ;; esac
    case "$VALUE" in *'"'* | *'\'*) die "组名里不能有引号或反斜杠" ;; esac
    [ "$VALUE" = DIRECT ] && VALUE=direct
    if [ "$VALUE" = direct ]; then
        EXIT=DIRECT
    else
        EXIT=$VALUE
    fi

    iface=$(downstream_iface) || die "找不到热点网卡：先开热点让客户端连上，或在 box-auto.conf 里写 HOTSPOT_CIDR"
    cidr=$(conf_value HOTSPOT_CIDR)
    if [ -z "$cidr" ]; then
        cidr=$(iface_ipv4_cidr "$iface") || die "读不到 $iface 的 IPv4 地址"
        log "热点共享: 下联网卡 $iface → IPv4 网段 $cidr"
    else
        log "热点共享: 使用配置里的 IPv4 网段 $cidr"
    fi

    block=${TMPDIR:-/data/local/tmp}/hotspot-rules.$$
    : >"$block" || die "无法创建临时文件 $block"

    printf '    "SRC-IP-CIDR,%s,%s", // %s\n' "$cidr" "$EXIT" "$MARK" >>"$block"

    v6=$(client_ipv6_addrs "$iface")
    n=0
    for addr in $v6; do
        printf '    "SRC-IP-CIDR6,%s/128,%s", // %s\n' "$addr" "$EXIT" "$MARK" >>"$block"
        n=$((n + 1))
    done
    if [ "$n" = 0 ]; then
        log "热点共享: 当前没有在线 IPv6 客户端，只写 IPv4 规则（有 v6 设备连上后重跑一次）"
    else
        log "热点共享: 在线 IPv6 客户端 $n 个，逐个写 /128"
    fi

    log "配置: HOTSPOT_SHARE='$VALUE'，出口 $EXIT"
    if [ "$DRY_RUN" = 1 ]; then
        log "[dry-run] 不写配置"
    else
        set_conf "$VALUE"
    fi
    apply_block "$block"
    rm -f "$block"

    if [ "$DRY_RUN" = 1 ]; then
        log "dry-run 完成，未写任何文件"
        return 0
    fi
    log "下一步：设置 → 基础代理配置 → 重新生成启动配置，然后重启或重载服务"
}

main "$@"
