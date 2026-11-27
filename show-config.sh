#!/system/bin/sh
# 手动：查看配置解析结果（只读，不下载、不改任何东西）
#
# 显示：内核名 / 文件 / 路径 / 安装状态、来源与版本策略、模式映射、当前检测到的模式。
# 会同时读自动部分的 box-auto.conf 与手动部分的 box-update.conf。
# 不需要 root 也能跑（非 root 时“已安装/未安装”可能不准）。
#
# 用法：
#   sh show-config.sh
#   sh show-config.sh --conf-auto <文件> --conf-update <文件> --home <目录>
#   sh show-config.sh -h

DRY_RUN=0
CONF_AUTO=''
CONF_UPDATE=''
BOX_HOME_CLI=''

BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -d "$lib_dir" ]; then
    printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
for mod in 00-common 10-mode 70-report; do
    if [ ! -f "$lib_dir/$mod.sh" ]; then
        printf '错误: 缺少模块 %s\n' "$lib_dir/$mod.sh" >&2
        exit 2
    fi
    # shellcheck disable=SC1090
    . "$lib_dir/$mod.sh"
done

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^BOX_CORE_LIB=/) exit
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
            --conf-auto) need_value "$1" $#; CONF_AUTO=$2; shift 2 ;;
            --conf-update) need_value "$1" $#; CONF_UPDATE=$2; shift 2 ;;
            --home) need_value "$1" $#; BOX_HOME_CLI=$2; shift 2 ;;
            -h | --help) usage; exit 0 ;;
            *)
                printf '错误: 未知参数 %s（用 -h 看用法）\n' "$1" >&2
                exit 2
                ;;
        esac
    done
}

main() {
    parse_args "$@"
    init_defaults
    load_auto_conf
    discover_cores_from_confs
    init_defaults
    list_auto=$CORE_LIST
    load_update_conf
    init_defaults
    CORE_LIST=$(merge_core_list "$list_auto" $CORE_LIST)
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_core_names
    check_mode_map
    detect_mode
    show_config
    exit 0
}

main "$@"
