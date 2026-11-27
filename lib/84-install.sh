#!/system/bin/sh
# 写入/备份/回滚、挂链、重启（update-core.sh 用）
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

install_binary() {
    local first=0 tmp
    LINKED_BEFORE=0
    if [ -f "$LINK" ] && [ "$(stat -c %i "$LINK" 2>/dev/null)" = "$(stat -c %i "$TARGET" 2>/dev/null)" ]; then
        LINKED_BEFORE=1
    fi
    [ -f "$TARGET" ] || first=1
    if [ "$DRY_RUN" = 1 ]; then
        if [ "$first" = 1 ]; then
            log "[7/9] [dry-run] 首次安装：写入 $TARGET"
        else
            log "[7/9] [dry-run] 备份并替换 $TARGET"
        fi
        return 0
    fi
    if [ "$first" = 1 ]; then
        log "[7/9] 首次安装：$TARGET"
    else
        log "[7/9] 备份并替换 $TARGET"
        BACKUP=$TARGET.bak-$(date +%Y%m%d-%H%M%S)
        cp -p "$TARGET" "$BACKUP" || die "备份失败，未做任何改动"
        log "      备份：$BACKUP"
    fi
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

rollback() {
    if [ -z "${BACKUP:-}" ] || [ ! -f "$BACKUP" ]; then
        log "首次安装失败，没有旧版本可回滚；已写入的文件请手动删除：$TARGET"
        return 1
    fi
    log "回滚到 $BACKUP"
    cp -p "$BACKUP" "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" &&
        chown root:net_admin "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" 2>/dev/null
    chmod 6755 "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" 2>/dev/null
    mv "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" "$TARGET" || return 1
    "$BOXCTL" restart >/dev/null 2>&1 || true
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "已恢复旧内核并重启"
    else
        log "回滚后服务仍未起来，请用 BoxProxy 界面手动启动并查看日志"
    fi
}

cleanup() {
    [ -n "${STAGE:-}" ] && rm -rf "$STAGE"
}
