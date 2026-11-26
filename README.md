# eBPF 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支是同一份脚本的 eBPF 变体：只改与 eBPF 透明入站相关的部分，其余内容取自 `main`。预留段与国内 IP 由内核放行表处理，命中的流量不进用户态。本分支只保留 `script_override.js` 与 `mihomo.yaml` 两个文件，仓库其余说明（YAML 结构、JS 能力边界、远程地址）见 `main` 分支的 README。

## 与 main 的差别

| 项 | `main`（TUN） | 本分支（eBPF） |
|---|---|---|
| `tun` | 完整 TUN 配置：`device`、`mtu`、`stack`、`route-address`、`route-exclude-address`、`dns-hijack` 等 | `enable: false`，其余 TUN 字段全部删除 |
| 入站 | TUN 设备 | 顶层 `listeners` 增加一项 `name: ebpf-in`、`type: ebpf`：`local` 走 cgroup，`shared` 走 packet_rewrite |
| 内核放行 | 规则段用 `RULE-SET,echs_direct_ip,DIRECT,no-resolve` 匹配国内 IP | `listeners.bypass-rule-set` 引用 `ebpf_bypass_ip`（`0.0.0.0/8`、`224.0.0.0/4`、`240.0.0.0/4`、`ff00::/8`）与 `echs_direct_ip`：命中的目标在内核直接放行，`rules` 里那条 `RULE-SET,echs_direct_ip,DIRECT,no-resolve` 与 `sniffer.skip-dst-address` 里的 `rule-set:echs_direct_ip` 一并删除 |
| fake-ip ICMP | 由核心处理 | `fakeip-icmp: reply`：发往 fake-ip 的 ICMP Echo 在内核应答，不到核心 |
| DNS 劫持 | 由 `tun.dns-hijack` 接管 `any:53` | `local` 与 `shared` 的 `dns-mode` 都是 `respect_policy`：先按各自的 UID／来源策略判断，再决定是否劫持 |
| 共享下联 | 无 | 顶层常量 `EBPF_SHARED_IFACE_SPEC` 记录下联网卡，`main()` 里的 `applyEbpfListener()` 把它写进 `shared.interface`；没有下联时用空转 dummy 网卡占位 |
| `enable` / `exclude-uid` | 由客户端注入 `tun` 的同名字段 | 同样由客户端（例如 BoxProxy 的 boxctl）注入：`applyEbpfListener()` 删掉 `mode` 与两个角色上的 `enable`，避免与客户端注入的 `local.enable` / `shared.enable` 冲突 |
| `IPv6优先` 开关 | 改核心侧字段与 `tun.inet6-address`、`tun.route-address` | 只改核心侧：`ipv6`、`dns.ipv6`、`fake-ip-range6` |

## 字段来源

`type: ebpf` 不是 mihomo 主线的能力，主线内核遇到该类型会报 `unsupport proxy type: ebpf`。字段写法与可运行的内核取自同一份实现：

| 角色 | 仓库 |
|---|---|
| 字段 schema、实际适配的内核 | [liuran001/mihomo](https://github.com/liuran001/mihomo)：`docs/ebpf-inbound.md` 定义字段，构建产物为 `alpha-<sha>-ebpf` |
| 实现上游 | [TanakaLun/mihomo](https://github.com/TanakaLun/mihomo)：`ebpf-inbound` 分支，代码在 `listener/sing_ebpf` |
| 数据面库 | [CHIZI-0618/sing-ebpf](https://github.com/CHIZI-0618/sing-ebpf)：cgroup 与 TC 程序、map、能力探测与回滚 |

## 已知约束

- `mode` 与 `local.enable` / `shared.enable` 只能二选一，同时写会被内核以 `mode cannot be combined with local.enable or shared.enable` 拒绝。
- `shared.enable: true` 时 `shared.interface` 必须非空且不含 `lo`；`shared` 关闭时不能保留 `dns-mode`、`ipv6`、`bypass-private-address`、`interface`。
- `bypass-rule-set` 只认 `behavior: ipcidr` 的规则集：顶层列表对所有角色生效，`local.` / `shared.` 下的同名列表只对该角色追加。shared 的放行列表在空与非空之间变化、或两个角色从共用一套规则集改为各用一套，都需要重建 inbound 才生效。
- 放行规则集的内容更新不用重载：listener 每次重编译按名字重新读取规则集。
- `fakeip-icmp: reply` 至少需要一个 TC 承载：`local.data-plane: tc`，或启用 shared（任一数据面）。`local.data-plane: cgroup` 且不启用 shared 时会被拒绝。
- `shared.data-plane: socket_assign` 需要内核支持 `bpf_sk_assign`（Linux 5.7+ 或厂商回移），否则用默认的 `packet_rewrite`。
- `enable` 与 `exclude-uid` 由客户端注入；直接在纯 mihomo 环境加载本脚本时，这两个字段要自己补，否则监听不会启用。
- 换回主线内核时，`listeners` 里的 eBPF 项必须一起去掉，否则核心起不来。

## 用法

```text
https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/ebpf/script_override.js
```

把该地址作为订阅的覆写脚本加载，网络模式选 eBPF，内核用上表中的 `-ebpf` 构建。文件首行的 `Compatible_With_Bettbox` 声明不要删除。

## 维护

`main` 更新后，用 `main` 的 `script_override.js` 与 `mihomo.yaml` 覆盖本分支同名文件，再按上面「与 main 的差别」重放；不要直接 merge `main`，否则会把 TUN 配置一起带回来。
