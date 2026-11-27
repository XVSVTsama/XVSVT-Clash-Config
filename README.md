# BoxProxy 脚本

分成两部分，共用同一份 `box-core.conf`：

| 部分 | 脚本 | 什么时候跑 | 联网吗 |
|---|---|---|---|
| **自动** | `iface-auto.sh` | BoxProxy 每次启动前自动调用 | **不联网**，只挂已装好的内核、认网卡、放行转发 |
| **手动** | `update-core.sh` | 你想装/更新内核时 | 会下载，失败自动回滚 |
| | `show-config.sh` | 想看配置解析成什么样 | 不联网 |
| | `check-core.sh` | 想校验已装的内核 | 不联网 |

功能都在 `lib/` 里，四个脚本只是入口。配置文件只有一份：`box-core.conf`（模板 `box-core.conf.example`；填满的示例 `box-core.full-example.conf`，讲解见 [docs/box-core-example.md](docs/box-core-example.md)）。

---

## 五分钟上手（4 步）

1. **放文件**：把 `iface-auto.sh`、`update-core.sh`、`show-config.sh`、`check-core.sh` 和整个 `lib/` 目录放进
   `/data/user/0/com.boxproxy.box/files/box/scripts/`，`chmod 755` 这 4 个 `.sh` 与 `lib/*.sh`；
   在 App 里把 **`iface-auto.sh`** 登记为「服务启动前脚本」（其它三个不用登记）。
2. **填配置**：把 `box-core.conf.example` 复制成 `box-core.conf`，给要用的内核填仓库：
   ```sh
   CORE_ebpf_REPO='<owner>/<repo>'
   CORE_vanilla_REPO='<owner>/<repo>'
   ```
   其余（`ASSET`、`VERSION`、模式映射）都有默认值，可以不动。
3. **装一次内核**（手动，只有装/升级时才需要）：
   ```sh
   sh update-core.sh --core ebpf
   ```
4. **用起来**：在 BoxProxy 里选网络模式 → 启动。启动前 `iface-auto.sh` 只做本地准备，不会联网。

之后想升级内核，重复第 3 步（或换个 `--core`）；启动流程始终不下载。

---

## 配置文件说明

完整注释在 `box-core.conf.example` 里，这里只讲结构和「哪些必须填」。

### 1. 内核清单

每个内核一个**名字**，用 `CORE_<名字>_<字段>` 描述。名字只能用字母、数字、下划线。

| 字段 | 必填 | 说明 |
|---|---|---|
| `CORE_<名字>_FILE` | 是 | 放在 `bin/` 下的文件名，如 `core-ebpf`；只能写文件名，不能带路径 |
| `CORE_<名字>_REPO` | 二选一 | GitHub 仓库 `owner/repo`；有它才能「跟着仓库更新」 |
| `CORE_<名字>_ASSET` | 二选一 | 资产名匹配，默认 glob（`*`、`?` 生效） |
| `CORE_<名字>_VERSION` | 否 | `latest`（默认）\| `prerelease` \| `tag` |
| `CORE_<名字>_RELEASE_TAG` | 视情况 | `VERSION=tag` 时必填 |
| `CORE_<名字>_URL` | 二选一 | 固定下载地址；填了就不查仓库 |
| `CORE_<名字>_SHA256` | 否 | 手动校验值；仓库发布带 `digest` 时自动使用 |
| `CORE_<名字>_TAG` | 否 | 新内核 `-v` 输出里必须包含的关键字（例如版本哈希） |

另外两项决定「清单里有哪些」和「默认装哪个」：

```sh
CORE_LIST='ebpf vanilla'   # 必须列出全部内核名，顺序即遍历顺序
CORE_DEFAULT='ebpf'        # update-core.sh 不带 --core 时装这个
```

### 2. 模式映射（哪个入站用哪个内核）

```sh
MODE_CORE_tun='vanilla'
MODE_CORE_tproxy='vanilla'
MODE_CORE_ebpf='ebpf'
MODE_CORE_redirect='vanilla'
MODE_CORE_mixed='vanilla'
MODE_CORE_enhance='vanilla'
MODE_CORE_unknown='vanilla'
```

右边的值必须是 `CORE_LIST` 里有的名字；只有被某个模式用到的内核，才会在启动时被挂到 `bin/mihomo`。

### 3. 启动前行为

| 项 | 默认 | 说明 |
|---|---|---|
| `DUMMY_IFACE` | `boxebpf0` | eBPF 没有下联时挂的空转网卡名 |
| `CONFLICT_STOP` | `auto` | `auto` 停掉占着核心端口的第三方应用；`log` 只记录；`off` 不检测 |
| `STOP_PACKAGES` | 空 | 额外无条件停止的包名（空格分隔） |
| `EXTRA_PORTS` | 空 | 除启动配置里的端口外，额外检查冲突的端口 |

---

## 自动部分：`iface-auto.sh` 启动前做什么

由 `boxctl` 调用，**全程本地操作、不联网、不下载**：

1. 读配置，解析「当前模式 → 内核名 → 文件 → 路径」；
2. 该文件存在且可执行就 `ln -f` 到 `bin/mihomo`；**不存在只记一条 warn**（提示去跑 `update-core.sh`），不会自己去下载；
3. 按模式切换覆写脚本清单（`tun-我的.js` / `tproxy-我的.js` / `ebpf-我的.js`）；
4. 识别出口网卡（路由 → 各表默认路由，跳过 tun/dummy 等隧道）与下联（热点网卡）；
5. 没下联时给 eBPF 挂空转 dummy；
6. 把出口写进 `interface-name`、把下联写进 `EBPF_SHARED_IFACE_SPEC`（值不变就不写）；
7. 为下联放行 `FORWARD`；
8. 端口冲突检测：只停真正占着核心端口的第三方应用（系统进程、本应用、查不到包名的一律不动）。

预览它要做什么：

```sh
sh iface-auto.sh --dry-run
```

---

## 手动部分

### `update-core.sh`：装 / 更新内核（会联网）

```sh
sh update-core.sh                        # 装/更新 CORE_DEFAULT
sh update-core.sh --core <名字>          # 指定内核
sh update-core.sh --core <名字> --dry-run  # 只看会拿哪个资产，不下载
```

首次安装与更新是同一条命令：文件不存在就写入，存在就先备份再替换。流程固定：

解析来源 → 下载 → SHA-256（仓库带 `digest` 就用它）→ 解包 → `-v` 自检（要求 arm64，可配 `TAG` 核对）→ `-t` 检查当前启动配置 → 备份并写入（`root:net_admin`、`6755`）→ 当前模式用到它才重启，起不来自动回滚。

来源写在配置里，四种写法：

| 想怎么更新 | 配置 | 说明 |
|---|---|---|
| 跟最新稳定版 | `VERSION='latest'` | 取 `/releases/latest` |
| 跟预发布（滚动标签） | `VERSION='prerelease'` | 取含预发布的最新一条 |
| 锁定某标签 | `VERSION='tag'` + `RELEASE_TAG='...'` | 只有它变了才换 |
| 固定地址 / 本地文件 | `URL='https://...'` 或 `file:///...` | 不查仓库 |

备份在 `bin/<文件名>.bak-<时间>`，约 70 MB，确认稳定后自己删。

### `show-config.sh`：看配置解析成什么样

```sh
sh show-config.sh
```

```
配置文件: .../scripts/box-core.conf
Box 目录: /data/user/0/com.boxproxy.box/files/box

内核名     文件             路径                       状态
ebpf       core-ebpf        .../bin/core-ebpf          已安装
vanilla    core-vanilla     .../bin/core-vanilla       已安装

内核名     来源（仓库 / 链接）   版本策略      资产匹配
ebpf       <owner>/<repo>        prerelease    *android-arm64*ebpf*.gz

模式映射:
  ebpf      → ebpf       .../bin/core-ebpf
当前检测到的模式: ebpf → ebpf
```

不需要 root 也能跑（非 root 时「已安装/未安装」可能不准）。

### `check-core.sh`：校验已装的内核（不联网）

```sh
sh check-core.sh                  # 校验当前模式要用的内核
sh check-core.sh --core vanilla   # 校验指定内核
```

输出该内核的 `-v` 版本、`bin/mihomo` 是否指向它、以及它对当前启动配置的 `-t` 结果。

---

## 常见任务：只改配置，然后手动装一次

| 想做的事 | 改哪里 | 之后 |
|---|---|---|
| 用官方内核跑 eBPF 模式 | `MODE_CORE_ebpf='vanilla'` | 直接启动（文件已在） |
| 换一个自己的 eBPF 分支 | 新增 `CORE_myebpf_*`、加进 `CORE_LIST`、`MODE_CORE_ebpf='myebpf'` | `sh update-core.sh --core myebpf`，再启动 |
| 升级官方内核 | 填好 `CORE_vanilla_REPO` | `sh update-core.sh --core vanilla` |
| 换某个模式的出口内核 | 改 `MODE_CORE_<模式>` | 启动 |
| 临时装某个固定版本 | 给该内核填 `URL='...'` | `sh update-core.sh --core <名字>` |

---

## 执行顺序

| 什么时候 | 谁在跑 | 干什么 |
|---|---|---|
| 你想装/升级内核 | 你 → `update-core.sh` | 下载、校验、写入，必要时重启服务 |
| 你在 App 里点启动 | `boxctl` → `iface-auto.sh` | 把已装好的内核挂到 `bin/mihomo`、切覆写脚本、认网卡、放行转发（不联网） |
| 服务起来 | `boxctl` → 核心 | 用 `bin/mihomo` 指向的内核启动 |

---

## 出错怎么办

| 看到 | 意思 | 怎么办 |
|---|---|---|
| `配置错误：MODE_CORE_x 指向的内核 'y' 不在 CORE_LIST 里` | 映射写了个没定义的名字 | 把 `y` 加进 `CORE_LIST` 并定义 `CORE_y_FILE`，或改映射 |
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
| `00-common.sh` | 全部 | 配置加载与默认值、`CORE_*` / `MODE_CORE_*` 取值、日志、校验 |
| `10-mode.sh` | 全部 | 识别当前网络模式（`BOX_MODE` → `runs.log` → `BOX_PROXY_MODE`） |
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
for f in lib/*.sh; do sh -n "$f"; done          # 语法
sh show-config.sh                               # 配置解析是否符合预期
sh iface-auto.sh --dry-run                      # 启动前会做什么
sh update-core.sh --core <名字> --dry-run        # 会下载哪个资产
```

`show-config`、`--dry-run` 都不写盘、不替换、不重启。
