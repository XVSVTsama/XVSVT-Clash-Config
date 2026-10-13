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
  <a href="https://github.com/MetaCubeX/mihomo"><img src="https://img.shields.io/badge/Mihomo-Rule--based_Tunnel-000000?style=flat-square" alt="Mihomo"></a>
  <a href="https://github.com/MetaCubeX/mihomo"><img src="https://img.shields.io/badge/Mihomo_Core-Client_or_Server-000000?style=flat-square" alt="Mihomo Core"></a>
  <a href="https://github.com/appshubcc/Bettbox"><img src="https://img.shields.io/badge/Bettbox-Client/GUI-000000?style=flat-square" alt="Bettbox"></a>
  <a href="https://github.com/chen08209/FlClash"><img src="https://img.shields.io/badge/FlClash-Client/GUI-000000?style=flat-square" alt="FlClash"></a>
</p>

<p align="center">
  <a href="mihomo.yaml"><img src="https://img.shields.io/badge/YAML-%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6-yellow?style=flat-square&logo=yaml&logoColor=white" alt="YAML"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/actions/workflows/yaml-syntax.yml"><img src="https://img.shields.io/github/actions/workflow/status/XVSVTsama/XVSVT-Clash-Config/yaml-syntax.yml?style=flat-square&label=YAML%20Syntax&color=informational" alt="YAML Syntax"></a>
  <a href="script_override.js"><img src="https://img.shields.io/badge/JavaScript-%E8%A6%86%E5%86%99%E8%84%9A%E6%9C%AC-yellow?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/actions/workflows/js-syntax.yml"><img src="https://img.shields.io/github/actions/workflow/status/XVSVTsama/XVSVT-Clash-Config/js-syntax.yml?style=flat-square&label=JS%20Syntax&color=informational" alt="JavaScript Syntax"></a>
  <a href="https://github.com/XVSVTsama/XVSVT-Clash-Config/actions/workflows/mihomo-check.yml"><img src="https://img.shields.io/github/actions/workflow/status/XVSVTsama/XVSVT-Clash-Config/mihomo-check.yml?style=flat-square&label=Mihomo%20Real%20Core&color=informational" alt="Mihomo Real Core"></a>
</p>

<p align="center">
  <a href="#remote-override">远程覆写js</a> ·
  <a href="#proxy-groups">分流组结构</a> ·
  <a href="#before-use">使用前必改</a> ·
  <a href="#acknowledgments">致谢</a> ·
  <a href="#star-history">Star History</a> ·
  <a href="#disclaimer">免责声明</a>
</p>

---

> ⚠️ **避坑指南 & 核心声明**
> 本仓库提供的是一份**高度贴合个人使用习惯**的 Mihomo (原 Clash Meta) [路由配置文件](https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/main/mihomo.yaml)。
> 它**不是**一份开箱即用的通用傻瓜式模板。如果您不熟悉 Mihomo 的核心机制、TUN 模式、Fake-IP 以及策略组正则表达式（filter），请**谨慎照搬**。抄作业前，请务必阅读下方说明！

<a id="remote-override"></a>

## 远程覆写js

   默认远程覆写脚本地址（代码块右上角可直接复制）：

```text
https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/main/script_override.js
```

   在 Bettbox / FlClash 系客户端中给订阅挂上该脚本即可：
   - 订阅里的真实节点自动填入 `proxies` 与纯单节点占位组（👉 手动切换、♻️ 自动选择、🔄 负载均衡、📲 Telegram、🎮 Games-Global）；🍎 海外苹果、🌐 海外微软、🎮 Steam平台（非下载/CDN）则保留固定策略项并追加订阅单节点；
   - 订阅自带的 `proxy-providers` 会被原样保留；
   - 动态合并 DNS 的 `proxy-server-nameserver-policy`（以脚本为准，模板不预置该键）；
   - 可通过脚本顶部 `ruleOptionsEnable` 开关单独禁用策略组，并自动清理相关引用。
   - 🍎 海外苹果 / 🌐 海外微软：国内 Apple、Microsoft 规则强制 `DIRECT`；海外域名/IP 分别进入独立组，组内提供手动切换、自动选择、负载均衡、`DIRECT` 和全部订阅单节点。
   - 🎮 Steam平台（非下载/CDN）：Steam 域名/IP 规则进入独立组，默认选择 `DIRECT`；`games-cn` 仍直连，`games` 仍进入 🎮 Games-Global。
   - `FCM直连` 功能开关：默认开启，隐藏组 FCM 仅含 `DIRECT`；关闭后优先使用 `👉 手动切换`，若该策略组已关闭则回退到 `🌍 PROXY`，若该组也已关闭则回退到 `DIRECT`（不移除 FCM 组）。
   - `TGDC实验分流` 功能开关：默认关闭。开启后，脚本会把 Telegram 流量按 IP 规则优先分到 `📲 Telegram-DC1-DC3-Miami`、`📲 Telegram-DC2-DC4-Amsterdam` 和 `📲 Telegram-DC5-SG` 三个实验组；其中 DC5 组同时匹配新加坡与香港节点，因为两地均可作为该 DC 的互联候选。三个实验组使用 `include-all-proxies` 加名称过滤，分别匹配美国/迈阿密、荷兰/阿姆斯特丹、新加坡/香港等节点名称。若某个实验组没有匹配地区节点，脚本会把订阅中全部合格节点（仅排除异常、内置/拒绝/重匹配和提示信息节点；免费、低倍率、高倍率节点不再排除）显式列入该组供手动选择，`empty-fallback` 为 `COMPATIBLE`。开启后，原 `📲 Telegram` 组更名为 `📲 Telegram(兜底)`，原 Telegram 进程、域名和 CIDR 规则统一指向该组，实验性 DC/地区 IP 规则则优先插入。关闭时不注入实验组、规则集或规则，原 Telegram 配置保持不变。
   - `入口解析` 功能开关：默认关闭；开启后会将电信、联通、移动三个入口节点全部加入 `国内入口解析` 代理组，由用户在该组中手动选择实际使用的入口节点，并为最终节点解析 DNS 应用所选入口。三者没有脚本自动优先级；配置中的排列顺序不代表自动切换或优先选用。该功能会引入有时效性的国内公共节点，属于实验性能力，仅供测试使用。
   - 脚本首行为 Bettbox 兼容声明（`Compatible_With_Bettbox`）：Bettbox 客户端约定在脚本开头识别该声明（并非全量读取），脚本需遵循此约定，声明必须保持置顶，否则"自定义规则开关"入口不显示。
   - `policyGroupOptions`：`Compatible_With_Bettbox` 声明中的字段，声明了归入 Bettbox 策略组开关分类的 12 个策略组（🌍 PROXY、🔄 负载均衡、👉 手动切换、♻️ 自动选择、📲 Telegram、🎮 Games-Global、🍎 海外苹果、🌐 海外微软、🎮 Steam平台（非下载/CDN）、✖️ Twitter、🤖 AI大模型、🎵 TikTok）。

   脚本内嵌了标准模板，对应仓库中的 [mihomo.yaml](https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/main/mihomo.yaml)。仓库不提供自动同步流程；修改配置后请人工核对两者，如有差异，以脚本内嵌模板为准。

## 节点域名与 DNS 联动模型

[<kbd>在线阅读：节点域名、Hosts 与私有 DNS 联动模型</kbd>](https://XVSVTsama.github.io/XVSVT-Clash-Config/proxy-infrastructure-domain-protection-model.html)

> 本文档拆解了配置中 `hosts` 真假映射、私有 DoH 解析、DNS policy 与 fake-IP filter 的各自职责，以及四者如何在同一条节点解析链路里协同生效。它面向想要编写或理解节点解析覆写脚本的人，不包含任何真实节点、密码、UUID 或订阅凭据。（本节及其中关于 `dns.use-hosts` 生效效果的说明由 AI 撰写。）

<a id="proxy-groups"></a>

## 🗂 分流组结构 (Proxy Groups)

| 策略组名称 | 默认行为 / 触发条件 | 注意事项 |
| :--- | :--- | :--- |
| **🌍 PROXY** | 未命中的所有默认海外流量 | 可选手动、自动或负载均衡 |
| **🔄 负载均衡** | 采用 `sticky-sessions` (粘性会话) 策略 | 保证同一域名短时间内 IP 不变 |
| **👉 手动切换** | 手动选择特定节点 | / |
| **♻️ 自动选择** | `url-test` 自动测试并选择延迟最低的节点 | 容差设置为 50ms |
| **🍎 海外苹果** | 海外 Apple 域名/IP 规则 | 国内 Apple 规则强制 `DIRECT`；可选手动、自动、负载均衡、`DIRECT` 和全部节点 |
| **🌐 海外微软** | 海外 Microsoft 域名/IP 规则 | 国内 Microsoft 规则强制 `DIRECT`；可选手动、自动、负载均衡、`DIRECT` 和全部节点 |
| **🎮 Steam平台（非下载/CDN）** | Steam 域名/IP 规则 | 默认选择 `DIRECT`；`games-cn` 仍直连，`games` 仍走 Games-Global |
| **📲 Telegram** | TGDC 关闭时默认走代理，防止断联 | 匹配进程名与特定 IP 段；开启 TGDC 后更名为 `📲 Telegram(兜底)` |
| **📲 Telegram-DC1-DC3-Miami** | TGDC 开启时，匹配美国/迈阿密节点 | 按 Telegram DC IP 规则优先命中；无地区匹配时列出全部合格节点供手动选择 |
| **📲 Telegram-DC2-DC4-Amsterdam** | TGDC 开启时，匹配荷兰/阿姆斯特丹节点 | 按 Telegram DC IP 规则优先命中；无地区匹配时列出全部合格节点供手动选择 |
| **📲 Telegram-DC5-SG** | TGDC 开启时，匹配新加坡/香港节点 | DC5 实验候选组；无地区匹配时列出全部合格节点供手动选择 |
| **🎮 Games-Global** | 国际服游戏流量 | / |
| **✖️ Twitter** | 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **🤖 AI大模型** | 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **🎵 TikTok** | 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **FCM** | Google FCM 相关域名（`hidden` 隐藏组） | 由 `FCM直连` 开关控制：开启=`DIRECT`；关闭=手动组，手动组禁用时回退到 `🌍 PROXY` 或 `DIRECT` |

> 注：🔄 负载均衡 / 👉 手动切换 / ♻️ 自动选择 / 📲 Telegram / 🎮 Games-Global 是纯节点占位组；🍎 海外苹果 / 🌐 海外微软 / 🎮 Steam平台（非下载/CDN）会先保留固定策略项，再由覆写脚本追加订阅全部单节点。不使用脚本时需手动填充节点。

<a id="before-use"></a>

## 🛠️ 使用前必改 (抄作业必看)

由于这是自用配置，`proxies: ~` 处为空。你必须自己完成以下操作：
1. **注入节点**：推荐直接使用上面的覆写脚本——订阅里的真实节点会自动填入 `proxies`、纯节点占位组以及海外苹果/微软/Steam 组（保留固定策略项后追加节点），订阅自带的 `proxy-providers` 也会被保留；如果不用脚本，则需要手动把节点列表或 `proxy-providers` 填入本配置（`proxies: ~` 处默认留空）。
2. **修改节点过滤规则 (Filter)**：配置默认使用长正则匹配住宅/美国系命名节点（住宅/家宽/家庭宽带/residential/home broadband/🇺🇸/美国/美國/U.S. 等多种命名变体），并排除香港/新加坡相关节点（🇭🇰/香港/Hong Kong/HK/🇸🇬/新加坡/Singapore/SG）。如果订阅节点名称不符合这些条件，请按实际情况修改 `mihomo.yaml` 和覆写脚本内嵌模板中对应策略组的 `filter` 字段，并人工核对两处内容。
3. **按需删减规则**：如果你不需要屏蔽番茄小说海外版的广告，建议删除 `sub-rules` 中 `fanqie` 相关的规则，以节省性能。

---

<a id="acknowledgments"></a>

## 🙏 致谢

本项目建立在开源内核、客户端、规则集与图标资源之上。以下致谢依据当前配置及仓库历史中的引用记录整理；引用或参考不代表这些项目与本仓库存在合作或背书关系。具体资源请以各上游项目的说明和许可为准。

### 内核与客户端

- [Mihomo](https://github.com/MetaCubeX/mihomo)：提供配置所依赖的核心能力。
- [Bettbox](https://github.com/appshubcc/Bettbox)：图形化客户端，以及本项目覆写脚本适配参考。
- [FlClash](https://github.com/chen08209/FlClash)：Mihomo 图形化客户端。

### 规则集作者与原项目

- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)：GeoSite、GeoIP 等规则数据。
- [DustinWin/ruleset_geodata](https://github.com/DustinWin/ruleset_geodata)：Mihomo 格式规则集及相关图标资源。
- [echs-top/proxy](https://github.com/echs-top/proxy)：国内、直连及代理等域名/IP 规则集。
- [appshubcc/bett-rules](https://github.com/appshubcc/bett-rules)：Apple、Microsoft、Steam、Douyin 等规则数据。
- [reddishJade/private_proxy](https://github.com/reddishJade/private_proxy)：Telegram IP 等规则集。
- [Accademia/Additional_Rule_For_Clash](https://github.com/Accademia/Additional_Rule_For_Clash)：Gemini、Grok 等补充规则。
- [Loyalsoldier/clash-rules](https://github.com/Loyalsoldier/clash-rules)：曾引用的 applications、Google、LAN、private 等规则。
- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)：曾引用的 Twitter 规则。

### 图标作者与原项目

- [Koolson/Qure](https://github.com/Koolson/Qure) 与 [MiToverG422/Qure](https://github.com/MiToverG422/Qure)：策略组及地区图标。
- [DustinWin/ruleset_geodata](https://github.com/DustinWin/ruleset_geodata)：规则项目提供的策略组图标。
- [AIsouler/MyClash](https://github.com/AIsouler/MyClash)：Apple、Microsoft、Steam 等 SVG 图标。
- [Clash Verge](https://www.clashverge.dev/)：部分策略组图标资源。
- 荷兰国旗图标由本项目自行绘制，并托管于 [`assets/icons/self-Netherlands.png`](assets/icons/self-Netherlands.png)。

图标副本统一托管在 `assets/icons/` 并通过 jsDelivr 引用。DustinWin/ruleset_geodata、Clash Verge 和 AIsouler/MyClash 的相关资源分别遵循其上游声明的 GPL-3.0 或 MIT 许可；Koolson/Qure 与 MiToverG422/Qure 未提供可识别的 SPDX 许可证文件，转载时请注明来源，商业使用前请向相关权利人确认授权。对应的 GPL/MIT 许可证副本保留在 `assets/icons/licenses/`。

### 脚本与配置参考

- [AIsouler/MyClash](https://github.com/AIsouler/MyClash)：脚本、配置结构与 README 呈现方式参考。
- [echs-top/proxy](https://github.com/echs-top/proxy)：脚本思路与规则组织参考。
- [HenryChiao/MIHOMO_YAMLS](https://github.com/HenryChiao/MIHOMO_YAMLS)：Mihomo YAML 配置与规则组织参考。

以上参考均用于学习与对照，具体实现以本仓库代码为准。

<a id="star-history"></a>

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=XVSVTsama/XVSVT-Clash-Config&type=Date)](https://star-history.com/#XVSVTsama/XVSVT-Clash-Config&Date)

<a id="disclaimer"></a>

## ⚠️ 免责声明

1. 本仓库收录与 Mihomo 相关的配置文件、覆写脚本及说明。具体能力、用途与运行结果取决于使用环境、客户端和使用者的设置，请在使用前自行了解并判断。
2. 配置包含 DNS、Fake-IP、域名/IP 分流及拦截规则，可能影响部分应用或网络连接。遇到异常时，请结合 Mihomo 官方文档和本地配置自行排查。
3. 使用者应自行评估使用、修改或传播本仓库内容所涉及的风险，并遵守所在地区适用的法律法规。因使用本仓库内容产生的后果，由使用者自行承担。
