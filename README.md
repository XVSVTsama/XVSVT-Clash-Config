# listener(Tproxy) 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支是同一份脚本的 tproxy 变体：只改与 TPROXY 透明入站相关的部分，其余内容取自 `main`。本分支只保留 `script_override.js` 与 `mihomo.yaml` 两个文件，仓库其余说明（YAML 结构、JS 能力边界、远程地址）见 `main` 分支的 README。

## 与 main 的差别

| 项 | `main`（TUN） | 本分支（tproxy） |
|---|---|---|
| `tun` | 完整 TUN 配置：`device`、`mtu`、`stack`、`route-address`、`route-exclude-address`、`dns-hijack` 等 | `enable: false`，其余 TUN 字段全部删除 |
| 入站 | TUN 设备 | 顶层增加 `tproxy-port: 9898`，内核按该端口建立透明代理入站 |
| `IPv6优先` 开关 | 改核心侧字段与 `tun.inet6-address`、`tun.route-address` | 只改核心侧：`ipv6`、`dns.ipv6`、`fake-ip-range6` |

## 已知约束

- 本分支只提供 `tproxy-port`；把流量送到该端口的 TPROXY / REDIRECT 规则由客户端或系统侧建立，规则缺失时该端口收不到流量。
- `tun` 已停用，`TUN MTU改为9000`、`开启端点独立NAT` 两个开关仍会写 `tun` 字段，但配置里的 `tun` 不启用，开启不产生作用。
- `exclude-uid`、`interface-name` 属于客户端侧数据（应用名单、实际出口网卡），由客户端或生命周期脚本维护，脚本不推导。

## 用法

```text
https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/listener(Tproxy)/script_override.js
```

把该地址作为订阅的覆写脚本加载，网络模式选 tproxy。文件首行的 `Compatible_With_Bettbox` 声明不要删除。

## 维护

`main` 更新后，用 `main` 的 `script_override.js` 与 `mihomo.yaml` 覆盖本分支同名文件，再按上面「与 main 的差别」重放；不要直接 merge `main`，否则会把 TUN 配置一起带回来。
