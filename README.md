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

## 五分钟上手（4 步）

1. **放文件**：把 `iface-auto.sh`、`update-core.sh`、`show-config.sh`、`check-core.sh` 和整个 `lib/` 放进
   `/data/user/0/com.boxproxy.box/files/box/scripts/`，`chmod 755` 这 4 个 `.sh` 与 `lib/*.sh`；
   在 App 里把 **`iface-auto.sh`** 登记为「服务启动前脚本」（其它三个不用登记）。
2. **配置**：复制两份模板
   ```sh
   cp box-auto.conf.example   box-auto.conf      # 一般不用改
   cp box-update.conf.example box-update.conf    # 填 REPO
   ```
   在 `box-update.conf` 里给要用的内核填仓库，例如 `CORE_ebpf_REPO='<owner>/<repo>'`；
   其余（`ASSET`、`VERSION`、模式映射）都有默认值。
3. **装一次内核**（手动，只有装/升级时才需要）：
   ```sh
   sh update-core.sh --core ebpf
   ```
4. **用起来**：在 BoxProxy 里选网络模式 → 启动。启动前只做本地挂载，不会联网。

---

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
2. 文件存在且可执行就 `ln -f` 到 `bin/mihomo`；**不存在只记一条 warn**（提示去跑 `update-core.sh`），不会去下载；
3. 切覆写脚本清单（`tun-我的.js` / `tproxy-我的.js` / `ebpf-我的.js`）；
4. 认出口网卡与下联，必要时挂 dummy；
5. 把网卡名写进覆写脚本字段；
6. 为下联放行 `FORWARD`；
7. 端口冲突检测（系统进程、本应用、查不到包名的一律不动）。

预览：`sh iface-auto.sh --dry-run`。

---

## 手动部分：`box-update.conf` + 三个脚本

### `update-core.sh`：装 / 更新内核（会联网）

```sh
sh update-core.sh                        # 装/更新 CORE_DEFAULT
sh update-core.sh --core <名字>          # 指定内核
sh update-core.sh --core <名字> --dry-run  # 只看会拿哪个资产
```

来源写在 `box-update.conf`：

| 字段 | 说明 |
|---|---|
| `CORE_<名字>_REPO` | GitHub 仓库 `owner/repo`；与 `_URL` 二选一 |
| `CORE_<名字>_ASSET` | 资产名匹配（默认 glob，`*` 可用，别写死哈希） |
| `CORE_<名字>_VERSION` | `latest`（默认）\| `prerelease` \| `tag` |
| `CORE_<名字>_RELEASE_TAG` | `VERSION=tag` 时必填 |
| `CORE_<名字>_URL` | 固定地址或 `file:///...`；填了就不查仓库 |
| `CORE_<名字>_SHA256` / `_TAG` | 可选校验：文件哈希 / `-v` 里必须出现的关键字 |
| `CORE_DEFAULT` | 不带 `--core` 时装哪个 |
| `API_BASE` / `DOWNLOAD_PREFIX` / `TOKEN` | 镜像与 GitHub Token |

流程固定：解析来源 → 下载 → SHA-256（仓库带 `digest` 就用它）→ 解包 → `-v` 自检（要求 arm64）→ `-t` 检查当前启动配置 → 备份并写入（`root:net_admin`、`6755`）→ 当前模式用到它才重启，起不来自动回滚。

备份在 `bin/<文件名>.bak-<时间>`，约 70 MB，确认稳定后自己删。

### `show-config.sh`：看配置解析成什么样

```sh
sh show-config.sh
```

会**同时读两份配置**，输出：内核名 / 文件 / 路径 / 安装状态、来源与版本策略、模式映射、当前检测到的模式。不需要 root（非 root 时「已安装/未安装」可能不准）。

### `check-core.sh`：校验已装的内核（不联网）

```sh
sh check-core.sh                  # 校验当前模式要用的内核
sh check-core.sh --core vanilla   # 校验指定内核
```

输出 `-v` 版本、`bin/mihomo` 是否指向它、对当前启动配置的 `-t` 结果。

---

## 常见任务

| 想做的事 | 改哪个配置 | 之后 |
|---|---|---|
| 用官方内核跑 eBPF 模式 | `box-auto.conf`：`MODE_CORE_ebpf='vanilla'` | 直接启动 |
| 换一个自己的 eBPF 分支 | 两份都加名字；`box-auto.conf` 改映射 | `sh update-core.sh --core myebpf`，再启动 |
| 升级内核 | `box-update.conf` 的 `REPO` 已填 | `sh update-core.sh --core ebpf` |
| 换某个模式的出口内核 | `box-auto.conf`：`MODE_CORE_<模式>` | 启动 |
| 临时装某个固定版本 | `box-update.conf`：给该内核填 `URL` | `sh update-core.sh --core <名字>` |

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
| `warn: 内核 x 的文件 y 不存在……` | 还没装 | `sh update-core.sh --core x` |
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

## 维护

```sh
for f in iface-auto.sh update-core.sh show-config.sh check-core.sh; do sh -n "$f"; done
for f in lib/*.sh; do sh -n "$f"; done            # 语法
sh show-config.sh                                 # 两份配置解析是否符合预期
sh iface-auto.sh --dry-run                        # 启动前会做什么
sh update-core.sh --core <名字> --dry-run          # 会下载哪个资产
```

`show-config`、`--dry-run` 都不写盘、不替换、不重启。
