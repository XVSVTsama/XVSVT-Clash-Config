#!/system/bin/sh
# 运行模式识别
#
# 由 iface-auto.sh 通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 iface-auto.sh 的模块，不能单独运行。" >&2
    exit 2
}

detect_mode() {
    MODE_TAGS='tun|tproxy|ebpf|redirect|mixed|enhance'
    MODE=$(mode_tag "${BOX_MODE:-}")
    [ -n "$MODE" ] || MODE=$(log_mode '网络模式')
    [ -n "$MODE" ] || MODE=$(log_mode '模式')
    [ -n "$MODE" ] || MODE=$(mode_tag "${BOX_PROXY_MODE:-}")
    [ -n "$MODE" ] || MODE=unknown
}

log_mode() {
    grep -aoE "$1 ($MODE_TAGS)" "$RUNLOG" 2>/dev/null | tail -1 | awk '{print $NF}'
}

mode_tag() {
    printf '%s\n' "$1" | grep -aE "^($MODE_TAGS)\$" 2>/dev/null
}
