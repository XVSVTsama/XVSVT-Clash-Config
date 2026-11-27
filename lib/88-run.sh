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
    ensure_core_ready
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
# 二、安装 / 更新：解析来源 → 下载 → 校验 → 自检 → 写入
# ---------------------------------------------------------------------------

# 只把内核装进 bin/，不挂链、不重启（启动前自动安装与手动 update 共用）
install_core() {
    CORE_NAME=$1
    TARGET=$BIN_DIR/$(core_file "$CORE_NAME")
    STARTUP=$BOX_HOME/run/state/config/startup-config
    STAGE=${TMPDIR:-/data/local/tmp}/box-core-install.$$
    mkdir -p "$STAGE" 2>/dev/null || die "无法创建临时目录 $STAGE"
    trap cleanup EXIT INT TERM

    resolve_source
    download
    verify_sha256
    unpack
    probe_binary
    check_startup_config
    install_binary
}

# 来源标记：记录装的是哪个资产 / 哪个地址，供启动前比较是否需要更新
source_stamp() {
    printf '%s\n' "${ASSET_NAME:-${URL:-}}"
}

core_is_current() {
    local name=$1 target stamp remote
    target=$(core_path "$name")
    [ -f "$target.source" ] || return 1
    stamp=$(cat "$target.source" 2>/dev/null)
    [ -n "$stamp" ] || return 1
    # 在子 shell 里查来源：网络或配置出错时只影响这次判断，不打断启动
    remote=$(
        CORE_NAME=$name
        STAGE=${TMPDIR:-/data/local/tmp}/box-core-check.$$
        mkdir -p "$STAGE" || exit 1
        resolve_source >/dev/null 2>&1 || { rm -rf "$STAGE"; exit 1; }
        source_stamp
        rm -rf "$STAGE"
    ) 2>/dev/null
    [ -n "$remote" ] && [ "$stamp" = "$remote" ]
}

# 启动前：模式要用的内核不存在就自动装；配了 AUTO_UPDATE=on 且远端变了就升级
ensure_core_ready() {
    local name target
    name=$(mode_core "$MODE")
    target=$(core_path "$name")

    if [ -f "$target" ]; then
        if [ "$AUTO_UPDATE" = on ]; then
            log "检查 $name 是否有新版本（AUTO_UPDATE=on）"
            if core_is_current "$name"; then
                log "  $name 已是配置里的最新来源，跳过"
            else
                log "  $name 有变化，开始更新"
                ( install_core "$name" ) || log "warn: 更新 $name 失败，继续用现有文件"
            fi
        fi
        return 0
    fi

    if [ "$AUTO_INSTALL" != on ]; then
        log "warn: 内核 $name 的文件 $(core_file "$name") 不存在，且 AUTO_INSTALL=off"
        return 0
    fi

    log "内核 $name 未安装，按配置自动安装"
    if ( install_core "$name" ); then
        log "安装完成：$name → $target"
    else
        log "warn: 自动安装 $name 失败，继续尝试启动（可能缺内核）"
    fi
}

# ---------------------------------------------------------------------------
# 三、手动 update：装完后挂链、必要时重启
# ---------------------------------------------------------------------------
run_update() {
    require_root
    CORE_NAME=${CORE_NAME:-$CORE_DEFAULT}
    in_list "$CORE_NAME" || die "内核 '$CORE_NAME' 不在 CORE_LIST 里（用 show 看可用名字）"

    LINK=$BIN_DIR/mihomo
    BOXCTL=$BIN_DIR/boxctl
    RUN_DIR=$BOX_HOME/run
    STARTUP=$RUN_DIR/state/config/startup-config
    [ -x "$BOXCTL" ] || die "找不到可执行的 $BOXCTL"

    install_core "$CORE_NAME"
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
