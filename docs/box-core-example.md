# 完整配置实例：一份几乎不用写的配置

这篇配两份可以照抄的文件，用来说明「哪些必须写、哪些全走默认」。

- `box-auto.conf` —— 自动部分（启动前挂内核，默认全注释 = 内置规则）
- `box-update.conf` —— 手动部分（下载来源，已填好默认两个仓库）

两份文件加起来，真正需要你改的只有 **2 行**。

---

## 一、场景

| 项 | 取值 |
|---|---|
| 设备 | Android + root，BoxProxy 正常安装 |
| 主要用途 | eBPF 模式，用自己编译的分支 |
| 其它模式 | TUN / TPROXY / Redirect 一律用官方 mihomo |

---

## 二、自动部分只有一行

```sh
RULES='
mode=ebpf => ebpf
always    => vanilla
'
```

其余全是默认：

| 模式 | 默认内核 | 默认文件 |
|---|---|---|
| `ebpf` | `ebpf`（就是上面那行） | `bin/ebpf-我的` |
| `tun` / `tproxy` / `redirect` / `mixed` / `enhance` / `unknown` | `vanilla` | `bin/vanilla-我的` |

文件名也默认是 `<名字>-我的`，所以不用写 `CORE_ebpf_FILE`。
`DUMMY_IFACE`、`CONFLICT_STOP`、`STOP_PACKAGES`、`EXTRA_PORTS` 都有默认值，只在需要调整时才写。

启动时的链条：

```
BoxProxy 记下本次网络模式（例如 ebpf）
        ↓
iface-auto.sh 按规则表求值：mode=ebpf 命中 → 内核 ebpf
        ↓
文件名默认 ebpf-我的 → bin/ebpf-我的
        ↓
存在且可执行 → ln -f bin/ebpf-我的 bin/mihomo
        ↓
boxctl 用 bin/mihomo 启动核心
```

文件不存在时只记一条 warn，提示你去装，不会联网。

---

## 三、手动部分只有仓库这一件必填

```sh
CORE_ebpf_REPO='<owner>/<repo>'
CORE_vanilla_REPO='<owner>/<repo>'    # 想要官方版才填
```

版本策略与资产名按内核名给默认值：

| 内核 | 默认 `VERSION` | 默认 `ASSET` |
|---|---|---|
| `ebpf`（本仓库配置里显式写了） | `prerelease` | `*android-arm64*ebpf*.gz` |
| 其它（含 `vanilla`） | `latest` | `*android-arm64*.gz` |

所以正常情况你不需要写 `ASSET`、`VERSION`、`CORE_LIST`、`CORE_DEFAULT`——这些已经从配置项里删掉了。

`update-core.sh` 点一次运行，会把**所有填了仓库（或 URL）的内核**都装一遍：

```
配了 ebpf + vanilla → 两个都装
只配了 ebpf        → 只装 ebpf
```

装完只有当前模式用到的那个才挂到 `bin/mihomo` 并重启，其它内核下次启动自然生效。

---

## 四、三种变体

### 变体 1：只用官方内核

```sh
# box-auto.conf
RULES='
mode=ebpf => vanilla
always    => vanilla
'

# box-update.conf
CORE_vanilla_REPO='<owner>/<repo>'
```

### 变体 2：两个 eBPF 构建对比

```sh
# box-auto.conf
RULES='
mode=ebpf => ebpf_b
always    => vanilla
'
CORE_ebpf_a_FILE='ebpf-a-我的'
CORE_ebpf_b_FILE='ebpf-b-我的'

# box-update.conf
CORE_ebpf_a_REPO='<owner-a>/<repo>'
CORE_ebpf_b_REPO='<owner-b>/<repo>'
```

文件名默认是 `<名字>-我的`（名字里只用字母、数字、下划线），想自定义就写 `_FILE`。
改 `RULES` 里 `mode=ebpf` 那行的目标内核，再启动即可切换。

### 变体 3：规则式选择（多条件 + 次选）

需要「按条件切换、候选内核一个个试」时，用 `RULES` 代替映射：

```sh
# box-auto.conf
CORE_alpha_FILE='core-alpha'
RULES='
mode=ebpf and installed=ebpf   => ebpf, alpha
tethering=on                   => alpha, ebpf
js=ebpf-我的.js                 => ebpf
always                         => vanilla
'
```

求值顺序：自上而下第一条命中的生效；命中后按候选顺序试，第一个可用的胜出；
整条规则的候选都不可用 → 直接退出（不退回映射表）。`js=` 不满足时也直接退出。
`always` 恒真、`never` 恒假，适合当兜底。

逗号是简写：

```sh
mode=tun, mode=tproxy => alpha      # = mode=tun => alpha 和 mode=tproxy => alpha
mode=ebpf            => ghost, alpha # = mode=ebpf => ghost 和 mode=ebpf => alpha（顺序试）
```

### 变体 4：离线，只装本地文件

```sh
# box-update.conf
CORE_ebpf_URL='file:///sdcard/Download/ebpf-我的.gz'
```

填了 `URL` 就不查仓库。装完一样走校验与配置检查。

---

## 五、用起来：复制改名 → 编辑 → 点运行

1. 两份配置文件已经随脚本放进 `scripts/`，不需要复制改名。
2. 文本编辑器打开 `box-update.conf`，把 `<owner>/<repo>` 换成你的仓库。
3. `工具 → 脚本` → 运行 `update-core.sh`。
4. 首页选 eBPF 模式 → 启动。

| 想做的事 | 改哪里 | 之后 |
|---|---|---|
| 装/升级内核 | `box-update.conf` 的 `REPO` | 点一次 `update-core.sh` |
| 换 eBPF 用的内核 | `box-auto.conf` 的 `RULES` 对应行 | 启动 |
| 只看配置解析 | 不改 | 点一次 `show-config.sh` |
| 校验已装内核 | 不改 | 点一次 `check-core.sh` |

---

## 六、最容易错的四处

| 现象 | 原因 | 修法 |
|---|---|---|
| `没有匹配 ... 的资产` | 自己写了 `ASSET` 且写死了版本号/哈希 | 删掉那行用默认，或只保留固定部分、把会变的换成 `*` |
| `错误: 规则表没有命中任何一条` | 规则没写兜底 | 在 `RULES` 最后加 `always => <默认内核>` |
| `warn: 内核 x 的文件 core-x 不存在` | 还没装 | 填好 `CORE_x_REPO` 后点一次 `update-core.sh` |
| `新内核不接受当前启动配置` | 内核与配置不匹配（如官方版当 eBPF 用） | 没动任何文件，换回正确分支 |

---

## 七、设计取舍

- **默认值优先，但不预设习惯**：文件名、版本策略、资产名用通用默认（`latest` + `*android-arm64*.gz`）；具体分支要用预发布或特殊资产名，就在 `box-update.conf` 里写明；选哪个内核一律由 `RULES` 决定。
- **名字即键**：规则里的 `=> ebpf` 指向名为 `ebpf` 的内核，它的文件与来源分别由两份配置里的 `CORE_ebpf_*` 决定；`CORE_LIST` 由脚本自动扫描得到，不需要维护。
- **两部分各管一段**：自动部分不知道任何下载地址，手动部分不决定谁用哪个内核。
