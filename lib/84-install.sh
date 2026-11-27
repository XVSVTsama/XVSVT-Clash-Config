#!/system/bin/sh
# 写入、挂链、重启（update-core.sh 用；不生成备份文件）
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

# 直接替换目标文件：不生成 .bak 之类的新文件（临时文件当场 rename 掉）
install_binary() {
    local tmp
    LINKED_BEFORE=0
    if [ -f "$LINK" ] && [ "$(stat -c %i "$LINK" 2>/dev/null)" = "$(stat -c %i "$TARGET" 2>/dev/null)" ]; then
        LINKED_BEFORE=1
    fi
    if [ "$DRY_RUN" = 1 ]; then
        log "[7/9] [dry-run] 写入 $TARGET"
        return 0
    fi
    log "[7/9] 写入 $TARGET"
    tmp=$BIN_DIR/.$(core_file "$CORE_NAME").new
    cp "$NEW" "$tmp" || die "写入临时文件失败"
    chown root:net_admin "$tmp" 2>/dev/null
    chmod 6755 "$tmp" 2>/dev/null
    mv "$tmp" "$TARGET" || die "替换失败"
    log "      已写入：$TARGET"
    return 0
}

restart_service() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[9/9] [dry-run] $BOXCTL restart"
        return 0
    fi
    log "[9/9] 重启服务"
    "$BOXCTL" restart >"$STAGE/restart.log" 2>&1 || true
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "      服务已启动"
        return 0
    fi
    tail -5 "$STAGE/restart.log"
    return 1
}


cleanup() {
    [ -n "${STAGE:-}" ] && rm -rf "$STAGE"
}
