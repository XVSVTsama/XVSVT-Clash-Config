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

    # 让路：App 明确用的是别的核心（sing-box / xray / v2fly / hysteria 等）时不介入。
    # unknown 说明服务还没起、拿不到核心信息，这种情况照常往下做，
    # 否则每次冷启动都会整段跳过（不挂内核、不放行、不切脚本）。
    core_now=$(app_current_core)
    case "$core_now" in
        '' | unknown) log "App 当前核心未知，按 mihomo 处理" ;;
        mihomo) ;;
        *)
            log "App 当前核心是 $core_now（不是 mihomo），本脚本只处理 mihomo，跳过"
            exit 0
            ;;
    esac

    resolve_js_dir
    detect_upstream
    detect_downstream
    if [ -n "${DOWNSTREAM:-}" ]; then TETHER_ON=on; else TETHER_ON=off; fi

    select_core_by_rules
    rc=$?
    if [ "$rc" != 0 ]; then
        if [ "$rc" = 1 ]; then
            log "错误: 规则表没有命中任何一条，停止启动前流程（建议结尾加 always => <默认内核>）"
        else
            log "错误: 规则表要求的内核不可用，停止启动前流程"
        fi
        exit 1
    fi

    select_script
    ensure_dummy_iface
    update_interface_name
    update_ebpf_shared_iface
    allow_forward
    stop_conflicting_packages
    stop_packages
    log "pre-start done mode=$MODE core=$(describe_core) upstream=${UPSTREAM:-none} downstream=${DOWNSTREAM:-none}"
}

# ---------------------------------------------------------------------------
# 二、安装：解析来源 → 下载 → 校验 → 自检 → 写入（手动脚本调用）
# ---------------------------------------------------------------------------

# 只把内核装进 bin/，不挂链、不重启（启动前自动安装与手动 update 共用）
install_core() {
    CORE_NAME=$1
    TARGET=$BIN_DIR/$(core_file "$CORE_NAME")
    STARTUP=$BOX_HOME/run/state/config/startup-config
    STAGE=$TMP_BASE/box-core-install.$$
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

# ---------------------------------------------------------------------------
# 三、手动 update：把配置了来源的内核都装一遍，必要时重启
# ---------------------------------------------------------------------------

# 配了来源（REPO 或 URL）的内核
configured_cores() {
    local name
    for name in $CORE_LIST; do
        if [ -n "$(core_field "$name" REPO)" ] || [ -n "$(core_field "$name" URL)" ]; then
            printf '%s\n' "$name"
        fi
    done
}

run_update() {
    require_root
    BOXCTL=$BIN_DIR/boxctl
    RUN_DIR=$BOX_HOME/run
    STARTUP=$RUN_DIR/state/config/startup-config
    LINK=$BIN_DIR/mihomo

    local targets installed name mode mapped need
    if [ -n "$CORE_NAME" ]; then
        in_list "$CORE_NAME" || die "内核 '$CORE_NAME' 不在配置里（可用名字见 box-auto.conf / box-update.conf）"
        targets=$CORE_NAME
    else
        targets=$(configured_cores)
        [ -n "$targets" ] || die "没有内核配置来源：在 box-update.conf 里填 CORE_ebpf_REPO（或 CORE_<名字>_URL）"
    fi

    installed=''
    for name in $targets; do
        install_core "$name" || return 1
        installed="$installed $name"
    done

    mode=$(current_mode)
    MODE=$mode
    resolve_core_by_rules >/dev/null 2>&1
    rc=$?
    if [ "$rc" = 0 ]; then
        mapped=$CORE_USED
    else
        mapped=''
    fi
    need=0
    if [ -n "$mapped" ]; then
        case " $installed " in
            *" $mapped "*) need=1 ;;
        esac
    fi

    if [ "$DRY_RUN" = 1 ]; then
        if [ "$need" = 1 ]; then
            restart_service
        else
            log "[9/9] [dry-run] 当前模式（$mode）用 ${mapped:-?}，这次没动它，不会重启"
        fi
        log "dry-run 完成，未做任何改动"
        return 0
    fi

    if [ "$need" = 1 ]; then
        mount_core "$mapped"
        log "已把 $mapped 挂到 bin/mihomo（当前模式 $mode）"
    fi

    if [ "$need" != 1 ]; then
        log "当前模式 $mode 用的是 $mapped，这次没动它，跳过重启"
        log "完成：$(printf '%s' "$installed")"
        return 0
    fi

    if [ ! -x "$BOXCTL" ]; then
        log "warn: 找不到 $BOXCTL，跳过重启；下次启动会用上新内核"
        return 0
    fi

    if restart_service; then
        log "完成：$(printf '%s' "$installed")"
        return 0
    fi
    log "错误: 新内核已写入，但服务没能起来；请用 BoxProxy 界面手动启动，或再跑一次 update-core.sh"
    return 1
}
