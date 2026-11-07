// Bettbox 兼容声明：Bettbox 客户端的预期行为是在脚本开头识别该声明（并非全量读取），
// 脚本需遵循此约定：声明必须置顶，删除或下移会导致"自定义规则开关"入口不显示。
const Compatible_With_Bettbox = {
  ruleOptionsEnable: true,
  // 声明属于策略组的开关名称，需与 ruleOptionsEnable 的键完全一致
  policyGroupOptions: [
    '👉 手动选择',
    '♻️ 自动选择',
    '🔄 负载均衡',
    '🔎 Google',
    '♾️ Meta',
    '🤖 AI大模型',
    '📲 Telegram',
    '✖️ Twitter',
    '💬 Discord',
    '👽 Reddit',
    '💬 LINE',
    '🎵 TikTok',
    '🎥 Netflix',
    '🎧 Spotify',
    '🎬 Emby',
    '🍎 海外苹果',
    '💠 海外微软',
    '🎮 Steam平台（非下载/CDN）',
    '🎮 Games-Global',
    '💳 金融支付',
    '💝 Patreon',
    '📚 EHentai',
    '☁️ PikPak',
  
  ]
};

/**
 * ============================================================================
 *  Bettbox（FlClash 系内核 / mihomo 下游客户端）JS 覆写脚本
 * ============================================================================
 *
 *  来源：
 *    JS 脚本：
 *    https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/main/script_override.js
 *    YAML 模板：
 *    https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/refs/heads/main/mihomo.yaml
 *    仓库：
 *    https://github.com/XVSVTsama/XVSVT-Clash-Config
 *    作者：
 *    https://github.com/XVSVTsama
 *    用法：本脚本可直接作为 Bettbox / FlClash 系客户端的远程覆写脚本加载
 *         （文件首行为 Bettbox 兼容声明，请勿删除）。
 *
 *  用途：
 *    把当前订阅（原始配置）与本仓库维护的"标准模板"（mihomo.yaml）合并成最终生效配置。
 *
 *  合并规则：
 *    1. 除下面第 2、3、4 条特别说明的部分外，最终配置以 TEMPLATE
 *       （对应 mihomo.yaml 模板）为准，即模板中已经写好的字段会替换掉订阅原始配置里
 *       的同名字段（例如 dns 的各项细节、rules、rule-providers、sniffer、
 *       tun、proxy-groups 的分组结构等）。订阅原始配置里模板未定义的顶层字段不会被保留
 *       （比如某些订阅自带的 allow-lan、bind-address），唯一的例外是 proxy-providers：
 *       若订阅自带 proxy-providers，会保留并注入最终配置；仅在相关节点级开关开启时
 *       合并 provider.override 字段（见下），其余内容不改。
 *
 *  能力边界（脚本本身能做什么）：
 *    脚本只接收配置对象、在内存中改写并返回，不读写文件、不发起网络请求、
 *    不启动进程，也没有异步、定时器或跨次执行的状态。因此：
 *      - 能读配置中已存在的内容：顶层节点、规则、rule-providers 与
 *        proxy-providers 的定义及其 URL；
 *      - 能写返回的整份配置：节点字段、策略组、规则、provider 定义；
 *      - 不能联网/下载/上传/测速/读运行状态，也不能调用客户端 API。
 *    安全上，脚本没有网络能力；本脚本写回的 url 只有模板固定常量或订阅原有
 *    值，不会把订阅内容拼进新地址。
 *
 *  节点处理与 proxy-providers（重要）：
 *    节点级处理分三类：
 *      1) 筛选：高/低倍率筛选、国家/地区分组、TGDC 候选；
 *      2) 注入：入口解析（注入入口节点，并用 exclude-filter 排除同名节点）；
 *      3) 修正字段：强制证书验证、Reality 增强、试开启节点UDP、
 *         IPv6优先、hosts 改写节点 server。
 *    按来源看：筛选类只涉及顶层 proxies；入口解析的节点来自脚本维护区，
 *    写入顶层 proxies；修正字段类中证书/UDP/IPv6 也覆盖 proxy-providers，
 *    Reality 与 hosts 只改顶层节点。
 *    http/file 型 provider 的节点由内核运行时按 url 拉取，脚本执行时不存在，
 *    只能看到 provider 定义（url/path/interval/override/filter 等）：
 *      - 筛选/剔除类到不了 provider：节点不在配置里，无法枚举或删除；
 *        include-all 由内核展开，provider 节点仍会进入业务组；
 *      - 修正字段类只有 override 固定字段能覆盖 provider，由
 *        applyProviderOverrides() 在开关开启时写入：
 *          强制证书验证 -> override.skip-cert-verify=false
 *          试开启节点UDP -> override.udp=true
 *          IPv6优先     -> override.ip-version=ipv6-prefer（统一值）
 *        Reality 需要嵌套 reality-opts，hosts 需要逐节点 server，均无法
 *        通过 override 表达，只作用于顶层节点；
 *      - 入口解析的 exclude-filter 由内核应用，会排除 provider 中的同名
 *        节点，但不筛选 provider 本身；
 *      - inline 型 provider 的 payload 在配置里可见，但本脚本仍只把顶层
 *        proxies 当作节点来源，不筛选、不改写。
 *    rule-providers 同理：http/file 型只能看到定义，脚本只增删定义与规则
 *    引用，不读取、不筛选、不改写规则内容；inline payload 也不处理。
 *
 *    2. proxies：使用订阅原始配置里的真实节点列表（模板里这一项本来就是空的，
 *       只是占位）。
 *       国家分组筛选仅处理订阅顶层 proxies 节点，不处理 proxy-providers 中的运行时节点。
 *
 *    3. 常规 proxy-groups 使用 Mihomo 原生 include-all / include-all-proxies
 *       动态引入订阅节点和代理提供者；🍎 海外苹果、💠 海外微软、🎮 Steam平台（非下载/CDN）、
 *       🎮 Games-Global、🎬 Emby 保留模板中显式列出的固定策略项。
 *       TGDC 实验组则完全由 JS 筛选顶层节点并显式生成节点列表。
 *
 *    4.【特别处理】DNS 与 hosts：
 *       - hosts 仅在 dns.use-hosts=true 且 dns.listen 与真正参与节点解析的 DNS 端点
 *         构成闭环时改写节点 server；原始域名仅用于识别并迁移私有 DNS 策略，
 *         最终结果只保留改写后仍需 DNS 解析的节点域名 policy；
 *       - 节点 DNS 优先级：proxy-server-nameserver-policy > proxy-server-nameserver
 *         （仅私有） > nameserver-policy > nameserver（仅私有）；
 *       - 公共 DNS 只用于识别私有 DNS，避免公共 DNS 进入节点解析；
 *       - 模板全局 proxy-server-nameserver 始终保留，作为最终兜底；
 *       相同 key 冲突时按 NAMESERVER_POLICY_PREFER_ORIGINAL 决定优先级。
 *
 *  使用方法（Bettbox / FlClash 系客户端通用）：
 *    配置 → 对应订阅右上角"..." → 编辑覆写脚本（或"打开脚本"）→ 新建脚本，
 *    把本文件全部内容粘贴进去保存，然后在该订阅上启用这个脚本即可。
 * ============================================================================
 */

// ============================================================================
// Bettbox 开关定义（ruleOptionsEnable 的键即客户端开关面板；开关图标表见模板之后的 serviceConfigs）
// ============================================================================

const ruleOptionsEnable = {

  /**
 * 自定义配置选项
 * 为模板里的每个代理组（策略组）单独定义开关：
 * true  = 启用该策略组
 * false = 禁用该策略组（会从 proxy-groups 中移除并清理引用；业务组还会删除对应路由规则）
 * 另有只调整组内节点的功能开关（FCM 与 Tailscale 的直连开关）：不涉及策略组启停。
 */

  // 手动选择策略组
  '👉 手动选择': true,
  // 延迟自动选择策略组
  '♻️ 自动选择': false,
  // --- 代理组（策略组）单独控制开关 ---
  // 负载均衡策略组
  '🔄 负载均衡': false,
  // Google / Google-CN 共用独立策略组；Google FCM 与 AI 特例仍由原规则处理。
  '🔎 Google': false,
  // Meta 社交平台策略组
  '♾️ Meta': false,
  // AI 大模型策略组
  '🤖 AI大模型': false,
  // Telegram 通讯软件策略组
  '📲 Telegram': false,
  // Twitter 社交平台策略组
  '✖️ Twitter': false,
  // Discord 通讯软件策略组
  '💬 Discord': false,
  // Reddit 社交平台策略组
  '👽 Reddit': false,
  // LINE 通讯软件策略组
  '💬 LINE': false,


  // TikTok 视频平台策略组
  '🎵 TikTok': false,
  // Netflix 流媒体策略组
  '🎥 Netflix': false,
  // Spotify 音乐流媒体策略组
  '🎧 Spotify': false,
  // Emby 播放器进程分流策略组
  '🎬 Emby': false,
  // 海外 Apple 平台服务
  '🍎 海外苹果': false,
  // 海外 Microsoft 平台服务
  '💠 海外微软': false,
  // Steam 平台服务，不负责下载/CDN
  '🎮 Steam平台（非下载/CDN）': false,
  // 游戏策略组
  '🎮 Games-Global': false,
  // 金融支付；Instagram 统一归入 Meta。
  '💳 金融支付': false,
  // Patreon 赞助平台策略组
  '💝 Patreon': false,
  // EHentai 策略组
  '📚 EHentai': false,
  // PikPak 网盘策略组
  '☁️ PikPak': false,



  // --- 节点字段修正 ---
  // 开启时统一把订阅节点 skip-cert-verify 置为 false（强制校验证书）；关闭时不干预，保留订阅节点原有设置。
  // provider 节点不在此遍历范围内，开启时改由 override.skip-cert-verify 生效。
  '强制证书验证': false,
  // 默认关闭：为带非空 public-key/short-id 的 Reality 节点启用 support-x25519mlkem768（X25519MLKEM768 后量子密钥协商）；
  // 打开本开关后不再写入该字段，保留订阅节点原有值。
  // 仅遍历订阅顶层 proxies；provider 的 override 只能改固定字段，
  // 无法改写嵌套 reality-opts，故不涉及 provider 节点。
  '关闭 Reality 增强': false,
  // 默认不改动订阅节点的 udp；开启时统一设置为 true，允许 UDP 通过代理。
  // provider 节点不在此遍历范围内，开启时改由 override.udp 生效。
  '试开启节点UDP': false,
  // 开启后按节点 ip-version 优先使用 IPv6；provider 节点不在此遍历范围内，
  // 开启时改由 override.ip-version（统一 ipv6-prefer）生效。
  'IPv6优先': false,
  // --- 组与实验 ---
  // 默认关闭：隐藏组 FCM 仅含 DIRECT；打开后优先使用 👉 手动选择，若该组已关闭则回退到 🌍 PROXY，再回退到 DIRECT（不移除 FCM 组）。开关图标取自 FCM 代理组的 icon 字段。
  '关闭FCM直连': false,
  // 默认关闭：Tailscale 分组仅含 DIRECT；打开后优先使用 👉 手动选择，若该组已关闭则回退到 🌍 PROXY，再回退到 DIRECT（不移除该组）。开关图标取自 Tailscale 代理组的 icon 字段。
  '关闭Tailscale直连': false,
  // 开启 Telegram DC/地区实验分流；关闭时不改变原 Telegram 规则、策略组和规则集。
  'TGDC实验分流': false,
  // 开启后注入 SukkaW/Surge 的 reject 规则集与广告拦截策略组；关闭时不注入其策略组、规则集和规则。
  'SKK广告拦截': false,
  // --- 节点筛选与分组 ---
  // 为合格的订阅顶层节点生成按国家/地区划分的策略组；与入口解析开关独立。
  // 只读取订阅顶层 proxies，不枚举 proxy-providers。
  '国家/地区分组': false,
  // 先按节点名称中的显式数值倍率筛选顶层节点，再据此生成国家/地区组；
  // 某地区节点全部被筛除时不建该地区组。不处理 proxy-providers。
  '高倍率筛选': false,
  '低倍率筛选': false,
  // 开启后，维护区所有分类的入口节点统一加入“国内入口解析”组，不进入其他代理组。
  '入口解析': false,
  // --- 网络与规则 ---
  // 最后为节点解析 DNS 的无协议地址补 tcp://；不改变显式协议、出口后缀或 DNS 优先级。
  '代理节点 DNS 使用 TCP': false,
  // 默认关闭：保留 WebRTC 阻断规则；打开后删除所有同时包含指定 UDP 网络和端口特征的规则。
  '关闭WebRTC阻断': false,
};

// 关闭这些业务组时删除指向它们的路由规则，而不是把规则改写到全局兜底。
const REMOVE_ROUTING_RULES_FOR_DISABLED_GROUPS = new Set([
  '📲 Telegram',
  '🎮 Games-Global',
  '🍎 海外苹果',
  '💠 海外微软',
  '🎮 Steam平台（非下载/CDN）',
  '✖️ Twitter',
  '🤖 AI大模型',
  '🎵 TikTok',
  '💳 金融支付',
  '🔎 Google',
  '♾️ Meta',
  '🎧 Spotify',
  '🎬 Emby',
  '💬 Discord',
  '👽 Reddit',
  '🎥 Netflix',
  '💝 Patreon',
  '📚 EHentai',
  '☁️ PikPak',
  '💬 LINE',
]);

// ============================================================================
// 标准模板配置（mihomo.yaml 的 JSON 表示），及其派生的开关辅助常量
// ============================================================================

const TEMPLATE = {
  "mode": "rule",
  "find-process-mode": "strict",
  "mixed-port": 7254,
  "port": 7249,
  "socks-port": 7346,
  "etag-support": true,
  "global-ua": "clash.meta",
  "ipv6": true,
  "log-level": "info",
  "external-controller": "127.0.0.1:9090",
  "external-ui": "dashboard",
  "unified-delay": true,
  "tcp-concurrent": true,
  "keep-alive-idle": 600,
  "keep-alive-interval": 15,
  "profile": {
    "store-selected": true,
    "store-fake-ip": true
  },
  "tun": {
    "enable": true,
    "device": "XVSVT",
    "auto-detect-interface": true,
    "auto-route": true,
    "auto-redirect": true,
    "strict-route": true,
    "stack": "mips",
    "dns-mode": "hijack",
    "dns-hijack": [
      "any:53",
      "udp://any:53",
      "tcp://any:53"
    ],
    "route-address": [
      "198.51.100.0/30",
      "1.0.0.0/8",
      "2.0.0.0/7",
      "4.0.0.0/6",
      "8.0.0.0/7",
      "11.0.0.0/8",
      "12.0.0.0/6",
      "16.0.0.0/4",
      "32.0.0.0/3",
      "64.0.0.0/3",
      "96.0.0.0/4",
      "112.0.0.0/5",
      "120.0.0.0/6",
      "124.0.0.0/7",
      "126.0.0.0/8",
      "128.0.0.0/3",
      "160.0.0.0/5",
      "168.0.0.0/8",
      "169.0.0.0/9",
      "169.128.0.0/10",
      "169.192.0.0/11",
      "169.224.0.0/12",
      "169.240.0.0/13",
      "169.248.0.0/14",
      "169.252.0.0/15",
      "169.255.0.0/16",
      "170.0.0.0/7",
      "172.0.0.0/12",
      "172.32.0.0/11",
      "172.64.0.0/10",
      "172.128.0.0/9",
      "173.0.0.0/8",
      "174.0.0.0/7",
      "176.0.0.0/4",
      "192.0.0.0/9",
      "192.128.0.0/11",
      "192.160.0.0/13",
      "192.169.0.0/16",
      "192.170.0.0/15",
      "192.172.0.0/14",
      "192.176.0.0/12",
      "192.192.0.0/10",
      "193.0.0.0/8",
      "194.0.0.0/7",
      "196.0.0.0/6",
      "200.0.0.0/5",
      "208.0.0.0/4"
    ]
  },
  "ntp": {
    "enable": true,
    "write-to-system": false,
    "server": "time.apple.com",
    "port": 123
  },
  "sniffer": {
    "enable": true,
    "override-destination": false,
    "sniff": {
      "HTTP": {
        "ports": [
          80,
          "8080-8880"
        ]
      },
      "TLS": {
        "ports": [
          443,
          8443
        ]
      },
      "QUIC": {
        "ports": [
          443,
          8443
        ]
      }
    },
    "skip-domain": [
      "rule-set:fakeip-filter_domain",
      "rule-set:private",
      "rule-set:geolocation-cn",
      "rule-set:cn-additional",
      "rule-set:apple-cn",
      "rule-set:microsoft-cn",
      "rule-set:games-cn",
      "rule-set:googlefcm",
      "yacd.haishan.me",
      "+.alipayeshop.com",
      "rule-set:pixiv",
      "pixshaft.com",
      "gh-proxy.com"
    ],
    "skip-dst-address": [
      "rule-set:echs_direct_ip",
      "rule-set:microsoft_ip",
      "rule-set:apple_ip",
      "rule-set:telegramcidr",
      "rule-set:twitter-x-ip",
      "rule-set:twitter-x-aggregate",
      "rule-set:steam_ip",
      "160.79.104.0/21",
      "2607:6bc0::/48",
      "2400:8800:1::6/128",
      "2400:8800:2::6/128",
      "240c::6666/128",
      "240c::6644/128",
      "1.1.1.1/32",
      "1.0.0.1/32",
      "1.1.1.2/32",
      "1.0.0.2/32",
      "1.1.1.3/32",
      "1.0.0.3/32",
      "2606:4700:4700::1111/128",
      "2606:4700:4700::1001/128",
      "2606:4700:4700::1112/128",
      "2606:4700:4700::1002/128",
      "2606:4700:4700::1113/128",
      "2606:4700:4700::1003/128",
      "8.8.8.8/32",
      "8.8.4.4/32",
      "2001:4860:4860::8888/128",
      "2001:4860:4860::8844/128",
      "9.9.9.9/32",
      "149.112.112.112/32",
      "9.9.9.10/32",
      "149.112.112.10/32",
      "9.9.9.11/32",
      "149.112.112.11/32",
      "2620:fe::fe/128",
      "2620:fe::9/128",
      "208.67.222.222/32",
      "208.67.220.220/32",
      "208.67.222.123/32",
      "208.67.220.123/32",
      "2620:119:35::35/128",
      "2620:119:53::53/128",
      "2620:119:35::123/128",
      "2620:119:53::123/128",
      "94.140.14.14/32",
      "94.140.15.15/32",
      "94.140.14.15/32",
      "94.140.15.16/32",
      "2a10:50c0::ad1:ff/128",
      "2a10:50c0::ad2:ff/128",
      "2a10:50c0::bad1:ff/128",
      "2a10:50c0::bad2:ff/128",
      "185.228.168.9/32",
      "185.228.169.9/32",
      "185.228.168.10/32",
      "185.228.169.11/32",
      "185.228.168.168/32",
      "185.228.169.168/32",
      "2a0d:2a00:1::2/128",
      "2a0d:2a00:2::2/128",
      "76.76.2.0/32",
      "76.76.10.0/32",
      "76.76.19.19/32",
      "76.223.122.150/32",
      "156.154.70.1/32",
      "156.154.71.1/32",
      "156.154.70.2/32",
      "156.154.71.2/32",
      "2610:a1:1018::1/128",
      "2610:a1:1019::1/128",
      "64.6.64.6/32",
      "64.6.65.6/32",
      "77.88.8.8/32",
      "77.88.8.1/32",
      "2a02:6b8::feed:ff/128",
      "2a02:6b8:0:1::feed:ff/128",
      "185.222.222.222/32",
      "45.11.45.11/32",
      "194.242.2.2/32",
      "2a07:e340::2/128",
      "74.82.42.42/32",
      "2001:470:20::2/128"
    ]
  },
  "dns": {
    "enable": true,
    "cache-algorithm": "arc",
    "ipv6": true,
    "listen": "0.0.0.0:1053",
    "use-hosts": true,
    "use-system-hosts": false,
    "default-nameserver": [
      "tls://223.5.5.5#DIRECT",
      "114.114.114.114#DIRECT",
      "https://1.12.12.12/dns-query#DIRECT"
    ],
    "proxy-server-nameserver": [
      "https://hrbgyitz34.cloudflare-gateway.com/dns-query#DIRECT"
    ],
    "direct-nameserver": [
      "https://dns.alidns.com/dns-query#DIRECT",
      "https://doh.pub/dns-query#DIRECT",
      "https://doh.360.cn/dns-query#DIRECT"
    ],
    "direct-nameserver-follow-policy": true,
    "nameserver": [
      "https://cloudflare-dns.com/dns-query#🌍 PROXY",
      "https://dns.google/dns-query#🌍 PROXY",
      "https://unfiltered.adguard-dns.com/dns-query#🌍 PROXY"
    ],
    "nameserver-policy": {
      // 本节按 rules 中对应规则的先后顺序排列；Tailscale、douyin 等特例条目保留原位。
      "+.ts.net": [
        "100.100.100.100"
      ],
      "rule-set:douyin": [
        "system",
        "180.184.1.1",
        "180.184.2.2"
      ],
      "rule-set:private": [
        "system"
      ],
      "rule-set:geolocation-cn,cn-additional,apple-cn,microsoft-cn,games-cn": [
        "https://dns.alidns.com/dns-query#DIRECT",
        "https://doh.pub/dns-query#DIRECT",
        "https://doh.360.cn/dns-query#DIRECT"
      ],
      // 业务域名解析尽可能跟随路由组；仅覆盖 DOMAIN、DOMAIN-SUFFIX 与 domain/classical 规则集。
      // nameserver-policy 按文件顺序匹配、先命中者优先；与上方条目重叠的域名以在前条目为准，本段映射仅对未被前面命中的域名生效。
      "rule-set:microsoft": ["https://cloudflare-dns.com/dns-query#💠 海外微软", "https://dns.google/dns-query#💠 海外微软", "https://unfiltered.adguard-dns.com/dns-query#💠 海外微软"],
      "rule-set:apple": ["https://cloudflare-dns.com/dns-query#🍎 海外苹果", "https://dns.google/dns-query#🍎 海外苹果", "https://unfiltered.adguard-dns.com/dns-query#🍎 海外苹果"],
      "rule-set:proxy@direct": [
        "https://dns.alidns.com/dns-query#DIRECT",
        "https://doh.pub/dns-query#DIRECT",
        "https://doh.360.cn/dns-query#DIRECT"
      ],
      "rule-set:telegram_domain": ["https://cloudflare-dns.com/dns-query#📲 Telegram", "https://dns.google/dns-query#📲 Telegram", "https://unfiltered.adguard-dns.com/dns-query#📲 Telegram"],
      "rule-set:google": ["https://cloudflare-dns.com/dns-query#🔎 Google", "https://dns.google/dns-query#🔎 Google", "https://unfiltered.adguard-dns.com/dns-query#🔎 Google"],
      "rule-set:google-cn": ["https://cloudflare-dns.com/dns-query#🔎 Google", "https://dns.google/dns-query#🔎 Google", "https://unfiltered.adguard-dns.com/dns-query#🔎 Google"],
      "rule-set:Gemini_Domain": ["https://cloudflare-dns.com/dns-query#🔎 Google", "https://dns.google/dns-query#🔎 Google", "https://unfiltered.adguard-dns.com/dns-query#🔎 Google"],
      "rule-set:meta": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "+.muse.ai": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "hatch-api.meta.ai": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "api.meta.ai": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "agent.meta.ai": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "+.metaaivm.com": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "auth.meta.com": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "meta.graph.meta.com": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "edge-metaclaw-http.c10r.facebook.com": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "shortwave.facebook.com": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "node.hatch.one": ["https://cloudflare-dns.com/dns-query#♾️ Meta", "https://dns.google/dns-query#♾️ Meta", "https://unfiltered.adguard-dns.com/dns-query#♾️ Meta"],
      "+.hark.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.wabi.ai": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.tabbyml.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "api.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "console.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "statsig.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "status.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "sentry.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "support.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "mcp-proxy.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "platform.claude.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "code.claude.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "downloads.claude.ai": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "bridge.claudeusercontent.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "cdn.growthbook.io": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "cdn.usefathom.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "registry.npmjs.org": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "storage.googleapis.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "formulae.brew.sh": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "http-intake.logs.us5.datadoghq.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "browser-intake-us5-datadoghq.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "servd-anthropic-website.b-cdn.net": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "claudemcpclient.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "claudemcpcontent.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.anthropic.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.claude.ai": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.claude.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.claudeusercontent.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.clau.de": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.modelcontextprotocol.io": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "rule-set:Grok_Domain": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "anthropic.com.cdn.cloudflare.net": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "anthropic-com.ghost.io": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.sentry.io": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.statsigapi.net": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "rule-set:ai-1": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "rule-set:ai-2": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "rule-set:spotify": ["https://cloudflare-dns.com/dns-query#🎧 Spotify", "https://dns.google/dns-query#🎧 Spotify", "https://unfiltered.adguard-dns.com/dns-query#🎧 Spotify"],
      "rule-set:discord": ["https://cloudflare-dns.com/dns-query#💬 Discord", "https://dns.google/dns-query#💬 Discord", "https://unfiltered.adguard-dns.com/dns-query#💬 Discord"],
      "rule-set:reddit": ["https://cloudflare-dns.com/dns-query#👽 Reddit", "https://dns.google/dns-query#👽 Reddit", "https://unfiltered.adguard-dns.com/dns-query#👽 Reddit"],
      "rule-set:netflix": ["https://cloudflare-dns.com/dns-query#🎥 Netflix", "https://dns.google/dns-query#🎥 Netflix", "https://unfiltered.adguard-dns.com/dns-query#🎥 Netflix"],
      "rule-set:patreon": ["https://cloudflare-dns.com/dns-query#💝 Patreon", "https://dns.google/dns-query#💝 Patreon", "https://unfiltered.adguard-dns.com/dns-query#💝 Patreon"],
      "rule-set:ehentai": ["https://cloudflare-dns.com/dns-query#📚 EHentai", "https://dns.google/dns-query#📚 EHentai", "https://unfiltered.adguard-dns.com/dns-query#📚 EHentai"],
      "rule-set:pikpak": ["https://cloudflare-dns.com/dns-query#☁️ PikPak", "https://dns.google/dns-query#☁️ PikPak", "https://unfiltered.adguard-dns.com/dns-query#☁️ PikPak"],
      "rule-set:line": ["https://cloudflare-dns.com/dns-query#💬 LINE", "https://dns.google/dns-query#💬 LINE", "https://unfiltered.adguard-dns.com/dns-query#💬 LINE"],
      "d3r7nsslvs6aaf.cloudfront.net": ["https://cloudflare-dns.com/dns-query#💳 金融支付", "https://dns.google/dns-query#💳 金融支付", "https://unfiltered.adguard-dns.com/dns-query#💳 金融支付"],
      "rule-set:category-cryptocurrency": ["https://cloudflare-dns.com/dns-query#💳 金融支付", "https://dns.google/dns-query#💳 金融支付", "https://unfiltered.adguard-dns.com/dns-query#💳 金融支付"],
      "rule-set:paypal": ["https://cloudflare-dns.com/dns-query#💳 金融支付", "https://dns.google/dns-query#💳 金融支付", "https://unfiltered.adguard-dns.com/dns-query#💳 金融支付"],
      "rule-set:stripe": ["https://cloudflare-dns.com/dns-query#💳 金融支付", "https://dns.google/dns-query#💳 金融支付", "https://unfiltered.adguard-dns.com/dns-query#💳 金融支付"],
      "rule-set:visa": ["https://cloudflare-dns.com/dns-query#💳 金融支付", "https://dns.google/dns-query#💳 金融支付", "https://unfiltered.adguard-dns.com/dns-query#💳 金融支付"],
      "rule-set:mastercard": ["https://cloudflare-dns.com/dns-query#💳 金融支付", "https://dns.google/dns-query#💳 金融支付", "https://unfiltered.adguard-dns.com/dns-query#💳 金融支付"],
      "rule-set:wise": ["https://cloudflare-dns.com/dns-query#💳 金融支付", "https://dns.google/dns-query#💳 金融支付", "https://unfiltered.adguard-dns.com/dns-query#💳 金融支付"],
      "rule-set:twitter-x-domain": ["https://cloudflare-dns.com/dns-query#✖️ Twitter", "https://dns.google/dns-query#✖️ Twitter", "https://unfiltered.adguard-dns.com/dns-query#✖️ Twitter"],
      "rule-set:twitter-x-aggregate": ["https://cloudflare-dns.com/dns-query#✖️ Twitter", "https://dns.google/dns-query#✖️ Twitter", "https://unfiltered.adguard-dns.com/dns-query#✖️ Twitter"],
      "rule-set:steam": ["https://cloudflare-dns.com/dns-query#🎮 Steam平台（非下载/CDN）", "https://dns.google/dns-query#🎮 Steam平台（非下载/CDN）", "https://unfiltered.adguard-dns.com/dns-query#🎮 Steam平台（非下载/CDN）"],
      "rule-set:games": ["https://cloudflare-dns.com/dns-query#🎮 Games-Global", "https://dns.google/dns-query#🎮 Games-Global", "https://unfiltered.adguard-dns.com/dns-query#🎮 Games-Global"],
      "rule-set:TikTok": ["https://cloudflare-dns.com/dns-query#🎵 TikTok", "https://dns.google/dns-query#🎵 TikTok", "https://unfiltered.adguard-dns.com/dns-query#🎵 TikTok"],
    },
      "prefer-h3": true,
    "respect-rules": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-range6": "fdfe:dcba:9876::1/64",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": [
      "rule-set:fakeip-filter_domain",
      "rule-set:private",
      "rule-set:geolocation-cn",
      "rule-set:cn-additional",
      "rule-set:apple-cn",
      "rule-set:microsoft-cn",
      "rule-set:games-cn",
      "rule-set:googlefcm",
      "yacd.haishan.me",
      "+.alipayeshop.com",
      "rule-set:pixiv",
      "pixshaft.com",
      "gh-proxy.com"
    ],
  },
  "hosts": {
    "+.clash.dev": [
      "127.0.0.1"
    ],
    "services.googleapis.cn": [
      "services.googleapis.com"
    ],
    "+.mcdn.bilivideo.com": [
      "0.0.0.0"
    ],
    "+.mcdn.bilivideo.cn": [
      "0.0.0.0"
    ],
    "mtalk.google.com": [
      "142.250.107.188",
      "142.251.2.188",
      "142.250.141.188",
      "74.125.137.188"
    ],
    "dns.msftncsi.com": [
      "131.107.255.255",
      "fd3e:4f5a:5b81::1"
    ],
    "*.pangolin-sdk-toutiao": "0.0.0.0",
    "*.pangolin-sdk-toutiao.*": "0.0.0.0",
    "*.pstatp.com": "0.0.0.0",
    "*.pstatp.com.*": "0.0.0.0",
    "*.pglstatp-toutiao.com": "0.0.0.0",
    "*.pglstatp-toutiao.com.*": "0.0.0.0",
    "gurd.snssdk.com": "0.0.0.0",
    "gurd.snssdk.com.*": "0.0.0.0"
  },
  "proxies": [],
  "proxy-groups": [
    {
      "name": "🌍 PROXY",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-proxy.png",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ]
    },
    {
      "name": "👉 手动选择",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-select.png",
      "type": "select",
      "include-all": true
    },
    {
      "name": "♻️ 自动选择",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-auto.png",
      "type": "url-test",
      "url": "https://g.cn/generate_204",
      "interval": 300,
      "tolerance": 10,
      "lazy": true,
      "max-failed-times": 1,
      "include-all": true
    },
    {
      "name": "🔄 负载均衡",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-clash-verge-rev-balance.svg",
      "type": "select",
      "proxies": [
        "consistent-hashing",
        "sticky-sessions",
        "round-robin"
      ]
    },
    {
      "name": "consistent-hashing",
      "type": "load-balance",
      "include-all": true,
      "url": "https://g.cn/generate_204",
      "interval": 300,
      "lazy": true,
      "max-failed-times": 1,
      "strategy": "consistent-hashing",
      "hidden": true
    },
    {
      "name": "sticky-sessions",
      "type": "load-balance",
      "include-all": true,
      "url": "https://g.cn/generate_204",
      "interval": 300,
      "lazy": true,
      "max-failed-times": 1,
      "strategy": "sticky-sessions",
      "hidden": true
    },
    {
      "name": "round-robin",
      "type": "load-balance",
      "include-all": true,
      "url": "https://g.cn/generate_204",
      "interval": 300,
      "lazy": true,
      "max-failed-times": 1,
      "strategy": "round-robin",
      "hidden": true
    },
    {
      "name": "🔎 Google",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-google.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "♾️ Meta",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-meta.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🤖 AI大模型",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-ai.png",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "📲 Telegram",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-telegram.png",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "✖️ Twitter",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-clash-verge-rev-twitter.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "💬 Discord",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-discord.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "👽 Reddit",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-reddit.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "💬 LINE",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-line.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🎵 TikTok",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-tiktok.png",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🎥 Netflix",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-netflix.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🎧 Spotify",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-spotify.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🎬 Emby",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-emby.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🍎 海外苹果",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-AIsouler-MyClash-Apple.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "💠 海外微软",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-Microsoft.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🎮 Steam平台（非下载/CDN）",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-AIsouler-MyClash-Steam.svg",
      "type": "select",
      "default-selected": "DIRECT",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🎮 Games-Global",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-games-cn.png",
      "type": "select",
      "default-selected": "🎮 Steam平台（非下载/CDN）",
      "proxies": [
        "🎮 Steam平台（非下载/CDN）"
      ],
      "include-all": true
    },
    {
      "name": "💳 金融支付",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-bitcoin.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "💝 Patreon",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-patreon.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "📚 EHentai",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-EHentai.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "☁️ PikPak",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-PikPak.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "hidden": true,
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-FCM.svg",
      "name": "FCM",
      "proxies": [
        "👉 手动选择",
        "DIRECT"
      ],
      "type": "select"
    },
    {
      "hidden": true,
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-tailscale.svg",
      "name": "Tailscale",
      "proxies": [
        "👉 手动选择",
        "DIRECT"
      ],
      "type": "select"
    }
  ],
  "rule-providers": {
    "Gemini_Domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/master/Gemini/Gemini_Domain.yaml",
      "path": "./ruleset/Gemini_Domain.yaml"
    },
    "Grok_Domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/refs/heads/main/Grok/Grok_Domain.yaml",
      "path": "./ruleset/Grok_Domain.yaml"
    },
    "HijackingPlus": {
      "type": "http",
      "interval": 86400,
      "behavior": "classical",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/refs/heads/main/HijackingPlus/HijackingPlus_No_Resolve.yaml",
      "path": "./ruleset/HijackingPlus.yaml"
    },
    "TikTok": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/tiktok.mrs",
      "path": "./ruleset/tiktok.mrs"
    },
    "ai-1": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/ai.mrs",
      "path": "./ruleset/ai-1.mrs"
    },
    "ai-2": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs",
      "path": "./ruleset/ai-2.mrs"
    },
    "apple": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/apple.mrs",
      "path": "./ruleset/apple.mrs"
    },
    "apple_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geoip/apple.mrs",
      "path": "./ruleset/apple_ip.mrs"
    },
    "category-cryptocurrency": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-cryptocurrency.mrs",
      "path": "./ruleset/category-cryptocurrency.mrs"
    },
    "discord": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/discord.mrs",
      "path": "./ruleset/discord.mrs"
    },
    "douyin": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/douyin.mrs",
      "path": "./ruleset/douyin.mrs"
    },
    "geolocation-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/geolocation-cn.mrs",
      "path": "./ruleset/geolocation-cn.mrs"
    },
    "cn-additional": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://static-file-global.353355.xyz/rules/cn-additional-list.mrs",
      "path": "./ruleset/cn-additional.mrs"
    },
    "apple-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/apple-cn.mrs",
      "path": "./ruleset/apple-cn.mrs"
    },
    "microsoft-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/microsoft-cn.mrs",
      "path": "./ruleset/microsoft-cn.mrs"
    },
    "games-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/games-cn.mrs",
      "path": "./ruleset/games-cn.mrs"
    },
    "echs_direct_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/echs-top/proxy/main/mrs/ip/direct.mrs",
      "path": "./ruleset/echs_direct_ip.mrs"
    },
    "ehentai": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ehentai.mrs",
      "path": "./ruleset/ehentai.mrs"
    },
    "fakeip-filter_domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/fakeip-filter.mrs",
      "path": "./ruleset/fakeip-filter_domain.mrs"
    },
    "games": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/games.mrs",
      "path": "./ruleset/games.mrs"
    },
    "google": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/google.txt",
      "path": "./ruleset/google.yaml"
    },
    "google-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/google-cn.mrs",
      "path": "./ruleset/google-cn.mrs"
    },
    "googlefcm": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/googlefcm.mrs",
      "path": "./ruleset/googlefcm.mrs"
    },
    "lancidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/lancidr.txt",
      "path": "./ruleset/lancidr.yaml"
    },
    "line": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/line.mrs",
      "path": "./ruleset/line.mrs"
    },
    "mastercard": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/mastercard.mrs",
      "path": "./ruleset/mastercard.mrs"
    },
    "meta": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/meta.mrs",
      "path": "./ruleset/meta.mrs"
    },
    "netflix": {
      "type": "http",
      "interval": 86400,
      "behavior": "classical",
      "format": "text",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/DustinWin/domain-list-custom/domains/netflix.list",
      "path": "./ruleset/netflix.list"
    },
    "microsoft_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geoip/microsoft.mrs",
      "path": "./ruleset/microsoft_ip.mrs"
    },
    "microsoft": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/microsoft.mrs",
      "path": "./ruleset/microsoft.mrs"
    },
    "paypal": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs",
      "path": "./ruleset/paypal.mrs"
    },
    "patreon": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/patreon.mrs",
      "path": "./ruleset/patreon.mrs"
    },
    "pikpak": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/pikpak.mrs",
      "path": "./ruleset/pikpak.mrs"
    },
    "pixiv": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/pixiv.mrs",
      "path": "./ruleset/pixiv.mrs"
    },
    "private": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/private.txt",
      "path": "./ruleset/private.yaml"
    },
    "proxy@direct": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/echs-top/proxy/main/mrs/domain/proxy@direct.mrs",
      "path": "./rules/proxy@direct.mrs"
    },
    "reddit": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/reddit.mrs",
      "path": "./ruleset/reddit.mrs"
    },
    "spotify": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.mrs",
      "path": "./ruleset/spotify.mrs"
    },
    "steam_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geoip/steam.mrs",
      "path": "./ruleset/steam_ip.mrs"
    },
    "steam": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/steam.mrs",
      "path": "./ruleset/steam.mrs"
    },
    "stripe": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/stripe.mrs",
      "path": "./ruleset/stripe.mrs"
    },
    "telegram_domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs",
      "path": "./rules/telegram_domain.mrs"
    },
    "telegramcidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/reddishJade/private_proxy/main/Mihomo/Provider/telegram%40ip.mrs",
      "path": "./ruleset/telegramcidr.mrs"
    },
    "twitter-x-aggregate": {
      "type": "http",
      "interval": 86400,
      "behavior": "classical",
      "format": "yaml",
      "url": "https://magicrule.pages.dev/data/_shared/artifacts/Twitter_classical_d405159ccf6c8682.yaml",
      "path": "./ruleset/twitter-x-aggregate.yaml"
    },
    "twitter-x-domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/twitter.mrs",
      "path": "./ruleset/twitter/x-domain.mrs"
    },
    "twitter-x-ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/twitter.mrs",
      "path": "./ruleset/twitter/x-ip.mrs"
    },
    "visa": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/visa.mrs",
      "path": "./ruleset/visa.mrs"
    },
    "wise": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/wise.mrs",
      "path": "./ruleset/wise.mrs"
    }
  },
  "sub-rules": {
    "fanqie": [
      "DOMAIN,p6-ad-sign.byteimg.com,REJECT",
      "DOMAIN,p9-ad-sign.byteimg.com,REJECT",
      "DOMAIN,i.snssdk.com,REJECT",
      "DOMAIN,i-lq.snssdk.com,REJECT",
      "DOMAIN,dig.bdurl.net,REJECT",
      "DOMAIN-KEYWORD,zijieapi,REJECT",
      "DOMAIN,activity-ag.awemeughun.com,REJECT",
      "DOMAIN,mcs.snssdk.com,REJECT",
      "DOMAIN,tnc3-alisc1.snssdk.com,REJECT",
      "DOMAIN,security-lq.snssdk.com,REJECT",
      "DOMAIN,tnc3-aliec2.snssdk.com,REJECT",
      "DOMAIN,is.snssdk.com,REJECT",
      "DOMAIN,v6-novelapp.ixigua.com,REJECT",
      "DOMAIN-WILDCARD,*novelapp.ixigua.com,REJECT",
      "DOMAIN,msync-im1-vip6-std.easemob.com,REJECT",
      "DOMAIN,apd-pcdnwxlogin.teg.tencent-cloud.net,REJECT",
      "DOMAIN,api.iegadp.qq.com,REJECT",
      "DOMAIN,sf3-ttcdn-tos.pstatp.com,REJECT",
      "DOMAIN-SUFFIX,pglstatp-toutiao.com,REJECT",
      "DOMAIN-SUFFIX,byteorge.com,REJECT",
      "DOMAIN-SUFFIX,bytegoofy.com,REJECT",
      "DOMAIN-SUFFIX,bytedance.com,REJECT",
      "IP-CIDR,49.71.37.101/32,REJECT,no-resolve",
      "IP-CIDR,117.71.105.23/32,REJECT,no-resolve",
      "IP-CIDR,218.94.207.205/32,REJECT,no-resolve",
      "IP-CIDR,117.92.229.188/32,REJECT,no-resolve",
      "IP-CIDR,101.36.166.16/32,REJECT,no-resolve",
      "IP-CIDR,180.96.2.114/32,REJECT,no-resolve",
      "DOMAIN-WILDCARD,*.pangolin-sdk-toutiao.com,REJECT",
      "DOMAIN-WILDCARD,*.pglstatp-toutiao.com,REJECT",
      "DOMAIN-WILDCARD,*.pstatp.com,REJECT",
      "DOMAIN,gurd.snssdk.com,REJECT",
      "DOMAIN-WILDCARD,*.byteimg.com,REJECT",
      "DOMAIN-WILDCARD,*.snssdk.com,REJECT",
      "DOMAIN-WILDCARD,*.pangolin-sdk-toutiao,REJECT",
      "DOMAIN-WILDCARD,*.pangolin-sdk-toutiao.*,REJECT",
      "DOMAIN-WILDCARD,*.pstatp.com.*,REJECT",
      "DOMAIN-WILDCARD,*.pglstatp-toutiao.com.*,REJECT",
      "DOMAIN-WILDCARD,gurd.snssdk.com.*,REJECT",
      "MATCH,DIRECT"
    ]
  },
  "rules": [
    "AND,((NETWORK,UDP)," +
      "(DST-PORT,3478-3479/5349-5350/19302-19309)," +
      "(NOT,((RULE-SET,geolocation-cn)))," +
      "(NOT,((RULE-SET,cn-additional)))," +
      "(NOT,((RULE-SET,apple-cn)))," +
      "(NOT,((RULE-SET,microsoft-cn)))," +
      "(NOT,((RULE-SET,games-cn)))," +
      "(NOT,((RULE-SET,games)))),REJECT",
    "RULE-SET,HijackingPlus,REJECT",
    "SUB-RULE,(PROCESS-NAME,com.dragon.read.oversea.gp),fanqie",
    "DOMAIN,gh-proxy.com,DIRECT",
    "DOMAIN-SUFFIX,alipayeshop.com,DIRECT",
    // 国内 Apple、Microsoft、Games 分类直连统一交给下面五个规则集。
    "RULE-SET,echs_direct_ip,DIRECT,no-resolve",
    "RULE-SET,geolocation-cn,DIRECT",
    "RULE-SET,cn-additional,DIRECT",
    "RULE-SET,apple-cn,DIRECT",
    "RULE-SET,microsoft-cn,DIRECT",
    "RULE-SET,games-cn,DIRECT",
    "DOMAIN-SUFFIX,ac.cn,DIRECT",
    "DOMAIN-SUFFIX,xdf.cn,DIRECT",
    "DOMAIN,clash.razord.top,DIRECT",
    "DOMAIN,yacd.haishan.me,DIRECT",
    "PROCESS-NAME,svchost.exe,DIRECT",
    "DOMAIN-SUFFIX,ts.net,Tailscale",
    "RULE-SET,private,DIRECT,no-resolve",
    "RULE-SET,lancidr,DIRECT,no-resolve",
    "DOMAIN-WILDCARD,*.deepseek.com,DIRECT",
    "DOMAIN-WILDCARD,*.portal101.cn,DIRECT",
    "DOMAIN-SUFFIX,edgekey.net,DIRECT",
    "DOMAIN-KEYWORD,ikuuu,🌍 PROXY",
    "DOMAIN,lumina.lumina00001.com,DIRECT",
    "DOMAIN,gfwsb.yiku.xyz,DIRECT",
    "DOMAIN,bsub.douyincdns.com,DIRECT",
    "DOMAIN,sub.rinkitotokiku.online,DIRECT",
    // 已核实支持 Emby 的 Android 播放器进程，统一分流至 🎬 Emby。
    "PROCESS-NAME,com.mountains.hills,🎬 Emby",
    "PROCESS-NAME,com.hamhub.app,🎬 Emby",
    "PROCESS-NAME,com.oumi.utility.media.hub,🎬 Emby",
    "PROCESS-NAME,com.feifeiduck.capyplayer,🎬 Emby",
    "PROCESS-NAME,com.attempt.afusekt,🎬 Emby",
    "PROCESS-NAME,com.hush.yamby,🎬 Emby",
    "PROCESS-NAME,com.railux.mobile,🎬 Emby",
    // Emby 进程规则需先于 CloudFront 通用直连规则，避免其流量被优先直连。
    "RULE-SET,googlefcm,FCM",
    // 通用直连规则优先，剩余 Apple / Microsoft 域名和 IP 再进入海外组。
    // Bybit 静态资源位于 Microsoft 规则集内，优先保留金融支付分流。
    "RULE-SET,microsoft_ip,💠 海外微软,no-resolve",
    "RULE-SET,microsoft,💠 海外微软",
    "RULE-SET,apple_ip,🍎 海外苹果,no-resolve",
    "RULE-SET,apple,🍎 海外苹果",
    "RULE-SET,proxy@direct,🌍 PROXY",
    "PROCESS-NAME-REGEX,.*nagram.*,📲 Telegram",
    "PROCESS-NAME-REGEX,.*telegram.*,📲 Telegram",
    "RULE-SET,telegramcidr,📲 Telegram,no-resolve",
    "RULE-SET,telegram_domain,📲 Telegram",
    // Manus AI：覆盖 Manus Desktop、Manus Helper 及 Android 客户端进程
    "RULE-SET,google,🔎 Google",
    "RULE-SET,google-cn,🔎 Google",
    "RULE-SET,Gemini_Domain,🔎 Google",
    "RULE-SET,meta,♾️ Meta",
    // Muse：覆盖 Muse Android 客户端进程及官网与后端域名
    "DOMAIN-SUFFIX,muse.ai,♾️ Meta",
    "DOMAIN,hatch-api.meta.ai,♾️ Meta",
    "DOMAIN,api.meta.ai,♾️ Meta",
    "DOMAIN,agent.meta.ai,♾️ Meta",
    "DOMAIN-SUFFIX,metaaivm.com,♾️ Meta",
    "DOMAIN,auth.meta.com,♾️ Meta",
    "DOMAIN,meta.graph.meta.com,♾️ Meta",
    "DOMAIN,edge-metaclaw-http.c10r.facebook.com,♾️ Meta",
    "DOMAIN,shortwave.facebook.com,♾️ Meta",
    "DOMAIN,node.hatch.one,♾️ Meta",
    "PROCESS-NAME,com.facebook.aura,♾️ Meta",
    "DOMAIN-SUFFIX,hark.com,🤖 AI大模型",
    "DOMAIN-SUFFIX,wabi.ai,🤖 AI大模型",
    "DOMAIN-SUFFIX,tabbyml.com,🤖 AI大模型",
    "DOMAIN,api.anthropic.com,🤖 AI大模型",
    "DOMAIN,console.anthropic.com,🤖 AI大模型",
    "DOMAIN,statsig.anthropic.com,🤖 AI大模型",
    "DOMAIN,status.anthropic.com,🤖 AI大模型",
    "DOMAIN,sentry.anthropic.com,🤖 AI大模型",
    "DOMAIN,support.anthropic.com,🤖 AI大模型",
    "DOMAIN,mcp-proxy.anthropic.com,🤖 AI大模型",
    "DOMAIN,platform.claude.com,🤖 AI大模型",
    "DOMAIN,code.claude.com,🤖 AI大模型",
    "DOMAIN,downloads.claude.ai,🤖 AI大模型",
    "DOMAIN,bridge.claudeusercontent.com,🤖 AI大模型",
    "DOMAIN,cdn.growthbook.io,🤖 AI大模型",
    "DOMAIN,cdn.usefathom.com,🤖 AI大模型",
    "DOMAIN,registry.npmjs.org,🤖 AI大模型",
    "DOMAIN,storage.googleapis.com,🤖 AI大模型",
    "DOMAIN,formulae.brew.sh,🤖 AI大模型",
    "DOMAIN,http-intake.logs.us5.datadoghq.com,🤖 AI大模型",
    "DOMAIN,browser-intake-us5-datadoghq.com,🤖 AI大模型",
    "DOMAIN,servd-anthropic-website.b-cdn.net,🤖 AI大模型",
    "DOMAIN,claudemcpclient.com,🤖 AI大模型",
    "DOMAIN,claudemcpcontent.com,🤖 AI大模型",
    "DOMAIN-SUFFIX,anthropic.com,🤖 AI大模型",
    "DOMAIN-SUFFIX,claude.ai,🤖 AI大模型",
    "DOMAIN-SUFFIX,claude.com,🤖 AI大模型",
    "DOMAIN-SUFFIX,claudeusercontent.com,🤖 AI大模型",
    "DOMAIN-SUFFIX,clau.de,🤖 AI大模型",
    "DOMAIN-SUFFIX,modelcontextprotocol.io,🤖 AI大模型",
    "IP-CIDR,160.79.104.0/21,🤖 AI大模型,no-resolve",
    "IP-CIDR6,2607:6bc0::/48,🤖 AI大模型,no-resolve",
    "IP-CIDR,17.253.4.0/23,🤖 AI大模型,no-resolve",
    "RULE-SET,Grok_Domain,🤖 AI大模型",
    "DOMAIN,anthropic.com.cdn.cloudflare.net,🤖 AI大模型",
    "DOMAIN,anthropic-com.ghost.io,🤖 AI大模型",
    "DOMAIN-SUFFIX,sentry.io,🤖 AI大模型",
    "DOMAIN-SUFFIX,statsigapi.net,🤖 AI大模型",
    "DOMAIN-KEYWORD,datadog,🤖 AI大模型",
    "DOMAIN-KEYWORD,sift,🤖 AI大模型",
    "RULE-SET,ai-1,🤖 AI大模型",
    "RULE-SET,ai-2,🤖 AI大模型",
    "PROCESS-NAME,com.hark.android,🤖 AI大模型",
    "PROCESS-NAME,ai.wabi.android.app,🤖 AI大模型",
    "PROCESS-NAME-REGEX,(?i).*(manus|tech\\.butterfly\\.app).*,🤖 AI大模型",
    "PROCESS-NAME-REGEX,(?i).*claude.*,🤖 AI大模型",
    "PROCESS-NAME-REGEX,(?i).*anthropic.*,🤖 AI大模型",
    "RULE-SET,spotify,🎧 Spotify",
    "RULE-SET,discord,💬 Discord",
    "RULE-SET,reddit,👽 Reddit",
    "RULE-SET,netflix,🎥 Netflix",
    "RULE-SET,patreon,💝 Patreon",
    "RULE-SET,ehentai,📚 EHentai",
    "RULE-SET,pikpak,☁️ PikPak",
    "RULE-SET,line,💬 LINE",
    // 指定加密货币 API 仍走金融组；其余 cloudfront.net 域名按默认链路走。
    "DOMAIN,d3r7nsslvs6aaf.cloudfront.net,💳 金融支付",
    "RULE-SET,category-cryptocurrency,💳 金融支付",
    "RULE-SET,paypal,💳 金融支付",
    "RULE-SET,stripe,💳 金融支付",
    "RULE-SET,visa,💳 金融支付",
    "RULE-SET,mastercard,💳 金融支付",
    "RULE-SET,wise,💳 金融支付",
    "PROCESS-NAME,com.bitget.exchange,💳 金融支付",
    "PROCESS-NAME,pro.huobi,💳 金融支付",
    "PROCESS-NAME,com.bitkeep.wallet,💳 金融支付",
    "PROCESS-NAME,com.bybit.app,💳 金融支付",
    "PROCESS-NAME,com.ton_keeper,💳 金融支付",
    "PROCESS-NAME,io.gramwallet.app,💳 金融支付",
    "PROCESS-NAME,com.coinbase.android,💳 金融支付",
    "PROCESS-NAME,com.okinc.okex.gp,💳 金融支付",
    "PROCESS-NAME,com.kraken.invest.app,💳 金融支付",
    "PROCESS-NAME,co.mona.android,💳 金融支付",
    "PROCESS-NAME,app.phantom,💳 金融支付",
    "PROCESS-NAME,com.paypal.android.p2pmobile,💳 金融支付",
    "PROCESS-NAME,com.binance.dev,💳 金融支付",
    "PROCESS-NAME,com.binance.us,💳 金融支付",
    "PROCESS-NAME,com.gateio.gateio,💳 金融支付",
    "PROCESS-NAME,com.kubi.kucoin,💳 金融支付",
    "PROCESS-NAME,com.mexcpro.client,💳 金融支付",
    "PROCESS-NAME,com.wallet.crypto.trustapp,💳 金融支付",
    "PROCESS-NAME,io.metamask,💳 金融支付",
    "PROCESS-NAME,im.token.app,💳 金融支付",
    "PROCESS-NAME,vip.mytokenpocket,💳 金融支付",
    "PROCESS-NAME,io.safepal.wallet,💳 金融支付",
    "PROCESS-NAME,exodusmovement.exodus,💳 金融支付",
    "PROCESS-NAME,org.toshi,💳 金融支付",
    "PROCESS-NAME-REGEX,.*twitter.*,✖️ Twitter",
    "RULE-SET,twitter-x-ip,✖️ Twitter,no-resolve",
    "RULE-SET,twitter-x-domain,✖️ Twitter",
    "RULE-SET,twitter-x-aggregate,✖️ Twitter",
    "RULE-SET,steam_ip,🎮 Steam平台（非下载/CDN）,no-resolve",
    "RULE-SET,steam,🎮 Steam平台（非下载/CDN）",
    "PROCESS-NAME,bf6.exe,🎮 Games-Global",
    "RULE-SET,games,🎮 Games-Global",
    "RULE-SET,TikTok,🎵 TikTok",
    "MATCH,🌍 PROXY"
  ]
};

// 模板中所有 type=load-balance 的隐藏子组：跟随「🔄 负载均衡」开关启停，不单独提供开关。
const LOAD_BALANCE_STRATEGY_GROUP_NAMES = TEMPLATE['proxy-groups']
  .filter((group) => group && group.type === 'load-balance')
  .map((group) => group.name);
const LOAD_BALANCE_POSITION_GROUP_NAMES = new Set([
  '🔄 负载均衡',
  ...LOAD_BALANCE_STRATEGY_GROUP_NAMES,
]);

function findPriorityGroupInsertionIndex(proxyGroups) {
  const priorities = [
    LOAD_BALANCE_POSITION_GROUP_NAMES,
    new Set(['♻️ 自动选择']),
    new Set(['👉 手动选择']),
  ];
  const groups = Array.isArray(proxyGroups) ? proxyGroups : [];
  for (const names of priorities) {
    let lastIndex = -1;
    groups.forEach((group, index) => {
      if (group && names.has(group.name)) lastIndex = index;
    });
    if (lastIndex >= 0) return lastIndex + 1;
  }
  // 最顶层 🌍 PROXY 是模板必备组，固定放在首位。
  return 1;
}

// 纯功能开关的面板图标：这些开关不生成策略组，图标只出现在开关面板（由 serviceConfigs 引用）。
const FEATURE_SWITCH_ICONS = {
  '强制证书验证': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-SSL.svg',
  '关闭 Reality 增强': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Spark.svg',
  '试开启节点UDP': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-udp.svg',
  'IPv6优先': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-ipv6-prefer.svg',
  '高倍率筛选': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-filter-high.svg',
  '低倍率筛选': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-filter-low.svg',
  '代理节点 DNS 使用 TCP': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-TCP.png',
  '关闭WebRTC阻断': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-webrtc-block.svg',
};

// Bettbox 的可视化开关图标：客户端会读取全局 serviceConfigs（name 对应 ruleOptionsEnable 的 key，
// icon 为该开关行显示的图标）。上面只覆盖代理组；功能开关的图标来源：
// 关闭FCM直连 从 FCM 代理组的 icon 字段派生；
// 其余功能开关在此直接指定固定图标；所有图标均由本仓库 assets/icons 通过 jsDelivr 提供。
const serviceConfigs = TEMPLATE['proxy-groups']
  .filter(
    (group) =>
      group &&
      typeof group.name === 'string' &&
      Object.prototype.hasOwnProperty.call(ruleOptionsEnable, group.name)
  )
  .map((group) => ({
    name: group.name,
    icon: group.icon
  }))
  .concat([
    {
      name: '关闭FCM直连',
      icon: (TEMPLATE['proxy-groups'].find((group) => group && group.name === 'FCM') || {}).icon
    },
    {
      name: '关闭Tailscale直连',
      icon: (TEMPLATE['proxy-groups'].find((group) => group && group.name === 'Tailscale') || {}).icon
    },
    {
      name: '强制证书验证',
      icon: FEATURE_SWITCH_ICONS['强制证书验证']
    },
    {
      name: '关闭 Reality 增强',
      icon: FEATURE_SWITCH_ICONS['关闭 Reality 增强']
    },
    {
      name: '试开启节点UDP',
      icon: FEATURE_SWITCH_ICONS['试开启节点UDP']
    },
    {
      name: 'IPv6优先',
      icon: FEATURE_SWITCH_ICONS['IPv6优先']
    },
    {
      name: 'TGDC实验分流',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Telegram.svg'
    },
    {
      name: 'SKK广告拦截',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-adblock.svg'
    },
    {
      name: '国家/地区分组',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Global.svg'
    },
    {
      name: '高倍率筛选',
      icon: FEATURE_SWITCH_ICONS['高倍率筛选']
    },
    {
      name: '低倍率筛选',
      icon: FEATURE_SWITCH_ICONS['低倍率筛选']
    },
    {
      name: '入口解析',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Domestic.svg'
    },
    {
      name: '代理节点 DNS 使用 TCP',
      icon: FEATURE_SWITCH_ICONS['代理节点 DNS 使用 TCP']
    },
    {
      name: '关闭WebRTC阻断',
      icon: FEATURE_SWITCH_ICONS['关闭WebRTC阻断']
    }
  ]);

// ============================================================================
// DNS 与 hosts 处理（私有 DNS 提取 + hosts 真假域名映射）
// ============================================================================

// 判断 server 是否为 IP
function isIPAddress(host) {
  if (!host || typeof host !== "string") {
    return true;
  }

  // IPv4 地址
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return true;
  }

  // IPv6 地址
  if (host.includes(":")) {
    return true;
  }

  return false;
}

function normalizeDomain(domain) {
  return typeof domain === "string"
    ? domain.trim().toLowerCase().replace(/\.+$/, "")
    : "";
}

// 通配符域名匹配
function matchWildcardDomain(rule, host) {
  rule = normalizeDomain(rule);
  host = normalizeDomain(host);

  if (!rule || !host) {
    return false;
  }

  // 形如 +.example.com 的规则
  if (rule.startsWith("+.")) {
    const suffix = rule.substring(2);
    return (
      host === suffix ||
      host.endsWith("." + suffix)
    );
  }

  // 形如 .example.com 的规则
  if (rule.startsWith(".")) {
    const suffix = rule.substring(1);
    return host.endsWith("." + suffix);
  }

  // * 通配符
  if (rule.includes("*")) {
    const ruleParts = rule.split(".");
    const hostParts = host.split(".");

    return (
      ruleParts.length === hostParts.length &&
      ruleParts.every((part, index) =>
        part === "*" || part === hostParts[index]
      )
    );
  }

  // 普通域名
  return host === rule;
}

function asNameserverList(nameservers) {
  if (Array.isArray(nameservers)) {
    return nameservers.filter(value => typeof value === "string");
  }

  return typeof nameservers === "string" ? [nameservers] : [];
}
// 比较两个 nameserver 列表是否等价（忽略顺序与重复，按集合比较）
function sameNameserverSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && Array.from(sa).every((value) => sb.has(value));
}

// 公共 DNS 识别表：用于区分“公共可直连 DNS”和“机场/用户的私有 DNS”。
// 数据参考 MyClash 9ae100c4 的公共 DNS 列表；这里只借用端点，不照搬其处理逻辑。
const publicDnsList = [
  // 国内
  '223.5.5.5', '223.6.6.6', '119.29.29.29', '1.12.12.12',
  '120.53.53.53', '114.114.114.114', '180.76.76.76', '1.2.4.8',
  '116.116.116.116', '101.226.4.6', '123.125.81.6', '180.184.1.1',
  '180.184.2.2',
  // 国内公共 DNS 补充（参考 MyClash）
  '2400:3200::1', '2400:3200:baba::1', '119.28.28.28',
  '182.254.116.116', '182.254.118.118', '2402:4e00::',
  '114.114.115.115', '114.114.114.119', '114.114.115.119',
  '114.114.114.110', '114.114.115.110', '2400:da00::6666',
  '210.2.4.8', '2001:dc7:1000::1', '218.30.118.6',
  '140.207.198.6', '2400:8800:1::6', '2400:8800:2::6',
  '117.50.11.11', '117.50.22.22', '52.80.66.66', '117.50.10.10',
  '52.80.52.52', '117.50.60.30', '52.80.60.30',
  '101.6.6.6', '2001:da8::666', '240c::6666', '240c::6644',
  '202.141.162.123', '202.141.178.13',
  // 国外
  '1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4', '9.9.9.9',
  '149.112.112.112', '208.67.222.222', '208.67.220.220',
  '94.140.14.14', '94.140.15.15', '76.76.2.0', '76.76.10.0',
  '185.228.168.9', '185.228.169.9', '77.88.8.8', '77.88.8.1',
  '156.154.70.1', '156.154.71.1',
  // 国外公共 DNS 补充（参考 MyClash）
  '1.1.1.2', '1.0.0.2', '1.1.1.3', '1.0.0.3',
  '2606:4700:4700::1111', '2606:4700:4700::1001',
  '2606:4700:4700::1112', '2606:4700:4700::1002',
  '2606:4700:4700::1113', '2606:4700:4700::1003',
  '2001:4860:4860::8888', '2001:4860:4860::8844',
  '9.9.9.10', '9.9.9.11', '149.112.112.10', '149.112.112.11',
  '2620:fe::fe', '2620:fe::9',
  '208.67.222.123', '208.67.220.123', '2620:119:35::35',
  '2620:119:53::53', '2620:119:35::123', '2620:119:53::123',
  '94.140.14.15', '94.140.15.16', '2a10:50c0::ad1:ff',
  '2a10:50c0::ad2:ff', '2a10:50c0::bad1:ff', '2a10:50c0::bad2:ff',
  '76.76.19.19', '76.223.122.150',
  '185.228.168.10', '185.228.169.11', '185.228.168.168',
  '185.228.169.168', '2a0d:2a00:1::2', '2a0d:2a00:2::2',
  '2a02:6b8::feed:0ff', '2a02:6b8:0:1::feed:0ff',
  '156.154.70.2', '156.154.71.2', '2610:a1:1018::1',
  '2610:a1:1019::1', '194.242.2.2', '2a07:e340::2',
  '74.82.42.42', '2001:470:20::2',
  // 公共 DoH/DoT 主机名（完整域名，避免宽泛品牌关键字误判私有端点）
  'dns.alidns.com', 'doh.pub', 'dot.pub', 'dns.pub',
  'dnspod.cn', 'dnspod.net', 'dns.baidu.com', 'dns.google',
  'dns.cloudflare.com', 'cloudflare-dns.com', 'one.one.one.one',
  'dns.quad9.net', 'doh.opendns.com', 'resolver1.opendns.com',
  'resolver2.opendns.com', 'dns.nextdns.io',
  'dns.adguard-dns.com', 'family.adguard-dns.com',
  'unfiltered.adguard-dns.com', 'dns.cnnic.cn', 'doh.360.cn',
  'dot.360.cn', 'dns.360.cn', 'onedns.net', 'dns.apple.com'
];

function dnsServerAddress(value) {
  const str = String(value);
  const hashIndex = str.indexOf('#');
  return (hashIndex === -1 ? str : str.slice(0, hashIndex)).toLowerCase();
}

function normalizeDnsIpAddress(value) {
  const rawAddress = String(value).trim().toLowerCase();
  const zoneIndex = rawAddress.indexOf('%');
  const address = rawAddress.includes(':') && zoneIndex !== -1
    ? rawAddress.slice(0, zoneIndex)
    : rawAddress;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) {
    const octets = address.split('.').map(Number);
    return octets.every((octet) => octet <= 255)
      ? octets.join('.')
      : '';
  }
  if (!address.includes(':') || address.includes('.')) {
    return '';
  }
  const sections = address.split('::');
  if (sections.length > 2) {
    return '';
  }
  const left = sections[0] ? sections[0].split(':') : [];
  const right = sections.length === 2 && sections[1]
    ? sections[1].split(':')
    : [];
  const missing = 8 - left.length - right.length;
  if ((sections.length === 2 && missing < 1) ||
      (sections.length === 1 && missing !== 0)) {
    return '';
  }
  const parts = [...left, ...Array(missing).fill('0'), ...right];
  if (parts.length !== 8 || parts.some((part) => !/^[\da-f]{1,4}$/.test(part))) {
    return '';
  }
  return parts.map((part) => parseInt(part, 16).toString(16).padStart(4, '0')).join(':');
}

function isPublicDnsServer(value) {
  const hostname = dnsServerHostname(value);
  return publicDnsList.some((dns) => {
    const candidate = dns.toLowerCase();
    if (isIPAddress(candidate)) {
      const normalizedHostname = normalizeDnsIpAddress(hostname);
      return normalizedHostname !== '' &&
        normalizedHostname === normalizeDnsIpAddress(candidate);
    }
    return hostname === candidate || hostname.endsWith('.' + candidate);
  });
}

// 逐域规则迁移到节点专用 policy 时只剔除公共解析器；保留原值形态。
function filterPublicDnsPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return {};
  }
  const filteredPolicy = {};
  for (const [rule, value] of Object.entries(policy)) {
    const nonPublicNameservers = asNameserverList(value).filter(
      (nameserver) => !isPublicDnsServer(nameserver)
    );
    if (nonPublicNameservers.length === 0) {
      continue;
    }
    filteredPolicy[rule] = Array.isArray(value)
      ? nonPublicNameservers
      : nonPublicNameservers[0];
  }
  return filteredPolicy;
}

function dnsServerEndpoint(value) {
  let endpoint = dnsServerAddress(value);
  const schemeIndex = endpoint.indexOf('://');
  if (schemeIndex !== -1) {
    endpoint = endpoint.slice(schemeIndex + 3);
  }
  const pathIndex = endpoint.search(/[/?]/);
  if (pathIndex !== -1) {
    endpoint = endpoint.slice(0, pathIndex);
  }
  return endpoint;
}

function dnsServerHostname(value) {
  const endpoint = dnsServerEndpoint(value).trim().toLowerCase();
  if (endpoint.startsWith('[')) {
    const closingBracket = endpoint.indexOf(']');
    return closingBracket === -1
      ? endpoint
      : endpoint.slice(1, closingBracket);
  }
  const colonCount = (endpoint.match(/:/g) || []).length;
  const hostname = colonCount === 1 && /:\d+$/.test(endpoint)
    ? endpoint.replace(/:\d+$/, '')
    : endpoint;
  return hostname.replace(/\.$/, '');
}

// system/loopback 不是公共 DNS，但也不作为机场私有上游的全局兜底来源。
function isNonPrivateNodeDnsServer(value) {
  const address = dnsServerAddress(value).trim();
  const hostname = dnsServerHostname(value);
  const normalizedIp = normalizeDnsIpAddress(hostname);
  const isIpv4Loopback = /^127\./.test(normalizedIp);
  const isIpv6Loopback = normalizedIp === '0000:0000:0000:0000:0000:0000:0000:0001';
  return /^system(?::\/\/)?$/i.test(address) ||
    isIpv4Loopback || isIpv6Loopback || hostname === 'localhost' ||
    hostname.endsWith('.localhost') || hostname === 'localhost.localdomain';
}

function hasDnsListenLoop(dns) {
  if (!dns || typeof dns !== "object") {
    return false;
  }
  const listen = dnsServerEndpoint(dns.listen);
  if (!listen) {
    return false;
  }

  const policyValues = (policy) => {
    if (!policy || typeof policy !== "object") {
      return [];
    }
    return Object.values(policy).flatMap((value) =>
      Array.isArray(value) ? value : [value]
    ).filter((value) => typeof value === "string");
  };

  const candidates = [
    policyValues(dns["proxy-server-nameserver-policy"]),
    asNameserverList(dns["proxy-server-nameserver"]),
    policyValues(dns["nameserver-policy"]),
    asNameserverList(dns.nameserver)
  ];

  // 按优先级检查实际参与解析的来源：
  // proxy-server-nameserver-policy > proxy-server-nameserver > nameserver-policy > nameserver.
  for (const group of candidates) {
    if (group.length > 0) {
      return group.some((nameserver) => dnsServerEndpoint(nameserver) === listen);
    }
  }
  return false;
}

// 从原始配置中提取 DNS 合并来源。
function collectDnsRules(config) {
  const result = {
    nameservers: [],
    nameserverPolicy: {},
    proxyServerNameservers: [],
    proxyServerNameserverPolicy: {},
    hosts: {}
  };

  const dns = config && config.dns;

  if (!dns || typeof dns !== "object") {
    return result;
  }

  result.nameservers = asNameserverList(dns.nameserver);

  if (
    dns["nameserver-policy"] &&
    typeof dns["nameserver-policy"] === "object"
  ) {
    Object.assign(result.nameserverPolicy, dns["nameserver-policy"]);
  }

  result.proxyServerNameservers = asNameserverList(
    dns["proxy-server-nameserver"]
  );

  if (
    dns["proxy-server-nameserver-policy"] &&
    typeof dns["proxy-server-nameserver-policy"] === "object"
  ) {
    Object.assign(result.proxyServerNameserverPolicy, dns["proxy-server-nameserver-policy"]);
  }

  // hosts 只有在 use-hosts=true 且 DNS 监听形成闭环时才参与节点 server 改写
  if (
    dns["use-hosts"] === true &&
    hasDnsListenLoop(dns) &&
    config.hosts &&
    typeof config.hosts === "object"
  ) {
    Object.assign(result.hosts, config.hosts);
  }

  return result;
}

// 解析 hosts 多级映射链：目标仍是域名时逐级跟随，直到终点为 IP、无更多映射或成环
function resolveHostsChain(startDomain, hosts) {
  const chain = [];
  const visited = new Set();
  let current = normalizeDomain(startDomain);

  while (current && !visited.has(current)) {
    visited.add(current);

    let rule = null;
    let value = "";
    for (const candidate in hosts) {
      if (matchWildcardDomain(candidate, current)) {
        const mapped = hosts[candidate];
        const first = Array.isArray(mapped) ? mapped[0] : mapped;
        value = typeof first === "string" ? first.trim() : "";
        rule = candidate;
        break;
      }
    }

    if (!rule) {
      return { target: current, chain, type: "domain" };
    }

    chain.push(rule);

    if (!value || isIPAddress(value)) {
      return { target: value, chain, type: "ip" };
    }

    current = value;
  }

  return { target: "", chain, type: "cycle" };
}

// 出现同一个域名规则 key 时，订阅原始配置(true) 还是模板(false) 优先（模板目前未配置
// proxy-server-nameserver-policy，因此该开关当前实际只影响订阅来源之间的合并）
const NAMESERVER_POLICY_PREFER_ORIGINAL = true;

// 根据节点域名补充 DNS
function smartMergeDnsNode(config, result) {
  const rules = collectDnsRules(config);
  const proxyServerNameserverPolicy = filterPublicDnsPolicy(
    rules.proxyServerNameserverPolicy
  );
  const nameserverPolicy = filterPublicDnsPolicy(rules.nameserverPolicy);
  const newPolicy = result.dns["proxy-server-nameserver-policy"] || {};
  const newHosts = result.hosts || {};
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];

  // 保留节点映射前的域名以识别并迁移策略，并单独记录实际连接时仍需 DNS 的域名。
  // 映射到 IP 的节点不生成 DNS policy；映射到另一域名时仅保留最终域名的策略。
  const originalDomains = new Set();
  const originalDomainByProxy = new Map();
  for (const proxy of proxies) {
    if (!proxy || typeof proxy !== "object") {
      continue;
    }
    const server = proxy.server;
    if (typeof server !== "string" || isIPAddress(server)) {
      continue;
    }
    const domain = normalizeDomain(server);
    if (domain) {
      originalDomains.add(domain);
      originalDomainByProxy.set(proxy, domain);
    }
  }

  // 先处理 hosts：在匹配 DNS 策略之前改写 proxy.server。
  // 部分订阅的 proxy-server-nameserver 是 udp://127.0.0.1:xxx，并配合本地 mihomo DNS
  // 模块内的 hosts；从 hosts 改写 proxy.server 可以绕开这一依赖。
  for (const proxy of proxies) {
    if (!proxy || typeof proxy !== "object") {
      continue;
    }
    const server = proxy.server;
    if (typeof server !== "string" || isIPAddress(server)) {
      continue;
    }
    const domain = normalizeDomain(server);
    if (!domain) {
      continue;
    }

    for (const rule in rules.hosts) {
      if (!matchWildcardDomain(rule, domain)) {
        continue;
      }
      const mapped = rules.hosts[rule];
      const value = Array.isArray(mapped) ? mapped[0] : mapped;
      const target = typeof value === "string" ? value.trim() : "";

      if (!target) {
        newHosts[rule] = rules.hosts[rule];
        continue;
      }

      if (isIPAddress(target)) {
        proxy.server = target;
        break;
      }

      const resolved = resolveHostsChain(target, rules.hosts);
      if (!resolved || resolved.type === "cycle") {
        continue;
      }

      proxy.server = resolved.target;
      break;
    }
  }

  const nodeDomainPairs = [];
  const allNodeDomains = new Set(originalDomains);
  const effectiveNodeDomains = new Set();
  for (const [proxy, original] of originalDomainByProxy) {
    const server = proxy.server;
    const effective =
      typeof server === "string" && !isIPAddress(server)
        ? normalizeDomain(server)
        : "";
    nodeDomainPairs.push({ original, effective });
    if (effective) {
      allNodeDomains.add(effective);
      effectiveNodeDomains.add(effective);
    }
  }

  // 原始域名用于识别可迁移的订阅策略；输出 policy 仅匹配实际连接域名。
  const matchesAnyNodeDomain = (rule) => {
    for (const domain of allNodeDomains) {
      if (matchWildcardDomain(rule, domain)) {
        return true;
      }
    }
    return false;
  };
  const matchesEffectiveNodeDomain = (rule) => {
    for (const domain of effectiveNodeDomains) {
      if (matchWildcardDomain(rule, domain)) {
        return true;
      }
    }
    return false;
  };

  const setPolicy = (rule, value) => {
    if (
      NAMESERVER_POLICY_PREFER_ORIGINAL ||
      !Object.prototype.hasOwnProperty.call(newPolicy, rule)
    ) {
      newPolicy[rule] = value;
    }
  };

  const domainCovered = (domain) => {
    for (const rule of Object.keys(newPolicy)) {
      if (matchWildcardDomain(rule, domain)) {
        return true;
      }
    }
    return false;
  };

  const policyMatchesDomain = (policy, domain) =>
    Object.keys(policy).some((rule) => matchWildcardDomain(rule, domain));

  // 当某条策略只命中 hosts 改写前的域名、而最终域名并未被该策略覆盖时，
  // 为最终域名补一个精确 policy。原始域名仅充当迁移来源，不写入最终结果；
  // 已直接匹配最终域名的原始规则保持原样并优先。
  const copyResolvedDomainPolicy = (policy, shouldCopy) => {
    for (const { original, effective } of nodeDomainPairs) {
      if (
        !effective ||
        effective === original ||
        !shouldCopy({ original, effective }) ||
        policyMatchesDomain(policy, effective)
      ) {
        continue;
      }
      for (const rule of Object.keys(policy)) {
        if (matchWildcardDomain(rule, original)) {
          setPolicy(effective, policy[rule]);
        }
      }
    }
  };

  // 优先级：proxy-server-nameserver-policy > proxy-server-nameserver（仅私有）
  //           > nameserver-policy > nameserver（仅私有）。
  const matchedProxyPolicyKeys = new Set();
  for (const rule in proxyServerNameserverPolicy) {
    if (!matchesAnyNodeDomain(rule)) {
      continue;
    }
    matchedProxyPolicyKeys.add(rule);
    if (matchesEffectiveNodeDomain(rule)) {
      setPolicy(rule, proxyServerNameserverPolicy[rule]);
    }
  }

  // proxy-server-nameserver-policy 命中原域名时，其优先级也覆盖映射后的最终域名。
  copyResolvedDomainPolicy(proxyServerNameserverPolicy, () => true);

  const proxyCoveredDomains = new Set();
  for (const rule of matchedProxyPolicyKeys) {
    for (const { original, effective } of nodeDomainPairs) {
      if (
        matchWildcardDomain(rule, original) ||
        (effective && matchWildcardDomain(rule, effective))
      ) {
        proxyCoveredDomains.add(original);
        if (effective) {
          proxyCoveredDomains.add(effective);
        }
      }
    }
  }

  const privateProxyServerNameservers = rules.proxyServerNameservers.filter(
    (nameserver) => !isPublicDnsServer(nameserver) && !isNonPrivateNodeDnsServer(nameserver)
  );
  const privateNameservers = rules.nameservers.filter(
    (nameserver) => !isPublicDnsServer(nameserver) && !isNonPrivateNodeDnsServer(nameserver)
  );

  if (privateProxyServerNameservers.length > 0) {
    for (const domain of effectiveNodeDomains) {
      if (!domainCovered(domain)) {
        setPolicy(domain, privateProxyServerNameservers.slice());
      }
    }
  } else {
    for (const rule in nameserverPolicy) {
      if (matchedProxyPolicyKeys.has(rule)) {
        continue;
      }
      if (!matchesAnyNodeDomain(rule)) {
        continue;
      }
      const matchingEffectiveDomains = Array.from(effectiveNodeDomains).filter(
        (domain) => matchWildcardDomain(rule, domain)
      );
      const uncoveredEffectiveDomains = matchingEffectiveDomains.filter(
        (domain) => !proxyCoveredDomains.has(domain)
      );
      if (uncoveredEffectiveDomains.length === 0) {
        continue;
      }
      if (uncoveredEffectiveDomains.length < matchingEffectiveDomains.length) {
        // 通配规则只对未被更高优先级 policy 覆盖的节点写精确条目，避免一处重叠丢弃整条规则。
        for (const domain of uncoveredEffectiveDomains) {
          setPolicy(domain, nameserverPolicy[rule]);
        }
      } else if (matchesEffectiveNodeDomain(rule)) {
        setPolicy(rule, nameserverPolicy[rule]);
      }
    }

    // nameserver-policy 同样可随 hosts 的域名映射链路传递，但不得覆盖更高优先级。
    copyResolvedDomainPolicy(
      nameserverPolicy,
      ({ effective }) => !proxyCoveredDomains.has(effective)
    );

    if (privateNameservers.length > 0) {
      for (const domain of effectiveNodeDomains) {
        if (!domainCovered(domain)) {
          setPolicy(domain, privateNameservers.slice());
        }
      }
    }
  }

  // 移除与全局兜底相同的策略项，并对取值去重。
  const globalProxyServerNameservers = asNameserverList(
    result.dns["proxy-server-nameserver"]
  );
  if (globalProxyServerNameservers.length > 0) {
    for (const rule of Object.keys(newPolicy)) {
      if (
        sameNameserverSet(
          asNameserverList(newPolicy[rule]),
          globalProxyServerNameservers
        )
      ) {
        delete newPolicy[rule];
      }
    }
  }
  for (const rule of Object.keys(newPolicy)) {
    const value = asNameserverList(newPolicy[rule]);
    const deduped = Array.from(new Set(value));
    if (deduped.length !== value.length) {
      newPolicy[rule] = deduped;
    }
  }

  result.dns["proxy-server-nameserver-policy"] = newPolicy;

  if (Object.keys(newHosts).length) {
    result.hosts = newHosts;
  }
}

// ============================================================================
// 公共节点筛选（TGDC 实验分流、国家/地区分组、入口解析共用）
// ============================================================================

// JS 名称规范化只用于匹配，不会修改节点名称或配置。
// 有意保留 ZWNJ、ZWJ 和 Unicode 变体选择符。
const JS_INVISIBLE_CHARACTER_NORMALIZATION_REGEX =
  /[\u00AD\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u115F\u1160\u3164\uFFA0]/g;

function normalizeNameForJsMatching(name) {
  return typeof name === 'string'
    ? name.replace(JS_INVISIBLE_CHARACTER_NORMALIZATION_REGEX, '')
    : name;
}

// 国家/地区分组与 TGDC 共用此 JS 候选节点排除规则。
const JS_MODULE_INFORMATION_NODE_EXCLUSION_REGEX =
  /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

function filterModuleCandidateProxies(originalProxies) {
  const proxies = Array.isArray(originalProxies) ? originalProxies : [];
  // 入口节点命名空间由「国内入口解析」节定义；这里排除它们，避免注入节点被当成订阅节点。
  const entryNamePattern = new RegExp(ENTRY_RESOLUTION_EXCLUDE_FILTER);
  return proxies.filter((proxy) => {
    if (!proxy || typeof proxy !== 'object' || typeof proxy.name !== 'string') {
      return false;
    }
    const type = String(proxy.type || '').toLowerCase();
    if (type === 'direct' || type === 'reject' || type === 'rematch') {
      return false;
    }
    const name = normalizeNameForJsMatching(proxy.name);
    if (name.trim().length === 0) return false;
    if (
      JS_MODULE_INFORMATION_NODE_EXCLUSION_REGEX.test(name) ||
      name === '国内入口解析' ||
      entryNamePattern.test(name)
    ) return false;
    return true;
  });
}

// JS 国家/地区定义及别名；同一节点可以命中多个地区。
// TGDC 与国家/地区组共用这些模式进行 JS 候选归属匹配。
// 缩写别名使用统一边界字符类，包含开尔文符号（K）和长 s（ſ），使 JS /iu 与 RE2 的 Unicode 大小写折叠保持一致，避免依赖引擎行为不同的 \b。
const COUNTRY_REGION_DEFINITIONS = [
  { key: 'hk', name: '🇨🇳🇭🇰 香港', jsPattern: /🇭🇰|香港|Hong\s*Kong|HongKong|(^|[^A-Za-z0-9_Kſ])HK($|[^A-Za-z0-9_Kſ])|(^|[^A-Za-z0-9_Kſ])HKG($|[^A-Za-z0-9_Kſ])/iu },
  { key: 'tw', name: '🇨🇳🇹🇼 台湾', jsPattern: /🇹🇼|台湾|台灣|臺灣|台北|臺北|高雄|Taipei|Taiwan|\bTW\b|\bTWN\b/iu },
  { key: 'mo', name: '🇨🇳🇲🇴 澳门', jsPattern: /🇲🇴|澳门|澳門|Macau|Macao|\bMO\b|\bMAC\b/iu },
  { key: 'jp', name: '🇯🇵 日本', jsPattern: /🇯🇵|日本|东京|東京|大阪|京都|Tokyo|Osaka|Kyoto|Japan|\bJP\b|\bJPN\b/iu },
  { key: 'sg', name: '🇸🇬 新加坡', jsPattern: /🇸🇬|新加坡|狮城|獅城|Singapore|(^|[^A-Za-z0-9_Kſ])SG($|[^A-Za-z0-9_Kſ])|(^|[^A-Za-z0-9_Kſ])SGP($|[^A-Za-z0-9_Kſ])/iu },
  { key: 'kr', name: '🇰🇷 韩国', jsPattern: /🇰🇷|韩国|韓國|首尔|首爾|Seoul|Korea|\bKR\b|\bKOR\b/iu },
  { key: 'my', name: '🇲🇾 马来西亚', jsPattern: /🇲🇾|马来西亚|馬來西亞|吉隆坡|Kuala\s*Lumpur|Malaysia|\bMY\b|\bMYS\b/iu },
  { key: 'us', name: '🇺🇸 美国', jsPattern: /🇺🇸|美国|美國|洛杉矶|洛杉磯|纽约|紐約|西雅图|西雅圖|硅谷|矽谷|华盛顿|華盛頓|旧金山|舊金山|芝加哥|休斯顿|休士頓|迈阿密|邁阿密|波士顿|波士頓|拉斯维加斯|拉斯維加斯|圣何塞|聖荷西|Miami|(^|[^A-Za-z0-9_Kſ])MIA($|[^A-Za-z0-9_Kſ])|Los\s*Angeles|New\s*York|Seattle|Washington|San\s*Francisco|Chicago|Houston|Boston|Las\s*Vegas|San\s*Jose|United\s*States|(^|[^A-Za-z0-9_Kſ])USA($|[^A-Za-z0-9_Kſ])|(^|[^A-Za-z0-9_Kſ])US($|[^A-Za-z0-9_Kſ])/iu },
  { key: 'ca', name: '🇨🇦 加拿大', jsPattern: /🇨🇦|加拿大|多伦多|多倫多|温哥华|溫哥華|Toronto|Vancouver|Canada|\bCA\b|\bCAN\b/iu },
  { key: 'gb', name: '🇬🇧 英国', jsPattern: /🇬🇧|英国|英國|伦敦|倫敦|London|United\s*Kingdom|\bUK\b|\bGB\b|\bGBR\b/iu },
  { key: 'fr', name: '🇫🇷 法国', jsPattern: /🇫🇷|法国|法國|巴黎|Paris|France|\bFR\b|\bFRA\b/iu },
  { key: 'nl', name: '🇳🇱 荷兰', jsPattern: /🇳🇱|荷兰|荷蘭|阿姆斯特丹|Amsterdam|(^|[^A-Za-z0-9_Kſ])AMS($|[^A-Za-z0-9_Kſ])|Netherlands|(^|[^A-Za-z0-9_Kſ])NL($|[^A-Za-z0-9_Kſ])|(^|[^A-Za-z0-9_Kſ])NLD($|[^A-Za-z0-9_Kſ])/iu },
  { key: 'de', name: '🇩🇪 德国', jsPattern: /🇩🇪|德国|德國|法兰克福|法蘭克福|柏林|Frankfurt|Berlin|Germany|\bDE\b|\bDEU\b/iu },
  { key: 'au', name: '🇦🇺 澳大利亚', jsPattern: /🇦🇺|澳大利亚|澳大利亞|悉尼|墨尔本|墨爾本|Sydney|Melbourne|Perth|Australia|\bAU\b|\bAUS\b/iu },
];

function matchCountryRegionDefinitionsForJs(rawProxyName) {
  if (typeof rawProxyName !== 'string') return [];
  const matchableName = normalizeNameForJsMatching(rawProxyName);
  return COUNTRY_REGION_DEFINITIONS.filter((definition) => definition.jsPattern.test(matchableName));
}

// ============================================================================
// 各开关的具体实现（在模板结果上按开关改写 proxies / proxy-groups / rules / dns / hosts）
// ============================================================================

// ============================================================================
// Telegram DC/地区实验分流（仅在 ruleOptionsEnable['TGDC实验分流'] 为 true 时注入）
// DC1/DC3：Miami；DC2/DC4：Amsterdam；DC5：Singapore。
// 静态 CIDR 无法可靠拆分同城 DC，因此策略组使用 DC 对命名。
// ============================================================================
const TGDC_RULE_PROVIDERS = {
  telegram_dc1_dc3_miami: {
    type: 'inline',
    behavior: 'classical',
    payload: [
      // DC1 Pluto / DC3 Aurora — Miami, USA
      'IP-CIDR,91.108.12.0/22,no-resolve',
      'IP-CIDR,149.154.172.0/22,no-resolve',
      'IP-CIDR6,2001:b28:f23d::/48,no-resolve',
    ],
  },
  telegram_dc2_dc4_amsterdam: {
    type: 'inline',
    behavior: 'classical',
    payload: [
      // DC2 Venus / DC4 Vesta — Amsterdam, Netherlands
      'IP-CIDR,91.108.58.0/23,no-resolve',
      'IP-CIDR,91.108.4.0/22,no-resolve',
      'IP-CIDR,91.108.8.0/22,no-resolve',
      'IP-CIDR,149.154.160.0/21,no-resolve',
      'IP-CIDR,95.161.64.0/20,no-resolve',
      'IP-CIDR,91.105.192.0/23,no-resolve',
      'IP-CIDR,185.76.151.0/24,no-resolve',
      // Akiker / entire6548 / RClogs 的 EU 补充候选。
      'IP-CIDR,5.28.192.0/18,no-resolve',
      'IP-CIDR,109.239.140.0/24,no-resolve',
      'IP-CIDR6,2001:67c:4e8::/48,no-resolve',
      'IP-CIDR6,2a0a:f280:203::/48,no-resolve',
    ],
  },
  telegram_dc5_sg: {
    type: 'inline',
    behavior: 'classical',
    payload: [
      // DC5 Flora — Singapore
      'IP-CIDR,91.108.16.0/22,no-resolve',
      'IP-CIDR,91.108.56.0/23,no-resolve',
      'IP-CIDR,149.154.168.0/22,no-resolve',
      'IP-CIDR6,2001:b28:f23c::/48,no-resolve',
      'IP-CIDR6,2001:b28:f23f::/48,no-resolve',
    ],
  },
};

const TGDC_FALLBACK_ADDITIONAL_EXCLUDE_FILTER = /国内/iu;

// TGDC 无地区候选时，按订阅原始顺序列出合格的非国内顶层节点作保底选择。
// 若仍无候选，使用 COMPATIBLE；empty-fallback 只接受单节点名称，不能填写策略组或多个节点。
function selectTelegramDcFallbackNodes(eligibleCandidates) {
  return eligibleCandidates
    .filter((proxy) => !TGDC_FALLBACK_ADDITIONAL_EXCLUDE_FILTER.test(normalizeNameForJsMatching(proxy.name)))
    .map((proxy) => proxy.name);
}

const TGDC_PROXY_GROUP_DEFINITIONS = [
  {
    name: '📲 Telegram-DC1-DC3-Miami',
    regionKeys: ['us'],
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-United_States.svg',
  },
  {
    name: '📲 Telegram-DC2-DC4-Amsterdam',
    regionKeys: ['nl'],
    // 阿姆斯特丹组使用荷兰地区 SVG 旗帜图标。
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Netherlands.svg',
  },
  {
    name: '📲 Telegram-DC5-SG',
    // 根据实际互联情况，DC5 组同时纳入香港与新加坡节点。
    regionKeys: ['sg', 'hk'],
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Singapore.svg',
  },
];

function buildTelegramDcProxyGroups(originalProxies) {
  const proxies = Array.isArray(originalProxies) ? originalProxies : [];
  const eligibleCandidates = filterModuleCandidateProxies(proxies);
  const fallbackNodeNames = selectTelegramDcFallbackNodes(eligibleCandidates);
  return TGDC_PROXY_GROUP_DEFINITIONS.map((definition) => {
    const regionNodeNames = eligibleCandidates
      .filter((proxy) => matchCountryRegionDefinitionsForJs(proxy.name)
        .some((region) => definition.regionKeys.includes(region.key)))
      .map((proxy) => proxy.name);
    return {
      name: definition.name,
      type: 'select',
      proxies: regionNodeNames.length > 0 ? regionNodeNames : fallbackNodeNames.slice(),
      'empty-fallback': 'COMPATIBLE',
      icon: definition.icon,
    };
  });
}

const TGDC_RULES = [
  'RULE-SET,telegram_dc1_dc3_miami,📲 Telegram-DC1-DC3-Miami,no-resolve',
  'RULE-SET,telegram_dc2_dc4_amsterdam,📲 Telegram-DC2-DC4-Amsterdam,no-resolve',
  'RULE-SET,telegram_dc5_sg,📲 Telegram-DC5-SG,no-resolve',
  'PROCESS-NAME-REGEX,.*nagram.*,📲 Telegram(兜底)',
  'PROCESS-NAME-REGEX,.*telegram.*,📲 Telegram(兜底)',
  'RULE-SET,telegramcidr,📲 Telegram(兜底),no-resolve',
  'RULE-SET,telegram_domain,📲 Telegram(兜底)',
];

// ============================================================================
// TGDC 实验分流：只在开关为 true 时修改 result。
// ============================================================================
function applyTelegramDcExperiment(result, originalProxies) {
  if (ruleOptionsEnable['TGDC实验分流'] !== true) {
    return;
  }

  // 将 Telegram 规则集插入原 Telegram 规则集之前；保持其他 provider 的原顺序。
  const originalProviders = result['rule-providers'] || {};
  const providersWithTelegramDc = {};
  let inserted = false;
  Object.keys(originalProviders).forEach((name) => {
    if (!inserted && name === 'telegram_domain') {
      Object.assign(providersWithTelegramDc, deepClone(TGDC_RULE_PROVIDERS));
      inserted = true;
    }
    providersWithTelegramDc[name] = originalProviders[name];
  });
  if (!inserted) {
    Object.assign(providersWithTelegramDc, deepClone(TGDC_RULE_PROVIDERS));
  }
  result['rule-providers'] = providersWithTelegramDc;

  // 显示位置按最终仍启用的组回退：Telegram 兜底组前；否则依次在自动选择、手动选择、负载均衡之后；都不可用则追加到底部。
  const telegramFallback = (result['proxy-groups'] || []).find(
    (group) => group && group.name === '📲 Telegram'
  );
  if (telegramFallback) {
    telegramFallback.name = '📲 Telegram(兜底)';
  }

  const proxyGroups = result['proxy-groups'] || [];
  const autoSelectIndex = proxyGroups.findIndex(
    (group) => group && group.name === '♻️ 自动选择'
  );
  const manualSwitchIndex = proxyGroups.findIndex(
    (group) => group && group.name === '👉 手动选择'
  );
  const loadBalanceIndex = proxyGroups.findIndex(
    (group) => group && group.name === '🔄 负载均衡'
  );
  const fallbackIndex = proxyGroups.findIndex(
    (group) => group && group.name === '📲 Telegram(兜底)'
  );
  const telegramFallbackEnabled = ruleOptionsEnable['📲 Telegram'] !== false;
  const autoSelectEnabled = ruleOptionsEnable['♻️ 自动选择'] !== false;
  const manualSwitchEnabled = ruleOptionsEnable['👉 手动选择'] !== false;
  const loadBalanceEnabled = ruleOptionsEnable['🔄 负载均衡'] !== false;
  let insertIndex = proxyGroups.length;
  if (telegramFallbackEnabled && fallbackIndex >= 0) {
    insertIndex = fallbackIndex;
  } else if (autoSelectEnabled && autoSelectIndex >= 0) {
    insertIndex = autoSelectIndex + 1;
  } else if (manualSwitchEnabled && manualSwitchIndex >= 0) {
    insertIndex = manualSwitchIndex + 1;
  } else if (loadBalanceEnabled && loadBalanceIndex >= 0) {
    insertIndex = loadBalanceIndex + 1;
  }
  proxyGroups.splice(
    insertIndex,
    0,
    ...deepClone(buildTelegramDcProxyGroups(originalProxies))
  );
  result['proxy-groups'] = proxyGroups;

  // 把具体 DC/地区规则放在 Telegram 全量规则之前；原 Telegram 规则改指向兜底组。
  if (!Array.isArray(result.rules)) {
    result.rules = [];
  }
  const telegramRulePattern = (rule) =>
    typeof rule === 'string' &&
    (rule.includes(',📲 Telegram') || rule.includes('RULE-SET,telegramcidr') || rule.includes('RULE-SET,telegram_domain'));
  let firstTelegramRuleIndex = result.rules.findIndex(telegramRulePattern);
  const retainedRules = result.rules.filter((rule) => !telegramRulePattern(rule));
  if (firstTelegramRuleIndex < 0) {
    firstTelegramRuleIndex = retainedRules.length;
  } else {
    firstTelegramRuleIndex = Math.min(firstTelegramRuleIndex, retainedRules.length);
  }
  retainedRules.splice(firstTelegramRuleIndex, 0, ...TGDC_RULES);
  result.rules = retainedRules;
}

// ============================================================================
// 节点字段修正开关（顶层节点通路）
// 强制证书验证 / Reality 增强 / 试开启节点UDP / IPv6优先 就地改写顶层节点；
// provider 节点由 applyProviderOverrides() 走 override 通道，开关语义与这里一致。
// ============================================================================
function applyNodeFieldOverrides(proxies) {
  const nodeList = Array.isArray(proxies) ? proxies : [];

  // Reality 增强开关处理：默认开启（保留写入）；「关闭 Reality 增强」打开后跳过该字段。
  const disableRealityEnhance = ruleOptionsEnable['关闭 Reality 增强'] === true;

  if (!disableRealityEnhance) {
    for (const proxy of nodeList) {
      const reality = proxy?.["reality-opts"];

      if (!reality || typeof reality !== "object") {
        continue;
      }

      if (
        typeof reality["public-key"] !== "string" ||
        reality["public-key"].length === 0 ||
        typeof reality["short-id"] !== "string" ||
        reality["short-id"].length === 0
      ) {
        continue;
      }

      if (reality["support-x25519mlkem768"] === true) {
        continue;
      }

      reality["support-x25519mlkem768"] = true;
    }
  }

  // 节点 UDP 开关处理：默认关闭时不修改；开启时为订阅顶层节点设置 udp: true。
  const enableNodeUdp = ruleOptionsEnable['试开启节点UDP'] === true;

  if (enableNodeUdp) {
    for (const proxy of nodeList) {
      if (!proxy || typeof proxy !== "object") {
        continue;
      }

      proxy.udp = true;
    }
  }

  // 节点 TLS 证书验证开关处理：默认不干预订阅节点原有 skip-cert-verify；
  //     开启「强制证书验证」时统一置为 false（强制校验证书），对全部节点一视同仁
  const forceCertVerify = ruleOptionsEnable['强制证书验证'] === true;

  for (const proxy of nodeList) {
    if (!proxy || typeof proxy !== "object") {
      continue;
    }

    if (forceCertVerify) {
      proxy["skip-cert-verify"] = false;
    }
  }

  // IPv6 优先开关：仅在开启时修改订阅节点的通用 ip-version 字段。
  // ipv6 已经是仅 IPv6，保持不变；ipv6-prefer 切换为 ipv6；其他值（包括缺失）设为 ipv6-prefer。
  const preferIPv6 = ruleOptionsEnable['IPv6优先'] === true;

  if (preferIPv6) {
    for (const proxy of nodeList) {
      if (!proxy || typeof proxy !== 'object') {
        continue;
      }

      if (proxy['ip-version'] === 'ipv6') {
        continue;
      }
      proxy['ip-version'] = proxy['ip-version'] === 'ipv6-prefer' ? 'ipv6' : 'ipv6-prefer';
    }
  }
}

// ============================================================================
// provider 节点级覆写（仅在对应开关开启时写入 provider.override）
// provider 节点由内核运行时加载，脚本无法逐节点改写；override 是唯一能让
// 逐节点改写生效的通道，且只支持固定字段：
//   skip-cert-verify / udp / ip-version（无法改写嵌套 reality-opts）。
// 关闭开关时不写入，保留订阅原有的 override 内容。
// ============================================================================
function applyProviderOverrides(result) {
  const providers = result['proxy-providers'];
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) return;

  const forceCertVerify = ruleOptionsEnable['强制证书验证'] === true;
  const enableNodeUdp = ruleOptionsEnable['试开启节点UDP'] === true;
  const preferIPv6 = ruleOptionsEnable['IPv6优先'] === true;
  if (!forceCertVerify && !enableNodeUdp && !preferIPv6) return;

  Object.keys(providers).forEach((name) => {
    const provider = providers[name];
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) return;
    const override = provider.override && typeof provider.override === 'object' &&
      !Array.isArray(provider.override) ? provider.override : {};

    if (forceCertVerify) {
      override['skip-cert-verify'] = false;
    }
    if (enableNodeUdp) {
      override.udp = true;
    }
    // provider 侧读不到节点原值：统一使用可回退的 ipv6-prefer，
    // 不把已是 ipv6-prefer 的节点提升为仅 IPv6。
    if (preferIPv6) {
      override['ip-version'] = 'ipv6-prefer';
    }
    provider.override = override;
  });
}

// ============================================================================
// SKK 广告拦截（仅在 ruleOptionsEnable['SKK广告拦截'] 为 true 时注入）
// 规则集来自 SukkaW/Surge 的 reject 系列，只取核心四件：基础域名集、non_ip
// 关键词/通配规则、reject-drop 遥测静默丢弃、ip 劫持/botnet 集。
// 不含 reject_extra（源经上游降级，误杀与性能代价更高）、reject_phishing
// （反钓鱼，非广告）与 reject-no-drop（PCDN，非广告且 mihomo 无对应策略）。
// ============================================================================

// 开关图标：serviceConfigs 中同值内联（模板区求值时本常量尚未定义）。
const SKK_ADBLOCK_ICON =
  'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-adblock.svg';

const SKK_RULE_PROVIDERS = {
  skk_reject: {
    type: 'http',
    interval: 43200,
    behavior: 'domain',
    format: 'text',
    url: 'https://ruleset.skk.moe/Clash/domainset/reject.txt',
    path: './ruleset/skk_reject.txt',
  },
  skk_reject_non_ip: {
    type: 'http',
    interval: 43200,
    behavior: 'classical',
    format: 'text',
    url: 'https://ruleset.skk.moe/Clash/non_ip/reject.txt',
    path: './ruleset/skk_reject_non_ip.txt',
  },
  skk_reject_drop: {
    type: 'http',
    interval: 43200,
    behavior: 'classical',
    format: 'text',
    url: 'https://ruleset.skk.moe/Clash/non_ip/reject-drop.txt',
    path: './ruleset/skk_reject_drop.txt',
  },
  skk_reject_ip: {
    type: 'http',
    interval: 43200,
    behavior: 'classical',
    format: 'text',
    url: 'https://ruleset.skk.moe/Clash/ip/reject.txt',
    path: './ruleset/skk_reject_ip.txt',
  },
};

const SKK_PROXY_GROUP = {
  name: '🛑 广告拦截',
  type: 'select',
  proxies: ['REJECT', 'REJECT-DROP', 'PASS'],
  icon: SKK_ADBLOCK_ICON,
};

// drop 与 ip 不走广告拦截组：前者是会疯狂重试的遥测域名，必须静默丢弃；
// 后者是劫持/botnet IP。二者在广告拦截组切 PASS 时也不应被放行。
const SKK_RULES = [
  'RULE-SET,skk_reject_drop,REJECT-DROP',
  'RULE-SET,skk_reject,🛑 广告拦截',
  'RULE-SET,skk_reject_non_ip,🛑 广告拦截',
  'RULE-SET,skk_reject_ip,REJECT,no-resolve',
];

// ============================================================================
// SKK 广告拦截：只在开关为 true 时修改 result。
// ============================================================================
function applySkkAdBlock(result) {
  if (ruleOptionsEnable['SKK广告拦截'] !== true) {
    return;
  }

  // 规则集插入全部 provider 之前，与规则同为 REJECT 守卫定位；保持其余 provider 原顺序。
  const originalProviders = result['rule-providers'] || {};
  const providersWithSkk = deepClone(SKK_RULE_PROVIDERS);
  Object.keys(originalProviders).forEach((name) => {
    providersWithSkk[name] = originalProviders[name];
  });
  result['rule-providers'] = providersWithSkk;

  // 入口组已先按相同定位点插入；只按入口开关偏移，不检查 PROXY 或入口组是否存在。
  const proxyGroups = result['proxy-groups'] || [];
  const insertIndex = findPriorityGroupInsertionIndex(proxyGroups);
  const reserveEntryGroupPosition = ruleOptionsEnable['入口解析'] === true ? 1 : 0;
  proxyGroups.splice(insertIndex + reserveEntryGroupPosition, 0, deepClone(SKK_PROXY_GROUP));
  result['proxy-groups'] = proxyGroups;

  // 规则插入现有 REJECT 守卫之后：跳过开头的 AND 守卫与 HijackingPlus，
  // 使广告规则先于镜像直连与国内直连命中；找不到守卫锚点时放最前面。
  if (!Array.isArray(result.rules)) {
    result.rules = [];
  }
  const hijackingIndex = result.rules.findIndex(
    (rule) => typeof rule === 'string' && rule.startsWith('RULE-SET,HijackingPlus,')
  );
  const insertRuleIndex = hijackingIndex >= 0 ? hijackingIndex + 1 : 0;
  result.rules.splice(insertRuleIndex, 0, ...SKK_RULES);
}

// 只识别节点名称中明确标记的数值倍率（如 0.5x、2x、5×），不推断“高倍”等模糊标签。
function getExplicitProxyMultipliers(name) {
  if (typeof name !== 'string') return [];
  const matches = name.matchAll(/(?:^|[^A-Za-z0-9_.])(\d+(?:\.\d+)?)\s*[x×](?![A-Za-z0-9_])/giu);
  return Array.from(matches, (match) => Number(match[1]));
}

// 过滤订阅顶层节点，并清理静态引用；必须在地区分组之前调用，
// 让地区组只用幸存节点生成，避免某地区节点全被筛除后留下空子组（内核报 `use` or `proxies` missing）。
// 返回被剔除的节点名集合，供地区分组判定候选。
// provider 节点不受影响：它们由内核按 include-all 展开，仍会出现在相关组里。
function applyProxyMultiplierFilters(result) {
  const removedProxyNames = new Set();
  const filterHigh = ruleOptionsEnable['高倍率筛选'] === true;
  const filterLow = ruleOptionsEnable['低倍率筛选'] === true;
  if (!filterHigh && !filterLow) return removedProxyNames;
  if (!Array.isArray(result.proxies)) return removedProxyNames;

  result.proxies = result.proxies.filter((proxy) => {
    if (!proxy || typeof proxy !== 'object' || typeof proxy.name !== 'string') return true;
    const multipliers = getExplicitProxyMultipliers(proxy.name);
    const shouldRemove = multipliers.some(
      (multiplier) => (filterHigh && multiplier >= 2) || (filterLow && multiplier <= 0.5)
    );
    if (shouldRemove) removedProxyNames.add(proxy.name);
    return !shouldRemove;
  });

  if (removedProxyNames.size === 0) return removedProxyNames;
  const firstRemainingProxyName = result.proxies
    .map((proxy) => proxy && proxy.name)
    .find((name) => typeof name === 'string' && name.length > 0);
  if (!Array.isArray(result['proxy-groups'])) return removedProxyNames;

  result['proxy-groups'].forEach((group) => {
    if (!group || typeof group !== 'object') return;
    if (Array.isArray(group.proxies)) {
      group.proxies = group.proxies.filter((name) => !removedProxyNames.has(name));
    }
    if (removedProxyNames.has(group['default-selected'])) {
      if (firstRemainingProxyName) {
        group['default-selected'] = firstRemainingProxyName;
      } else {
        delete group['default-selected'];
      }
    }
  });

  return removedProxyNames;
}

const COUNTRY_REGION_PRIORITY_NAMES = new Set([
  '🇨🇳🇭🇰 香港',
  '🇨🇳🇹🇼 台湾',
  '🇨🇳🇲🇴 澳门',
  '🇺🇸 美国',
  '🇸🇬 新加坡',
  '🇯🇵 日本',
]);
const OTHER_COUNTRY_REGION_NAME = '🌐 其他国家/地区';
const COUNTRY_REGION_EXCLUDED_TARGET_GROUPS = new Set([
  '🌍 PROXY',
  '👉 手动选择',
  '♻️ 自动选择',
  '🔄 负载均衡',
]);
const COUNTRY_REGION_INJECTION_ANCHOR_NAMES = new Set([
  'DIRECT',
]);
const COUNTRY_REGION_CHILD_GROUP_TYPES = [
  { suffix: '自动选择', type: 'url-test' },
  { suffix: '自动回退', type: 'fallback' },
  { suffix: '负载均衡', type: 'load-balance' },
];

function countryRegionChildGroupName(parentName, suffix) {
  return parentName + ' · ' + suffix;
}

// 国家/地区父组图标。
const COUNTRY_REGION_PARENT_ICON =
  'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Global.svg';

// 候选只来自订阅顶层 proxies；provider 节点此阶段尚未加载，不参与地区分组。
function buildCountryRegionProxyGroups(originalProxies) {
  const candidates = filterModuleCandidateProxies(originalProxies);
  const templateAutoGroup = (TEMPLATE['proxy-groups'] || []).find(
    (group) => group && group.name === '♻️ 自动选择'
  ) || {};
  const urlTestSettings = {};
  ['url', 'interval', 'tolerance', 'lazy', 'max-failed-times'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(templateAutoGroup, key)) {
      urlTestSettings[key] = templateAutoGroup[key];
    }
  });
  // fallback / load-balance 没有 tolerance，只继承文档列出的健康检查通用字段。
  const healthCheckSettings = {
    url: urlTestSettings.url || 'https://g.cn/generate_204',
    interval: urlTestSettings.interval || 300,
    lazy: urlTestSettings.lazy === undefined ? true : urlTestSettings.lazy,
  };
  if (urlTestSettings['max-failed-times'] !== undefined) {
    healthCheckSettings['max-failed-times'] = urlTestSettings['max-failed-times'];
  }
  const parentGroups = [];
  const childGroups = [];
  const regionMembershipByProxy = new Map();
  const otherRegionProxies = new Set();

  candidates.forEach((proxy) => {
    const matchedRegions = matchCountryRegionDefinitionsForJs(proxy.name);
    let selectedRegions = matchedRegions;

    // ① 仅未命中常用地区的候选节点归入“其他国家/地区”。
    if (matchedRegions.length === 0) {
      otherRegionProxies.add(proxy);
      selectedRegions = [];
    }

    // ② 恰好命中两个地区且跨越优先地区与其他常用地区时，只保留优先地区。
    if (
      selectedRegions.length === 2 &&
      selectedRegions.some((definition) => COUNTRY_REGION_PRIORITY_NAMES.has(definition.name)) &&
      selectedRegions.some((definition) => !COUNTRY_REGION_PRIORITY_NAMES.has(definition.name))
    ) {
      selectedRegions = selectedRegions.filter((definition) =>
        COUNTRY_REGION_PRIORITY_NAMES.has(definition.name)
      );
    }

    // ③ 处理后的地区组命中数达到三个及以上时，仅归入“其他国家/地区”。
    if (selectedRegions.length >= 3) {
      otherRegionProxies.add(proxy);
      selectedRegions = [];
    }

    regionMembershipByProxy.set(proxy, selectedRegions);
  });

  // ④ 非优先地区若只剩一个不同的有效节点，则不生成该地区组，并将该节点归入“其他”；
  //    只移除该地区归属，节点在其他常用地区的归属保持不变。优先地区的单节点组保留。
  COUNTRY_REGION_DEFINITIONS.forEach((definition) => {
    if (COUNTRY_REGION_PRIORITY_NAMES.has(definition.name)) return;
    const regionProxies = candidates.filter((proxy) =>
      regionMembershipByProxy.get(proxy).includes(definition)
    );
    const distinctNodeNames = new Set(regionProxies.map((proxy) => proxy.name));
    if (distinctNodeNames.size !== 1) return;
    regionProxies.forEach((proxy) => {
      regionMembershipByProxy.set(
        proxy,
        regionMembershipByProxy.get(proxy).filter((region) => region !== definition)
      );
      otherRegionProxies.add(proxy);
    });
  });

  COUNTRY_REGION_DEFINITIONS.forEach((definition) => {
    const regionProxies = candidates.filter((proxy) =>
      regionMembershipByProxy.get(proxy).includes(definition)
    );
    if (regionProxies.length === 0) return;
    const nodeNames = Array.from(new Set(regionProxies.map((proxy) => proxy.name)));
    // ⑥ 在⑤④处理后的有效节点数上排序：2–3节点先于 DIRECT/REJECT；优先单节点组也保留此顺序。
    const hasTwoToThreeNodes = nodeNames.length >= 2 && nodeNames.length <= 3;
    const hasPrioritySingleton = nodeNames.length === 1 && COUNTRY_REGION_PRIORITY_NAMES.has(definition.name);
    const children = nodeNames.length > 3
      ? COUNTRY_REGION_CHILD_GROUP_TYPES.map((childDefinition) => {
        const child = {
          name: countryRegionChildGroupName(definition.name, childDefinition.suffix),
          type: childDefinition.type,
          proxies: nodeNames.slice(),
          hidden: true,
        };
        if (childDefinition.type === 'url-test') {
          Object.assign(child, urlTestSettings);
        } else if (childDefinition.type === 'fallback' || childDefinition.type === 'load-balance') {
          Object.assign(child, healthCheckSettings);
          if (childDefinition.type === 'load-balance') {
            child.strategy = 'consistent-hashing';
          }
        }
        return child;
      })
      : [];
    parentGroups.push({
      name: definition.name,
      type: 'select',
      icon: COUNTRY_REGION_PARENT_ICON,
      proxies: children.length > 0
        ? children.map((child) => child.name).concat(['DIRECT', 'REJECT'], nodeNames)
        : hasTwoToThreeNodes || hasPrioritySingleton
          ? nodeNames.concat(['DIRECT', 'REJECT'])
          : ['DIRECT', 'REJECT', ...nodeNames],
    });
    childGroups.push(...children);
  });

  const otherProxies = candidates.filter((proxy) => otherRegionProxies.has(proxy));
  const otherNodeNames = Array.from(new Set(otherProxies.map((proxy) => proxy.name)));
  if (otherNodeNames.length > 0) {
    parentGroups.push({
      name: OTHER_COUNTRY_REGION_NAME,
      type: 'select',
      icon: COUNTRY_REGION_PARENT_ICON,
      'default-selected': otherNodeNames[0],
      proxies: ['DIRECT', 'REJECT', ...otherNodeNames],
    });
  }

  return { parentGroups, childGroups };
}

function appendCountryRegionParentsToTargets(proxyGroups, parentGroups, rules) {
  if (!Array.isArray(proxyGroups) || parentGroups.length === 0) return;

  const routedGroupNames = new Set();
  (Array.isArray(rules) ? rules : []).forEach((rule) => {
    const targetIndex = getRuleProxyTargetIndex(rule);
    if (targetIndex < 0) return;
    routedGroupNames.add(rule.split(',')[targetIndex].trim());
  });

  const existingGroupNames = new Set(
    proxyGroups.filter((group) => group && typeof group.name === 'string').map((group) => group.name)
  );
  const parentNames = parentGroups.map((group) => group.name);

  proxyGroups.forEach((group) => {
    // 只注入实际被规则使用且动态纳入节点的可见选择组。
    if (
      !group ||
      group.type !== 'select' ||
      group.hidden === true ||
      (group['include-all'] !== true && group['include-all-proxies'] !== true) ||
      COUNTRY_REGION_EXCLUDED_TARGET_GROUPS.has(group.name) ||
      !routedGroupNames.has(group.name)
    ) return;
    if (!Array.isArray(group.proxies)) group.proxies = [];
    const additions = parentNames.filter((name) => !group.proxies.includes(name));
    if (additions.length === 0) return;
    let lastNestedGroupIndex = -1;
    group.proxies.forEach((name, index) => {
      if (existingGroupNames.has(name) || COUNTRY_REGION_INJECTION_ANCHOR_NAMES.has(name)) lastNestedGroupIndex = index;
    });
    if (lastNestedGroupIndex >= 0) {
      group.proxies.splice(lastNestedGroupIndex + 1, 0, ...additions);
    } else {
      group.proxies.push(...additions);
    }
  });
}

function applyCountryRegionGrouping(result, originalProxies) {
  if (ruleOptionsEnable['国家/地区分组'] !== true) return;
  const { parentGroups, childGroups } = buildCountryRegionProxyGroups(originalProxies);
  if (parentGroups.length === 0) return;
  const proxyGroups = Array.isArray(result['proxy-groups']) ? result['proxy-groups'] : [];
  appendCountryRegionParentsToTargets(proxyGroups, parentGroups, result.rules);

  const fcmIndex = proxyGroups.findIndex((group) => group && group.name === 'FCM');
  if (fcmIndex >= 0) {
    proxyGroups.splice(fcmIndex, 0, ...parentGroups);
    // 隐藏组（FCM、Tailscale）需保持相邻：地区子组插到 FCM 之后连续的隐藏组之后。
    let insertAt = proxyGroups.findIndex((group) => group && group.name === 'FCM') + 1;
    while (insertAt < proxyGroups.length && proxyGroups[insertAt] && proxyGroups[insertAt].hidden === true) {
      insertAt += 1;
    }
    proxyGroups.splice(insertAt, 0, ...childGroups);
  } else {
    proxyGroups.push(...parentGroups, ...childGroups);
  }
  result['proxy-groups'] = proxyGroups;
}

// ============================================================================
// 国内入口解析（仅在 ruleOptionsEnable['入口解析'] 为 true 时注入）
// ============================================================================

// 保留命名空间：用于排除入口节点，并防止同名订阅节点抢占维护区定义。
const ENTRY_RESOLUTION_EXCLUDE_FILTER = '^(?:电信|联通|移动|云厂)节点-[0-9]{2,}$';

// 国内入口解析节点维护区
// 每个分类维护一个数组：可复制数组内的节点对象追加多个节点，填 [] 表示不配置。
// 仅维护 type / server / port 及其他 Mihomo 节点字段，无需填写 name；即使填写也会被覆盖。
// 名称按分类前缀和数组顺序独立编号，从 01 开始，超过 99 不截断。
const DOMESTIC_ENTRY_PROXIES = {
  // 中国电信
  telecom: [{
    type: 'socks5',
    server: '113.249.111.67',
    port: 1080
  }],

  // 中国联通
  unicom: [{
    type: 'http',
    server: '222.129.142.219',
    port: 9000
  }, {
    type: 'http',
    server: '101.251.204.174',
    port: 8080
  }],

  // 中国移动
  mobile: [{
    type: 'http',
    server: '47.121.139.13',
    port: 3128
  }],

  // 中国大陆云厂
  cloud: [{
    type: 'http',
    server: '39.104.59.56',
    port: 9098
  }, {
    type: 'http',
    server: '39.102.214.208',
    port: 9080
  }, {
    type: 'http',
    server: '120.79.217.196',
    port: 9000
  }, {
    type: 'http',
    server: '47.104.27.249',
    port: 8080
  }, {
    type: 'http',
    server: '39.102.214.199',
    port: 10002
  }, {
    type: 'http',
    server: '139.224.195.153',
    port: 8118
  }, {
    type: 'http',
    server: '47.121.129.129',
    port: 6379
  }, {
    type: 'http',
    server: '47.104.28.135',
    port: 8080
  }, {
    type: 'http',
    server: '47.104.27.165',
    port: 9080
  }, {
    type: 'http',
    server: '47.106.75.125',
    port: 3128
  }, {
    type: 'http',
    server: '39.104.69.76',
    port: 8081
  }, {
    type: 'http',
    server: '39.102.211.64',
    port: 8443
  }, {
    type: 'http',
    server: '106.14.91.83',
    port: 8181
  }]
};

// 分类与强制命名前缀的固定映射，不应修改；节点顺序不代表自动优先级。
const ENTRY_RESOLUTION_OPTIONS = [
  { category: 'telecom', prefix: '电信节点' },
  { category: 'unicom', prefix: '联通节点' },
  { category: 'mobile', prefix: '移动节点' },
  { category: 'cloud', prefix: '云厂节点' }
];

function selectedEntryResolutionOptions() {
  if (ruleOptionsEnable['入口解析'] !== true) {
    return [];
  }
  return ENTRY_RESOLUTION_OPTIONS.flatMap((option) => {
    const proxies = DOMESTIC_ENTRY_PROXIES[option.category];
    if (!Array.isArray(proxies)) {
      throw new Error('国内入口解析维护区 ' + option.category + ' 必须是节点数组（无节点请填 []）');
    }
    return proxies.map((proxy, index) => {
      if (!proxy || typeof proxy !== 'object' || Array.isArray(proxy)) {
        throw new Error('国内入口解析维护区 ' + option.category + ' 第 ' + (index + 1) + ' 项必须是节点对象');
      }
      return {
        proxyName: option.prefix + '-' + String(index + 1).padStart(2, '0'),
        proxy
      };
    });
  });
}

function withDnsPolicySuffix(value, suffix) {
  const str = String(value);
  const hashIndex = str.indexOf('#');
  return (hashIndex === -1 ? str : str.slice(0, hashIndex)) + suffix;
}

// 注入的入口节点属于订阅顶层节点；exclude-filter 由内核应用，会作用于 include-all
// 引入的 provider 节点，但只排除入口节点命名空间，不筛选 provider 节点本身。
function applyEntryResolution(result) {
  const options = selectedEntryResolutionOptions();
  if (options.length === 0) {
    return;
  }

  const groupName = '国内入口解析';
  const proxyNames = options.map((option) => option.proxyName);

  const isEntryName = (name) => typeof name === 'string' &&
    (normalizeNameForJsMatching(name) === groupName ||
      new RegExp(ENTRY_RESOLUTION_EXCLUDE_FILTER).test(normalizeNameForJsMatching(name)));
  result.proxies = (result.proxies || []).filter((proxy) => !isEntryName(proxy && proxy.name));
  options.forEach((option) => {
    const injectedProxy = deepClone(option.proxy);
    injectedProxy.name = option.proxyName;
    result.proxies.push(injectedProxy);
  });

  // include-all 会动态纳入刚注入的顶层节点，必须由内核排除；显式引用和默认选择也一起清理。
  // Mihomo 以反引号分隔多个 exclude-filter，避免拼接正则破坏原有内联标志或筛选语义。
  (result['proxy-groups'] || []).forEach((group) => {
    if (!group || group.name === groupName) return;
    const filters = typeof group['exclude-filter'] === 'string' && group['exclude-filter']
      ? group['exclude-filter'].split('`') : [];
    if (!filters.includes(ENTRY_RESOLUTION_EXCLUDE_FILTER)) {
      filters.push(ENTRY_RESOLUTION_EXCLUDE_FILTER);
    }
    group['exclude-filter'] = filters.join('`');
    if (Array.isArray(group.proxies)) {
      group.proxies = group.proxies.filter((name) => !isEntryName(name));
      if (group.proxies.length === 0 && !group['include-all'] &&
          !group['include-all-proxies'] && !group['include-all-providers'] &&
          !(Array.isArray(group.use) && group.use.length > 0)) {
        group.proxies = ['DIRECT'];
      }
    }
    if (isEntryName(group['default-selected'])) {
      delete group['default-selected'];
    }
  });

  const displayGroup = {
    name: groupName,
    type: 'select',
    proxies: proxyNames,
    url: 'https://connect.rom.miui.com/generate_204',
    'expected-status': '204',
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Domestic.svg'
  };
  const proxyGroups = result['proxy-groups'] || [];
  const existingDisplayGroupIndex = proxyGroups.findIndex(
    (group) => group && group.name === groupName
  );
  if (existingDisplayGroupIndex >= 0) proxyGroups.splice(existingDisplayGroupIndex, 1);
  const insertIndex = findPriorityGroupInsertionIndex(proxyGroups);
  proxyGroups.splice(insertIndex, 0, displayGroup);
  result['proxy-groups'] = proxyGroups;

  const suffix = '#' + groupName;
  result.dns['proxy-server-nameserver'] = asNameserverList(
    result.dns['proxy-server-nameserver']
  ).map((value) => withDnsPolicySuffix(value, suffix));

  const policy = result.dns['proxy-server-nameserver-policy'];
  if (!policy || typeof policy !== 'object') {
    return;
  }
  for (const rule of Object.keys(policy)) {
    const value = policy[rule];
    if (Array.isArray(value)) {
      policy[rule] = value.map((item) => withDnsPolicySuffix(item, suffix));
    } else if (typeof value === 'string') {
      policy[rule] = withDnsPolicySuffix(value, suffix);
    }
  }
}

// 仅处理最终节点 DNS：在 DNS/hosts 合并和入口解析后执行，不重新选择来源或改写节点。
function applyProxyDnsTcp(result) {
  if (ruleOptionsEnable['代理节点 DNS 使用 TCP'] !== true || !result.dns ||
      typeof result.dns !== 'object') {
    return;
  }

  const withTcp = (value) => {
    if (typeof value !== 'string') return value;
    const address = value.split('#', 1)[0];
    // 保留空值、非规范空白、system 及所有显式 URI 协议（含 dhcp://、rcode://）。
    if (!address || address !== address.trim() || /^system$/i.test(address) ||
        /^[a-z][a-z0-9+.-]*:\/\//i.test(address)) {
      return value;
    }
    // 无方括号 IPv6 必须按 URI 语法加方括号；保留其他参数。
    const colonCount = (address.match(/:/g) || []).length;
    if (!address.startsWith('[') && colonCount > 1) {
      return 'tcp://[' + address + ']' + value.slice(address.length);
    }
    return 'tcp://' + value;
  };
  const mapValue = (value) => Array.isArray(value) ? value.map(withTcp) : withTcp(value);
  const dns = result.dns;
  if (Object.prototype.hasOwnProperty.call(dns, 'proxy-server-nameserver')) {
    dns['proxy-server-nameserver'] = mapValue(dns['proxy-server-nameserver']);
  }
  const policy = dns['proxy-server-nameserver-policy'];
  if (policy && typeof policy === 'object' && !Array.isArray(policy)) {
    for (const rule of Object.keys(policy)) {
      policy[rule] = mapValue(policy[rule]);
    }
  }
}

// ============================================================================
// 工具函数
// ============================================================================

// 深拷贝：避免多次调用 main() 时互相污染同一份 TEMPLATE
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
function getRuleProxyTargetIndex(rule) {
  if (typeof rule !== 'string' || /^\s*SUB-RULE\s*,/i.test(rule)) return -1;
  const fields = rule.split(',');
  const lastField = fields[fields.length - 1].trim();
  return lastField.toLowerCase() === 'no-resolve'
    ? fields.length - 2
    : fields.length - 1;
}
function ruleTargetsProxyGroup(rule, groupName) {
  const targetIndex = getRuleProxyTargetIndex(rule);
  const fields = typeof rule === 'string' ? rule.split(',') : [];
  return targetIndex >= 0 && fields[targetIndex].trim() === groupName;
}
function replaceRuleProxyGroup(rule, groupName, replacement) {
  const fields = typeof rule === 'string' ? rule.split(',') : [];
  const targetIndex = getRuleProxyTargetIndex(rule);
  if (targetIndex < 0 || fields[targetIndex].trim() !== groupName) return rule;
  fields[targetIndex] = replacement;
  return fields.join(',');
}
function removeDisabledDnsNameserverPolicies(dns, disabledGroupNames) {
  const policy = dns && dns['nameserver-policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return;
  // 仅清理关闭时删除业务路由的常规代理组，不处理顶层选择组、FCM 或 Tailscale。
  const managedDisabledGroups = new Set(
    Array.from(disabledGroupNames).filter((name) =>
      REMOVE_ROUTING_RULES_FOR_DISABLED_GROUPS.has(name)
    )
  );
  if (managedDisabledGroups.size === 0) return;
  Object.keys(policy).forEach((rule) => {
    const original = policy[rule];
    const nameservers = Array.isArray(original) ? original : [original];
    const retained = nameservers.filter((nameserver) => {
      if (typeof nameserver !== 'string') return true;
      const groupIndex = nameserver.lastIndexOf('#');
      if (groupIndex < 0) return true;
      return !managedDisabledGroups.has(nameserver.slice(groupIndex + 1).trim());
    });
    if (retained.length === 0) {
      delete policy[rule];
    } else {
      policy[rule] = Array.isArray(original) ? retained : retained[0];
    }
  });
}
function collectRuleProviderReferences(value, references = new Set()) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\bRULE-SET\s*,\s*([^,\s)]+)/gi)) {
      references.add(match[1]);
    }
    for (const match of value.matchAll(/\brule-set:([^\s"'`]+)/gi)) {
      match[1].replace(/[\])}.,;]+$/, '').split(',').forEach((name) => {
        if (name) references.add(name);
      });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectRuleProviderReferences(item, references));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (key !== 'rule-providers') {
        collectRuleProviderReferences(key, references);
        collectRuleProviderReferences(item, references);
      }
    });
  }
  return references;
}
function removeUnusedRuleProviders(result) {
  const providers = result && result['rule-providers'];
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) return;
  const referencedProviders = collectRuleProviderReferences(result);
  Object.keys(providers).forEach((name) => {
    if (!referencedProviders.has(name)) delete providers[name];
  });
}

// ============================================================================
// 入口函数：Bettbox / FlClash 系客户端会调用 main(config) 并使用其返回值
// ============================================================================

function main(config, profileName) {
  config = config || {};

  // ---- 1. 从订阅原始配置里取出会被模板覆盖、但需要保留/合并的动态数据 ----
  // 启用入口解析时保留强制命名空间给维护区；同时避免重载已有输出时污染 TGDC 保底及默认选择。
  // 节点级逻辑（Reality/UDP/证书/IPv6/倍率/地区分组/TGDC 候选/hosts）只遍历这个
  // 数组，即订阅顶层 proxies；provider 节点此时尚未由内核加载，详见文件头的节点处理说明。
  const entryNamePattern = new RegExp(ENTRY_RESOLUTION_EXCLUDE_FILTER);
  const originalProxies = (Array.isArray(config.proxies) ? config.proxies : []).filter(
    (proxy) => ruleOptionsEnable['入口解析'] !== true ||
      !(proxy && typeof proxy.name === 'string' &&
        entryNamePattern.test(normalizeNameForJsMatching(proxy.name)))
  );

  // ---- 1.1 节点字段修正开关（Reality / UDP / 证书 / IPv6），详见 applyNodeFieldOverrides ----
  applyNodeFieldOverrides(originalProxies);

  const originalProxyProviders =
    config['proxy-providers'] && typeof config['proxy-providers'] === 'object'
      ? config['proxy-providers']
      : null;

  // ---- 2. 以模板为主体，深拷贝一份出来当作最终结果 ----
  const result = deepClone(TEMPLATE);

  // ---- 2.5 TGDC 实验分流（默认关闭；由 UI 开关控制） ----
  applyTelegramDcExperiment(result, originalProxies);

  // ---- 3. 节点列表换成订阅里的真实节点 ----
  result.proxies = originalProxies.slice();
  if (originalProxyProviders) {
    // 深拷贝：override 注入不能回写到订阅原始 config。
    result['proxy-providers'] = deepClone(originalProxyProviders);
    applyProviderOverrides(result);
  }

  // include-all 按名称排序；手动选择与 Telegram 组仍以订阅顺序中的首个节点作为默认选择。
  const firstProxyName = originalProxies
    .map((proxy) => proxy && proxy.name)
    .find((name) => typeof name === 'string' && name.length > 0);
  if (firstProxyName) {
    const defaultSelectedGroups = new Set(['👉 手动选择', '📲 Telegram', '📲 Telegram(兜底)']);
    (result['proxy-groups'] || []).forEach((group) => {
      if (group && defaultSelectedGroups.has(group.name)) {
        group['default-selected'] = firstProxyName;
      }
    });
  }

  // ---- 4. 动态过滤策略组：读取 ruleOptionsEnable 的单独开关 ----
  // 识别所有被禁用的策略组名字
  const disabledGroupNames = new Set();
  if (ruleOptionsEnable['🔄 负载均衡'] === false) {
    LOAD_BALANCE_STRATEGY_GROUP_NAMES.forEach((groupName) => disabledGroupNames.add(groupName));
  }
  const activeGroupNames = new Set();

  (result['proxy-groups'] || []).forEach(group => {
    if (group && group.name) {
      // TGDC 开启后，📲 Telegram(兜底) 仍沿用原 📲 Telegram 开关。
      const optionName = group.name === '📲 Telegram(兜底)' ? '📲 Telegram' : group.name;
      // 默认如果规则选项里没写这个名字，就保持启用状态
      if (ruleOptionsEnable[optionName] === false) {
        disabledGroupNames.add(group.name);
      } else {
        activeGroupNames.add(group.name);
      }
    }
  });

  // 过滤出启用的策略组
  result['proxy-groups'] = (result['proxy-groups'] || []).filter(
    group => group && group.name && !disabledGroupNames.has(group.name)
  );

  // 清理其他启用的策略组中，对“已被禁用策略组”的引用
  const fallbackTarget = activeGroupNames.has('🌍 PROXY') ? '🌍 PROXY' : 'DIRECT';

  result['proxy-groups'].forEach(group => {
    if (disabledGroupNames.has(group['default-selected'])) {
      delete group['default-selected'];
    }
    if (Array.isArray(group.proxies)) {
      group.proxies = group.proxies.filter(p => !disabledGroupNames.has(p));
      // 如果剔除后列表空了，填入保底策略（优先 🌍 PROXY，其次 DIRECT）
      if (group.proxies.length === 0) {
        group.proxies = [fallbackTarget];
      }
    }
  });

  // ---- 5. FCM / Tailscale 直连开关：默认关闭时对应隐藏组仅含 DIRECT；
  //      打开后仅保留 👉 手动选择（这两个开关不移除对应组，仅改写组内节点） ----
  const directSwitchGroups = [
    ['关闭FCM直连', 'FCM'],
    ['关闭Tailscale直连', 'Tailscale']
  ];
  directSwitchGroups.forEach(([optionName, groupName]) => {
    const directDisabled = ruleOptionsEnable[optionName] === true;
    result['proxy-groups'].forEach((group) => {
      if (!group || group.name !== groupName) return;
      if (directDisabled) {
        if (disabledGroupNames.has('👉 手动选择')) {
          // 手动组已关闭时沿用全局兜底，避免该组引用一个不存在的策略组。
          group.proxies = [fallbackTarget];
        } else {
          group.proxies = ['👉 手动选择'];
        }
      } else {
        group.proxies = ['DIRECT'];
      }
    });
  });

  // ---- 6. 业务组关闭时删除对应路由；其他被禁用组仍沿用原有兜底改写 ----
  if (Array.isArray(result.rules)) {
    const routeRemovalGroupNames = new Set(
      Array.from(disabledGroupNames).filter((name) => REMOVE_ROUTING_RULES_FOR_DISABLED_GROUPS.has(name))
    );
    result.rules = result.rules.filter((rule) =>
      !Array.from(routeRemovalGroupNames).some((name) => ruleTargetsProxyGroup(rule, name))
    );
    result.rules = result.rules.map(rule => {
      let updatedRule = rule;
      disabledGroupNames.forEach(disabledName => {
        updatedRule = replaceRuleProxyGroup(updatedRule, disabledName, fallbackTarget);
      });
      return updatedRule;
    });
  }

  // 同步清理 nameserver-policy 中指向已关闭常规代理组的 DNS 出口引用。
  removeDisabledDnsNameserverPolicies(result.dns, disabledGroupNames);

  // ---- 6.5 WebRTC 阻断开关：默认关闭时不改动模板规则；打开后按指定特征移除全部匹配规则 ----
  if (ruleOptionsEnable['关闭WebRTC阻断'] === true && Array.isArray(result.rules)) {
    const isWebRtcBlockingRule = (rule) =>
      typeof rule === 'string' &&
      rule.includes('NETWORK,UDP') &&
      rule.includes('DST-PORT,3478-3479/5349-5350/19302-19309');
    if (result.rules.some(isWebRtcBlockingRule)) {
      result.rules = result.rules.filter((rule) => !isWebRtcBlockingRule(rule));
    }
  }

  // ---- 7. DNS 节点智能补充 ----
  smartMergeDnsNode(
    config,
    result
  );

  // ---- 8. 倍率筛选：先剔除订阅顶层节点，仅处理顶层 proxies ----
  const removedProxyNames = applyProxyMultiplierFilters(result);

  // ---- 8.5 国家/地区策略组：只用倍率筛选后的候选节点生成，整组被筛除的地区不建组 ----
  applyCountryRegionGrouping(
    result,
    originalProxies.filter((proxy) => !(proxy && removedProxyNames.has(proxy.name)))
  );

  // ---- 9. 国内入口解析：倍率筛选完成后，再追加各分类入口节点。 ----
  applyEntryResolution(result);

  // ---- 9.5 广告屏蔽组：在入口组之后，按共享优先级定位。 ----
  applySkkAdBlock(result);

  // ---- 10. 代理节点 DNS 使用 TCP：最后补协议，保留前序合并、hosts 与出口选择结果。 ----
  applyProxyDnsTcp(result);

  // 仅删除在最终路由、DNS 或其他配置中都不再被引用的规则集。
  removeUnusedRuleProviders(result);

  return result;
}
