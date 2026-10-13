import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Execute the shipped UI against a tiny DOM surface and a synthetic API.
// The actual browser smoke is separate; this targets network-failure recovery.
class Element {
  constructor(document) { this.document = document; this.children = []; this.listeners = new Map(); this.classList = { toggle: (name, value) => { this[name] = value; } }; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  setAttribute(name, value) { this[name] = value; }
  contains(element) { return this === element || this.children.some(child => child.contains(element)); }
  focus() { this.focused = true; this.document.activeElement = this; }
  async click() {
    assert.equal(Boolean(this.disabled), false, 'test must use an enabled control');
    await this.listeners.get('click')({ preventDefault() {} });
  }
}

async function consoleFixture({ approveUrl = 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123', open = false,
  paypalConfigured = true, fresh = false, simulation = false, restoredState, returnParams = '', recommendation, quotedOffers } = {}) {
  if (simulation) approveUrl = '/simulation/approval?intent=12345678-1234-1234-1234-123456789abc&order=ORDER123';
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const document = { activeElement: null };
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], new Element(document)]));
  document.getElementById = id => elements.get(id);
  document.createElement = () => new Element(document);
  for (const [id, value] of Object.entries({ item: 'Synthetic cards', quantity: '100', budget: '220.00', requirements: 'Matte finish.', rounds: '2' })) {
    elements.get(id).value = value;
  }
  const id = '12345678-1234-1234-1234-123456789abc';
  let state = { intentId: id, mandate: { item: 'Synthetic cards', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 },
    expiresAt: new Date(Date.now() + 600000).toISOString(), round: 1, state: 'AWAITING_BUYER_APPROVAL', offers: [], events: [],
    checkout: { mode: simulation ? 'simulation' : 'paypal_sandbox', status: 'AWAITING_BUYER_APPROVAL', orderId: 'ORDER123', amountMinor: 20000,
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
    if (quotedOffers) state.offers = quotedOffers.map(offer => ({ ...offer, round: 2, validUntil: new Date(now + 60000).toISOString() }));
  }
  if (restoredState) {
    state.state = state.checkout.status = restoredState;
    if (restoredState === 'COMPLETED') state.checkout.captureId = 'SIMCAPTURE_123';
  }
  let disconnected = false;
  let failNextRecommendation = false;
  const calls = [];
  vm.runInNewContext(source, {
    document,
    window: { location: { search: fresh ? '' : '?intent=' + id + returnParams } },
    history: { replaceState() {} }, URLSearchParams, Intl, Date: class extends Date { static now() { return now; } },
    setTimeout: callback => { onExpiry = callback; return 1; }, clearTimeout: () => { onExpiry = null; },
    crypto: { randomUUID: () => 'synthetic-key' },
    fetch: async (path, config) => {
      calls.push({ path, method: config.method, body: config.body, headers: config.headers });
      if (disconnected) throw Error('Synthetic connection unavailable');
      if (path.endsWith('/recommend') && failNextRecommendation) {
        failNextRecommendation = false;
        throw Error('Synthetic recommendation unavailable');
      }
      if (path.endsWith('/capture')) {
        disconnected = true;
        throw Error('Synthetic capture response unavailable');
      }
      if (path.endsWith('/checkout')) {
        state.state = 'AWAITING_BUYER_APPROVAL';
        state.checkout = { mode: simulation ? 'simulation' : 'paypal_sandbox', status: state.state, orderId: 'ORDER123', amountMinor: 21600, approveUrl };
      }
      if (path.endsWith('/rounds')) state.round = state.mandate.maxRounds;
      if (path.endsWith('/recommend')) return { ok: true, json: async () => recommendation ?? ({ offerId: 'eligible', mode: 'deterministic', reason: 'Eligible quote.' }) };
      return { ok: true, json: async () => path.endsWith('/health') ? { paypalConfigured: simulation ? false : paypalConfigured, aiConfigured: false,
        checkoutMode: simulation ? 'simulation' : 'paypal_sandbox', checkoutConfigured: simulation || paypalConfigured }
        : structuredClone(state) };
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  const button = text => elements.get('payment').children.find(e => e.textContent === text);
  const picks = () => elements.get('offers').children.map(card => card.children[1].children.at(-1));
  return { elements, document, calls, button, picks, recover: next => { disconnected = false; state = next; }, state,
    failAdviceOnce: () => { failNextRecommendation = true; },
    advance: ms => { now += ms; }, expire: ms => { now += ms; onExpiry(); } };
}

test('a refreshed pending checkout exposes explicit capture without requiring a redirect token', async () => {
  const f = await consoleFixture();
  assert.equal(f.button('Verify approval and capture in Sandbox').disabled, false);
  assert.equal(f.button('Check PayPal status (read only)').disabled, false);
  assert.equal(f.calls.some(c => c.method === 'POST'), false);
});

test('simulation review and checkout stay explicitly labeled and bind requests to their runtime mode', async () => {
  const f = await consoleFixture({ open: true, simulation: true });
  assert.equal(f.elements.get('simulation-banner').hidden, false);
  assert.match(f.elements.get('integration').children[0].textContent, /no PayPal connection/);
  await f.picks()[0].click();
  assert.equal(f.elements.get('create-order').textContent, 'Create simulated order');
  assert.match(f.elements.get('review-message').textContent, /No money moves/);
  await f.elements.get('create-order').click();
  assert.equal(f.calls.find(c => c.path.endsWith('/checkout')).headers['X-Vowrail-Checkout-Mode'], 'simulation');
  assert.ok(f.button('Open simulated buyer approval →'));
  assert.ok(f.button('Verify simulated approval and capture'));
  assert.match(f.elements.get('payment').children.map(e => e.textContent).join(' '), /Not a PayPal transaction/);
  assert.equal(f.calls.some(c => c.path.endsWith('/capture')), false);
});

test('a refreshed simulated receipt remains labeled and cannot automatically recapture', async () => {
  const f = await consoleFixture({ simulation: true });
  const completed = structuredClone(f.state);
  completed.state = completed.checkout.status = 'COMPLETED';
  completed.checkout.captureId = 'SIMCAPTURE_123';
  f.recover(completed);
  await f.elements.get('refresh-status').click();
  assert.match(f.elements.get('payment').children.map(e => e.textContent).join(' '), /Simulated receipt: SIMCAPTURE_123/);
  assert.equal(f.button('Verify simulated approval and capture'), undefined);
  assert.equal(f.calls.some(c => c.path.endsWith('/capture')), false);
});

test('stale approval return parameters cannot override a restored completion or recovery notice', async () => {
  for (const restoredState of ['COMPLETED', 'RECONCILIATION_REQUIRED']) {
    for (const returnParams of ['&simulatedApproval=1', '&cancelled=1', '&token=synthetic']) {
      const f = await consoleFixture({ simulation: true, restoredState, returnParams });
      assert.doesNotMatch(f.elements.get('notice').textContent, /requires an explicit request|approval was cancelled|Verify the order before/);
      assert.match(f.elements.get('notice').textContent, restoredState === 'COMPLETED' ? /completed simulated receipt/ : /read.only reconciliation/);
      assert.equal(f.calls.some(c => c.method === 'POST'), false);
      assert.equal(f.button('Verify simulated approval and capture'), undefined);
    }
  }
});

test('creating a mandate moves keyboard focus into the now-visible negotiation console', async () => {
  const f = await consoleFixture({ fresh: true, open: true, paypalConfigured: false });
  await f.elements.get('mandate-form').listeners.get('submit')({ preventDefault() {} });
  assert.equal(f.elements.get('mandate-form').hidden, true);
  assert.equal(f.document.activeElement, f.elements.get('activity-heading'));
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 1);
});

test('the final authorized round leaves keyboard focus on the offers rather than a disabled button', async () => {
  const f = await consoleFixture({ open: true });
  f.elements.get('run-round').focus();
  await f.elements.get('run-round').click();
  assert.equal(f.elements.get('run-round').disabled, true);
  assert.equal(f.document.activeElement, f.elements.get('offers-heading'));
});

test('recommendation results become the keyboard reading position without initiating checkout', async () => {
  const f = await consoleFixture({ open: true });
  await f.elements.get('recommend').click();
  assert.equal(f.document.activeElement, f.elements.get('advice'));
  assert.match(f.elements.get('advice').children[0].textContent, /Deterministic fallback/);
  assert.equal(f.calls.some(c => c.path.endsWith('/checkout')), false);
});

for (const scenario of ['delivery-preference', 'ambiguous-request']) {
  test('recorded ' + scenario + ' advice separates stored quote from unverified rationale without choosing or paying', async () => {
    const evidence = JSON.parse(await readFile(new URL('../docs/demo-assets/openrouter-free-qualification.json', import.meta.url), 'utf8'));
    const observed = evidence.cases.find(c => c.scenario === scenario && c.advice.mode === 'ai_advisory');
    const f = await consoleFixture({ open: true, recommendation: observed.advice, quotedOffers: observed.requestInput.offers });
    await f.elements.get('recommend').click();
    const paragraphs = f.elements.get('advice').children.map(e => e.textContent);
    assert.match(paragraphs[0], /Model suggestion/);
    assert.match(paragraphs[1], scenario === 'delivery-preference' ? /Atlas.*\$207\.00 USD.*2-day delivery estimate/ : /Cobalt.*\$201\.00 USD.*4-day delivery estimate/);
    assert.equal(paragraphs[2], 'Unverified model explanation: ' + observed.advice.reason);
    assert.match(paragraphs[3], /price, delivery or unit errors/);
    assert.match(paragraphs[3], /confirm delivery meets your requirements/);
    assert.equal(f.document.activeElement, f.elements.get('advice'));
    assert.equal(f.elements.get('offer-review').hidden, true);
    assert.equal(f.state.checkout, null);
    assert.equal(f.calls.some(c => c.path.endsWith('/checkout') || c.path.endsWith('/capture')), false);
  });
}

test('a successful advice retry clears the previous error and focuses the returned evaluation', async () => {
  const f = await consoleFixture({ open: true });
  f.failAdviceOnce();
  await f.elements.get('recommend').click();
  assert.match(f.elements.get('notice').textContent, /Synthetic recommendation unavailable/);
  assert.equal(f.elements.get('notice').error, true);
  assert.equal(f.document.activeElement, f.elements.get('notice'));
  await f.elements.get('recommend').click();
  assert.match(f.elements.get('notice').textContent, /Offer evaluation loaded/);
  assert.equal(f.elements.get('notice').error, false);
  assert.equal(f.document.activeElement, f.elements.get('advice'));
  assert.equal(f.calls.some(c => c.path.endsWith('/checkout')), false);
});

test('expiry returns focus from a removed offer button to the offers heading without a request', async () => {
  const f = await consoleFixture({ open: true });
  f.picks()[0].focus();
  const before = f.calls.length;
  f.expire(60001);
  assert.equal(f.document.activeElement, f.elements.get('offers-heading'));
  assert.equal(f.picks()[0].disabled, true);
  assert.equal(f.calls.length, before);
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
  assert.equal(f.document.activeElement, f.elements.get('payment'));
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
  assert.equal(f.document.activeElement, f.elements.get('notice'));
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
  assert.equal(f.document.activeElement, f.elements.get('notice'));
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
