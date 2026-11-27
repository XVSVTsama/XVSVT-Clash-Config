#!/system/bin/sh
# BoxProxy 唯一执行脚本
#
# 一条命令三件事：
#
#   sh iface-auto.sh                 服务启动前流程（由 boxctl 自动调用，不用你管）
#   sh iface-auto.sh show            看配置解析：模式 → 内核 → 文件 → 路径、来源与安装状态
#   sh iface-auto.sh update [...]    安装 / 更新内核（首次安装也是它）
#
# 配置只有一份：同目录的 box-core.conf（没有就用内置默认值）。
# 功能都拆在 lib/ 里，本文件只做参数、加载模块、分发：
#
#   lib/00-common.sh   配置加载与默认值、CORE_*/MODE_CORE_* 取值、日志包装、校验
#   lib/10-mode.sh     当前网络模式识别（也给 update 判断“现在用的是哪个内核”）
#   lib/20-core.sh     模式 → 内核名 → 文件 → 路径 → ln -f bin/mihomo
#   lib/30-scripts.sh  覆写脚本目录与 mihomo-scripts.yaml
#   lib/40-net.sh      出口网卡、下联网卡、dummy、FORWARD
#   lib/50-js-fields.sh interface-name / EBPF_SHARED_IFACE_SPEC
#   lib/60-conflict.sh 端口冲突检测与停包
#   lib/70-report.sh   show 的表格输出
#   lib/80-release.sh  查仓库发布、匹配资产、拼下载地址（镜像 / Token）
#   lib/82-fetch.sh    下载 → SHA-256 → 解包 → -v 自检 → -t 配置检查
#   lib/84-install.sh  写入 / 备份 / 回滚、挂链、重启
#   lib/88-run.sh      两条流水线：pre-start 与 update
#
# 常用参数：
#   --dry-run            只打印将要做的改动（pre-start 与 update 都支持）
#   --conf <文件>        指定配置文件（默认同目录 box-core.conf）
#   --home <目录>        Box 工作目录
#   --core <名字>        update 时指定内核（名字来自配置，默认 CORE_DEFAULT）
#   --url / --repo / --asset / --version / --release-tag / --sha256 / --tag
#   --api-base / --download-prefix / --token   临时覆盖配置里的下载选项
#   -v, --verbose        pre-start 时把日志同时打到终端
#   -h, --help           帮助
#
# 退出码：0 成功；1 已回滚（update）；2 参数或环境错误（未改动任何文件）
#
# ============================================================================
# 以下为代码
# ============================================================================

DRY_RUN=0
VERBOSE=0
CONF=''
BOX_HOME_CLI=''
CMD=prestart
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
            prestart | start) CMD=prestart; shift ;;
            show | status) CMD=show; shift ;;
            update | install) CMD=update; shift ;;
            --show) CMD=show; shift ;;
            -n | --dry-run) DRY_RUN=1; shift ;;
            -v | --verbose) VERBOSE=1; shift ;;
            -c | --conf) need_value "$1" $#; CONF=$2; shift 2 ;;
            --home) need_value "$1" $#; BOX_HOME_CLI=$2; shift 2 ;;
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
        printf '错误: 找不到模块目录 %s\n' "$lib_dir" >&2
        printf '      请把仓库里的 lib/ 一起放到 scripts/ 下\n' >&2
        exit 2
    fi
    for module in 00-common 10-mode 20-core 30-scripts 40-net 50-js-fields 60-conflict 70-report 80-release 82-fetch 84-install 88-run; do
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
    load_conf
    init_defaults
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_config
    detect_mode

    case "$CMD" in
        show)
            show_config
            exit 0
            ;;
        update)
            LOG_TERMINAL=1
            run_update
            exit $?
            ;;
        *)
            run_prestart
            exit 0
            ;;
    esac
}

main "$@"
