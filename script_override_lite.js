const Compatible_With_Bettbox = {
  ruleOptionsEnable: true,

  policyGroupOptions: [
    '👉 手动选择',
    '♻️ 自动选择',
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

const ruleOptionsEnable = {

  '👉 手动选择': true,

  '♻️ 自动选择': false,

  '🔎 Google': false,

  '♾️ Meta': false,

  '🤖 AI大模型': false,

  '📲 Telegram': false,

  '✖️ Twitter': false,

  '💬 Discord': false,

  '👽 Reddit': false,

  '💬 LINE': false,

  '🎵 TikTok': false,

  '🎥 Netflix': false,

  '🎧 Spotify': false,

  '🎬 Emby': false,

  '🍎 海外苹果': false,

  '💠 海外微软': false,

  '🎮 Steam平台（非下载/CDN）': false,

  '🎮 Games-Global': false,

  '💳 金融支付': false,

  '💝 Patreon': false,

  '📚 EHentai': false,

  '☁️ PikPak': false,

  '强制证书验证': false,

  '关闭 Reality 增强': false,

  '试开启节点UDP': false,

  'IPv6优先': false,

  '关闭FCM直连': false,

  'TGDC实验分流': false,

  '使用SKK广告拦截': false,

  '国家/地区分组': false,

  '剔除≥2x': false,
  '剔除≤0.5x': false,

  '剔除免费': false,

  '入口解析': false,

  '关闭WebRTC阻断': false,

  'QUIC阻断': false,



};

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

const QUIC_REMOVED_NAMESERVER_POLICY_KEYS = new Set([
  'rule-set:microsoft',
  'rule-set:apple',
  'rule-set:telegram_domain',
  'rule-set:google',
  'rule-set:google-cn',
  'rule-set:Gemini_Domain',
  'rule-set:meta',
  '+.muse.ai',
  'hatch-api.meta.ai',
  'api.meta.ai',
  'agent.meta.ai',
  '+.metaaivm.com',
  'auth.meta.com',
  'meta.graph.meta.com',
  'edge-metaclaw-http.c10r.facebook.com',
  'shortwave.facebook.com',
  'node.hatch.one',
  '+.hark.com',
  '+.wabi.ai',
  '+.tabbyml.com',
  '+.pickle.com',
  'api.anthropic.com',
  'console.anthropic.com',
  'statsig.anthropic.com',
  'status.anthropic.com',
  'sentry.anthropic.com',
  'support.anthropic.com',
  'mcp-proxy.anthropic.com',
  'platform.claude.com',
  'code.claude.com',
  'downloads.claude.ai',
  'bridge.claudeusercontent.com',
  'cdn.growthbook.io',
  'cdn.usefathom.com',
  'registry.npmjs.org',
  'storage.googleapis.com',
  'formulae.brew.sh',
  'http-intake.logs.us5.datadoghq.com',
  'browser-intake-us5-datadoghq.com',
  'servd-anthropic-website.b-cdn.net',
  'claudemcpclient.com',
  'claudemcpcontent.com',
  '+.anthropic.com',
  '+.claude.ai',
  '+.claude.com',
  '+.claudeusercontent.com',
  '+.clau.de',
  '+.modelcontextprotocol.io',
  'anthropic.com.cdn.cloudflare.net',
  'anthropic-com.ghost.io',
  '+.sentry.io',
  '+.statsigapi.net',
  'rule-set:ai',
  'rule-set:spotify',
  'rule-set:discord',
  'rule-set:reddit',
  'rule-set:netflix',
  'rule-set:patreon',
  'rule-set:ehentai',
  'rule-set:pikpak',
  'rule-set:line',
  'd3r7nsslvs6aaf.cloudfront.net',
  'rule-set:category-cryptocurrency',
  'rule-set:paypal',
  'rule-set:stripe',
  'rule-set:visa',
  'rule-set:mastercard',
  'rule-set:wise',
  'rule-set:twitter-x-domain',
  'rule-set:steam',
  'rule-set:games',
  'rule-set:TikTok',
]);

const TEMPLATE = {
  "mode": "rule",
  "find-process-mode": "strict",
  "mixed-port": 7254,
  "port": 7249,
  "socks-port": 7346,
  "allow-lan": true,
  "bind-address": "*",
  "lan-allowed-ips": [
    "0.0.0.0/0",
    "::/0"
  ],
  "authentication": [
    "xvsvt:132e6671f6c386a7"
  ],
  "skip-auth-prefixes": [
    "127.0.0.1/8",
    "::1/128"
  ],
  "etag-support": true,
  "global-ua": "clash.meta",
  "ipv6": true,
  "log-level": "info",
  // 安全警告：管理 API 绑定所有网络接口，且 CORS 允许任意来源；请仅在可信网络使用，并通过防火墙限制访问。
  "external-controller": "0.0.0.0:9090",
  "external-controller-cors": {
    "allow-origins": [
      "*"
    ],
    "allow-private-network": true
  },
  // 安全警告：此固定值随公开模板发布；部署前请替换为自己的独有强随机密钥。
  "secret": "318a2fbc9f4836b114c0ada7e6d5f36e",
  "external-ui": "dashboard",
  "external-ui-name": "metacubexd",
  "external-ui-url": "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
  "unified-delay": true,
  "tcp-concurrent": true,
  "keep-alive-idle": 600,
  "keep-alive-interval": 15,
  "profile": {
    "store-selected": true,
    "store-fake-ip": true
  },
  "tproxy-port": 9898,
  "tun": {
    "enable": false
  },
  "ntp": {
    "enable": true,
    "write-to-system": false,
    "server": "time.apple.com",
    "port": 123
  },
  "dns": {
    "enable": true,
    "cache-algorithm": "arc",
    "ipv6": true,
    "listen": "0.0.0.0:1053",
    "use-hosts": true,
    "use-system-hosts": false,
    "default-nameserver": [
      "tls://223.5.5.5",
      "114.114.114.114",
      "https://1.12.12.12/dns-query"
    ],
    "proxy-server-nameserver": [
      "https://hrbgyitz34.cloudflare-gateway.com/dns-query"
    ],
    "direct-nameserver": [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query",
      "https://doh.360.cn/dns-query"
    ],
    "direct-nameserver-follow-policy": true,
    "nameserver": [
      "https://cloudflare-dns.com/dns-query#🌍 PROXY",
      "https://dns.google/dns-query#🌍 PROXY",
      "https://unfiltered.adguard-dns.com/dns-query#🌍 PROXY"
    ],
    "nameserver-policy": {

      "rule-set:douyin": [
        "system",
        "180.184.1.1",
        "180.184.2.2"
      ],
      "rule-set:private": [
        "system"
      ],
      "rule-set:geolocation-cn,cn-additional,apple-cn,microsoft-cn,games-cn": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query",
        "https://doh.360.cn/dns-query"
      ],

      "rule-set:microsoft": ["https://cloudflare-dns.com/dns-query#💠 海外微软", "https://dns.google/dns-query#💠 海外微软", "https://unfiltered.adguard-dns.com/dns-query#💠 海外微软"],
      "rule-set:apple": ["https://cloudflare-dns.com/dns-query#🍎 海外苹果", "https://dns.google/dns-query#🍎 海外苹果", "https://unfiltered.adguard-dns.com/dns-query#🍎 海外苹果"],
      "rule-set:proxy@direct": [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query",
        "https://doh.360.cn/dns-query"
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
      "+.pickle.com": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
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
      "anthropic.com.cdn.cloudflare.net": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "anthropic-com.ghost.io": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.sentry.io": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "+.statsigapi.net": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
      "rule-set:ai": ["https://cloudflare-dns.com/dns-query#🤖 AI大模型", "https://dns.google/dns-query#🤖 AI大模型", "https://unfiltered.adguard-dns.com/dns-query#🤖 AI大模型"],
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
      "rule-set:connectcheck",
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
      "74.125.137.188",
      "142.251.169.188",
      "172.253.135.188"
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
      "name": "🔎 Google",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-google.svg",
      "type": "select",
      "proxies": [
        "👉 手动选择",
        "♻️ 自动选择",
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
      "path": "./ruleset/tiktok.mrs",
      "path-in-bundle": "geo/geosite/tiktok.mrs"
    },
    "ai": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/category-ai-!cn.mrs",
      "path": "./ruleset/ai.mrs",
      "path-in-bundle": "geo/geosite/category-ai-!cn.mrs"
    },
    "apple": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/apple.mrs",
      "path": "./ruleset/apple.mrs",
      "path-in-bundle": "geo/geosite/apple.mrs"
    },
    "apple_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geoip/apple.mrs",
      "path": "./ruleset/apple_ip.mrs",
      "path-in-bundle": "geo/geoip/apple.mrs"
    },
    "category-cryptocurrency": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/category-cryptocurrency.mrs",
      "path": "./ruleset/category-cryptocurrency.mrs",
      "path-in-bundle": "geo/geosite/category-cryptocurrency.mrs"
    },
    "discord": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/discord.mrs",
      "path": "./ruleset/discord.mrs",
      "path-in-bundle": "geo/geosite/discord.mrs"
    },
    "douyin": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/douyin.mrs",
      "path": "./ruleset/douyin.mrs",
      "path-in-bundle": "geo/geosite/douyin.mrs"
    },
    "geolocation-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/geolocation-cn.mrs",
      "path": "./ruleset/geolocation-cn.mrs",
      "path-in-bundle": "geo/geosite/geolocation-cn.mrs"
    },
    "cn-additional": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://static-file-global.353355.xyz/rules/cn-additional-list.mrs",
      "path": "./ruleset/cn-additional.mrs",
      "path-in-bundle": "geo/geosite/cn.mrs"
    },
    "apple-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/apple-cn.mrs",
      "path": "./ruleset/apple-cn.mrs",
      "path-in-bundle": "geo/geosite/apple@cn.mrs"
    },
    "microsoft-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/microsoft-cn.mrs",
      "path": "./ruleset/microsoft-cn.mrs",
      "path-in-bundle": "geo/geosite/microsoft@cn.mrs"
    },
    "games-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/games-cn.mrs",
      "path": "./ruleset/games-cn.mrs",
      "path-in-bundle": "geo/geosite/category-games-cn.mrs"
    },
    "echs_direct_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/echs-top/proxy/main/mrs/ip/direct.mrs",
      "path": "./ruleset/echs_direct_ip.mrs",
      "path-in-bundle": "geo/geoip/cn.mrs"
    },
    "ehentai": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/ehentai.mrs",
      "path": "./ruleset/ehentai.mrs",
      "path-in-bundle": "geo/geosite/ehentai.mrs"
    },
    "fakeip-filter_domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/fakeip-filter.mrs",
      "path": "./ruleset/fakeip-filter_domain.mrs",
      "path-in-bundle": "geo/geosite/fakeip-filter.mrs"
    },
    "connectcheck": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/connectivity-check.mrs",
      "path": "./ruleset/connectcheck.mrs",
      "path-in-bundle": "geo/geosite/connectivity-check.mrs"
    },
    "games": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/games.mrs",
      "path": "./ruleset/games.mrs",
      "path-in-bundle": "geo/geosite/category-games-!cn.mrs"
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
      "path": "./ruleset/google-cn.mrs",
      "path-in-bundle": "geo/geosite/google@cn.mrs"
    },
    "googlefcm": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/googlefcm.mrs",
      "path": "./ruleset/googlefcm.mrs",
      "path-in-bundle": "geo/geosite/googlefcm.mrs"
    },
    "line": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/line.mrs",
      "path": "./ruleset/line.mrs",
      "path-in-bundle": "geo/geosite/line.mrs"
    },
    "mastercard": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/mastercard.mrs",
      "path": "./ruleset/mastercard.mrs",
      "path-in-bundle": "geo/geosite/mastercard.mrs"
    },
    "meta": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/meta.mrs",
      "path": "./ruleset/meta.mrs",
      "path-in-bundle": "geo/geosite/meta.mrs"
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
      "path": "./ruleset/microsoft_ip.mrs",
      "path-in-bundle": "geo/geoip/microsoft.mrs"
    },
    "microsoft": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/microsoft.mrs",
      "path": "./ruleset/microsoft.mrs",
      "path-in-bundle": "geo/geosite/microsoft.mrs"
    },
    "paypal": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/paypal.mrs",
      "path": "./ruleset/paypal.mrs",
      "path-in-bundle": "geo/geosite/paypal.mrs"
    },
    "patreon": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/patreon.mrs",
      "path": "./ruleset/patreon.mrs",
      "path-in-bundle": "geo/geosite/patreon.mrs"
    },
    "pikpak": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/pikpak.mrs",
      "path": "./ruleset/pikpak.mrs",
      "path-in-bundle": "geo/geosite/pikpak.mrs"
    },
    "pixiv": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/pixiv.mrs",
      "path": "./ruleset/pixiv.mrs",
      "path-in-bundle": "geo/geosite/pixiv.mrs"
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
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/reddit.mrs",
      "path": "./ruleset/reddit.mrs",
      "path-in-bundle": "geo/geosite/reddit.mrs"
    },
    "spotify": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/spotify.mrs",
      "path": "./ruleset/spotify.mrs",
      "path-in-bundle": "geo/geosite/spotify.mrs"
    },
    "steam_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geoip/steam.mrs",
      "path": "./ruleset/steam_ip.mrs",
      "path-in-bundle": "geo/geoip/steam.mrs"
    },
    "steam": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/steam.mrs",
      "path": "./ruleset/steam.mrs",
      "path-in-bundle": "geo/geosite/steam.mrs"
    },
    "stripe": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/stripe.mrs",
      "path": "./ruleset/stripe.mrs",
      "path-in-bundle": "geo/geosite/stripe.mrs"
    },
    "telegram_domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/telegram.mrs",
      "path": "./rules/telegram_domain.mrs",
      "path-in-bundle": "geo/geosite/telegram.mrs"
    },
    "telegramcidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/reddishJade/private_proxy/main/Mihomo/Provider/telegram%40ip.mrs",
      "path": "./ruleset/telegramcidr.mrs",
      "path-in-bundle": "geo/geoip/telegram.mrs"
    },
    "twitter-x-ipcidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "yaml",
      "url": "https://magicrule.pages.dev/data/_shared/artifacts/Twitter_ipcidr_5cfa0ebce47f47ac.yaml",
      "path": "./ruleset/twitter/x-ipcidr.yaml"
    },
    "twitter-x-domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/twitter.mrs",
      "path": "./ruleset/twitter/x-domain.mrs",
      "path-in-bundle": "geo/geosite/twitter.mrs"
    },
    "twitter-x-ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geoip/twitter.mrs",
      "path": "./ruleset/twitter/x-ip.mrs",
      "path-in-bundle": "geo/geoip/twitter.mrs"
    },
    "visa": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/visa.mrs",
      "path": "./ruleset/visa.mrs",
      "path-in-bundle": "geo/geosite/visa.mrs"
    },
    "wise": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/wise.mrs",
      "path": "./ruleset/wise.mrs",
      "path-in-bundle": "geo/geosite/wise.mrs"
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
    "RULE-SET,private,DIRECT,no-resolve",
    "DOMAIN-WILDCARD,*.deepseek.com,DIRECT",
    "DOMAIN-WILDCARD,*.portal101.cn,DIRECT",
    "DOMAIN-SUFFIX,edgekey.net,DIRECT",
    "DOMAIN-KEYWORD,ikuuu,🌍 PROXY",
    "DOMAIN,lumina.lumina00001.com,DIRECT",
    "DOMAIN,gfwsb.yiku.xyz,DIRECT",
    "DOMAIN,bsub.douyincdns.com,DIRECT",
    "DOMAIN,sub.rinkitotokiku.online,DIRECT",

    "PROCESS-NAME,com.mountains.hills,🎬 Emby",
    "PROCESS-NAME,com.hamhub.app,🎬 Emby",
    "PROCESS-NAME,com.oumi.utility.media.hub,🎬 Emby",
    "PROCESS-NAME,com.feifeiduck.capyplayer,🎬 Emby",
    "PROCESS-NAME,com.attempt.afusekt,🎬 Emby",
    "PROCESS-NAME,com.hush.yamby,🎬 Emby",
    "PROCESS-NAME,com.railux.mobile,🎬 Emby",
    "PROCESS-NAME,com.yumilo.player,🎬 Emby",
    "PROCESS-NAME,HillsLite.exe,🎬 Emby",
    "PROCESS-NAME,HillsPlayer.exe,🎬 Emby",

    "RULE-SET,googlefcm,FCM",

    "RULE-SET,microsoft_ip,💠 海外微软,no-resolve",
    "RULE-SET,microsoft,💠 海外微软",
    "RULE-SET,apple_ip,🍎 海外苹果,no-resolve",
    "RULE-SET,apple,🍎 海外苹果",
    "RULE-SET,proxy@direct,🌍 PROXY",
    "PROCESS-NAME-REGEX,.*nagram.*,📲 Telegram",
    "PROCESS-NAME-REGEX,.*telegram.*,📲 Telegram",
    "RULE-SET,telegramcidr,📲 Telegram,no-resolve",
    "RULE-SET,telegram_domain,📲 Telegram",

    "RULE-SET,google,🔎 Google",
    "RULE-SET,google-cn,🔎 Google",
    "RULE-SET,Gemini_Domain,🔎 Google",
    "RULE-SET,meta,♾️ Meta",

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
    "DOMAIN-SUFFIX,pickle.com,🤖 AI大模型",
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
    "DOMAIN,anthropic.com.cdn.cloudflare.net,🤖 AI大模型",
    "DOMAIN,anthropic-com.ghost.io,🤖 AI大模型",
    "DOMAIN-SUFFIX,sentry.io,🤖 AI大模型",
    "DOMAIN-SUFFIX,statsigapi.net,🤖 AI大模型",
    "DOMAIN-KEYWORD,datadog,🤖 AI大模型",
    "DOMAIN-KEYWORD,sift,🤖 AI大模型",
    "RULE-SET,ai,🤖 AI大模型",
    "PROCESS-NAME,com.hark.android,🤖 AI大模型",
    "PROCESS-NAME,ai.wabi.android.app,🤖 AI大模型",
    "PROCESS-NAME,com.pickle.client,🤖 AI大模型",
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
    "RULE-SET,twitter-x-ipcidr,✖️ Twitter,no-resolve",
    "RULE-SET,steam_ip,🎮 Steam平台（非下载/CDN）,no-resolve",
    "RULE-SET,steam,🎮 Steam平台（非下载/CDN）",
    "PROCESS-NAME,bf6.exe,🎮 Games-Global",
    "RULE-SET,games,🎮 Games-Global",
    "RULE-SET,TikTok,🎵 TikTok",
    "MATCH,🌍 PROXY",
    // 如请求为 udp，而代理节点没有 udp 支持 (例如ss节点没写udp: true),则会继续向下匹配
    // 为防止泄露故reject
    "NETWORK,UDP,REJECT"
  ]
};

function findPriorityGroupInsertionIndex(proxyGroups) {
  const priorities = [
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

  return 1;
}

const FEATURE_SWITCH_ICONS = {
  '强制证书验证': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-SSL.svg',
  '关闭 Reality 增强': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Spark.svg',
  '试开启节点UDP': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-udp.svg',
  'IPv6优先': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-ipv6-prefer.svg',
  '剔除≥2x': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-filter-high.svg',
  '剔除≤0.5x': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-filter-low.svg',
  '剔除免费': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-filter-free.svg',
  '关闭WebRTC阻断': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-webrtc-block.svg',
  'QUIC阻断': 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Quic.svg',
};

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
      name: '使用SKK广告拦截',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-adblock.svg'
    },
    {
      name: '国家/地区分组',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Global.svg'
    },
    {
      name: '剔除≥2x',
      icon: FEATURE_SWITCH_ICONS['剔除≥2x']
    },
    {
      name: '剔除≤0.5x',
      icon: FEATURE_SWITCH_ICONS['剔除≤0.5x']
    },
    {
      name: '剔除免费',
      icon: FEATURE_SWITCH_ICONS['剔除免费']
    },
    {
      name: '入口解析',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Domestic.svg'
    },
    {
      name: '关闭WebRTC阻断',
      icon: FEATURE_SWITCH_ICONS['关闭WebRTC阻断']
    },
    {
      name: 'QUIC阻断',
      icon: FEATURE_SWITCH_ICONS['QUIC阻断']
    },
  ]);

function isIPAddress(host) {
  if (!host || typeof host !== "string") {
    return true;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return true;
  }

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

function matchWildcardDomain(rule, host) {
  rule = normalizeDomain(rule);
  host = normalizeDomain(host);

  if (!rule || !host) {
    return false;
  }

  if (rule.startsWith("+.")) {
    const suffix = rule.substring(2);
    return (
      host === suffix ||
      host.endsWith("." + suffix)
    );
  }

  if (rule.startsWith(".")) {
    const suffix = rule.substring(1);
    return host.endsWith("." + suffix);
  }

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

  return host === rule;
}

function asNameserverList(nameservers) {
  if (Array.isArray(nameservers)) {
    return nameservers.filter(value => typeof value === "string");
  }

  return typeof nameservers === "string" ? [nameservers] : [];
}

function sameNameserverSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && Array.from(sa).every((value) => sb.has(value));
}

function compressExactDnsPolicyKeys(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return policy;
  }
  const rules = Object.keys(policy);
  const isExactDomainRule = (rule) =>
    typeof rule === "string" &&
    rule.trim() === rule &&
    !rule.includes(",") &&
    !rule.includes(":") &&
    !rule.includes("*") &&
    !rule.startsWith("+") &&
    !rule.startsWith(".");
  const groups = new Map();
  rules.forEach((rule, index) => {
    if (!isExactDomainRule(rule)) {
      return;
    }
    const signature = JSON.stringify(asNameserverList(policy[rule]));
    if (!groups.has(signature)) {
      groups.set(signature, []);
    }
    groups.get(signature).push(index);
  });
  const mergedKeyByFirstIndex = new Map();
  const mergedMemberIndexes = new Set();
  for (const indexes of groups.values()) {
    if (indexes.length < 2) {
      continue;
    }
    const members = new Set(indexes);
    let blocked = false;
    for (let i = indexes[0] + 1; i < indexes[indexes.length - 1] && !blocked; i++) {
      if (members.has(i)) {
        continue;
      }
      const intervening = rules[i];
      if (intervening.includes(":")) {
        blocked = true;
      } else if (
        intervening
          .split(",")
          .some((part) =>
            indexes.some((memberIndex) =>
              matchWildcardDomain(part, rules[memberIndex])
            )
          )
      ) {
        blocked = true;
      }
    }
    if (blocked) {
      continue;
    }
    const mergedKey = indexes.map((index) => rules[index]).join(",");
    if (Object.prototype.hasOwnProperty.call(policy, mergedKey)) {
      continue;
    }
    const firstRule = rules[indexes[0]];
    const nameservers = asNameserverList(policy[firstRule]);
    mergedKeyByFirstIndex.set(indexes[0], {
      key: mergedKey,
      value: Array.isArray(policy[firstRule])
        ? nameservers.slice()
        : nameservers.length === 1
          ? nameservers[0]
          : nameservers.slice()
    });
    indexes.slice(1).forEach((index) => mergedMemberIndexes.add(index));
  }
  if (mergedKeyByFirstIndex.size === 0) {
    return policy;
  }
  const compressed = {};
  rules.forEach((rule, index) => {
    if (mergedMemberIndexes.has(index)) {
      return;
    }
    if (mergedKeyByFirstIndex.has(index)) {
      const merged = mergedKeyByFirstIndex.get(index);
      compressed[merged.key] = merged.value;
    } else {
      compressed[rule] = policy[rule];
    }
  });
  return compressed;
}

const publicDnsList = [

  '223.5.5.5', '223.6.6.6', '119.29.29.29', '1.12.12.12',
  '120.53.53.53', '114.114.114.114', '180.76.76.76', '1.2.4.8',
  '116.116.116.116', '101.226.4.6', '123.125.81.6', '180.184.1.1',
  '180.184.2.2',

  '2400:3200::1', '2400:3200:baba::1', '119.28.28.28',
  '182.254.116.116', '182.254.118.118', '2402:4e00::',
  '114.114.115.115', '114.114.114.119', '114.114.115.119',
  '114.114.114.110', '114.114.115.110', '2400:da00::6666',
  // OneDNS IPv6（拦截版与纯净版）
  '2400:7fc0:849e:200::4', '2404:c2c0:85d8:901::4',
  '2400:7fc0:849e:200::8', '2404:c2c0:85d8:901::8',
  '210.2.4.8', '2001:dc7:1000::1', '218.30.118.6',
  '140.207.198.6', '2400:8800:1::6', '2400:8800:2::6',
  '117.50.11.11', '117.50.22.22', '52.80.66.66', '117.50.10.10',
  '52.80.52.52', '117.50.60.30', '52.80.60.30',
  '101.6.6.6', '2001:da8::666', '240c::6666', '240c::6644',
  '202.141.162.123', '202.141.178.13',

  '1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4', '9.9.9.9',
  '149.112.112.112', '208.67.222.222', '208.67.220.220',
  '94.140.14.14', '94.140.15.15', '76.76.2.0', '76.76.10.0',
  '185.228.168.9', '185.228.169.9', '77.88.8.8', '77.88.8.1',
  '156.154.70.1', '156.154.71.1',

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

  // 补齐 MyClash 清单中当前未覆盖的公共 DNS 地址
  '4.2.2.1', '4.2.2.2', '4.2.2.3', '4.2.2.4', '4.2.2.5', '4.2.2.6',
  '8.20.247.20', '8.26.56.26', '45.11.45.11',
  '64.6.64.6', '64.6.65.6', '94.140.14.140', '94.140.14.141',
  '101.101.101.101', '101.102.103.104', '185.222.222.222',
  '216.146.35.35', '216.146.36.36',
  '2620:0:ccc::2', '2620:0:ccd::2', '2620:fe::10', '2a09::', '2a11::',
  '2a10:50c0::1:ff', '2a10:50c0::2:ff',

  'dns.alidns.com', 'doh.pub', 'dot.pub', 'dns.pub',
  'dnspod.cn', 'dnspod.net', 'dns.baidu.com', 'dns.google',
  'dns.cloudflare.com', 'cloudflare-dns.com', 'one.one.one.one',
  'dns.quad9.net', 'doh.opendns.com', 'resolver1.opendns.com',
  'resolver2.opendns.com', 'dns.nextdns.io',
  'dns.adguard-dns.com', 'family.adguard-dns.com',
  'unfiltered.adguard-dns.com', 'dns.cnnic.cn', 'doh.360.cn',
  'dot.360.cn', 'dns.360.cn', 'onedns.net', 'dns.apple.com',
  'dns.sb', 'doh.sb',
  // Quad9 历史 DoH 地址与 Cisco OpenDNS DDR 互操作测试地址。
  '149.112.112.9', '2620:119:fc::2', '2620:119:fc::3', '2620:119:fc::4',
  'dot.sb',
  // 本次经官方资料核验的公共 DNS 补充地址
  '2402:4e00:1::', '2402:f000:1:416:101:6:6:6', '2001:4860:4860::6464', '2001:4860:4860::64',
  '2620:fe::fe:10', '2620:fe::11', '2620:fe::fe:11',
  '77.88.8.88', '77.88.8.2', '77.88.8.7', '77.88.8.3',
  '2a02:6b8::feed:bad', '2a02:6b8:0:1::feed:bad',
  '2a02:6b8::feed:a11', '2a02:6b8:0:1::feed:a11',
  // Mullvad 官方迁移/关闭公告日期已过，保留历史端点以识别旧配置
  '194.242.2.3', '194.242.2.4', '194.242.2.5', '194.242.2.6', '194.242.2.9',
  '2a07:e340::3', '2a07:e340::4', '2a07:e340::5', '2a07:e340::6', '2a07:e340::9',
  '2001:de4::101', '2001:de4::102',
  '76.76.2.11', '2606:1a40::11', '2606:1a40::', '2606:1a40:1::',
  '2a0d:2a00:1::', '2a0d:2a00:2::',
  '2a0d:2a00:1::1', '2a0d:2a00:2::1',
  // DNS4EU 公共解析端点
  '86.54.11.1', '86.54.11.201', '86.54.11.12', '86.54.11.212',
  '86.54.11.13', '86.54.11.213', '86.54.11.11', '86.54.11.211',
  '86.54.11.100', '86.54.11.200', '2a13:1001::86:54:11:1', '2a13:1001::86:54:11:201',
  '2a13:1001::86:54:11:12', '2a13:1001::86:54:11:212', '2a13:1001::86:54:11:13', '2a13:1001::86:54:11:213',
  '2a13:1001::86:54:11:11', '2a13:1001::86:54:11:211', '2a13:1001::86:54:11:100', '2a13:1001::86:54:11:200',
  'protective.joindns4.eu', 'child.joindns4.eu', 'noads.joindns4.eu', 'child-noads.joindns4.eu',
  'unfiltered.joindns4.eu',
  // DNS.WATCH 公共解析端点
  '84.200.69.80', '84.200.70.40', '2001:1608:10:25::1c04:b12f', '2001:1608:10:25::9249:d69b',
  'resolver1.dns.watch', 'resolver2.dns.watch', 'resolver1v6.dns.watch', 'resolver2v6.dns.watch',
  // LibreDNS 加密解析端点
  '116.202.176.26', '2a01:4f8:1c0c:8274::1', 'doh.libredns.gr', 'dot.libredns.gr',
  'noads.libredns.gr',
  // UncensoredDNS 公共解析端点
  '91.239.100.100', '2001:67c:28a4::', '89.233.43.71', '2a01:3a0:53:53::',
  'anycast.uncensoreddns.org', 'unicast.uncensoreddns.org',
  // FDN 公共 DoH 主机名
  'ns0.fdn.fr', 'ns1.fdn.fr',
  // CZ.NIC ODVR 公共解析端点
  '193.17.47.1', '185.43.135.1', '2001:148f:ffff::1', '2001:148f:fffe::1',
  'odvr.nic.cz',
  ];

// 用户指定的服务关键词只按 DNS 主机名中的完整标签匹配。
const publicDnsHostnameKeywords = [
  'yandex', 'mullvad', 'tuna.tsinghua', 'twnic', 'dns.sb',
  'controld', 'cleanbrowsing',
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

// 仅按完整 DNS 标签序列匹配，不检查 URL 路径或任意子串。
function matchesDnsHostnameKeyword(hostname, keyword) {
  const hostnameLabels = hostname.split('.');
  const keywordLabels = keyword.split('.');
  return hostnameLabels.some((_, index) =>
    keywordLabels.every((label, offset) => hostnameLabels[index + offset] === label)
  );
}

function isPublicDnsServer(value) {
  const hostname = dnsServerHostname(value);
  const listedPublicDns = publicDnsList.some((dns) => {
    const candidate = dns.toLowerCase();
    if (isIPAddress(candidate)) {
      const normalizedHostname = normalizeDnsIpAddress(hostname);
      return normalizedHostname !== '' &&
        normalizedHostname === normalizeDnsIpAddress(candidate);
    }
    return hostname === candidate || hostname.endsWith('.' + candidate);
  });
  if (listedPublicDns) {
    return true;
  }
  return publicDnsHostnameKeywords.some((keyword) =>
    matchesDnsHostnameKeyword(hostname, keyword)
  );
}

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

  for (const group of candidates) {
    if (group.length > 0) {
      return group.some((nameserver) => dnsServerEndpoint(nameserver) === listen);
    }
  }
  return false;
}

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

const NAMESERVER_POLICY_PREFER_ORIGINAL = true;

function smartMergeDnsNode(config, result) {
  const rules = collectDnsRules(config);
  const proxyServerNameserverPolicy = filterPublicDnsPolicy(
    rules.proxyServerNameserverPolicy
  );
  const nameserverPolicy = filterPublicDnsPolicy(rules.nameserverPolicy);
  const newPolicy = result.dns["proxy-server-nameserver-policy"] || {};
  const newHosts = result.hosts || {};
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];

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

        for (const domain of uncoveredEffectiveDomains) {
          setPolicy(domain, nameserverPolicy[rule]);
        }
      } else if (matchesEffectiveNodeDomain(rule)) {
        setPolicy(rule, nameserverPolicy[rule]);
      }
    }

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

  result.dns["proxy-server-nameserver-policy"] = compressExactDnsPolicyKeys(newPolicy);

  if (Object.keys(newHosts).length) {
    result.hosts = newHosts;
  }
}

const JS_INVISIBLE_CHARACTER_NORMALIZATION_REGEX =
  /[\u00AD\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u115F\u1160\u3164\uFFA0]/g;

function normalizeNameForJsMatching(name) {
  return typeof name === 'string'
    ? name.replace(JS_INVISIBLE_CHARACTER_NORMALIZATION_REGEX, '')
    : name;
}

const JS_MODULE_INFORMATION_NODE_EXCLUSION_REGEX =
  /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

function filterModuleCandidateProxies(originalProxies) {
  const proxies = Array.isArray(originalProxies) ? originalProxies : [];

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

const TGDC_RULE_PROVIDERS = {
  dc1_mia: {
    type: 'inline',
    behavior: 'classical',
    payload: [

      'IP-CIDR,91.108.12.0/22,no-resolve',
      'IP-CIDR,149.154.172.0/22,no-resolve',
      'IP-CIDR6,2001:b28:f23d::/48,no-resolve',
    ],
  },
  dc24_ams: {
    type: 'inline',
    behavior: 'classical',
    payload: [

      'IP-CIDR,91.108.58.0/23,no-resolve',
      'IP-CIDR,91.108.4.0/22,no-resolve',
      'IP-CIDR,91.108.8.0/22,no-resolve',
      'IP-CIDR,91.108.20.0/22,no-resolve',
      'IP-CIDR,149.154.160.0/21,no-resolve',
      'IP-CIDR,95.161.64.0/20,no-resolve',
      'IP-CIDR,91.105.192.0/23,no-resolve',
      'IP-CIDR,185.76.151.0/24,no-resolve',
      'IP-CIDR,194.221.250.50/32,no-resolve',

      'IP-CIDR,5.28.192.0/18,no-resolve',
      'IP-CIDR,109.239.140.0/24,no-resolve',
      'IP-CIDR6,2001:67c:4e8::/48,no-resolve',
      'IP-CIDR6,2a0a:f280:203::/48,no-resolve',
    ],
  },
  dc5_sin: {
    type: 'inline',
    behavior: 'classical',
    payload: [

      'IP-CIDR,91.108.16.0/22,no-resolve',
      'IP-CIDR,91.108.56.0/23,no-resolve',
      'IP-CIDR,149.154.168.0/22,no-resolve',
      'IP-CIDR6,2001:b28:f23c::/48,no-resolve',
      'IP-CIDR6,2001:b28:f23f::/48,no-resolve',
    ],
  },
};

const TGDC_FALLBACK_ADDITIONAL_EXCLUDE_FILTER = /国内/iu;

function selectTelegramDcFallbackNodes(eligibleCandidates) {
  return eligibleCandidates
    .filter((proxy) => !TGDC_FALLBACK_ADDITIONAL_EXCLUDE_FILTER.test(normalizeNameForJsMatching(proxy.name)))
    .map((proxy) => proxy.name);
}

const TGDC_PROXY_GROUP_DEFINITIONS = [
  {
    name: '📲 DC1-MIA',
    regionKeys: ['us'],
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-United_States.svg',
  },
  {
    name: '📲 DC24-AMS',
    regionKeys: ['nl'],

    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Netherlands.svg',
  },
  {
    name: '📲 DC5-SIN',

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
  'RULE-SET,dc1_mia,📲 DC1-MIA,no-resolve',
  'RULE-SET,dc24_ams,📲 DC24-AMS,no-resolve',
  'RULE-SET,dc5_sin,📲 DC5-SIN,no-resolve',
  'PROCESS-NAME-REGEX,.*nagram.*,📲 Telegram(兜底)',
  'PROCESS-NAME-REGEX,.*telegram.*,📲 Telegram(兜底)',
  'RULE-SET,telegramcidr,📲 Telegram(兜底),no-resolve',
  'RULE-SET,telegram_domain,📲 Telegram(兜底)',
];

function applyTelegramDcExperiment(result, originalProxies) {
  if (ruleOptionsEnable['TGDC实验分流'] !== true) {
    return;
  }

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
  const fallbackIndex = proxyGroups.findIndex(
    (group) => group && group.name === '📲 Telegram(兜底)'
  );
  const telegramFallbackEnabled = ruleOptionsEnable['📲 Telegram'] !== false;
  const autoSelectEnabled = ruleOptionsEnable['♻️ 自动选择'] !== false;
  const manualSwitchEnabled = ruleOptionsEnable['👉 手动选择'] !== false;
  let insertIndex = proxyGroups.length;
  if (telegramFallbackEnabled && fallbackIndex >= 0) {
    insertIndex = fallbackIndex;
  } else if (autoSelectEnabled && autoSelectIndex >= 0) {
    insertIndex = autoSelectIndex + 1;
  } else if (manualSwitchEnabled && manualSwitchIndex >= 0) {
    insertIndex = manualSwitchIndex + 1;
  }
  proxyGroups.splice(
    insertIndex,
    0,
    ...deepClone(buildTelegramDcProxyGroups(originalProxies))
  );
  result['proxy-groups'] = proxyGroups;

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

function applyNodeFieldOverrides(proxies) {
  const nodeList = Array.isArray(proxies) ? proxies : [];

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

  const enableNodeUdp = ruleOptionsEnable['试开启节点UDP'] === true;

  if (enableNodeUdp) {
    for (const proxy of nodeList) {
      if (!proxy || typeof proxy !== "object") {
        continue;
      }

      proxy.udp = true;
    }
  }

  const forceCertVerify = ruleOptionsEnable['强制证书验证'] === true;

  for (const proxy of nodeList) {
    if (!proxy || typeof proxy !== "object") {
      continue;
    }

    if (forceCertVerify) {
      proxy["skip-cert-verify"] = false;
    }
  }

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

    if (preferIPv6) {
      override['ip-version'] = 'ipv6-prefer';
    }
    provider.override = override;
  });
}

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

const SKK_RULES = [
  'RULE-SET,skk_reject_drop,REJECT-DROP',
  'RULE-SET,skk_reject,🛑 广告拦截',
  'RULE-SET,skk_reject_non_ip,🛑 广告拦截',
  'RULE-SET,skk_reject_ip,REJECT,no-resolve',
];

function applySkkAdBlock(result) {
  if (ruleOptionsEnable['使用SKK广告拦截'] !== true) {
    return;
  }

  const originalProviders = result['rule-providers'] || {};
  const providersWithSkk = deepClone(SKK_RULE_PROVIDERS);
  Object.keys(originalProviders).forEach((name) => {
    providersWithSkk[name] = originalProviders[name];
  });
  result['rule-providers'] = providersWithSkk;

  const proxyGroups = result['proxy-groups'] || [];
  const insertIndex = findPriorityGroupInsertionIndex(proxyGroups);
  const reserveEntryGroupPosition = ruleOptionsEnable['入口解析'] === true ? 1 : 0;
  proxyGroups.splice(insertIndex + reserveEntryGroupPosition, 0, deepClone(SKK_PROXY_GROUP));
  result['proxy-groups'] = proxyGroups;

  if (!Array.isArray(result.rules)) {
    result.rules = [];
  }
  const hijackingIndex = result.rules.findIndex(
    (rule) => typeof rule === 'string' && rule.startsWith('RULE-SET,HijackingPlus,')
  );
  const insertRuleIndex = hijackingIndex >= 0 ? hijackingIndex + 1 : 0;
  result.rules.splice(insertRuleIndex, 0, ...SKK_RULES);
}

function getExplicitProxyMultipliers(name) {
  if (typeof name !== 'string') return [];
  const multipliers = [];
  const suffixMatches = name.matchAll(/(?:^|[^A-Za-z0-9_.])(\d+(?:\.\d+)?)\s*[x×](?![A-Za-z0-9_])/giu);
  for (const match of suffixMatches) multipliers.push(Number(match[1]));
  const prefixMatches = name.matchAll(/(?:^|[^A-Za-z0-9_.])[x×]\s*(\d{1,2}(?:\.\d+)?|\d+\.\d+)(?!\d)(?!\.\d)(?![A-Za-z_])/giu);
  for (const match of prefixMatches) multipliers.push(Number(match[1]));
  return multipliers;
}

function collectDialerProxyProtectedNames(proxies) {
  const protectedNames = new Set();
  if (!Array.isArray(proxies)) return protectedNames;
  proxies.forEach((proxy) => {
    if (!proxy || typeof proxy !== 'object') return;
    const target = typeof proxy['dialer-proxy'] === 'string' ? proxy['dialer-proxy'].trim() : '';
    if (!target) return;
    protectedNames.add(target);
    if (typeof proxy.name === 'string' && proxy.name) protectedNames.add(proxy.name);
  });
  return protectedNames;
}

function applyProxyMultiplierFilters(result, protectedNames) {
  const removedProxyNames = new Set();
  const filterHigh = ruleOptionsEnable['剔除≥2x'] === true;
  const filterLow = ruleOptionsEnable['剔除≤0.5x'] === true;
  if (!filterHigh && !filterLow) return removedProxyNames;
  if (!Array.isArray(result.proxies)) return removedProxyNames;

  result.proxies = result.proxies.filter((proxy) => {
    if (!proxy || typeof proxy !== 'object' || typeof proxy.name !== 'string') return true;
    if (protectedNames && protectedNames.has(proxy.name)) return true;
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

const FREE_NODE_FILTER_REGEX = /免费|体验|试用|公益|白嫖|0元|\bfree\b/iu;

function applyFreeNodeFilter(result, protectedNames) {
  const removedProxyNames = new Set();
  if (ruleOptionsEnable['剔除免费'] !== true) return removedProxyNames;
  if (!Array.isArray(result.proxies)) return removedProxyNames;

  result.proxies = result.proxies.filter((proxy) => {
    if (!proxy || typeof proxy !== 'object' || typeof proxy.name !== 'string') return true;
    if (protectedNames && protectedNames.has(proxy.name)) return true;
    const shouldRemove = FREE_NODE_FILTER_REGEX.test(normalizeNameForJsMatching(proxy.name));
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
]);
const COUNTRY_REGION_INJECTION_ANCHOR_NAMES = new Set([
  'DIRECT',
]);
const COUNTRY_REGION_CHILD_GROUP_TYPES = [
  { suffix: '自动选择', type: 'url-test' },
  { suffix: '自动回退', type: 'fallback' },
];

function countryRegionChildGroupName(parentName, suffix) {
  return parentName + ' · ' + suffix;
}

const COUNTRY_REGION_PARENT_ICON =
  'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Qure-Style-SVG-Global.svg';

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

    if (matchedRegions.length === 0) {
      otherRegionProxies.add(proxy);
      selectedRegions = [];
    }

    if (
      selectedRegions.length === 2 &&
      selectedRegions.some((definition) => COUNTRY_REGION_PRIORITY_NAMES.has(definition.name)) &&
      selectedRegions.some((definition) => !COUNTRY_REGION_PRIORITY_NAMES.has(definition.name))
    ) {
      selectedRegions = selectedRegions.filter((definition) =>
        COUNTRY_REGION_PRIORITY_NAMES.has(definition.name)
      );
    }

    if (selectedRegions.length >= 3) {
      otherRegionProxies.add(proxy);
      selectedRegions = [];
    }

    regionMembershipByProxy.set(proxy, selectedRegions);
  });

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
        } else if (childDefinition.type === 'fallback') {
          Object.assign(child, healthCheckSettings);
          if (childDefinition.type === 'fallback') {
            child.lazy = false;
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

const ENTRY_RESOLUTION_EXCLUDE_FILTER = '^(?:电信|联通|移动|云厂)节点-[0-9]{2,}$';

const DOMESTIC_ENTRY_PROXIES = {

  telecom: [{
    type: 'http',
    server: '61.130.176.21',
    port: 20945
  }],

  unicom: [{
    type: 'http',
    server: '101.251.204.174',
    port: 8080
  }],

  mobile: [],

};

const ENTRY_RESOLUTION_OPTIONS = [
  { category: 'telecom', prefix: '电信节点' },
  { category: 'unicom', prefix: '联通节点' },
  { category: 'mobile', prefix: '移动节点' },
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
function removeQuicNameserverPolicies(dns) {
  const policy = dns && dns['nameserver-policy'];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return;
  QUIC_REMOVED_NAMESERVER_POLICY_KEYS.forEach((key) => {
    delete policy[key];
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

function main(config, profileName) {
  config = config || {};

  const entryNamePattern = new RegExp(ENTRY_RESOLUTION_EXCLUDE_FILTER);
  const originalProxies = (Array.isArray(config.proxies) ? config.proxies : []).filter(
    (proxy) => ruleOptionsEnable['入口解析'] !== true ||
      !(proxy && typeof proxy.name === 'string' &&
        entryNamePattern.test(normalizeNameForJsMatching(proxy.name)))
  );

  applyNodeFieldOverrides(originalProxies);

  const originalProxyProviders =
    config['proxy-providers'] && typeof config['proxy-providers'] === 'object'
      ? config['proxy-providers']
      : null;

  const result = deepClone(TEMPLATE);

  if (ruleOptionsEnable['IPv6优先'] !== true) {
    result.ipv6 = false;
    if (result.dns) {
      result.dns.ipv6 = false;
      delete result.dns['fake-ip-range6'];
    }
  }

  applyTelegramDcExperiment(result, originalProxies);

  result.proxies = originalProxies.slice();
  if (originalProxyProviders) {

    result['proxy-providers'] = deepClone(originalProxyProviders);
    applyProviderOverrides(result);
  }

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

  const disabledGroupNames = new Set();
  const activeGroupNames = new Set();

  (result['proxy-groups'] || []).forEach(group => {
    if (group && group.name) {

      const optionName = group.name === '📲 Telegram(兜底)' ? '📲 Telegram' : group.name;

      if (ruleOptionsEnable[optionName] === false) {
        disabledGroupNames.add(group.name);
      } else {
        activeGroupNames.add(group.name);
      }
    }
  });

  result['proxy-groups'] = (result['proxy-groups'] || []).filter(
    group => group && group.name && !disabledGroupNames.has(group.name)
  );

  const fallbackTarget = activeGroupNames.has('🌍 PROXY') ? '🌍 PROXY' : 'DIRECT';

  result['proxy-groups'].forEach(group => {
    if (disabledGroupNames.has(group['default-selected'])) {
      delete group['default-selected'];
    }
    if (Array.isArray(group.proxies)) {
      group.proxies = group.proxies.filter(p => !disabledGroupNames.has(p));

      if (group.proxies.length === 0) {
        group.proxies = [fallbackTarget];
      }
    }
  });

  const directSwitchGroups = [
    ['关闭FCM直连', 'FCM']
  ];
  directSwitchGroups.forEach(([optionName, groupName]) => {
    const directDisabled = ruleOptionsEnable[optionName] === true;
    result['proxy-groups'].forEach((group) => {
      if (!group || group.name !== groupName) return;
      if (directDisabled) {
        if (disabledGroupNames.has('👉 手动选择')) {

          group.proxies = [fallbackTarget];
        } else {
          group.proxies = ['👉 手动选择'];
        }
      } else {
        group.proxies = ['DIRECT'];
      }
    });
  });

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

  removeDisabledDnsNameserverPolicies(result.dns, disabledGroupNames);

  const WEBRTC_DST_PORT = 'DST-PORT,3478-3479/5349-5350/19302-19309';
  const isWebRtcBlockingRule = (rule) =>
    typeof rule === 'string' &&
    rule.includes('NETWORK,UDP') &&
    rule.includes(WEBRTC_DST_PORT);
  if (ruleOptionsEnable['关闭WebRTC阻断'] === true && Array.isArray(result.rules)) {
    if (result.rules.some(isWebRtcBlockingRule)) {
      result.rules = result.rules.filter((rule) => !isWebRtcBlockingRule(rule));
    }
  }

  if (ruleOptionsEnable['QUIC阻断'] === true && Array.isArray(result.rules)) {
    if (ruleOptionsEnable['关闭WebRTC阻断'] === true) {
      const templateWebRtcRule = (TEMPLATE.rules || []).find(isWebRtcBlockingRule);
      if (templateWebRtcRule) {
        const quicRule = templateWebRtcRule.replace(WEBRTC_DST_PORT, 'DST-PORT,443');
        if (!result.rules.includes(quicRule)) {
          result.rules.unshift(quicRule);
        }
      }
    } else {
      result.rules = result.rules.map((rule) =>
        isWebRtcBlockingRule(rule) ? rule.replace(WEBRTC_DST_PORT, `${WEBRTC_DST_PORT}/443`) : rule
      );
    }
  }

  if (ruleOptionsEnable['QUIC阻断'] === true) {
    removeQuicNameserverPolicies(result.dns);
    if (result.dns) {
      result.dns['prefer-h3'] = false;
    }
  }

  smartMergeDnsNode(
    config,
    result
  );

  const dialerProtectedProxyNames = collectDialerProxyProtectedNames(result.proxies);
  const removedProxyNames = applyProxyMultiplierFilters(result, dialerProtectedProxyNames);

  applyFreeNodeFilter(result, dialerProtectedProxyNames).forEach((name) => removedProxyNames.add(name));

  applyCountryRegionGrouping(
    result,
    originalProxies.filter((proxy) => !(proxy && removedProxyNames.has(proxy.name)))
  );

  applyEntryResolution(result);

  applySkkAdBlock(result);

  removeUnusedRuleProviders(result);


  return result;
}
