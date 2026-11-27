#!/system/bin/sh
# 统一展示：配置来源、内核清单、模式映射
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

show_config() {
    printf '自动部分配置: %s\n' "${CONF_AUTO_USED:-（未使用，走内置默认值）}"
    printf '手动部分配置: %s\n' "${CONF_UPDATE_USED:-（未使用，走内置默认值）}"
    printf 'Box 目录: %s\n' "$BOX_HOME"
    [ "$(id -u)" = 0 ] || printf '（非 root，下面的“已安装/未安装”可能不准）\n'
    printf '\n'

    printf '%-10s %-14s %-52s %s\n' '内核名' '文件' '路径' '状态'
    for name in $CORE_LIST; do
        file=$(core_file "$name")
        path=$BIN_DIR/$file
        if [ -f "$path" ]; then state='已安装'; else state='未安装'; fi
        printf '%-10s %-14s %-52s %s\n' "$name" "$file" "$path" "$state"
    done

    printf '\n%-10s %-18s %-12s %s\n' '内核名' '来源（仓库 / 链接）' '版本策略' '资产匹配'
    for name in $CORE_LIST; do
        repo=$(core_field "$name" REPO)
        url=$(core_field "$name" URL)
        ver=$(core_field "$name" VERSION)
        asset=$(core_field "$name" ASSET)
        [ -n "$ver" ] || ver=latest
        [ -n "$asset" ] || asset='*'
        if [ -n "$repo" ]; then
            src=$repo
        elif [ -n "$url" ]; then
            src=$url
        else
            src='（未配置）'
        fi
        printf '%-10s %-18s %-12s %s\n' "$name" "$src" "$ver" "$asset"
    done

    printf '\n模式映射:\n'
    for mode in tun tproxy ebpf redirect mixed enhance unknown; do
        name=$(mode_core "$mode")
        printf '  %-9s → %-10s %s\n' "$mode" "$name" "$(core_path "$name")"
    done
    printf '\n当前检测到的模式: %s → %s\n' "$MODE" "$(mode_core "$MODE")"
    printf '默认内核（update 不带 --core 时）: %s\n' "${CORE_DEFAULT:-ebpf}"
}
