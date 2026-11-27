#!/system/bin/sh
# bin/mihomo 的识别与挂载
#
# 由入口脚本通过 . 加载，不单独运行。
#
# bin/mihomo 是 BoxProxy 自己的核心文件槽，App 的「更新核心」也往这里写。
# 所以这里只做两件事：认出 bin/mihomo 现在是什么、需要时用独立副本覆盖它。
# 不用硬链接（App 原地写入会连带改掉源文件），也不留任何备份文件。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

# bin/mihomo 的内容是否与内核 $1 相同
link_matches() {
    [ -f "$CORE_LINK" ] && [ -f "$(core_path "$1")" ] || return 1
    cmp -s "$(core_path "$1")" "$CORE_LINK"
}

# bin/mihomo 现在对应哪个自定义内核
#   external = App 自己装进去的（内容与任何自定义内核都不同）
#   none     = 文件不存在
describe_core() {
    local name
    [ -f "$CORE_LINK" ] || {
        printf 'none\n'
        return 0
    }
    for name in $CORE_LIST; do
        if link_matches "$name"; then
            printf '%s\n' "$name"
            return 0
        fi
    done
    printf 'external\n'
}

# 正在运行的核心（读 /proc/*/cmdline，只看 bin/ 下的二进制）
running_core() {
    local pid line base
    for pid in $(ls /proc 2>/dev/null | grep -E '^[0-9]+$'); do
        [ -r "/proc/$pid/cmdline" ] || continue
        line=$(tr '\0' '\n' <"/proc/$pid/cmdline" 2>/dev/null | head -1)
        case "$line" in
            "$BIN_DIR"/*) ;;
            *) continue ;;
        esac
        base=${line##*/}
        case "$base" in
            boxctl | boxbpf | box) continue ;;
        esac
        printf '%s\n' "$base"
        return 0
    done
    return 1
}

# App 当前核心：先看运行中的进程，再问 boxctl，最后读 run/box.identity 末行
app_current_core() {
    local core=''
    core=$(running_core) || core=''
    if [ -z "$core" ]; then
        core=$("$BIN_DIR/boxctl" status 2>/dev/null \
            | sed -n 's/^状态: 核心 \([A-Za-z0-9_-]*\).*/\1/p' | head -1)
    fi
    if [ -z "$core" ] && [ -f "$RUN_DIR/box.identity" ]; then
        core=$(tail -n 1 "$RUN_DIR/box.identity" 2>/dev/null | tr -d '\r')
        case "$core" in
            '' | *[!A-Za-z0-9_.-]*) core='' ;;
        esac
    fi
    printf '%s\n' "${core:-unknown}"
}

# 旧名字，保持兼容
box_current_core() {
    app_current_core
}

# 把内核 $1 写成 bin/mihomo（只在内容不同时写）
mount_core() {
    local name=$1 src before
    src=$(core_path "$name")
    [ -f "$src" ] || {
        log "错误: 找不到内核文件 $src"
        return 2
    }
    if link_matches "$name"; then
        log "bin/mihomo: 已经是 $name"
        return 0
    fi
    before=$(describe_core)
    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] 用 $(core_file "$name") 覆盖 bin/mihomo（当前 $before）"
        return 0
    fi
    # 先删再写：断开可能存在的硬链接，避免截断写入改坏内核源文件
    rm -f "$CORE_LINK" 2>/dev/null
    cp -f "$src" "$CORE_LINK" || {
        log "错误: 写入 $CORE_LINK 失败"
        return 2
    }
    chown root:net_admin "$CORE_LINK" 2>/dev/null
    chmod 6755 "$CORE_LINK" 2>/dev/null
    log "bin/mihomo: $before -> $name（$(core_file "$name")）"
}
