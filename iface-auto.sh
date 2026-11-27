#!/system/bin/sh
# BoxProxy 服务启动前的自动脚本（不联网、不下载）
#
# 由 boxctl 在启动前调用，只做本地的事：
#   1. 读配置：当前模式用哪个内核、文件叫什么
#   2. 把该内核硬链接到 bin/mihomo（文件不在就报警跳过，不会去下载）
#   3. 切换覆写脚本清单里的模式脚本
#   4. 识别出口网卡与下联，必要时挂 dummy
#   5. 把网卡名写进覆写脚本字段
#   6. 为下联放行 FORWARD
#   7. 端口冲突检测
#
# 装内核、更新内核属于手动操作，见同目录的 update-core.sh；查看配置用 show-config.sh。
#
# 用法：
#   sh iface-auto.sh            正常执行（boxctl 自动调用）
#   sh iface-auto.sh --dry-run  只打印将要做的改动，不写盘、不动 iptables
#   sh iface-auto.sh -h         帮助
#
# 配置：同目录的 box-auto.conf（没有就用内置默认值）。
# 手动部分（装/更新内核）用另一份 box-update.conf，见 update-core.sh。
#
# ============================================================================
# 以下为代码
# ============================================================================

DRY_RUN=0
VERBOSE=0
CONF_AUTO=''
BOX_HOME_CLI=''

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# ={10,}/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

need_value() {
    [ "$2" -ge 2 ] || {
        printf '错误: %s 后面要跟一个值\n' "$1" >&2
        exit 2
    }
}

parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            -n | --dry-run) DRY_RUN=1; shift ;;
            -v | --verbose) VERBOSE=1; shift ;;
            -c | --conf) need_value "$1" $#; CONF_AUTO=$2; shift 2 ;;
            --home) need_value "$1" $#; BOX_HOME_CLI=$2; shift 2 ;;
            -h | --help) usage; exit 0 ;;
            *)
                printf '错误: 未知参数 %s（用 -h 看用法）\n' "$1" >&2
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
    for module in 00-common 10-mode 20-core 30-scripts 40-net 50-js-fields 60-conflict 88-run; do
        file=$lib_dir/$module.sh
        if [ ! -f "$file" ]; then
            printf '错误: 缺少模块 %s\n' "$file" >&2
            exit 2
        fi
        # shellcheck disable=SC1090
        . "$file"
    done
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
    check_mode_map
    detect_mode

    run_prestart
    exit 0
}

main "$@"
