# BoxProxy 内核脚本

让 BoxProxy 每次启动前自动换上你要的内核：**eBPF 模式用你自己的构建，其它模式用官方 mihomo**。装内核、换内核都在 App 里点一下，不用敲命令。

## 初次安装：四步

1. **放文件**
   把 `iface-auto.sh`、`update-core.sh`、`show-config.sh`、`box-auto.conf`、`box-update.conf` 和整个 `lib/` 文件夹一起复制到
   `/data/user/0/com.boxproxy.box/files/box/scripts/`
   （BoxProxy → `工具 → 文件管理` 能直接进这个目录。）
2. **登记启动前脚本**
   在 BoxProxy 设置里把 `iface-auto.sh` 选为「服务启动前脚本」。另一个脚本不用登记。
3. **装内核**
   `工具 → 脚本` → 运行 `update-core.sh`。它会把配置里填了来源的内核全部装一遍，不需要参数。
4. **启动**
   首页选网络模式 → 启动。

以后升级内核：再点一次 `update-core.sh`。

## 两个配置文件

| 文件 | 管什么 | 要不要改 |
|---|---|---|
| `box-update.conf` | 内核从哪个仓库下载 | 看一眼 `CORE_ebpf_REPO` 是不是你想用的分支 |
| `box-auto.conf` | 哪个网络模式用哪个内核 | 一般不用改 |

`box-auto.conf` 默认内容：

```sh
RULES='
mode=ebpf => ebpf
always    => vanilla
'
```

读法：eBPF 模式用 `ebpf`（文件 `bin/ebpf-我的`），其它模式用 `vanilla`（文件 `bin/vanilla-我的`）。想让 eBPF 也用官方内核，就把第一行改成 `mode=ebpf => vanilla`。

## 两个按钮

| 脚本 | 干什么 | 联网 |
|---|---|---|
| `update-core.sh` | 装 / 升级内核 | 会 |
| `show-config.sh` | 看配置解析成什么、内核装没装 | 不会 |

启动前 `iface-auto.sh` 自动做的事：按规则选内核 → 复制成 `bin/mihomo` → 切换覆写脚本 → 认网卡 → 端口冲突检查。全程不联网，缺内核只会报错提示，不会自己去下载。

## 出错了看这里

| 看到 | 怎么办 |
|---|---|
| `规则表没有命中任何一条` | 在 `RULES` 最后加一行 `always => vanilla` |
| `候选内核都不可用` / `规则表要求的内核不可用` | 内核还没装，点一次 `update-core.sh` |
| `没有匹配 '...' 的资产` | `ASSET` 里写死了版本号，把会变的部分换成 `*` |
| `查询失败` / `HTTP 403` | 网络不通或 GitHub 限流，稍后再点一次 |
| `新内核不接受当前启动配置` | 内核和配置不匹配（例如官方版拿去跑 eBPF）；没动任何文件，换回原来的内核 |
| `新内核已写入，但服务没能起来` | 这个内核和本机不合；把 `box-update.conf` 的来源换成别的版本再点一次 |

配置细节见 [docs/box-core-example.md](docs/box-core-example.md)。

<details>
<summary>进阶参考（不装内核可以不看）</summary>

### 规则表能写什么

条件之间用 `and` / `or` / `not`（或 `!`）和括号组合，优先级 括号 > not > and > or。自上而下求值，第一条命中的生效。

| 写法 | 含义 |
|---|---|
| `mode=ebpf` / `mode!=tun` / `mode~pro` | 当前网络模式 |
| `js=ebpf-我的.js` | 该覆写脚本已启用（清单里没有则看文件是否存在） |
| `conf~关键字` | `boxctl status` 输出或启动配置里出现该关键字 |
| `tethering=on` / `off` | 是否开着热点 / 共享 |
| `installed=ebpf` | 内核文件存在且可执行 |
| `exists=ebpf-我的` | `bin/` 下有这个文件 |
| `env=NAME:值` | 运行时环境变量等于某值 |
| `always` / `never` | 恒真 / 恒假，常用作兜底 |

`=>` 右边可以写多个候选，按顺序试，第一个可用的胜出；整条规则都不可用就退出，不回退。逗号是简写：`A, B => X` 等于两条规则；`X => B, C` 等于按顺序试两个候选。

### 高级项（都有默认值）

`box-auto.conf`：

```sh
# DUMMY_IFACE='boxebpf0'     # eBPF 没开热点时的空转网卡
# CONFLICT_STOP='auto'       # auto 停掉占端口的应用 | log 只记 | off 不查
# STOP_PACKAGES=''           # 额外无条件停的包
# EXTRA_PORTS=''             # 额外检查冲突的端口
# FALLBACK_CORE='vanilla'    # 兜底内核：选中它时 App 自己装的 bin/mihomo 不覆盖
# CORE_mycore_FILE='core-mycore'  # 自定义文件名，默认是 <名字>-我的
```

`box-update.conf`：

```sh
# CORE_ebpf_VERSION='prerelease'
# CORE_ebpf_ASSET='*android-arm64*ebpf*.gz'
# CORE_ebpf_TAG='-ebpf'      # -v 输出必须含这个串
# CORE_ebpf_URL=''           # 固定地址或 file://，填了就不查仓库
# CORE_ebpf_SHA256=''        # 仓库带 digest 时自动用
# API_BASE='https://api.github.com'
# DOWNLOAD_PREFIX=''         # 镜像前缀
# TOKEN=''                   # GitHub Token，等同账号凭据，别提交
```

规则选中 `FALLBACK_CORE`（默认 `vanilla`）时，如果 `bin/mihomo` 是 App 自己装的，脚本不覆盖；只有它本是脚本装过的别内核时才换回来。选中 `ebpf` 这类自定义内核才覆盖，用独立副本 `cp`，不留备份文件。

### 命令行等价操作

```sh
sh show-config.sh                         # = 点 show-config.sh
sh update-core.sh                         # 装所有配了来源的内核
sh update-core.sh --core <名字>           # 临时装别的内核，不改配置
sh iface-auto.sh --dry-run                # 预览启动前会做什么
sh update-core.sh --core <名字> --dry-run # 只看会下载哪个资产
```

`show-config.sh` 与 `--dry-run` 都不写盘、不替换、不重启。

</details>
