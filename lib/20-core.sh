#!/system/bin/sh
# 按模式选内核并挂到 bin/mihomo
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

describe_core() {
    local inode name
    inode=$(stat -c %i "$CORE_LINK" 2>/dev/null)
    [ -n "$inode" ] || {
        printf 'unknown\n'
        return 0
    }
    for name in $CORE_LIST; do
        if [ -f "$(core_path "$name")" ] && \
            [ "$inode" = "$(stat -c %i "$(core_path "$name")" 2>/dev/null)" ]; then
            printf '%s\n' "$name"
            return 0
        fi
    done
    printf 'unknown\n'
}

