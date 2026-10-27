// Bettbox 兼容声明：Bettbox 客户端的预期行为是在脚本开头识别该声明（并非全量读取），
// 脚本需遵循此约定：声明必须置顶，删除或下移会导致"自定义规则开关"入口不显示。
const Compatible_With_Bettbox = {
  ruleOptionsEnable: true,
  // 声明属于策略组的开关名称，需与 ruleOptionsEnable 的键完全一致
  policyGroupOptions: [
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
 *      3) 修正字段：强制证书验证、启用 Reality 增强、试开启节点UDP、
 *         IPv6优先、hosts 改写节点 server。
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
 *    3. proxy-groups 使用 Mihomo 原生 include-all / include-all-proxies
 *       动态引入订阅节点和代理提供者；🍎 海外苹果、💠 海外微软、🎮 Steam平台（非下载/CDN）、
 *       🎮 Games-Global、🎬 Emby 保留模板中显式列出的固定策略项。
 *       TGDC 实验组在没有地区节点时仍由脚本显式生成保底节点列表。
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
 * false = 禁用该策略组（会从 proxy-groups 中移除并清理引用；业务组还会删除对应路由规则）
 * 另有功能开关（如 FCM直连）：只调整组内节点，不涉及策略组启停。
 */

  // --- 代理组（策略组）单独控制开关 ---
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
  // 金融支付；Instagram 统一归入 Meta。
  '💳 金融支付': true,
  // Google / Google-CN 共用独立策略组；Google FCM 与 AI 特例仍由原规则处理。
  '🔎 Google': true,
  // Meta 社交平台策略组
  '♾️ Meta': true,
  // Spotify 音乐流媒体策略组
  '🎧 Spotify': true,
  // Emby 播放器进程分流策略组
  '🎬 Emby': true,
  // Discord 通讯软件策略组
  '💬 Discord': true,
  // Reddit 社交平台策略组
  '👽 Reddit': true,
  // Netflix 流媒体策略组
  '🎥 Netflix': true,
  // Patreon 赞助平台策略组
  '💝 Patreon': true,
  // EHentai 策略组
  '📚 EHentai': true,
  // PikPak 网盘策略组
  '☁️ PikPak': true,
  // LINE 通讯软件策略组
  '💬 LINE': true,

  // --- 节点与网络功能开关 ---
  // 开启时统一把订阅节点 skip-cert-verify 置为 false（强制校验证书）；关闭时不干预，保留订阅节点原有设置。
  // provider 节点不在此遍历范围内，开启时改由 override.skip-cert-verify 生效。
  '强制证书验证': false,
  // 是否为带非空 public-key/short-id 的 Reality 节点启用 support-x25519mlkem768（X25519MLKEM768 后量子密钥协商）；
  // 仅遍历订阅顶层 proxies；provider 的 override 只能改固定字段，
  // 无法改写嵌套 reality-opts，故不涉及 provider 节点。
  '启用 Reality 增强': true,
  // 默认不改动订阅节点的 udp；开启时统一设置为 true，允许 UDP 通过代理。
  // provider 节点不在此遍历范围内，开启时改由 override.udp 生效。
  '试开启节点UDP': false,
  // 开启后按节点 ip-version 优先使用 IPv6；provider 节点不在此遍历范围内，
  // 开启时改由 override.ip-version（统一 ipv6-prefer）生效。
  'IPv6优先': false,
  // 默认打开：隐藏组 FCM 仅含 DIRECT；关闭后优先使用 👉 手动切换，若该组已关闭则回退到 🌍 PROXY，再回退到 DIRECT（不移除 FCM 组）。开关图标取自 FCM 代理组的 icon 字段。
  'FCM直连': true,
  // 开启 Telegram DC/地区实验分流；关闭时不改变原 Telegram 规则、策略组和规则集。
  'TGDC实验分流': false,
  // 开启后注入 SukkaW/Surge 的 reject 规则集与广告拦截策略组；关闭时不注入其策略组、规则集和规则。
  'SKK广告拦截': false,
  // 为合格的订阅顶层节点生成按国家/地区划分的策略组；与入口解析开关独立。
  // 只读取订阅顶层 proxies，不枚举 proxy-providers。
  '国家/地区分组': false,
  // 国家/地区组生成后，按节点名称中的显式数值倍率筛选；不处理 proxy-providers。
  '高倍率筛选': false,
  '低倍率筛选': false,
  // 开启后，维护区所有运营商的入口节点统一加入“国内入口解析”组，不进入其他代理组。
  '入口解析': false,
  // 最后为节点解析 DNS 的无协议地址补 tcp://；不改变显式协议、出口后缀或 DNS 优先级。
  '代理节点 DNS 使用 TCP': false,
  // 默认保留 WebRTC 阻断规则；关闭后删除所有同时包含指定 UDP 网络和端口特征的规则。
  'WebRTC阻断': true,
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
  }, {
    type: 'socks5',
    server: '175.6.28.82',
    port: 59999
  }, {
    type: 'socks5',
    server: '113.249.111.67',
    port: 1080
  }, {
    type: 'socks5',
    server: '218.95.39.30',
    port: 59999
  }],

  // 中国联通
  unicom: [{
    type: 'http',
    server: '119.188.131.55',
    port: 17981
  }, {
    type: 'socks5',
    server: '140.207.114.166',
    port: 10080
  }, {
    type: 'socks5',
    server: '61.182.120.230',
    port: 7890
  }],

  // 中国移动
  mobile: [{
    type: 'http',
    server: '116.196.150.180',
    port: 17981
  }, {
    type: 'socks5',
    server: '223.113.241.216',
    port: 59999
  }, {
    type: 'socks5',
    server: '120.220.197.200',
    port: 59999
  }, {
    type: 'socks5',
    server: '120.220.197.196',
    port: 59999
  }, {
    type: 'socks5',
    server: '120.220.197.199',
    port: 59999
  }, {
    type: 'socks5',
    server: '112.12.84.4',
    port: 59999
  }, {
    type: 'socks5',
    server: '112.12.84.5',
    port: 59999
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

// 模块候选仅取订阅顶层 proxies，不读取 proxy-providers 的运行时节点。
// 仅排除异常、内置/拒绝/重匹配和提示信息节点；免费、低倍率、高倍率均允许。
// 此过滤只返回模块候选，不修改最终 config.proxies 或代理组的 include-all。
const MODULE_CANDIDATE_EXCLUDE_FILTER =
  /群|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|地址|频道|电报|无法|说明|使用|提示|访问|支持|教程|关注|更新|作者|加入|超时|收藏|优惠|福利|邀请|好友|失联|选择|剩余|公益|发布|DIZTNA|通路|登录|禁止|定时|渠道|牢记|永久|余额|阁下|本站|刷新|导航|建议|重置|以下|⚠️|@|t\.me\/\+|\bexpire\b|\bhttps?:\/\/|\.com|\btraffic\b/iu;
const TGDC_FALLBACK_ADDITIONAL_EXCLUDE_FILTER = /国内/iu;

function filterModuleCandidateProxies(originalProxies) {
  const proxies = Array.isArray(originalProxies) ? originalProxies : [];
  const entryNamePattern = new RegExp(ENTRY_RESOLUTION_EXCLUDE_FILTER);
  return proxies.filter((proxy) => {
    if (!proxy || typeof proxy !== 'object' || typeof proxy.name !== 'string' || proxy.name.trim().length === 0) {
      return false;
    }
    const type = String(proxy.type || '').toLowerCase();
    if (type === 'direct' || type === 'reject' || type === 'rematch') {
      return false;
    }
    const name = proxy.name;
    if (
      MODULE_CANDIDATE_EXCLUDE_FILTER.test(name) ||
      name === '国内入口解析' ||
      entryNamePattern.test(name)
    ) return false;
    return true;
  });
}

// TGDC 无地区候选时，按订阅原始顺序列出全部合格顶层节点作保底选择。
// 若仍无候选，使用 COMPATIBLE；empty-fallback 只接受单节点名称，不能填写策略组或多个节点。
function selectTelegramDcFallbackNodes(originalProxies) {
  return filterModuleCandidateProxies(originalProxies)
    .filter((proxy) => !TGDC_FALLBACK_ADDITIONAL_EXCLUDE_FILTER.test(proxy.name))
    .map((proxy) => proxy.name);
}

const TGDC_PROXY_GROUP_DEFINITIONS = [
  {
    name: '📲 Telegram-DC1-DC3-Miami',
    filter: '(?i)🇺🇸|美国|迈阿密|miami|\\bMIA\\b|\\bUSA\\b|united\\s*states',
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Koolson-Qure-United_States.png',
  },
  {
    name: '📲 Telegram-DC2-DC4-Amsterdam',
    filter: '(?i)🇳🇱|荷兰|阿姆斯特丹|amsterdam|\\bAMS\\b|\\bNL\\b|netherlands',
    // Qure 无荷兰原生图标，此为按 Qure 风格自绘的荷兰旗，托管于本仓库 assets/icons。
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-Netherlands.png',
  },
  {
    name: '📲 Telegram-DC5-SG',
    // 根据实际互联情况，DC5 组同时纳入香港与新加坡节点。
    filter: '(?i)🇸🇬|🇭🇰|新加坡|狮城|香港|singapore|hong\\s*kong|\\bSG\\b|\\bSGP\\b|\\bHK\\b|\\bHKG\\b',
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Koolson-Qure-Singapore.png',
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

// 国家/地区的可编辑名称与匹配表达式；一个节点允许命中多个常见地区。
const COUNTRY_REGION_PARENT_ICON =
  'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Koolson-Qure-Global.png';
const COUNTRY_REGION_DEFINITIONS = [
  { name: '🇭🇰 香港', pattern: /🇭🇰|香港|Hong\s*Kong|HongKong|\bHK\b|\bHKG\b/iu },
  { name: '🇯🇵 日本', pattern: /🇯🇵|日本|东京|東京|大阪|Tokyo|Osaka|Japan|\bJP\b|\bJPN\b/iu },
  { name: '🇸🇬 新加坡', pattern: /🇸🇬|新加坡|狮城|Singapore|\bSG\b|\bSGP\b/iu },
  { name: '🇹🇼 台湾', pattern: /🇹🇼|台湾|臺灣|台北|臺北|Taipei|Taiwan|\bTW\b|\bTWN\b/iu },
  { name: '🇰🇷 韩国', pattern: /🇰🇷|韩国|韓國|首尔|首爾|Seoul|Korea|\bKR\b|\bKOR\b/iu },
  { name: '🇲🇾 马来西亚', pattern: /🇲🇾|马来西亚|馬來西亞|吉隆坡|Kuala\s*Lumpur|Malaysia|\bMY\b|\bMYS\b/iu },
  { name: '🇺🇸 美国', pattern: /🇺🇸|美国|美國|洛杉矶|洛杉磯|纽约|紐約|西雅图|西雅圖|硅谷|华盛顿|華盛頓|Los\s*Angeles|New\s*York|Seattle|Washington|United\s*States|\bUSA\b|\bUS\b/iu },
  { name: '🇨🇦 加拿大', pattern: /🇨🇦|加拿大|多伦多|多倫多|温哥华|溫哥華|Toronto|Vancouver|Canada|\bCA\b|\bCAN\b/iu },
  { name: '🇬🇧 英国', pattern: /🇬🇧|英国|英國|伦敦|倫敦|London|United\s*Kingdom|\bUK\b|\bGB\b|\bGBR\b/iu },
  { name: '🇫🇷 法国', pattern: /🇫🇷|法国|法國|巴黎|Paris|France|\bFR\b|\bFRA\b/iu },
  { name: '🇳🇱 荷兰', pattern: /🇳🇱|荷兰|荷蘭|阿姆斯特丹|Amsterdam|Netherlands|\bNL\b|\bNLD\b/iu },
  { name: '🇩🇪 德国', pattern: /🇩🇪|德国|德國|法兰克福|法蘭克福|柏林|Frankfurt|Berlin|Germany|\bDE\b|\bDEU\b/iu },
  { name: '🇦🇺 澳大利亚', pattern: /🇦🇺|澳大利亚|澳大利亞|悉尼|墨尔本|墨爾本|Sydney|Melbourne|Perth|Australia|\bAU\b|\bAUS\b/iu },
];
const OTHER_COUNTRY_REGION_NAME = '🌐 其他国家/地区';
const COUNTRY_REGION_TARGET_GROUPS = [
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
];
const COUNTRY_REGION_CHILD_GROUP_TYPES = [
  { suffix: '自动选择', type: 'url-test' },
  { suffix: '故障转移', type: 'fallback' },
  { suffix: '负载均衡', type: 'load-balance' },
];

function countryRegionChildGroupName(parentName, suffix) {
  return parentName + ' · ' + suffix;
}

// 候选只来自订阅顶层 proxies；provider 节点此阶段尚未加载，不参与地区分组。
function buildCountryRegionProxyGroups(originalProxies) {
  const candidates = filterModuleCandidateProxies(originalProxies);
  const templateAutoGroup = (TEMPLATE['proxy-groups'] || []).find(
    (group) => group && group.name === '♻️ 自动选择'
  ) || {};
  const urlTestSettings = {};
  ['url', 'interval', 'tolerance', 'lazy'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(templateAutoGroup, key)) {
      urlTestSettings[key] = templateAutoGroup[key];
    }
  });
  const healthCheckSettings = {
    url: urlTestSettings.url || 'https://g.cn/generate_204',
    interval: urlTestSettings.interval || 300,
  };
  const parentGroups = [];
  const childGroups = [];

  COUNTRY_REGION_DEFINITIONS.forEach((definition) => {
    const regionProxies = candidates.filter((proxy) => definition.pattern.test(proxy.name));
    if (regionProxies.length === 0) return;
    const nodeNames = regionProxies.map((proxy) => proxy.name);
    const children = COUNTRY_REGION_CHILD_GROUP_TYPES.map((childDefinition) => {
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
    });
    parentGroups.push({
      name: definition.name,
      type: 'select',
      icon: COUNTRY_REGION_PARENT_ICON,
      proxies: children.map((child) => child.name).concat(['DIRECT', 'REJECT'], nodeNames),
    });
    childGroups.push(...children);
  });

  const otherProxies = candidates.filter((proxy) =>
    !COUNTRY_REGION_DEFINITIONS.some((definition) => definition.pattern.test(proxy.name))
  );
  if (otherProxies.length > 0) {
    parentGroups.push({
      name: OTHER_COUNTRY_REGION_NAME,
      type: 'select',
      icon: COUNTRY_REGION_PARENT_ICON,
      'default-selected': otherProxies[0].name,
      proxies: ['DIRECT', 'REJECT', ...otherProxies.map((proxy) => proxy.name)],
    });
  }

  return { parentGroups, childGroups };
}

function appendCountryRegionParentsToTargets(proxyGroups, parentGroups) {
  if (!Array.isArray(proxyGroups) || parentGroups.length === 0) return;
  const targetNames = new Set(COUNTRY_REGION_TARGET_GROUPS);
  // TGDC 只会把 Telegram 目标重命名为此兜底组；其他实验组不接收国家组。
  targetNames.add('📲 Telegram(兜底)');
  const existingGroupNames = new Set(
    proxyGroups.filter((group) => group && typeof group.name === 'string').map((group) => group.name)
  );
  const parentNames = parentGroups.map((group) => group.name);

  proxyGroups.forEach((group) => {
    if (!group || !targetNames.has(group.name)) return;
    if (!Array.isArray(group.proxies)) group.proxies = [];
    const additions = parentNames.filter((name) => !group.proxies.includes(name));
    if (additions.length === 0) return;
    let lastNestedGroupIndex = -1;
    group.proxies.forEach((name, index) => {
      if (existingGroupNames.has(name)) lastNestedGroupIndex = index;
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
  appendCountryRegionParentsToTargets(proxyGroups, parentGroups);

  const fcmIndex = proxyGroups.findIndex((group) => group && group.name === 'FCM');
  if (fcmIndex >= 0) {
    proxyGroups.splice(fcmIndex, 0, ...parentGroups);
    const insertedFcmIndex = proxyGroups.findIndex((group) => group && group.name === 'FCM');
    proxyGroups.splice(insertedFcmIndex + 1, 0, ...childGroups);
  } else {
    proxyGroups.push(...parentGroups, ...childGroups);
  }
  result['proxy-groups'] = proxyGroups;
}

// 只识别节点名称中明确标记的数值倍率（如 0.5x、2x、5×），不推断“高倍”等模糊标签。
function getExplicitProxyMultipliers(name) {
  if (typeof name !== 'string') return [];
  const matches = name.matchAll(/(?:^|[^A-Za-z0-9_.])(\d+(?:\.\d+)?)\s*[x×](?![A-Za-z0-9_])/giu);
  return Array.from(matches, (match) => Number(match[1]));
}

// 在地区组生成后过滤顶层订阅节点，并清理静态引用；保持代理组结构（包括空地区组）不变。
// provider 节点不受影响：它们由内核按 include-all 展开，仍会出现在相关组里。
function applyProxyMultiplierFilters(result) {
  const filterHigh = ruleOptionsEnable['高倍率筛选'] === true;
  const filterLow = ruleOptionsEnable['低倍率筛选'] === true;
  if (!filterHigh && !filterLow) return;
  if (!Array.isArray(result.proxies)) return;

  const removedProxyNames = new Set();
  result.proxies = result.proxies.filter((proxy) => {
    if (!proxy || typeof proxy !== 'object' || typeof proxy.name !== 'string') return true;
    const multipliers = getExplicitProxyMultipliers(proxy.name);
    const shouldRemove = multipliers.some(
      (multiplier) => (filterHigh && multiplier >= 2) || (filterLow && multiplier <= 0.5)
    );
    if (shouldRemove) removedProxyNames.add(proxy.name);
    return !shouldRemove;
  });

  if (removedProxyNames.size === 0) return;
  const firstRemainingProxyName = result.proxies
    .map((proxy) => proxy && proxy.name)
    .find((name) => typeof name === 'string' && name.length > 0);
  if (!Array.isArray(result['proxy-groups'])) return;

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
// SKK 广告拦截（仅在 ruleOptionsEnable['SKK广告拦截'] 为 true 时注入）
// 规则集来自 SukkaW/Surge 的 reject 系列，只取核心四件：基础域名集、non_ip
// 关键词/通配规则、reject-drop 遥测静默丢弃、ip 劫持/botnet 集。
// 不含 reject_extra（源经上游降级，误杀与性能代价更高）、reject_phishing
// （反钓鱼，非广告）与 reject-no-drop（PCDN，非广告且 mihomo 无对应策略）。
// ============================================================================
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
// 标准模板配置（mihomo.yaml 的 JSON 表示）
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
      "rule-set:echs_direct_ip",
      "rule-set:cncidr",
      "rule-set:lancidr",
      "rule-set:microsoft_ip",
      "rule-set:apple_ip",
      "rule-set:telegramcidr",
      "rule-set:twitter-x-ip",
      "rule-set:twitter-x-blackmatrix7-No_Resolve",
      "rule-set:steam_ip",
      "160.79.104.0/21",
      "2607:6bc0::/48",
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
      "rule-set:douyin": [
        "system",
        "180.184.1.1",
        "180.184.2.2"
      ],
      "rule-set:private": [
        "system"
      ],
      "rule-set:proxy@direct,cn,echs_direct": [
        "https://dns.alidns.com/dns-query#DIRECT",
        "https://doh.pub/dns-query#DIRECT"
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
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-proxy.png",
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
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-clash-verge-rev-balance.svg",
      "type": "load-balance",
      "include-all": true,
      "url": "https://g.cn/generate_204",
      "interval": 300,
      "lazy": true,
      "strategy": "sticky-sessions"
    },
    {
      "name": "👉 手动切换",
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
      "tolerance": 50,
      "include-all": true
    },
    {
      "name": "🍎 海外苹果",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-AIsouler-MyClash-Apple.svg",
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
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-Microsoft.svg",
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
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-AIsouler-MyClash-Steam.svg",
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
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-telegram.png",
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
      "name": "✖️ Twitter",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-clash-verge-rev-twitter.svg",
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
      "name": "🤖 AI大模型",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-ai.png",
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
      "name": "🎵 TikTok",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-DustinWin-ruleset_geodata-tiktok.png",
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
      "name": "💳 金融支付",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-bitcoin.svg",
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
      "name": "🔎 Google",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-google.svg",
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
      "name": "♾️ Meta",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-meta.svg",
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
      "name": "🎧 Spotify",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-spotify.svg",
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
      "name": "🎬 Emby",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-emby.svg",
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
      "name": "💬 Discord",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-discord.svg",
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
      "name": "👽 Reddit",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-reddit.svg",
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
      "name": "🎥 Netflix",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-netflix.svg",
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
      "name": "💝 Patreon",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-patreon.svg",
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
      "name": "📚 EHentai",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-EHentai.svg",
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
      "name": "☁️ PikPak",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-PikPak.svg",
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
      "name": "💬 LINE",
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-simple-icons-line.svg",
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
      "hidden": true,
      "icon": "https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-MiToverG422-Qure-fcm.png",
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
    "cn": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/cn.mrs",
      "path": "./ruleset/cn.mrs"
    },
    "cncidr": {
      "type": "http",
      "interval": 86400,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/cnip.mrs",
      "path": "./ruleset/cncidr.mrs"
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
    "echs_direct": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/echs-top/proxy/main/mrs/domain/direct.mrs",
      "path": "./ruleset/echs_direct.mrs"
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
    "gfw": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/gfw.mrs",
      "path": "./ruleset/gfw.mrs"
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
    "proxy": {
      "type": "http",
      "interval": 86400,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://gh-proxy.com/https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/proxy.mrs",
      "path": "./ruleset/proxy.mrs"
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
    "twitter-x-blackmatrix7-No_Resolve": {
      "type": "http",
      "interval": 86400,
      "behavior": "classical",
      "format": "yaml",
      "url": "https://gh-proxy.com/https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Twitter/Twitter_No_Resolve.yaml",
      "path": "./ruleset/twitter-x-blackmartix7-noreslove.mrs"
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
    "AND,((NETWORK,UDP),(DST-PORT,3478-3479/5349-5350/19302-19309),(NOT,((RULE-SET,cncidr))),(NOT,((RULE-SET,cn))),(NOT,((RULE-SET,games))),(NOT,((RULE-SET,echs_direct)))),REJECT",
    "RULE-SET,HijackingPlus,REJECT",
    "SUB-RULE,(PROCESS-NAME,com.dragon.read.oversea.gp),fanqie",
    "DOMAIN,mirrors.tuna.tsinghua.edu.cn,DIRECT",
    "DOMAIN,mirrors.ustc.edu.cn,DIRECT",
    "DOMAIN,mirrors.bfsu.edu.cn,DIRECT",
    "DOMAIN,mirror.nju.edu.cn,DIRECT",
    "DOMAIN,mirrors.hit.edu.cn,DIRECT",
    "DOMAIN,mirror.lzu.edu.cn,DIRECT",
    "DOMAIN,mirrors.aliyun.com,DIRECT",
    "DOMAIN,mirrors.cloud.tencent.com,DIRECT",
    "DOMAIN,mirrors.tencent.com,DIRECT",
    "DOMAIN,mirrors.huaweicloud.com,DIRECT",
    "DOMAIN,repo.huaweicloud.com,DIRECT",
    "DOMAIN,mirrors.163.com,DIRECT",
    "DOMAIN,gh-proxy.com,DIRECT",
    "DOMAIN-SUFFIX,alipayeshop.com,DIRECT",
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
    "DOMAIN-KEYWORD,ikuuu,🌍 PROXY",
    "DOMAIN,lumina.lumina00001.com,DIRECT",
    "DOMAIN,gfwsb.yiku.xyz,DIRECT",
    "DOMAIN,bsub.douyincdns.com,DIRECT",
    // 已核实支持 Emby 的 Android 播放器进程，统一分流至 🎬 Emby。
    "PROCESS-NAME,com.mountains.hills,🎬 Emby",
    "PROCESS-NAME,com.hamhub.app,🎬 Emby",
    "PROCESS-NAME,com.oumi.utility.media.hub,🎬 Emby",
    "PROCESS-NAME,com.feifeiduck.capyplayer,🎬 Emby",
    "PROCESS-NAME,com.attempt.afusekt,🎬 Emby",
    "PROCESS-NAME,com.hush.yamby,🎬 Emby",
    "PROCESS-NAME,com.railux.mobile,🎬 Emby",
    // Emby 进程规则需先于 CloudFront 通用直连规则，避免其流量被优先直连。
    // 指定加密货币 API 仍走金融组；其余 cloudfront.net 域名直连。
    "DOMAIN,d3r7nsslvs6aaf.cloudfront.net,💳 金融支付",
    "DOMAIN-SUFFIX,cloudfront.net,DIRECT",
    "RULE-SET,googlefcm,FCM",
    // 通用直连规则优先，剩余 Apple / Microsoft 域名和 IP 再进入海外组。
    // Bybit 静态资源位于 Microsoft 规则集内，优先保留金融支付分流。
    "DOMAIN,bybit-exchange.github.io,💳 金融支付",
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
    "RULE-SET,google,🔎 Google",
    "RULE-SET,google-cn,🔎 Google",
    "RULE-SET,meta,♾️ Meta",
    "RULE-SET,spotify,🎧 Spotify",
    "RULE-SET,discord,💬 Discord",
    "RULE-SET,reddit,👽 Reddit",
    "RULE-SET,netflix,🎥 Netflix",
    "RULE-SET,patreon,💝 Patreon",
    "RULE-SET,ehentai,📚 EHentai",
    "RULE-SET,pikpak,☁️ PikPak",
    "RULE-SET,line,💬 LINE",
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
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-MiToverG422-Qure-SSL.png'
    },
    {
      name: '启用 Reality 增强',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-MiToverG422-Qure-Spark.png'
    },
    {
      name: 'IPv6优先',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-ipv6-prefer.svg'
    },
    {
      name: 'TGDC实验分流',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Koolson-Qure-Telegram.png'
    },
    {
      name: 'SKK广告拦截',
      icon: SKK_ADBLOCK_ICON
    },
    {
      name: '国家/地区分组',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Koolson-Qure-Global.png'
    },
    {
      name: '高倍率筛选',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-filter-high.svg'
    },
    {
      name: '低倍率筛选',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-filter-low.svg'
    },
    {
      name: '入口解析',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Koolson-Qure-Domestic.png'
    },
    {
      name: '代理节点 DNS 使用 TCP',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-TCP.png'
    },
    {
      name: 'WebRTC阻断',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-webrtc-block.svg'
    },
    {
      name: '试开启节点UDP',
      icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/self-udp.svg'
    }
  ]);

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
    icon: 'https://gh-proxy.com/https://raw.githubusercontent.com/XVSVTsama/XVSVT-Clash-Config/main/assets/icons/upstream-Koolson-Qure-Domestic.png'
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

  // 策略组插入核心选择组之后、第一个业务组之前；核心组被单独关闭时按
  // 自动选择、手动切换、负载均衡的顺序回退，都不可用则追加到底部。
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
  let insertIndex = proxyGroups.length;
  if (autoSelectIndex >= 0) {
    insertIndex = autoSelectIndex + 1;
  } else if (manualSwitchIndex >= 0) {
    insertIndex = manualSwitchIndex + 1;
  } else if (loadBalanceIndex >= 0) {
    insertIndex = loadBalanceIndex + 1;
  }
  proxyGroups.splice(insertIndex, 0, deepClone(SKK_PROXY_GROUP));
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

  // 节点 UDP 开关处理：默认关闭时不修改；开启时为订阅顶层节点设置 udp: true。
  const enableNodeUdp = ruleOptionsEnable['试开启节点UDP'] === true;

  if (enableNodeUdp) {
    for (const proxy of originalProxies) {
      if (!proxy || typeof proxy !== "object") {
        continue;
      }

      proxy.udp = true;
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

  // ---- 2.6 SKK 广告拦截（默认关闭；由 UI 开关控制） ----
  applySkkAdBlock(result);

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

  // ---- 6.5 WebRTC 阻断开关：默认开启时不改动模板规则；关闭时按指定特征移除全部匹配规则 ----
  if (ruleOptionsEnable['WebRTC阻断'] === false && Array.isArray(result.rules)) {
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

  // ---- 8. 国家/地区策略组：DNS/hosts 完成后生成，筛选仅作用于模块候选。 ----
  applyCountryRegionGrouping(result, originalProxies);

  // ---- 8.5 倍率筛选：国家/地区组生成后、国内入口解析注入前，仅处理订阅顶层节点。 ----
  applyProxyMultiplierFilters(result);

  // ---- 9. 国内入口解析：倍率筛选完成后，再追加运营商入口节点。 ----
  applyEntryResolution(result);

  // ---- 10. 代理节点 DNS 使用 TCP：最后补协议，保留前序合并、hosts 与出口选择结果。 ----
  applyProxyDnsTcp(result);

  // 仅删除在最终路由、DNS 或其他配置中都不再被引用的规则集。
  removeUnusedRuleProviders(result);

  return result;
}
