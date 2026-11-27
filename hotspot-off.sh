#!/system/bin/sh
# 手动：关闭热点共享代理（热点客户端恢复核心原有分流）
#
# 做两件事，顺序固定：
#   1. 把 box-auto.conf 的 HOTSPOT_SHARE 改成 off
#   2. 调 hotspot.sh 删掉 rules 里那条带 // hotspot-lan 标记的规则
#
# 用法：
#   sh hotspot-off.sh        关闭
#   sh hotspot-off.sh -n     只打印，不改配置也不写 js
#   sh hotspot-off.sh -h
#
# 改完仍需「重新生成启动配置」再重启或重载服务，规则才离开内核。
# ============================================================================

BOX_HOME=/data/user/0/com.boxproxy.box/files/box
CONF=$BOX_HOME/scripts/box-auto.conf
ENGINE=$BOX_HOME/scripts/hotspot.sh

DRY_RUN=0

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# ={10,}/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

log() { printf '%s\n' "$*" ; }
die() { printf '错误: %s\n' "$*" >&2 ; exit 2 ; }

set_conf() {
    local esc
    [ -f "$CONF" ] || die "找不到 $CONF"
    esc=off
    if grep -q '^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=' "$CONF" 2>/dev/null; then
        sed -i "s|^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=.*|HOTSPOT_SHARE='$esc'|" "$CONF" ||
            die "写 $CONF 失败"
    else
        printf "HOTSPOT_SHARE='%s'\n" "$esc" >>"$CONF" || die "写 $CONF 失败"
    fi
    chown root:root "$CONF" 2>/dev/null
    chmod 644 "$CONF" 2>/dev/null
}

main() {
    case "${1:-}" in
        -h | --help) usage ; exit 0 ;;
        -n | --dry-run) DRY_RUN=1 ;;
        '') ;;
        *) die "未知参数 $1（用 -h 看用法）" ;;
    esac

    if [ "$DRY_RUN" = 1 ]; then
        log "[dry-run] 会把 $CONF 里的 HOTSPOT_SHARE 改成 'off'"
        exec sh "$ENGINE" -n off
    fi

    log "配置: HOTSPOT_SHARE='off'"
    set_conf
    exec sh "$ENGINE"
}

main "$@"
