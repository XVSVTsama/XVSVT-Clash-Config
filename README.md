# no-tun 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支只放完全不用 TUN 的那份差异。背景：不少软件会强制覆写 `tun`，模板再写一份只会互相打架，干脆不带。

## 与 main 的差别

- `tun` 整段删除：模板不定义 `tun`，脚本以模板为主体生成配置，订阅自带的 `tun` 也不会被保留，输出配置完全不带 `tun` 字段，TUN 交给强制覆写它的软件自己处理
- 与 TUN 绑定的开关一并移除：`TUN MTU改为9000`、`开启端点独立NAT`（开关定义、图标、开关组条目与生效逻辑全清）
- IPv6 开关只处理核心侧（`ipv6`、`dns.ipv6`、`fake-ip-range6`）：没有 tun，也就没有 `inet6-address` 和 v6 路由可改
- 流量入站靠模板已有的 `mixed-port` / `socks-port`；其余内容（节点处理、策略组、DNS、规则、其他自定义开关）与 `main` 完全一致

## 用法

把 `script_override.js` 作为客户端的覆写脚本加载，配合会自行接管 TUN 的软件使用；也可以直接导入 `mihomo.yaml`。

## 维护

`main` 更新后，重新取 `main` 的 `script_override.js` 与 `mihomo.yaml` 覆盖本分支文件，再按上面四条重放差异；不要直接 merge `main`。
