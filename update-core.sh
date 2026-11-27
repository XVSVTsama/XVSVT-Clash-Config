#!/system/bin/sh
# BoxProxy 内核安装 / 更新（读同一个 box-core.conf）
#
# 第一次安装和后续更新是同一套流程：目标文件不存在就新建，存在就先备份再替换。
# 内核叫什么、文件放哪、去哪个仓库找，全部来自配置，不写死在本脚本里。
#
# 本文件只是入口，功能在 lib/ 里（与 iface-auto.sh 共用 00-common / 10-mode）：
#   lib/00-common.sh   配置加载、CORE_*/MODE_CORE_* 取值、校验、日志包装（共用）
#   lib/10-mode.sh     模式识别（共用）
#   lib/80-release.sh  查发布、挑资产、拼下载地址
#   lib/82-fetch.sh    下载 → SHA-256 → 解包 → -v 自检 → -t 配置检查
#   lib/84-install.sh  写入/备份/回滚、挂链、重启
#   lib/86-report.sh   --show 输出
#
# 用法（在 BoxProxy 的「工具 → 脚本」里运行，或 su 后手动执行）：
#   sh update-core.sh --show              看每个内核的配置与安装状态（不需要 root）
#   sh update-core.sh                     安装/更新 CORE_DEFAULT 指向的内核
#   sh update-core.sh --core <名字>       安装/更新指定内核
#   sh update-core.sh --core <名字> --dry-run   只解析来源并打印步骤
#
# 流程：[1/9] 解析来源 → 下载 → SHA-256 → 解包 → -v 自检 → -t 配置检查
#       → 备份并替换（首次安装直接写入）→ 需要时挂到 bin/mihomo → 重启
# 退出码：0 成功；1 失败（已回滚）；2 参数或环境错误（未改动任何文件）
#
# 注意：bin/ 下的核心会被 BoxProxy 设为 setuid/setgid 运行，只装可信来源的二进制。

set -u

# ============================================================================
# 参数默认值（命令行会覆盖它们）
# ============================================================================

DRY_RUN=0
SHOW=0
CONF=''
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
# 公共部分
# ============================================================================

BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -d "$lib_dir" ]; then
    printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
for mod in 00-common 10-mode 80-release 82-fetch 84-install 86-report; do
    if [ ! -f "$lib_dir/$mod.sh" ]; then
        printf '错误: 缺少模块 %s\n' "$lib_dir/$mod.sh" >&2
        exit 2
    fi
    # shellcheck disable=SC1090
    . "$lib_dir/$mod.sh"
done

# update-core 自己的默认值与输出方式（只打终端，不写 prestart.log）
API_BASE=${API_BASE:-https://api.github.com}
DOWNLOAD_PREFIX=${DOWNLOAD_PREFIX:-}
TOKEN=${TOKEN:-}
log() {
    printf '%s\n' "$*"
}

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# --- 以下为代码 ---/) exit
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
            --conf) need_value "$1" $#; CONF=$2; shift 2 ;;
            --dry-run) DRY_RUN=1; shift ;;
            --show) SHOW=1; shift ;;
            -h | --help) usage; exit 0 ;;
            *) printf '错误: 未知参数 %s（用 -h 看用法）\n' "$1" >&2; exit 2 ;;
        esac
    done
}

pick() {
    eval "override=\${O_$1:-}"
    if [ -n "$override" ]; then
        printf '%s' "$override"
    else
        core_field "$CORE_NAME" "$1"
    fi
}

main() {
    parse_args "$@"
    init_defaults
    load_conf
    init_defaults
    check_config

    if [ "$SHOW" = 1 ]; then
        show_update_config
        exit 0
    fi

    require_root
    CORE_NAME=${CORE_NAME:-$CORE_DEFAULT}
    in_list "$CORE_NAME" || die "内核 '$CORE_NAME' 不在 CORE_LIST 里（用 --show 看可用名字）"

    TARGET=$BIN_DIR/$(core_file "$CORE_NAME")
    LINK=$BIN_DIR/mihomo
    BOXCTL=$BIN_DIR/boxctl
    RUN_DIR=$BOX_HOME/run
    STARTUP=$RUN_DIR/state/config/startup-config
    [ -x "$BOXCTL" ] || die "找不到可执行的 $BOXCTL"
    STAGE=${TMPDIR:-/data/local/tmp}/core-update.$$
    mkdir -p "$STAGE" 2>/dev/null || die "无法创建临时目录 $STAGE"
    trap cleanup EXIT INT TERM

    resolve_source
    download
    verify_sha256
    unpack
    probe_binary
    check_startup_config
    install_binary
    link_if_needed

    if [ "$DRY_RUN" = 1 ]; then
        restart_service
        log "dry-run 完成，未做任何改动"
        exit 0
    fi

    if ! apply_needed; then
        log "当前模式没有用到 $CORE_NAME，跳过重启；下次启动时由 iface-auto.sh 按模式挂载"
        log "完成：$CORE_NAME（$(core_file "$CORE_NAME")）"
        exit 0
    fi

    if restart_service; then
        log "完成：$CORE_NAME（$(core_file "$CORE_NAME")）"
        exit 0
    fi
    rollback
    exit 1
}

main "$@"
