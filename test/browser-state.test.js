import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Execute the shipped UI against a tiny DOM surface and a synthetic API.
// The actual browser smoke is separate; this targets network-failure recovery.
class Element {
  constructor() { this.children = []; this.listeners = new Map(); this.classList = { toggle() {} }; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  async click() {
    assert.equal(Boolean(this.disabled), false, 'test must use an enabled control');
    await this.listeners.get('click')({ preventDefault() {} });
  }
}

async function consoleFixture({ approveUrl = 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123' } = {}) {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], new Element()]));
  const id = '12345678-1234-1234-1234-123456789abc';
  let state = { intentId: id, mandate: { item: 'Synthetic cards', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 },
    expiresAt: new Date(Date.now() + 600000).toISOString(), round: 1, state: 'AWAITING_BUYER_APPROVAL', offers: [], events: [],
    checkout: { status: 'AWAITING_BUYER_APPROVAL', orderId: 'ORDER123', amountMinor: 20000,
      approveUrl } };
  let disconnected = false;
  const calls = [];
  vm.runInNewContext(source, {
    document: { getElementById: id => elements.get(id), createElement: () => new Element() },
    window: { location: { search: '?intent=' + id } },
    history: { replaceState() {} }, URLSearchParams, Intl, Date,
    fetch: async (path, config) => {
      calls.push({ path, method: config.method });
      if (disconnected) throw Error('Synthetic connection unavailable');
      if (path.endsWith('/capture')) {
        disconnected = true;
        throw Error('Synthetic capture response unavailable');
      }
      return { ok: true, json: async () => path.endsWith('/health') ? { paypalConfigured: true, aiConfigured: false }
        : structuredClone(state) };
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  const button = text => elements.get('payment').children.find(e => e.textContent === text);
  return { elements, calls, button, recover: next => { disconnected = false; state = next; }, state };
}

test('a refreshed pending checkout exposes explicit capture without requiring a redirect token', async () => {
  const f = await consoleFixture();
  assert.equal(f.button('Verify approval and capture in Sandbox').disabled, false);
  assert.equal(f.button('Check PayPal status (read only)').disabled, false);
  assert.equal(f.calls.some(c => c.method === 'POST'), false);
});

test('a restored known order keeps explicit capture available even if no approval link was retained', async () => {
  const f = await consoleFixture({ approveUrl: null });
  assert.equal(f.button('Verify approval and capture in Sandbox')?.disabled, false);
  assert.equal(f.button('Approve payment on PayPal Sandbox ↗'), undefined);
  assert.equal(f.calls.some(c => c.method === 'POST'), false);
});

test('lost capture and failed status read mark the view unavailable until successful refresh', async () => {
  const f = await consoleFixture();
  await f.button('Verify approval and capture in Sandbox').click();
  assert.equal(f.elements.get('state-display').textContent, 'STATUS UNAVAILABLE');
  assert.match(f.elements.get('notice').textContent, /Refresh status before further execution/);
  assert.equal(f.button('Verify approval and capture in Sandbox').disabled, true);
  assert.equal(f.button('Check PayPal status (read only)').disabled, false);
  assert.equal(f.elements.get('refresh-status').disabled, false);
  const next = structuredClone(f.state);
  next.state = next.checkout.status = 'RECONCILIATION_REQUIRED';
  f.recover(next);
  await f.elements.get('refresh-status').click();
  assert.equal(f.elements.get('state-display').textContent, 'RECONCILIATION REQUIRED');
  assert.equal(f.button('Verify approval and capture in Sandbox'), undefined);
  assert.equal(f.button('Check PayPal status (read only)').disabled, false);
  assert.equal(f.calls.filter(c => c.path.endsWith('/capture')).length, 1);
});
