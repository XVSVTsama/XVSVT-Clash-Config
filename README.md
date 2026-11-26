# eBPF 覆写脚本（派生自 main）

`main` 是 TUN 版；本分支只改与 eBPF 透明入站相关的部分，其余内容取自 `main`。预留段与国内 IP 由内核放行表处理，命中的流量不进用户态。本分支只保留 `script_override.js` 与 `mihomo.yaml`，仓库其余说明（YAML 结构、JS 能力边界、远程地址）见 `main` 的 README。

## 与 main 的差别

| 项 | `main`（TUN） | 本分支（eBPF） |
|---|---|---|
| `tun` | 完整 TUN 配置 | `enable: false`，其余 TUN 字段全部删除 |
| 入站 | TUN 设备 | 顶层 `listeners` 加一项 `name: ebpf-in`、`type: ebpf`：`local` 走 cgroup，`shared` 走 packet_rewrite |
| 内网与预留段 | `route-exclude-address` 列私网、CGNAT、组播与保留段 | `bypass-private-address: true` 放行私网；`0.0.0.0/8`、`224.0.0.0/4`、`240.0.0.0/4`、`ff00::/8` 由内核内置的强制放行处理 |
| 国内 IP | 规则段用 `RULE-SET,echs_direct_ip,DIRECT,no-resolve` 匹配 | `listeners.bypass-rule-set` 引用 `echs_direct_ip`，命中的目标在内核直接放行；规则段那条与 `sniffer.skip-dst-address` 里的 `rule-set:echs_direct_ip` 一并删除 |
| `使用AIsouler直连规则` | 国内直连规则集换成 AIsouler 那套 | 同样替换，并把内核放行集换成 `cn_ip`，两层用同一套表 |
| fake-ip ICMP | 由核心处理 | `fakeip-icmp: reply`：发往 fake-ip 的 ICMP Echo 在内核应答 |
| DNS 劫持 | `tun.dns-hijack` 接管 `any:53` | 两个角色的 `dns-mode` 都是 `respect_policy`：先按 UID／来源策略判断，再决定是否劫持 |
| 共享下联 | 无 | 常量 `EBPF_SHARED_IFACE_SPEC` 记录下联网卡，`applyEbpfListener()` 写进 `shared.interface`；没有下联时用空转 dummy 占位 |
| `IPv6优先` | 改核心侧字段与 `tun.inet6-address`、`tun.route-address` | 改核心侧 `ipv6`、`dns.ipv6`、`fake-ip-range6`，并把两个角色的 `ipv6` 一起切 |
| `enable` / `exclude-uid` | 由客户端注入 `tun` 的同名字段 | 同样由客户端注入：`applyEbpfListener()` 删掉 `mode` 与角色上的 `enable`，避免与客户端注入的 `local.enable` / `shared.enable` 冲突 |
| `TUN MTU改为9000`、`开启端点独立NAT` | 两个开关 | 移除：两者只改 `tun` 字段，而 `tun` 已停用 |

## 字段来源

`type: ebpf` 不是 mihomo 主线的能力，主线内核遇到该类型会报 `unsupport proxy type: ebpf`：

| 角色 | 仓库 |
|---|---|
| 字段 schema、实际适配的内核 | [liuran001/mihomo](https://github.com/liuran001/mihomo)：`docs/ebpf-inbound.md`，构建产物 `alpha-<sha>-ebpf` |
| 实现上游 | [TanakaLun/mihomo](https://github.com/TanakaLun/mihomo)：`ebpf-inbound` 分支，代码在 `listener/sing_ebpf` |
| 数据面库 | [CHIZI-0618/sing-ebpf](https://github.com/CHIZI-0618/sing-ebpf)：cgroup 与 TC 程序、map、能力探测与回滚 |

## 已知约束

- `mode` 与 `local.enable` / `shared.enable` 只能二选一，同时写会被内核拒绝。
- `shared.enable: true` 时 `shared.interface` 必须非空且不含 `lo`；`shared` 关闭时不能保留 `dns-mode`、`ipv6`、`bypass-private-address`、`interface`。
- `bypass-rule-set` 只认 `behavior: ipcidr` 的规则集；顶层列表对所有角色生效，角色级列表只追加该角色。shared 的放行列表在空与非空之间变化时需要重建 inbound；规则集内容更新不用重载。
- `fakeip-icmp: reply` 需要一个 TC 承载：`local.data-plane: tc`，或启用 shared。手机本机流量走 cgroup，看不到 ICMP，本机 ping fake-ip 仍然超时。
- `shared.data-plane: socket_assign` 需要内核支持 `bpf_sk_assign`（Linux 5.7+ 或厂商回移），否则用默认的 `packet_rewrite`。
- `enable` 与 `exclude-uid` 由客户端注入；纯 mihomo 环境要自己补，否则监听不会启用。
- 放行发生在规则之前：命中放行表的目标不再经过任何规则，`REJECT` 类规则（`HijackingPlus`、`SKK` 的 reject 规则集等）对它们无效，这些连接也不进连接列表与流量统计；走 fake-ip 的流程不受影响，fake-ip 段本身始终强制拦截。
- 换回主线内核时，`listeners` 里的 eBPF 项必须一起去掉，否则核心起不来。

## 用法

```text
https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/01-ebpf/script_override.js
```

把该地址作为订阅的覆写脚本加载，网络模式选 eBPF，内核用上表中的 `-ebpf` 构建。文件首行的 `Compatible_With_Bettbox` 声明不要删除。

## 维护

`main` 更新后，用 `main` 的 `script_override.js` 与 `mihomo.yaml` 覆盖本分支同名文件，再按上面「与 main 的差别」重放；不要直接 merge `main`，否则会把 TUN 配置一起带回来。
