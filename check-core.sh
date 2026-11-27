#!/system/bin/sh
# 手动：校验已经装好的内核（本地，不联网）
#
# 默认校验「按规则表为当前模式选出的那个内核」；也可以 --core 指定。
# 报告：版本、bin/mihomo 现在是哪个内核、它对当前启动配置的 -t 结果。
#
# 用法：
#   sh check-core.sh                 校验规则选出的内核
#   sh check-core.sh --core vanilla  校验指定内核
#   sh check-core.sh -h

CORE_NAME=''

BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -d "$lib_dir" ]; then
    printf '错误: 找不到模块目录 %s，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
for mod in 00-common 10-mode 20-core 25-rules; do
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
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_core_names
    detect_mode

    if [ -z "$CORE_NAME" ]; then
        if resolve_core_by_rules >/dev/null 2>&1; then
            CORE_NAME=$CORE_USED
        else
            die "规则表没有选出可用内核（用 show-config.sh 看求值过程）"
        fi
    fi
    in_list "$CORE_NAME" || die "内核 '$CORE_NAME' 不在配置里"
    target=$(core_path "$CORE_NAME")
    [ -f "$target" ] || die "内核 $CORE_NAME 还没装：$target（用 update-core.sh 装）"

    printf '内核: %s（%s）\n' "$CORE_NAME" "$target"
    printf '版本: '
    "$target" -v 2>&1 | head -1

    if link_matches "$CORE_NAME"; then
        printf '当前 bin/mihomo: 就是它\n'
    else
        printf '当前 bin/mihomo: 不是它（当前 %s）\n' "$(describe_core)"
    fi

    startup=$BOX_HOME/run/state/config/startup-config
    if [ ! -f "$startup" ]; then
        printf '配置检查: 跳过（找不到 %s）\n' "$startup"
        exit 0
    fi
    tmp=/data/local/tmp/box-core-check.$$
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
