#!/system/bin/sh
# 按模式选内核并挂到 bin/mihomo
#
# 由 iface-auto.sh 通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 iface-auto.sh 的模块，不能单独运行。" >&2
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

select_core() {
    local name fallback target inode cur

    name=$(mode_core "$MODE")
    target=$(core_path "$name")
    log "模式 $MODE → 内核 $name（$target）"

    if [ ! -f "$target" ]; then
        fallback=$(mode_core vanilla)
        if [ "$fallback" != "$name" ] && [ -f "$(core_path "$fallback")" ]; then
            log "warn: 内核 $name 的文件 $(core_file "$name") 不存在，退回 $fallback"
            name=$fallback
            target=$(core_path "$name")
        else
            log "warn: 内核 $name 的文件 $(core_file "$name") 不存在，且没有可退回的内核，保持现状"
            CORE_USED=unknown
            return 0
        fi
    fi

    if [ ! -x "$target" ]; then
        log "warn: $target 不可执行，跳过切换（内核 $name）"
        CORE_USED=unknown
        return 0
    fi

    CORE_USED=$name
    cur=$(stat -c %i "$CORE_LINK" 2>/dev/null)
    inode=$(stat -c %i "$target" 2>/dev/null)
    [ "$cur" = "$inode" ] && return 0

    if run ln -f "$target" "$CORE_LINK" 2>/dev/null; then
        log "core -> $name（$(core_file "$name")）"
    else
        log "warn: 链接 $CORE_LINK 到 $name 失败"
    fi
}
