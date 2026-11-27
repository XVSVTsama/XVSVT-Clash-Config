#!/system/bin/sh
# 手动：关闭热点共享代理（热点客户端恢复核心原有分流）
#
# 做两件事：
#   1. 把 box-auto.conf 的 HOTSPOT_SHARE 改成 off
#   2. 删掉 mihomo 覆写脚本 rules 里那条带 // hotspot-lan 标记的规则
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
JS_DIR=$BOX_HOME/mihomo/scripts
MARK=hotspot-lan

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
    [ -f "$CONF" ] || die "找不到 $CONF"
    if grep -q '^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=' "$CONF" 2>/dev/null; then
        sed -i "s|^#\{0,1\}[[:space:]]*HOTSPOT_SHARE=.*|HOTSPOT_SHARE='off'|" "$CONF" ||
            die "写 $CONF 失败"
    else
        printf "HOTSPOT_SHARE='%s'\n" off >>"$CONF" || die "写 $CONF 失败"
    fi
    chown root:root "$CONF" 2>/dev/null
    chmod 644 "$CONF" 2>/dev/null
}

drop_marked() {     # $1 = 文件，删掉带标记的行
    local file=$1 tmp
    tmp=$file.tmp.$$
    grep -v "// $MARK\$" "$file" >"$tmp" 2>/dev/null
    [ -s "$tmp" ] || { rm -f "$tmp"; return 1; }
    chmod 644 "$tmp" 2>/dev/null
    mv -f "$tmp" "$file"
}

drop_rules() {
    local file any=0
    for file in "$JS_DIR"/*.js; do
        [ -f "$file" ] || continue
        grep -q "// $MARK\$" "$file" || continue
        any=1
        if [ "$DRY_RUN" = 1 ]; then
            log "  [dry-run] $(basename "$file"): 删除标记行"
            continue
        fi
        if drop_marked "$file"; then
            log "  $(basename "$file"): 已清理"
        else
            log "warn: 清理 $(basename "$file") 失败"
        fi
    done
    [ "$any" = 1 ] || log "  没有找到标记行（本来就是关的）"
}

main() {
    case "${1:-}" in
        -h | --help) usage ; exit 0 ;;
        -n | --dry-run) DRY_RUN=1 ;;
        '') ;;
        *) die "未知参数 $1（用 -h 看用法）" ;;
    esac

    log "配置: HOTSPOT_SHARE='off'（热点客户端按核心原有分流走）"
    if [ "$DRY_RUN" = 1 ]; then
        log "[dry-run] 不写配置，也不写 js"
    else
        set_conf
    fi
    drop_rules

    if [ "$DRY_RUN" = 1 ]; then
        log "dry-run 完成，未写任何文件"
        return 0
    fi
    log "下一步：设置 → 基础代理配置 → 重新生成启动配置，然后重启或重载服务"
}

main "$@"
