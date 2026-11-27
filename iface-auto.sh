#!/system/bin/sh
# BoxProxy 服务启动前的入口脚本（以 root 执行）
#
# 这是唯一要登记到 BoxProxy「服务启动前脚本」的文件；具体功能拆在同目录的 lib/ 里：
#
#   lib/00-common.sh      配置加载、变量取用、日志与执行包装、校验
#   lib/10-mode.sh        当前网络模式识别
#   lib/20-core.sh        按模式把对应内核挂到 bin/mihomo
#   lib/30-scripts.sh     覆写脚本目录与清单（mihomo-scripts.yaml）
#   lib/40-net.sh         出口网卡、下联网卡、dummy、FORWARD 放行
#   lib/50-js-fields.sh   把网卡名写进覆写脚本的字段
#   lib/60-conflict.sh    端口冲突检测与停包
#   lib/70-report.sh      --show 输出
#
# 配置：同目录的 box-core.conf（没有就用内置默认值）。
#   确认配成什么样：sh iface-auto.sh --show
#
# 用法：
#   sh iface-auto.sh            正常执行（由 boxctl 在服务启动前调用）
#   sh iface-auto.sh --show     只打印配置解析结果，不改任何东西
#   sh iface-auto.sh --dry-run  只打印将要做的改动，不写盘、不动 iptables
#   sh iface-auto.sh -h         帮助

# ============================================================================
# 参数
# ============================================================================

DRY_RUN=0
VERBOSE=0
SHOW=0
CONF=''
BOX_HOME_CLI=''

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
            --show) SHOW=1 ;;
            -h | --help) usage; exit 0 ;;
            -c | --conf) CONF_NEXT=1 ;;
            --home) HOME_NEXT=1 ;;
            *)
                if [ "${CONF_NEXT:-0}" = 1 ]; then
                    CONF=$arg
                    CONF_NEXT=0
                elif [ "${HOME_NEXT:-0}" = 1 ]; then
                    BOX_HOME_CLI=$arg
                    HOME_NEXT=0
                else
                    printf 'unknown argument: %s\n' "$arg" >&2
                    exit 2
                fi
                ;;
        esac
    done
}

# ============================================================================
# 加载模块
# ============================================================================

load_modules() {
    BOX_CORE_LIB=1
    lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
    if [ ! -d "$lib_dir" ]; then
        printf '错误: 找不到模块目录 %s\n' "$lib_dir" >&2
        printf '      请把仓库里的 lib/ 一起放到 scripts/ 下\n' >&2
        exit 2
    fi
    for module in 00-common 10-mode 20-core 30-scripts 40-net 50-js-fields 60-conflict 70-report; do
        file=$lib_dir/$module.sh
        if [ ! -f "$file" ]; then
            printf '错误: 缺少模块 %s\n' "$file" >&2
            exit 2
        fi
        # shellcheck disable=SC1090
        . "$file"
    done
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    parse_args "$@"
    load_modules

    init_defaults
    load_conf
    init_defaults
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_config
    detect_mode

    if [ "$SHOW" = 1 ]; then
        show_config
        exit 0
    fi

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
    exit 0
}

main "$@"
