# eBPF 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支只放 eBPF 透明入站需要的那份差异。

## 配置来源与适配内核

`listeners` 里 `type: ebpf` 的字段（`mode`、`network`、`udp-timeout`、`tc-priority`、`bypass-*`、`local`、`shared` 等）不是 mihomo 主线的能力，来源与适配关系如下：

| 角色 | 仓库 | 说明 |
|---|---|---|
| 字段 schema + 实际适配内核 | [liuran001/mihomo](https://github.com/liuran001/mihomo) | 文档 `docs/ebpf-inbound.md`；本分支按这份 schema 写。实际运行的是该仓库的 `-ebpf` 构建（`alpha-smart-<sha>-ebpf`），主线 `MetaCubeX/mihomo` 收到 `type: ebpf` 会报 `unsupport proxy type: ebpf` |
| 实现上游 | [TanakaLun/mihomo](https://github.com/TanakaLun/mihomo) | `ebpf-inbound` 分支，CI 产物在 `automation/ebpf-*` 分支，代码在 `listener/sing_ebpf` |
| 数据面库 | [CHIZI-0618/sing-ebpf](https://github.com/CHIZI-0618/sing-ebpf) | cgroup / TC 的程序、map、能力探测与回滚都在这个库里 |

所以：**配置写法看 liuran001 的文档，二进制用 liuran001 的 `-ebpf` 构建**；换回主线内核时这段 `listeners` 必须一起去掉，否则核心起不来。

## 与 main 的差别

- `tun` 收敛为 `{ "enable": false }`：eBPF 在 cgroup / TC 层接管，不用 TUN 设备
- 新增 `listeners`：`name: ebpf-in`、`type: ebpf`，`local` 走 cgroup、`shared` 走 packet_rewrite
- 顶层新增 `const EBPF_SHARED_IFACE_SPEC`：下联网卡占位值，由客户端生命周期脚本在启动前改写（没有下联时挂一个空转 dummy 网卡）
- `applyEbpfListener()` 在 `main()` 里调用：把占位值填进 `shared.interface`，并删掉 `mode` / `enable`——两者与客户端注入的 `enable`、`exclude-uid` 互斥，同时写会报 `mode cannot be combined with local.enable or shared.enable`
- IPv6 开关只处理核心侧（`ipv6`、`dns.ipv6`、`fake-ip-range6`），同 tproxy 分支

## 已知约束（来自 schema 与实测）

- `mode` 与 `local.enable` / `shared.enable` 只能二选一
- `shared.enable: true` 时 `shared.interface` 必须非空且不含 `lo`；`shared` 关闭时不能残留 `dns-mode` / `ipv6` / `bypass-private-address` / `interface`
- `shared.data-plane: socket_assign` 需要内核有 `bpf_sk_assign`（Linux 5.7+ 或厂商回移），否则用默认的 `packet_rewrite`
- 本机内核 6.1：`local.data-plane: cgroup` 与 `shared` 挂 dummy 网卡都实测可用
- `enable` 与 `exclude-uid` 需要客户端（boxctl 之类）注入；纯 mihomo 环境要自己补进 `local` / `shared`，否则监听不会启用

## 用法

把 `script_override.js` 作为客户端的覆写脚本加载，网络模式选 eBPF，内核用上面提到的 `-ebpf` 构建。

## 维护

`main` 更新后，重新取 `main` 的 `script_override.js` 覆盖本文件，再按上面五条重放差异；不要直接 merge `main`。
