#!/system/bin/sh
# 手动：安装 / 更新内核（会联网下载）
#
# 读同目录的 box-update.conf，把「配了来源」的内核都装一遍：
#   直接覆盖写入，不生成备份文件；重启失败只报错，不回滚。
# 装完只有当前模式用到的那个才挂到 bin/mihomo 并重启。
#
# 路径与参数全部固化，没有环境变量可调；配置文件固定为同目录的
# box-update.conf（下载来源）与 box-auto.conf（规则表，用来判断当前模式用哪个内核）。
#
# 用法：
#   sh update-core.sh            安装/更新所有配了来源的内核
#   sh update-core.sh --core x   只装指定内核
#   sh update-core.sh --dry-run  只解析来源并打印步骤
#   sh update-core.sh -h         帮助
#
# 退出码：0 成功；1 已写入但服务没起来；2 参数或环境错误（未改动任何文件）

set -u

CORE_NAME=''
DRY_RUN=0

# ============================================================================
# 公共模块
# ============================================================================

BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -d "$lib_dir" ]; then
    printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
for mod in 00-common 10-mode 25-rules 80-release 82-fetch 84-install 88-run; do
    if [ ! -f "$lib_dir/$mod.sh" ]; then
        printf '错误: 缺少模块 %s\n' "$lib_dir/$mod.sh" >&2
        exit 2
    fi
    # shellcheck disable=SC1090
    . "$lib_dir/$mod.sh"
done

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^set -u/) exit
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
            --core) need_value "$1" $#; CORE_NAME=$2; shift 2 ;;
            -n | --dry-run) DRY_RUN=1; shift ;;
            -h | --help) usage; exit 0 ;;
            *) printf '错误: 未知参数 %s（用 -h 看用法）\n' "$1" >&2; exit 2 ;;
        esac
    done
}

main() {
    parse_args "$@"
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

    LOG_TERMINAL=1
    run_update
    exit $?
}

main "$@"
