# BoxProxy 脚本（`iface-auto.sh` / `update-core.sh`）

本分支放两个互相独立的脚本，都跑在 BoxProxy 里、都以 root 身份执行：

| 脚本 | 干什么 | 什么时候碰它 |
|---|---|---|
| `iface-auto.sh` | 服务启动前跑：按模式选内核、切覆写脚本、认网卡、放行转发、处理端口冲突 | 装一次就行，之后不用管 |
| `update-core.sh` | 把核心换成新版本（跟着仓库走，失败自动回滚） | 想更新内核时，见下方「内核更新」 |

`iface-auto.sh` 由 BoxProxy 在服务启动前（`BOX_EVENT=pre-start`）执行，把「本次网络模式」翻译成内核、覆写脚本、网卡与转发规则的具体取值；默认不会关闭任何应用，只有当启动配置里要用的端口确实被第三方应用占着时，才停掉那个应用。

两个脚本都不含覆写脚本本身；被改写的 `tun-我的.js`、`tproxy-我的.js`、`ebpf-我的.js` 属于客户端目录，与仓库其它分支的 `script_override.js` 没有直接关系。

## `iface-auto.sh` 放哪、怎么登记

```text
$BOX_HOME/scripts/iface-auto.sh          # 默认 $BOX_HOME=/data/user/0/com.boxproxy.box/files/box
chmod 755 iface-auto.sh
```

在 App 里把它登记为「服务启动前脚本」即可（`app_settings.shell_scripts_pre_start`）。

## `iface-auto.sh` 做什么

| 步骤 | 行为 |
|---|---|
| 识别模式 | `BOX_MODE` → `run/state/runs.log` 里的「网络模式 X」或「模式 X」→ `BOX_PROXY_MODE` 兜底；都没有则记为 `unknown` |
| 选内核 | `ebpf` 模式用 `bin/core-ebpf`，其余用 `bin/core-vanilla`，用 `ln -f` 挂到 `bin/mihomo`；两份都保留，原版不被覆盖 |
| 选覆写脚本 | 清单 `run/state/config/mihomo-scripts.yaml` 里的模式脚本（`tun-我的.js` / `tproxy-我的.js` / `ebpf-我的.js`）换成当前模式那一份并去重；清单里没有这类模式脚本（用户自定义）时不动 |
| 识别出口网卡 | `BOX_NETWORK_IFACE` → `ip route get 1.1.1.1` → 默认路由；过滤 `lo` 与 tun、tap、meta、clash、wg、ppp、ipsec、dummy 类接口 |
| 识别下联网卡 | 按 `dumpsys tethering` 的 `tetherableWifiRegexs` 找出候选接口，要求接口实际存在且带 IPv4 地址；排除出口网卡、dummy 与隧道。`TETHERED` 记录描述的是被共享的上游，不能当下联（Wi-Fi 客户端模式下会把上游 wlan 误判成热点） |
| 写 TUN 网卡 | `tun` 与 `unknown` 模式下把出口网卡写进覆写脚本的 `interface-name`，值不变就不写 |
| 写 eBPF 下联 | 把所有含 `EBPF_SHARED_IFACE_SPEC` 的脚本改成下联网卡（逗号分隔）；没有下联时创建空转 dummy（默认 `boxebpf0`）写进去 |
| 放行转发 | 为每个下联接口在 `FORWARD` 链头插入入向与出向各一条 ACCEPT |
| 端口冲突 | 从 `startup-config` 读出核心要用的端口（`mixed-port`、`port`、`socks-port`、`redir-port`、`tproxy-port`、`external-controller`、`dns.listen`），用 `ss` 找到占用者：系统进程、本应用、查不到包名的一律不动，只有确认是第三方包时才 `am force-stop`，停完复检端口 |
| 额外停包（可选） | `BOX_STOP_PACKAGES` 里的包无条件 `am force-stop`，默认空 |

所有写盘操作都是「值变了才写」，重复执行没有副作用；末尾固定输出一行 `pre-start done mode=… core=… upstream=… downstream=…` 到日志。

## `iface-auto.sh` 用法

```sh
sh iface-auto.sh            # 正常执行（由 boxctl 调用，一般不用手动跑）
sh iface-auto.sh --dry-run  # 只打印将要做的改动，不写盘、不动 iptables
sh iface-auto.sh -h         # 帮助
```

## `iface-auto.sh` 代码结构

脚本按执行顺序分九段，每段只做一件事，函数名即职责：

| 段 | 函数 | 作用 |
|---|---|---|
| 0 参数 | `parse_args` / `usage` | 解析 `--dry-run`、`--verbose`、`-h`；帮助文本直接从文件头注释生成 |
| 1 运行环境 | `init_runtime` | 读取并落定所有路径、默认值与环境变量 |
| 2 日志与包装 | `log` / `run` / `write_text` / `dir_owner` | 统一日志、dry-run 下的命令与写文件拦截、目录属主查询 |
| 3 运行环境探测 | `resolve_js_dir` / `detect_mode` | 定位覆写脚本目录；按 `BOX_MODE` → `runs.log` → `BOX_PROXY_MODE` 定模式 |
| 4 内核 | `select_core` | 按模式选 `core-ebpf` / `core-vanilla`，`ln -f` 挂到 `bin/mihomo` |
| 5 脚本清单 | `mode_script_name` / `rewrite_manifest` / `commit_manifest` / `select_script` | 把清单里的模式脚本换成当前模式那一份并去重 |
| 6 网卡 | `is_tunnel_iface` / `detect_upstream` / `detect_downstream` / `add_downstream` / `tetherable_pattern` / `ensure_dummy_iface` | 识别出口与下联，无下联时补 dummy |
| 7 写入字段 | `update_interface_name` / `update_ebpf_shared_iface` | 把网卡名写进覆写脚本的两个字段，值不变就不写 |
| 8 转发与进程 | `allow_forward` / `config_ports` / `port_owner_pid` / `resolve_package` / `stop_port_conflicts` / `stop_packages` | 为下联放行 `FORWARD`；端口冲突检测与停包 |
| 9 入口与汇总 | `describe_core` / `main` | 反查当前内核，串起流程并输出一行汇总日志 |

## `iface-auto.sh` 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `BOX_HOME` / `BOX_BASE` | `/data/user/0/com.boxproxy.box/files/box` | Box 工作目录 |
| `BOX_RUN_DIR` | `$BOX_BASE/run` | 运行目录（读 `runs.log`、写清单） |
| `BOX_JS_SCRIPTS_DIR` | `$BOX_BASE/mihomo/scripts` | 覆写脚本目录 |
| `BOX_PRE_LOG` | `/data/local/tmp/prestart.log` | 日志文件 |
| `BOX_EBPF_DUMMY` | `boxebpf0` | eBPF 无下联时的占位网卡名 |
| `BOX_CORE_VANILLA` | `$BOX_BASE/bin/core-vanilla` | 原版内核路径 |
| `BOX_CORE_EBPF` | `$BOX_BASE/bin/core-ebpf` | eBPF 内核路径 |
| `BOX_CORE_LINK` | `$BOX_BASE/bin/mihomo` | 内核入口路径（被硬链接指向当前该用的那份） |
| `BOX_NETWORK_IFACE` | 空 | 强制指定出口网卡；留空时按路由推断 |
| `BOX_CONFLICT_STOP` | `auto` | 端口冲突处理：`auto` 停掉占用端口的第三方包，`log` 只记日志，`off` 不检测 |
| `BOX_SELF_PACKAGE` | `com.boxproxy.box` | 本应用包名，永远不会被停 |
| `BOX_STOP_PACKAGES` | 空 | 额外无条件停止的包名，空格分隔；设成 `none` 表示不停 |

boxctl 会自带 `BOX_HOME`、`BOX_RUN_DIR`、`BOX_SCRIPTS_DIR`、`BOX_MODE` 等变量，脚本优先按这些变量取值；其中 `BOX_SCRIPTS_DIR` 指向的是生命周期脚本目录本身，不是覆写脚本目录，所以脚本用「目录里有没有 `.js`」来判断，不盲信这个变量。

## 内核更新（`update-core.sh`）

一句话：**把 BoxProxy 正在用的核心换成新版本，出问题会自动换回去。**

你不需要自己拼下载地址、也不用记版本号——脚本会去仓库的「发布」里找最新的那个文件。

### 先认识三个词

| 词 | 说的是什么 |
|---|---|
| 仓库 | GitHub 上的 `owner/repo`。比如页面地址是 `https://github.com/aaa/bbb`，仓库就是 `aaa/bbb`（**不用写 https 和 .git**） |
| 发布 / Release | 仓库页面右侧「Releases」里的一条记录，每个版本一条 |
| 资产 / Asset | 某条发布下面挂的可下载文件，文件名通常很长，带版本号或哈希 |

### 三步更新（不用敲命令）

**第 1 步：准备一份配置**

打开 BoxProxy → `工具 → 文件管理` → 进入 `scripts` 目录，把 `update-core.conf.example` **复制一份**，改名为 `update-core.conf`。

**第 2 步：填两行**

编辑 `update-core.conf`，最少只改这两行（其余保持默认）：

```sh
REPO='<owner>/<repo>'                  # 你用的核心所在仓库
ASSET='*android-arm64*ebpf*.gz'        # 怎么填见下一节
```

顺带确认这两行的默认值合不合你意：

```sh
CORE=ebpf        # ebpf → 更新 bin/core-ebpf；vanilla → 更新 bin/core-vanilla
VERSION=latest   # latest 最新稳定版；prerelease 含预发布的最新；tag 指定标签
```

**第 3 步：运行**

`工具 → 脚本` → 点 `update-core.sh`。跑完会打印每一步的结果，最后一行是「更新完成」就成功了。

不想直接动系统？先在终端里加 `--dry-run` 跑一遍，它只查版本、打印会下载哪个文件，不下载也不替换：

```sh
sh update-core.sh --dry-run
```

### 资产名怎么填（最容易错的一步）

1. 手机浏览器打开仓库的 **Releases** 页面；
2. 找到最新那条，看下面 **Assets** 里的文件名，例如：
   `mihomo-android-arm64-v8-alpha-smart-1a2b3c4-ebpf.gz`
3. 把**会变的部分**（版本号、哈希）换成 `*`，保留固定的部分：

   | 看到的文件名 | 应当填的 `ASSET` |
   |---|---|
   | `xxx-android-arm64-v8-alpha-smart-1a2b3c4-ebpf.gz` | `*android-arm64*ebpf*.gz` |
   | `xxx-android-arm64-v8-v1.19.34.gz` | `*android-arm64*.gz` |

> 别把哈希或版本号写死，否则出了新版本永远匹配不到。

### 脚本会做的事（八步，都是自动的）

1. 去仓库查最新发布，挑出名字匹配的资产；
2. 下载；
3. 校验 SHA-256（仓库发布里自带摘要就用它的，不用你填）；
4. 如果是 `.gz` 就解压；
5. 拿新内核跑 `-v`，确认是 arm64 的有效程序（配了 `TAG` 还会核对关键字）；
6. 拿新内核跑 `-t`，确认**当前启动配置**它能接受；
7. 备份旧内核，再原子替换（属主 `root:net_admin`、权限 `6755`）；
8. `boxctl restart` 重启服务；**重启失败会自动把旧内核换回来再启一次**。

### 跑完大概长这样

```text
[1/8] 查询 <owner>/<repo>（latest）
      版本：v1.2.3
      资产：xxx-android-arm64-v8-v1.2.3.gz
      地址：https://github.com/...
      使用仓库提供的 SHA-256
[2/8] 下载
[3/8] 校验 SHA-256
[4/8] 解包
[5/8] 运行新内核自检（-v）
      Mihomo Meta v1.2.3 android arm64 ...
[6/8] 用新内核检查启动配置
      配置检查通过
[7/8] 备份并替换 core-ebpf
      已替换，备份：.../bin/core-ebpf.bak-20261201-120000
[8/8] 重启服务
      服务已启动
更新完成：core-ebpf → 备份保留在 .../bin/core-ebpf.bak-20261201-120000
```

### 出问题看这里

| 屏幕上出现 | 意思是 | 怎么办 |
|---|---|---|
| `缺少下载来源：给 --repo 或 --url` | 没填 `REPO`（或没建 conf） | 照「三步更新」填 `REPO` |
| `没有匹配 '...' 的资产` + 一串文件名 | `ASSET` 没对上 | 照「资产名怎么填」，把会变的部分换成 `*` |
| `查询失败` / `HTTP 403` | 网络不通，或 GitHub API 被限流 | 换镜像（`API_BASE`）、填 `TOKEN`、或过一会儿再试 |
| `SHA-256 不匹配` | 下载的文件不完整或被篡改 | 重跑一次；反复出现就换来源 |
| `架构不符` | 下载的是别的架构 | 确认资产名里带 `android-arm64` |
| `新内核不接受当前启动配置` | 这个内核和你的配置不兼容（例如拿官方版当 eBPF 版用） | **它没动你的任何文件**；换回正确的分支 |
| `回滚到 ...` / `已恢复旧内核并重启` | 新内核起不来，脚本已经自动退回 | 服务恢复正常；把这次的资产名记下来换分支版本再试 |
| `需要 root` | 不是 root 身份 | 用 `工具 → 脚本` 运行（它本来就是 root），或先 `su` |

**记住一点**：除了第 7 步「已替换」，前面任何一步失败都不会碰你的内核；第 8 步失败会自动回滚。

### 备份会占地方

每次成功更新都会留一份 `bin/core-<名字>.bak-<时间>`，**约 70 MB**。确认新版本稳定后，在文件管理里把旧的 `.bak` 删掉即可。

### 高阶：不想建 conf，直接带参数跑

```sh
# 跟着仓库最新稳定版
sh update-core.sh --core ebpf --repo <owner>/<repo> --asset '*android-arm64*.gz'

# 跟着预发布（滚动标签的仓库用这个）
sh update-core.sh --core ebpf --repo <owner>/<repo> --asset '*ebpf*.gz' --version prerelease

# 装某个固定地址（特定版本 / 本地文件）
sh update-core.sh --core ebpf --url <下载地址> [--sha256 <值>] [--tag <版本关键字>]
```

| 参数 | 说明 |
|---|---|
| `--core ebpf\|vanilla` | 更新哪个文件，默认 `ebpf` |
| `--repo <owner/repo>` | 跟着仓库走；与 `--url` 二选一 |
| `--asset '<匹配>'` | 资产名匹配，默认 glob；加 `--asset-regex` 按正则 |
| `--version latest\|prerelease\|tag` | 取哪个发布，默认 `latest`；`tag` 要配 `--release-tag` |
| `--url <地址>` | 直接下载地址，优先于 `--repo` |
| `--sha256 <值>` | 手动指定校验值（仓库有 digest 时不用填） |
| `--tag <关键字>` | 新内核 `-v` 输出必须包含的关键字 |
| `--api-base` / `--download-prefix` / `--token` | API 前缀、下载改写前缀、GitHub Token |
| `--home <目录>` | Box 工作目录，默认 `/data/user/0/com.boxproxy.box/files/box` |
| `--dry-run` | 只查版本并打印步骤，不下载、不替换、不重启 |

`--token` 只是让 GitHub API 不那么容易被限流，**等同账号凭据**，别写进仓库或发给别人。`update-core.conf` 已经写进 `.gitignore`，不会被提交。

### 安全底线

`bin/` 里的核心会被 BoxProxy 设成 **setuid/setgid** 运行，任何放进去的程序都是提权执行。所以：只装你能确认来源的核心，别用别人随手发的二进制。

## `iface-auto.sh` 已知边界

- 只在 Android（root）上验证；下联依赖 `dumpsys tethering` 的 `tetherableWifiRegexs`，取不到时退回内置正则（`wlan0`、`softap0`、`ap_br_wlan0` 等）。
- 下联必须带 IPv4 地址才会被认作热点：AP 起好后才会有地址，未启用的接口因此被跳过；纯 IPv6 共享场景会识别不到下联。
- 内核切换依赖 `core-vanilla` / `core-ebpf` 两份文件存在；不存在时跳过，只在日志里留一行。
- dummy 网卡只在 `ebpf` 与 `unknown` 模式下创建，其它模式没有下联也不建。
- 环境里没有 UID、网卡名、密钥之类的具体值；`exclude-uid` 由 boxctl 按 App 内的应用选择注入。
- 端口冲突检测依赖 `ss -lntup` 与 `pm list packages -U`：`ss` 没有输出、或占用的 uid 查不到包名时只记一条日志，不会停止任何东西。
- 正常启动流程里 boxctl 先停核心再跑本脚本，端口一般是空的；若这时仍有本应用的内核占着端口，`auto` 模式下会先结束它（`log` / `off` 模式只记录）。

## 维护

两个脚本都只用系统自带命令（`ip`、`iptables`、`stat`、`awk`、`sed`、`cmp`、`dumpsys`、`am`、`curl`、`gzip`、`sha256sum`），不需要额外装东西。

改动后按这个顺序验：

```sh
sh -n iface-auto.sh && sh -n update-core.sh   # 语法
sh iface-auto.sh --dry-run                    # 启动前脚本：只打印要做的事
sh update-core.sh --dry-run                   # 内核更新：只查版本、打印会下载哪个文件
```

两个 `--dry-run` 都不会写盘、不会替换、不会重启。
