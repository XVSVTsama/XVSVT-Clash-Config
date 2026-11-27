#!/system/bin/sh
# update-core.sh 的 --show 输出
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

show_update_config() {
    printf '配置文件: %s\n' "${CONF_USED:-（未使用，走内置默认）}"
    printf 'Box 目录: %s\n\n' "$BOX_HOME"
    printf '%-10s %-16s %-46s %s\n' '内核名' '文件' '路径' '状态'
    for name in $CORE_LIST; do
        file=$(core_file "$name")
        path=$BIN_DIR/$file
        if [ -f "$path" ]; then state='已安装'; else state='未安装'; fi
        printf '%-10s %-16s %-46s %s\n' "$name" "$file" "$path" "$state"
    done
    printf '\n%-10s %-16s %-18s %s\n' '内核名' '仓库' '版本策略' '资产匹配'
    for name in $CORE_LIST; do
        repo=$(core_field "$name" REPO)
        ver=$(core_field "$name" VERSION)
        asset=$(core_field "$name" ASSET)
        url=$(core_field "$name" URL)
        [ -n "$repo" ] || repo=${url:-（未配置来源）}
        [ -n "$ver" ] || ver=latest
        [ -n "$asset" ] || asset='*'
        printf '%-10s %-16s %-18s %s\n' "$name" "$repo" "$ver" "$asset"
    done
    printf '\n模式映射：\n'
    for mode in tun tproxy ebpf redirect mixed enhance unknown; do
        printf '  %-9s → %s\n' "$mode" "$(mode_core "$mode")"
    done
    printf '\n默认内核（不带 --core 时）: %s\n' "$CORE_DEFAULT"
}
