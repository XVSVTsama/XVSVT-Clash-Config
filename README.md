# BoxProxy 生命周期脚本

`iface-auto.sh` 是 BoxProxy 在服务启动前（`BOX_EVENT=pre-start`）以 root 执行的脚本，把「本次网络模式」翻译成内核、覆写脚本、网卡与转发规则的具体取值。本分支只保留这一个文件，不含覆写脚本本身；脚本改写的 `tun-我的.js`、`tproxy-我的.js`、`ebpf-我的.js` 属于客户端目录，与仓库其它分支的 `script_override.js` 没有直接关系。

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
| 识别下联网卡 | `dumpsys tethering` 的 `TETHERED` 记录 → 任意 `iface=xxx` → `tetherableWifiRegexs` 兜底；排除出口网卡与 dummy，且接口必须实际存在 |
| 写 TUN 网卡 | `tun` 与 `unknown` 模式下把出口网卡写进覆写脚本的 `interface-name`，值不变就不写 |
| 写 eBPF 下联 | 把所有含 `EBPF_SHARED_IFACE_SPEC` 的脚本改成下联网卡（逗号分隔）；没有下联时创建空转 dummy（默认 `boxebpf0`）写进去 |
| 放行转发 | 为每个下联接口在 `FORWARD` 链头插入入向与出向各一条 ACCEPT |
| 停包（可选） | `BOX_STOP_PACKAGES` 里正在运行的包先 `am force-stop`，用于避免抢端口 |

所有写盘操作都是「值变了才写」，重复执行没有副作用；末尾固定输出一行 `pre-start done mode=… core=… upstream=… downstream=…` 到日志。

## 用法

```sh
sh iface-auto.sh            # 正常执行（由 boxctl 调用，一般不用手动跑）
sh iface-auto.sh --dry-run  # 只打印将要做的改动，不写盘、不动 iptables
sh iface-auto.sh -h         # 帮助
```

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
| `BOX_STOP_PACKAGES` | 空 | 启动前要强制停止的包名，空格分隔 |

boxctl 会自带 `BOX_HOME`、`BOX_RUN_DIR`、`BOX_SCRIPTS_DIR`、`BOX_MODE` 等变量，脚本优先按这些变量取值；其中 `BOX_SCRIPTS_DIR` 指向的是生命周期脚本目录本身，不是覆写脚本目录，所以脚本用「目录里有没有 `.js`」来判断，不盲信这个变量。

## 已知边界

- 只在 Android（root）上验证；`dumpsys tethering` 的输出格式各 ROM 不同，脚本用三级回退兼容。
- 内核切换依赖 `core-vanilla` / `core-ebpf` 两份文件存在；不存在时跳过，只在日志里留一行。
- dummy 网卡只在 `ebpf` 与 `unknown` 模式下创建，其它模式没有下联也不建。
- 环境里没有 UID、网卡名、密钥之类的具体值；`exclude-uid` 由 boxctl 按 App 内的应用选择注入。

## 维护

脚本只依赖 busybox / toybox 的常见命令（`ip`、`iptables`、`stat`、`awk`、`sed`、`cmp`、`dumpsys`、`am`）。改动后先 `sh -n iface-auto.sh` 做语法检查，再用 `--dry-run` 在真机跑一遍确认路径与识别结果。
