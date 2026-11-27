#!/system/bin/sh
# 运行模式识别
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
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

current_mode() {
    local tags='tun|tproxy|ebpf|redirect|mixed|enhance' found
    found=$(printf '%s\n' "${BOX_MODE:-}" | grep -aE "^($tags)\$" 2>/dev/null)
    [ -n "$found" ] || found=$(grep -aoE "网络模式 ($tags)" "$RUN_DIR/runs.log" 2>/dev/null | tail -1 | awk '{print $NF}')
    [ -n "$found" ] || found=$(grep -aoE "模式 ($tags)" "$RUN_DIR/runs.log" 2>/dev/null | tail -1 | awk '{print $NF}')
    [ -n "$found" ] || found=$(printf '%s\n' "${BOX_PROXY_MODE:-}" | grep -aE "^($tags)\$" 2>/dev/null)
    printf '%s\n' "${found:-unknown}"
}
