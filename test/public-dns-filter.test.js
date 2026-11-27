const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repositoryRoot = process.env.DNS_TEST_ROOT
  ? path.resolve(process.env.DNS_TEST_ROOT)
  : path.resolve(__dirname, '..');
const scriptFiles = [
  'script_override.js',
  'script_override_lite.js'
];

function loadDnsHelpers(fileName) {
  const filePath = path.resolve(repositoryRoot, fileName);
  const source = fs.readFileSync(filePath, 'utf8');
  const context = vm.createContext({ console });
  vm.runInContext(
    `${source}
globalThis.__dnsTestHooks = {
  filterPublicDnsPolicy,
  isPublicDnsServer
};`,
    context,
    { filename: filePath }
  );
  return context.__dnsTestHooks;
}

for (const fileName of scriptFiles) {
  test(`${fileName}: identifies every OneDNS IPv6 resolver`, () => {
    const { isPublicDnsServer } = loadDnsHelpers(fileName);

    for (const value of [
      '2400:7fc0:849e:200::4',
      '2404:c2c0:85d8:901::4',
      '2400:7fc0:849e:200::8',
      '2404:c2c0:85d8:901::8',
      'tcp://[2404:c2c0:85d8:901::4]:53#OneDNS',
      'https://doh-pure.onedns.net/dns-query'
    ]) {
      assert.equal(isPublicDnsServer(value), true, value);
    }

    assert.equal(
      isPublicDnsServer('tcp://[2001:db8::53]:5353#subscription-private-dns'),
      false
    );
  });

  test(`${fileName}: removes public resolvers from node DNS policies`, () => {
    const { filterPublicDnsPolicy } = loadDnsHelpers(fileName);
    const filtered = filterPublicDnsPolicy({
      '+.public-only': [
        '2400:7fc0:849e:200::4',
        'tcp://[2404:c2c0:85d8:901::4]:53'
      ],
      '+.mixed': [
        '52.80.66.66',
        'tls://private-dns.example:853#node'
      ],
      '+.private-only': [
        'tcp://[2001:db8::53]:5353#subscription-private-dns'
      ]
    });

    assert.deepEqual(
      JSON.parse(JSON.stringify(filtered)),
      {
        '+.mixed': ['tls://private-dns.example:853#node'],
        '+.private-only': [
          'tcp://[2001:db8::53]:5353#subscription-private-dns'
        ]
      }
    );
  });
}
