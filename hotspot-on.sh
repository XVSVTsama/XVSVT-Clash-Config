#!/system/bin/sh
# 手动：打开热点共享代理（热点客户端走指定出口，本机不变）
#
# 做两件事，顺序固定：
#   1. 把 box-auto.conf 的 HOTSPOT_SHARE 改成目标值（状态留在配置里，可追溯）
#   2. 调 hotspot.sh 把规则写进覆写脚本的 rules 第一条
#
# 用法：
#   sh hotspot-on.sh               热点客户端直连（direct）
#   sh hotspot-on.sh '📲 热点组'    热点客户端走该策略组
#   sh hotspot-on.sh -n            只打印，不改配置也不写 js
#   sh hotspot-on.sh -h
#
# 改完仍需「重新生成启动配置」再重启或重载服务，规则才进入内核。
# ============================================================================

BOX_HOME=/data/user/0/com.boxproxy.box/files/box
CONF=$BOX_HOME/scripts/box-auto.conf
ENGINE=$BOX_HOME/scripts/hotspot.sh

DRY_RUN=0
VALUE=direct

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# ={10,}/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

log() { printf '%s\n' "$*" ; }
die() { printf '错误: %s\n' "$*" >&2 ; exit 2 ; }

# 目标值写回配置；原来是注释行也一并转成实值
set_conf() {
    local val=$1 esc
    [ -f "$CONF" ] || die "找不到 $CONF"
    esc=$(printf '%s' "$val" | sed 's/[&|\\]/\\&/g')
    if grep -q '^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=' "$CONF" 2>/dev/null; then
        sed -i "s|^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=.*|HOTSPOT_SHARE='$esc'|" "$CONF" ||
            die "写 $CONF 失败"
    else
        printf "HOTSPOT_SHARE='%s'\n" "$val" >>"$CONF" || die "写 $CONF 失败"
    fi
    chown root:root "$CONF" 2>/dev/null
    chmod 644 "$CONF" 2>/dev/null
}

main() {
    case "${1:-}" in
        -h | --help) usage ; exit 0 ;;
        -n | --dry-run) DRY_RUN=1; shift ;;
    esac
    [ $# -gt 0 ] && VALUE=$1
    case "$VALUE" in '' | off | OFF) die "hotspot-on.sh 不接受 off，用 hotspot-off.sh" ;; esac
    case "$VALUE" in *'"'* | *'\'*) die "组名里不能有引号或反斜杠" ;; esac

    if [ "$DRY_RUN" = 1 ]; then
        log "[dry-run] 会把 $CONF 里的 HOTSPOT_SHARE 改成 '$VALUE'"
        exec sh "$ENGINE" -n "$VALUE"
    fi

    log "配置: HOTSPOT_SHARE='$VALUE'"
    set_conf "$VALUE"
    exec sh "$ENGINE"
}

main "$@"
