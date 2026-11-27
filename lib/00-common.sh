#!/system/bin/sh
# 公共部分：配置加载、变量取用、日志与执行包装、校验
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

check_config() {
    BIN_DIR=$BOX_HOME/bin
    for name in $CORE_LIST; do
        valid_name "$name" || die "配置错误：内核名 '$name' 只能用字母、数字、下划线"
        case "$(core_file "$name")" in
            */*) die "配置错误：CORE_${name}_FILE 只能写文件名，不能带路径" ;;
        esac
    done
    for mode in tun tproxy ebpf redirect mixed enhance unknown; do
        name=$(mode_core "$mode")
        valid_name "$name" || die "配置错误：MODE_CORE_$mode 的内核名 '$name' 不合法"
        in_list "$name" || die "配置错误：MODE_CORE_$mode 指向的内核 '$name' 不在 CORE_LIST 里"
    done
    [ -n "${CORE_DEFAULT:-}" ] || CORE_DEFAULT=ebpf
    in_list "$CORE_DEFAULT" || die "配置错误：CORE_DEFAULT='$CORE_DEFAULT' 不在 CORE_LIST 里"
}

core_field() {
    eval "value=\${CORE_$1_$2:-}"
    printf '%s' "$value"
}

core_file() {
    file=$(core_field "$1" FILE)
    [ -n "$file" ] || file=core-$1
    printf '%s' "$file"
}

core_path() {
    printf '%s/%s' "$BIN_DIR" "$(core_file "$1")"
}

die() {
    printf '错误: %s\n' "$*" >&2
    exit 2
}

dir_owner() {
    stat -c '%u:%g' "$(dirname "$1")" 2>/dev/null
}

in_list() {
    for known in $CORE_LIST; do
        [ "$known" = "$1" ] && return 0
    done
    return 1
}

init_defaults() {
    BOX_HOME=${BOX_HOME_CLI:-${BOX_HOME:-/data/user/0/com.boxproxy.box/files/box}}
    BOX_BASE=${BOX_BASE:-$BOX_HOME}
    RUN_DIR=${BOX_RUN_DIR:-$BOX_BASE/run}
    RUNLOG=$RUN_DIR/runs.log
    LOG_FILE=${BOX_PRE_LOG:-/data/local/tmp/prestart.log}
    DUMMY_IFACE=${DUMMY_IFACE:-boxebpf0}
    CONFLICT_STOP=${CONFLICT_STOP:-auto}
    AUTO_INSTALL=${AUTO_INSTALL:-on}
    AUTO_UPDATE=${AUTO_UPDATE:-off}
    STOP_PACKAGES=${STOP_PACKAGES:-}
    EXTRA_PORTS=${EXTRA_PORTS:-}
    CORE_LIST=${CORE_LIST:-'ebpf vanilla'}

    # 内置内核定义（配置里没写时生效）
    CORE_ebpf_FILE=${CORE_ebpf_FILE:-core-ebpf}
    CORE_vanilla_FILE=${CORE_vanilla_FILE:-core-vanilla}

    # 内置模式映射（配置里没写时生效）
    MODE_CORE_tun=${MODE_CORE_tun:-vanilla}
    MODE_CORE_tproxy=${MODE_CORE_tproxy:-vanilla}
    MODE_CORE_ebpf=${MODE_CORE_ebpf:-ebpf}
    MODE_CORE_redirect=${MODE_CORE_redirect:-vanilla}
    MODE_CORE_mixed=${MODE_CORE_mixed:-vanilla}
    MODE_CORE_enhance=${MODE_CORE_enhance:-vanilla}
    MODE_CORE_unknown=${MODE_CORE_unknown:-vanilla}

    MODE=''
    UPSTREAM=''
    DOWNSTREAM=''
    JS_DIR=''
    CONF_USED=${CONF_USED:-}
}

load_conf() {
    script_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
    if [ -z "$CONF" ]; then
        CONF=$script_dir/box-core.conf
        [ -f "$CONF" ] || CONF=''
    fi
    [ -n "$CONF" ] && [ -f "$CONF" ] || return 0
    # shellcheck disable=SC1090
    . "$CONF"
    CONF_USED=$CONF
}

log() {
    if [ "${LOG_TERMINAL:-0}" = 1 ] || [ "$DRY_RUN" -eq 1 ]; then
        printf '%s\n' "$*"
        return 0
    fi
    printf '%s %s\n' "$(date '+%F %T')" "$*" >>"$LOG_FILE"
    if [ "$VERBOSE" -eq 1 ]; then
        printf '%s\n' "$*"
    fi
}

mode_core() {
    eval "name=\${MODE_CORE_$1:-vanilla}"
    printf '%s' "$name"
}

require_root() {
    [ "$(id -u)" = 0 ] || die "需要 root：请先 su，或在 BoxProxy 的「工具 → 脚本」里运行"
}

run() {
    if [ "$DRY_RUN" -eq 1 ]; then
        printf '[dry-run] %s\n' "$*"
        return 0
    fi
    "$@"
}

valid_name() {
    case "$1" in
        '' | *[!A-Za-z0-9_]*) return 1 ;;
        *) return 0 ;;
    esac
}

write_text() {
    target=$1
    if [ "$DRY_RUN" -eq 1 ]; then
        printf '[dry-run] write %s\n' "$target"
        return 0
    fi
    cat >"$target"
}
