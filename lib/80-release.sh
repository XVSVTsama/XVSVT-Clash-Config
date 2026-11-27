#!/system/bin/sh
# 从 GitHub 发布里解析下载地址（update-core.sh 用）
#
# 由入口脚本通过 . 加载，不单独运行。

[ -n "${BOX_CORE_LIB:-}" ] || {
    printf '%s\n' "这是 BoxProxy 脚本的功能模块，不能单独运行。" >&2
    exit 2
}

api_get() {
    if [ -n "$TOKEN" ]; then
        curl -fsSL --retry 2 --connect-timeout 20 --max-time 60 \
            -H "Authorization: Bearer $TOKEN" "$1"
    else
        curl -fsSL --retry 2 --connect-timeout 20 --max-time 60 "$1"
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
    [ -n "$ASSET" ] || ASSET='*android-arm64*.gz'

    log "[1/9] 来源"
    log "      内核：$CORE_NAME"
    log "      文件：$(core_file "$CORE_NAME")"
    log "      路径：$TARGET"

    if [ -n "$URL" ]; then
        log "      地址：$URL"
        return 0
    fi
    [ -n "$REPO" ] || die "配置错误：内核 $CORE_NAME 既没有 CORE_${CORE_NAME}_REPO 也没有 _URL"
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

pick() {
    core_field "$CORE_NAME" "$1"
}
