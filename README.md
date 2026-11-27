# BoxProxy 脚本（唯一入口 `iface-auto.sh`）

一个入口 + 一份配置 + 一组模块：

| 文件 | 作用 | 你会碰它吗 |
|---|---|---|
| `iface-auto.sh` | **唯一入口**。不带参数 = 服务启动前流程；`show` 看配置；`update` 装/更新内核 | 装一次、登记为启动前脚本 |
| `box-core.conf.example` | 配置模板，带完整注释（就是这份脚本的说明书） | 复制一份改成 `box-core.conf` 后填 |
| `lib/*.sh` | 入口的功能模块：配置、模式、内核、脚本清单、网卡、JS 字段、端口冲突、查发布、下载、写入、show | 不用管；别单独运行，也别登记 |

入口、模块都**读同一份 `box-core.conf`**：你在配置里定好「哪个模式用哪个内核」「内核文件叫什么」「去哪儿下载」，脚本不用改。

---

## 五分钟上手（不用敲命令）

1. **放文件**：把 `iface-auto.sh` 和整个 `lib/` 目录放进 BoxProxy 的脚本目录
   `/data/user/0/com.boxproxy.box/files/box/scripts/`，`chmod 755 iface-auto.sh` 与 `lib/*.sh`，
   并在 App 里把 `iface-auto.sh` 登记为「服务启动前脚本」。只登记这一个，`lib/` 不要登记。
2. **填配置**：把 `box-core.conf.example` 复制成 `box-core.conf`，给要用的内核填上仓库：
   ```sh
   CORE_ebpf_REPO='<owner>/<repo>'
   CORE_vanilla_REPO='<owner>/<repo>'
   ```
   其余保持默认即可（`ASSET`、`VERSION`、模式映射都有默认值）。
3. **直接用**：在 BoxProxy 里选好网络模式，启动。

首次启动时，模式要用的内核还没装？脚本会按配置自动下载、校验、装好再挂上去，你不需要做别的事。

## 配置文件说明

完整注释在 `box-core.conf.example` 里，这里只讲结构和「哪些必须填」。

想先看一份**填满的完整实例**（一台手机：eBPF 用自己的构建、其余模式用官方版、外加一个备用内核）：
根目录的 `box-core.full-example.conf`，配套讲解见 **[docs/box-core-example.md](docs/box-core-example.md)**——
里面按「读三行就能回答：哪个入站用哪个内核、点更新会拿哪个资产、想换要改哪几行」组织，还带三种变体（只用一个内核 / 两个 eBPF 构建对比 / 离线本地文件）。

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
CORE_DEFAULT='ebpf'        # 不带 --core 时装这个
```

默认已定义 `ebpf`（`core-ebpf`）和 `vanilla`（`core-vanilla`），只有 `FILE` 有默认值，下载来源留空待你填。

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

- 右边填上面定义过的内核**名字**，没定义的名字会直接报错；
- 只有被某个模式用到的内核，才会在启动时被挂到 `bin/mihomo`；
- 想用自己新加的内核跑 eBPF？把 `MODE_CORE_ebpf` 改成那个名字即可。

### 3. 启动前行为

| 项 | 默认 | 说明 |
|---|---|---|
| `DUMMY_IFACE` | `boxebpf0` | eBPF 没有下联时挂的空转网卡名 |
| `CONFLICT_STOP` | `auto` | `auto` 停掉占着核心端口的第三方应用；`log` 只记录；`off` 不检测 |
| `STOP_PACKAGES` | 空 | 额外无条件停止的包名（空格分隔） |
| `EXTRA_PORTS` | 空 | 除启动配置里的端口外，额外检查冲突的端口 |

---

## 内核怎么装、怎么更新（自动）

| 情况 | 脚本会怎么做 | 开关 |
|---|---|---|
| 当前模式要用的内核还没装 | 启动前按配置的来源自动安装，装完挂到 `bin/mihomo` | `AUTO_INSTALL='on'`（默认） |
| 已经装了，想跟着仓库升级 | 每次启动前查一次来源，资产变了就自动升级 | `AUTO_UPDATE='on'`（默认 `off`，不联网） |
| 完全不想让它联网 | 两个开关都设 `off`，自己把内核文件放进 `bin/` | — |

自动安装/升级同样走完整校验，不用你操心：

1. 下载后比对 SHA-256（仓库发布带 `digest` 就用它）；
2. 解包，确认是 `arm64` 的有效核心（配了 `TAG` 还会核对关键字）；
3. 用新内核 `-t` 检查**当前启动配置**，不通过就放弃，不动任何文件；
4. 备份旧文件后写入，属主 `root:net_admin`、权限 `6755`；
5. 装完立刻挂到 `bin/mihomo`，服务随即用新内核启动；起不来会自动回滚到备份。

来源写在配置里，三种写法：

| 想怎么更新 | 配置 | 说明 |
|---|---|---|
| 跟最新稳定版 | `VERSION='latest'` | 取 `/releases/latest` |
| 跟预发布（滚动标签） | `VERSION='prerelease'` | 取含预发布的最新一条 |
| 锁定某标签 | `VERSION='tag'` + `RELEASE_TAG='...'` | 只有它变了才换 |
| 固定地址 / 本地文件 | 填 `URL='https://...'` 或 `file:///...` | 不再查仓库 |

备份在 `bin/<文件名>.bak-<时间>`，约 70 MB，确认稳定后自己删。

## 可选：想核对配置时

平时不需要敲命令，下面这些只是排错和检查用：

```sh
sh iface-auto.sh show        # 看内核 / 文件 / 路径 / 状态 / 来源 / 模式映射（不需要 root）
sh iface-auto.sh --dry-run   # 预览“启动前会做什么”，不下载、不替换、不重启
```

`show` 输出长这样（节选）：

```
内核名     文件             路径                       状态
ebpf       core-ebpf        .../bin/core-ebpf          已安装
vanilla    core-vanilla     .../bin/core-vanilla       已安装

内核名     来源（仓库 / 链接）   版本策略      资产匹配
ebpf       <owner>/<repo>        prerelease    *android-arm64*ebpf*.gz

模式映射:
  ebpf      → ebpf       .../bin/core-ebpf
当前检测到的模式: ebpf → ebpf
```

## 可选：立刻装/更新，不等下次启动

只有这两种情况你会用到：

- 想现在就把某个内核装好（比如备用的 `spare`）；
- 不想开 `AUTO_UPDATE`，但想手动升一次。

```sh
sh iface-auto.sh update --core <名字>          # 装/更新指定内核
sh iface-auto.sh update --core <名字> --dry-run  # 只看会拿哪个资产
```

当前模式用到的内核更新完会自动重启服务；装一个当前没用的内核不会打断服务，下次启动自然生效。

## 常见任务：只改配置

| 想做的事 | 改哪里 | 之后做什么 |
|---|---|---|
| 用官方内核跑 eBPF 模式 | `MODE_CORE_ebpf='vanilla'` | 启动 |
| 装一个自己的 eBPF 分支 | 新增 `CORE_myebpf_*` 三行、加进 `CORE_LIST`、`MODE_CORE_ebpf='myebpf'` | 启动（首次自动安装） |
| 只更新官方内核 | 填 `CORE_vanilla_REPO` | 启动；想把更新自动化就设 `AUTO_UPDATE='on'` |
| 换某个模式的出口内核 | 改 `MODE_CORE_<模式>` | 启动 |
| 临时装某个固定版本 | 给该内核填 `URL='...'` | 启动 |
| 不想让它联网自动装 | `AUTO_INSTALL='off'`，自己把文件放进 `bin/` | 启动 |

## 执行顺序

| 什么时候 | 谁在跑 | 干什么 |
|---|---|---|
| 你在 App 里点启动 | `boxctl` → `iface-auto.sh` | 检查内核在不在 → 不在就按配置装 → 挂到 `bin/mihomo` → 切覆写脚本、认网卡、放行转发 |
| 服务起来 | `boxctl` → 核心 | 用 `bin/mihomo` 指向的内核启动 |
| 平时 | 你 | 只改 `box-core.conf`；不放心时可以跑 `show` 核对 |

## 出错怎么办

| 看到 | 意思 | 怎么办 |
|---|---|---|
| `配置错误：MODE_CORE_x 指向的内核 'y' 不在 CORE_LIST 里` | 映射写了个没定义的名字 | 把 `y` 加进 `CORE_LIST` 并定义 `CORE_y_FILE`，或改映射 |
| `配置错误：CORE_x_FILE 只能写文件名` | 文件字段里带了路径 | 只留文件名，路径固定是 `bin/` |
| `没有匹配 '...' 的资产` | 资产名匹配不对 | 照发布页的文件名把版本/哈希换成 `*` |
| `查询失败` / `HTTP 403` | 网络不通或 API 限流 | 用 `API_BASE` 指镜像、填 `TOKEN`，或稍后再试 |
| `SHA-256 不匹配` | 文件不完整或被改 | 重跑；反复出现换来源 |
| `架构不符` | 下错架构 | 资产名里要有 `android-arm64` |
| `新内核不接受当前启动配置` | 内核与配置不匹配（如官方版当 eBPF 用） | 没动任何文件，换回正确分支 |
| `回滚到 ...` | 新内核起不来，已自动退回 | 服务已恢复；换版本再试 |
| `warn: 内核 x 的文件 y 不存在，退回 vanilla` | 映射的内核还没装，且自动安装没成功 | 看同一段日志里 `自动安装` 后面的报错（来源/网络/校验） |

---

## `iface-auto.sh` 细节

入口文件只做三件事：解析参数与子命令、按顺序加载 `lib/` 里的模块、分发到对应流水线。功能全在 `lib/`：

| 模块 | 谁用 | 负责 |
|---|---|---|
| `lib/00-common.sh` | 全部 | 配置加载与默认值、`CORE_*` / `MODE_CORE_*` 取值、日志与执行包装、配置校验 |
| `lib/10-mode.sh` | 全部 | 识别当前网络模式（`BOX_MODE` → `runs.log` → `BOX_PROXY_MODE`），也给 update 判断「现在用的是哪个内核」 |
| `lib/20-core.sh` | pre-start | 模式 → 内核名 → 文件 → 路径，缺文件退回 vanilla，`ln -f` 到 `bin/mihomo` |
| `lib/30-scripts.sh` | pre-start | 定位覆写脚本目录、改写 `mihomo-scripts.yaml` 里的模式脚本 |
| `lib/40-net.sh` | pre-start | 出口网卡、下联网卡、dummy 网卡、`FORWARD` 放行 |
| `lib/50-js-fields.sh` | pre-start | 出口写进 `interface-name`、下联写进 `EBPF_SHARED_IFACE_SPEC` |
| `lib/60-conflict.sh` | pre-start | 端口冲突检测与按规则停包 |
| `lib/70-report.sh` | show | `show` 子命令的统一表格（内核 / 来源 / 映射） |
| `lib/80-release.sh` | update | 查仓库发布、匹配资产、拼下载地址（含镜像与 Token） |
| `lib/82-fetch.sh` | update | 下载 → SHA-256 → 解包 → `-v` 自检 → `-t` 配置检查 |
| `lib/84-install.sh` | update | 写入/备份/回滚、挂链、重启 |
| `lib/88-run.sh` | 全部 | 两条流水线：`run_prestart`（启动前）与 `run_update`（装/更新） |

模块只能被入口 `. ` 加载；单独 `sh lib/10-mode.sh` 会被拒绝（退出码 2），避免误跑。

启动前按顺序做这些（都有日志）：

0. 读配置，看当前模式要用的内核在不在：不在就按来源自动安装（`AUTO_INSTALL`），配了 `AUTO_UPDATE='on'` 还会先查一次新版本；
1. 解析「当前模式 → 内核名 → 文件 → 路径」；
2. 该文件存在且可执行就 `ln -f` 到 `bin/mihomo`，不存在则退回 `vanilla` 内核并记一条 warn；
3. 按模式切换覆写脚本清单（`tun-我的.js` / `tproxy-我的.js` / `ebpf-我的.js`）；
4. 识别出口网卡（路由 → 各表默认路由，跳过 tun/dummy 等隧道）与下联（热点网卡）；
5. 没下联时给 eBPF 挂空转 dummy；
6. 把出口写进 `interface-name`、把下联写进 `EBPF_SHARED_IFACE_SPEC`（值不变就不写）；
7. 为下联放行 `FORWARD`；
8. 端口冲突检测：只停真正占着核心端口的第三方应用（系统进程、本应用、查不到包名的一律不动）。

已知边界：

- 下联依赖 `dumpsys tethering` 的 `tetherableWifiRegexs`，取不到时退回内置正则；下联必须带 IPv4 地址，纯 IPv6 共享识别不到。
- 端口检测依赖 `ss -lntup` 与 `/data/system/packages.list`；读不到就只记日志、不采取行动。
- 只在 Android（root）上验证。

---

## 维护

```sh
sh -n iface-auto.sh                           # 语法（入口）
for f in lib/*.sh; do sh -n "$f"; done        # 语法（模块）
sh iface-auto.sh show                         # 配置解析是否正确
sh iface-auto.sh show                         # 内核来源与安装状态
sh iface-auto.sh --dry-run                    # 启动前脚本会做什么
sh iface-auto.sh update --core <名字> --dry-run  # 会下载哪个资产
```

`show` 与 `--dry-run` 都不写盘、不替换、不重启。改动脚本后建议按上面四条顺序验一遍。
