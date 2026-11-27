# BoxProxy 脚本

分成自动、手动两部分，**各自一份配置**：

| 部分 | 配置 | 脚本 | 什么时候跑 | 联网吗 |
|---|---|---|---|---|
| **自动** | `box-auto.conf` | `iface-auto.sh` | BoxProxy 每次启动前自动调用 | 不联网 |
| **手动** | `box-update.conf` | `update-core.sh` | 装/更新内核时 | 会下载 |
| | | `show-config.sh` | 想看配置解析成什么样 | 不联网 |
| | | `check-core.sh` | 想校验已装的内核 | 不联网 |

两份配置的分工：

- **`box-auto.conf`**：哪个入站用哪个内核、内核的文件叫什么、启动前的行为（dummy 网卡、端口冲突）。
- **`box-update.conf`**：内核从哪个仓库/地址下载、版本策略、校验值与镜像（只有手动脚本会用）。

功能都在 `lib/` 里，四个脚本只是入口。两份配置都有模板（`*.example`）和填满的示例（`*.full-example.conf`，讲解见 [docs/box-core-example.md](docs/box-core-example.md)）。

---

## 上手：只靠「复制文件 + 编辑 + 点运行」

不需要敲命令。下面每一步都是 App 或文件管理器里的操作。

**第 1 步：放文件（一次性）**

1. 把 `iface-auto.sh`、`update-core.sh`、`show-config.sh`、`check-core.sh` 和整个 `lib/` 目录复制到
   `/data/user/0/com.boxproxy.box/files/box/scripts/`（`工具 → 文件管理` 可以直接进这个目录）。
2. 在 BoxProxy 设置里，把 `iface-auto.sh` 选为「服务启动前脚本」。其它三个不用登记。

**第 2 步：准备两份配置（复制 + 改名）**

在 `scripts/` 里：

- 长按 `box-auto.conf.example` → 复制 → 粘贴 → 重命名为 **`box-auto.conf`**
- 长按 `box-update.conf.example` → 复制 → 粘贴 → 重命名为 **`box-update.conf`**

**第 3 步：编辑配置**

用任意文本编辑器打开这两个文件：

| 文件 | 要改什么 |
|---|---|
| `box-update.conf` | 只填内核的仓库：`CORE_ebpf_REPO='<owner>/<repo>'`（想要官方版再填 `CORE_vanilla_REPO`） |
| `box-auto.conf` | 一般不用改；要让 eBPF 模式用别的内核，改 `MODE_CORE_ebpf` |

**第 4 步：装内核（点一下）**

`工具 → 脚本` → 运行 `update-core.sh`。它把所有填了仓库的内核都装一遍，不需要任何参数。

**第 5 步：用起来**

首页选网络模式 → 启动。启动前 `iface-auto.sh` 只把已装好的内核挂上去，不联网。

> 想装别的内核（比如官方版或备用内核）：在 `box-update.conf` 里加一行 `CORE_<名字>_REPO` 或 `_URL`，再点一次 `update-core.sh`。
> 想看配置解析成什么样：`工具 → 脚本` 里运行 `show-config.sh`。

## 自动部分：`box-auto.conf`（通常一行都不用改）

默认就够用：

| 模式 | 用的内核 | 文件 |
|---|---|---|
| `ebpf` | `ebpf` | `bin/core-ebpf` |
| `tun` / `tproxy` / `redirect` / `mixed` / `enhance` / `unknown` | `vanilla` | `bin/core-vanilla` |

只有一种情况要改——**eBPF 模式想用别的内核**：

```sh
MODE_CORE_ebpf='ebpf'     # 换成你的内核名即可
```

新增自己的内核时，才需要写文件名（不写就是 `core-<名字>`）：

```sh
CORE_mycore_FILE='core-mycore'
```

高级项都有默认值，需要时再加：

```sh
# DUMMY_IFACE='boxebpf0'     # eBPF 没开热点时的空转网卡
# CONFLICT_STOP='auto'       # auto 停掉占用端口的应用 | log 只记 | off 不查
# STOP_PACKAGES=''           # 额外无条件停的包
# EXTRA_PORTS=''             # 额外检查冲突的端口
```

启动前它会做：解析「模式 → 内核 → 文件 → 路径」→ 把文件 `ln -f` 到 `bin/mihomo`（**文件不存在只 warn，不下载**）→ 切覆写脚本 → 认网卡/挂 dummy → 写 JS 字段 → 放行 `FORWARD` → 端口冲突检测。全程不联网。

---

### 可选：规则式选择内核（`RULES`）

不写 `RULES` 就按上面的默认映射走。写了 `RULES`，映射表不再生效：

```sh
RULES='
# 条件                                    => 内核名（可写多个候选，按顺序试）
mode=ebpf and installed=ebpf             => ebpf
js=ebpf-我的.js                           => ebpf, alpha
tethering=on                             => alpha, ebpf
conf~家用                                 => vanilla
always                                   => vanilla
'
```

- **自上而下求值，第一条命中的生效**；`always` 常放最后当兜底；
- 命中后按顺序试候选内核，第一个「文件存在且可执行」的胜出；
- **某个候选不可用只是换下一个；整条规则都不可用 → 直接退出**，不会退回映射表；
- `js=` 是硬条件：那个脚本既不在启用清单里、文件也不存在时，直接失败退出。

判断项：

| 写法 | 含义 |
|---|---|
| `mode=ebpf` / `mode!=tun` / `mode~pro` | 当前网络模式 |
| `js=ebpf-我的.js` | 覆写脚本已启用（清单里）；清单没有则看文件是否存在；都没有 → 失败退出 |
| `conf~关键字` | `boxctl status` 的输出或启动配置里出现该关键字 |
| `tethering=on` / `off` | 是否开着热点/共享（有下联即 on） |
| `installed=ebpf` | 该内核文件存在且可执行 |
| `exists=core-ebpf` | `bin/` 下有这个文件 |
| `env=NAME:值` | 环境变量等于某值 |

组合：`not` / `!`、`and`、`or`、`( )`，优先级 括号 > not > and > or。

规则写错了怎么看？`工具 → 脚本` 运行 `show-config.sh`，末尾会按当前模式把规则逐条求值并给出结论：

```
规则表预览（按当前条件求值）:
规则 1 命中：mode=ebpf
  结果: 会选中 ebpf
```

`iface-auto.sh --dry-run` 也会打印每条规则的真假，便于调规则。

## 手动部分：`box-update.conf` + 三个脚本

### `update-core.sh`：装 / 更新内核（会联网）

在 `工具 → 脚本` 里点一下运行。它会把**所有配了来源的内核**都装一遍，所以不用选装哪个。

`box-update.conf` 里只有一件必填的事——内核从哪来：

```sh
CORE_ebpf_REPO='<owner>/<repo>'      # 想要官方版就再填这一行
# CORE_vanilla_REPO='<owner>/<repo>'
```

其余全有默认值：

| 内核 | 版本策略 | 资产名匹配 | 文件 |
|---|---|---|---|
| `ebpf` | `prerelease` | `*android-arm64*ebpf*.gz` | `bin/core-ebpf` |
| 其它（含 `vanilla`） | `latest` | `*android-arm64*.gz` | `bin/core-<名字>` |

需要时再写的高级项：

```sh
# CORE_ebpf_VERSION='prerelease'
# CORE_ebpf_ASSET='*android-arm64*ebpf*.gz'
# CORE_ebpf_TAG='-ebpf'        # -v 输出必须含这个串
# CORE_ebpf_URL=''             # 固定地址 / file://，填了就不查仓库
# CORE_ebpf_SHA256=''          # 仓库带 digest 时自动用
# API_BASE='https://api.github.com'
# DOWNLOAD_PREFIX=''           # 镜像前缀
# TOKEN=''                     # GitHub Token，等同账号凭据，别提交
```

装的时候依次做：解析来源 → 下载 → SHA-256 → 解包 → `-v` 自检（arm64）→ `-t` 检查当前启动配置 → 备份并写入（`root:net_admin`、`6755`）；只有当前模式用到的那个内核变了才重启，起不来自动回滚。备份在 `bin/<文件名>.bak-<时间>`，约 70 MB，稳定后自己删。

### `show-config.sh` / `check-core.sh`

`工具 → 脚本` 里各点一下：

- `show-config.sh`：列出内核 / 文件 / 路径 / 安装状态 / 来源 / 模式映射（同时读两份配置，不用 root）。
- `check-core.sh`：对已装内核跑 `-v` 与 `-t`，报告 `bin/mihomo` 是否指向它（不联网）。

## 常见任务

| 想做的事 | 改哪个配置 | 之后做什么 |
|---|---|---|
| 用官方内核跑 eBPF 模式 | `box-auto.conf`：`MODE_CORE_ebpf='vanilla'` | 直接启动 |
| 换一个自己的 eBPF 分支 | `box-auto.conf` 改 `MODE_CORE_ebpf`；`box-update.conf` 加一行 `CORE_<名字>_REPO` | 点一次 `update-core.sh`，再启动 |
| 升级内核 | `box-update.conf` 的 `REPO` 已填 | 点一次 `update-core.sh` |
| 换某个模式的出口内核 | `box-auto.conf`：`MODE_CORE_<模式>` | 启动 |
| 临时装某个固定版本 | `box-update.conf`：给该内核填 `URL` | 点一次 `update-core.sh` |

---

## 执行顺序

| 什么时候 | 谁在跑 | 干什么 |
|---|---|---|
| 你想装/升级内核 | 你 → `update-core.sh` | 下载、校验、写入，必要时重启 |
| 你在 App 里点启动 | `boxctl` → `iface-auto.sh` | 把已装好的内核挂到 `bin/mihomo`、切覆写脚本、认网卡、放行（不联网） |
| 服务起来 | `boxctl` → 核心 | 用 `bin/mihomo` 指向的内核启动 |

---

## 出错怎么办

| 看到 | 意思 | 怎么办 |
|---|---|---|
| `配置错误：MODE_CORE_x 指向的内核 'y' 不在 CORE_LIST 里` | 映射写了没定义过的名字 | 在 `box-auto.conf` 写下 `CORE_y_FILE` 或在 `box-update.conf` 写下 `CORE_y_REPO`，或改映射 |
| `配置错误：CORE_x_FILE 只能写文件名` | 文件字段里带了路径 | 只留文件名，路径固定是 `bin/` |
| `warn: 内核 x 的文件 y 不存在……` | 还没装 | 在 `box-update.conf` 填它的 `REPO`，点一次 `update-core.sh` |
| `没有匹配 '...' 的资产` | 资产名匹配不对 | 照发布页文件名把版本/哈希换成 `*` |
| `查询失败` / `HTTP 403` | 网络不通或 API 限流 | `API_BASE` 指镜像、填 `TOKEN`，或稍后再试 |
| `SHA-256 不匹配` | 文件不完整或被改 | 重跑；反复出现换来源 |
| `架构不符` | 下错架构 | 资产名里要有 `android-arm64` |
| `新内核不接受当前启动配置` | 内核与配置不匹配（如官方版当 eBPF 用） | 没动任何文件，换回正确分支 |
| `回滚到 ...` | 新内核起不来，已自动退回 | 服务已恢复；换版本再试 |

---

## 模块结构（`lib/`）

| 模块 | 谁用 | 负责 |
|---|---|---|
| `00-common.sh` | 全部 | 两份配置的加载、`CORE_*` / `MODE_CORE_*` 取值、日志、校验 |
| `10-mode.sh` | 全部 | 识别当前网络模式 |
| `20-core.sh` | iface-auto | 模式 → 内核 → 文件 → 路径，缺文件退回 vanilla，`ln -f` |
| `30-scripts.sh` | iface-auto | 覆写脚本目录与 `mihomo-scripts.yaml` |
| `40-net.sh` | iface-auto | 出口网卡、下联网卡、dummy、`FORWARD` |
| `50-js-fields.sh` | iface-auto | `interface-name` / `EBPF_SHARED_IFACE_SPEC` |
| `60-conflict.sh` | iface-auto | 端口冲突检测与停包 |
| `70-report.sh` | show-config | 配置与状态表格 |
| `80-release.sh` | update-core | 查发布、匹配资产、拼下载地址 |
| `82-fetch.sh` | update-core | 下载 → SHA-256 → 解包 → `-v` → `-t` |
| `84-install.sh` | update-core | 写入 / 备份 / 回滚、挂链、重启 |
| `88-run.sh` | iface-auto / update-core | 两条流水线：`run_prestart`、`run_update` |

模块只能被入口 `.` 加载，单独执行会被拒绝（退出码 2）。

---

## 命令行的等价操作（可选，给会用终端的人）

日常不需要命令行，上面所有事都能在 App 里点。下面这些等价于点按，排错时更快：

```sh
sh show-config.sh                        # = 运行 show-config.sh
sh update-core.sh                        # 装所有配了来源的内核
sh update-core.sh --core <名字>          # 临时装别的内核，不改配置
sh iface-auto.sh --dry-run               # 预览启动前会做什么
sh update-core.sh --core <名字> --dry-run # 只看会下载哪个资产
```

改脚本后自检：

```sh
for f in iface-auto.sh update-core.sh show-config.sh check-core.sh; do sh -n "$f"; done
for f in lib/*.sh; do sh -n "$f"; done
```

`show-config` 与 `--dry-run` 都不写盘、不替换、不重启。
