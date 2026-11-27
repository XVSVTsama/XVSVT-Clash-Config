#!/system/bin/sh
# 手动：安装 / 更新内核（会联网下载）
#
# 读同目录的 box-update.conf（没有就用内置默认值），按里面的来源下载并写入 bin/<文件>；
# 会顺带读一次 box-auto.conf，只为判断「当前模式用不用得到这个内核」（决定要不要重启）：
#   首次安装：文件不存在就直接写入
#   后续更新：先备份旧文件，再替换；服务起不来会自动回滚
#
# 用法（在 BoxProxy 的「工具 → 脚本」里运行，或 su 后手动执行）：
#   sh update-core.sh                    把配了来源的内核都装一遍（日常点这个）
#   sh update-core.sh --core <名字>      只装指定内核
#   sh update-core.sh --core <名字> --dry-run   只解析来源并打印步骤
#   sh update-core.sh -h                 帮助
#
# 常用覆盖参数（不改配置文件也能临时指定）：
#   --repo --asset --version --release-tag --url --sha256 --tag
#   --api-base --download-prefix --token
#
# 退出码：0 成功；1 已回滚；2 参数或环境错误（未改动任何文件）

set -u

# ============================================================================
# 参数默认值
# ============================================================================

DRY_RUN=0
CONF_UPDATE=''
BOX_HOME_CLI=''
CORE_NAME=''

O_REPO=''
O_ASSET=''
O_VERSION=''
O_RELEASE_TAG=''
O_URL=''
O_SHA256=''
O_TAG=''
O_API_BASE=''
O_DOWNLOAD_PREFIX=''
O_TOKEN=''

# ============================================================================
# 公共模块
# ============================================================================

BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -d "$lib_dir" ]; then
    printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
for mod in 00-common 10-mode 80-release 82-fetch 84-install 88-run; do
    if [ ! -f "$lib_dir/$mod.sh" ]; then
        printf '错误: 缺少模块 %s\n' "$lib_dir/$mod.sh" >&2
        exit 2
    fi
    # shellcheck disable=SC1090
    . "$lib_dir/$mod.sh"
done

API_BASE=${API_BASE:-https://api.github.com}
DOWNLOAD_PREFIX=${DOWNLOAD_PREFIX:-}
TOKEN=${TOKEN:-}

# 手动脚本只往终端打日志，不写 prestart.log
log() {
    printf '%s\n' "$*"
}

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
            -n | --dry-run) DRY_RUN=1; shift ;;
            --core) need_value "$1" $#; CORE_NAME=$2; shift 2 ;;
            --repo) need_value "$1" $#; O_REPO=$2; shift 2 ;;
            --asset) need_value "$1" $#; O_ASSET=$2; shift 2 ;;
            --version) need_value "$1" $#; O_VERSION=$2; shift 2 ;;
            --release-tag) need_value "$1" $#; O_RELEASE_TAG=$2; shift 2 ;;
            --url) need_value "$1" $#; O_URL=$2; shift 2 ;;
            --sha256) need_value "$1" $#; O_SHA256=$2; shift 2 ;;
            --tag) need_value "$1" $#; O_TAG=$2; shift 2 ;;
            --api-base) need_value "$1" $#; O_API_BASE=$2; shift 2 ;;
            --download-prefix) need_value "$1" $#; O_DOWNLOAD_PREFIX=$2; shift 2 ;;
            --token) need_value "$1" $#; O_TOKEN=$2; shift 2 ;;
            --home) need_value "$1" $#; BOX_HOME_CLI=$2; shift 2 ;;
            --conf) need_value "$1" $#; CONF_UPDATE=$2; shift 2 ;;
            -h | --help) usage; exit 0 ;;
            *) printf '错误: 未知参数 %s（用 -h 看用法）\n' "$1" >&2; exit 2 ;;
        esac
    done
}

main() {
    parse_args "$@"
    init_defaults
    # 先读自动部分：只是为了拿模式映射（判断更新后要不要重启）与文件名
    load_auto_conf
    discover_cores_from_confs
    list_auto=$CORE_LIST
    load_update_conf
    init_defaults
    CORE_LIST=$(merge_core_list "$list_auto" $CORE_LIST)
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_core_names

    LOG_TERMINAL=1
    run_update
    exit $?
}

main "$@"
