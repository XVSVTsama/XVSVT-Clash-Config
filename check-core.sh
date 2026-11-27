#!/system/bin/sh
# 手动：校验已经装好的内核（本地，不联网）
#
# 做的事：
#   1. 跑 <内核> -v，打印版本；
#   2. 用 <内核> -t 检查当前启动配置能不能被它接受；
#   3. 报告 bin/mihomo 现在指向哪个内核。
#
# 用法：
#   sh check-core.sh                 校验当前模式要用的内核
#   sh check-core.sh --core <名字>   校验指定内核
#   sh check-core.sh -h

CONF_AUTO=''
BOX_HOME_CLI=''
CORE_NAME=''

BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -d "$lib_dir" ]; then
    printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
for mod in 00-common 10-mode; do
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
            --core) need_value "$1" $#; CORE_NAME=$2; shift 2 ;;
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

main() {
    parse_args "$@"
    init_defaults
    load_auto_conf
    discover_cores_from_confs
    init_defaults
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_core_names
    detect_mode

    CORE_NAME=${CORE_NAME:-$(mode_core "$MODE")}
    in_list "$CORE_NAME" || die "内核 '$CORE_NAME' 不在 CORE_LIST 里"
    target=$(core_path "$CORE_NAME")
    [ -f "$target" ] || die "内核 $CORE_NAME 还没装：$target（用 update-core.sh 装）"

    printf '内核: %s（%s）\n' "$CORE_NAME" "$target"
    printf '版本: '
    "$target" -v 2>&1 | head -1

    link=$(stat -c %i "$CORE_LINK" 2>/dev/null)
    inode=$(stat -c %i "$target" 2>/dev/null)
    if [ -n "$link" ] && [ "$link" = "$inode" ]; then
        printf '当前 bin/mihomo: 指向它\n'
    else
        printf '当前 bin/mihomo: 不指向它（下次启动会按模式重新挂）\n'
    fi

    startup=$BOX_HOME/run/state/config/startup-config
    if [ ! -f "$startup" ]; then
        printf '配置检查: 跳过（找不到 %s）\n' "$startup"
        exit 0
    fi
    tmp=${TMPDIR:-/data/local/tmp}/box-core-check.$$
    mkdir -p "$tmp"
    if "$target" -t -f "$startup" -d "$tmp" >"$tmp/out.log" 2>&1; then
        printf '配置检查: 通过\n'
        rc=0
    else
        printf '配置检查: 失败\n'
        tail -5 "$tmp/out.log"
        rc=1
    fi
    rm -rf "$tmp"
    exit "$rc"
}

main "$@"
