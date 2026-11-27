#!/system/bin/sh
# 公共部分：配置加载、变量取用、日志与执行包装、校验
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

# 内核名与文件名的校验（两个部分都要）
check_core_names() {
    BIN_DIR=$BOX_HOME/bin
    [ -n "$CORE_LIST" ] || die "配置错误：CORE_LIST 为空"
    for name in $CORE_LIST; do
        valid_name "$name" || die "配置错误：内核名 '$name' 只能用字母、数字、下划线"
        case "$(core_file "$name")" in
            */*) die "配置错误：CORE_${name}_FILE 只能写文件名，不能带路径" ;;
        esac
    done
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
    # 路径与运行参数全部固化，不接受环境变量覆盖
    BOX_HOME=/data/user/0/com.boxproxy.box/files/box
    BOX_BASE=$BOX_HOME
    RUN_DIR=$BOX_HOME/run
    RUNLOG=$RUN_DIR/runs.log
    LOG_FILE=/data/local/tmp/prestart.log
    TMP_BASE=/data/local/tmp

    DUMMY_IFACE=boxebpf0
    CONFLICT_STOP=auto
    STOP_PACKAGES=''
    EXTRA_PORTS=''

    CORE_LIST=${CORE_LIST:-'ebpf vanilla'}
    RULES=${RULES:-}
    # 没写 RULES 时的内置默认规则（等价于以前「ebpf 用 ebpf，其余用 vanilla」）
    DEFAULT_RULES='
mode=ebpf => ebpf
always    => vanilla
'

    # 内置内核定义（配置里没写时生效）
    CORE_ebpf_FILE=${CORE_ebpf_FILE:-core-ebpf}
    CORE_ebpf_VERSION=${CORE_ebpf_VERSION:-prerelease}
    CORE_ebpf_ASSET=${CORE_ebpf_ASSET:-*android-arm64*ebpf*.gz}
    CORE_vanilla_FILE=${CORE_vanilla_FILE:-core-vanilla}
    CORE_vanilla_VERSION=${CORE_vanilla_VERSION:-latest}
    CORE_vanilla_ASSET=${CORE_vanilla_ASSET:-*android-arm64*.gz}

    # 下载相关（不再从环境或命令行取）
    API_BASE=https://api.github.com
    DOWNLOAD_PREFIX=''
    TOKEN=''

    CONF_AUTO=${CONF_AUTO:-}
    CONF_UPDATE=${CONF_UPDATE:-}
    CONF_AUTO_USED=${CONF_AUTO_USED:-}
    CONF_UPDATE_USED=${CONF_UPDATE_USED:-}

    MODE=''
    UPSTREAM=''
    DOWNSTREAM=''
    JS_DIR=''
}

# 从配置文件里发现定义了 CORE_<名字>_ 的内核（用户不用手写 CORE_LIST）
discover_cores() {
    local file name
    for file in "$@"; do
        [ -n "$file" ] && [ -f "$file" ] || continue
        for name in $(grep -hoE '^[[:space:]]*CORE_[A-Za-z0-9]+_' "$file" 2>/dev/null \
            | sed 's/^[[:space:]]*CORE_//; s/_$//' | sort -u); do
            case " $CORE_LIST " in
                *" $name "*) ;;
                *) CORE_LIST="$CORE_LIST $name" ;;
            esac
        done
    done
}

# 从 RULES 的候选里补充内核名（=> 右边，逗号或空格分隔）
discover_rule_cores() {
    local line cand
    [ -n "${RULES:-}" ] || return 0
    while IFS= read -r line; do
        case "$line" in
            *'=>'*) ;;
            *) continue ;;
        esac
        for cand in $(printf '%s' "${line#*=>}" | tr ',' ' '); do
            case " $CORE_LIST " in
                *" $cand "*) ;;
                *) CORE_LIST="$CORE_LIST $cand" ;;
            esac
        done
    done <<EOF
$RULES
EOF
}

# 扫描两个默认配置文件里出现过的内核名（含只在 box-update.conf 里出现的）
discover_cores_from_confs() {
    local dir
    dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
    discover_cores "${CONF_AUTO:-$dir/box-auto.conf}" "${CONF_UPDATE:-$dir/box-update.conf}"
}

# 载入自动部分配置（box-auto.conf）
load_auto_conf() {
    script_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
    CONF_AUTO=$script_dir/box-auto.conf
    if [ ! -f "$CONF_AUTO" ]; then
        CONF_AUTO=''
        return 0
    fi
    # shellcheck disable=SC1090
    . "$CONF_AUTO"
    CONF_AUTO_USED=$CONF_AUTO
    discover_cores "$CONF_AUTO"
    discover_rule_cores
}

# 载入手动部分配置（box-update.conf）
load_update_conf() {
    script_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)
    CONF_UPDATE=$script_dir/box-update.conf
    if [ ! -f "$CONF_UPDATE" ]; then
        CONF_UPDATE=''
        return 0
    fi
    # shellcheck disable=SC1090
    . "$CONF_UPDATE"
    CONF_UPDATE_USED=$CONF_UPDATE
    discover_cores "$CONF_UPDATE"
}

# 两份配置各写一份 CORE_LIST 时合并（show-config 用）
merge_core_list() {
    local merged=$1 name
    shift
    for name in "$@"; do
        case " $merged " in
            *" $name "*) ;;
            *) merged="$merged $name" ;;
        esac
    done
    printf '%s\n' "$merged"
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

rules_text() {
    if [ -n "${RULES:-}" ]; then
        printf '%s\n' "$RULES"
    else
        printf '%s\n' "$DEFAULT_RULES"
    fi
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
