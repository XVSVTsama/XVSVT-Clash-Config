# 完整配置实例：一台手机，eBPF 用自己的内核

这篇文档配一份可以照着抄的完整配置，用来研究 `box-auto.conf` / `box-update.conf` 各字段之间怎么咬合。文件本体在仓库根目录：`box-auto.full-example.conf / box-update.full-example.conf`。

读完你应该能回答三个问题：

1. 我用 eBPF 模式时，实际跑的是哪个文件？
2. 点更新时，脚本会去哪个仓库、挑哪个资产、写到哪？
3. 我想换内核，需要改哪几行？

---

## 一、这份配置假设的场景

| 项 | 取值 |
|---|---|
| 设备 | Android + root，BoxProxy 正常安装 |
| 主要用途 | eBPF 模式，用**自己编译的分支**，跟着预发布滚动更新 |
| 其它模式 | TUN / TPROXY / Redirect 等一律用**官方 mihomo 稳定版** |
| 备用 | 再放一个 `spare` 内核，用来试用别的构建或临时对比 |

对应到配置里就是三块：**内核清单**（有哪些内核、各自从哪来）、**模式映射**（哪个入站用哪个）、**行为开关**（启动前脚本怎么干）。

---

## 二、内核清单：名字、文件、来源

```sh
CORE_LIST='ebpf vanilla spare'
CORE_DEFAULT='ebpf'

CORE_ebpf_FILE='core-ebpf'
CORE_ebpf_REPO='<owner>/<repo>'
CORE_ebpf_ASSET='*android-arm64*ebpf*.gz'
CORE_ebpf_VERSION='prerelease'
CORE_ebpf_TAG='-ebpf'
```

一次读三行就够了：

- `CORE_ebpf_FILE` → 文件落在 `bin/core-ebpf`，这是**“下载的内核叫什么、放哪”**的唯一答案；
- `CORE_ebpf_REPO` + `CORE_ebpf_ASSET` → **去哪拿**。资产名匹配用 `*`，别把版本号或哈希写死，否则永远匹配不到新版本；
- `CORE_ebpf_VERSION` → **拿哪个发布**：`latest` 只认正式版，`prerelease` 连预发布一起看，`tag` 固定某个标签。

`CORE_ebpf_TAG='-ebpf'` 是道保险：新内核执行 `-v` 后输出里必须出现 `-ebpf`，防止仓库把别的构建挂到同一个资产名下。官方内核一般不需要这一项。

三个内核的差异只在这几行：

| 内核 | 文件 | 版本策略 | 用途 |
|---|---|---|---|
| `ebpf` | `core-ebpf` | `prerelease` | 自己构建，跟着滚动更新 |
| `vanilla` | `core-vanilla` | `latest` | 官方稳定版，其余模式用 |
| `spare` | `core-spare` | `tag` | 固定标签，手动装，做对比用 |

> `spare` 没被任何模式引用，所以 `iface-auto.sh` 永远不会挂它——它只是躺在 `bin/` 里，你想对比时把 `MODE_CORE_ebpf` 临时指过去即可。

---

## 三、模式映射：脚本到底怎么选内核

```sh
MODE_CORE_ebpf='ebpf'
MODE_CORE_tun='vanilla'
MODE_CORE_tproxy='vanilla'
MODE_CORE_redirect='vanilla'
MODE_CORE_mixed='vanilla'
MODE_CORE_enhance='vanilla'
MODE_CORE_unknown='vanilla'
```

启动时的执行链条：

```
BoxProxy 记下本次网络模式（例如 ebpf）
        ↓
iface-auto.sh 读 MODE_CORE_ebpf → 'ebpf'
        ↓
读 CORE_ebpf_FILE → 'core-ebpf'
        ↓
拼出路径 bin/core-ebpf，存在且可执行
        ↓
ln -f bin/core-ebpf bin/mihomo
        ↓
boxctl 用 bin/mihomo 启动核心
```

想验证这条链，不需要启动服务：

```sh
sh iface-auto.sh show
```

输出里 `ebpf → ebpf  .../bin/core-ebpf` 就是这条链的最终结果；如果这行不是你要的，改配置而不是改脚本。

`MODE_CORE_unknown` 值得单独说：模式识别失败时（例如 `runs.log` 被清空）会落到这里，配成 `vanilla` 更保守，至少不会把一个缺文件的内核挂上去。

---

## 四、行为开关：启动前脚本的副作用

| 字段 | 本实例取值 | 为什么 |
|---|---|---|
| `DUMMY_IFACE` | `boxebpf0` | eBPF 没开热点时需要一个占位网卡，`shared.interface` 不能为空 |
| `CONFLICT_STOP` | `auto` | 端口被别的代理 App 占住时，只有确实冲突才停它 |
| `STOP_PACKAGES` | 空 | 不做无条件停包；要停谁由端口冲突自己判断 |
| `EXTRA_PORTS` | 空 | 只检查启动配置里声明的端口 |

如果你同时装了第二个代理客户端、且它固定占用同一个端口，把包名填进 `STOP_PACKAGES` 就不会每次等冲突检测；但更推荐留空，让「有冲突才停」这套逻辑自己工作。

---

## 五、三种常见变体

### 变体 1：只用一个官方内核

```sh
CORE_LIST='vanilla'
CORE_DEFAULT='vanilla'
CORE_vanilla_REPO='<owner>/<repo>'
MODE_CORE_tun='vanilla'
MODE_CORE_tproxy='vanilla'
MODE_CORE_ebpf='vanilla'      # eBPF 模式也用官方版（需要该构建支持 listeners）
```

特点：文件只有 `bin/core-vanilla`，所有模式共用。适合先跑通再折腾分支。

### 变体 2：两个 eBPF 构建，切换对比

```sh
CORE_LIST='ebpf_a ebpf_b'
CORE_ebpf_a_FILE='core-ebpf-a'
CORE_ebpf_a_REPO='<owner-a>/<repo>'
CORE_ebpf_a_ASSET='*android-arm64*ebpf*.gz'
CORE_ebpf_a_VERSION='prerelease'

CORE_ebpf_b_FILE='core-ebpf-b'
CORE_ebpf_b_REPO='<owner-b>/<repo>'
CORE_ebpf_b_ASSET='*android-arm64*ebpf*.gz'
CORE_ebpf_b_VERSION='latest'
```

切换方式：把 `MODE_CORE_ebpf` 改成 `ebpf_a` 或 `ebpf_b`，重启服务。两个文件互不覆盖，随时能换回来。

> 内核名只能用字母、数字、下划线（所以是 `ebpf_a`，不是 `ebpf-a`）；文件名不受这个限制，可以带 `-`。

### 变体 3：内网/离线，只装本地文件

```sh
CORE_ebpf_URL='file:///sdcard/Download/core-ebpf.gz'
```

`URL` 一填就不再查仓库。适合先把包下载到手机、或用别的机器传过来。

---

## 六、用起来：复制改名 → 编辑 → 点运行

不需要敲命令，全部在文件管理器和 App 里完成：

1. 在 `scripts/` 里把两份模板各复制一份并改名：
   - `box-auto.full-example.conf` → `box-auto.conf`
   - `box-update.full-example.conf` → `box-update.conf`
2. 用文本编辑器打开 `box-update.conf`，把这些占位符换成你的仓库（其余保持不动）。
3. `工具 → 脚本` → 运行 `update-core.sh`，它装 `CORE_DEFAULT` 指向的那个内核。
4. 首页选 eBPF 模式 → 启动。启动前只会把已装好的 `core-ebpf` 挂到 `bin/mihomo`，不联网。

| 想做的事 | 改哪个文件 | 之后 |
|---|---|---|
| 装/升级 eBPF 内核 | `box-update.conf` 填好 `REPO`，`CORE_DEFAULT='ebpf'` | 点一次 `update-core.sh` |
| 装官方内核 | 把 `CORE_DEFAULT` 改成 `vanilla` | 点一次 `update-core.sh` |
| 装备用内核 | 把 `CORE_DEFAULT` 改成 `spare` | 点一次 `update-core.sh` |
| 只看配置解析 | 不改 | 点一次 `show-config.sh` |
| 校验已装内核 | 不改 | 点一次 `check-core.sh` |

装/更新内部的顺序是固定的：解析来源 → 下载 → SHA-256 → 解包 → `-v` 自检 → `-t` 检查当前启动配置 → 备份并替换 → 当前模式用到它才重启。任何一步失败都不会留下半成品：首次安装失败不会写入，升级失败会回滚到备份。

---

## 七、这套配置里最容易错的四处

| 现象 | 原因 | 修法 |
|---|---|---|
| `没有匹配 '...' 的资产` | `ASSET` 里写死了版本号或哈希 | 只保留稳定部分，把会变的换成 `*` |
| `配置错误：MODE_CORE_ebpf 指向的内核 'ebpf' 不在 CORE_LIST 里` | 新增了内核但没加进 `CORE_LIST` | 把名字加进去 |
| `配置错误：CORE_ebpf_FILE 只能写文件名` | 文件字段里带了 `bin/` 前缀 | 只写 `core-ebpf` |
| `warn: 内核 ebpf 的文件 core-ebpf 不存在，退回 vanilla` | 还没装就先把模式指过去了 | 直接启动一次，会自动安装；装不上再看日志里的来源报错 |

---

## 八、设计取舍（为什么不用一个“万能脚本”）

- **脚本固化、配置外置**：升级脚本不会覆盖你的参数，反之改参数也不会碰脚本逻辑。
- **名字与文件分离**：`ebpf` 是给人看的标签，`core-ebpf` 是给系统看的路径；换构建只改仓库/资产，不动映射。
- **只挂被用到的内核**：`spare` 这种备胎不会污染 `bin/mihomo`，也不参与启动。
- **默认值兜底**：不建 `box-auto.conf` / `box-update.conf` 时，行为和旧版一致（`ebpf` → `core-ebpf`，其余 → `core-vanilla`），所以升级脚本本身是安全的。
