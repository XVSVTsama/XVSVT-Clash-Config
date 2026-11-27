#!/system/bin/sh
# 端口冲突检测与停包
#
# 由 iface-auto.sh 通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 iface-auto.sh 的模块，不能单独运行。" >&2
    exit 2
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

is_box_core_pid() {
    local cmd
    cmd=$(tr '\0' '\n' <"/proc/$1/cmdline" 2>/dev/null | head -1)
    case "$cmd" in
        "$BIN_DIR"/*) return 0 ;;
    esac
    return 1
}

pid_uid() {
    stat -c %u "/proc/$1" 2>/dev/null
}

port_owner_pid() {
    ss -Hlntup 2>/dev/null | grep -E "[:.]$1 " | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2
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

uid_package() {
    awk -v u="$1" '$2 == u { print $1; exit }' /data/system/packages.list 2>/dev/null
}
