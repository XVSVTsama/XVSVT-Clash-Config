# 完整配置实例：一份几乎不用写的配置

这篇配两份可以照抄的文件，用来说明「哪些必须写、哪些全走默认」。

- `box-auto.full-example.conf` —— 自动部分（启动前挂内核）
- `box-update.full-example.conf` —— 手动部分（下载内核）

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
MODE_CORE_ebpf='ebpf'
```

其余全是默认：

| 模式 | 默认内核 | 默认文件 |
|---|---|---|
| `ebpf` | `ebpf`（就是上面那行） | `bin/core-ebpf` |
| `tun` / `tproxy` / `redirect` / `mixed` / `enhance` / `unknown` | `vanilla` | `bin/core-vanilla` |

文件名也默认是 `core-<名字>`，所以不用写 `CORE_ebpf_FILE`。
`DUMMY_IFACE`、`CONFLICT_STOP`、`STOP_PACKAGES`、`EXTRA_PORTS` 都有默认值，只在需要调整时才写。

启动时的链条：

```
BoxProxy 记下本次网络模式（例如 ebpf）
        ↓
iface-auto.sh 读 MODE_CORE_ebpf → 'ebpf'
        ↓
文件名默认 core-ebpf → bin/core-ebpf
        ↓
存在且可执行 → ln -f bin/core-ebpf bin/mihomo
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
| `ebpf` | `prerelease` | `*android-arm64*ebpf*.gz` |
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
MODE_CORE_ebpf='vanilla'

# box-update.conf
CORE_vanilla_REPO='<owner>/<repo>'
```

### 变体 2：两个 eBPF 构建对比

```sh
# box-auto.conf
MODE_CORE_ebpf='ebpf_b'
CORE_ebpf_a_FILE='core-ebpf-a'
CORE_ebpf_b_FILE='core-ebpf-b'

# box-update.conf
CORE_ebpf_a_REPO='<owner-a>/<repo>'
CORE_ebpf_b_REPO='<owner-b>/<repo>'
```

文件名默认是 `core-<名字>`（名字里只用字母、数字、下划线），想自定义就写 `_FILE`。
改 `MODE_CORE_ebpf` 再启动即可在两者间切换。

### 变体 3：离线，只装本地文件

```sh
# box-update.conf
CORE_ebpf_URL='file:///sdcard/Download/core-ebpf.gz'
```

填了 `URL` 就不查仓库。装完一样走校验与配置检查。

---

## 五、用起来：复制改名 → 编辑 → 点运行

1. 文件管理器进 `scripts/`，把两份 `.full-example.conf` 各复制一份，改名为
   `box-auto.conf`、`box-update.conf`。
2. 文本编辑器打开 `box-update.conf`，把 `<owner>/<repo>` 换成你的仓库。
3. `工具 → 脚本` → 运行 `update-core.sh`。
4. 首页选 eBPF 模式 → 启动。

| 想做的事 | 改哪里 | 之后 |
|---|---|---|
| 装/升级内核 | `box-update.conf` 的 `REPO` | 点一次 `update-core.sh` |
| 换 eBPF 用的内核 | `box-auto.conf` 的 `MODE_CORE_ebpf` | 启动 |
| 只看配置解析 | 不改 | 点一次 `show-config.sh` |
| 校验已装内核 | 不改 | 点一次 `check-core.sh` |

---

## 六、最容易错的四处

| 现象 | 原因 | 修法 |
|---|---|---|
| `没有匹配 ... 的资产` | 自己写了 `ASSET` 且写死了版本号/哈希 | 删掉那行用默认，或只保留固定部分、把会变的换成 `*` |
| `配置错误：MODE_CORE_ebpf 指向的内核 'x' 不在 CORE_LIST 里` | 映射写了名字，但两份配置都没定义这个内核 | 在 `box-update.conf` 写 `CORE_x_REPO`，或在 `box-auto.conf` 写 `CORE_x_FILE` |
| `warn: 内核 x 的文件 core-x 不存在` | 还没装 | 填好 `CORE_x_REPO` 后点一次 `update-core.sh` |
| `新内核不接受当前启动配置` | 内核与配置不匹配（如官方版当 eBPF 用） | 没动任何文件，换回正确分支 |

---

## 七、设计取舍

- **默认值优先**：能推断的都不写进配置（文件名、版本策略、资产名、模式映射、行为开关）。
- **名字即键**：`MODE_CORE_ebpf='ebpf'` 指向名为 `ebpf` 的内核，这个内核的文件与来源分别由两份配置里的 `CORE_ebpf_*` 决定；`CORE_LIST` 由脚本自动扫描得到，不需要维护。
- **两部分各管一段**：自动部分不知道任何下载地址，手动部分不决定谁用哪个内核。
