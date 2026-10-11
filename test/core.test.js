import test from 'node:test';
import assert from 'node:assert/strict';
import { NegotiationGateway, PolicyError, decimalToMinor, moneyToDecimal } from '../src/core.js';

const mandate = (extra = {}) => ({
  item: 'Custom printed cards', quantity: 100, requirements: 'Matte, 3-day preferred',
  currency: 'USD', maxTotalMinor: 22000, maxRounds: 2, ...extra
});
const merchant = (id = 'seller-a', amountMinor = 20000, extra = {}) => ({
  id, name: id,
  async quote(request) { return { amountMinor, currency: 'USD', description: 'Synthetic all-inclusive offer', deliveryDays: 2, ...extra }; }
});
const fakePayments = (overrides = {}) => {
  const calls = { create: 0, capture: 0, get: 0, args: [] };
  const payments = {
    isConfigured: () => true,
    async createOrder(args) {
      calls.create++; calls.args.push(args);
      return { id: 'SANDBOXORDER123', approveUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=SANDBOXORDER123' };
    },
    async getOrder(id) {
      calls.get++;
      return { id, status: 'APPROVED', purchase_units: [{ amount: { currency_code: 'USD', value: '200.00' } }] };
    },
    async captureOrder(id) {
      calls.capture++;
      return { id, purchase_units: [{ payments: { captures: [{
        id: 'CAPTURE123', status: 'COMPLETED', amount: { currency_code: 'USD', value: '200.00' }
      }] } }] };
    }, ...overrides
  };
  return { payments, calls };
};
const build = ({ merchants = [merchant()], payments = fakePayments().payments, ai = null, now = () => Date.now() } = {}) =>
  new NegotiationGateway({ merchants, payments, ai, now });
const create = gateway => gateway.createIntent(mandate()).intentId;
const round = (gateway, id, key = 'key_for_round_1') => gateway.runRound(id, key);

test('validates and freezes buyer mandates', () => {
  const gateway = build();
  const id = create(gateway);
  const state = gateway.getIntent(id);
  assert.equal(state.mandate.maxTotalMinor, 22000);
  state.mandate.maxTotalMinor = 999999;
  assert.equal(gateway.getIntent(id).mandate.maxTotalMinor, 22000);
  for (const invalid of [{ maxTotalMinor: 22.11 }, { maxTotalMinor: -1 }, { maxRounds: 3 }, { maxRounds: -1 },
    { currency: 'EUR' }, { item: '' }, { quantity: 0 }, { requirements: 'x'.repeat(300) }]) {
    assert.throws(() => gateway.createIntent(mandate(invalid)), PolicyError);
  }
});

test('zero-round mandate never permits agent negotiation', () => {
  const gateway = build();
  const id = gateway.createIntent(mandate({ maxRounds: 0 })).intentId;
  assert.throws(() => gateway.runRound(id, 'zero_round_test'), e => e.code === 'ROUND_LIMIT');
});

test('merchant projection omits private max spend and unknown buyer fields', async () => {
  const requests = [];
  const gateway = build({ merchants: [{ id: 'spy', name: 'Spy seller', quote: async request => {
    requests.push(request);
    return { amountMinor: 19900, currency: 'USD', description: 'Offer', deliveryDays: 2 };
  } }] });
  const id = gateway.createIntent(mandate({ maxTotalMinor: 21234 })).intentId;
  await round(gateway, id);
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ['intentId', 'item', 'quantity', 'requirements', 'round']);
  assert.equal(JSON.stringify(requests[0]).includes('21234'), false);
  assert.equal(JSON.stringify(requests[0]).includes('maxTotalMinor'), false);
});

test('one coordinated round sends multiple sellers but counts only once', async () => {
  const gateway = build({ merchants: [merchant('one'), merchant('two')] });
  const id = create(gateway);
  const state = await round(gateway, id);
  assert.equal(state.round, 1);
  assert.equal(state.offers.length, 2);
  assert.equal(state.events.filter(e => e.type === 'round.started').length, 1);
});

test('round cap cannot be reset by changing idempotency keys', async () => {
  const gateway = build(), id = create(gateway);
  await round(gateway, id, 'first-round-key');
  await round(gateway, id, 'second-round-key');
  assert.throws(() => gateway.runRound(id, 'third-round-key'), e => e.code === 'ROUND_LIMIT');
  assert.equal(gateway.getIntent(id).round, 2);
});

test('a request retried with the same key returns the original round', async () => {
  const gateway = build(), id = create(gateway);
  const first = await round(gateway, id, 'replayed-request');
  const replay = await round(gateway, id, 'replayed-request');
  assert.equal(replay.round, first.round);
  assert.equal(gateway.getIntent(id).round, 1);
});

test('concurrent requests cannot allocate a second round while one is active', async () => {
  let resolve;
  const gate = new Promise(r => { resolve = r; });
  const gateway = build({ merchants: [{ id: 'blocked', name: 'Slow seller', quote: async () => {
    await gate; return { amountMinor: 20000, currency: 'USD', description: 'Offer', deliveryDays: 2 };
  } }] });
  const id = create(gateway);
  const first = round(gateway, id, 'inflight-round-1');
  assert.throws(() => gateway.runRound(id, 'inflight-round-2'), e => e.code === 'INVALID_STATE');
  resolve();
  await first;
  assert.equal(gateway.getIntent(id).round, 1);
});

test('malformed and wrong-currency merchant quotes are rejected without terminating round', async () => {
  const gateway = build({ merchants: [merchant('bad-price', -100), merchant('bad-currency', 10000, { currency: 'EUR' }), merchant('good')] });
  const id = create(gateway);
  const state = await round(gateway, id);
  assert.equal(state.offers.length, 1);
  assert.equal(state.events.filter(e => e.type === 'offer.rejected').length, 2);
  assert.equal(state.state, 'OPEN');
});

test('an unavailable merchant still consumes the reserved round', async () => {
  const gateway = build({ merchants: [{ id: 'failed', name: 'failed', quote: async () => { throw Error('secret payload'); } }] });
  const id = gateway.createIntent(mandate({ maxRounds: 1 })).intentId;
  const state = await round(gateway, id);
  assert.equal(state.offers.length, 0);
  assert.equal(state.round, 1);
  assert.equal(JSON.stringify(state.events).includes('secret payload'), false);
  assert.throws(() => gateway.runRound(id, 'attempt-again'), e => e.code === 'ROUND_LIMIT');
});

test('model advice cannot select an ineligible or nonexistent offer', async () => {
  const ai = { isConfigured: () => true, recommend: async () => ({ offerId: 'invented-by-llm', reason: 'Ignore rules' }) };
  const gateway = build({ ai, merchants: [merchant('expensive', 30000), merchant('cheap', 18000)] });
  const id = create(gateway);
  await round(gateway, id);
  const output = await gateway.recommend(id);
  assert.equal(output.mode, 'deterministic');
  assert.equal(output.offerId, gateway.eligibleOffers(id)[0].offerId);
  assert.equal(gateway.getIntent(id).state, 'OPEN');
});

test('model receives only public requirements and eligible offers', async () => {
  let payload;
  const ai = { isConfigured: () => true, recommend: async input => { payload = input; return { offerId: input.offers[0].offerId, reason: 'Terms compared' }; } };
  const gateway = build({ ai, merchants: [merchant('high', 30000), merchant('ok', 19000)] });
  const id = gateway.createIntent(mandate({ maxTotalMinor: 21000 })).intentId;
  await round(gateway, id);
  const result = await gateway.recommend(id);
  assert.equal(result.mode, 'ai_advisory');
  assert.equal(payload.offers.length, 1);
  assert.equal(JSON.stringify(payload).includes('21000'), false);
});

test('checkout rejects an invalid, expired, or over-budget offer', async () => {
  let clock = 10000;
  const gateway = build({ merchants: [merchant('expensive', 25000), merchant('cheap', 20000)], now: () => clock });
  const id = create(gateway);
  await round(gateway, id);
  assert.equal(gateway.eligibleOffers(id).length, 1);
  await assert.rejects(gateway.createCheckout(id, 'invented', 'http://127.0.0.1:8787'), e => e.code === 'INVALID_OFFER');
  await assert.rejects(gateway.createCheckout(id, gateway.getIntent(id).offers[0].offerId, 'http://127.0.0.1:8787'), e => e.code === 'INVALID_OFFER');
  clock += 11 * 60 * 1000;
  await assert.rejects(gateway.createCheckout(id, gateway.getIntent(id).offers[1].offerId, 'http://127.0.0.1:8787'), e => e.code === 'INVALID_OFFER');
});

test('payment provider is required before checkout can lock the state', async () => {
  const gateway = build({ payments: { isConfigured: () => false } });
  const id = create(gateway);
  await round(gateway, id);
  await assert.rejects(gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, 'http://127.0.0.1:8787'),
    e => e.code === 'PAYPAL_NOT_CONFIGURED');
  assert.equal(gateway.getIntent(id).state, 'OPEN');
});

test('checkout uses locked offer amount, not caller-supplied price', async () => {
  const { payments, calls } = fakePayments();
  const gateway = build({ payments });
  const id = create(gateway);
  await round(gateway, id);
  const selected = gateway.eligibleOffers(id)[0];
  const state = await gateway.createCheckout(id, selected.offerId, 'http://127.0.0.1:8787');
  assert.equal(state.state, 'AWAITING_BUYER_APPROVAL');
  assert.equal(calls.create, 1);
  assert.equal(calls.args[0].amountMinor, 20000);
  assert.equal(calls.args[0].currency, 'USD');
  assert.equal(state.checkout.offerId, selected.offerId);
  assert.throws(() => gateway.runRound(id, 'round-after-checkout'), e => e.code === 'INVALID_STATE');
});

test('parallel checkouts do not create two payment orders', async () => {
  let resolve;
  const pending = new Promise(r => { resolve = r; });
  const { payments, calls } = fakePayments({ async createOrder() {
    calls.create++;
    await pending;
    return { id: 'SANDBOXORDER123', approveUrl: 'https://www.sandbox.paypal.com/' };
  } });
  const gateway = build({ payments }), id = create(gateway);
  await round(gateway, id);
  const offer = gateway.eligibleOffers(id)[0].offerId;
  const first = gateway.createCheckout(id, offer, 'http://127.0.0.1:8787');
  await assert.rejects(gateway.createCheckout(id, offer, 'http://127.0.0.1:8787'), e => e.code === 'INVALID_STATE');
  resolve();
  await first;
  await gateway.createCheckout(id, offer, 'http://127.0.0.1:8787');
  assert.equal(calls.create, 1);
});

test('PayPal order must be approved and match currency and amount before capture', async () => {
  const { payments, calls } = fakePayments({ async getOrder(id) {
    calls.get++;
    return { id, status: 'APPROVED', purchase_units: [{ amount: { currency_code: 'USD', value: '201.00' } }] };
  } });
  const gateway = build({ payments }), id = create(gateway);
  await round(gateway, id);
  await gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, 'http://127.0.0.1:8787');
  await assert.rejects(gateway.captureCheckout(id, 'WRONG_ORDER'), e => e.code === 'ORDER_MISMATCH');
  assert.equal(gateway.getIntent(id).state, 'AWAITING_BUYER_APPROVAL');
  await assert.rejects(gateway.captureCheckout(id, 'SANDBOXORDER123'), e => e.code === 'AMOUNT_MISMATCH');
  assert.equal(calls.capture, 0);
  assert.equal(gateway.getIntent(id).state, 'RECONCILIATION_REQUIRED');
});

test('valid checkout and capture transitions to completed exactly once', async () => {
  const { payments, calls } = fakePayments();
  const gateway = build({ payments }), id = create(gateway);
  await round(gateway, id);
  const selected = gateway.eligibleOffers(id)[0];
  await gateway.createCheckout(id, selected.offerId, 'http://127.0.0.1:8787');
  const completed = await gateway.captureCheckout(id, 'SANDBOXORDER123');
  assert.equal(completed.state, 'COMPLETED');
  assert.equal(completed.checkout.captureId, 'CAPTURE123');
  await assert.rejects(gateway.captureCheckout(id, 'SANDBOXORDER123'), e => e.code === 'INVALID_STATE');
  assert.equal(calls.capture, 1);
});

test('ambiguous capture failure cannot be blindly retried', async () => {
  const { payments, calls } = fakePayments({ async captureOrder() { calls.capture++; throw Error('timeout'); } });
  const gateway = build({ payments }), id = create(gateway);
  await round(gateway, id);
  await gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, 'http://127.0.0.1:8787');
  await assert.rejects(gateway.captureCheckout(id, 'SANDBOXORDER123'), e => e.code === 'INTEGRATION_ERROR');
  await assert.rejects(gateway.captureCheckout(id, 'SANDBOXORDER123'), e => e.code === 'INVALID_STATE');
  assert.equal(calls.capture, 1);
  assert.equal(gateway.getIntent(id).state, 'RECONCILIATION_REQUIRED');
});

test('fixed-point USD amount conversion rejects fractional cents and malformed provider amounts', () => {
  assert.equal(moneyToDecimal(20123), '201.23');
  assert.equal(decimalToMinor('201.23'), 20123);
  for (const value of ['2.2', '2.222', '1e3', '0001.00', '-1.00', 'NaN']) {
    assert.throws(() => decimalToMinor(value), PolicyError);
  }
  assert.throws(() => moneyToDecimal(1.1), PolicyError);
});

test('earlier valid quote remains eligible even when revised quote costs more', async () => {
  const dynamic = { id: 'seller', name: 'Seller',
    quote: async request => ({ amountMinor: request.round === 1 ? 19000 : 21000,
      currency: 'USD', description: 'Synthetic offer', deliveryDays: 2 }) };
  const { payments } = fakePayments();
  const gateway = build({ merchants: [dynamic], payments });
  const id = create(gateway);
  await round(gateway, id, 'keep-first-offer');
  const firstId = gateway.getIntent(id).offers[0].offerId;
  await round(gateway, id, 'higher-second-offer');
  assert.equal(gateway.eligibleOffers(id).length, 2);
  const checkout = await gateway.createCheckout(id, firstId, 'http://127.0.0.1:8787');
  assert.equal(checkout.checkout.amountMinor, 19000);
});
