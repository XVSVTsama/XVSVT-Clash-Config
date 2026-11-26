#!/system/bin/sh
# BoxProxy 服务启动前的生命周期脚本（以 root 执行）
#
# 职责：
#   1. 识别本次网络模式（BOX_MODE → runs.log → BOX_PROXY_MODE）
#   2. 按模式选择内核：eBPF → core-ebpf，其余 → core-vanilla，
#      用硬链接挂到 bin/mihomo（两份都保留，原版不会被覆盖）
#   3. 按模式切换覆写脚本清单里的「模式脚本」（tun / tproxy / ebpf-我的.js），
#      清单里没有模式脚本时（用户自定义）一律不动
#   4. 识别出口网卡与下联（热点/共享）网卡；TUN 模式写 interface-name，
#      eBPF 模式写 EBPF_SHARED_IFACE_SPEC，没有下联时挂空转 dummy 网卡
#   5. 为下联接口放行 FORWARD
#   6. 可选：按 BOX_STOP_PACKAGES 停掉指定包（避免抢端口）
#
# 下联判定：只认「系统声明的 tetherable 正则」且接口真实存在、带 IPv4 地址的网卡。
# dumpsys tethering 里的 "iface=X state=TETHERED" 描述的是被共享的上游，不是下联，
# 拿它当下联会在 Wi-Fi 客户端模式下把上游 wlan 误判成热点。
#
# 只读环境、只在值变化时写盘；不写死 UID、网卡名或任何凭据。
#
# 用法：
#   sh iface-auto.sh            正常执行（由 boxctl 在服务启动前调用）
#   sh iface-auto.sh --dry-run  只打印将要做的改动，不写盘、不动 iptables
#   sh iface-auto.sh -h         查看帮助
#
# 环境变量（都可省略）：
#   BOX_HOME / BOX_BASE      Box 工作目录，默认 /data/user/0/com.boxproxy.box/files/box
#   BOX_RUN_DIR              运行目录，默认 $BOX_BASE/run
#   BOX_JS_SCRIPTS_DIR       覆写脚本目录，默认 $BOX_BASE/mihomo/scripts
#   BOX_PRE_LOG              日志文件，默认 /data/local/tmp/prestart.log
#   BOX_EBPF_DUMMY           eBPF 无下联时的 dummy 网卡名，默认 boxebpf0
#   BOX_CORE_VANILLA         原版内核路径，默认 $BOX_BASE/bin/core-vanilla
#   BOX_CORE_EBPF            eBPF 内核路径，默认 $BOX_BASE/bin/core-ebpf
#   BOX_CORE_LINK            内核入口路径，默认 $BOX_BASE/bin/mihomo
#   BOX_NETWORK_IFACE        强制指定出口网卡（默认按路由推断）
#   BOX_STOP_PACKAGES        启动前强制停止的包名，空格分隔，默认 com.appshub.bettbox；
#                            设成 none 表示不停止任何包
#
# 代码结构（按执行顺序）：
#   0 参数 · 1 运行环境 · 2 日志与包装 · 3 模式 · 4 内核 · 5 脚本清单
#   6 网卡 · 7 写入字段 · 8 转发与进程 · 9 入口与汇总
#
# --- 以下为代码 ---

# ============================================================================
# 0. 参数解析
# ============================================================================

DRY_RUN=0
VERBOSE=0

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
            -h | --help)
                usage
                exit 0
                ;;
            *)
                printf 'unknown argument: %s\n' "$arg" >&2
                exit 2
                ;;
        esac
    done
}

# ============================================================================
# 1. 运行环境与常量
# ============================================================================

init_runtime() {
    BOX_HOME=${BOX_HOME:-/data/user/0/com.boxproxy.box/files/box}
    BOX_BASE=${BOX_BASE:-$BOX_HOME}
    RUN_DIR=${BOX_RUN_DIR:-$BOX_BASE/run}
    RUNLOG=$RUN_DIR/runs.log
    LOG_FILE=${BOX_PRE_LOG:-/data/local/tmp/prestart.log}
    DUMMY_IFACE=${BOX_EBPF_DUMMY:-boxebpf0}
    CORE_VANILLA=${BOX_CORE_VANILLA:-$BOX_BASE/bin/core-vanilla}
    CORE_EBPF=${BOX_CORE_EBPF:-$BOX_BASE/bin/core-ebpf}
    CORE_LINK=${BOX_CORE_LINK:-$BOX_BASE/bin/mihomo}
    STOP_PACKAGES=${BOX_STOP_PACKAGES:-com.appshub.bettbox}
    # 设成 none 表示不停止任何包（留空会退回默认值，不能用来取消）
    case "$STOP_PACKAGES" in none | NONE | -) STOP_PACKAGES='' ;; esac
    JS_DIR=''

    MODE=''
    UPSTREAM=''
    DOWNSTREAM=''
    MODE_TAGS='tun|tproxy|ebpf|redirect|mixed|enhance'
    MANIFEST_HEADER='# BoxProxy mihomo override scripts, in execution order.'
}

# ============================================================================
# 2. 日志与执行包装
# ============================================================================

log() {
    if [ "$DRY_RUN" -eq 1 ]; then
        printf '%s\n' "$*"
        return 0
    fi
    printf '%s %s\n' "$(date '+%F %T')" "$*" >>"$LOG_FILE"
    if [ "$VERBOSE" -eq 1 ]; then
        printf '%s\n' "$*"
    fi
}

# 正常模式下真正执行命令；dry-run 只打印
run() {
    if [ "$DRY_RUN" -eq 1 ]; then
        printf '[dry-run] %s\n' "$*"
        return 0
    fi
    "$@"
}

# 从标准输入覆盖写文件；dry-run 只打印目标路径
write_text() {
    target=$1
    if [ "$DRY_RUN" -eq 1 ]; then
        printf '[dry-run] write %s\n' "$target"
        return 0
    fi
    cat >"$target"
}

# 目录的属主，用于把改写的文件交还给原属主
dir_owner() {
    stat -c '%u:%g' "$(dirname "$1")" 2>/dev/null
}

# ============================================================================
# 3. 运行环境探测：覆写脚本目录 + 网络模式
# ============================================================================

# boxctl 的 BOX_SCRIPTS_DIR 指向生命周期脚本目录本身，mihomo 的覆写脚本在
# mihomo/scripts 下，所以按「目录里有没有 .js」判断，不盲信环境变量。
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

# 单个模式标签：整行匹配，只认已知的网络模式
mode_tag() {
    printf '%s\n' "$1" | grep -aE "^($MODE_TAGS)\$" 2>/dev/null
}

# 从 runs.log 里取最后一条「网络模式 X」或「模式 X」
log_mode() {
    grep -aoE "$1 ($MODE_TAGS)" "$RUNLOG" 2>/dev/null | tail -1 | awk '{print $NF}'
}

# BOX_MODE 是网络模式；BOX_PROXY_MODE 装的是应用代理模式（blacklist/whitelist），只能兜底。
detect_mode() {
    MODE=$(mode_tag "${BOX_MODE:-}")
    [ -n "$MODE" ] || MODE=$(log_mode '网络模式')
    [ -n "$MODE" ] || MODE=$(log_mode '模式')
    [ -n "$MODE" ] || MODE=$(mode_tag "${BOX_PROXY_MODE:-}")
    [ -n "$MODE" ] || MODE=unknown
}

# ============================================================================
# 4. 内核选择
# ============================================================================

select_core() {
    local want cur target
    if [ "$MODE" = ebpf ] && [ -f "$CORE_EBPF" ]; then
        want=$CORE_EBPF
    elif [ -f "$CORE_VANILLA" ]; then
        want=$CORE_VANILLA
    else
        return 0
    fi

    cur=$(stat -c %i "$CORE_LINK" 2>/dev/null)
    target=$(stat -c %i "$want" 2>/dev/null)
    [ "$cur" = "$target" ] && return 0

    if run ln -f "$want" "$CORE_LINK" 2>/dev/null; then
        log "core -> $(basename "$want")"
    else
        log "warn: 切换内核到 $(basename "$want") 失败"
    fi
}

# ============================================================================
# 5. 覆写脚本清单
# ============================================================================

mode_script_name() {
    case "$MODE" in
        tun) printf 'tun-我的.js\n' ;;
        tproxy) printf 'tproxy-我的.js\n' ;;
        ebpf) printf 'ebpf-我的.js\n' ;;
        *) return 1 ;;
    esac
}

# 把清单里的模式脚本换成当前模式那一份，并去掉重复项
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
    if cmp -s "$tmp" "$manifest"; then
        return 1
    fi
    write_text "$manifest" <"$tmp"
    owner=$(dir_owner "$manifest")
    [ -n "$owner" ] && run chown "$owner" "$manifest" 2>/dev/null
    return 0
}

# 只改清单里的模式脚本；清单里没有模式脚本说明用户换成了自定义脚本，保持原样。
select_script() {
    local want manifest tmp owner
    want=$(mode_script_name) || return 0
    [ -f "$JS_DIR/$want" ] || return 0

    manifest=$RUN_DIR/state/config/mihomo-scripts.yaml

    if grep -qE '^- *"(tun|tproxy|ebpf)-我的\.js"$' "$manifest" 2>/dev/null; then
        tmp=${TMPDIR:-/data/local/tmp}/box-scripts.$$
        printf '%s\n' "$MANIFEST_HEADER" >"$tmp"
        rewrite_manifest "$manifest" "$want" "$tmp"
        if commit_manifest "$manifest" "$tmp"; then
            log "scripts -> $want"
        fi
        rm -f "$tmp"
        return 0
    fi

    if [ "$MODE" = ebpf ] && ! grep -qE '^- *"' "$manifest" 2>/dev/null; then
        printf '%s\n- "%s"\n' "$MANIFEST_HEADER" "$want" | write_text "$manifest"
        owner=$(dir_owner "$manifest")
        [ -n "$owner" ] && run chown "$owner" "$manifest" 2>/dev/null
        log "scripts -> $want (init)"
    fi
}

# ============================================================================
# 6. 网卡识别：出口、下联、dummy
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

detect_upstream() {
    local dev
    dev=${BOX_NETWORK_IFACE:-}
    if [ -z "$dev" ]; then
        dev=$(ip route get 1.1.1.1 2>/dev/null | iface_of_dev)
    fi
    if [ -z "$dev" ]; then
        dev=$(ip route show default 2>/dev/null | iface_of_dev)
    fi
    is_tunnel_iface "$dev" && dev=''
    UPSTREAM=$dev
}

# 追加一个候选下联：排除出口、dummy、隧道与不存在的接口，重复的不再追加
add_downstream() {
    local iface=$1
    local candidate
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
    if [ -z "$pattern" ]; then
        pattern='wlan[0-9]|softap[0-9]|ap_br_wlan[0-9]|ap_br_softap[0-9]|ap[0-9]|swlan[0-9]'
    fi
    printf '%s\n' "$pattern"
}

detect_downstream() {
    local pattern iface
    pattern=$(tetherable_pattern)
    DOWNSTREAM=''
    for iface in $(ip -o link show up 2>/dev/null | awk -F': ' '{print $2}' \
        | grep -E "^($pattern)$" | sort -u); do
        # AP 起来后才有 IPv4 地址，据此排除未启用的 wlan
        ip -o -4 addr show "$iface" 2>/dev/null | grep -q 'inet ' || continue
        add_downstream "$iface"
    done
}

# 没有下联时，eBPF 共享角色需要一个空转 dummy 占位（否则 shared.interface 为空，内核拒绝）
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
# 7. 写入覆写脚本字段
# ============================================================================

# TUN 模式：把出口网卡写进 interface-name（值不变就不写）
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

# eBPF 模式：把下联网卡（逗号分隔）写进 EBPF_SHARED_IFACE_SPEC
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
# 8. 转发放行与进程
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

stop_packages() {
    local package
    [ -n "$STOP_PACKAGES" ] || return 0
    for package in $STOP_PACKAGES; do
        ps -A 2>/dev/null | grep -q "$package" || continue
        run am force-stop "$package" 2>/dev/null
        log "stopped $package"
    done
}

# ============================================================================
# 9. 入口与汇总
# ============================================================================

# 按 bin/mihomo 的 inode 反查当前挂的是哪份内核
describe_core() {
    local inode
    inode=$(stat -c %i "$CORE_LINK" 2>/dev/null)
    if [ -z "$inode" ]; then
        printf 'unknown\n'
        return 0
    fi
    if [ -f "$CORE_EBPF" ] && [ "$inode" = "$(stat -c %i "$CORE_EBPF" 2>/dev/null)" ]; then
        printf 'core-ebpf\n'
        return 0
    fi
    if [ -f "$CORE_VANILLA" ] && [ "$inode" = "$(stat -c %i "$CORE_VANILLA" 2>/dev/null)" ]; then
        printf 'core-vanilla\n'
        return 0
    fi
    printf 'unknown\n'
}

main() {
    parse_args "$@"
    init_runtime
    resolve_js_dir
    detect_mode

    select_core
    select_script
    detect_upstream
    detect_downstream
    ensure_dummy_iface
    update_interface_name
    update_ebpf_shared_iface
    allow_forward
    stop_packages

    log "pre-start done mode=$MODE core=$(describe_core) upstream=${UPSTREAM:-none} downstream=${DOWNSTREAM:-none}"
    exit 0
}

main "$@"
