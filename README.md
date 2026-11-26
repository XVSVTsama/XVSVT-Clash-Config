# no-tun 覆写脚本（派生自 main）

`main` 分支是 TUN 版脚本，本分支只放不用 TUN 需要的那份差异。

## 与 main 的差别

- `tun` 整段删除：模板不定义 `tun`，脚本以模板为主体生成配置，订阅自带的 `tun` 也不会被保留，生成的配置完全不带 `tun` 字段
- `TUN MTU改为9000`、`开启端点独立NAT` 两个开关移除：两者作用的都是 `tun` 字段，没有 tun 也就没有作用对象
- IPv6 开关只处理核心侧（`ipv6`、`dns.ipv6`、`fake-ip-range6`）：没有 tun，也就没有 `inet6-address` 和 v6 路由可改
- 其余内容（节点处理、策略组、DNS、规则、自定义开关）与 `main` 完全一致

## 用法

把 `script_override.js` 作为客户端的覆写脚本加载，TUN 由其他软件接管。

## 维护

`main` 更新后，重新取 `main` 的 `script_override.js` 与 `mihomo.yaml` 覆盖本分支文件，再按上面四条重放差异；不要直接 merge `main`。
