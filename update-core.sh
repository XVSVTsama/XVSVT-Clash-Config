#!/system/bin/sh
# BoxProxy 内核更新（模板脚本）
#
# 跟着仓库走：给一个 GitHub 仓库和资产名匹配规则，脚本自己查最新发布，
# 下载、校验、检查、替换、重启，失败自动回滚。也可以直接给一个固定地址。
# 模板里不含任何具体仓库、地址、版本或校验值，按你用的核心分支自己补完。
#
# 用法（在 BoxProxy 的「工具 → 脚本」里运行，或 su 后手动执行）：
#   # 跟着仓库最新发布
#   ./update-core.sh --core ebpf --repo <owner/repo> --asset '<资产名匹配>' [--version latest|prerelease|tag]
#   # 直接指定地址
#   ./update-core.sh --core ebpf --url <下载地址>
#   # 只看会拿到哪一版，不下载不替换
#   ./update-core.sh --core ebpf --repo <owner/repo> --asset '...' --dry-run
#
# 参数：
#   --core ebpf|vanilla      替换 bin/core-ebpf 还是 bin/core-vanilla（默认 ebpf）
#   --repo <owner/repo>      GitHub 仓库；与 --url 二选一
#   --asset '<匹配>'         资产名匹配，默认按 glob（* 与 ?），加 --asset-regex 则按正则
#   --version latest|prerelease|tag   取最新稳定版（默认）/ 含预发布的最新 / 指定标签
#   --release-tag <标签>     --version tag 时必填
#   --url <地址>             直接下载地址（http(s):// 或 file://），优先于 --repo
#   --sha256 <值>            可选；下载文件的 SHA-256（仓库给了 digest 时自动使用）
#   --tag <关键字>           可选；新内核 -v 输出里必须包含的关键字
#   --api-base <地址>        GitHub API 前缀，默认 https://api.github.com（可指向镜像）
#   --download-prefix <前缀> 下载地址改写前缀，<前缀>/<原地址去掉 https://>（可指向镜像）
#   --token <令牌>           可选；GitHub Token，提高 API 配额
#   --home <目录>            Box 工作目录，默认 /data/user/0/com.boxproxy.box/files/box
#   --dry-run                只解析并打印步骤，不下载、不替换、不重启
#   -h, --help               帮助
#
# 也可以不写参数：把同目录的 update-core.conf.example 复制成 update-core.conf 填好，
# 在「工具 → 脚本」里直接运行；命令行参数优先于配置文件。
#
# 流程：解析 → 下载 → SHA-256 → 解包 → -v 自检 → -t 配置检查 → 备份替换 → 重启，失败回滚
# 退出码：0 成功；1 失败（已回滚）；2 参数或环境错误（未改动任何文件）
#
# 注意：bin/ 下的核心会被 BoxProxy 设为 setuid/setgid 运行，只装可信来源的二进制。

set -u

BOX_HOME=${BOX_HOME:-/data/user/0/com.boxproxy.box/files/box}
CORE_KIND=ebpf
REPO=''
ASSET=''
ASSET_REGEX=0
VERSION=latest
RELEASE_TAG=''
URL=''
SHA256=''
EXPECT_TAG=''
API_BASE=https://api.github.com
DOWNLOAD_PREFIX=''
TOKEN=''
DRY_RUN=0

# ---------------------------------------------------------------------------
# 0. 输出、参数与配置
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

# 无参数运行时，读取同目录的 update-core.conf
load_conf() {
    conf_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd) || return 0
    CONF=${UPDATE_CORE_CONF:-$conf_dir/update-core.conf}
    [ -f "$CONF" ] || return 0
    # shellcheck disable=SC1090
    . "$CONF"
    log "读取配置：$CONF"
}

parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --core)
                [ $# -ge 2 ] || die "--core 需要一个值"
                CORE_KIND=$2
                shift 2
                ;;
            --repo)
                [ $# -ge 2 ] || die "--repo 需要一个值"
                REPO=$2
                shift 2
                ;;
            --asset)
                [ $# -ge 2 ] || die "--asset 需要一个值"
                ASSET=$2
                shift 2
                ;;
            --asset-regex)
                ASSET_REGEX=1
                shift
                ;;
            --version)
                [ $# -ge 2 ] || die "--version 需要一个值"
                VERSION=$2
                shift 2
                ;;
            --release-tag)
                [ $# -ge 2 ] || die "--release-tag 需要一个值"
                RELEASE_TAG=$2
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
                EXPECT_TAG=$2
                shift 2
                ;;
            --api-base)
                [ $# -ge 2 ] || die "--api-base 需要一个值"
                API_BASE=$2
                shift 2
                ;;
            --download-prefix)
                [ $# -ge 2 ] || die "--download-prefix 需要一个值"
                DOWNLOAD_PREFIX=$2
                shift 2
                ;;
            --token)
                [ $# -ge 2 ] || die "--token 需要一个值"
                TOKEN=$2
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
    [ -x "$BOXCTL" ] || die "找不到可执行的 $BOXCTL"
    if [ -z "$URL" ] && [ -z "$REPO" ]; then
        die "缺少下载来源：给 --repo（跟着仓库走）或 --url（固定地址）"
    fi
    if [ -n "$REPO" ] && [ -z "$ASSET" ]; then
        die "用 --repo 时要给 --asset 匹配规则（例如 '*android-arm64*.gz'）"
    fi
    if [ "$VERSION" = tag ] && [ -z "$RELEASE_TAG" ]; then
        die "--version tag 需要 --release-tag"
    fi
    case "$VERSION" in
        latest | prerelease | tag) ;;
        *) die "--version 只能是 latest、prerelease 或 tag" ;;
    esac
}

# ---------------------------------------------------------------------------
# 2. 从仓库解析发布资产
# ---------------------------------------------------------------------------

api_get() {
    local args
    args="-fsSL --retry 2 --connect-timeout 20 --max-time 60"
    if [ -n "$TOKEN" ]; then
        # shellcheck disable=SC2086
        curl $args -H "Authorization: Bearer $TOKEN" "$1"
    else
        # shellcheck disable=SC2086
        curl $args "$1"
    fi
}

# glob → ERE：* 与 ? 保留语义，其它正则元字符加转义
asset_pattern() {
    if [ "$ASSET_REGEX" = 1 ]; then
        printf '%s\n' "$ASSET"
        return 0
    fi
    printf '%s' "$ASSET" | awk '{
        out = ""
        n = length($0)
        for (i = 1; i <= n; i++) {
            c = substr($0, i, 1)
            if (c == "*") out = out ".*"
            else if (c == "?") out = out "."
            else if (index(".[](){}^$+|\\", c)) out = out "\\" c
            else out = out c
        }
        print out
    }'
}

# 在发布 JSON 里找第一个名字匹配的资产，输出：<下载地址> <文件名> <sha256>
# 同时把命中的 tag 记到 $STAGE/tag
pick_asset() {
    local json=$1 pattern=$2
    awk -v pat="$pattern" '
        /"tag_name": *"/ {
            line = $0; sub(/.*"tag_name": *"/, "", line); sub(/".*/, "", line); tag = line
        }
        /"name": *"/ && !/"avatar_url"/ {
            line = $0; sub(/.*"name": *"/, "", line); sub(/".*/, "", line); name = line; digest = ""
        }
        /"digest": *"sha256:/ {
            line = $0; sub(/.*"sha256:/, "", line); sub(/".*/, "", line); digest = line
        }
        /"browser_download_url": *"/ {
            line = $0; sub(/.*"browser_download_url": *"/, "", line); sub(/".*/, "", line)
            if (name ~ pat) { print line, name, digest, tag; exit }
        }
    ' "$json"
}

resolve_release() {
    local pattern api_url json picked
    pattern=$(asset_pattern)

    case "$VERSION" in
        latest) api_url=$API_BASE/repos/$REPO/releases/latest ;;
        prerelease) api_url=$API_BASE/repos/$REPO/releases?per_page=30 ;;
        tag) api_url=$API_BASE/repos/$REPO/releases/tags/$RELEASE_TAG ;;
    esac

    log "[1/8] 查询 $REPO（$VERSION）"
    if [ "$DRY_RUN" = 1 ]; then
        log "      $api_url"
    fi

    json=$STAGE/release.json
    if ! api_get "$api_url" >"$json" 2>"$STAGE/api.err"; then
        cat "$STAGE/api.err" >&2
        die "查询失败：检查网络、镜像或 Token（未认证的 GitHub API 有频率限制）"
    fi

    picked=$(pick_asset "$json" "$pattern")
    if [ -z "$picked" ]; then
        log "      可用的资产名："
        sed -n 's/.*"name": *"\([^"]*\)".*/        \1/p' "$json" | head -20
        die "没有匹配 '$ASSET' 的资产，调整 --asset 后重试"
    fi

    set -- $picked
    URL=$1
    ASSET_NAME=$2
    DIGEST=$3
    FOUND_TAG=$4

    [ -n "$DOWNLOAD_PREFIX" ] || true
    case "$URL" in
        https://*)
            if [ -n "$DOWNLOAD_PREFIX" ]; then
                URL=$DOWNLOAD_PREFIX/https://${URL#https://}
            fi
            ;;
    esac

    log "      版本：${FOUND_TAG:-unknown}"
    log "      资产：$ASSET_NAME"
    log "      地址：$URL"
    if [ -z "$SHA256" ] && [ -n "$DIGEST" ]; then
        SHA256=$DIGEST
        log "      使用仓库提供的 SHA-256"
    fi
}

# ---------------------------------------------------------------------------
# 3. 下载、校验、解包
# ---------------------------------------------------------------------------

download() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[2/8] [dry-run] 下载 $URL"
        return 0
    fi
    log "[2/8] 下载"
    if ! curl -fsSL --retry 2 --connect-timeout 20 --max-time 600 \
        -o "$STAGE/archive" "$URL"; then
        die "下载失败：检查地址、网络或镜像"
    fi
    [ -s "$STAGE/archive" ] || die "下载结果为空"
}

verify_sha256() {
    if [ -z "$SHA256" ]; then
        log "[3/8] 跳过 SHA-256（仓库未提供、也没有 --sha256）"
        return 0
    fi
    if [ "$DRY_RUN" = 1 ]; then
        log "[3/8] [dry-run] 校验 SHA-256"
        return 0
    fi
    log "[3/8] 校验 SHA-256"
    want=$(printf '%s' "$SHA256" | tr 'A-F' 'a-f')
    got=$(sha256sum "$STAGE/archive" | awk '{print $1}')
    [ "$want" = "$got" ] || die "SHA-256 不匹配：期望 $want，实际 $got"
}

unpack() {
    local file=$STAGE/archive
    if [ "$DRY_RUN" = 1 ]; then
        log "[4/8] [dry-run] 按需解包"
        NEW=$STAGE/core
        return 0
    fi
    log "[4/8] 解包"
    if gzip -t "$file" 2>/dev/null; then
        gzip -dc "$file" >"$STAGE/core" || die "解压失败：确认资产是 gzip 或裸二进制"
        NEW=$STAGE/core
    else
        NEW=$file
    fi
    [ -s "$NEW" ] || die "解包结果为空"
    chmod 755 "$NEW" 2>/dev/null
}

probe_binary() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[5/8] [dry-run] 新内核 -v 自检"
        return 0
    fi
    log "[5/8] 运行新内核自检（-v）"
    version=$("$NEW" -v 2>&1 | head -1)
    [ -n "$version" ] || die "新文件执行 -v 没有输出，可能不是有效核心"
    log "      $version"
    case "$version" in
        *arm64* | *aarch64*) ;;
        *) die "架构不符：需要 arm64，实际输出：$version" ;;
    esac
    if [ -n "$EXPECT_TAG" ]; then
        case "$version" in
            *"$EXPECT_TAG"*) ;;
            *) die "版本不含 --tag 指定的关键字 '$EXPECT_TAG'：$version" ;;
        esac
    fi
}

config_check() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[6/8] [dry-run] 新内核 -t 检查启动配置"
        return 0
    fi
    log "[6/8] 用新内核检查启动配置"
    if [ ! -f "$STARTUP" ]; then
        log "      跳过：没有 $STARTUP（服务未启动过？）"
        return 0
    fi
    mkdir -p "$STAGE/profile"
    if ! "$NEW" -t -f "$STARTUP" -d "$STAGE/profile" >"$STAGE/check.log" 2>&1; then
        tail -5 "$STAGE/check.log"
        die "新内核不接受当前启动配置，未做任何替换"
    fi
    log "      配置检查通过"
}

# ---------------------------------------------------------------------------
# 4. 替换、重启、回滚
# ---------------------------------------------------------------------------

swap_in() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[7/8] [dry-run] 备份并替换 $(basename "$TARGET")"
        return 0
    fi
    log "[7/8] 备份并替换 $(basename "$TARGET")"
    BACKUP=$TARGET.bak-$(date +%Y%m%d-%H%M%S)
    linked=0
    if [ "$(stat -c %i "$LINK" 2>/dev/null)" = "$(stat -c %i "$TARGET" 2>/dev/null)" ]; then
        linked=1
    fi
    cp -p "$TARGET" "$BACKUP" || die "备份失败，未做任何替换"
    cp "$NEW" "$BIN_DIR/.$(basename "$TARGET").new" || die "写入临时文件失败"
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
    if [ "$DRY_RUN" = 1 ]; then
        log "[8/8] [dry-run] $BOXCTL restart"
        return 0
    fi
    log "[8/8] 重启服务"
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
    if [ -z "${BACKUP:-}" ] || [ ! -f "$BACKUP" ]; then
        log "没有可用备份，请手动检查 $TARGET"
        return 1
    fi
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
    load_conf
    parse_args "$@"
    init_paths
    check_env

    log "目标：$TARGET"
    [ "$DRY_RUN" = 1 ] && log "模式：dry-run（不下载、不替换、不重启）"

    if [ -z "$URL" ]; then
        resolve_release
    else
        log "[1/8] 使用给定地址：$URL"
    fi

    download
    verify_sha256
    unpack
    probe_binary
    config_check
    swap_in

    if [ "$DRY_RUN" = 1 ]; then
        restart_service
        log "dry-run 完成，未做任何改动"
        exit 0
    fi

    if restart_service; then
        log "更新完成：$(basename "$TARGET") → 备份保留在 $BACKUP"
        exit 0
    fi

    rollback
    exit 1
}

trap cleanup EXIT INT TERM
main "$@"
