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
| `box-update.conf` | 给要用的内核填 `REPO`（仓库 `owner/repo`）；`CORE_DEFAULT='ebpf'` 表示点运行时默认装它 |
| `box-auto.conf` | 一般不用改；要让 eBPF 模式用别的内核，改 `MODE_CORE_ebpf` |

**第 4 步：装内核（点一下）**

`工具 → 脚本` → 运行 `update-core.sh`。它按 `CORE_DEFAULT` 装那个内核，不需要任何参数。

**第 5 步：用起来**

首页选网络模式 → 启动。启动前 `iface-auto.sh` 只把已装好的内核挂上去，不联网。

> 想装另一个内核（比如官方版或备用内核）：把 `box-update.conf` 里的 `CORE_DEFAULT` 改成那个名字，再点一次 `update-core.sh`。
> 想看配置解析成什么样：`工具 → 脚本` 里运行 `show-config.sh`。

## 自动部分：`box-auto.conf`

由 `boxctl` 在启动前调用 `iface-auto.sh`，**全程本地、不联网、不下载**。

### 内核名字与文件

```sh
CORE_LIST='ebpf vanilla'          # 有哪些内核（名字要和 box-update.conf 对齐）
# CORE_ebpf_FILE='core-ebpf'      # 文件名默认 core-<名字>，想改才写
```

### 模式映射（最常改）

```sh
MODE_CORE_tun='vanilla'
MODE_CORE_tproxy='vanilla'
MODE_CORE_ebpf='ebpf'          # eBPF 模式用 ebpf 这个名字
MODE_CORE_redirect='vanilla'
MODE_CORE_mixed='vanilla'
MODE_CORE_enhance='vanilla'
MODE_CORE_unknown='vanilla'
```

右边的值必须是 `CORE_LIST` 里有的名字，否则启动前直接报配置错误；只有被模式用到的内核才会被挂到 `bin/mihomo`。

### 启动前行为

| 项 | 默认 | 说明 |
|---|---|---|
| `DUMMY_IFACE` | `boxebpf0` | eBPF 没有下联时挂的空转网卡名 |
| `CONFLICT_STOP` | `auto` | `auto` 停掉占着核心端口的第三方应用；`log` 只记录；`off` 不检测 |
| `STOP_PACKAGES` | 空 | 额外无条件停止的包名 |
| `EXTRA_PORTS` | 空 | 除启动配置里的端口外，额外检查冲突的端口 |

### 启动前它会做什么

1. 解析「当前模式 → 内核名 → 文件 → 路径」；
2. 文件存在且可执行就 `ln -f` 到 `bin/mihomo`；**不存在只记一条 warn**（提示去 `工具 → 脚本` 装一次），不会去下载；
3. 切覆写脚本清单（`tun-我的.js` / `tproxy-我的.js` / `ebpf-我的.js`）；
4. 认出口网卡与下联，必要时挂 dummy；
5. 把网卡名写进覆写脚本字段；
6. 为下联放行 `FORWARD`；
7. 端口冲突检测（系统进程、本应用、查不到包名的一律不动）。

想看它会做什么：命令行 `sh iface-auto.sh --dry-run`（可选，日常不需要）。

---

## 手动部分：`box-update.conf` + 三个脚本

### `update-core.sh`：装 / 更新内核（会联网）

在 `工具 → 脚本` 里点一下运行即可，装的永远是 `box-update.conf` 里 `CORE_DEFAULT` 指定的那个内核。想装别的，先把 `CORE_DEFAULT` 改过去。

来源写在 `box-update.conf`：

| 字段 | 说明 |
|---|---|
| `CORE_<名字>_REPO` | GitHub 仓库 `owner/repo`；与 `_URL` 二选一 |
| `CORE_<名字>_ASSET` | 资产名匹配（默认 glob，`*` 可用，别写死哈希） |
| `CORE_<名字>_VERSION` | `latest`（默认）\| `prerelease` \| `tag` |
| `CORE_<名字>_RELEASE_TAG` | `VERSION=tag` 时必填 |
| `CORE_<名字>_URL` | 固定地址或 `file:///...`；填了就不查仓库 |
| `CORE_<名字>_SHA256` / `_TAG` | 可选校验：文件哈希 / `-v` 里必须出现的关键字 |
| `CORE_DEFAULT` | 点运行 `update-core.sh` 时装哪个内核 |
| `API_BASE` / `DOWNLOAD_PREFIX` / `TOKEN` | 镜像与 GitHub Token |

流程固定：解析来源 → 下载 → SHA-256（仓库带 `digest` 就用它）→ 解包 → `-v` 自检（要求 arm64）→ `-t` 检查当前启动配置 → 备份并写入（`root:net_admin`、`6755`）→ 当前模式用到它才重启，起不来自动回滚。

备份在 `bin/<文件名>.bak-<时间>`，约 70 MB，确认稳定后自己删。

### `show-config.sh`：看配置解析成什么样

`工具 → 脚本` 里点一下运行，屏幕上会列出解析结果。

会**同时读两份配置**，输出：内核名 / 文件 / 路径 / 安装状态、来源与版本策略、模式映射、当前检测到的模式。不需要 root（非 root 时「已安装/未安装」可能不准）。

### `check-core.sh`：校验已装的内核（不联网）

`工具 → 脚本` 里点一下运行，默认校验当前模式要用的内核。

输出 `-v` 版本、`bin/mihomo` 是否指向它、对当前启动配置的 `-t` 结果。

---

## 常见任务

| 想做的事 | 改哪个配置 | 之后做什么 |
|---|---|---|
| 用官方内核跑 eBPF 模式 | `box-auto.conf`：`MODE_CORE_ebpf='vanilla'` | 直接启动 |
| 换一个自己的 eBPF 分支 | 两份都加名字；`box-auto.conf` 改映射 | 把 `CORE_DEFAULT` 改成新名字，点一次 `update-core.sh`，再启动 |
| 升级内核 | `box-update.conf` 的 `REPO` 已填 | 点一次 `update-core.sh` |
| 换某个模式的出口内核 | `box-auto.conf`：`MODE_CORE_<模式>` | 启动 |
| 临时装某个固定版本 | `box-update.conf`：给该内核填 `URL`，并把 `CORE_DEFAULT` 指过去 | 点一次 `update-core.sh` |

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
| `配置错误：MODE_CORE_x 指向的内核 'y' 不在 CORE_LIST 里` | 映射写了个没定义的名字 | 在 `box-auto.conf` 的 `CORE_LIST` 里补上，或改映射 |
| `配置错误：CORE_x_FILE 只能写文件名` | 文件字段里带了路径 | 只留文件名，路径固定是 `bin/` |
| `warn: 内核 x 的文件 y 不存在……` | 还没装 | 把 `CORE_DEFAULT` 改成 x，点一次 `update-core.sh` |
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
sh update-core.sh                        # 装 CORE_DEFAULT 指向的内核
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
