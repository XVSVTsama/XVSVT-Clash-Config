# tproxy 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支只放 tproxy 模式需要的那份差异。

## 与 main 的差别

- `tun` 收敛为 `{ "enable": false }`：不建 TUN 设备，入站交给内核 TPROXY 规则
- 顶层新增 `"tproxy-port": 9898`：mihomo 用它创建透明代理入站；boxctl 读到源码里有这个键就不再注入默认值
- IPv6 开关只处理核心侧（`ipv6`、`dns.ipv6`、`fake-ip-range6`）：没有 tun，也就没有 `inet6-address` 和 v6 路由可改
- 其余内容（节点处理、策略组、DNS、规则、自定义开关）与 `main` 完全一致

`exclude-uid`、`interface-name` 这类字段属于客户端侧数据（应用名单、实际出口网卡），由客户端或生命周期脚本维护，不在脚本里推导。

## 用法

把 `script_override.js` 作为客户端的覆写脚本加载，网络模式选 tproxy。

## 维护

`main` 更新后，重新取 `main` 的 `script_override.js` 覆盖本文件，再按上面四条重放差异；不要直接 merge `main`。
