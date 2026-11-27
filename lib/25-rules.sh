#!/system/bin/sh
# 规则式内核选择：条件判断 + 从上到下的规则表 + 次选内核
#
# 由入口脚本通过 . 加载，不单独运行。
#
# 规则写在 box-auto.conf 的 RULES='...' 里，一行一条：
#   条件 => 内核名[, 次选内核, 再次选]
# 求值从上到下，第一条命中的规则生效；该规则里的候选内核按顺序尝试，
# 第一个「文件存在且可执行」的胜出。命中规则后再失败 = 直接退出，不回退。
#
# 条件判断项：
#   mode=ebpf / mode!=tun        当前网络模式
#   js=ebpf-我的.js              覆写脚本是否启用（清单里有）；清单里没有则看文件是否存在；
#                                两边都不满足 → 硬失败（直接退出）
#   conf~星尘 / conf=星尘         状态输出或启动配置里是否出现该关键字
#   tethering=on / off          是否开着热点/共享（有下联即 on）
#   installed=ebpf               该内核文件存在且可执行
#   exists=mihomo-ebpf           bin/ 下存在该文件
#   env=NAME:value               环境变量等于某值
# 组合：not / ! 、and 、or 、( )，优先级 括号 > not > and > or

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

# ---------------------------------------------------------------------------
# 求值上下文（只读，缓存一次）
# ---------------------------------------------------------------------------

status_text() {
    if [ -z "${STATUS_TEXT:-}" ]; then
        STATUS_TEXT=$("$BIN_DIR/boxctl" status 2>/dev/null || true)
    fi
    printf '%s\n' "$STATUS_TEXT"
}

startup_text() {
    local startup=$RUN_DIR/state/config/startup-config
    [ -f "$startup" ] && head -200 "$startup" 2>/dev/null
}

# 覆写脚本是否启用：清单里有它 = 启用；清单没有则看文件是否存在
js_state() {
    local name=$1
    if [ -f "$JS_MANIFEST" ] && grep -qF "\"$name\"" "$JS_MANIFEST" 2>/dev/null; then
        printf 'enabled\n'
    elif [ -f "$JS_DIR/$name" ]; then
        printf 'file\n'
    else
        printf 'missing\n'
    fi
}

# 是否开着热点/共享：优先用已有的 DOWNSTREAM，其次问 dumpsys
rules_tethering() {
    [ -n "${TETHER_ON:-}" ] && return 0
    if [ -n "${DOWNSTREAM:-}" ]; then
        TETHER_ON=on
    elif dumpsys tethering 2>/dev/null | grep -q 'state=TETHERED'; then
        TETHER_ON=on
    else
        TETHER_ON=off
    fi
}

# 补全求值需要的路径（show-config 这类没跑过完整流程的入口用）
rules_context() {
    BIN_DIR=${BIN_DIR:-$BOX_HOME/bin}
    RUN_DIR=${RUN_DIR:-$BOX_HOME/run}
    JS_DIR=${JS_DIR:-${BOX_BASE:-$BOX_HOME}/mihomo/scripts}
    JS_MANIFEST=$RUN_DIR/state/config/mihomo-scripts.yaml
    rules_tethering
}

# ---------------------------------------------------------------------------
# 词法与语法
# ---------------------------------------------------------------------------

rt_peek() {
    printf '%s\n' "$RT_ALL" | sed -n "${RT_I}p"
}

rt_reset() {
    RT_ALL=$(printf '%s' "$1" | sed 's/(/ ( /g; s/)/ ) /g' | tr ' ' '\n' | sed '/^$/d')
    RT_I=1
}

# 原子判断；返回 0 真 / 1 假 / 2 硬失败
rt_atom() {
    local atom key val op negate=0 rc
    atom=$(rt_peek)
    [ -n "$atom" ] || return 2
    RT_I=$((RT_I + 1))

    case "$atom" in
        always) return 0 ;;
        never) return 1 ;;
        *'!='*) key=${atom%%!=*}; val=${atom#*!=}; op='='; negate=1 ;;
        *'!~'*) key=${atom%%!~*}; val=${atom#*!~}; op='~'; negate=1 ;;
        *'='*) key=${atom%%=*}; val=${atom#*=}; op='=' ;;
        *'~'*) key=${atom%%~*}; val=${atom#*~}; op='~' ;;
        *) log "错误: 无法识别的判断项 '$atom'"; return 2 ;;
    esac

    case "$key" in
        mode)
            if [ "$op" = '~' ]; then
                case "$MODE" in *"$val"*) rc=0 ;; *) rc=1 ;; esac
            else
                [ "$MODE" = "$val" ] && rc=0 || rc=1
            fi
            ;;
        js)
            case "$(js_state "$val")" in
                enabled | file) rc=0 ;;
                missing)
                    if [ "$negate" = 0 ]; then
                        log "错误: 覆写脚本 $val 既不在启用清单里，也不在脚本目录里"
                        return 2
                    fi
                    rc=1
                    ;;
            esac
            ;;
        conf)
            if status_text | grep -qF -- "$val" 2>/dev/null || startup_text | grep -qF -- "$val" 2>/dev/null; then
                rc=0
            else
                rc=1
            fi
            ;;
        tethering)
            [ "${TETHER_ON:-off}" = "$val" ] && rc=0 || rc=1
            ;;
        installed)
            [ -x "$(core_path "$val")" ] && rc=0 || rc=1
            ;;
        exists)
            [ -e "$BIN_DIR/$val" ] && rc=0 || rc=1
            ;;
        env)
            name=${val%%:*}
            want=${val#*:}
            eval "current=\${$name:-}"
            if [ -n "$name" ] && [ "$current" = "$want" ]; then rc=0; else rc=1; fi
            ;;
        *)
            log "错误: 未知判断项 '$key'"
            return 2
            ;;
    esac

    if [ "$negate" = 1 ]; then
        [ "$rc" = 0 ] && return 1
        return 0
    fi
    return "$rc"
}

rt_not() {
    local tok st
    tok=$(rt_peek)
    case "$tok" in
        not | '!')
            RT_I=$((RT_I + 1))
            rt_not
            st=$?
            [ "$st" = 2 ] && return 2
            [ "$st" = 0 ] && return 1
            return 0
            ;;
        '(')
            RT_I=$((RT_I + 1))
            rt_or
            st=$?
            [ "$st" = 2 ] && return 2
            if [ "$(rt_peek)" = ')' ]; then
                RT_I=$((RT_I + 1))
                return "$st"
            fi
            log "错误: 规则条件里括号不匹配"
            return 2
            ;;
        '' | ')')
            log "错误: 规则条件不完整"
            return 2
            ;;
        *)
            rt_atom
            ;;
    esac
}

rt_and() {
    local st st2
    rt_not
    st=$?
    [ "$st" = 2 ] && return 2
    while [ "$(rt_peek)" = 'and' ]; do
        RT_I=$((RT_I + 1))
        rt_not
        st2=$?
        [ "$st2" = 2 ] && return 2
        if [ "$st" = 0 ] && [ "$st2" = 0 ]; then st=0; else st=1; fi
    done
    return "$st"
}

rt_or() {
    local st st2
    rt_and
    st=$?
    [ "$st" = 2 ] && return 2
    while [ "$(rt_peek)" = 'or' ]; do
        RT_I=$((RT_I + 1))
        rt_and
        st2=$?
        [ "$st2" = 2 ] && return 2
        if [ "$st" = 0 ] || [ "$st2" = 0 ]; then st=0; else st=1; fi
    done
    return "$st"
}

# 对一条条件求值：0 真 / 1 假 / 2 硬失败
cond_eval() {
    local st
    rt_reset "$1"
    rt_or
    st=$?
    if [ "$st" != 2 ] && [ -n "$(rt_peek)" ]; then
        log "错误: 条件里有无法解析的内容 '$(rt_peek)'"
        return 2
    fi
    return "$st"
}

# ---------------------------------------------------------------------------
# 规则表求值
# ---------------------------------------------------------------------------

# 只求值、不挂链：成功时把内核名放进 CORE_USED
# 返回：0 命中且候选可用；1 没有规则命中；2 硬失败 / 候选全不可用
resolve_core_by_rules() {
    local line cond cands cand chosen='' st n=0 one rest matched=0 hit_cond=''
    rules_context
    CORE_USED=''

    if rules_empty; then
        # 没有规则表：只有唯一内核时用它，多于一个就报错（不替用户猜）
        if [ "$(printf '%s' "$CORE_LIST" | wc -w)" = 1 ]; then
            CORE_USED=$CORE_LIST
            log "未配置 RULES，使用唯一的内核：$CORE_USED"
            return 0
        fi
        log "错误: 没有配置 RULES，且定义了多个内核（$CORE_LIST）"
        log "      请在 box-auto.conf 里写明规则，例如 RULES='mode=ebpf => ebpf'"
        return 2
    fi

    while IFS= read -r line; do
        line=$(printf '%s' "$line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
        case "$line" in
            '' | '#'*) continue ;;
        esac
        n=$((n + 1))

        case "$line" in
            *'=>'*) ;;
            *)
                log "错误: 第 $n 条规则缺少 '=>'：$line"
                return 2
                ;;
        esac
        cond=$(printf '%s' "${line%%=>*}" | sed 's/[[:space:]]*$//')
        cands=$(printf '%s' "${line#*=>}" | sed 's/^[[:space:]]*//')

        # 逗号简化语法：左边多个条件 = 任意一个成立即算命中（等价于拆成多条）
        matched=0
        rest=$cond
        while [ -n "$rest" ]; do
            case "$rest" in
                *,*) one=${rest%%,*}; rest=${rest#*,} ;;
                *) one=$rest; rest='' ;;
            esac
            one=$(printf '%s' "$one" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
            [ -n "$one" ] || continue
            cond_eval "$one"
            st=$?
            if [ "$st" = 2 ]; then
                log "错误: 第 $n 条规则求值失败，停止"
                return 2
            fi
            if [ "$st" = 0 ]; then
                matched=1
                hit_cond=$one
                break
            fi
        done
        if [ "$matched" != 1 ]; then
            if [ "${DRY_RUN:-0}" = 1 ] || [ "${VERBOSE:-0}" = 1 ]; then
                log "  规则 $n: $cond → 假"
            fi
            continue
        fi
        log "规则 $n 命中：$hit_cond"

        for cand in $(printf '%s' "$cands" | tr ',' ' '); do
            if [ -x "$(core_path "$cand")" ]; then
                chosen=$cand
                break
            fi
            log "  候选 $cand 不可用（未安装或不可执行），试下一个"
        done

        if [ -z "$chosen" ]; then
            log "错误: 规则 $n 命中，但候选内核都不可用：$cands"
            return 2
        fi
        break
    done <<EOF
$(rules_text)
EOF

    if [ -z "$chosen" ]; then
        return 1
    fi
    CORE_USED=$chosen
    return 0
}

# 求值并挂到 bin/mihomo
select_core_by_rules() {
    resolve_core_by_rules
    local rc=$?
    [ "$rc" = 0 ] || return "$rc"

    if [ "$DRY_RUN" = 1 ]; then
        log "  [dry-run] ln -f $(core_path "$CORE_USED") $CORE_LINK"
        return 0
    fi
    if ln -f "$(core_path "$CORE_USED")" "$CORE_LINK" 2>/dev/null; then
        log "core -> $CORE_USED（$(core_file "$CORE_USED")）"
        return 0
    fi
    log "错误: 无法把 $CORE_USED 挂到 $CORE_LINK"
    return 2
}
