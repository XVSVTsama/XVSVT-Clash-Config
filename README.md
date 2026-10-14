<p align="center">
  <img src="assets/avatar.png" alt="XVSVTsama" width="120" />
</p>

<h1 align="center">XVSVT's Mihomic Config</h1>

<p align="center">
  <strong>自用</strong> · 路由配置 · 远程覆写脚本
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/XVSVTsama/XVSVT-Clash-Config?style=flat-square&label=License&color=informational" alt="License"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/commits/main"><img src="https://img.shields.io/github/last-commit/XVSVTsama/XVSVT-Clash-Config?style=flat-square&label=Last%20Commit&color=informational" alt="Last Commit"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config"><img src="https://img.shields.io/github/repo-size/XVSVTsama/XVSVT-Clash-Config?style=flat-square&label=Repo%20Size&color=informational" alt="Repo Size"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/stargazers"><img src="https://img.shields.io/github/stars/XVSVTsama/XVSVT-Clash-Config?style=flat-square&label=Stars&color=informational" alt="Stars"></a>
  <a href="https://github.com/XVSVTsama"><img src="https://img.shields.io/badge/XVSVTsama-Homepage-informational?style=flat-square" alt="Homepage"></a>
</p>

<p align="center">
  <a href="mihomo.yaml"><img src="https://img.shields.io/badge/YAML-%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6-yellow?style=flat-square&logo=yaml&logoColor=white" alt="YAML"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/actions/workflows/yaml-syntax.yml"><img src="https://img.shields.io/github/actions/workflow/status/XVSVTsama/XVSVT-Clash-Config/yaml-syntax.yml?style=flat-square&label=YAML%20Syntax&color=informational" alt="YAML Syntax"></a>
  <a href="script_override.js"><img src="https://img.shields.io/badge/JavaScript-%E8%A6%86%E5%86%99%E8%84%9A%E6%9C%AC-yellow?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/actions/workflows/js-syntax.yml"><img src="https://img.shields.io/github/actions/workflow/status/XVSVTsama/XVSVT-Clash-Config/js-syntax.yml?style=flat-square&label=JS%20Syntax&color=informational" alt="JavaScript Syntax"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/actions/workflows/mihomo-check.yml"><img src="https://img.shields.io/github/actions/workflow/status/XVSVTsama/XVSVT-Clash-Config/mihomo-check.yml?style=flat-square&label=Mihomo%20Real%20Core&color=informational" alt="Mihomo Real Core"></a>
</p>

<p align="center">
  <a href="#remote-override">远程覆写地址</a> ·
  <a href="#yaml-config">YAML 模板</a> ·
  <a href="#proxy-groups">分流组结构</a> ·
  <a href="#before-use">使用前必改</a> ·
  <a href="#script-override">覆写脚本</a> ·
  <a href="#dns-model">DNS 联动模型</a> ·
  <a href="#acknowledgments">致谢</a> ·
  <a href="#star-history">Star History</a> ·
  <a href="#disclaimer">免责声明</a>
</p>

---

<a id="remote-override"></a>

## 🔗 远程覆写脚本地址

   默认远程覆写脚本地址（代码块右上角可直接复制）：

```text
https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/main/script_override.js
```

<a id="yaml-config"></a>

## 🧱 YAML 模板（`mihomo.yaml`）

`mihomo.yaml` 是本仓库的基准配置模板，同时也是覆写脚本合并时使用的内嵌模板：一份不含任何节点的完整配置骨架。使用它的方式有两种：

- **直接导入**：把模板导入客户端，节点由 YAML 自己提供——替换 `proxies: ~`，或按需配置 `proxy-providers`；此方式不会从订阅自动导入节点，填写要求见 [使用前必改](#before-use)。
- **配合覆写脚本**：把页首地址挂到订阅上，由脚本把订阅节点与真实配置写进模板，无需手动维护节点列表，见 [覆写脚本](#script-override)。

模板内的主要配置块：

- **`mode` 与端口**：`mode: rule`、`mixed-port` / `port` / `socks-port`、`external-controller` 与 `external-ui`。
- **`tun`**：TUN 入站，含 `device`、`stack`、`dns-hijack` 与 `route-address` 路由范围。
- **`dns` 与顶层 `hosts`**：`proxy-server-nameserver`、`nameserver-policy`、fake-IP filter 与真假 hosts 映射，细节见 [节点域名与 DNS 联动模型](#dns-model)。
- **`sniffer` 与 `ntp`**：域名嗅探与时间同步。
- **`proxy-groups`**：分流组结构，见 [分流组结构](#proxy-groups)。
- **`.templates`、`rule-providers`、`sub-rules`、`rules`**：规则集锚点定义、规则集来源、子规则与主规则表。

<a id="proxy-groups"></a>

## 🗂 分流组结构 (Proxy Groups)

| 策略组名称 | 默认行为 / 触发条件 | 注意事项 |
| :--- | :--- | :--- |
| **🌍 PROXY** | 未命中的所有默认海外流量 | 可选手动、自动或负载均衡 |
| **🔄 负载均衡** | 采用 `sticky-sessions` (粘性会话) 策略 | 保证同一域名短时间内 IP 不变 |
| **👉 手动切换** | 手动选择特定节点 | / |
| **♻️ 自动选择** | `url-test` 自动测试并选择延迟最低的节点 | 容差设置为 50ms |
| **🍎 海外苹果** | 未被前置直连规则匹配的 Apple 域名/IP | `echs_direct` 等通用直连规则优先；可选手动、自动、负载均衡、`DIRECT` 和全部节点 |
| **🌐 海外微软** | 未被前置直连规则匹配的 Microsoft 域名/IP | `echs_direct` 等通用直连规则优先；可选手动、自动、负载均衡、`DIRECT` 和全部节点 |
| **🎮 Steam平台（非下载/CDN）** | Steam 域名/IP 规则 | 默认选择 `DIRECT`；命中前置直连规则的国内游戏/下载会提前直连，`games` 仍走 Games-Global |
| **📲 Telegram** | TGDC 关闭时默认走代理，防止断联 | 匹配进程名与特定 IP 段；开启 TGDC 后更名为 `📲 Telegram(兜底)` |
| **📲 Telegram-DC1-DC3-Miami** | TGDC 开启时，匹配美国/迈阿密节点 | 按 Telegram DC IP 规则优先命中；无地区匹配时列出全部合格节点供手动选择 |
| **📲 Telegram-DC2-DC4-Amsterdam** | TGDC 开启时，匹配荷兰/阿姆斯特丹节点 | 按 Telegram DC IP 规则优先命中；无地区匹配时列出全部合格节点供手动选择 |
| **📲 Telegram-DC5-SG** | TGDC 开启时，匹配新加坡/香港节点 | DC5 实验候选组；无地区匹配时列出全部合格节点供手动选择 |
| **🎮 Games-Global** | 国际服游戏流量 | 嵌套 Steam 组并默认选择它；仍可选择全部订阅节点 |
| **✖️ Twitter** | 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **🤖 AI大模型** | 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **🎵 TikTok** | 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **FCM** | Google FCM 相关域名（`hidden` 隐藏组） | 由 `FCM直连` 开关控制：开启=`DIRECT`；关闭=手动组，手动组禁用时回退到 `🌍 PROXY` 或 `DIRECT` |

> 注：🔄 负载均衡 / 👉 手动切换 / ♻️ 自动选择 / 📲 Telegram 是纯节点占位组；🍎 海外苹果 / 🌐 海外微软 / 🎮 Steam平台（非下载/CDN）/ 🎮 Games-Global 会先保留固定策略项，再由覆写脚本追加订阅全部单节点。不使用脚本时需手动填充节点。

<a id="before-use"></a>

## 🛠️ 使用前必改 (抄作业必看)

本配置按个人使用习惯定制，并非开箱即用的通用模板,尤其是对于直接导入YMAL的使用形式。使用前请完成以下必要设置；如不熟悉 Mihomo、TUN、DNS 或策略组过滤规则，请先了解相关机制再使用。

1. **直接使用 YAML (`mihomo.yaml`)**：不使用 JavaScript 覆写脚本时，在 `mihomo.yaml` 中将 `proxies: ~` 替换为自己的节点列表，或按需配置 `proxy-providers`。此方式由 YAML 文件提供节点，不会从订阅自动导入。
2. **节点过滤规则 (Filter)**：配置默认使用长正则匹配住宅/美国系命名节点（住宅/家宽/家庭宽带/residential/home broadband/🇺🇸/美国/美國/U.S. 等多种命名变体），并排除香港/新加坡相关节点（🇭🇰/香港/Hong Kong/HK/🇸🇬/新加坡/Singapore/SG）。如果订阅节点名称不符合这些条件，可根据实际情况调整相关策略组的 `filter` 正则。
3. **按需删减规则**：如果你不需要屏蔽番茄小说海外版的广告，建议删除 `sub-rules` 中 `fanqie` 相关的规则，以节省性能。

<a id="script-override"></a>

## ⚙️ 覆写脚本（`script_override.js`）

覆写脚本会把订阅配置与本仓库维护的内嵌模板合并成最终配置，脚本地址见页首 [远程覆写脚本地址](#remote-override)。在 Bettbox / FlClash 系客户端中给订阅挂上该脚本即可：

- 订阅里的真实节点自动填入 `proxies` 与纯单节点占位组（👉 手动切换、♻️ 自动选择、🔄 负载均衡、📲 Telegram）；🍎 海外苹果、🌐 海外微软、🎮 Steam平台（非下载/CDN）、🎮 Games-Global 则保留固定策略项并追加订阅单节点；
- 订阅自带的 `proxy-providers` 会被原样保留；
- 动态合并 DNS 的 `proxy-server-nameserver-policy`（以脚本为准，模板不预置该键）；
- 可通过脚本顶部 `ruleOptionsEnable` 开关单独禁用策略组，并自动清理相关引用。
- 🍎 海外苹果 / 🌐 海外微软：不再单独引用 `apple@cn`、`microsoft@cn`、`games-cn`；国内分类直连交由 `echs_direct` 维护，现有通用直连规则优先匹配，剩余 Apple、Microsoft 域名/IP 分别进入独立组，组内提供手动切换、自动选择、负载均衡、`DIRECT` 和全部订阅单节点。UDP 豁免中原 `games-cn` 引用同步改为 `echs_direct`。
- 🎮 Steam平台（非下载/CDN）：Steam 域名/IP 规则进入独立组，默认选择 `DIRECT`；命中前置 `echs_direct` 等直连规则的国内游戏/下载会提前直连，`games` 仍进入 🎮 Games-Global。Games 组嵌套该 Steam 组，并通过 `default-selected` 默认选择它，同时保留全部订阅节点。
- `FCM直连` 功能开关：默认开启，隐藏组 FCM 仅含 `DIRECT`；关闭后优先使用 `👉 手动切换`，若该策略组已关闭则回退到 `🌍 PROXY`，若该组也已关闭则回退到 `DIRECT`（不移除 FCM 组）。
- `TGDC实验分流` 功能开关：默认关闭。开启后，脚本会把 Telegram 流量按 IP 规则优先分到 `📲 Telegram-DC1-DC3-Miami`、`📲 Telegram-DC2-DC4-Amsterdam` 和 `📲 Telegram-DC5-SG` 三个实验组；其中 DC5 组同时匹配新加坡与香港节点，因为两地均可作为该 DC 的互联候选。三个实验组使用 `include-all-proxies` 加名称过滤，分别匹配美国/迈阿密、荷兰/阿姆斯特丹、新加坡/香港等节点名称。若某个实验组没有匹配地区节点，脚本会把订阅中全部合格节点（仅排除异常、内置/拒绝/重匹配和提示信息节点；免费、低倍率、高倍率节点不再排除）显式列入该组供手动选择，`empty-fallback` 为 `COMPATIBLE`。开启后，原 `📲 Telegram` 组更名为 `📲 Telegram(兜底)`，原 Telegram 进程、域名和 CIDR 规则统一指向该组，实验性 DC/地区 IP 规则则优先插入。关闭时不注入实验组、规则集或规则，原 Telegram 配置保持不变。
- `入口解析` 功能开关：默认关闭；开启后会将电信、联通、移动三个入口节点全部加入 `国内入口解析` 代理组，由用户在该组中手动选择实际使用的入口节点，并为最终节点解析 DNS 应用所选入口。三者没有脚本自动优先级；配置中的排列顺序不代表自动切换或优先选用。该功能会引入有时效性的国内公共节点，属于实验性能力，仅供测试使用。
- 脚本首行为 Bettbox 兼容声明（`Compatible_With_Bettbox`）：Bettbox 客户端约定在脚本开头识别该声明（并非全量读取），脚本需遵循此约定，声明必须保持置顶，否则"自定义规则开关"入口不显示。
- `policyGroupOptions`：`Compatible_With_Bettbox` 声明中的字段，声明了归入 Bettbox 策略组开关分类的 12 个策略组（🌍 PROXY、🔄 负载均衡、👉 手动切换、♻️ 自动选择、📲 Telegram、🎮 Games-Global、🍎 海外苹果、🌐 海外微软、🎮 Steam平台（非下载/CDN）、✖️ Twitter、🤖 AI大模型、🎵 TikTok）。

<a id="dns-model"></a>

## 🌐 节点域名与 DNS 联动模型

[<kbd>在线阅读：节点域名、Hosts 与私有 DNS 联动模型</kbd>](https://XVSVTsama.github.io/XVSVT-Clash-Config/proxy-infrastructure-domain-protection-model.html)

> 本文档拆解了配置中 `hosts` 真假映射、私有 DoH 解析、DNS policy 与 fake-IP filter 的各自职责，以及四者如何在同一条节点解析链路里协同生效。它面向想要编写或理解节点解析覆写脚本的人，不包含任何真实节点、密码、UUID 或订阅凭据。

---

<a id="acknowledgments"></a>

## 🙏 致谢

本项目建立在开源内核、客户端、规则集与图标资源之上。以下列出本项目使用或参考的相关项目；引用或参考不代表这些项目与本仓库存在合作或背书关系。具体资源请以各上游项目的说明和许可为准。

### 内核与客户端

- [Mihomo](https://github.com/MetaCubeX/mihomo)
- [Bettbox](https://github.com/appshubcc/Bettbox)
- [FlClash](https://github.com/chen08209/FlClash)

### 规则集作者与原项目

- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)
- [DustinWin/ruleset_geodata](https://github.com/DustinWin/ruleset_geodata)
- [echs-top/proxy](https://github.com/echs-top/proxy)
- [appshubcc/bett-rules](https://github.com/appshubcc/bett-rules)
- [reddishJade/private_proxy](https://github.com/reddishJade/private_proxy)
- [Accademia/Additional_Rule_For_Clash](https://github.com/Accademia/Additional_Rule_For_Clash)
- [Loyalsoldier/clash-rules](https://github.com/Loyalsoldier/clash-rules)（曾引用）
- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)（曾引用）

### 图标作者与原项目

- [Koolson/Qure](https://github.com/Koolson/Qure) 与 [MiToverG422/Qure](https://github.com/MiToverG422/Qure)
- [DustinWin/ruleset_geodata](https://github.com/DustinWin/ruleset_geodata)
- [AIsouler/MyClash](https://github.com/AIsouler/MyClash)
- [Clash Verge](https://www.clashverge.dev/)
- 荷兰国旗图标由本项目自行绘制，并托管于 [`assets/icons/self-Netherlands.png`](assets/icons/self-Netherlands.png)。

图标副本统一托管在 `assets/icons/` 并通过 jsDelivr 引用。

### 脚本与配置参考

- [AIsouler/MyClash](https://github.com/AIsouler/MyClash)
- [echs-top/proxy](https://github.com/echs-top/proxy)
- [HenryChiao/MIHOMO_YAMLS](https://github.com/HenryChiao/MIHOMO_YAMLS)

以上参考均用于学习与对照，具体实现以本仓库代码为准。

<a id="star-history"></a>

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=XVSVTsama/XVSVT-Clash-Config&type=Date)](https://star-history.com/#XVSVTsama/XVSVT-Clash-Config&Date)

<a id="disclaimer"></a>

## ⚠️ 免责声明

1. 本仓库的YAML模板与JS脚本设计并非完美，或可能有代码质量问题，也不一定适合所有环境，尤其是 DNS 与路由规则。
2. 使用者应自行评估使用、修改或传播本仓库内容所涉及的风险，并遵守所在地区适用的法律法规。因使用本仓库内容产生的后果，由使用者自行承担。
