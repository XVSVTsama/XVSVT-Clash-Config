#!/system/bin/sh
# 把网卡名写进覆写脚本的两个字段
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
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
