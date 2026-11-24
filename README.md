# eBPF 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支只放 eBPF 透明入站需要的那份差异。

## 与 main 的差别

- `tun` 收敛为 `{ "enable": false }`：eBPF 在 cgroup / TC 层接管，不用 TUN 设备
- 新增 `listeners`：`name: ebpf-in`、`type: ebpf`，`local` 走 cgroup、`shared` 走 packet_rewrite
- 顶层新增 `const EBPF_SHARED_IFACE_SPEC`：下联网卡占位值，由客户端生命周期脚本在启动前改写（没有下联时挂一个空转 dummy 网卡）
- `applyEbpfListener()` 在 `main()` 里调用：把占位值填进 `shared.interface`，并删掉 `mode` / `enable`——两者与 boxctl 注入的 `enable`、`exclude-uid` 互斥，同时写会报 `mode cannot be combined with local.enable or shared.enable`
- IPv6 开关只处理核心侧（`ipv6`、`dns.ipv6`、`fake-ip-range6`），同 tproxy 分支

需要盒子侧（boxctl 之类）在 eBPF 模式下注入 `enable` 与 `exclude-uid`；纯 mihomo 环境要自己把这两个字段补进 `local` / `shared`，否则监听不会启用。

## 用法

把 `script_override.js` 作为客户端的覆写脚本加载，网络模式选 eBPF。

## 维护

`main` 更新后，重新取 `main` 的 `script_override.js` 覆盖本文件，再按上面五条重放差异；不要直接 merge `main`。
