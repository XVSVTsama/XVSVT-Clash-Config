#!/system/bin/sh
# 两条流水线：pre-start（服务启动前）与 update（安装/更新内核）
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

# ---------------------------------------------------------------------------
# 一、服务启动前：按模式挂内核、切脚本、认网卡、放行、处理端口冲突
# ---------------------------------------------------------------------------
run_prestart() {
    require_root
    resolve_js_dir
    select_core
    select_script
    detect_upstream
    detect_downstream
    ensure_dummy_iface
    update_interface_name
    update_ebpf_shared_iface
    allow_forward
    stop_conflicting_packages
    stop_packages
    log "pre-start done mode=$MODE core=$(describe_core) upstream=${UPSTREAM:-none} downstream=${DOWNSTREAM:-none}"
}

# ---------------------------------------------------------------------------
# 二、安装 / 更新：解析来源 → 下载 → 校验 → 自检 → 写入 → 必要时重启
# ---------------------------------------------------------------------------
run_update() {
    require_root
    CORE_NAME=${CORE_NAME:-$CORE_DEFAULT}
    in_list "$CORE_NAME" || die "内核 '$CORE_NAME' 不在 CORE_LIST 里（用 show 看可用名字）"

    TARGET=$BIN_DIR/$(core_file "$CORE_NAME")
    LINK=$BIN_DIR/mihomo
    BOXCTL=$BIN_DIR/boxctl
    RUN_DIR=$BOX_HOME/run
    STARTUP=$RUN_DIR/state/config/startup-config
    [ -x "$BOXCTL" ] || die "找不到可执行的 $BOXCTL"

    STAGE=${TMPDIR:-/data/local/tmp}/box-core-update.$$
    mkdir -p "$STAGE" 2>/dev/null || die "无法创建临时目录 $STAGE"
    trap cleanup EXIT INT TERM

    resolve_source
    download
    verify_sha256
    unpack
    probe_binary
    check_startup_config
    install_binary
    link_if_needed

    if [ "$DRY_RUN" = 1 ]; then
        restart_service
        log "dry-run 完成，未做任何改动"
        return 0
    fi

    if ! apply_needed; then
        log "当前模式没有用到 $CORE_NAME，跳过重启；下次启动时按模式自动挂载"
        log "完成：$CORE_NAME（$(core_file "$CORE_NAME")）"
        return 0
    fi

    if restart_service; then
        log "完成：$CORE_NAME（$(core_file "$CORE_NAME")）"
        return 0
    fi
    rollback
    return 1
}
