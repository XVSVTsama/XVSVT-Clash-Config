#!/system/bin/sh
# 覆写脚本目录与清单（mihomo-scripts.yaml）
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

commit_manifest() {
    local manifest=$1 tmp=$2 owner
    cmp -s "$tmp" "$manifest" && return 1
    write_text "$manifest" <"$tmp"
    owner=$(dir_owner "$manifest")
    [ -n "$owner" ] && run chown "$owner" "$manifest" 2>/dev/null
    return 0
}

mode_script_name() {
    case "$MODE" in
        tun) printf 'tun-我的.js\n' ;;
        tproxy) printf 'tproxy-我的.js\n' ;;
        ebpf) printf 'ebpf-我的.js\n' ;;
        *) return 1 ;;
    esac
}

resolve_js_dir() {
    JS_DIR=$BOX_HOME/mihomo/scripts
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

select_script() {
    local want manifest tmp owner
    want=$(mode_script_name) || return 0
    [ -f "$JS_DIR/$want" ] || return 0
    manifest=$RUN_DIR/state/config/mihomo-scripts.yaml
    header='# BoxProxy mihomo override scripts, in execution order.'

    if grep -qE '^- *"(tun|tproxy|ebpf)-我的\.js"$' "$manifest" 2>/dev/null; then
        if [ "$DRY_RUN" = 1 ]; then
            log "[dry-run] 清单里的覆写脚本切换成 $want"
            return 0
        fi
        tmp=$TMP_BASE/box-scripts.$$
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
