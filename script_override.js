// Bettbox 兼容声明：Bettbox 客户端的预期行为是在脚本开头识别该声明（并非全量读取），
// 脚本需遵循此约定：声明必须置顶，删除或下移会导致"自定义规则开关"入口不显示。
const Compatible_With_Bettbox = {
  ruleOptionsEnable: true,
  // 声明属于策略组的开关名称，需与 ruleOptionsEnable 的键完全一致
  policyGroupOptions: [
    '🌍 PROXY',
    '🔄 负载均衡',
    '👉 手动切换',
    '♻️ 自动选择',
    '📲 Telegram',
    '🎮 Games-Global',
    '🍎 海外苹果',
    '💠 海外微软',
    '🎮 Steam平台（非下载/CDN）',
    '✖️ Twitter',
    '🤖 AI大模型',
    '🎵 TikTok',
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
 *    模板：
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
 *       若订阅自带 proxy-providers，会原样保留并注入最终配置。
 *
 *    2. proxies：使用订阅原始配置里的真实节点列表（模板里这一项本来就是空的，
 *       只是占位）。
 *
 *    3. proxy-groups 使用 Mihomo 原生 include-all / include-all-proxies
 *       动态引入订阅节点和代理提供者；🍎 海外苹果、💠 海外微软、🎮 Steam平台（非下载/CDN）、
 *       🎮 Games-Global 保留模板中显式列出的固定策略项。带 filter 的分组继续由 Mihomo
 *       原生筛选。TGDC 实验组在没有地区节点时仍由脚本显式生成保底节点列表。
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


const ruleOptionsEnable = {

  /**
 * 自定义配置选项
 * 为模板里的每个代理组（策略组）单独定义开关：
 * true  = 启用该策略组
 * false = 禁用该策略组（会自动从 proxy-groups 中移除，并清理其他组中的引用）
 * 另有功能开关（如 FCM直连）：只调整组内节点，不涉及策略组启停。
 */

  // --- 代理组（策略组）单独控制开关 ---
  // 主代理策略组
  '🌍 PROXY': true,
  // 负载均衡策略组
  '🔄 负载均衡': true,
  // 手动选择策略组
  '👉 手动切换': true,
  // 延迟自动选择策略组
  '♻️ 自动选择': true,
  // Telegram 通讯软件策略组
  '📲 Telegram': true,
  // 游戏策略组
  '🎮 Games-Global': true,
  // 海外 Apple 平台服务
  '🍎 海外苹果': true,
  // 海外 Microsoft 平台服务
  '💠 海外微软': true,
  // Steam 平台服务，不负责下载/CDN
  '🎮 Steam平台（非下载/CDN）': true,
  // Twitter 社交平台策略组
  '✖️ Twitter': true,
  // AI 大模型策略组
  '🤖 AI大模型': true,
  // TikTok 视频平台策略组
  '🎵 TikTok': true,

  // --- 节点与网络功能开关 ---
  // 开启时统一把订阅节点 skip-cert-verify 置为 false（强制校验证书）；关闭时不干预，保留订阅节点原有设置。对全部节点一视同仁
  '强制证书验证': false,
  // 是否为带非空 public-key/short-id 的 Reality 节点启用 support-x25519mlkem768（X25519MLKEM768 后量子密钥协商）
  '启用 Reality 增强': true,
  // 开启后按节点 ip-version 优先使用 IPv6
  'IPv6优先': false,
  // 默认打开：隐藏组 FCM 仅含 DIRECT；关闭后优先使用 👉 手动切换，若该组已关闭则回退到 🌍 PROXY，再回退到 DIRECT（不移除 FCM 组）。开关图标取自 FCM 代理组的 icon 字段。
  'FCM直连': true,
  // 开启 Telegram DC/地区实验分流；关闭时不改变原 Telegram 规则、策略组和规则集。
  'TGDC实验分流': false,
  // 开启后，维护区所有运营商的入口节点统一加入“国内入口解析”组，不进入其他代理组。
  '入口解析': false,
  // 最后为节点解析 DNS 的无协议地址补 tcp://；不改变显式协议、出口后缀或 DNS 优先级，TCP 失败不回退 UDP。
  '代理节点 DNS 使用 TCP': false,
};

// 出现同一个域名规则 key 时，订阅原始配置(true) 还是模板(false) 优先（模板目前未配置
// proxy-server-nameserver-policy，因此该开关当前实际只影响订阅来源之间的合并）
const NAMESERVER_POLICY_PREFER_ORIGINAL = true;

// ============================================================================
// 国内入口解析节点维护区
// 每个运营商维护一个数组：可复制数组内的节点对象追加多个节点，填 [] 表示不配置。
// 仅维护 type / server / port 及其他 Mihomo 节点字段，无需填写 name；即使填写也会被覆盖。
// 名称强制为“电信入口解析-01”等，按各运营商数组顺序独立编号，从 01 开始，超过 99 不截断。
// ============================================================================
const DOMESTIC_ENTRY_PROXIES = {
  // 中国电信
  telecom: [{
    type: 'http',
    server: '36.111.33.167',
    port: 13128
  }],

  // 中国联通
  unicom: [{
    type: 'http',
    server: '119.188.131.55',
    port: 17981
  }],

  // 中国移动
  mobile: [{
    type: 'http',
    server: '116.196.150.180',
    port: 17981
  }]
};

// 运营商与强制命名前缀的固定映射，不应修改；节点顺序不代表自动优先级。
const ENTRY_RESOLUTION_OPTIONS = [
  { carrier: 'telecom', prefix: '电信入口解析' },
  { carrier: 'unicom', prefix: '联通入口解析' },
  { carrier: 'mobile', prefix: '移动入口解析' }
];
// 保留命名空间：用于排除入口节点，并防止同名订阅节点抢占维护区定义。
const ENTRY_RESOLUTION_EXCLUDE_FILTER = '^(?:电信|联通|移动)入口解析-[0-9]{2,}$';

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

// 地区组没有匹配节点时，按订阅原始顺序展示全部合格节点供手动选择。
// 地区检测与保底筛选仅依据订阅顶层 proxies；JS 不读取 proxy-providers 的运行时节点，
// 因此 provider 节点不参与地区命中判断，也不会进入此处生成的保底列表。
// 仅从订阅直接列出的节点中排除异常、内置/拒绝/重匹配和提示信息；免费、低倍率、高倍率均允许。
// 若仍无候选，使用 COMPATIBLE；empty-fallback 只接受单节点名称，不能填写策略组或多个节点。
const TGDC_FALLBACK_EXCLUDE_FILTER =
  /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;

function selectTelegramDcFallbackNodes(originalProxies) {
  const proxies = Array.isArray(originalProxies) ? originalProxies : [];
  return proxies.filter((proxy) => {
    if (!proxy || typeof proxy !== 'object' || typeof proxy.name !== 'string' || proxy.name.trim().length === 0) {
      return false;
    }
    const type = String(proxy.type || '').toLowerCase();
    if (type === 'direct' || type === 'reject' || type === 'rematch') {
      return false;
    }
    const name = proxy.name;
    if (TGDC_FALLBACK_EXCLUDE_FILTER.test(name)) return false;
    return true;
  }).map((proxy) => proxy.name);
}

const TGDC_PROXY_GROUP_DEFINITIONS = [
  {
    name: '📲 Telegram-DC1-DC3-Miami',
    filter: '(?i)🇺🇸|美国|迈阿密|miami|\\bMIA\\b|\\bUSA\\b|united\\s*states',
    icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-Koolson-Qure-United_States.png',
  },
  {
    name: '📲 Telegram-DC2-DC4-Amsterdam',
    filter: '(?i)🇳🇱|荷兰|阿姆斯特丹|amsterdam|\\bAMS\\b|\\bNL\\b|netherlands',
    // Qure 无荷兰原生图标，此为按 Qure 风格自绘的荷兰旗，托管于本仓库 assets/icons。
    icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/self-Netherlands.png',
  },
  {
    name: '📲 Telegram-DC5-SG',
    // 根据实际互联情况，DC5 组同时纳入香港与新加坡节点。
    filter: '(?i)🇸🇬|🇭🇰|新加坡|狮城|香港|singapore|hong\\s*kong|\\bSG\\b|\\bSGP\\b|\\bHK\\b|\\bHKG\\b',
    icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-Koolson-Qure-Singapore.png',
  },
];

function buildTelegramDcProxyGroups(originalProxies) {
  const proxies = Array.isArray(originalProxies) ? originalProxies : [];
  const fallbackNodeNames = selectTelegramDcFallbackNodes(proxies);
  return TGDC_PROXY_GROUP_DEFINITIONS.map((definition) => {
    const group = {
      name: definition.name,
      type: 'select',
      filter: definition.filter,
      'include-all-proxies': true,
      'empty-fallback': 'COMPATIBLE',
      icon: definition.icon,
    };
    // 复用地区定义，并对齐内核的 Unicode 词边界、空白和小写匹配，避免中文紧贴缩写时误判。
    const wordChars = '[\\p{L}\\p{Mn}\\p{Nd}\\p{Pc}\\u200C\\u200D]';
    const spaceChars = '[\\u0009-\\u000D\\u0020\\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]';
    const regionPattern = definition.filter.replace(/^\(\?i\)/, '').toLowerCase()
      .replace(/\\b([a-z]+)\\b/g, `(?<!${wordChars})$1(?!${wordChars})`)
      .replace(/\\s/g, spaceChars);
    const regionFilter = new RegExp(regionPattern, 'u');
    // 内核将 İ 小写为单字符 i；先替换，避免 JS 将其扩展为 i 加组合点。
    const hasRegionNode = proxies.some((proxy) =>
      proxy && typeof proxy.name === 'string' && regionFilter.test(proxy.name.replace(/\u0130/g, 'I').toLowerCase())
    );
    if (!hasRegionNode && fallbackNodeNames.length > 0) {
      // 只在地区无候选时放宽；显式列出全部保底节点，避免继续按地区过滤或混入其他来源。
      delete group.filter;
      delete group['include-all-proxies'];
      group.proxies = fallbackNodeNames.slice();
    }
    return group;
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
// 标准模板配置（mihomo.yaml 的 JSON 表示）
// ============================================================================

const TEMPLATE = {
  "mode": "rule",
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
  "store-selected": true,
  "store-fake-ip": true,
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
    "parse-pure-ip": true,
    "override-destination": true,
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
    "force-domain": [
      "+.v2ex.com"
    ],
    "skip-domain": [
      "Mijia Cloud",
      "dlg.io.mi.com",
      "+.apple.com",
      "+.icloud.com",
      "+.wechat.com",
      "+.qpic.cn",
      "+.qq.com",
      "+.wechatapp.com",
      "+.vivox.com",
      "+.oray.com",
      "+.sunlogin.net"
    ],
    "skip-dst-address": [
      "rule-set:telegramcidr",
      "rule-set:twitter-x-ip",
      "rule-set:lancidr",
      "rule-set:cncidr",
      "8.8.8.8/32",
      "8.8.4.4/32",
      "2001:4860:4860::8888/128",
      "2001:4860:4860::8844/128",
      "1.1.1.1/32",
      "1.0.0.1/32",
      "2606:4700:4700::1111/128",
      "2606:4700:4700::1001/128",
      "9.9.9.9/32",
      "149.112.112.112/32",
      "2620:fe::fe/128",
      "208.67.222.222/32",
      "208.67.220.220/32",
      "2620:119:35::35/128",
      "94.140.14.14/32",
      "94.140.15.15/32",
      "2a10:50c0::ad1:ff/128",
      "2a10:50c0::ad2:ff/128",
      "185.228.168.9/32",
      "185.228.169.9/32",
      "64.6.64.6/32",
      "64.6.65.6/32",
      "77.88.8.8/32",
      "77.88.8.1/32",
      "185.222.222.222/32",
      "45.11.45.11/32",
      "223.5.5.5/32",
      "223.6.6.6/32",
      "2400:3200::1/128",
      "2400:3200:baba::1/128",
      "119.29.29.29/32",
      "182.254.116.116/32",
      "180.76.76.76/32",
      "114.114.114.114/32",
      "114.114.115.115/32",
      "114.114.114.119/32",
      "114.114.115.119/32",
      "1.2.4.8/32",
      "210.2.4.8/32",
      "101.226.4.6/32",
      "218.30.118.6/32"
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
      "https://doh.pub/dns-query#DIRECT"
    ],
    "direct-nameserver-follow-policy": true,
    "nameserver": [
      "https://cloudflare-dns.com/dns-query#👉 手动切换"
    ],
    "nameserver-policy": {
      "rule-set:proxy@direct,cn,echs_direct": [
        "https://dns.alidns.com/dns-query#DIRECT",
        "https://doh.pub/dns-query#DIRECT"
      ],
      "rule-set:private": [
        "system"
      ],
      "rule-set:douyin": [
        "system",
        "180.184.1.1",
        "180.184.2.2"
      ]
    },
      "prefer-h3": false,
    "respect-rules": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-range6": "fdfe:dcba:9876::1/64",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": [
      "rule-set:fakeip-filter_domain",
      "rule-set:private",
      "rule-set:cn",
      "rule-set:echs_direct",
      "rule-set:googlefcm",
      "rule-set:applications",
      "rule-set:pixiv",
      "pixshaft.com"
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
      "108.177.125.188"
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
  "proxies": null,
  "proxy-groups": [
    {
      "name": "🌍 PROXY",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-DustinWin-ruleset_geodata-proxy.png",
      "type": "select",
      "proxies": [
        "👉 手动切换",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ]
    },
    {
      "name": "🔄 负载均衡",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-clash-verge-rev-balance.svg",
      "type": "load-balance",
      "include-all": true,
      "url": "https://www.gstatic.com/generate_204",
      "interval": 300,
      "lazy": true,
      "strategy": "sticky-sessions"
    },
    {
      "name": "👉 手动切换",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-DustinWin-ruleset_geodata-select.png",
      "type": "select",
      "include-all": true
    },
    {
      "name": "♻️ 自动选择",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-DustinWin-ruleset_geodata-auto.png",
      "type": "url-test",
      "url": "https://www.gstatic.com/generate_204",
      "interval": 300,
      "tolerance": 50,
      "include-all": true
    },
    {
      "name": "🍎 海外苹果",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-AIsouler-MyClash-Apple.svg",
      "type": "select",
      "proxies": [
        "👉 手动切换",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "💠 海外微软",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/self-Microsoft.svg",
      "type": "select",
      "proxies": [
        "👉 手动切换",
        "♻️ 自动选择",
        "🔄 负载均衡",
        "DIRECT"
      ],
      "include-all": true
    },
    {
      "name": "🎮 Steam平台（非下载/CDN）",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-AIsouler-MyClash-Steam.svg",
      "type": "select",
      "default-selected": "DIRECT",
      "proxies": [
        "DIRECT",
        "👉 手动切换",
        "♻️ 自动选择",
        "🔄 负载均衡"
      ],
      "include-all": true
    },
    {
      "name": "📲 Telegram",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-DustinWin-ruleset_geodata-telegram.png",
      "type": "select",
      "include-all": true
    },
    {
      "name": "🎮 Games-Global",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-DustinWin-ruleset_geodata-games-cn.png",
      "type": "select",
      "default-selected": "🎮 Steam平台（非下载/CDN）",
      "proxies": [
        "🎮 Steam平台（非下载/CDN）"
      ],
      "include-all": true
    },
    {
      "name": "✖️ Twitter",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-clash-verge-rev-twitter.svg",
      "type": "select",
      "filter": "(?i)^(?!.*(?:🇭🇰|香港|Hong\\s*Kong|\\bHK\\b|🇸🇬|新加坡|Singapore|\\bSG\\b)).*(?:住宅|家宽|家寬|家庭宽带|家庭寬頻|原生住宅|住宅\\s*IP|residential|home\\s*broadband|home\\s*internet|🇺🇸|美国|美國|\\bUnited\\s+States\\b|\\bU\\.?S\\.?(?:A\\.?)?\\b).*$",
      "include-all": true
    },
    {
      "name": "🤖 AI大模型",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-DustinWin-ruleset_geodata-ai.png",
      "type": "select",
      "filter": "(?i)^(?!.*(?:🇭🇰|香港|Hong\\s*Kong|\\bHK\\b|🇸🇬|新加坡|Singapore|\\bSG\\b)).*(?:住宅|家宽|家寬|家庭宽带|家庭寬頻|原生住宅|住宅\\s*IP|residential|home\\s*broadband|home\\s*internet|🇺🇸|美国|美國|\\bUnited\\s+States\\b|\\bU\\.?S\\.?(?:A\\.?)?\\b).*$",
      "include-all": true
    },
    {
      "name": "🎵 TikTok",
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-DustinWin-ruleset_geodata-tiktok.png",
      "type": "select",
      "filter": "(?i)^(?!.*(?:🇭🇰|香港|Hong\\s*Kong|\\bHK\\b|🇸🇬|新加坡|Singapore|\\bSG\\b)).*(?:住宅|家宽|家寬|家庭宽带|家庭寬頻|原生住宅|住宅\\s*IP|residential|home\\s*broadband|home\\s*internet|🇺🇸|美国|美國|\\bUnited\\s+States\\b|\\bU\\.?S\\.?(?:A\\.?)?\\b).*$",
      "include-all": true
    },
    {
      "hidden": true,
      "icon": "https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-MiToverG422-Qure-fcm.png",
      "name": "FCM",
      "proxies": [
        "👉 手动切换",
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
      "url": "https://cdn.jsdelivr.net/gh/Accademia/Additional_Rule_For_Clash@master/Gemini/Gemini_Domain.yaml",
      "path": "./ruleset/Gemini_Domain.yaml"
    },
    "Grok_Domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/refs/heads/main/Grok/Grok_Domain.yaml",
      "path": "./ruleset/Grok_Domain.yaml"
    },
    "HijackingPlus": {
      "type": "http",
      "interval": 86400,
      "behavior": "classical",
      "url": "https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/refs/heads/main/HijackingPlus/HijackingPlus_No_Resolve.yaml",
      "path": "./ruleset/HijackingPlus.yaml"
    },
    "TikTok": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/tiktok.mrs",
      "path": "./ruleset/tiktok.mrs"
    },
    "ai-1": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/ai.mrs",
      "path": "./ruleset/ai-1.mrs"
    },
    "ai-2": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs",
      "path": "./ruleset/ai-2.mrs"
    },
    "microsoft": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/microsoft.mrs",
      "path": "./ruleset/microsoft.mrs"
    },
    "microsoft_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/microsoft.mrs",
      "path": "./ruleset/microsoft_ip.mrs"
    },
    "apple": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/apple.mrs",
      "path": "./ruleset/apple.mrs"
    },
    "apple_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/apple.mrs",
      "path": "./ruleset/apple_ip.mrs"
    },
    "steam": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/steam.mrs",
      "path": "./ruleset/steam.mrs"
    },
    "steam_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geoip/steam.mrs",
      "path": "./ruleset/steam_ip.mrs"
    },
    "douyin": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/douyin.mrs",
      "path": "./ruleset/douyin.mrs"
    },
    "applications": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt",
      "path": "./ruleset/applications.yaml"
    },
    "cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/cn.mrs",
      "path": "./ruleset/cn.mrs"
    },
    "cncidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/cnip.mrs",
      "path": "./ruleset/cncidr.mrs"
    },
    "echs_direct": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/echs-top/proxy/main/mrs/domain/direct.mrs",
      "path": "./ruleset/echs_direct.mrs"
    },
    "echs_direct_ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/echs-top/proxy/main/mrs/ip/direct.mrs",
      "path": "./ruleset/echs_direct_ip.mrs"
    },
    "fakeip-filter_domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/fakeip-filter.mrs",
      "path": "./ruleset/fakeip-filter_domain.mrs"
    },
    "games": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/games.mrs",
      "path": "./ruleset/games.mrs"
    },
    "gfw": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/gfw.mrs",
      "path": "./ruleset/gfw.mrs"
    },
    "google": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/google.txt",
      "path": "./ruleset/google.yaml"
    },
    "google-cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/google-cn.mrs",
      "path": "./ruleset/google-cn.mrs"
    },
    "googlefcm": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/googlefcm.mrs",
      "path": "./ruleset/googlefcm.mrs"
    },
    "lancidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/lancidr.txt",
      "path": "./ruleset/lancidr.yaml"
    },
    "pixiv": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/pixiv.mrs",
      "path": "./ruleset/pixiv.mrs"
    },
    "private": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt",
      "path": "./ruleset/private.yaml"
    },
    "proxy": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/proxy.mrs",
      "path": "./ruleset/proxy.mrs"
    },
    "proxy@direct": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/echs-top/proxy/main/mrs/domain/proxy@direct.mrs",
      "path": "./rules/proxy@direct.mrs"
    },
    "telegram_domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs",
      "path": "./rules/telegram_domain.mrs"
    },
    "telegramcidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/reddishJade/private_proxy/main/Mihomo/Provider/telegram%40ip.mrs",
      "path": "./ruleset/telegramcidr.mrs"
    },
    "twitter-x-blackmatrix7-No_Resolve": {
      "type": "http",
      "interval": 86400,
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Twitter/Twitter_No_Resolve.yaml",
      "path": "./ruleset/twitter-x-blackmartix7-noreslove.mrs"
    },
    "twitter-x-domain": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/twitter.mrs",
      "path": "./ruleset/twitter/x-domain.mrs"
    },
    "twitter-x-ip": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/twitter.mrs",
      "path": "./ruleset/twitter/x-ip.mrs"
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
    "AND,((NETWORK,UDP),(DST-PORT,3478-3479/5349-5350/19302-19309),(NOT,((RULE-SET,cncidr))),(NOT,((RULE-SET,cn))),(NOT,((RULE-SET,applications))),(NOT,((RULE-SET,games))),(NOT,((RULE-SET,echs_direct)))),REJECT",
    "RULE-SET,HijackingPlus,REJECT",
    "RULE-SET,applications,DIRECT",
    // 国内 Apple、Microsoft、Games 分类直连统一交给 echs_direct。
    "RULE-SET,echs_direct_ip,DIRECT,no-resolve",
    "RULE-SET,echs_direct,DIRECT",
    "RULE-SET,cncidr,DIRECT,no-resolve",
    "RULE-SET,cn,DIRECT",
    "DOMAIN,clash.razord.top,DIRECT",
    "DOMAIN,yacd.haishan.me,DIRECT",
    "PROCESS-NAME,svchost.exe,DIRECT",
    "RULE-SET,private,DIRECT,no-resolve",
    "RULE-SET,lancidr,DIRECT,no-resolve",
    "DOMAIN-WILDCARD,*.deepseek.com,DIRECT",
    "DOMAIN-WILDCARD,*.portal101.cn,DIRECT",
    "DOMAIN-SUFFIX,cdnhwcqwg14.com,DIRECT",
    "DOMAIN-SUFFIX,cdnhwcxcy07.com,DIRECT",
    "DOMAIN-SUFFIX,cdngslb.com,DIRECT",
    "DOMAIN-SUFFIX,edgekey.net,DIRECT",
    "DOMAIN-SUFFIX,cloudfront.net,DIRECT",
    "RULE-SET,googlefcm,FCM",
    "SUB-RULE,(PROCESS-NAME,com.dragon.read.oversea.gp),fanqie",
    "DOMAIN-KEYWORD,ikuuu,🌍 PROXY",
    // 通用直连规则优先，剩余 Apple / Microsoft 域名和 IP 再进入海外组。
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
    "PROCESS-NAME-REGEX,(?i).*(manus|tech\\.butterfly\\.app).*,🤖 AI大模型",
    // Muse：覆盖 Muse Android 客户端进程及官网与后端域名
    "DOMAIN-SUFFIX,muse.ai,🤖 AI大模型",
    "DOMAIN,hatch-api.meta.ai,🤖 AI大模型",
    "DOMAIN,api.meta.ai,🤖 AI大模型",
    "DOMAIN,agent.meta.ai,🤖 AI大模型",
    "DOMAIN-SUFFIX,metaaivm.com,🤖 AI大模型",
    "DOMAIN,auth.meta.com,🤖 AI大模型",
    "DOMAIN,meta.graph.meta.com,🤖 AI大模型",
    "DOMAIN,edge-metaclaw-http.c10r.facebook.com,🤖 AI大模型",
    "DOMAIN,shortwave.facebook.com,🤖 AI大模型",
    "DOMAIN,node.hatch.one,🤖 AI大模型",
    "PROCESS-NAME,com.facebook.aura,🤖 AI大模型",
    "PROCESS-NAME-REGEX,(?i).*claude.*,🤖 AI大模型",
    "PROCESS-NAME-REGEX,(?i).*anthropic.*,🤖 AI大模型",
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
    "DOMAIN-SUFFIX,frame.claudeusercontent.com,🤖 AI大模型",
    "DOMAIN-SUFFIX,modelcontextprotocol.io,🤖 AI大模型",
    "IP-CIDR,160.79.104.0/21,🤖 AI大模型,no-resolve",
    "IP-CIDR6,2607:6bc0::/48,🤖 AI大模型,no-resolve",
    "IP-CIDR,17.253.4.0/23,🤖 AI大模型,no-resolve",
    "RULE-SET,Gemini_Domain,🤖 AI大模型",
    "RULE-SET,Grok_Domain,🤖 AI大模型",
    "DOMAIN,anthropic.com.cdn.cloudflare.net,🤖 AI大模型",
    "DOMAIN,anthropic-com.ghost.io,🤖 AI大模型",
    "DOMAIN-SUFFIX,sentry.io,🤖 AI大模型",
    "DOMAIN-SUFFIX,statsigapi.net,🤖 AI大模型",
    "DOMAIN,browser-intake-us5-datadoghq.com,🤖 AI大模型",
    "DOMAIN-KEYWORD,datadog,🤖 AI大模型",
    "DOMAIN-KEYWORD,sift,🤖 AI大模型",
    "RULE-SET,ai-1,🤖 AI大模型",
    "RULE-SET,ai-2,🤖 AI大模型",
    "RULE-SET,google,🌍 PROXY",
    "RULE-SET,google-cn,🌍 PROXY",
    "PROCESS-NAME-REGEX,.*twitter.*,✖️ Twitter",
    "RULE-SET,twitter-x-ip,✖️ Twitter,no-resolve",
    "RULE-SET,twitter-x-domain,✖️ Twitter",
    "RULE-SET,twitter-x-blackmatrix7-No_Resolve,✖️ Twitter",
    "RULE-SET,steam_ip,🎮 Steam平台（非下载/CDN）,no-resolve",
    "RULE-SET,steam,🎮 Steam平台（非下载/CDN）",
    "PROCESS-NAME,bf6.exe,🎮 Games-Global",
    "RULE-SET,games,🎮 Games-Global",
    "RULE-SET,TikTok,🎵 TikTok",
    "RULE-SET,proxy,🌍 PROXY",
    "RULE-SET,gfw,🌍 PROXY",
    "MATCH,🌍 PROXY"
  ]
};

// Bettbox 的可视化开关图标：客户端会读取全局 serviceConfigs（name 对应 ruleOptionsEnable 的 key，
// icon 为该开关行显示的图标）。上面只覆盖代理组；功能开关的图标来源：
// FCM直连 从 FCM 代理组的 icon 字段派生；
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
      name: 'FCM直连',
      icon: (TEMPLATE['proxy-groups'].find((group) => group && group.name === 'FCM') || {}).icon
    },
    {
      name: '强制证书验证',
      icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-MiToverG422-Qure-SSL.png'
    },
    {
      name: '启用 Reality 增强',
      icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-MiToverG422-Qure-Spark.png'
    },
    {
      name: 'IPv6优先',
      icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-Koolson-Qure-Global.png'
    },
    {
      name: 'TGDC实验分流',
      icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-Koolson-Qure-Telegram.png'
    },
    {
      name: '入口解析',
      icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-Koolson-Qure-Domestic.png'
    },
    {
      name: '代理节点 DNS 使用 TCP',
      // Carbon TCP/IP Service（IBM，Apache-2.0）；原样副本及许可证保存在 assets/icons。
      // 上游提交：45b0fc1b328ffdc4a784560f7983210b2e20596e；来源与许可见 README 图标致谢。
      icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-carbon-design-system-carbon-tcp-ip-service.svg'
    }
  ]);

// ============================================================================
// 工具函数
// ============================================================================

// 深拷贝：避免多次调用 main() 时互相污染同一份 TEMPLATE
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// =====================================================
// DNS 节点域名智能补充逻辑
// =====================================================

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

function selectedEntryResolutionOptions() {
  if (ruleOptionsEnable['入口解析'] !== true) {
    return [];
  }
  return ENTRY_RESOLUTION_OPTIONS.flatMap((option) => {
    const proxies = DOMESTIC_ENTRY_PROXIES[option.carrier];
    if (!Array.isArray(proxies)) {
      throw new Error('国内入口解析维护区 ' + option.carrier + ' 必须是节点数组（无节点请填 []）');
    }
    return proxies.map((proxy, index) => {
      if (!proxy || typeof proxy !== 'object' || Array.isArray(proxy)) {
        throw new Error('国内入口解析维护区 ' + option.carrier + ' 第 ' + (index + 1) + ' 项必须是节点对象');
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
    (name === groupName || new RegExp(ENTRY_RESOLUTION_EXCLUDE_FILTER).test(name));
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
    url: 'https://g.cn/generate_204',
    icon: 'https://fastly.jsdelivr.net/gh/XVSVTsama/XVSVT-Clash-Config@main/assets/icons/upstream-Koolson-Qure-Domestic.png'
  };
  const existingDisplayGroup = (result['proxy-groups'] || []).find(
    (group) => group && group.name === groupName
  );
  if (existingDisplayGroup) {
    // 重建专用组，不保留可能把其他节点混入的 include-all、use 或筛选字段。
    result['proxy-groups'][result['proxy-groups'].indexOf(existingDisplayGroup)] = displayGroup;
  } else {
    const autoSelectIndex = (result['proxy-groups'] || []).findIndex(
      (group) => group && group.name === '♻️ 自动选择'
    );
    if (autoSelectIndex >= 0) {
      result['proxy-groups'].splice(autoSelectIndex + 1, 0, displayGroup);
    } else {
      result['proxy-groups'].push(displayGroup);
    }
  }

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
    // 无方括号 IPv6 必须按 URI 语法加方括号；完整保留 #DIRECT、#国内入口解析及其他参数。
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
// 公共 DNS 识别表：用于区分“公共可直连 DNS”和“机场/用户的私有 DNS”。
// 数据参考本地 MyClash 仓库里的公共 DNS 列表，但这里只借用识别表，不照搬其处理逻辑。
const publicDnsList = [
  // 国内
  '223.5.5.5', '223.6.6.6', '119.29.29.29', '1.12.12.12',
  '120.53.53.53', '114.114.114.114', '180.76.76.76', '1.2.4.8',
  '116.116.116.116', '101.226.4.6', '123.125.81.6', '180.184.1.1',
  '180.184.2.2',
  // 国外
  '1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4', '9.9.9.9',
  '149.112.112.112', '208.67.222.222', '208.67.220.220',
  '94.140.14.14', '94.140.15.15', '76.76.2.0', '76.76.10.0',
  '185.228.168.9', '185.228.169.9', '77.88.8.8', '77.88.8.1',
  '156.154.70.1', '156.154.71.1', '127.0.0.1',
  // 域名关键词
  'alidns', 'doh.pub', 'dot.pub', 'dns.pub', 'dnspod', 'dns.baidu',
  'dns.google', 'cloudflare', 'quad9', 'opendns', 'nextdns', 'adguard',
  'system'
];

function dnsServerAddress(value) {
  const str = String(value);
  const hashIndex = str.indexOf('#');
  return (hashIndex === -1 ? str : str.slice(0, hashIndex)).toLowerCase();
}

function isPublicDnsServer(value) {
  const address = dnsServerAddress(value);
  return publicDnsList.some((dns) => address.includes(dns.toLowerCase()));
}

function dnsServerEndpoint(value) {
  let endpoint = dnsServerAddress(value);
  const schemeIndex = endpoint.indexOf('://');
  if (schemeIndex !== -1) {
    endpoint = endpoint.slice(schemeIndex + 3);
  }
  const slashIndex = endpoint.indexOf('/');
  if (slashIndex !== -1) {
    endpoint = endpoint.slice(0, slashIndex);
  }
  return endpoint;
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

// 根据节点域名补充 DNS
function smartMergeDnsNode(config, result) {
  const rules = collectDnsRules(config);
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
  for (const rule in rules.proxyServerNameserverPolicy) {
    if (!matchesAnyNodeDomain(rule)) {
      continue;
    }
    matchedProxyPolicyKeys.add(rule);
    if (matchesEffectiveNodeDomain(rule)) {
      setPolicy(rule, rules.proxyServerNameserverPolicy[rule]);
    }
  }

  // proxy-server-nameserver-policy 命中原域名时，其优先级也覆盖映射后的最终域名。
  copyResolvedDomainPolicy(rules.proxyServerNameserverPolicy, () => true);

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
    (nameserver) => !isPublicDnsServer(nameserver)
  );
  const privateNameservers = rules.nameservers.filter(
    (nameserver) => !isPublicDnsServer(nameserver)
  );

  if (privateProxyServerNameservers.length > 0) {
    for (const domain of effectiveNodeDomains) {
      if (!domainCovered(domain)) {
        setPolicy(domain, privateProxyServerNameservers.slice());
      }
    }
  } else {
    for (const rule in rules.nameserverPolicy) {
      if (matchedProxyPolicyKeys.has(rule)) {
        continue;
      }
      if (!matchesAnyNodeDomain(rule)) {
        continue;
      }
      let overlapsProxy = false;
      for (const domain of allNodeDomains) {
        if (matchWildcardDomain(rule, domain) && proxyCoveredDomains.has(domain)) {
          overlapsProxy = true;
          break;
        }
      }
      if (overlapsProxy) {
        continue;
      }
      if (matchesEffectiveNodeDomain(rule)) {
        setPolicy(rule, rules.nameserverPolicy[rule]);
      }
    }

    // nameserver-policy 同样可随 hosts 的域名映射链路传递，但不得覆盖更高优先级。
    copyResolvedDomainPolicy(
      rules.nameserverPolicy,
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

  // 显示位置按最终仍启用的组回退：Telegram 兜底组前；否则依次在自动选择、手动切换、负载均衡之后；都不可用则追加到底部。
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
    (group) => group && group.name === '👉 手动切换'
  );
  const loadBalanceIndex = proxyGroups.findIndex(
    (group) => group && group.name === '🔄 负载均衡'
  );
  const fallbackIndex = proxyGroups.findIndex(
    (group) => group && group.name === '📲 Telegram(兜底)'
  );
  const telegramFallbackEnabled = ruleOptionsEnable['📲 Telegram'] !== false;
  const autoSelectEnabled = ruleOptionsEnable['♻️ 自动选择'] !== false;
  const manualSwitchEnabled = ruleOptionsEnable['👉 手动切换'] !== false;
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
// 入口函数：Bettbox / FlClash 系客户端会调用 main(config) 并使用其返回值
// ============================================================================
function main(config, profileName) {
  config = config || {};

  // ---- 1. 从订阅原始配置里取出会被模板覆盖、但需要保留/合并的动态数据 ----
  // 启用入口解析时保留强制命名空间给维护区；同时避免重载已有输出时污染 TGDC 保底及默认选择。
  const entryNamePattern = new RegExp(ENTRY_RESOLUTION_EXCLUDE_FILTER);
  const originalProxies = (Array.isArray(config.proxies) ? config.proxies : []).filter(
    (proxy) => ruleOptionsEnable['入口解析'] !== true ||
      !(proxy && typeof proxy.name === 'string' && entryNamePattern.test(proxy.name))
  );

  // 1.1 Reality 增强开关处理
  const enableRealityEnhance = ruleOptionsEnable['启用 Reality 增强'] === true;

  if (enableRealityEnhance) {
    for (const proxy of originalProxies) {
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

  // 1.2 节点 TLS 证书验证开关处理：默认不干预订阅节点原有 skip-cert-verify；
  //     开启「强制证书验证」时统一置为 false（强制校验证书），对全部节点一视同仁
  const forceCertVerify = ruleOptionsEnable['强制证书验证'] === true;

  for (const proxy of originalProxies) {
    if (!proxy || typeof proxy !== "object") {
      continue;
    }

    if (forceCertVerify) {
      proxy["skip-cert-verify"] = false;
    }
  }

  // 1.3 IPv6 优先开关：仅在开启时修改订阅节点的通用 ip-version 字段。
  // ipv6 已经是仅 IPv6，保持不变；ipv6-prefer 切换为 ipv6；其他值（包括缺失）设为 ipv6-prefer。
  const preferIPv6 = ruleOptionsEnable['IPv6优先'] === true;

  if (preferIPv6) {
    for (const proxy of originalProxies) {
      if (!proxy || typeof proxy !== 'object') {
        continue;
      }

      if (proxy['ip-version'] === 'ipv6') {
        continue;
      }
      proxy['ip-version'] = proxy['ip-version'] === 'ipv6-prefer' ? 'ipv6' : 'ipv6-prefer';
    }
  }

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
    result['proxy-providers'] = originalProxyProviders;
  }

  // include-all 按名称排序；手动选择与 Telegram 组仍以订阅顺序中的首个节点作为默认选择。
  const firstProxyName = originalProxies
    .map((proxy) => proxy && proxy.name)
    .find((name) => typeof name === 'string' && name.length > 0);
  if (firstProxyName) {
    const defaultSelectedGroups = new Set(['👉 手动切换', '📲 Telegram', '📲 Telegram(兜底)']);
    (result['proxy-groups'] || []).forEach((group) => {
      if (group && defaultSelectedGroups.has(group.name)) {
        group['default-selected'] = firstProxyName;
      }
    });
  }

  // ---- 4. 动态过滤策略组：读取 ruleOptionsEnable 的单独开关 ----
  // 识别所有被禁用的策略组名字
  const disabledGroupNames = new Set();
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

  // ---- 5. FCM 直连开关：默认打开时 FCM 隐藏组仅含 DIRECT；
  //      关闭后仅保留 👉 手动切换（该开关不移除 FCM 组，仅改写组内节点） ----
  const fcmDirectEnabled = ruleOptionsEnable['FCM直连'] === true;
  result['proxy-groups'].forEach((group) => {
    if (group && group.name === 'FCM') {
      if (fcmDirectEnabled) {
        group.proxies = ['DIRECT'];
      } else if (disabledGroupNames.has('👉 手动切换')) {
        // 手动组已关闭时沿用全局兜底，避免 FCM 引用一个不存在的策略组。
        group.proxies = [fallbackTarget];
      } else {
        group.proxies = ['👉 手动切换'];
      }
    }
  });

  // ---- 6. 清理 rules 中指向已禁用策略组的规则，指向保底策略组 ----
  if (Array.isArray(result.rules)) {
    result.rules = result.rules.map(rule => {
      let updatedRule = rule;
      disabledGroupNames.forEach(disabledName => {
        if (updatedRule.includes(`,${disabledName}`)) {
          updatedRule = updatedRule.replace(`,${disabledName}`, `,${fallbackTarget}`);
        }
      });
      return updatedRule;
    });
  }

  // ---- 7. DNS 节点智能补充 ----
  smartMergeDnsNode(
    config,
    result
  );

  // ---- 8. 国内入口解析：在最终节点 DNS 结果上追加运营商策略。 ----
  applyEntryResolution(result);

  // ---- 9. 代理节点 DNS 使用 TCP：最后补协议，保留前序合并、hosts 与出口选择结果。 ----
  applyProxyDnsTcp(result);

  return result;
}
