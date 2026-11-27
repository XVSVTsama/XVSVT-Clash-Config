#!/system/bin/sh
# BoxProxy 内核安装 / 更新（读同一个 box-core.conf）
#
# 第一次安装和后续更新是同一套流程：目标文件不存在就新建，存在就先备份再替换。
# 内核叫什么、文件放哪、去哪个仓库找，全部来自配置，不写死在本脚本里。
#
# 用法（在 BoxProxy 的「工具 → 脚本」里运行，或 su 后手动执行）：
#   sh update-core.sh --show              看每个内核的配置与安装状态（不需要 root）
#   sh update-core.sh                     安装/更新配置里的默认内核（CORE_DEFAULT，默认 ebpf）
#   sh update-core.sh --core <名字>       安装/更新指定内核（名字来自配置）
#   sh update-core.sh --core <名字> --dry-run   只解析来源并打印步骤
#
# 配置文件：同目录的 box-core.conf（没有就用内置默认值）。
#   每个内核：CORE_<名字>_FILE / _REPO / _ASSET / _VERSION / _URL / _SHA256 / _TAG
#   模式映射：MODE_CORE_<模式> = 内核名字
#
# 也可以用命令行临时覆盖：--repo --asset --version --release-tag --url
#   --sha256 --tag --api-base --download-prefix --token
#
# 流程：[1/9] 解析来源 → 下载 → SHA-256 → 解包 → -v 自检 → -t 配置检查
#       → 备份并替换（首次安装直接写入）→ 需要时挂到 bin/mihomo → 重启
# 退出码：0 成功；1 失败（已回滚）；2 参数或环境错误（未改动任何文件）
#
# 注意：bin/ 下的核心会被 BoxProxy 设为 setuid/setgid 运行，只装可信来源的二进制。

set -u

# ---------------------------------------------------------------------------
# 公共部分：配置加载、变量取用、校验、日志包装（与 iface-auto.sh 共用）
# ---------------------------------------------------------------------------
BOX_CORE_LIB=1
lib_dir=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/lib
if [ ! -f "$lib_dir/00-common.sh" ]; then
    printf '错误: 缺少 %s/00-common.sh，请把 lib/ 一起放进 scripts/\n' "$lib_dir" >&2
    exit 2
fi
# shellcheck disable=SC1090
. "$lib_dir/00-common.sh"

# update-core 自己的默认值与输出方式（只打终端，不写 prestart.log）
API_BASE=${API_BASE:-https://api.github.com}
DOWNLOAD_PREFIX=${DOWNLOAD_PREFIX:-}
TOKEN=${TOKEN:-}
log() {
    printf '%s\n' "$*"
}

# ============================================================================
# 0. 参数
# ============================================================================

DRY_RUN=0
SHOW=0
CONF=''
BOX_HOME_CLI=''
CORE_NAME=''

# 命令行覆盖项（空表示不覆盖，用配置里的值）
O_REPO=''
O_ASSET=''
O_VERSION=''
O_RELEASE_TAG=''
O_URL=''
O_SHA256=''
O_TAG=''
O_API_BASE=''
O_DOWNLOAD_PREFIX=''
O_TOKEN=''

usage() {
    awk 'NR > 1 {
        if ($0 ~ /^# --- 以下为代码 ---/) exit
        sub(/^# ?/, "")
        print
    }' "$0"
}

need_value() {
    [ "$2" -ge 2 ] || {
        printf '错误: %s 后面要跟一个值\n' "$1" >&2
        exit 2
    }
}

parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --core) need_value "$1" $#; CORE_NAME=$2; shift 2 ;;
            --repo) need_value "$1" $#; O_REPO=$2; shift 2 ;;
            --asset) need_value "$1" $#; O_ASSET=$2; shift 2 ;;
            --version) need_value "$1" $#; O_VERSION=$2; shift 2 ;;
            --release-tag) need_value "$1" $#; O_RELEASE_TAG=$2; shift 2 ;;
            --url) need_value "$1" $#; O_URL=$2; shift 2 ;;
            --sha256) need_value "$1" $#; O_SHA256=$2; shift 2 ;;
            --tag) need_value "$1" $#; O_TAG=$2; shift 2 ;;
            --api-base) need_value "$1" $#; O_API_BASE=$2; shift 2 ;;
            --download-prefix) need_value "$1" $#; O_DOWNLOAD_PREFIX=$2; shift 2 ;;
            --token) need_value "$1" $#; O_TOKEN=$2; shift 2 ;;
            --home) need_value "$1" $#; BOX_HOME_CLI=$2; shift 2 ;;
            --conf) need_value "$1" $#; CONF=$2; shift 2 ;;
            --dry-run) DRY_RUN=1; shift ;;
            --show) SHOW=1; shift ;;
            -h | --help) usage; exit 0 ;;
            *) printf '错误: 未知参数 %s（用 -h 看用法）\n' "$1" >&2; exit 2 ;;
        esac
    done
}

# ============================================================================
# 1. 配置与默认值（与 iface-auto.sh 同一份）
# ============================================================================

# 优先取命令行覆盖，其次配置
pick() {
    eval "override=\${O_$1:-}"
    if [ -n "$override" ]; then
        printf '%s' "$override"
    else
        core_field "$CORE_NAME" "$1"
    fi
}

# ============================================================================
# 2. 校验与环境
# ============================================================================

# ============================================================================
# 3. 输出与通用工具
# ============================================================================

log() {
    printf '%s\n' "$*"
}

api_get() {
    local args='-fsSL --retry 2 --connect-timeout 20 --max-time 60'
    if [ -n "$O_TOKEN" ]; then
        # shellcheck disable=SC2086
        curl $args -H "Authorization: Bearer $O_TOKEN" "$1"
    elif [ -n "$TOKEN" ]; then
        # shellcheck disable=SC2086
        curl $args -H "Authorization: Bearer $TOKEN" "$1"
    else
        # shellcheck disable=SC2086
        curl $args "$1"
    fi
}

asset_pattern() {
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

cleanup() {
    [ -n "${STAGE:-}" ] && rm -rf "$STAGE"
}

# ============================================================================
# 4. --show
# ============================================================================

show_config() {
    printf '配置文件: %s\n' "${CONF_USED:-（未使用，走内置默认）}"
    printf 'Box 目录: %s\n\n' "$BOX_HOME"
    printf '%-10s %-16s %-46s %s\n' '内核名' '文件' '路径' '状态'
    for name in $CORE_LIST; do
        file=$(core_file "$name")
        path=$BIN_DIR/$file
        if [ -f "$path" ]; then state='已安装'; else state='未安装'; fi
        printf '%-10s %-16s %-46s %s\n' "$name" "$file" "$path" "$state"
    done
    printf '\n%-10s %-16s %-18s %s\n' '内核名' '仓库' '版本策略' '资产匹配'
    for name in $CORE_LIST; do
        repo=$(core_field "$name" REPO)
        ver=$(core_field "$name" VERSION)
        asset=$(core_field "$name" ASSET)
        url=$(core_field "$name" URL)
        [ -n "$repo" ] || repo=${url:-（未配置来源）}
        [ -n "$ver" ] || ver=latest
        [ -n "$asset" ] || asset='*'
        printf '%-10s %-16s %-18s %s\n' "$name" "$repo" "$ver" "$asset"
    done
    printf '\n模式映射：\n'
    for mode in tun tproxy ebpf redirect mixed enhance unknown; do
        printf '  %-9s → %s\n' "$mode" "$(mode_core "$mode")"
    done
    printf '\n默认内核（不带 --core 时）: %s\n' "$CORE_DEFAULT"
}

# ============================================================================
# 5. 解析下载来源
# ============================================================================

pick_asset() {
    awk -v pat="$1" '
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
    ' "$2"
}

resolve_source() {
    REPO=$(pick REPO)
    ASSET=$(pick ASSET)
    VERSION=$(pick VERSION)
    RELEASE_TAG=$(pick RELEASE_TAG)
    URL=$(pick URL)
    SHA256=$(pick SHA256)
    EXPECT_TAG=$(pick TAG)
    [ -n "$VERSION" ] || VERSION=latest
    [ -n "$O_API_BASE" ] && API_BASE=$O_API_BASE
    [ -n "$O_DOWNLOAD_PREFIX" ] && DOWNLOAD_PREFIX=$O_DOWNLOAD_PREFIX

    log "[1/9] 来源"
    log "      内核：$CORE_NAME"
    log "      文件：$(core_file "$CORE_NAME")"
    log "      路径：$TARGET"

    if [ -n "$URL" ]; then
        log "      地址：$URL"
        return 0
    fi
    [ -n "$REPO" ] || die "配置错误：内核 $CORE_NAME 既没有 CORE_${CORE_NAME}_REPO 也没有 _URL"
    [ -n "$ASSET" ] || die "配置错误：内核 $CORE_NAME 缺少 CORE_${CORE_NAME}_ASSET"
    case "$VERSION" in
        latest | prerelease | tag) ;;
        *) die "配置错误：内核 $CORE_NAME 的版本策略只能是 latest / prerelease / tag" ;;
    esac
    [ "$VERSION" = tag ] && [ -z "$RELEASE_TAG" ] && die "配置错误：VERSION=tag 时要填 CORE_${CORE_NAME}_RELEASE_TAG"

    case "$VERSION" in
        latest) api_url=$API_BASE/repos/$REPO/releases/latest ;;
        prerelease) api_url=$API_BASE/repos/$REPO/releases?per_page=30 ;;
        tag) api_url=$API_BASE/repos/$REPO/releases/tags/$RELEASE_TAG ;;
    esac

    log "      仓库：$REPO（$VERSION）"
    json=$STAGE/release.json
    if ! api_get "$api_url" >"$json" 2>"$STAGE/api.err"; then
        cat "$STAGE/api.err" >&2
        die "查询失败：检查网络、API_BASE 镜像或 TOKEN（未认证的 GitHub API 有频率限制）"
    fi
    picked=$(pick_asset "$(asset_pattern)" "$json")
    if [ -z "$picked" ]; then
        log "      可用的资产名："
        sed -n 's/.*"name": *"\([^"]*\)".*/        \1/p' "$json" | head -20
        die "没有匹配 '$ASSET' 的资产，改 CORE_${CORE_NAME}_ASSET"
    fi
    set -- $picked
    URL=$1
    ASSET_NAME=$2
    DIGEST=$3
    FOUND_TAG=$4
    if [ -n "$DOWNLOAD_PREFIX" ]; then
        URL=$DOWNLOAD_PREFIX/https://${URL#https://}
    fi
    log "      版本：${FOUND_TAG:-unknown}"
    log "      资产：$ASSET_NAME"
    log "      地址：$URL"
    if [ -z "$SHA256" ] && [ -n "$DIGEST" ]; then
        SHA256=$DIGEST
        log "      使用仓库提供的 SHA-256"
    fi
}

# ============================================================================
# 6. 下载 → 校验 → 解包 → 自检 → 配置检查
# ============================================================================

download() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[2/9] [dry-run] 下载"
        return 0
    fi
    log "[2/9] 下载"
    curl -fsSL --retry 2 --connect-timeout 20 --max-time 600 \
        -o "$STAGE/archive" "$URL" || die "下载失败：检查地址、网络或镜像"
    [ -s "$STAGE/archive" ] || die "下载结果为空"
}

verify_sha256() {
    if [ -z "$SHA256" ]; then
        log "[3/9] 跳过 SHA-256（仓库未提供，也没有手填）"
        return 0
    fi
    [ "$DRY_RUN" = 1 ] && {
        log "[3/9] [dry-run] 校验 SHA-256"
        return 0
    }
    log "[3/9] 校验 SHA-256"
    want=$(printf '%s' "$SHA256" | tr 'A-F' 'a-f')
    got=$(sha256sum "$STAGE/archive" | awk '{print $1}')
    [ "$want" = "$got" ] || die "SHA-256 不匹配：期望 $want，实际 $got"
}

unpack() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[4/9] [dry-run] 按需解包"
        NEW=$STAGE/core
        return 0
    fi
    log "[4/9] 解包"
    if gzip -t "$STAGE/archive" 2>/dev/null; then
        gzip -dc "$STAGE/archive" >"$STAGE/core" || die "解压失败：确认资产是 gzip 或裸二进制"
        NEW=$STAGE/core
    else
        NEW=$STAGE/archive
    fi
    [ -s "$NEW" ] || die "解包结果为空"
    chmod 755 "$NEW" 2>/dev/null
}

probe_binary() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[5/9] [dry-run] 新内核 -v 自检"
        return 0
    fi
    log "[5/9] 运行新内核自检（-v）"
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
            *) die "版本不含 CORE_${CORE_NAME}_TAG 指定的 '$EXPECT_TAG'：$version" ;;
        esac
    fi
}

config_check() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[6/9] [dry-run] 新内核 -t 检查启动配置"
        return 0
    fi
    log "[6/9] 用新内核检查启动配置"
    if [ ! -f "$STARTUP" ]; then
        log "      跳过：没有 $STARTUP（服务还没启动过？）"
        return 0
    fi
    mkdir -p "$STAGE/profile"
    if ! "$NEW" -t -f "$STARTUP" -d "$STAGE/profile" >"$STAGE/check.log" 2>&1; then
        tail -5 "$STAGE/check.log"
        die "新内核不接受当前启动配置，未做任何改动"
    fi
    log "      配置检查通过"
}

# ============================================================================
# 7. 安装 / 替换（首次安装与更新同一套）
# ============================================================================

install_binary() {
    local first=0 tmp
    LINKED_BEFORE=0
    if [ -f "$LINK" ] && [ "$(stat -c %i "$LINK" 2>/dev/null)" = "$(stat -c %i "$TARGET" 2>/dev/null)" ]; then
        LINKED_BEFORE=1
    fi
    [ -f "$TARGET" ] || first=1
    if [ "$DRY_RUN" = 1 ]; then
        if [ "$first" = 1 ]; then
            log "[7/9] [dry-run] 首次安装：写入 $TARGET"
        else
            log "[7/9] [dry-run] 备份并替换 $TARGET"
        fi
        return 0
    fi
    if [ "$first" = 1 ]; then
        log "[7/9] 首次安装：$TARGET"
    else
        log "[7/9] 备份并替换 $TARGET"
        BACKUP=$TARGET.bak-$(date +%Y%m%d-%H%M%S)
        cp -p "$TARGET" "$BACKUP" || die "备份失败，未做任何改动"
        log "      备份：$BACKUP"
    fi
    tmp=$BIN_DIR/.$(core_file "$CORE_NAME").new
    cp "$NEW" "$tmp" || die "写入临时文件失败"
    chown root:net_admin "$tmp" 2>/dev/null
    chmod 6755 "$tmp" 2>/dev/null
    mv "$tmp" "$TARGET" || die "替换失败"
    log "      已写入：$TARGET"
    return 0
}

# 当前模式（与 iface-auto.sh 同一套判定）
current_mode() {
    local tags='tun|tproxy|ebpf|redirect|mixed|enhance' found
    found=$(printf '%s\n' "${BOX_MODE:-}" | grep -aE "^($tags)\$" 2>/dev/null)
    [ -n "$found" ] || found=$(grep -aoE "网络模式 ($tags)" "$RUN_DIR/runs.log" 2>/dev/null | tail -1 | awk '{print $NF}')
    [ -n "$found" ] || found=$(grep -aoE "模式 ($tags)" "$RUN_DIR/runs.log" 2>/dev/null | tail -1 | awk '{print $NF}')
    [ -n "$found" ] || found=$(printf '%s\n' "${BOX_PROXY_MODE:-}" | grep -aE "^($tags)\$" 2>/dev/null)
    printf '%s\n' "${found:-unknown}"
}

# 需要时把它挂到 bin/mihomo：①替换前它正挂着这个文件 ②当前模式映射到它
link_if_needed() {
    local mode mapped
    mode=$(current_mode)
    mapped=$(mode_core "$mode")

    if [ "$LINKED_BEFORE" = 1 ] || [ "$mapped" = "$CORE_NAME" ]; then
        log "[8/9] 挂到 bin/mihomo（当前模式 $mode → $CORE_NAME）"
        if [ "$DRY_RUN" = 1 ]; then
            log "      [dry-run] ln -f $TARGET $LINK"
        else
            ln -f "$TARGET" "$LINK" 2>/dev/null || log "warn: 挂链失败，下次启动由 iface-auto.sh 处理"
        fi
        return 0
    fi
    log "[8/9] 当前模式 $mode 用的是 $mapped，不动 bin/mihomo（下次启动由 iface-auto.sh 按模式挂）"
}

# 本次改动是否会影响正在使用的内核：替换前挂着它，或当前模式映射到它
apply_needed() {
    [ "${LINKED_BEFORE:-0}" = 1 ] && return 0
    [ "$(mode_core "$(current_mode)")" = "$CORE_NAME" ] && return 0
    return 1
}

restart_service() {
    if [ "$DRY_RUN" = 1 ]; then
        log "[9/9] [dry-run] $BOXCTL restart"
        return 0
    fi
    log "[9/9] 重启服务"
    "$BOXCTL" restart >"$STAGE/restart.log" 2>&1 || true
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "      服务已启动"
        return 0
    fi
    tail -5 "$STAGE/restart.log"
    return 1
}

rollback() {
    if [ -z "${BACKUP:-}" ] || [ ! -f "$BACKUP" ]; then
        log "首次安装失败，没有旧版本可回滚；已写入的文件请手动删除：$TARGET"
        return 1
    fi
    log "回滚到 $BACKUP"
    cp -p "$BACKUP" "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" &&
        chown root:net_admin "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" 2>/dev/null
    chmod 6755 "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" 2>/dev/null
    mv "$BIN_DIR/.$(core_file "$CORE_NAME").rollback" "$TARGET" || return 1
    "$BOXCTL" restart >/dev/null 2>&1 || true
    if "$BOXCTL" status 2>/dev/null | grep -q '正在运行'; then
        log "已恢复旧内核并重启"
    else
        log "回滚后服务仍未起来，请用 BoxProxy 界面手动启动并查看日志"
    fi
}

# ============================================================================
# --- 以下为代码 ---
# ============================================================================

main() {
    parse_args "$@"
    init_defaults
    load_conf
    init_defaults
    check_config

    if [ "$SHOW" = 1 ]; then
        show_config
        exit 0
    fi

    require_root
    CORE_NAME=${CORE_NAME:-$CORE_DEFAULT}
    in_list "$CORE_NAME" || die "内核 '$CORE_NAME' 不在 CORE_LIST 里（用 --show 看可用名字）"

    TARGET=$BIN_DIR/$(core_file "$CORE_NAME")
    LINK=$BIN_DIR/mihomo
    BOXCTL=$BIN_DIR/boxctl
    RUN_DIR=$BOX_HOME/run
    STARTUP=$RUN_DIR/state/config/startup-config
    [ -x "$BOXCTL" ] || die "找不到可执行的 $BOXCTL"
    STAGE=${TMPDIR:-/data/local/tmp}/core-update.$$
    mkdir -p "$STAGE" 2>/dev/null || die "无法创建临时目录 $STAGE"
    trap cleanup EXIT INT TERM

    resolve_source
    download
    verify_sha256
    unpack
    probe_binary
    config_check
    install_binary
    link_if_needed

    if [ "$DRY_RUN" = 1 ]; then
        restart_service
        log "dry-run 完成，未做任何改动"
        exit 0
    fi

    if ! apply_needed; then
        log "当前模式没有用到 $CORE_NAME，跳过重启；下次启动时由 iface-auto.sh 按模式挂载"
        log "完成：$CORE_NAME（$(core_file "$CORE_NAME")）"
        exit 0
    fi

    if restart_service; then
        log "完成：$CORE_NAME（$(core_file "$CORE_NAME")）"
        exit 0
    fi
    rollback
    exit 1
}

main "$@"
