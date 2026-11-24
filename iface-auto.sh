#!/system/bin/sh
# BoxProxy 服务启动前的生命周期脚本（以 root 执行）
#
# 职责：
#   1. 识别本次网络模式（BOX_MODE → runs.log → BOX_PROXY_MODE）
#   2. 按模式选择内核：eBPF → core-ebpf，其余 → core-vanilla，
#      通过硬链接挂到 bin/mihomo（两份都保留，原版不会被覆盖）
#   3. 按模式切换覆写脚本清单里的「模式脚本」（tun / tproxy / ebpf-我的.js），
#      清单里没有模式脚本时（用户自定义）一律不动
#   4. 识别出口网卡和下联（热点/共享）网卡；TUN 模式写 interface-name，
#      eBPF 模式写 EBPF_SHARED_IFACE_SPEC，没有下联时挂空转 dummy 网卡
#   5. 为下联接口放行 FORWARD
#   6. 可选：按 BOX_STOP_PACKAGES 停掉指定包（避免抢端口）
#
# 只读环境、只在值变化时写盘；不写死 UID、网卡名或任何凭据。
#
# 用法：
#   sh iface-auto.sh            正常执行（由 boxctl 在服务启动前调用）
#   sh iface-auto.sh --dry-run  只打印将要做的改动，不写盘、不动 iptables
#   sh iface-auto.sh -h         查看帮助
#
# 环境变量（都可省略）：
#   BOX_HOME            Box 工作目录，默认 /data/user/0/com.boxproxy.box/files/box
#   BOX_BASE            同 BOX_HOME（旧名）
#   BOX_RUN_DIR         运行目录，默认 $BOX_BASE/run
#   BOX_JS_SCRIPTS_DIR  覆写脚本目录，默认 $BOX_BASE/mihomo/scripts
#   BOX_PRE_LOG         日志文件，默认 /data/local/tmp/prestart.log
#   BOX_EBPF_DUMMY      eBPF 无下联时用的 dummy 网卡名，默认 boxebpf0
#   BOX_CORE_VANILLA    原版内核路径，默认 $BOX_BASE/bin/core-vanilla
#   BOX_CORE_EBPF       eBPF 内核路径，默认 $BOX_BASE/bin/core-ebpf
#   BOX_STOP_PACKAGES   启动前要强制停止的包名，空格分隔，默认空

DRY_RUN=0
VERBOSE=0

usage() {
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
  case "$arg" in
    -n|--dry-run) DRY_RUN=1 ;;
    -v|--verbose) VERBOSE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

BOX_HOME=${BOX_HOME:-/data/user/0/com.boxproxy.box/files/box}
BOX_BASE=${BOX_BASE:-$BOX_HOME}
RUN_DIR=${BOX_RUN_DIR:-$BOX_BASE/run}
RUNLOG=$RUN_DIR/runs.log
LOG_FILE=${BOX_PRE_LOG:-/data/local/tmp/prestart.log}
DUMMY_IFACE=${BOX_EBPF_DUMMY:-boxebpf0}
CORE_VANILLA=${BOX_CORE_VANILLA:-$BOX_BASE/bin/core-vanilla}
CORE_EBPF=${BOX_CORE_EBPF:-$BOX_BASE/bin/core-ebpf}
CORE_LINK=${BOX_CORE_LINK:-$BOX_BASE/bin/mihomo}
STOP_PACKAGES=${BOX_STOP_PACKAGES:-}
SHARED_PLACEHOLDER='%EBPF_SHARED_IFACE%'

KNOWN_MODES='tun|tproxy|ebpf|redirect|mixed|enhance'

log() {
  echo "$(date '+%F %T') $*" >> "$LOG_FILE"
  if [ "$VERBOSE" = 1 ] || [ "$DRY_RUN" = 1 ]; then
    echo "$*"
  fi
}

# dry-run 模式下只打印，不执行
run() {
  if [ "$DRY_RUN" = 1 ]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

# 覆盖写文件；dry-run 时只打印
write_text() {
  target=$1
  if [ "$DRY_RUN" = 1 ]; then
    echo "[dry-run] write $target"
    return 0
  fi
  cat > "$target"
}

# ---------- 覆写脚本目录 ----------
# boxctl 的 BOX_SCRIPTS_DIR 指向生命周期脚本目录本身，而 mihomo 的覆写脚本在
# mihomo/scripts 下，所以按「目录里有没有 .js」判断，不盲信环境变量。
if [ -n "${BOX_JS_SCRIPTS_DIR:-}" ] && ls "$BOX_JS_SCRIPTS_DIR"/*.js >/dev/null 2>&1; then
  JS_DIR=$BOX_JS_SCRIPTS_DIR
elif [ -n "${BOX_SCRIPTS_DIR:-}" ] && ls "$BOX_SCRIPTS_DIR"/*.js >/dev/null 2>&1; then
  JS_DIR=$BOX_SCRIPTS_DIR
else
  JS_DIR=$BOX_BASE/mihomo/scripts
fi

# ---------- 1. 模式识别 ----------
# BOX_MODE 是网络模式；BOX_PROXY_MODE 装的是应用代理模式（blacklist/whitelist），只能兜底。
MODE=''
case "${BOX_MODE:-}" in
  tun|tproxy|ebpf|redirect|mixed|enhance) MODE=$BOX_MODE ;;
esac
if [ -z "$MODE" ]; then
  MODE=$(grep -aoE "网络模式 ($KNOWN_MODES)" "$RUNLOG" 2>/dev/null | tail -1 | awk '{print $2}')
fi
if [ -z "$MODE" ]; then
  MODE=$(grep -aoE "模式 ($KNOWN_MODES)" "$RUNLOG" 2>/dev/null | tail -1 | awk '{print $2}')
fi
if [ -z "$MODE" ]; then
  case "${BOX_PROXY_MODE:-}" in
    tun|tproxy|ebpf|redirect|mixed|enhance) MODE=$BOX_PROXY_MODE ;;
  esac
fi
[ -n "$MODE" ] || MODE=unknown

# ---------- 2. 内核选择 ----------
select_core() {
  WANT=''
  if [ "$MODE" = 'ebpf' ] && [ -f "$CORE_EBPF" ]; then
    WANT=$CORE_EBPF
  elif [ -f "$CORE_VANILLA" ]; then
    WANT=$CORE_VANILLA
  fi
  [ -n "$WANT" ] || return 0
  CUR=$(stat -c %i "$CORE_LINK" 2>/dev/null)
  TARGET=$(stat -c %i "$WANT" 2>/dev/null)
  [ "$CUR" = "$TARGET" ] && return 0
  if run ln -f "$WANT" "$CORE_LINK" 2>/dev/null; then
    log "core -> $(basename "$WANT")"
  else
    log "warn: 切换内核到 $(basename "$WANT") 失败"
  fi
}

# ---------- 3. 覆写脚本切换 ----------
# 只改清单里的模式脚本；清单里没有模式脚本说明用户换成了自定义脚本，保持原样。
select_script() {
  case "$MODE" in
    ebpf) WANT='ebpf-我的.js' ;;
    tproxy) WANT='tproxy-我的.js' ;;
    tun) WANT='tun-我的.js' ;;
    *) return 0 ;;
  esac
  [ -f "$JS_DIR/$WANT" ] || return 0

  MANIFEST=$RUN_DIR/state/config/mihomo-scripts.yaml
  HEADER='# BoxProxy mihomo override scripts, in execution order.'

  if grep -qE '^- *"(tun|tproxy|ebpf)-我的\.js"$' "$MANIFEST" 2>/dev/null; then
    TMP=${TMPDIR:-/data/local/tmp}/box-scripts.$$
    printf '%s\n' "$HEADER" > "$TMP"
    awk -v want="$WANT" '
      /^- *"/ {
        name = $0
        sub(/^- *"/, "", name)
        sub(/"$/, "", name)
        if (name ~ /^(tun|tproxy|ebpf)-我的\.js$/) name = want
        if (seen[name]++) next
        printf "- \"%s\"\n", name
      }
    ' "$MANIFEST" >> "$TMP"
    if ! cmp -s "$TMP" "$MANIFEST"; then
      write_text "$MANIFEST" < "$TMP"
      OWNER=$(stat -c '%u:%g' "$(dirname "$MANIFEST")" 2>/dev/null)
      [ -n "$OWNER" ] && run chown "$OWNER" "$MANIFEST" 2>/dev/null
      log "scripts -> $WANT"
    fi
    rm -f "$TMP"
    return 0
  fi

  if [ "$MODE" = 'ebpf' ] && ! grep -qE '^- *"' "$MANIFEST" 2>/dev/null; then
    printf '%s\n- "%s"\n' "$HEADER" "$WANT" | write_text "$MANIFEST"
    OWNER=$(stat -c '%u:%g' "$(dirname "$MANIFEST")" 2>/dev/null)
    [ -n "$OWNER" ] && run chown "$OWNER" "$MANIFEST" 2>/dev/null
    log "scripts -> $WANT (init)"
  fi
}

# ---------- 4. 网卡识别 ----------
is_tunnel() {
  case "$1" in
    ''|lo|tun*|tap*|meta|clash*|wg*|ppp*|ipsec*|dummy*) return 0 ;;
    *) return 1 ;;
  esac
}

detect_upstream() {
  UPSTREAM=${BOX_NETWORK_IFACE:-}
  if [ -z "$UPSTREAM" ]; then
    UPSTREAM=$(ip route get 1.1.1.1 2>/dev/null | sed -n 's/.* dev \([A-Za-z0-9_@.-]*\).*/\1/p' | head -1)
  fi
  if [ -z "$UPSTREAM" ]; then
    UPSTREAM=$(ip route show default 2>/dev/null | sed -n 's/.* dev \([A-Za-z0-9_@.-]*\).*/\1/p' | head -1)
  fi
  is_tunnel "$UPSTREAM" && UPSTREAM=''
}

detect_downstream() {
  TETHER=$(dumpsys tethering 2>/dev/null)
  PAT=$(echo "$TETHER" | sed -n 's/.*tetherableWifiRegexs: \[\(.*\)\]/\1/p' | head -1 \
    | sed 's/\\d/[0-9]/g; s/, /|/g')
  [ -n "$PAT" ] || PAT='wlan[0-9]|softap[0-9]|ap_br_wlan[0-9]|ap_br_softap[0-9]|ap[0-9]|swlan[0-9]'

  DOWNSTREAM=''
  add_downstream() {
    [ -n "$1" ] || return 0
    [ "$1" = "$UPSTREAM" ] && return 0
    [ "$1" = "$DUMMY_IFACE" ] && return 0
    is_tunnel "$1" && return 0
    ip link show "$1" >/dev/null 2>&1 || return 0
    case ",$DOWNSTREAM," in
      *",$1,"*) return 0 ;;
    esac
    DOWNSTREAM=${DOWNSTREAM:+$DOWNSTREAM,}$1
  }

  # 4.1 系统处于 TETHERED 的接口（最可信）
  for i in $(echo "$TETHER" | grep -oE 'iface=[A-Za-z0-9_.-]+ state=TETHERED' \
    | sed 's/^iface=//; s/ state=TETHERED$//' | sort -u); do
    add_downstream "$i"
  done
  # 4.2 其他 ROM 的写法：直接抓 iface=xxx
  for i in $(echo "$TETHER" | grep -oE 'iface[=:] ?[A-Za-z0-9_.-]+' \
    | sed 's/^iface[=:] *//' | sort -u); do
    add_downstream "$i"
  done
  # 4.3 兜底：按 tetherable 正则找存在且已 UP 的接口
  if [ -z "$DOWNSTREAM" ]; then
    for i in $(ip -o link show up 2>/dev/null | awk -F': ' '{print $2}' | grep -E "^($PAT)$" | sort -u); do
      add_downstream "$i"
    done
  fi
}

ensure_dummy() {
  [ -z "$DOWNSTREAM" ] || return 0
  case "$MODE" in
    ebpf|unknown) ;;
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

# ---------- 5. 写入覆写脚本 ----------
write_js() {
  if [ -n "$UPSTREAM" ] && { [ "$MODE" = 'tun' ] || [ "$MODE" = 'unknown' ]; }; then
    for f in "$JS_DIR"/*.js; do
      [ -f "$f" ] || continue
      grep -q '^  "interface-name":' "$f" || continue
      CUR=$(sed -n 's/^  "interface-name": "\(.*\)",$/\1/p' "$f" | head -1)
      [ "$CUR" = "$UPSTREAM" ] && continue
      run sed -i "s/^  \"interface-name\": \".*\"/  \"interface-name\": \"$UPSTREAM\"/" "$f"
      log "interface-name: ${CUR:-<空>} -> $UPSTREAM ($(basename "$f"))"
    done
  fi

  SPEC=${DOWNSTREAM:-$DUMMY_IFACE}
  for f in "$JS_DIR"/*.js; do
    [ -f "$f" ] || continue
    grep -q '^const EBPF_SHARED_IFACE_SPEC = ' "$f" || continue
    CUR=$(sed -n 's/^const EBPF_SHARED_IFACE_SPEC = "\(.*\)";$/\1/p' "$f" | head -1)
    [ "$CUR" = "$SPEC" ] && continue
    run sed -i "s/^const EBPF_SHARED_IFACE_SPEC = \".*\";/const EBPF_SHARED_IFACE_SPEC = \"$SPEC\";/" "$f"
    log "ebpf shared iface: ${CUR:-<空>} -> $SPEC ($(basename "$f"))"
  done
}

# ---------- 6. 下联转发放行 ----------
allow_forward() {
  for i in $(echo "${DOWNSTREAM:-}" | tr ',' ' '); do
    run iptables -C FORWARD -i "$i" -j ACCEPT 2>/dev/null || run iptables -I FORWARD 1 -i "$i" -j ACCEPT
    run iptables -C FORWARD -o "$i" -j ACCEPT 2>/dev/null || run iptables -I FORWARD 1 -o "$i" -j ACCEPT
    log "forward allow $i"
  done
}

# ---------- 7. 可选：停掉指定包 ----------
stop_packages() {
  [ -n "$STOP_PACKAGES" ] || return 0
  for p in $STOP_PACKAGES; do
    ps -A 2>/dev/null | grep -q "$p" || continue
    run am force-stop "$p" 2>/dev/null
    log "stopped $p"
  done
}

select_core
select_script
detect_upstream
detect_downstream
ensure_dummy
write_js
allow_forward
stop_packages

CORE_NAME=unknown
LINK_INODE=$(stat -c %i "$CORE_LINK" 2>/dev/null)
if [ -n "$LINK_INODE" ]; then
  if [ -f "$CORE_EBPF" ] && [ "$LINK_INODE" = "$(stat -c %i "$CORE_EBPF" 2>/dev/null)" ]; then
    CORE_NAME=core-ebpf
  elif [ -f "$CORE_VANILLA" ] && [ "$LINK_INODE" = "$(stat -c %i "$CORE_VANILLA" 2>/dev/null)" ]; then
    CORE_NAME=core-vanilla
  fi
fi
log "pre-start done mode=$MODE core=$CORE_NAME upstream=${UPSTREAM:-none} downstream=${DOWNSTREAM:-none}"
exit 0
