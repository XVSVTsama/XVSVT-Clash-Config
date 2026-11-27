#!/system/bin/sh
# 出口网卡、下联网卡、dummy 与 FORWARD 放行
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

add_downstream() {
    local iface=$1 candidate
    [ -n "$iface" ] || return 0
    [ "$iface" = "$UPSTREAM" ] && return 0
    [ "$iface" = "$DUMMY_IFACE" ] && return 0
    is_tunnel_iface "$iface" && return 0
    ip link show "$iface" >/dev/null 2>&1 || return 0
    for candidate in $(printf '%s\n' "$DOWNSTREAM" | tr ',' ' '); do
        [ "$candidate" = "$iface" ] && return 0
    done
    if [ -n "$DOWNSTREAM" ]; then
        DOWNSTREAM=$DOWNSTREAM,$iface
    else
        DOWNSTREAM=$iface
    fi
}

# iptables 一律带 -w 等 xtables 锁：启动阶段 boxctl 自己也在改规则，
# 不等锁会直接失败（Can't lock /system/etc/xtables.lock），放行就静默丢掉了。
allow_forward() {
    local iface dir
    for iface in $(printf '%s\n' "${DOWNSTREAM:-}" | tr ',' ' '); do
        for dir in -i -o; do
            if [ "$DRY_RUN" = 1 ]; then
                printf '[dry-run] iptables -w 5 -I FORWARD 1 %s %s -j ACCEPT\n' "$dir" "$iface"
                continue
            fi
            iptables -w 5 -C FORWARD "$dir" "$iface" -j ACCEPT 2>/dev/null && continue
            if iptables -w 5 -I FORWARD 1 "$dir" "$iface" -j ACCEPT 2>/dev/null; then
                log "forward allow $dir $iface"
            else
                log "warn: 放行 FORWARD $dir $iface 失败（xtables 锁被占用或权限不足）"
            fi
        done
    done
}

detect_downstream() {
    local pattern iface
    pattern=$(tetherable_pattern)
    DOWNSTREAM=''
    for iface in $(ip -o link show up 2>/dev/null | awk -F': ' '{print $2}' \
        | grep -E "^($pattern)$" | sort -u); do
        ip -o -4 addr show "$iface" 2>/dev/null | grep -q 'inet ' || continue
        add_downstream "$iface"
    done
}

detect_upstream() {
    local dev iface
    dev=$(ip route get 1.1.1.1 2>/dev/null | iface_of_dev)
    [ -n "$dev" ] || dev=$(ip route show default 2>/dev/null | iface_of_dev)
    is_tunnel_iface "$dev" && dev=''
    if [ -z "$dev" ]; then
        # 路由落到隧道上时，按默认路由的先后顺序找第一个带 IPv4 的物理接口
        for iface in $(ip route show table all 2>/dev/null \
            | awk '$1 == "default" { for (i = 1; i <= NF; i++) if ($i == "dev") print $(i + 1) }'); do
            is_tunnel_iface "$iface" && continue
            ip -o -4 addr show "$iface" 2>/dev/null | grep -q ' inet ' || continue
            dev=$iface
            break
        done
    fi
    UPSTREAM=$dev
}

ensure_dummy_iface() {
    [ -z "$DOWNSTREAM" ] || return 0
    case "$MODE" in
        ebpf | unknown) ;;
        *) return 0 ;;
    esac
    if ! ip link show "$DUMMY_IFACE" >/dev/null 2>&1; then
        if run ip link add "$DUMMY_IFACE" type dummy >/dev/null 2>&1; then
            log "created dummy $DUMMY_IFACE"
        else
            log "warn: 无法创建 $DUMMY_IFACE，eBPF 共享角色可能起不来"
        fi
    fi
    run ip link set "$DUMMY_IFACE" up >/dev/null 2>&1
}

iface_of_dev() {
    sed -n 's/.* dev \([A-Za-z0-9_@.-]*\).*/\1/p' | head -1
}

# 隧道接口：名字不固定（BoxProxy 的 TUN 网卡可能叫 XVSVT 之类），
# 所以除了按名字，还按 Clash/mihomo TUN 的 198.18.0.0/16 网关地址判断
is_tunnel_iface() {
    case "$1" in
        '' | lo | tun* | tap* | meta | clash* | wg* | ppp* | ipsec* | dummy*) return 0 ;;
    esac
    ip -o -4 addr show "$1" 2>/dev/null | grep -q ' inet 198\.18\.' && return 0
    return 1
}

tetherable_pattern() {
    local pattern
    pattern=$(dumpsys tethering 2>/dev/null \
        | sed -n 's/.*tetherableWifiRegexs: \[\(.*\)\]/\1/p' | head -1 \
        | sed 's/\\d/[0-9]/g; s/, /|/g')
    [ -n "$pattern" ] || pattern='wlan[0-9]|softap[0-9]|ap_br_wlan[0-9]|ap_br_softap[0-9]|ap[0-9]|swlan[0-9]'
    printf '%s\n' "$pattern"
}
