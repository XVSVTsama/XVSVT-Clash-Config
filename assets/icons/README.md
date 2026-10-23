# 图标资源与使用说明

这里集中记录 `mihomo.yaml`、`script_override.js` 的代理组、实验分组和 Bettbox 功能开关实际使用的图标。图标来源、许可和使用范围以本页及链接的上游说明为准，主 README 仅保留致谢入口。

## 维护约定

- **优先 SVG，而不是 PNG**。优先选择同一上游、语义和视觉合适的原生矢量版本；不把 PNG 嵌入 SVG，也不为统一扩展名强行描摹或牺牲清晰度。
- `self-` 表示本仓库自绘或自用制作的素材；`upstream-<作者或项目>-` 标示第三方来源，不表示本仓库拥有相关品牌权利。
- 本目录只保留 YAML / JS 实际引用的图像，包括开关控制的可选功能和运行时生成的分组；不预存未使用的图标。`assets/avatar.png` 是主 README 正在使用的头像，不属于本目录图标。
- 新增或替换图标时，同步修改 YAML、JS 内嵌模板及其他运行时引用，并更新本页的文件清单、来源、改动与许可说明。删除失去全部配置引用的旧图片，保留适用的署名与许可文本。
- 配置统一引用本仓库的 `https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/<文件名>`。本地修改须发布后远程地址才会更新；客户端或 CDN 可能仍有缓存。

## 尺寸与视觉归一化

当前配置引用的 28 张图标（17 PNG、11 SVG）统一按以下原则处理，文件名、格式与配置引用不变：

- PNG 使用 **144×144 像素**透明画布；SVG 使用 **`viewBox="0 0 100 100"`**。按完整可见图形边界等比缩放并居中，不拉伸、不裁掉可见内容，也不以其他图案替换原稿。
- 图形最长可见边以画布的**约 80%**为目标，四周保留留白。占比是视觉目标而非逐像素硬阈值；抗锯齿、低透明度边缘和阴影会使实际非透明边界略有差异，处理时仍保留这些内容。
- 为平衡横向旗帜与细线图形的小尺寸辨识度，以下文件作轻微光学放大：`self-Netherlands.png`、`upstream-Koolson-Qure-Singapore.png`、`upstream-Koolson-Qure-United_States.png`、`upstream-simple-icons-meta.svg` 的目标约 **83%**；`upstream-clash-verge-rev-balance.svg` 的目标约 **84%**。其他文件按约 80% 处理。
- PNG 仅进行等比重采样和透明留白调整；SVG 保留原路径、填色、渐变、裁剪定义及内部引用，通过外层等比变换调整尺寸与位置。原有可辨识设计和配色保留，PNG 不描摹为 SVG，SVG 不栅格化。

本次归一化仅改变尺寸、位置与留白，**不改变来源、许可、署名要求、商业用途限制或品牌权利边界**；下列各来源的说明与限制仍适用。

## 使用范围与许可边界

这些图像在本项目中用于标识代理策略、服务及设置，不表示品牌方与本项目存在合作、赞助或背书关系。

仓库根目录的 [GPL-3.0 许可证](../../LICENSE) **不能自动替代第三方图标自身的许可，也不授予品牌商标权**。项目级许可证、单图许可和商标规范是不同层面的约束；未发现单图授权信息不等于没有限制。复用、修改、传播或商业使用前，应核对对应上游与权利人的条件；本页的署名不是额外授权。

## 本仓库制作的素材

| 文件 | 用途与来源 | 格式和使用条件 |
| --- | --- | --- |
| `self-Microsoft.svg` | 海外微软组；本仓库绘制的四色窗口图形 | 原生 SVG；本仓库原创表达部分遵循根 GPL-3.0，Microsoft 品牌图形、商标及其他第三方权利不因此获得授权。品牌使用应核对 [Microsoft 商标规范](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks)。 |
| `self-Netherlands.png` | TGDC 阿姆斯特丹组；本仓库自行绘制的荷兰旗图标 | 保留现有 PNG；没有可复用的对应矢量原稿，不自动描摹。原创表达部分遵循根 GPL-3.0；参考 Qure 视觉风格不代表得到 Qure 对其他素材的授权。 |
| `self-TCP.png` | 代理节点 DNS 使用 TCP 开关；本仓库制作的 TCP 盾形图标 | 保留现有 PNG；没有可复用的对应矢量原稿，不自动描摹。原创表达部分遵循根 GPL-3.0，不对可能涉及的第三方图形权利作额外授权。 |

## AIsouler / MyClash

来源：[上游 SVG 目录](https://github.com/AIsouler/MyClash/tree/main/Icons/svg)。上游根目录采用 [MIT](https://github.com/AIsouler/MyClash/blob/main/LICENSE)，本仓库保留 [许可文本副本](licenses/AIsouler-MyClash-LICENSE.txt)。复用 MIT 许可覆盖的内容时，须保留其版权与许可声明；MIT 不意味着品牌方商标权也获得许可。

| 本地文件 | 上游文件 | 用途 |
| --- | --- | --- |
| `upstream-AIsouler-MyClash-Apple.svg` | [`Apple.svg`](https://github.com/AIsouler/MyClash/blob/main/Icons/svg/Apple.svg) | 海外苹果 |
| `upstream-AIsouler-MyClash-Steam.svg` | [`Steam.svg`](https://github.com/AIsouler/MyClash/blob/main/Icons/svg/Steam.svg) | Steam 平台 |

## Clash Verge 官方文档

来源：[Clash Verge 文档](https://www.clashverge.dev/) 的 [图标资源目录](https://github.com/clash-verge-rev/clash-verge-rev.github.io/tree/main/docs/assets/icons)。官方文档仓库根目录采用 [GPL-3.0](https://github.com/clash-verge-rev/clash-verge-rev.github.io/blob/main/LICENSE)，本仓库保留 [许可文本副本](licenses/clash-verge-rev-LICENSE.txt)。分发其 GPL 许可覆盖的素材时，应遵守 GPL 的许可保留及对应源码等适用条件；文档项目许可不额外授予 Twitter / X 等品牌的商标权。

| 本地文件 | 原始资源 | 用途 |
| --- | --- | --- |
| `upstream-clash-verge-rev-balance.svg` | [`balance.svg`](https://www.clashverge.dev/assets/icons/balance.svg) | 负载均衡 |
| `upstream-clash-verge-rev-twitter.svg` | [`twitter.svg`](https://www.clashverge.dev/assets/icons/twitter.svg) | Twitter |

## Simple Icons

来源固定为 [`90bd1f3e7b77851fd0c56474f6fa43b816babdab`](https://github.com/simple-icons/simple-icons/tree/90bd1f3e7b77851fd0c56474f6fa43b816babdab/icons)。各文件保留该版本 SVG 在原 `24×24` 坐标系中的几何路径，并按同版本 [品牌色元数据](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/data/simple-icons.json) 增加显式 `fill`，避免依赖客户端 CSS；本次归一化仅增加外层等比缩放与平移，将画布统一为 `viewBox="0 0 100 100"`，不改写原路径或品牌色。

| 本地文件 | 上游文件 | 用途 / 显式颜色 |
| --- | --- | --- |
| `upstream-simple-icons-bitcoin.svg` | [`bitcoin.svg`](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/icons/bitcoin.svg) | 金融支付；橙色 BTC / ₿ 图形，`#F7931A` |
| `upstream-simple-icons-google.svg` | [`google.svg`](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/icons/google.svg) | Google，`#4285F4` |
| `upstream-simple-icons-meta.svg` | [`meta.svg`](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/icons/meta.svg) | Meta，`#0467DF` |
| `upstream-simple-icons-spotify.svg` | [`spotify.svg`](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/icons/spotify.svg) | Spotify，`#1ED760` |
| `upstream-simple-icons-discord.svg` | [`discord.svg`](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/icons/discord.svg) | Discord，`#5865F2` |
| `upstream-simple-icons-reddit.svg` | [`reddit.svg`](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/icons/reddit.svg) | Reddit，`#FF4500` |

Simple Icons **项目**采用 [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/LICENSE.md)。但 [上游免责声明](https://github.com/simple-icons/simple-icons/blob/90bd1f3e7b77851fd0c56474f6fa43b816babdab/DISCLAIMER.md) 明确说明：项目 CC0 不代表所有图标都是 CC0；CC0 不授予商标权；缺少许可或规范字段不代表没有限制。上述六个条目在该版本元数据中未见单图 `license` 字段，不能据此宣称它们均可不受限制地商用。

复用前请查看各条目的 `source`、`guidelines` 和品牌方的最新规范，例如 [Bitcoin](https://bitcoin.org)、[Google](https://about.google/brand-resource-center/brand-elements/)、[Meta](https://www.facebook.com/brand/resources/meta/company-brand)、[Spotify](https://developer.spotify.com/documentation/general/design-and-branding/#using-our-logo)、[Discord](https://discord.com/branding)、[Reddit](https://www.redditinc.com/brand)。本目录仅链接其项目许可，不另放 Simple Icons 独立许可文件。

## DustinWin / ruleset_geodata

来源：[上游 icons Release](https://github.com/DustinWin/ruleset_geodata/releases/tag/icons)，资源下载地址为 `https://github.com/DustinWin/ruleset_geodata/releases/download/icons/<名称>.png`。

| 本地文件 | 上游发布文件 | 用途 |
| --- | --- | --- |
| `upstream-DustinWin-ruleset_geodata-proxy.png` | `proxy.png` | PROXY |
| `upstream-DustinWin-ruleset_geodata-select.png` | `select.png` | 手动切换 |
| `upstream-DustinWin-ruleset_geodata-auto.png` | `auto.png` | 自动选择 |
| `upstream-DustinWin-ruleset_geodata-telegram.png` | `telegram.png` | Telegram |
| `upstream-DustinWin-ruleset_geodata-games-cn.png` | `games-cn.png` | Games-Global |
| `upstream-DustinWin-ruleset_geodata-ai.png` | `ai.png` | AI 大模型 |
| `upstream-DustinWin-ruleset_geodata-tiktok.png` | `tiktok.png` | TikTok |

上游仓库根目录采用 [GPL-3.0](https://github.com/DustinWin/ruleset_geodata/blob/main/LICENSE)，本仓库保留 [许可文本副本](licenses/DustinWin-ruleset_geodata-LICENSE.txt)。但发布页未明确这七张 PNG 的逐图许可和完整原始权利来源，不能仅凭根许可证认定所有品牌图形均获 GPL 授权。对 GPL 实际覆盖的内容应遵守其条件；单图复用、商业用途及品牌权利仍应向上游或原权利人核实。

以上保留 PNG：没有确认到同上游、保持现有视觉的对应原生 SVG，不用名称近似但图形不同的素材强行替代。

## Koolson / Qure 与 MiToverG422 / Qure

来源分别为 [Koolson 彩色图标目录](https://github.com/Koolson/Qure/tree/master/IconSet/Color) 与 [MiToverG422 彩色图标目录](https://github.com/MiToverG422/Qure/tree/master/IconSet/Color)。本地文件保留来源前缀，下表给出对应的 `IconSet/Color/` 文件名。

| 本地文件 | 上游文件 | 用途 |
| --- | --- | --- |
| `upstream-Koolson-Qure-United_States.png` | Koolson / `United_States.png` | TGDC 迈阿密组 |
| `upstream-Koolson-Qure-Singapore.png` | Koolson / `Singapore.png` | TGDC 新加坡组 |
| `upstream-Koolson-Qure-Global.png` | Koolson / `Global.png` | IPv6 优先开关 |
| `upstream-Koolson-Qure-Telegram.png` | Koolson / `Telegram.png` | TGDC 实验分流开关 |
| `upstream-Koolson-Qure-Domestic.png` | Koolson / `Domestic.png` | 国内入口解析组及开关 |
| `upstream-MiToverG422-Qure-fcm.png` | MiToverG422 / `fcm.png` | FCM 组及其直连开关 |
| `upstream-MiToverG422-Qure-SSL.png` | MiToverG422 / `SSL.png` | 强制证书验证开关 |
| `upstream-MiToverG422-Qure-Spark.png` | MiToverG422 / `Spark.png` | Reality 增强开关 |

两个上游未找到标准许可证文件；适用说明见 [Koolson README](https://github.com/Koolson/Qure#免责声明) 与 [MiToverG422 README](https://github.com/MiToverG422/Qure#免责声明)：

- 转载须注明出处。
- 图标、LOGO 仅为资源共享、学习参考之目的，**不得用于商业用途或牟利**。
- 相关版权归原作者及其网站所有，上游不保证资源的合法性、正当性和准确性。

这些限制不被本仓库 GPL 覆盖或解除；非商业学习用途也不等于已获得所有第三方权利授权，需要额外用途时应先向相应权利人确认。本组保留原 PNG：未确认到同上游、保持现有视觉的对应原生 SVG，不嵌入位图或自动描摹。
