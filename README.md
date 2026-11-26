# no-tun 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支是同一份脚本的 no-tun 变体：只删掉与 TUN 相关的部分，其余内容取自 `main`。本分支只保留 `script_override.js` 与 `mihomo.yaml` 两个文件，仓库其余说明（YAML 结构、JS 能力边界、远程地址）见 `main` 分支的 README。

## 与 main 的差别

| 项 | `main`（TUN） | 本分支（no-tun） |
|---|---|---|
| `tun` | 完整 TUN 配置：`device`、`mtu`、`stack`、`route-address`、`route-exclude-address`、`dns-hijack` 等 | 模板不定义 `tun`，生成的配置不含任何 `tun` 字段 |
| `TUN MTU改为9000`、`开启端点独立NAT` | 两个开关 | 移除：两者只改 `tun` 字段，没有 `tun` 就没有作用对象 |
| `IPv6优先` 开关 | 改核心侧字段与 `tun.inet6-address`、`tun.route-address` | 只改核心侧：`ipv6`、`dns.ipv6`、`fake-ip-range6` |

## 已知约束

- 脚本以模板为主体生成配置，模板没有 `tun`，订阅自带的 `tun` 也不会被保留。
- 本分支不建立任何入站：TUN、TPROXY、eBPF 都要由客户端或其它组件提供，否则生成的配置没有入站。

## 用法

```text
https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/03-no-tun/script_override.js
```

把该地址作为订阅的覆写脚本加载，入站交给客户端或其它组件。文件首行的 `Compatible_With_Bettbox` 声明不要删除。

## 维护

`main` 更新后，用 `main` 的 `script_override.js` 与 `mihomo.yaml` 覆盖本分支同名文件，再按上面「与 main 的差别」重放；不要直接 merge `main`，否则会把 TUN 配置一起带回来。
