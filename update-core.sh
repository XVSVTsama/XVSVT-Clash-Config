#!/system/bin/sh
# BoxProxy 内核更新（模板脚本）
#
# 作用：把一个新下载的核心二进制换进 bin/，并保证能回滚。
# 模板里不含任何下载地址、版本号或校验值，按你使用的核心分支自己补完。
#
# 用法（在 BoxProxy 的「工具 → 脚本」里运行，或 su 后手动执行）：
#   ./update-core.sh --core ebpf   --url <下载地址> [--sha256 <64 位十六进制>]
#   ./update-core.sh --core vanilla --url <下载地址> [--tag <版本里应出现的关键字>]
#   ./update-core.sh --core ebpf   --url <地址> --dry-run     只看步骤，不下载不替换
#
# 参数：
#   --core ebpf|vanilla   要替换哪个文件：bin/core-ebpf / bin/core-vanilla（默认 ebpf）
#   --url <地址>          新内核的下载地址（.gz 压缩包或裸二进制都行）
#   --sha256 <值>         可选；给了就校验下载结果
#   --tag <关键字>        可选；给新内核执行 -v，输出里必须包含这个关键字（例如版本哈希）
#   --home <目录>         可选；Box 工作目录，默认 /data/user/0/com.boxproxy.box/files/box
#   --dry-run             只打印将要执行的步骤
#   -h, --help            帮助
#
# 流程：备份 → 下载 → 校验 → 配置检查 → 换入 → 重启 → 失败自动回滚
# 退出码：0 成功；1 失败（已回滚）；2 参数或环境错误（未改动任何文件）
#
# 注意：bin/ 下的核心会被 BoxProxy 设为 setuid/setgid 运行，只装可信来源的二进制。

set -u

BOX_HOME=${BOX_HOME:-/data/user/0/com.boxproxy.box/files/box}
CORE_KIND=ebpf
URL=''
SHA256=''
TAG=''
DRY_RUN=0

# ---------------------------------------------------------------------------
# 0. 输出与参数
# ---------------------------------------------------------------------------

log() {
    printf '%s\n' "$*"
}

die() {
    printf '错误: %s\n' "$*" >&2
    exit 2
}

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# --- 以下为代码 ---/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --core)
                [ $# -ge 2 ] || die "--core 需要一个值"
                CORE_KIND=$2
                shift 2
                ;;
            --url)
                [ $# -ge 2 ] || die "--url 需要一个值"
                URL=$2
                shift 2
                ;;
            --sha256)
                [ $# -ge 2 ] || die "--sha256 需要一个值"
                SHA256=$2
                shift 2
                ;;
            --tag)
                [ $# -ge 2 ] || die "--tag 需要一个值"
                TAG=$2
                shift 2
                ;;
            --home)
                [ $# -ge 2 ] || die "--home 需要一个值"
                BOX_HOME=$2
                shift 2
                ;;
            --dry-run)
                DRY_RUN=1
                shift
                ;;
            -h | --help)
                usage
                exit 0
                ;;
            *)
                die "未知参数: $1（用 -h 看用法）"
                ;;
        esac
    done
}

# ---------------------------------------------------------------------------
# 1. 环境检查
# ---------------------------------------------------------------------------

init_paths() {
    BIN_DIR=$BOX_HOME/bin
    TARGET=
    case "$CORE_KIND" in
        ebpf) TARGET=$BIN_DIR/core-ebpf ;;
        vanilla) TARGET=$BIN_DIR/core-vanilla ;;
        *) die "--core 只能是 ebpf 或 vanilla" ;;
    esac
    LINK=$BIN_DIR/mihomo
    BOXCTL=$BIN_DIR/boxctl
    STARTUP=$BOX_HOME/run/state/config/startup-config
    STAGE=${TMPDIR:-/data/local/tmp}/core-update.$$
    mkdir -p "$STAGE" 2>/dev/null || die "无法创建临时目录 $STAGE"
}

check_env() {
    [ "$(id -u)" = 0 ] || die "需要 root：请先 su，或在 BoxProxy 的「工具 → 脚本」里运行"
    [ -d "$BIN_DIR" ] || die "找不到 $BIN_DIR（用 --home 指定 Box 工作目录）"
    [ -f "$TARGET" ] || die "找不到 $TARGET，请先用 BoxProxy 安装过这个核心"
    [ -n "$URL" ] || die "缺少 --url（模板不内置下载地址，请自己补完）"
    [ -x "$BOXCTL" ] || die "找不到可执行的 $BOXCTL"
    case "$URL" in
        http://* | https://* | file://*) ;;
        *) die "--url 需要 http(s):// 或 file:// 地址" ;;
    esac
}

# ---------------------------------------------------------------------------
# 2. 下载与校验
# ---------------------------------------------------------------------------

download() {
    log "[1/7] 下载 $URL"
    if [ "$DRY_RUN" = 1 ]; then
        log "      [dry-run] curl -fsSL -o $STAGE/archive"
        return 0
    fi
    if ! curl -fsSL --retry 2 --connect-timeout 20 --max-time 600 \
        -o "$STAGE/archive" "$URL"; then
        die "下载失败：检查地址、网络或镜像"
    fi
    [ -s "$STAGE/archive" ] || die "下载结果为空"
}

unpack() {
    log "[2/7] 解包"
    local file=$STAGE/archive
    if gzip -t "$file" 2>/dev/null; then
        if [ "$DRY_RUN" = 1 ]; then
            log "      [dry-run] gzip -dc archive > core"
            NEW=$STAGE/core
            return 0
        fi
        if ! gzip -dc "$file" >"$STAGE/core"; then
            die "解压失败：确认下载的是 gzip 格式的核心"
        fi
        NEW=$STAGE/core
    else
        NEW=$file
    fi
    [ "$DRY_RUN" = 1 ] && return 0
    [ -s "$NEW" ] || die "解包结果为空"
    chmod 755 "$NEW" 2>/dev/null
}

verify_sha256() {
    [ -n "$SHA256" ] || {
        log "[3/7] 跳过 SHA-256（未提供 --sha256）"
        return 0
    }
    log "[3/7] 校验 SHA-256"
    if [ "$DRY_RUN" = 1 ]; then
        log "      [dry-run] 比对 $SHA256"
        return 0
    fi
    want=$(printf '%s' "$SHA256" | tr 'A-F' 'a-f')
    got=$(sha256sum "$NEW" | awk '{print $1}')
    [ "$want" = "$got" ] || die "SHA-256 不匹配：期望 $want，实际 $got"
}

probe_binary() {
    log "[4/7] 运行新内核自检（-v）"
    if [ "$DRY_RUN" = 1 ]; then
        log "      [dry-run] $NEW -v"
        return 0
    fi
    version=$("$NEW" -v 2>&1 | head -1)
    [ -n "$version" ] || die "新文件执行 -v 没有输出，可能不是有效核心"
    log "      $version"
    case "$version" in
        *arm64* | *aarch64*) ;;
        *) die "架构不符：需要 arm64，实际输出：$version" ;;
    esac
    if [ -n "$TAG" ]; then
        case "$version" in
            *"$TAG"*) ;;
            *) die "版本不含 --tag 指定的关键字 '$TAG'：$version" ;;
        esac
    fi
}

config_check() {
    log "[5/7] 用新内核检查启动配置"
    if [ "$DRY_RUN" = 1 ]; then
        log "      [dry-run] $NEW -t -f $STARTUP -d $STAGE/profile"
        return 0
    fi
    if [ ! -f "$STARTUP" ]; then
        log "      跳过：没有 $STARTUP（服务未启动过？）"
        return 0
    fi
    if ! "$NEW" -t -f "$STARTUP" -d "$STAGE/profile" >"$STAGE/check.log" 2>&1; then
        tail -5 "$STAGE/check.log"
        die "新内核不接受当前启动配置，未做任何替换"
    fi
    log "      配置检查通过"
}

# ---------------------------------------------------------------------------
# 3. 替换、重启、回滚
# ---------------------------------------------------------------------------

swap_in() {
    log "[6/7] 备份并替换 $(basename "$TARGET")"
    BACKUP=$TARGET.bak-$(date +%Y%m%d-%H%M%S)
    # 记录替换前 bin/mihomo 是否就是这份文件：是的话替换后要重新挂链
    linked=0
    if [ "$(stat -c %i "$LINK" 2>/dev/null)" = "$(stat -c %i "$TARGET" 2>/dev/null)" ]; then
        linked=1
    fi
    if [ "$DRY_RUN" = 1 ]; then
        log "      [dry-run] cp -p $TARGET $BACKUP"
        log "      [dry-run] cp $NEW $BIN_DIR/.$(basename "$TARGET").new && chown root:net_admin && chmod 6755 && mv"
        [ "$linked" = 1 ] && log "      [dry-run] ln -f $TARGET $LINK"
        return 0
    fi
    cp -p "$TARGET" "$BACKUP" || die "备份失败，未做任何替换"
    if ! cp "$NEW" "$BIN_DIR/.$(basename "$TARGET").new"; then
        die "写入临时文件失败"
    fi
    chown root:net_admin "$BIN_DIR/.$(basename "$TARGET").new" 2>/dev/null
    chmod 6755 "$BIN_DIR/.$(basename "$TARGET").new" 2>/dev/null
    mv "$BIN_DIR/.$(basename "$TARGET").new" "$TARGET" || die "替换失败"
    if [ "$linked" = 1 ]; then
        ln -f "$TARGET" "$LINK" 2>/dev/null
    fi
    log "      已替换，备份：$BACKUP"
    return 0
}

restart_service() {
    log "[7/7] 重启服务"
    if [ "$DRY_RUN" = 1 ]; then
        log "      [dry-run] $BOXCTL restart"
        return 0
    fi
    "$BOXCTL" restart >"$STAGE/restart.log" 2>&1 || true
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "      服务已启动"
        return 0
    fi
    tail -5 "$STAGE/restart.log"
    return 1
}

rollback() {
    log "回滚到 $BACKUP"
    [ -n "${BACKUP:-}" ] && [ -f "$BACKUP" ] || {
        log "没有可用备份，请手动检查 $TARGET"
        return 1
    }
    cp -p "$BACKUP" "$BIN_DIR/.$(basename "$TARGET").rollback" &&
        chown root:net_admin "$BIN_DIR/.$(basename "$TARGET").rollback" 2>/dev/null
    chmod 6755 "$BIN_DIR/.$(basename "$TARGET").rollback" 2>/dev/null
    mv "$BIN_DIR/.$(basename "$TARGET").rollback" "$TARGET" || return 1
    ln -f "$TARGET" "$LINK" 2>/dev/null
    "$BOXCTL" restart >/dev/null 2>&1 || true
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "已恢复旧内核并重启"
    else
        log "回滚后服务仍未起来，请用 BoxProxy 界面手动启动并查看日志"
    fi
}

cleanup() {
    [ -n "${STAGE:-}" ] && rm -rf "$STAGE"
}

# ---------------------------------------------------------------------------
# --- 以下为代码 ---
# ---------------------------------------------------------------------------

main() {
    parse_args "$@"
    init_paths
    check_env

    log "目标：$TARGET"
    [ "$DRY_RUN" = 1 ] && log "模式：dry-run（不会下载、不会替换、不会重启）"

    download
    unpack
    verify_sha256
    probe_binary
    config_check
    swap_in

    if [ "$DRY_RUN" = 1 ]; then
        restart_service
        log "dry-run 完成，未做任何改动"
        cleanup
        exit 0
    fi

    if restart_service; then
        log "更新完成：$(basename "$TARGET") → 备份保留在 $BACKUP"
        cleanup
        exit 0
    fi

    rollback
    cleanup
    exit 1
}

trap cleanup EXIT INT TERM
main "$@"
