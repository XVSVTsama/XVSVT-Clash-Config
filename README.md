# BoxProxy 脚本（`iface-auto.sh` / `update-core.sh`）

两个脚本 + 一份共用配置：

| 文件 | 作用 | 你会碰它吗 |
|---|---|---|
| `box-core.conf.example` | 配置模板，带完整注释（就是这份脚本的说明书） | 复制一份改成 `box-core.conf` 后填 |
| `update-core.sh` | 安装 / 更新核心：查发布、下载、校验、检查、写入、必要时重启，失败回滚 | 装或更新内核时跑 |
| `iface-auto.sh` | 服务启动前跑：按当前模式把对应内核挂到 `bin/mihomo`，切覆写脚本，认网卡，放行转发 | 装一次登记为启动前脚本，之后不用管 |

两个脚本**读同一份 `box-core.conf`**：你在配置里定好「哪个模式用哪个内核」「内核文件叫什么」「去哪儿下载」，脚本不用改。

---

## 五分钟上手

1. **放文件**：把三个文件放进 BoxProxy 的脚本目录
   `/data/user/0/com.boxproxy.box/files/box/scripts/`，`chmod 755` 两个 `.sh`。
2. **建配置**：把 `box-core.conf.example` 复制成 `box-core.conf`。
3. **填来源**：编辑 `box-core.conf`，给要用的内核填 `REPO` 与 `ASSET`（例：
   `CORE_ebpf_REPO='<owner>/<repo>'`、`CORE_ebpf_ASSET='*android-arm64*ebpf*.gz'`）。
4. **确认**：跑下面两条，看清「模式 → 内核 → 文件 → 路径」是不是你要的：
   ```sh
   sh update-core.sh --show
   sh iface-auto.sh --show
   ```
5. **装内核**：`sh update-core.sh --core ebpf`（第一次就是安装，以后就是更新）。
6. **用起来**：BoxProxy 里选对应模式启动。启动前 `iface-auto.sh` 会自动把该模式配的内核挂到 `bin/mihomo`。

> 没建 `box-core.conf` 也能跑：脚本有内置默认值（`ebpf` 模式用 `core-ebpf`，其余模式用 `core-vanilla`），行为和旧版一致。

---

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

## 确认配置：两条 `--show`

```
$ sh update-core.sh --show
配置文件: .../scripts/box-core.conf
Box 目录: /data/user/0/com.boxproxy.box/files/box

内核名     文件             路径                                          状态
ebpf       core-ebpf        .../bin/core-ebpf                            已安装
vanilla    core-vanilla     .../bin/core-vanilla                         已安装
probe      core-probe       .../bin/core-probe                           未安装

内核名     仓库              版本策略      资产匹配
ebpf       <owner>/<repo>    prerelease    *android-arm64*ebpf*.gz
...
模式映射：
  ebpf      → ebpf
```

```
$ sh iface-auto.sh --show
内核清单:
  ebpf       文件 core-ebpf        .../bin/core-ebpf  [已安装]
模式映射:
  tun       → vanilla    .../bin/core-vanilla
  ebpf      → ebpf       .../bin/core-ebpf
当前检测到的模式: ebpf → ebpf
```

对着两张表确认三件事：**给哪个入站用哪个内核、下载的内核叫什么名字、文件落在哪个路径**。`--show` 不需要 root，也不会改任何东西。

---

## 安装 / 更新内核

首次安装和后续更新是**同一条命令**：文件不存在就创建，存在就先备份再替换。

```sh
sh update-core.sh --core <名字>          # 装/更新指定内核
sh update-core.sh                        # 不写就用 CORE_DEFAULT
sh update-core.sh --core <名字> --dry-run  # 只解析来源、打印步骤
```

来源就三种写法，写在配置里即可：

| 想怎么更新 | 配置 | 说明 |
|---|---|---|
| 跟最新稳定版 | `VERSION='latest'` | 取 `/releases/latest` |
| 跟预发布（滚动标签） | `VERSION='prerelease'` | 取含预发布的最新一条 |
| 锁定某标签 | `VERSION='tag'` + `RELEASE_TAG='...'` | 只有它变了才换 |
| 固定地址 / 本地文件 | 填 `URL='https://...'` 或 `file:///...` | 不再查仓库 |

脚本自己做的校验（都不用你操心）：

1. 下载后比对 SHA-256（仓库发布带 `digest` 就用它）；
2. 解包，确认是 `arm64` 的有效核心（配了 `TAG` 还会核对关键字）；
3. 用新内核 `-t` 检查**当前启动配置**，不通过就退出、不动任何文件；
4. 写入时设 `root:net_admin` + `6755`，与 BoxProxy 的期望一致。

关于重启：

- **只有会影响你在用的内核时才重启**（替换前 `bin/mihomo` 就挂着它，或当前模式映射到它）；
- 装一个当前没在用的内核（比如备用的 `probe`）不会打断服务，下次启动自然生效；
- 重启失败会自动回滚到备份，并把服务再拉起来。

备份在 `bin/<文件名>.bak-<时间>`，约 70 MB，确认稳定后自己删。

---

## 执行顺序（照这个顺序用就不会乱）

| 什么时候 | 谁在跑 | 干什么 |
|---|---|---|
| 平时 | 你 → `update-core.sh` | 装/更新内核，必要时重启 |
| 服务启动前 | `boxctl` → `iface-auto.sh` | 按当前模式把内核挂到 `bin/mihomo`、切覆写脚本、认网卡、放行转发 |
| 启动 | `boxctl` → 核心 | 用 `bin/mihomo` 指向的内核启动 |

boxctl 只会自动跑登记为「服务启动前脚本」的那份，所以 `iface-auto.sh` 要登记进去，`update-core.sh` 不用登记（手动跑）。

---

## 常见任务速查

| 想做的事 | 改哪里 | 跑什么 |
|---|---|---|
| 用 eBPF 模式跑官方内核 | `MODE_CORE_ebpf='vanilla'` | `sh update-core.sh --show` 确认后启动 |
| 装一个自己的 eBPF 分支 | 新增 `CORE_myebpf_*`，加进 `CORE_LIST`，`MODE_CORE_ebpf='myebpf'` | `sh update-core.sh --core myebpf` |
| 只更新官方内核 | 填 `CORE_vanilla_REPO` / `_ASSET` | `sh update-core.sh --core vanilla` |
| 临时装某个具体版本 | 命令行 `--url <地址>` 或 `--version tag --release-tag <标签>` | `sh update-core.sh --core ebpf --url ...` |
| 先看会不会换版本 | 不改 | `sh update-core.sh --core ebpf --dry-run` |
| 想知道某个模式到底用哪个文件 | 不改 | `sh iface-auto.sh --show` |

---

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
| `warn: 内核 x 的文件 y 不存在，退回 vanilla` | 映射的内核还没装 | 先 `sh update-core.sh --core x` |

---

## `iface-auto.sh` 细节

启动前按顺序做这些（都有日志）：

1. 读配置，解析「当前模式 → 内核名 → 文件 → 路径」；
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
sh -n iface-auto.sh && sh -n update-core.sh   # 语法
sh iface-auto.sh --show                       # 配置解析是否正确
sh update-core.sh --show                      # 内核来源与安装状态
sh iface-auto.sh --dry-run                    # 启动前脚本会做什么
sh update-core.sh --core <名字> --dry-run      # 会下载哪个资产
```

`--show` 与 `--dry-run` 都不写盘、不替换、不重启。改动脚本后建议按上面四条顺序验一遍。
