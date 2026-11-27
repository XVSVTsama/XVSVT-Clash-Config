#!/system/bin/sh
# 手动：查看配置解析结果（只读，不下载、不改任何东西）
#
# 显示：内核名 / 文件 / 路径 / 安装状态、来源与版本策略、选择方式与规则求值预览。
# 不需要 root 也能跑（非 root 时「已安装/未安装」可能不准）。
#
# 用法：
#   sh show-config.sh
#   sh show-config.sh -h

BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -d "$lib_dir" ]; then
    printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
for mod in 00-common 10-mode 20-core 25-rules 70-report; do
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

main() {
    case "${1:-}" in
        -h | --help) usage; exit 0 ;;
        '') ;;
        *) printf '错误: 未知参数 %s（用 -h 看用法）\n' "$1" >&2; exit 2 ;;
    esac

    init_defaults
    load_auto_conf
    discover_cores_from_confs
    init_defaults
    load_update_conf
    discover_cores_from_confs
    init_defaults
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_core_names
    detect_mode
    show_config
    exit 0
}

main "$@"
