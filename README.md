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

`mihomo.yaml` 是本仓库的基准配置模板，同时也是覆写脚本合并时使用的内嵌模板：一份不含任何节点的完整配置骨架。使用它的方式有两种：

- **直接导入**：把模板导入客户端，节点由 YAML 自己提供——替换 `proxies: ~`，或按需配置 `proxy-providers`；此方式不会从订阅自动导入节点，填写要求见 [使用前必改](#before-use)。
- **配合覆写脚本**：把页首地址挂到订阅上，由脚本把订阅节点与真实配置写进模板，无需手动维护节点列表，见 [覆写脚本](#script-override)。

模板内除 `dns` / `hosts` 与 `proxy-groups` 外的配置块：

- **`mode` 与端口**：`mode: rule`、`mixed-port` / `port` / `socks-port`、`external-controller` 与 `external-ui`。
- **`tun`**：TUN 入站，含 `device`、`stack`、`dns-hijack` 与 `route-address` 路由范围。
- **`sniffer` 与 `ntp`**：域名嗅探与时间同步。
- **`.templates`、`rule-providers`、`sub-rules`、`rules`**：规则集锚点定义、规则集来源、子规则与主规则表。

### 🧬 DNS 结构

```mermaid
treeView-beta
    dns/
        enable, listen, ipv6, cache-algorithm, prefer-h3
        use-hosts: true
        use-system-hosts: false
        default-nameserver/
            兜底与引导解析
        proxy-server-nameserver/
            节点域名解析入口（全局兜底）
        direct-nameserver/
            直连流量解析
            direct-nameserver-follow-policy: true
        nameserver/
            普通域名解析
        nameserver-policy/
            rule-set:douyin
            rule-set:private
            rule-set:proxy@direct,cn,echs_direct
        enhanced-mode: fake-ip/
            fake-ip-range: 198.18.0.1/16
            fake-ip-range6: fdfe:dcba:9876::1/64
            fake-ip-filter-mode: blacklist
            fake-ip-filter/
                rule-set:fakeip-filter_domain
                rule-set:private, rule-set:cn
                rule-set:echs_direct, rule-set:googlefcm
                rule-set:applications, rule-set:pixiv
        respect-rules: false
    hosts/
        真假映射：域名 → IP, 域名, 0.0.0.0
        仅 dns.use-hosts: true 时参与解析
```

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

订阅原始配置可能是三种形态：只有 hosts 真假映射、只有私有 DoH、或两者同时存在（背景与判定条件见 [节点域名与 DNS 联动模型](#dns-model)）。脚本对每个节点域名分别判定，最终都归纳为一件事：**hosts 决定要解析哪个名字，节点 DNS 优先级决定这个名字从哪里拿到地址**。

**情形一：只有 hosts 真假映射（订阅未提供私有 DoH）**

```mermaid
flowchart TD
  A1["订阅原始状态<br/>节点 server 指向 hosts 左侧的假域名"]
  A1 --> A2{"生效条件满足？<br/>use-hosts=true，且 dns.listen 与节点解析入口同端口形成回环"}
  A2 -->|"不满足"| A3["hosts 不参与，server 保持原样"]
  A2 -->|"满足"| A4["逐节点匹配 hosts 左侧"]
  A4 -->|"右侧是 IP"| A5["server 改写为 IP<br/>该节点不再需要 DNS"]
  A4 -->|"右侧是域名"| A6["server 改写为右侧真域名<br/>之后仍需 DNS"]
  A4 -->|"未命中"| A3
  A5 --> A7["解析来源只剩公共 DNS 与本机回环<br/>脚本不写入私有 policy"]
  A6 --> A7
  A3 --> A7
  A7 --> A8["最终由模板全局 proxy-server-nameserver 兜底解析剩余域名"]
```

**情形二：只有私有 DoH（订阅未使用 hosts 映射）**

```mermaid
flowchart TD
  B1["订阅原始状态<br/>节点 server 是真实域名，hosts 为空表"]
  B1 --> B2["收集订阅的解析来源<br/>proxy-server-nameserver(-policy) 与 nameserver(-policy)"]
  B2 --> B3["按公共 DNS 名单区分私有与公共<br/>常见公共 DNS 与本机回环只用于识别，不进入节点解析"]
  B3 --> B4{"私有来源出现在哪个字段？"}
  B4 -->|"proxy-server-nameserver（作用于全部节点）"| B5["为每个节点域名写入<br/>proxy-server-nameserver-policy"]
  B4 -->|"proxy-server-nameserver-policy（指定域名）"| B6["命中节点域名的条目写入最终 policy"]
  B4 -->|"nameserver-policy 或 nameserver（普通解析来源）"| B7["命中节点域名的条目迁移为节点专用 policy"]
  B5 --> B8["模板全局 proxy-server-nameserver 保留为兜底"]
  B6 --> B8
  B7 --> B8
```

**情形三：hosts 真假映射与私有 DoH 同时存在**

```mermaid
flowchart TD
  C1["订阅原始状态<br/>假域名与私有 DoH 同时存在"]
  C1 --> C2["① 定名字：hosts 命中则改写节点 server<br/>映射到 IP 直接替换，映射到域名沿映射链跟随，成环则跳过"]
  C2 --> C3["② 定范围：只保留最终仍需要 DNS 的域名<br/>已被改写成 IP 的节点不再写 policy"]
  C3 --> C4["③ 定路径：按节点 DNS 优先级迁移私有来源<br/>节点专用 policy &gt; 节点专用 DNS &gt; 普通 policy &gt; 普通 DNS"]
  C4 --> C5{"原域名的解析策略覆盖最终域名？"}
  C5 -->|"覆盖"| C6["保留原条目不变"]
  C5 -->|"只命中映射前的域名"| C7["为最终域名补一条精确 policy"]
  C6 --> C8["④ 兜底：模板全局 proxy-server-nameserver 始终保留<br/>未命中 policy 的域名走它"]
  C7 --> C8
```

> 情形三里之所以先改写 `server` 再处理 policy，是因为部分订阅把 `proxy-server-nameserver` 写成 `udp://127.0.0.1:xxxx` 并依赖本机 hosts 回环；直接改写节点 `server` 可以绕开这条依赖，同时把原域名上的解析策略按需迁移到最终域名。

### 🗂 代理组（脚本合并后）

脚本合并后，属于 Bettbox 可视化开关分类的策略组如下，每个同名开关默认开启，关闭时该组会被移除并清理其他组与 `rules` 中的引用：

| 策略组名称 | Bettbox 开关 | 默认 | 关闭后的行为 |
| :--- | :--- | :--- | :--- |
| **🌍 PROXY** | `🌍 PROXY` | 开启 | 移除该组；引用回退到 `DIRECT` |
| **🔄 负载均衡** | `🔄 负载均衡` | 开启 | 移除该组并清理引用 |
| **👉 手动切换** | `👉 手动切换` | 开启 | 移除该组并清理引用 |
| **♻️ 自动选择** | `♻️ 自动选择` | 开启 | 移除该组并清理引用 |
| **📲 Telegram** | `📲 Telegram` | 开启 | 移除该组并清理引用；TGDC 开启时该开关同时管 `📲 Telegram(兜底)` |
| **🎮 Games-Global** | `🎮 Games-Global` | 开启 | 移除该组并清理引用 |
| **🍎 海外苹果** | `🍎 海外苹果` | 开启 | 移除该组并清理引用 |
| **💠 海外微软** | `💠 海外微软` | 开启 | 移除该组并清理引用 |
| **🎮 Steam平台（非下载/CDN）** | `🎮 Steam平台（非下载/CDN）` | 开启 | 移除该组并清理引用 |
| **✖️ Twitter** | `✖️ Twitter` | 开启 | 移除该组并清理引用 |
| **🤖 AI大模型** | `🤖 AI大模型` | 开启 | 移除该组并清理引用 |
| **🎵 TikTok** | `🎵 TikTok` | 开启 | 移除该组并清理引用 |

不在同名开关分类内、由功能开关决定存在形态的组：

| 策略组名称 | 控制方式 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| **FCM** | `FCM直连` | 开启 | 开关不移除本组，只改写组内节点：开启=`DIRECT`；关闭且 `👉 手动切换` 已禁用时回退到全局兜底。脚本内嵌模板把本组标记为隐藏组（`hidden`） |
| **📲 Telegram(兜底)** | `TGDC实验分流` | 关闭 | 该开关开启时由 `📲 Telegram` 更名而来，承接 Telegram 进程、域名与 CIDR 规则 |
| **📲 Telegram-DC1-DC3-Miami** | `TGDC实验分流` | 关闭 | 开关开启时按 Telegram DC IP 规则优先命中美国/迈阿密节点；地区无候选时列出全部合格节点供手动选择 |
| **📲 Telegram-DC2-DC4-Amsterdam** | `TGDC实验分流` | 关闭 | 同上，对应荷兰/阿姆斯特丹节点 |
| **📲 Telegram-DC5-SG** | `TGDC实验分流` | 关闭 | 同上，DC5 同时匹配新加坡与香港节点 |
| **国内入口解析** | `入口解析` | 关闭 | 开关开启时注入电信/联通/移动三个入口节点并建立该组，由用户手动选择入口；排列顺序不代表优先级 |

### 🎚 Bettbox 开关

- **策略组同名开关（12 个，默认全开）**：🌍 PROXY、🔄 负载均衡、👉 手动切换、♻️ 自动选择、📲 Telegram、🎮 Games-Global、🍎 海外苹果、💠 海外微软、🎮 Steam平台（非下载/CDN）、✖️ Twitter、🤖 AI大模型、🎵 TikTok。关闭即移除该组，并把其他组与 `rules` 中的引用改指向全局兜底。
- **功能开关（6 个）**：`强制证书验证`（默认关，开启时统一把订阅节点 `skip-cert-verify` 置为 `false`）、`启用 Reality 增强`（默认开，为带 `public-key`/`short-id` 的 Reality 节点开启 X25519MLKEM768）、`IPv6优先`（默认关，按节点 `ip-version` 优先 IPv6）、`FCM直连`（默认开，仅改写 FCM 组内节点）、`TGDC实验分流`（默认关，注入 DC/地区组、规则集与规则）、`入口解析`（默认关，注入入口节点、代理组与 DNS 策略）。

<a id="ruleset-overlap"></a>

## 🧮 规则集重合关系（额外说明）

本小节不属于 YAML 或脚本单方面的说明：本仓库同时引用多个上游的规则集，而这些规则集之间存在**规则集与规则集之间**的覆盖重合。下面用三个“国内直连”性质的规则集展示这种重合：

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

- **三者交集**：同一批国内直连域名被三套各自独立维护的来源同时收录，因此 `rules` 里依次命中、统一走 `DIRECT`——重合不产生冲突，只影响匹配顺序与规则集体积。
- **`echs_direct` ∩ `cn`**：国内域名总集与直连域名集的重合；两者都排在 `rules` 的直连段，`applications → echs_direct → cn` 的先后决定谁先命中，结果同为 `DIRECT`。
- **`echs_direct` ∩ `applications`**：国内应用域名同时出现在两套里，是"同一批直连域名的两种来源"。
- **`cn` ∩ `applications`**：国内域名总集覆盖国内应用域名，属于包含关系。
- **另一处顺序敏感的重合**：`apple` / `microsoft`（bett-rules）与 `echs_direct` 的国内部分重合——`rules` 把 `echs_direct` 放在海外组之前，重合部分先命中直连，剩余域名才进入 `🍎 海外苹果` / `💠 海外微软`。
- **同平台多来源的重合**：`twitter-x-domain` / `twitter-x-ip` / `twitter-x-blackmatrix7-No_Resolve` 是同一平台的三套规则集；`ai-1` / `ai-2` 是两套 AI 规则集。
- 规则集来源：`MetaCubeX/meta-rules-dat`、`DustinWin/ruleset_geodata`、`echs-top/proxy`、`appshubcc/bett-rules`、`Loyalsoldier/clash-rules`、`Accademia/Additional_Rule_For_Clash`、`blackmatrix7/ios_rule_script`、`reddishJade/private_proxy`，与文末致谢一致。

> 重合关系按各规则集的覆盖范围与来源说明，未逐条比对规则内容；需要精确交集时可单独跑一次集合比对。

<a id="render-check"></a>

## 🧪 渲染自检（临时内容，合并前删除）

GitHub 当前渲染版本已确认为 **Mermaid v12.1.0**，正文使用的 `treeView-beta`（Mermaid 11.14.0+）与 `venn-beta`（Mermaid 11.12.3+）都在该版本范围内。保留下面的版本自检块，便于日后复核；本小节在合并回 `main` 前删除。

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
