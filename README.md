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
  <a href="#before-use">使用前必改</a> ·
  <a href="#dns-model">DNS 联动模型</a> ·
  <a href="#script-override">覆写脚本</a> ·
  <a href="#ruleset-overlap">规则集重合</a> ·
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

`mihomo.yaml` 是本仓库的基准配置模板，同时也是覆写脚本合并时使用的内嵌模板：一份不含任何节点的完整配置骨架。直接使用它的方式：

- **直接导入**：先在 `mihomo.yaml` 里把 `proxies: ~` 替换为自己的节点列表，或按需配置 `proxy-providers`，再把这份配置导入客户端；节点全部由 YAML 自己提供，不会从订阅自动导入，填写要求见 [使用前必改](#before-use)。

<a id="proxy-groups"></a>

### 🗂 分流组结构（按 `mihomo.yaml` 定义）

| 策略组名称 | 默认行为 / 触发条件 | 注意事项 |
| :--- | :--- | :--- |
| **🌍 PROXY** | 未命中的所有默认海外流量 | 可选手动、自动或负载均衡 |
| **🔄 负载均衡** | 采用 `sticky-sessions` (粘性会话) 策略 | 保证同一域名短时间内 IP 不变 |
| **👉 手动切换** | 手动选择特定节点 | 模板中 `proxies:` 留空，需填节点或由脚本注入 |
| **♻️ 自动选择** | `url-test` 自动测试并选择延迟最低的节点 | 容差设置为 50ms |
| **🍎 海外苹果** | 未被前置直连规则匹配的 Apple 域名/IP | `echs_direct` 等通用直连规则优先；模板 `proxies: null` |
| **💠 海外微软** | 未被前置直连规则匹配的 Microsoft 域名/IP | `echs_direct` 等通用直连规则优先；模板 `proxies: null` |
| **🎮 Steam平台（非下载/CDN）** | Steam 域名/IP 规则 | `default-selected: DIRECT`；命中前置直连规则的国内游戏/下载会提前直连 |
| **📲 Telegram** | 匹配进程名、Telegram 域名与 CIDR 规则集 | 模板中为纯节点占位组 |
| **🎮 Games-Global** | 国际服游戏流量 | `default-selected: 🎮 Steam平台（非下载/CDN）`，嵌套该组 |
| **✖️ Twitter** | `filter` 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **🤖 AI大模型** | `filter` 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **🎵 TikTok** | `filter` 匹配住宅/美国系命名节点，排除香港/新加坡节点 | 🚨 **节点命名不符将导致此策略组为空！** |
| **FCM** | Google FCM 相关域名（`rules` 中 `googlefcm` 规则集的目标组） | 组内节点由 `FCM直连` 开关控制：开启=`DIRECT`；关闭=优先 `👉 手动切换` |

> 注：🔄 负载均衡 / 👉 手动切换 / ♻️ 自动选择 / 📲 Telegram 是纯节点占位组；🍎 海外苹果 / 💠 海外微软 / 🎮 Steam平台（非下载/CDN）/ 🎮 Games-Global 会先保留固定策略项，再由覆写脚本追加订阅全部单节点。不使用脚本时需手动填充节点。

<a id="before-use"></a>

### 🛠️ 使用前必改 (抄作业必看)

本配置按个人使用习惯定制，并非开箱即用的通用模板，尤其是对于直接导入 YAML 的使用形式。使用前请完成以下必要设置；如不熟悉 Mihomo、TUN、DNS 或策略组过滤规则，请先了解相关机制再使用。

1. **直接使用 YAML (`mihomo.yaml`)**：不使用 JavaScript 覆写脚本时，在 `mihomo.yaml` 中将 `proxies: ~` 替换为自己的节点列表，或按需配置 `proxy-providers`。此方式由 YAML 文件提供节点，不会从订阅自动导入。
2. **节点过滤规则 (Filter)**：配置默认使用长正则匹配住宅/美国系命名节点（住宅/家宽/家庭宽带/residential/home broadband/🇺🇸/美国/美國/U.S. 等多种命名变体），并排除香港/新加坡相关节点（🇭🇰/香港/Hong Kong/HK/🇸🇬/新加坡/Singapore/SG）。如果订阅节点名称不符合这些条件，可根据实际情况调整相关策略组的 `filter` 正则。
3. **按需删减规则**：如果你不需要屏蔽番茄小说海外版的广告，建议删除 `sub-rules` 中 `fanqie` 相关的规则，以节省性能。

<a id="dns-model"></a>

## 🌐 节点域名与 DNS 联动模型

[<kbd>在线阅读：节点域名、Hosts 与私有 DNS 联动模型</kbd>](https://XVSVTsama.github.io/XVSVT-Clash-Config/proxy-infrastructure-domain-protection-model.html)

> 本文档拆解了配置中 `hosts` 真假映射、私有 DoH 解析、DNS policy 与 fake-IP filter 的各自职责，以及四者如何在同一条节点解析链路里协同生效。它面向想要编写或理解节点解析覆写脚本的人，不包含任何真实节点、密码、UUID 或订阅凭据。

网页源码同仓库托管于 [`docs/proxy-infrastructure-domain-protection-model.html`](docs/proxy-infrastructure-domain-protection-model.html)。

<a id="script-override"></a>

## ⚙️ 覆写脚本（`script_override.js`）

覆写脚本把订阅配置与本仓库维护的内嵌模板合并成最终配置：模板中已写好的字段（`dns`、`rules`、`rule-providers`、`sniffer`、`tun`、`proxy-groups` 分组结构等）以模板为准，节点与订阅自带 `proxy-providers` 来自订阅。脚本地址见页首 [远程覆写脚本地址](#remote-override)，在 Bettbox / FlClash 系客户端中给订阅挂上即可。

合并产物：

- **节点与占位组**：订阅里的真实节点自动填入 `proxies` 与纯节点占位组（👉 手动切换、♻️ 自动选择、🔄 负载均衡、📲 Telegram）；🍎 海外苹果、💠 海外微软、🎮 Steam平台（非下载/CDN）、🎮 Games-Global 则先保留各自固定策略项，再追加全部订阅节点。
- **订阅自带 `proxy-providers`**：原样保留；存在时上述动态分组会同时写入 `use` 引用全部 provider。
- **DNS**：动态合并出 `dns.proxy-server-nameserver-policy`（模板不预置该键，以脚本计算结果为准），细节见下方流程图。
- **开关声明**：脚本首行的 `Compatible_With_Bettbox` 兼容声明必须置顶——Bettbox 只在脚本开头识别该声明，删除或下移会导致"自定义规则开关"入口不显示；声明中的 `policyGroupOptions` 列出归入图形化开关分类的 12 个策略组，`ruleOptionsEnable` 则是实际生效的开关表，键名需与声明保持一致。

### 🔀 hosts / DNS 处理流程

订阅原始配置可能是三种形态：只有 hosts 真假映射、只有私有 DoH、或两者同时存在（背景与判定条件见 [节点域名与 DNS 联动模型](#dns-model)）。下面只画每种形态下脚本要达到的目标结果：**hosts 决定要解析哪个名字，节点 DNS 优先级决定这个名字从哪里拿到地址**。

**情形一：只有 hosts 真假映射（订阅未提供私有 DoH）**

```mermaid
flowchart TD
  A1["订阅原始状态<br/>节点 server 是 hosts 左侧的假域名"]
  A1 --> A2["生效条件成立<br/>use-hosts=true，dns.listen 与节点解析入口同端口形成回环"]
  A2 --> A3["hosts 命中，节点 server 改写成右侧的真域名"]
  A3 --> A4["最终 server 仍是域名，继续走 DNS 解析"]
  A4 --> A5["订阅没有私有 DoH，解析交给模板全局 proxy-server-nameserver"]
```

**情形二：只有私有 DoH（订阅未使用 hosts 映射）**

```mermaid
flowchart TD
  B1["订阅原始状态<br/>节点 server 是真实域名，hosts 为空表"]
  B1 --> B2["私有 DoH 出现在订阅的节点解析来源里<br/>按优先级取值：proxy-server-nameserver-policy &gt; proxy-server-nameserver（仅私有）&gt; nameserver-policy &gt; nameserver（仅私有）"]
  B2 --> B3["脚本把它整理进最终配置的 dns.proxy-server-nameserver-policy"]
  B3 --> B4["节点域名由私有 DoH 解析"]
  B4 --> B5["未命中 policy 的域名仍由模板全局 proxy-server-nameserver 兜底"]
```

**情形三：hosts 真假映射与私有 DoH 同时存在**

```mermaid
flowchart TD
  C1["订阅原始状态<br/>假域名与私有 DoH 同时存在"]
  C1 --> C2["① 名字：hosts 命中后，节点 server 改写成最终要连接的域名"]
  C2 --> C3["② 范围：只有最终仍是域名的节点需要 policy"]
  C3 --> C4["③ 路径：私有来源按节点 DNS 优先级迁移到这些域名<br/>节点专用 policy &gt; 节点专用 DNS &gt; 普通 policy &gt; 普通 DNS"]
  C4 --> C5["④ 兜底：模板全局 proxy-server-nameserver 始终保留"]
```

> 情形三里之所以先改写 `server` 再处理 policy，是因为部分订阅把 `proxy-server-nameserver` 写成 `udp://127.0.0.1:xxxx` 并依赖本机 hosts 回环；直接改写节点 `server` 可以绕开这条依赖，同时把原域名上的解析策略按需迁移到最终域名。

### 🗂 代理组与 Bettbox 开关（脚本合并后）

脚本开头的 `Compatible_With_Bettbox` 声明用 `policyGroupOptions` 划定了"策略组开关"分类：只列进去的组出现在该分类下，没列进去的组不受它控制，改由脚本的 `ruleOptionsEnable` 决定存在形态（两者都在脚本顶部可查）。

**列入 `policyGroupOptions` 的策略组（12 个）**

| 策略组名称 | Bettbox 开关 | 默认 |
| :--- | :--- | :--- |
| **🌍 PROXY** | `🌍 PROXY` | 开启 |
| **🔄 负载均衡** | `🔄 负载均衡` | 开启 |
| **👉 手动切换** | `👉 手动切换` | 开启 |
| **♻️ 自动选择** | `♻️ 自动选择` | 开启 |
| **📲 Telegram** | `📲 Telegram` | 开启 |
| **🎮 Games-Global** | `🎮 Games-Global` | 开启 |
| **🍎 海外苹果** | `🍎 海外苹果` | 开启 |
| **💠 海外微软** | `💠 海外微软` | 开启 |
| **🎮 Steam平台（非下载/CDN）** | `🎮 Steam平台（非下载/CDN）` | 开启 |
| **✖️ Twitter** | `✖️ Twitter` | 开启 |
| **🤖 AI大模型** | `🤖 AI大模型` | 开启 |
| **🎵 TikTok** | `🎵 TikTok` | 开启 |

这 12 个开关默认全部开启，关闭即移除该组，并清理其他组与 `rules` 中的引用（`🌍 PROXY` 关闭时其余引用回退到 `DIRECT`；TGDC 开启时 `📲 Telegram` 开关同时管 `📲 Telegram(兜底)`）。

**未列入 `policyGroupOptions` 的组**

| 策略组名称 | 由哪个开关决定 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| **FCM** | `FCM直连` | 开启 | 开关不移除本组，只改写组内节点：开启=`DIRECT`；关闭且 `👉 手动切换` 已禁用时回退到全局兜底。脚本内嵌模板把本组标记为隐藏组（`hidden`） |
| **📲 Telegram(兜底)** | `TGDC实验分流` | 关闭 | 该开关开启时由 `📲 Telegram` 更名而来，承接 Telegram 进程、域名与 CIDR 规则 |
| **📲 Telegram-DC1-DC3-Miami** | `TGDC实验分流` | 关闭 | 开关开启时按 Telegram DC IP 规则优先命中美国/迈阿密节点；地区无候选时列出全部合格节点供手动选择 |
| **📲 Telegram-DC2-DC4-Amsterdam** | `TGDC实验分流` | 关闭 | 同上，对应荷兰/阿姆斯特丹节点 |
| **📲 Telegram-DC5-SG** | `TGDC实验分流` | 关闭 | 同上，DC5 同时匹配新加坡与香港节点 |
| **国内入口解析** | `入口解析` | 关闭 | 开关开启时注入电信/联通/移动三个入口节点并建立该组，由用户手动选择入口；排列顺序不代表优先级 |

**同样不在 `policyGroupOptions`、也不对应任何策略组的开关（3 个）**

| 开关 | 默认 | 作用 |
| :--- | :--- | :--- |
| `强制证书验证` | 关闭 | 开启时统一把订阅节点的 `skip-cert-verify` 置为 `false`；关闭时不干预订阅节点原有设置 |
| `启用 Reality 增强` | 开启 | 为带非空 `public-key` / `short-id` 的 Reality 节点启用 X25519MLKEM768 后量子密钥协商 |
| `IPv6优先` | 关闭 | 按节点 `ip-version` 优先使用 IPv6：`ipv6` 保持不变，`ipv6-prefer` 及以上改为 `ipv6`，其余设为 `ipv6-prefer` |

> **关于客户端**：这套图形化开关由 Bettbox 原生支持——脚本开头的 `Compatible_With_Bettbox` 声明就是给 Bettbox 识别用的。换到其他客户端分两种情况：
>
> - 支持 JS 覆写脚本、但没有开关面板的客户端（例如 FlClash）：需要自行打开 `script_override.js`，把 `ruleOptionsEnable` 里对应开关的值改成 `true` 或 `false`，保存后重新加载订阅即可生效；
> - 不支持 JS 覆写脚本的客户端：没有这个入口，只能改用 `mihomo.yaml` 模板自行维护策略组。

<a id="ruleset-overlap"></a>

## 🧮 规则集重合关系（额外说明）

本小节不属于 YAML 或脚本单方面的说明：本仓库引用的规则集来自多个上游，彼此存在规则集与规则集之间的覆盖重合。下面按重合的集合分组，全部用韦恩图说明。

**1. 国内直连的三个来源**

```mermaid
venn-beta
  set E["echs_direct（echs-top 直连域名集）"]
  set C["cn（DustinWin 国内域名集）"]
  set A["applications（Loyalsoldier 国内应用域名集）"]
  union E,C
  union E,A
  union C,A
  union E,C,A
```

三者交集与两两交集是同一批国内直连域名，在 `rules` 的直连段依次命中、统一走 `DIRECT`。

**2. 直连规则集与海外组规则集**

```mermaid
venn-beta
  set E["echs_direct"]
  set P["apple（bett-rules）"]
  set M["microsoft（bett-rules）"]
  union E,P
  union E,M
```

`apple` / `microsoft` 的国内部分落在 `echs_direct` 里，`rules` 把 `echs_direct` 排在海外组之前，重合部分先走 `DIRECT`；`games` 与 `echs_direct` 同理。

**3. 出海域名集的多个来源**

```mermaid
venn-beta
  set X["proxy（DustinWin 代理域名集）"]
  set G["gfw（GFW 域名集）"]
  set O["google（Loyalsoldier Google 域名集）"]
  union X,G
  union X,O
  union G,O
```

三者覆盖的都是"需要走代理的域名"，在 `rules` 中同指 `🌍 PROXY`。

**4. Twitter 的三套规则集**

```mermaid
venn-beta
  set D["twitter-x-domain（MetaCubeX）"]
  set I["twitter-x-ip（MetaCubeX）"]
  set B["twitter-x-blackmatrix7-No_Resolve"]
  union D,B
  union I,B
```

blackmatrix7 的 `No_Resolve` 集同时包含域名与 IP，与 MetaCubeX 的两套各自重合。

**5. 两套 AI 规则集**

```mermaid
venn-beta
  set A1["ai-1（DustinWin ai.mrs）"]
  set A2["ai-2（MetaCubeX category-ai-!cn）"]
  union A1,A2
```

两套来源不同却覆盖同类站点，在 `rules` 中同指 `🤖 AI大模型`。

> 以上重合关系按各规则集的覆盖范围与来源判断（依据取自 `mihomo.yaml` 的 `rules:` 引用与注释），未逐条比对规则内容；需要精确交集数字时可单独跑一次集合比对。

<a id="render-check"></a>

## 🧪 渲染自检（临时内容，合并前删除）

GitHub 当前渲染版本已确认为 **Mermaid v12.1.0**。正文唯一使用的 beta 类型是 `venn-beta`（11.12.3+）；`treeView-beta`（11.14.0+）虽然版本支持，但因节点文字写死为黑色、深色模式下不可读而未被采用。保留下面的版本自检块便于日后复核，本小节在合并回 `main` 前删除。

```mermaid
  info
```

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
- [Loyalsoldier/clash-rules](https://github.com/Loyalsoldier/clash-rules)
- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)

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
