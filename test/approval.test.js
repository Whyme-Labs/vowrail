import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function fixture({ mismatch = false, loseApprovalResponse = false, providerOrder = { status: 'PAYER_ACTION_REQUIRED' } } = {}) {
  const html = await readFile(new URL('../public/approval.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../public/approval.js', import.meta.url), 'utf8');
  const document = { activeElement: null };
  const element = () => ({ children: [], listeners: {}, classList: { toggle() {} },
    replaceChildren(...children) { this.children = children; },
    addEventListener(name, cb) { this.listeners[name] = cb; }, focus() { document.activeElement = this; } });
  const nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], element()]));
  document.getElementById = id => nodes.get(id); document.createElement = element;
  const id = '12345678-1234-1234-1234-123456789abc', orderId = 'SIMORDER_' + id.replaceAll('-', '');
  let now = Date.now(), onExpiry;
  const calls = [], destinations = [];
  vm.runInNewContext(source, { document, URLSearchParams, Intl, Date: class extends Date { static now() { return now; } },
    window: { location: { search: '?intent=' + id + '&order=' + orderId, assign: value => destinations.push(value) } },
    setTimeout: callback => { onExpiry = callback; return 1; }, clearTimeout() {},
    fetch: async (path, options) => {
      calls.push({ path, ...options });
      if (options.method === 'POST') {
        providerOrder.status = 'APPROVED';
        if (loseApprovalResponse) throw Error('Synthetic approval response lost');
      }
      return { ok: true, json: async () => ({ mode: 'simulation', intentId: id, orderId: mismatch ? 'OTHER' : orderId,
        orderStatus: providerOrder.status,
        item: '<script>untrusted</script>', quantity: 100, merchantName: 'Synthetic studio', amountMinor: 20100,
        expiresAt: new Date(now + 60000).toISOString() }) };
    } });
  await new Promise(resolve => setImmediate(resolve));
  return { nodes, document, calls, destinations, orderId, providerOrder, expire: () => { now += 60001; onExpiry(); } };
}

test('simulated approval page loads as text, cancels without mutation and approves only explicitly', async () => {
  const f = await fixture();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].method, 'GET');
  assert.match(f.nodes.get('approval-details').children[0].textContent, /<script>/);
  assert.equal(f.document.activeElement, f.nodes.get('approval-heading'));
  f.nodes.get('cancel-simulation').listeners.click();
  assert.match(f.destinations[0], /cancelled=1/);
  assert.equal(f.calls.length, 1);
  await f.nodes.get('approval-form').listeners.submit({ preventDefault() {} });
  assert.equal(f.calls[1].headers['X-Vowrail-Checkout-Mode'], 'simulation');
  assert.deepEqual(JSON.parse(f.calls[1].body), { orderId: f.orderId });
  assert.match(f.destinations[1], /simulatedApproval=1/);
  assert.equal(f.calls.some(c => c.path.endsWith('/capture')), false);
});

test('simulated approval refuses a mismatched order and exposes a focused error', async () => {
  const f = await fixture({ mismatch: true });
  assert.equal(f.nodes.get('approve-simulation').disabled, true);
  assert.match(f.nodes.get('approval-notice').textContent, /does not match/);
  assert.equal(f.document.activeElement, f.nodes.get('approval-notice'));
  await f.nodes.get('approval-form').listeners.submit({ preventDefault() {} });
  assert.equal(f.calls.length, 1);
});

test('approval expiry disables consent and returns keyboard focus without a request', async () => {
  const f = await fixture();
  f.nodes.get('approve-simulation').focus();
  f.expire();
  assert.equal(f.nodes.get('approve-simulation').disabled, true);
  assert.equal(f.document.activeElement, f.nodes.get('approval-notice'));
  await f.nodes.get('approval-form').listeners.submit({ preventDefault() {} });
  assert.equal(f.calls.length, 1);
});

test('lost approval response offers a neutral return and reload restores persisted consent without mutation', async () => {
  const f = await fixture({ loseApprovalResponse: true });
  await f.nodes.get('approval-form').listeners.submit({ preventDefault() {} });
  assert.equal(f.providerOrder.status, 'APPROVED');
  assert.equal(f.nodes.get('approve-simulation').disabled, true);
  assert.equal(f.nodes.get('cancel-simulation').textContent, 'Return to purchase');
  assert.match(f.nodes.get('approval-notice').textContent, /consent may already be recorded/);
  assert.match(f.nodes.get('approval-details').children.at(-1).textContent, /UNKNOWN/);
  assert.equal(f.document.activeElement, f.nodes.get('approval-notice'));
  f.nodes.get('cancel-simulation').listeners.click();
  assert.doesNotMatch(f.destinations[0], /cancelled|simulatedApproval/);
  await f.nodes.get('approval-form').listeners.submit({ preventDefault() {} });
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
  const reload = await fixture({ providerOrder: f.providerOrder });
  assert.equal(reload.nodes.get('approve-simulation').disabled, true);
  assert.equal(reload.nodes.get('cancel-simulation').textContent, 'Return to purchase');
  assert.match(reload.nodes.get('approval-details').children.at(-1).textContent, /APPROVED/);
  assert.equal(reload.calls.every(c => c.method === 'GET'), true);
});
