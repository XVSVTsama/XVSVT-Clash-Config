#!/system/bin/sh
# BoxProxy 服务启动前的自动脚本（不联网、不下载）
#
# 由 boxctl 在启动前调用，按规则表选出内核并挂到 bin/mihomo，再做本地准备：
#   1. 读 box-auto.conf 的 RULES（没写就用内置默认规则）
#   2. 规则求值：命中即用，候选按顺序试；不可用就报错退出
#   3. 把选中的内核 ln -f 到 bin/mihomo
#   4. 切覆写脚本清单、认网卡、挂 dummy、写 JS 字段、放行 FORWARD、端口冲突
#
# 路径与参数全部固化：Box 目录固定 /data/user/0/com.boxproxy.box/files/box，
# 配置文件固定在同目录的 box-auto.conf / box-update.conf。
#
# 用法：
#   sh iface-auto.sh            正常执行（boxctl 自动调用）
#   sh iface-auto.sh --dry-run  只打印将要做的改动，不写盘、不动 iptables
#   sh iface-auto.sh -h         帮助
#
# ============================================================================
# 以下为代码
# ============================================================================

DRY_RUN=0
VERBOSE=0

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# ={10,}/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            -n | --dry-run) DRY_RUN=1 ;;
            -v | --verbose) VERBOSE=1 ;;
            -h | --help) usage; exit 0 ;;
            *)
                printf '错误: 未知参数 %s（用 -h 看用法）\n' "$arg" >&2
                exit 2
                ;;
        esac
    done
}

load_modules() {
    BOX_CORE_LIB=1
    lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
    if [ ! -d "$lib_dir" ]; then
        printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
        exit 2
    fi
    for module in 00-common 10-mode 20-core 25-rules 30-scripts 40-net 50-js-fields 60-conflict 88-run; do
        file=$lib_dir/$module.sh
        if [ ! -f "$file" ]; then
            printf '错误: 缺少模块 %s\n' "$file" >&2
            exit 2
        fi
        # shellcheck disable=SC1090
        . "$file"
    done
}

# 手动运行（工具 → 脚本）还是被 boxctl 当启动前脚本调用：看父进程链里有没有 boxctl
is_manual_run() {
    local p=$PPID i=0 cmd
    while [ "$i" -lt 3 ] && [ -n "$p" ] && [ "$p" != 0 ]; do
        cmd=$(tr '\0' ' ' <"/proc/$p/cmdline" 2>/dev/null)
        case "$cmd" in *boxctl*) return 1 ;; esac
        p=$(awk '/^PPid:/{print $2}' "/proc/$p/status" 2>/dev/null)
        i=$((i + 1))
    done
    return 0
}

# 给人看的收尾小结：手动运行打屏，自动运行只进日志
print_summary() {
    local share script marker
    share=$(sed -n "s/^[[:space:]]*HOTSPOT_SHARE=['\"]\{0,1\}\([^'\"]*\)['\"]\{0,1\}[[:space:]]*$/\1/p" \
        "$BOX_HOME/scripts/box-auto.conf" 2>/dev/null | tail -1)
    marker=$(grep -l "// hotspot-lan" "$JS_DIR"/*.js 2>/dev/null | wc -l | tr -d ' ')
    log "—— 运行结果 ——"
    log "模式: ${MODE:-未知}    内核: ${CORE_USED:-未知}（$(core_file "${CORE_USED:-}")）"
    log "上游: ${UPSTREAM:-未识别}    下联: ${DOWNSTREAM:-无（热点没开）}"
    if script=$(mode_script_name 2>/dev/null); then
        log "覆写脚本: $script"
    fi
    log "FORWARD 放行: ${DOWNSTREAM:-无下联，跳过}"
    if [ "${share:-}" = off ] || [ -z "${share:-}" ]; then
        log "热点共享: 关（HOTSPOT_SHARE=${share:-off}）"
    else
        log "热点共享: 开（HOTSPOT_SHARE=$share，$marker 份覆写脚本带规则）"
    fi
    log "日志: $LOG_FILE"
    log "—— 对首页按钮的影响 ——"
    log "重新生成启动配置: 没做（本脚本只改 bin/mihomo 与覆写脚本启用清单）"
    log "重载: 没做 | 重启: 没做 | 停止: 没做（核心进程没被碰）"
    log "服务状态: $("$BOX_HOME/bin/boxctl" status 2>/dev/null | grep -q '正在运行' && echo '运行中' || echo '已停止')（脚本不改变）"
    log "生效时机: 内核与覆写脚本的改动，在下次启动或点一次「重载」后生效"
}

main() {
    parse_args "$@"
    load_modules

    init_defaults
    load_auto_conf
    discover_cores_from_confs
    init_defaults
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_core_names
    detect_mode

    if is_manual_run && [ "$DRY_RUN" = 0 ]; then
        LOG_TERMINAL=1
        printf '开始：%s 模式 %s\n' "$(basename "$0")" "${MODE:-未知}"
    fi

    run_prestart
    print_summary
    exit 0
}

main "$@"
