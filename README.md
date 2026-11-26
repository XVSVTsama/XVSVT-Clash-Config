# BoxProxy 生命周期脚本

`iface-auto.sh` 是 BoxProxy 在服务启动前（`BOX_EVENT=pre-start`）以 root 执行的脚本，把「本次网络模式」翻译成内核、覆写脚本、网卡与转发规则的具体取值。本分支只保留这一个文件，不含覆写脚本本身；脚本改写的 `tun-我的.js`、`tproxy-我的.js`、`ebpf-我的.js` 属于客户端目录，与仓库其它分支的 `script_override.js` 没有直接关系。

默认不会关闭任何应用：只有当启动配置里要用的端口确实被第三方应用占着时，才停掉那个应用。

## 放到哪里

```text
$BOX_HOME/scripts/iface-auto.sh          # 默认 $BOX_HOME=/data/user/0/com.boxproxy.box/files/box
chmod 755 iface-auto.sh
```

在 App 里把它登记为「服务启动前脚本」即可（`app_settings.shell_scripts_pre_start`）。

## 它做什么

| 步骤 | 行为 |
|---|---|
| 识别模式 | `BOX_MODE` → `run/state/runs.log` 里的「网络模式 X」或「模式 X」→ `BOX_PROXY_MODE` 兜底；都没有则记为 `unknown` |
| 选内核 | `ebpf` 模式用 `bin/core-ebpf`，其余用 `bin/core-vanilla`，用 `ln -f` 挂到 `bin/mihomo`；两份都保留，原版不被覆盖 |
| 选覆写脚本 | 清单 `run/state/config/mihomo-scripts.yaml` 里的模式脚本（`tun-我的.js` / `tproxy-我的.js` / `ebpf-我的.js`）换成当前模式那一份并去重；清单里没有这类模式脚本（用户自定义）时不动 |
| 识别出口网卡 | `BOX_NETWORK_IFACE` → `ip route get 1.1.1.1` → 默认路由；过滤 `lo` 与 tun、tap、meta、clash、wg、ppp、ipsec、dummy 类接口 |
| 识别下联网卡 | 按 `dumpsys tethering` 的 `tetherableWifiRegexs` 找出候选接口，要求接口实际存在且带 IPv4 地址；排除出口网卡、dummy 与隧道。`TETHERED` 记录描述的是被共享的上游，不能当下联（Wi-Fi 客户端模式下会把上游 wlan 误判成热点） |
| 写 TUN 网卡 | `tun` 与 `unknown` 模式下把出口网卡写进覆写脚本的 `interface-name`，值不变就不写 |
| 写 eBPF 下联 | 把所有含 `EBPF_SHARED_IFACE_SPEC` 的脚本改成下联网卡（逗号分隔）；没有下联时创建空转 dummy（默认 `boxebpf0`）写进去 |
| 放行转发 | 为每个下联接口在 `FORWARD` 链头插入入向与出向各一条 ACCEPT |
| 端口冲突 | 从 `startup-config` 读出核心要用的端口（`mixed-port`、`port`、`socks-port`、`redir-port`、`tproxy-port`、`external-controller`、`dns.listen`），用 `ss` 找到占用者：系统进程、本应用、查不到包名的一律不动，只有确认是第三方包时才 `am force-stop`，停完复检端口 |
| 额外停包（可选） | `BOX_STOP_PACKAGES` 里的包无条件 `am force-stop`，默认空 |

所有写盘操作都是「值变了才写」，重复执行没有副作用；末尾固定输出一行 `pre-start done mode=… core=… upstream=… downstream=…` 到日志。

## 用法

```sh
sh iface-auto.sh            # 正常执行（由 boxctl 调用，一般不用手动跑）
sh iface-auto.sh --dry-run  # 只打印将要做的改动，不写盘、不动 iptables
sh iface-auto.sh -h         # 帮助
```

## 代码结构

脚本按执行顺序分九段，每段只做一件事，函数名即职责：

| 段 | 函数 | 作用 |
|---|---|---|
| 0 参数 | `parse_args` / `usage` | 解析 `--dry-run`、`--verbose`、`-h`；帮助文本直接从文件头注释生成 |
| 1 运行环境 | `init_runtime` | 读取并落定所有路径、默认值与环境变量 |
| 2 日志与包装 | `log` / `run` / `write_text` / `dir_owner` | 统一日志、dry-run 下的命令与写文件拦截、目录属主查询 |
| 3 运行环境探测 | `resolve_js_dir` / `detect_mode` | 定位覆写脚本目录；按 `BOX_MODE` → `runs.log` → `BOX_PROXY_MODE` 定模式 |
| 4 内核 | `select_core` | 按模式选 `core-ebpf` / `core-vanilla`，`ln -f` 挂到 `bin/mihomo` |
| 5 脚本清单 | `mode_script_name` / `rewrite_manifest` / `commit_manifest` / `select_script` | 把清单里的模式脚本换成当前模式那一份并去重 |
| 6 网卡 | `is_tunnel_iface` / `detect_upstream` / `detect_downstream` / `add_downstream` / `tetherable_pattern` / `ensure_dummy_iface` | 识别出口与下联，无下联时补 dummy |
| 7 写入字段 | `update_interface_name` / `update_ebpf_shared_iface` | 把网卡名写进覆写脚本的两个字段，值不变就不写 |
| 8 转发与进程 | `allow_forward` / `config_ports` / `port_owner_pid` / `resolve_package` / `stop_port_conflicts` / `stop_packages` | 为下联放行 `FORWARD`；端口冲突检测与停包 |
| 9 入口与汇总 | `describe_core` / `main` | 反查当前内核，串起流程并输出一行汇总日志 |

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `BOX_HOME` / `BOX_BASE` | `/data/user/0/com.boxproxy.box/files/box` | Box 工作目录 |
| `BOX_RUN_DIR` | `$BOX_BASE/run` | 运行目录（读 `runs.log`、写清单） |
| `BOX_JS_SCRIPTS_DIR` | `$BOX_BASE/mihomo/scripts` | 覆写脚本目录 |
| `BOX_PRE_LOG` | `/data/local/tmp/prestart.log` | 日志文件 |
| `BOX_EBPF_DUMMY` | `boxebpf0` | eBPF 无下联时的占位网卡名 |
| `BOX_CORE_VANILLA` | `$BOX_BASE/bin/core-vanilla` | 原版内核路径 |
| `BOX_CORE_EBPF` | `$BOX_BASE/bin/core-ebpf` | eBPF 内核路径 |
| `BOX_CORE_LINK` | `$BOX_BASE/bin/mihomo` | 内核入口路径（被硬链接指向当前该用的那份） |
| `BOX_NETWORK_IFACE` | 空 | 强制指定出口网卡；留空时按路由推断 |
| `BOX_CONFLICT_STOP` | `auto` | 端口冲突处理：`auto` 停掉占用端口的第三方包，`log` 只记日志，`off` 不检测 |
| `BOX_SELF_PACKAGE` | `com.boxproxy.box` | 本应用包名，永远不会被停 |
| `BOX_STOP_PACKAGES` | 空 | 额外无条件停止的包名，空格分隔；设成 `none` 表示不停 |

boxctl 会自带 `BOX_HOME`、`BOX_RUN_DIR`、`BOX_SCRIPTS_DIR`、`BOX_MODE` 等变量，脚本优先按这些变量取值；其中 `BOX_SCRIPTS_DIR` 指向的是生命周期脚本目录本身，不是覆写脚本目录，所以脚本用「目录里有没有 `.js`」来判断，不盲信这个变量。

## 已知边界

- 只在 Android（root）上验证；下联依赖 `dumpsys tethering` 的 `tetherableWifiRegexs`，取不到时退回内置正则（`wlan0`、`softap0`、`ap_br_wlan0` 等）。
- 下联必须带 IPv4 地址才会被认作热点：AP 起好后才会有地址，未启用的接口因此被跳过；纯 IPv6 共享场景会识别不到下联。
- 内核切换依赖 `core-vanilla` / `core-ebpf` 两份文件存在；不存在时跳过，只在日志里留一行。
- dummy 网卡只在 `ebpf` 与 `unknown` 模式下创建，其它模式没有下联也不建。
- 环境里没有 UID、网卡名、密钥之类的具体值；`exclude-uid` 由 boxctl 按 App 内的应用选择注入。
- 端口冲突检测依赖 `ss -lntup` 与 `pm list packages -U`：`ss` 没有输出、或占用的 uid 查不到包名时只记一条日志，不会停止任何东西。
- 正常启动流程里 boxctl 先停核心再跑本脚本，端口一般是空的；若这时仍有本应用的内核占着端口，`auto` 模式下会先结束它（`log` / `off` 模式只记录）。

## 维护

脚本只依赖 busybox / toybox 的常见命令（`ip`、`iptables`、`stat`、`awk`、`sed`、`cmp`、`dumpsys`、`am`）。改动后先 `sh -n iface-auto.sh` 做语法检查，再用 `--dry-run` 在真机跑一遍确认路径与识别结果。
