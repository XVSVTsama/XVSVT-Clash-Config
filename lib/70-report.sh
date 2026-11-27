#!/system/bin/sh
# --show 输出
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

show_config() {
    printf '配置文件: %s\n' "${CONF_USED:-（未使用，走内置默认）}"
    [ "$(id -u)" = 0 ] || printf '（非 root，下面的“已安装/未安装”可能不准）\n'
    printf 'Box 目录: %s\n\n' "$BOX_HOME"
    printf '内核清单:\n'
    for name in $CORE_LIST; do
        file=$(core_file "$name")
        path=$BIN_DIR/$file
        if [ -f "$path" ]; then state='已安装'; else state='未安装'; fi
        printf '  %-10s 文件 %-16s %s  [%s]\n' "$name" "$file" "$path" "$state"
    done
    printf '\n模式映射:\n'
    for mode in tun tproxy ebpf redirect mixed enhance unknown; do
        name=$(mode_core "$mode")
        printf '  %-9s → %-10s %s\n' "$mode" "$name" "$(core_path "$name")"
    done
    printf '\n当前检测到的模式: %s → %s\n' "$MODE" "$(mode_core "$MODE")"
}
