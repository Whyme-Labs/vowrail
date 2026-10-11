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
  setAttribute(name, value) { this[name] = value; }
  focus() { this.focused = true; }
  async click() {
    assert.equal(Boolean(this.disabled), false, 'test must use an enabled control');
    await this.listeners.get('click')({ preventDefault() {} });
  }
}

async function consoleFixture({ approveUrl = 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123', open = false,
  paypalConfigured = true } = {}) {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], new Element()]));
  const id = '12345678-1234-1234-1234-123456789abc';
  let state = { intentId: id, mandate: { item: 'Synthetic cards', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 },
    expiresAt: new Date(Date.now() + 600000).toISOString(), round: 1, state: 'AWAITING_BUYER_APPROVAL', offers: [], events: [],
    checkout: { status: 'AWAITING_BUYER_APPROVAL', orderId: 'ORDER123', amountMinor: 20000,
      approveUrl } };
  let now = Date.now();
  let onExpiry;
  if (open) {
    state.state = 'OPEN'; state.checkout = null;
    state.offers = [
      { offerId: 'eligible', merchantName: 'Birch (simulated)', amountMinor: 21600, currency: 'USD', round: 1,
        deliveryDays: 3, description: 'Synthetic quote, all demo charges included.', validUntil: new Date(now + 60000).toISOString() },
      { offerId: 'over-budget', merchantName: 'Atlas (simulated)', amountMinor: 23500, currency: 'USD', round: 1,
        deliveryDays: 2, description: 'Synthetic quote.', validUntil: new Date(now + 60000).toISOString() }
    ];
  }
  let disconnected = false;
  const calls = [];
  vm.runInNewContext(source, {
    document: { getElementById: id => elements.get(id), createElement: () => new Element() },
    window: { location: { search: '?intent=' + id } },
    history: { replaceState() {} }, URLSearchParams, Intl, Date: class extends Date { static now() { return now; } },
    setTimeout: callback => { onExpiry = callback; return 1; }, clearTimeout: () => { onExpiry = null; },
    crypto: { randomUUID: () => 'synthetic-key' },
    fetch: async (path, config) => {
      calls.push({ path, method: config.method, body: config.body });
      if (disconnected) throw Error('Synthetic connection unavailable');
      if (path.endsWith('/capture')) {
        disconnected = true;
        throw Error('Synthetic capture response unavailable');
      }
      if (path.endsWith('/checkout')) {
        state.state = 'AWAITING_BUYER_APPROVAL';
        state.checkout = { status: state.state, orderId: 'ORDER123', amountMinor: 21600, approveUrl };
      }
      if (path.endsWith('/recommend')) return { ok: true, json: async () => ({ offerId: 'eligible', mode: 'deterministic', reason: 'Eligible quote.' }) };
      return { ok: true, json: async () => path.endsWith('/health') ? { paypalConfigured, aiConfigured: false }
        : structuredClone(state) };
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  const button = text => elements.get('payment').children.find(e => e.textContent === text);
  const picks = () => elements.get('offers').children.map(card => card.children[1].children.at(-1));
  return { elements, calls, button, picks, recover: next => { disconnected = false; state = next; }, state,
    advance: ms => { now += ms; }, expire: ms => { now += ms; onExpiry(); } };
}

test('a refreshed pending checkout exposes explicit capture without requiring a redirect token', async () => {
  const f = await consoleFixture();
  assert.equal(f.button('Verify approval and capture in Sandbox').disabled, false);
  assert.equal(f.button('Check PayPal status (read only)').disabled, false);
  assert.equal(f.calls.some(c => c.method === 'POST'), false);
});

test('offer review works without credentials and explains the spending rejection', async () => {
  const f = await consoleFixture({ open: true, paypalConfigured: false });
  assert.equal(f.picks()[0].disabled, false);
  assert.match(f.picks()[0]['aria-label'], /Birch.*round 1.*\$216.00/);
  assert.equal(f.picks()[1].disabled, true);
  assert.match(f.elements.get('offers').children[1].children[1].children[1].textContent, /Above budget by \$15.00/);
  await f.picks()[0].click();
  assert.equal(f.elements.get('offer-review').hidden, false);
  assert.equal(f.elements.get('review-heading').focused, true);
  assert.match(f.elements.get('review-details').children.map(e => e.textContent).join(' '), /\$216.00.*\$4.00/);
  assert.equal(f.elements.get('create-order').disabled, true);
  assert.match(f.elements.get('review-message').textContent, /PayPal Sandbox is not configured/);
  assert.equal(f.calls.some(c => c.method === 'POST'), false);
});

test('model advice cannot select or create an order; explicit review and confirmation send only offer ID', async () => {
  const f = await consoleFixture({ open: true });
  await f.elements.get('recommend').click();
  assert.equal(f.elements.get('offer-review').hidden, true);
  assert.equal(f.calls.some(c => c.path.endsWith('/checkout')), false);
  await f.picks()[0].click();
  assert.equal(f.calls.some(c => c.path.endsWith('/checkout')), false);
  await f.elements.get('create-order').click();
  assert.deepEqual(JSON.parse(f.calls.find(c => c.path.endsWith('/checkout')).body), { offerId: 'eligible' });
  assert.equal(f.elements.get('offer-review').hidden, true);
  assert.equal(f.button('Verify approval and capture in Sandbox').disabled, false);
  assert.equal(f.calls.some(c => c.path.endsWith('/capture')), false);
});

test('a reviewed quote stays visible but cannot execute after its expiry', async () => {
  const f = await consoleFixture({ open: true });
  await f.picks()[0].click();
  f.expire(60001);
  assert.equal(f.elements.get('offer-review').hidden, false);
  assert.match(f.elements.get('review-message').textContent, /Quote expired/);
  assert.equal(f.elements.get('create-order').disabled, true);
  assert.equal(f.calls.some(c => c.path.endsWith('/checkout')), false);
});

test('mandate expiry updates the review without a network call or further authorization', async () => {
  const f = await consoleFixture({ open: true });
  await f.picks()[0].click();
  const before = f.calls.length;
  f.expire(600001);
  assert.match(f.elements.get('review-message').textContent, /Mandate expired/);
  assert.equal(f.elements.get('create-order').disabled, true);
  assert.equal(f.elements.get('run-round').disabled, true);
  assert.equal(f.calls.length, before);
});

test('confirmation rechecks quote expiry even before its scheduled UI update', async () => {
  const f = await consoleFixture({ open: true });
  await f.picks()[0].click();
  f.advance(60001);
  await f.elements.get('create-order').click();
  assert.match(f.elements.get('notice').textContent, /Quote expired/);
  assert.equal(f.calls.some(c => c.path.endsWith('/checkout')), false);
  assert.equal(f.elements.get('create-order').disabled, true);
});

test('review cancellation allows comparing another offer without creating or capturing', async () => {
  const f = await consoleFixture({ open: true });
  await f.picks()[0].click();
  await f.elements.get('clear-review').click();
  assert.equal(f.elements.get('offer-review').hidden, true);
  assert.equal(f.elements.get('offers-heading').focused, true);
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
