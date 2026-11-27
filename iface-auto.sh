#!/system/bin/sh
# BoxProxy 服务启动前的生命周期脚本（以 root 执行）
#
# 职责：
#   1. 读配置（box-core.conf）：每种入站模式用哪个内核、内核文件叫什么
#   2. 把当前模式对应的内核硬链接到 bin/mihomo
#   3. 按模式切换覆写脚本清单里的「模式脚本」（tun / tproxy / ebpf-我的.js）
#   4. 识别出口网卡与下联（热点/共享）网卡；TUN 模式写 interface-name，
#      eBPF 模式写 EBPF_SHARED_IFACE_SPEC，没有下联时挂空转 dummy 网卡
#   5. 为下联接口放行 FORWARD
#   6. 端口冲突：只停真正占着核心端口的第三方应用
#
# 配置：同目录的 box-core.conf（没有就用内置默认值，行为与旧版一致）。
#   确认配成什么样：sh iface-auto.sh --show
#
# 用法：
#   sh iface-auto.sh            正常执行（由 boxctl 在服务启动前调用）
#   sh iface-auto.sh --show     只打印配置解析结果，不改任何东西
#   sh iface-auto.sh --dry-run  只打印将要做的改动，不写盘、不动 iptables
#   sh iface-auto.sh -h         帮助
#
# 代码结构（按执行顺序）：
#   0 参数 · 1 配置 · 2 校验 · 3 模式 · 4 内核 · 5 脚本清单
#   6 网卡 · 7 写入字段 · 8 转发与进程 · 9 入口与汇总
#
# --- 以下为代码 ---

# ============================================================================
# 0. 参数解析
# ============================================================================

DRY_RUN=0
VERBOSE=0
SHOW=0
CONF=''
BOX_HOME_CLI=''

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# --- 以下为代码 ---/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            -n | --dry-run) DRY_RUN=1 ;;
            -v | --verbose) VERBOSE=1 ;;
            --show) SHOW=1 ;;
            -h | --help) usage; exit 0 ;;
            -c | --conf) CONF_NEXT=1 ;;
            --home) HOME_NEXT=1 ;;
            *)
                if [ "${CONF_NEXT:-0}" = 1 ]; then
                    CONF=$arg; CONF_NEXT=0
                elif [ "${HOME_NEXT:-0}" = 1 ]; then
                    BOX_HOME_CLI=$arg; HOME_NEXT=0
                else
                    printf 'unknown argument: %s\n' "$arg" >&2
                    exit 2
                fi
                ;;
        esac
    done
}

# ============================================================================
# 1. 配置与默认值
# ============================================================================

init_defaults() {
    BOX_HOME=${BOX_HOME_CLI:-${BOX_HOME:-/data/user/0/com.boxproxy.box/files/box}}
    BOX_BASE=${BOX_BASE:-$BOX_HOME}
    RUN_DIR=${BOX_RUN_DIR:-$BOX_BASE/run}
    RUNLOG=$RUN_DIR/runs.log
    LOG_FILE=${BOX_PRE_LOG:-/data/local/tmp/prestart.log}
    DUMMY_IFACE=${DUMMY_IFACE:-boxebpf0}
    CONFLICT_STOP=${CONFLICT_STOP:-auto}
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

# 取某个内核的字段：core_field <名字> <FILE|REPO|ASSET|VERSION|...>
core_field() {
    eval "value=\${CORE_$1_$2:-}"
    printf '%s' "$value"
}

# 模式 → 内核名字
mode_core() {
    eval "name=\${MODE_CORE_$1:-vanilla}"
    printf '%s' "$name"
}

# 内核名字 → bin 下的文件名（默认 core-<名字>）
core_file() {
    file=$(core_field "$1" FILE)
    [ -n "$file" ] || file=core-$1
    printf '%s' "$file"
}

core_path() {
    printf '%s/%s' "$BIN_DIR" "$(core_file "$1")"
}

# ============================================================================
# 2. 校验
# ============================================================================

die() {
    printf '错误: %s\n' "$*" >&2
    exit 2
}

valid_name() {
    case "$1" in
        '' | *[!A-Za-z0-9_]*) return 1 ;;
        *) return 0 ;;
    esac
}

check_config() {
    BIN_DIR=$BOX_HOME/bin
    for name in $CORE_LIST; do
        valid_name "$name" || die "配置错误：内核名 '$name' 只能用字母、数字、下划线"
        file=$(core_file "$name")
        case "$file" in
            */*) die "配置错误：CORE_${name}_FILE 只能写文件名，不能带路径（现在是 $file）" ;;
        esac
    done
    for mode in tun tproxy ebpf redirect mixed enhance unknown; do
        name=$(mode_core "$mode")
        valid_name "$name" || die "配置错误：MODE_CORE_$mode 填的内核名 '$name' 不合法"
        found=0
        for known in $CORE_LIST; do
            [ "$known" = "$name" ] && found=1
        done
        [ "$found" = 1 ] || die "配置错误：MODE_CORE_$mode 指向的内核 '$name' 不在 CORE_LIST 里"
    done
}

# ============================================================================
# 3. 日志与执行包装
# ============================================================================

log() {
    if [ "$DRY_RUN" -eq 1 ] || [ "$SHOW" -eq 1 ]; then
        printf '%s\n' "$*"
        return 0
    fi
    printf '%s %s\n' "$(date '+%F %T')" "$*" >>"$LOG_FILE"
    if [ "$VERBOSE" -eq 1 ]; then
        printf '%s\n' "$*"
    fi
}

run() {
    if [ "$DRY_RUN" -eq 1 ]; then
        printf '[dry-run] %s\n' "$*"
        return 0
    fi
    "$@"
}

write_text() {
    target=$1
    if [ "$DRY_RUN" -eq 1 ]; then
        printf '[dry-run] write %s\n' "$target"
        return 0
    fi
    cat >"$target"
}

dir_owner() {
    stat -c '%u:%g' "$(dirname "$1")" 2>/dev/null
}

# ============================================================================
# 4. 模式识别
# ============================================================================

mode_tag() {
    printf '%s\n' "$1" | grep -aE "^($MODE_TAGS)\$" 2>/dev/null
}

log_mode() {
    grep -aoE "$1 ($MODE_TAGS)" "$RUNLOG" 2>/dev/null | tail -1 | awk '{print $NF}'
}

detect_mode() {
    MODE_TAGS='tun|tproxy|ebpf|redirect|mixed|enhance'
    MODE=$(mode_tag "${BOX_MODE:-}")
    [ -n "$MODE" ] || MODE=$(log_mode '网络模式')
    [ -n "$MODE" ] || MODE=$(log_mode '模式')
    [ -n "$MODE" ] || MODE=$(mode_tag "${BOX_PROXY_MODE:-}")
    [ -n "$MODE" ] || MODE=unknown
}

# ============================================================================
# 5. 覆写脚本清单（与内核无关，照旧）
# ============================================================================

resolve_js_dir() {
    local candidate
    for candidate in "${BOX_JS_SCRIPTS_DIR:-}" "${BOX_SCRIPTS_DIR:-}"; do
        if [ -n "$candidate" ] && ls "$candidate"/*.js >/dev/null 2>&1; then
            JS_DIR=$candidate
            return 0
        fi
    done
    JS_DIR=$BOX_BASE/mihomo/scripts
}

mode_script_name() {
    case "$MODE" in
        tun) printf 'tun-我的.js\n' ;;
        tproxy) printf 'tproxy-我的.js\n' ;;
        ebpf) printf 'ebpf-我的.js\n' ;;
        *) return 1 ;;
    esac
}

rewrite_manifest() {
    local manifest=$1 want=$2 tmp=$3
    awk -v want="$want" '
        /^- *"/ {
            name = $0
            sub(/^- *"/, "", name)
            sub(/"$/, "", name)
            if (name ~ /^(tun|tproxy|ebpf)-我的\.js$/) name = want
            if (seen[name]++) next
            printf "- \"%s\"\n", name
        }
    ' "$manifest" >>"$tmp"
}

commit_manifest() {
    local manifest=$1 tmp=$2 owner
    cmp -s "$tmp" "$manifest" && return 1
    write_text "$manifest" <"$tmp"
    owner=$(dir_owner "$manifest")
    [ -n "$owner" ] && run chown "$owner" "$manifest" 2>/dev/null
    return 0
}

select_script() {
    local want manifest tmp owner
    want=$(mode_script_name) || return 0
    [ -f "$JS_DIR/$want" ] || return 0
    manifest=$RUN_DIR/state/config/mihomo-scripts.yaml
    header='# BoxProxy mihomo override scripts, in execution order.'

    if grep -qE '^- *"(tun|tproxy|ebpf)-我的\.js"$' "$manifest" 2>/dev/null; then
        tmp=${TMPDIR:-/data/local/tmp}/box-scripts.$$
        printf '%s\n' "$header" >"$tmp"
        rewrite_manifest "$manifest" "$want" "$tmp"
        if commit_manifest "$manifest" "$tmp"; then
            log "scripts -> $want"
        fi
        rm -f "$tmp"
        return 0
    fi

    if [ "$MODE" = ebpf ] && ! grep -qE '^- *"' "$manifest" 2>/dev/null; then
        printf '%s\n- "%s"\n' "$header" "$want" | write_text "$manifest"
        owner=$(dir_owner "$manifest")
        [ -n "$owner" ] && run chown "$owner" "$manifest" 2>/dev/null
        log "scripts -> $want (init)"
    fi
}

# ============================================================================
# 6. 内核选择（配置驱动）
# ============================================================================

# 模式 → 内核名 → 文件 → 路径；文件缺失时退回 vanilla 内核
select_core() {
    local name fallback target inode cur

    name=$(mode_core "$MODE")
    target=$(core_path "$name")
    log "模式 $MODE → 内核 $name（$target）"

    if [ ! -f "$target" ]; then
        fallback=$(mode_core vanilla)
        if [ "$fallback" != "$name" ] && [ -f "$(core_path "$fallback")" ]; then
            log "warn: 内核 $name 的文件 $(core_file "$name") 不存在，退回 $fallback"
            name=$fallback
            target=$(core_path "$name")
        else
            log "warn: 内核 $name 的文件 $(core_file "$name") 不存在，且没有可退回的内核，保持现状"
            CORE_USED=unknown
            return 0
        fi
    fi

    if [ ! -x "$target" ]; then
        log "warn: $target 不可执行，跳过切换（内核 $name）"
        CORE_USED=unknown
        return 0
    fi

    CORE_USED=$name
    cur=$(stat -c %i "$CORE_LINK" 2>/dev/null)
    inode=$(stat -c %i "$target" 2>/dev/null)
    [ "$cur" = "$inode" ] && return 0

    if run ln -f "$target" "$CORE_LINK" 2>/dev/null; then
        log "core -> $name（$(core_file "$name")）"
    else
        log "warn: 链接 $CORE_LINK 到 $name 失败"
    fi
}

# ============================================================================
# 7. 网卡识别
# ============================================================================

is_tunnel_iface() {
    case "$1" in
        '' | lo | tun* | tap* | meta | clash* | wg* | ppp* | ipsec* | dummy*) return 0 ;;
        *) return 1 ;;
    esac
}

iface_of_dev() {
    sed -n 's/.* dev \([A-Za-z0-9_@.-]*\).*/\1/p' | head -1
}

# 物理出口网卡：先看路由，再看各表的默认路由，跳过隧道与 dummy
detect_upstream() {
    local dev iface
    dev=${BOX_NETWORK_IFACE:-}
    [ -n "$dev" ] || dev=$(ip route get 1.1.1.1 2>/dev/null | iface_of_dev)
    [ -n "$dev" ] || dev=$(ip route show default 2>/dev/null | iface_of_dev)
    is_tunnel_iface "$dev" && dev=''
    if [ -z "$dev" ]; then
        # 路由落到隧道上时，退一步找默认路由里的物理接口
        for iface in $(ip route show table all 2>/dev/null             | awk '$1 == "default" { for (i = 1; i <= NF; i++) if ($i == "dev") print $(i + 1) }'             | sort -u); do
            is_tunnel_iface "$iface" && continue
            dev=$iface
            break
        done
    fi
    UPSTREAM=$dev
}

add_downstream() {
    local iface=$1 candidate
    [ -n "$iface" ] || return 0
    [ "$iface" = "$UPSTREAM" ] && return 0
    [ "$iface" = "$DUMMY_IFACE" ] && return 0
    is_tunnel_iface "$iface" && return 0
    ip link show "$iface" >/dev/null 2>&1 || return 0
    for candidate in $(printf '%s\n' "$DOWNSTREAM" | tr ',' ' '); do
        [ "$candidate" = "$iface" ] && return 0
    done
    if [ -n "$DOWNSTREAM" ]; then
        DOWNSTREAM=$DOWNSTREAM,$iface
    else
        DOWNSTREAM=$iface
    fi
}

tetherable_pattern() {
    local pattern
    pattern=$(dumpsys tethering 2>/dev/null \
        | sed -n 's/.*tetherableWifiRegexs: \[\(.*\)\]/\1/p' | head -1 \
        | sed 's/\\d/[0-9]/g; s/, /|/g')
    [ -n "$pattern" ] || pattern='wlan[0-9]|softap[0-9]|ap_br_wlan[0-9]|ap_br_softap[0-9]|ap[0-9]|swlan[0-9]'
    printf '%s\n' "$pattern"
}

detect_downstream() {
    local pattern iface
    pattern=$(tetherable_pattern)
    DOWNSTREAM=''
    for iface in $(ip -o link show up 2>/dev/null | awk -F': ' '{print $2}' \
        | grep -E "^($pattern)$" | sort -u); do
        ip -o -4 addr show "$iface" 2>/dev/null | grep -q 'inet ' || continue
        add_downstream "$iface"
    done
}

ensure_dummy_iface() {
    [ -z "$DOWNSTREAM" ] || return 0
    case "$MODE" in
        ebpf | unknown) ;;
        *) return 0 ;;
    esac
    if ! ip link show "$DUMMY_IFACE" >/dev/null 2>&1; then
        if run ip link add "$DUMMY_IFACE" type dummy >/dev/null 2>&1; then
            log "created dummy $DUMMY_IFACE"
        else
            log "warn: 无法创建 $DUMMY_IFACE，eBPF 共享角色可能起不来"
        fi
    fi
    run ip link set "$DUMMY_IFACE" up >/dev/null 2>&1
}

# ============================================================================
# 8. 写入覆写脚本字段
# ============================================================================

update_interface_name() {
    local file cur
    [ -n "$UPSTREAM" ] || return 0
    case "$MODE" in
        tun | unknown) ;;
        *) return 0 ;;
    esac
    for file in "$JS_DIR"/*.js; do
        [ -f "$file" ] || continue
        grep -q '^  "interface-name":' "$file" || continue
        cur=$(sed -n 's/^  "interface-name": "\(.*\)",$/\1/p' "$file" | head -1)
        [ "$cur" = "$UPSTREAM" ] && continue
        run sed -i "s/^  \"interface-name\": \".*\"/  \"interface-name\": \"$UPSTREAM\"/" "$file"
        log "interface-name: ${cur:-<空>} -> $UPSTREAM ($(basename "$file"))"
    done
}

update_ebpf_shared_iface() {
    local file cur spec
    spec=${DOWNSTREAM:-$DUMMY_IFACE}
    for file in "$JS_DIR"/*.js; do
        [ -f "$file" ] || continue
        grep -q '^const EBPF_SHARED_IFACE_SPEC = ' "$file" || continue
        cur=$(sed -n 's/^const EBPF_SHARED_IFACE_SPEC = "\(.*\)";$/\1/p' "$file" | head -1)
        [ "$cur" = "$spec" ] && continue
        run sed -i "s/^const EBPF_SHARED_IFACE_SPEC = \".*\";/const EBPF_SHARED_IFACE_SPEC = \"$spec\";/" "$file"
        log "ebpf shared iface: ${cur:-<空>} -> $spec ($(basename "$file"))"
    done
}

# ============================================================================
# 9. 转发放行与端口冲突
# ============================================================================

allow_forward() {
    local iface
    for iface in $(printf '%s\n' "${DOWNSTREAM:-}" | tr ',' ' '); do
        run iptables -C FORWARD -i "$iface" -j ACCEPT 2>/dev/null \
            || run iptables -I FORWARD 1 -i "$iface" -j ACCEPT
        run iptables -C FORWARD -o "$iface" -j ACCEPT 2>/dev/null \
            || run iptables -I FORWARD 1 -o "$iface" -j ACCEPT
        log "forward allow $iface"
    done
}

config_ports() {
    local config=$RUN_DIR/state/config/startup-config
    [ -f "$config" ] || return 0
    {
        awk '
            BEGIN { in_dns = 0 }
            /^[^[:space:]#]/ { in_dns = ($1 == "dns:") }
            /^(mixed-port|port|socks-port|redir-port|tproxy-port):/ {
                port = $2; gsub(/[^0-9]/, "", port); if (port) print port; next
            }
            /^external-controller:/ {
                n = split($2, parts, ":"); port = parts[n]; gsub(/[^0-9]/, "", port)
                if (port) print port; next
            }
            in_dns && /^[[:space:]]+listen:/ {
                port = $2; sub(/.*:/, "", port); gsub(/[^0-9]/, "", port)
                if (port) print port
            }
        ' "$config"
        printf '%s\n' "$EXTRA_PORTS" | tr ' ' '\n'
    } | grep -E '^[0-9]+$' | sort -u
}

port_owner_pid() {
    ss -Hlntup 2>/dev/null | grep -E "[:.]$1 " | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2
}

pid_uid() {
    stat -c %u "/proc/$1" 2>/dev/null
}

uid_package() {
    awk -v u="$1" '$2 == u { print $1; exit }' /data/system/packages.list 2>/dev/null
}

is_box_core_pid() {
    local cmd
    cmd=$(tr '\0' '\n' <"/proc/$1/cmdline" 2>/dev/null | head -1)
    case "$cmd" in
        "$BIN_DIR"/*) return 0 ;;
    esac
    return 1
}

stop_conflicting_packages() {
    local port pid uid package self
    case "$CONFLICT_STOP" in
        off | no | false | 0)
            log "端口冲突检测: 已关闭"
            return 0
            ;;
        log | dry | warn | report)
            CONFLICT_STOP=log
            ;;
        *) CONFLICT_STOP=auto ;;
    esac
    [ "$CONFLICT_STOP" = log ] && log "端口冲突检测: 只记录，不停止应用"

    self=$(id -u)
    for port in $(config_ports); do
        pid=$(port_owner_pid "$port")
        [ -n "$pid" ] || continue
        uid=$(pid_uid "$pid")
        case "$uid" in '' | *[!0-9]*) continue ;; esac
        [ "$uid" = "$self" ] && continue
        if [ "$uid" -lt 10000 ]; then
            if is_box_core_pid "$pid"; then
                if [ "$pid" = "$(cat "$RUN_DIR/box.pid" 2>/dev/null)" ]; then
                    log "端口 $port 由正在运行的核心持有（pid $pid），跳过"
                elif [ "$CONFLICT_STOP" = log ]; then
                    log "warn: 端口 $port 被旧内核占用（pid $pid），按设置不结束"
                else
                    log "端口 $port 被旧内核占用（pid $pid），结束它"
                    run kill "$pid"
                fi
            else
                log "warn: 端口 $port 被系统进程持有（pid $pid, uid $uid），跳过"
            fi
            continue
        fi
        package=$(uid_package "$uid")
        if [ -z "$package" ]; then
            log "warn: 端口 $port 被 uid=$uid 占用，查不到包名，跳过"
            continue
        fi
        case " $STOP_PACKAGES " in
            *" $package "*)
                log "端口 $port 被 $package 占用，按 STOP_PACKAGES 停止"
                run am force-stop "$package" 2>/dev/null
                ;;
            *)
                if [ "$CONFLICT_STOP" = auto ]; then
                    log "端口 $port 被 $package（uid $uid, pid $pid）占用，停止该应用"
                    if ! run am force-stop "$package" 2>/dev/null; then
                        log "warn: 停止 $package 失败"
                        continue
                    fi
                    [ "$DRY_RUN" -eq 1 ] && continue
                    sleep 1
                    [ -n "$(port_owner_pid "$port")" ] && \
                        log "warn: $package 停止后端口 $port 仍被占用，核心可能仍无法启动"
                else
                    log "warn: 端口 $port 被 $package 占用（uid $uid, pid $pid），按设置不停止"
                fi
                ;;
        esac
    done
}

stop_packages() {
    local package
    [ -n "$STOP_PACKAGES" ] || return 0
    for package in $STOP_PACKAGES; do
        ps -A 2>/dev/null | grep -q "$package" || continue
        run am force-stop "$package" 2>/dev/null
        log "stopped $package（STOP_PACKAGES）"
    done
}

# ============================================================================
# 10. 入口与汇总
# ============================================================================

describe_core() {
    local inode name
    inode=$(stat -c %i "$CORE_LINK" 2>/dev/null)
    [ -n "$inode" ] || {
        printf 'unknown\n'
        return 0
    }
    for name in $CORE_LIST; do
        if [ -f "$(core_path "$name")" ] && \
            [ "$inode" = "$(stat -c %i "$(core_path "$name")" 2>/dev/null)" ]; then
            printf '%s\n' "$name"
            return 0
        fi
    done
    printf 'unknown\n'
}

show_config() {
    printf '配置文件: %s\n' "${CONF_USED:-（未使用，走内置默认）}"
    [ "$(id -u)" = 0 ] || printf '（非 root，下面的“已安装/未安装”可能不准）\n'
    printf 'Box 目录: %s\n\n' "$BOX_HOME"
    printf '内核清单:\n'
    for name in $CORE_LIST; do
        file=$(core_file "$name")
        path=$BIN_DIR/$file
        if [ -f "$path" ]; then state='已安装'; else state='未安装'; fi
        printf '  %-10s 文件 %-16s %s  [%s]\n' "$name" "$file" "$path" "$state"
    done
    printf '\n模式映射:\n'
    for mode in tun tproxy ebpf redirect mixed enhance unknown; do
        name=$(mode_core "$mode")
        printf '  %-9s → %-10s %s\n' "$mode" "$name" "$(core_path "$name")"
    done
    printf '\n当前检测到的模式: %s → %s\n' "$MODE" "$(mode_core "$MODE")"
}

main() {
    parse_args "$@"
    init_defaults
    load_conf
    init_defaults
    BIN_DIR=$BOX_HOME/bin
    CORE_LINK=$BIN_DIR/mihomo
    check_config
    detect_mode

    if [ "$SHOW" = 1 ]; then
        show_config
        exit 0
    fi

    [ "$(id -u)" = 0 ] || {
        printf '需要 root：请先 su，或在 BoxProxy 的「工具 → 脚本」里运行\n' >&2
        exit 2
    }

    resolve_js_dir
    select_core
    select_script
    detect_upstream
    detect_downstream
    ensure_dummy_iface
    update_interface_name
    update_ebpf_shared_iface
    allow_forward
    stop_conflicting_packages
    stop_packages

    log "pre-start done mode=$MODE core=$(describe_core) upstream=${UPSTREAM:-none} downstream=${DOWNSTREAM:-none}"
    exit 0
}

main "$@"
