'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'script_override.js');
const source = fs.readFileSync(scriptPath, 'utf8');

function createHarness({ enabled = false, tgdc = false } = {}) {
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: 'script_override.js' });
  vm.runInContext(`ruleOptionsEnable['入口解析'] = ${enabled};`, context);
  vm.runInContext(`ruleOptionsEnable['TGDC实验分流'] = ${tgdc};`, context);
  return context;
}

function main(context, config) {
  context.__testConfig = config;
  try {
    return JSON.parse(vm.runInContext('JSON.stringify(main(__testConfig))', context));
  } finally {
    delete context.__testConfig;
  }
}

function apply(context, result) {
  context.__testResult = result;
  try {
    vm.runInContext('applyEntryResolution(__testResult)', context);
    const normalized = JSON.parse(JSON.stringify(context.__testResult));
    for (const key of Object.keys(result)) delete result[key];
    Object.assign(result, normalized);
    return result;
  } finally {
    delete context.__testResult;
  }
}

function setMaintenance(context, { telecom, unicom, mobile }) {
  context.__testMaintenance = { telecom, unicom, mobile };
  try {
    vm.runInContext(`
      DOMESTIC_ENTRY_PROXIES.telecom = __testMaintenance.telecom;
      DOMESTIC_ENTRY_PROXIES.unicom = __testMaintenance.unicom;
      DOMESTIC_ENTRY_PROXIES.mobile = __testMaintenance.mobile;
    `, context);
  } finally {
    delete context.__testMaintenance;
  }
}

const carrierNames = (carrier, count) => Array.from(
  { length: count },
  (_, index) => `${carrier}入口解析-${String(index + 1).padStart(2, '0')}`
);
const reservedName = /^(?:电信|联通|移动)入口解析-\d{2,}$/;

function makeResult({ proxies = [], groups = [], dns = {} } = {}) {
  return { proxies, 'proxy-groups': groups, dns };
}

test('入口解析默认关闭时不注入节点、策略组或改写 DNS', () => {
  const context = createHarness();
  const result = makeResult({
    proxies: [{ name: '订阅节点', type: 'ss' }],
    groups: [{ name: '其他组', type: 'select', proxies: ['订阅节点'] }],
    dns: {
      'proxy-server-nameserver': ['1.1.1.1#旧组'],
      'proxy-server-nameserver-policy': { 'example.com': ['8.8.8.8#旧组'] }
    }
  });
  const before = structuredClone(result);
  apply(context, result);
  assert.deepEqual(result, before);
});

test('为三家运营商分别生成固定命名空间和独立的两位以上编号', () => {
  const context = createHarness({ enabled: true });
  setMaintenance(context, {
    telecom: Array.from({ length: 101 }, (_, index) => ({ name: '用户填写的同名节点', type: 'http', server: `192.0.2.${index + 1}`, port: 8000 + index })),
    unicom: [{ type: 'socks5', server: '198.51.100.2', port: 9001 }],
    mobile: [{ type: 'http', server: '203.0.113.3', port: 9002 }]
  });
  const result = main(context, { proxies: [{ name: '普通订阅节点', type: 'ss' }] });
  const generated = result.proxies.filter((proxy) => reservedName.test(proxy.name));
  assert.equal(generated.length, 103);
  assert.deepEqual(generated.slice(0, 3).map((proxy) => proxy.name), [
    '电信入口解析-01', '电信入口解析-02', '电信入口解析-03'
  ]);
  assert.equal(generated.find((proxy) => proxy.name === '电信入口解析-100').server, '192.0.2.100');
  assert.equal(generated.find((proxy) => proxy.name === '电信入口解析-101').server, '192.0.2.101');
  assert.deepEqual(generated.slice(-2).map((proxy) => proxy.name), ['联通入口解析-01', '移动入口解析-01']);
  const domestic = result['proxy-groups'].find((group) => group.name === '国内入口解析');
  assert.deepEqual(domestic.proxies, generated.map((proxy) => proxy.name));
  assert.deepEqual(result.proxies.slice(0, 1), [{ name: '普通订阅节点', type: 'ss' }]);
});

test('部分或全部维护数组为空时只注入实际节点，空集合不生成国内入口组', () => {
  const context = createHarness({ enabled: true });
  setMaintenance(context, {
    telecom: [],
    unicom: [{ type: 'http', server: '192.0.2.44', port: 8080 }],
    mobile: []
  });
  let result = main(context, { proxies: [] });
  assert.deepEqual(result.proxies.map((proxy) => proxy.name), ['联通入口解析-01']);
  assert.deepEqual(result['proxy-groups'].find((group) => group.name === '国内入口解析').proxies, ['联通入口解析-01']);

  setMaintenance(context, { telecom: [], unicom: [], mobile: [] });
  result = main(context, { proxies: [] });
  assert.equal(result.proxies.some((proxy) => reservedName.test(proxy.name)), false);
  assert.equal(result['proxy-groups'].some((group) => group.name === '国内入口解析'), false);
  assert.deepEqual(result.dns, main(createHarness(), { proxies: [] }).dns);
});

test('多次 apply 不修改维护输入、深拷贝嵌套字段且节点与 DNS 不重复', () => {
  const context = createHarness({ enabled: true });
  const maintained = [{ type: 'http', server: '192.0.2.9', port: 8000, 'dialer-proxy': { name: 'dialer', tags: ['a'] } }];
  setMaintenance(context, { telecom: maintained, unicom: [], mobile: [] });
  const inputProxyArray = [{ name: '订阅', type: 'ss' }];
  const dns = {
    'proxy-server-nameserver': ['1.1.1.1#已有标签'],
    'proxy-server-nameserver-policy': { 'example.com': ['8.8.8.8', '9.9.9.9#原策略'] }
  };
  const result = makeResult({ proxies: inputProxyArray.slice(), groups: [], dns });
  const originalArray = inputProxyArray.slice();
  const originalMaintained = structuredClone(maintained);
  apply(context, result);
  apply(context, result);
  assert.deepEqual(inputProxyArray, originalArray);
  assert.deepEqual(maintained, originalMaintained);
  const injected = result.proxies.find((proxy) => proxy.name === '电信入口解析-01');
  assert.ok(injected);
  assert.notEqual(injected['dialer-proxy'], maintained[0]['dialer-proxy']);
  assert.notEqual(injected['dialer-proxy'].tags, maintained[0]['dialer-proxy'].tags);
  assert.deepEqual(result.dns['proxy-server-nameserver'], ['1.1.1.1#国内入口解析']);
  assert.deepEqual(result.dns['proxy-server-nameserver-policy'], {
    'example.com': ['8.8.8.8#国内入口解析', '9.9.9.9#国内入口解析']
  });
  assert.equal(result.proxies.filter((proxy) => proxy.name === '电信入口解析-01').length, 1);
});

test('同名订阅节点不能抢占维护区定义，且 main 输出再次作为输入仍不重复', () => {
  const context = createHarness({ enabled: true });
  setMaintenance(context, {
    telecom: [{ type: 'http', server: '192.0.2.10', port: 8123, nested: { owner: 'maintenance' } }],
    unicom: [{ type: 'http', server: '192.0.2.11', port: 8124 }],
    mobile: [{ type: 'http', server: '192.0.2.12', port: 8125 }]
  });
  const input = { proxies: [
    { name: '电信入口解析-01', type: 'ss', server: 'spoofed.example', port: 1 },
    { name: '普通节点', type: 'ss' }
  ] };
  const before = structuredClone(input);
  const first = main(context, input);
  assert.deepEqual(input, before);
  const telecom = first.proxies.find((proxy) => proxy.name === '电信入口解析-01');
  assert.equal(telecom.type, 'http');
  assert.equal(telecom.server, '192.0.2.10');
  assert.equal(telecom.nested.owner, 'maintenance');
  assert.equal(first.proxies.filter((proxy) => proxy.name === '电信入口解析-01').length, 1);
  const second = main(context, first);
  assert.equal(second.proxies.filter((proxy) => proxy.name === '电信入口解析-01').length, 1);
  assert.equal(second['proxy-groups'].filter((group) => group.name === '国内入口解析').length, 1);
  for (const group of second['proxy-groups']) {
    assert.equal(reservedName.test(group['default-selected'] || ''), false, `${group.name} has maintenance default-selected`);
  }
});

test('国内入口节点仅暴露于国内入口组，其他组排除规则追加且原有配置语义保留', () => {
  const context = createHarness({ enabled: true });
  setMaintenance(context, {
    telecom: [{ type: 'http', server: '192.0.2.21', port: 8001 }],
    unicom: [{ type: 'http', server: '192.0.2.22', port: 8002 }],
    mobile: [{ type: 'http', server: '192.0.2.23', port: 8003 }]
  });
  const originalFilter = '(?i)^Keep[-_].*$`^LEGACY$';
  const result = makeResult({
    groups: [
      { name: '国内入口解析', type: 'select', proxies: ['旧节点'], 'default-selected': '旧默认' },
      { name: '订阅显式组', type: 'select', proxies: ['保留节点', '电信入口解析-01'], 'default-selected': '联通入口解析-01', 'exclude-filter': originalFilter, use: ['provider-a'], 'include-all': true },
      { name: '已有筛选', type: 'select', proxies: ['其他节点'], 'exclude-filter': '(?i)^Other$' },
      { name: '未配置筛选', type: 'select', proxies: ['别的节点'] }
    ],
    dns: { 'proxy-server-nameserver': ['1.1.1.1'] }
  });
  apply(context, result);
  const domestic = result['proxy-groups'].find((group) => group.name === '国内入口解析');
  const nonDomestic = result['proxy-groups'].filter((group) => group.name !== '国内入口解析');
  const names = carrierNames('电信', 1).concat(carrierNames('联通', 1), carrierNames('移动', 1));
  assert.deepEqual(domestic.proxies, names);
  for (const group of nonDomestic) {
    const clauses = String(group['exclude-filter'] || '').split('`').filter(Boolean);
    assert.ok(clauses.length >= 1, `${group.name} should have an exclude-filter`);
    const added = clauses.find((clause) => clause.includes('入口解析-'));
    assert.ok(added, `${group.name} must exclude injected names`);
    const caseInsensitive = added.startsWith('(?i)');
    const regex = new RegExp(caseInsensitive ? added.slice(4) : added, caseInsensitive ? 'i' : '');
    for (const name of names) assert.equal(regex.test(name), true, `${group.name} regex misses ${name}`);
  }
  const explicit = result['proxy-groups'].find((group) => group.name === '订阅显式组');
  assert.deepEqual(explicit.proxies, ['保留节点']);
  assert.equal(explicit['default-selected'], undefined);
  assert.equal(explicit.use[0], 'provider-a');
  assert.equal(explicit['include-all'], true);
  assert.equal(explicit['exclude-filter'].split('`').slice(0, 2).join('`'), originalFilter);
  const priorClause = explicit['exclude-filter'].split('`')[0];
  assert.equal(new RegExp(priorClause.slice(4), 'i').test('kEeP-name'), true);
  assert.equal(new RegExp(priorClause.slice(4), 'i').test('not-matching'), false);
});

test('applyEntryResolution 对既有 exclude-filter/use/include-all 和非维护默认选择作最小改动', () => {
  const context = createHarness({ enabled: true });
  setMaintenance(context, { telecom: [{ type: 'http', server: '192.0.2.31', port: 8031 }], unicom: [], mobile: [] });
  const priorFilter = '(?i)^Old$';
  const result = makeResult({
    groups: [{ name: '自定义组', type: 'select', proxies: ['普通节点'], 'default-selected': '普通节点', 'exclude-filter': priorFilter, use: ['keep-provider'], 'include-all': true }],
    dns: {}
  });
  apply(context, result);
  const group = result['proxy-groups'][0];
  assert.equal(group['exclude-filter'].split('`')[0], priorFilter);
  assert.deepEqual(group.proxies, ['普通节点']);
  assert.equal(group['default-selected'], '普通节点');
  assert.deepEqual(group.use, ['keep-provider']);
  assert.equal(group['include-all'], true);
});

test('TGDC 开启时动态与显式兜底均隔离入口维护节点，proxy-providers 原样保留', () => {
  const context = createHarness({ enabled: true, tgdc: true });
  setMaintenance(context, {
    telecom: [{ type: 'http', server: '192.0.2.41', port: 8041 }],
    unicom: [{ type: 'http', server: '192.0.2.42', port: 8042 }],
    mobile: [{ type: 'http', server: '192.0.2.43', port: 8043 }]
  });
  const providers = { existing: { type: 'http', url: 'https://example.test/provider', path: './provider.yaml', interval: 3600 } };
  const result = main(context, {
    proxies: [
      { name: '🇸🇬 Singapore 01', type: 'ss' },
      { name: '🇺🇸 United States 01', type: 'ss' },
      { name: '🇭🇰 Hong Kong 01', type: 'ss' }
    ],
    'proxy-providers': structuredClone(providers)
  });
  assert.deepEqual(result['proxy-providers'], providers);
  const generatedNames = result.proxies.filter((proxy) => reservedName.test(proxy.name)).map((proxy) => proxy.name);
  assert.equal(generatedNames.length, 3);
  const dcGroups = result['proxy-groups'].filter((group) => /Telegram.*(?:DC|地区)|(?:DC|地区).*Telegram/.test(group.name));
  assert.ok(dcGroups.length > 0, 'TGDC experiment should create its proxy groups');
  for (const group of dcGroups) {
    for (const name of generatedNames) {
      assert.equal((group.proxies || []).includes(name), false, `${group.name} explicitly contains ${name}`);
      const clauses = String(group['exclude-filter'] || '').split('`').filter(Boolean);
      assert.ok(clauses.some((clause) => {
        const insensitive = clause.startsWith('(?i)');
        return new RegExp(insensitive ? clause.slice(4) : clause, insensitive ? 'i' : '').test(name);
      }), `${group.name} does not exclude ${name}`);
    }
  }
});
