# not-any-listener 覆写脚本（派生自 main）

本分支从 `main` 派生，移除与 TUN 相关的内容；其余说明见 `main` 分支 README。本分支只保留 `script_override.js` 与 `mihomo.yaml` 两个文件。

## 与 main 的差别

| 项 | `main`（TUN） | 本分支（移除 TUN 相关内容） |
|---|---|---|
| TUN 配置 | 保留完整配置 | 移除 |
| `IPv6优先` 开关 | 改核心侧字段与 `tun.inet6-address`、`tun.route-address` | 只改核心侧：`ipv6`、`dns.ipv6`、`fake-ip-range6` |

## 已知约束

- 脚本以模板为主体生成配置，模板没有 `tun`，订阅自带的 `tun` 也不会被保留。
- 本分支不建立任何入站：TUN、TPROXY、eBPF 都要由客户端或其它组件提供，否则生成的配置没有入站。

## 用法

```text
https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/not-any-listener/script_override.js
```

把该地址作为订阅的覆写脚本加载，入站交给客户端或其它组件。文件首行的 `Compatible_With_Bettbox` 声明不要删除。

## 维护

`main` 更新后，用 `main` 的 `script_override.js` 与 `mihomo.yaml` 覆盖本分支同名文件，再按上面「与 main 的差别」重放；不要直接 merge `main`，否则会把 TUN 配置一起带回来。
