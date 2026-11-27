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

    run_prestart
    exit 0
}

main "$@"
