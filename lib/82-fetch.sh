#!/system/bin/sh
# 下载、校验、解包、自检、配置检查（update-core.sh 用）
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

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

check_startup_config() {
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
