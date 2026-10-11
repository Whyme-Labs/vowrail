import test from 'node:test';
import assert from 'node:assert/strict';
import { NegotiationGateway } from '../src/core.js';
import { PayPalSandbox } from '../src/adapters/paypal.js';
import { simulatedMerchants } from '../src/adapters/merchants.js';
import { createApp } from '../src/http.js';

// Real HTTP, gateway and PayPal adapter; only PayPal's transport is synthetic.
async function start(t, loseCaptureResponse = false) {
  const calls = [];
  let order;
  const payments = new PayPalSandbox({ clientId: 'synthetic-id', clientSecret: 'synthetic-secret',
    fetchImpl: async (url, config) => {
      calls.push({ url, method: config.method });
      const response = data => ({ ok: true, json: async () => structuredClone(data) });
      if (url.endsWith('/v1/oauth2/token')) return response({ access_token: 'SYNTHETIC_TOKEN', expires_in: 3600 });
      if (url.endsWith('/v2/checkout/orders')) {
        const body = JSON.parse(config.body);
        order = { id: 'SYNTHETICORDER123', intent: body.intent, status: 'PAYER_ACTION_REQUIRED',
          purchase_units: body.purchase_units, links: [{ rel: 'payer-action',
            href: 'https://www.sandbox.paypal.com/checkoutnow?token=SYNTHETICORDER123' }] };
        return response(order);
      }
      if (url.endsWith('/capture')) {
        order.status = 'COMPLETED';
        order.purchase_units[0].payments = { captures: [{ id: 'SYNTHETICCAPTURE123', status: 'COMPLETED',
          amount: order.purchase_units[0].amount }] };
        if (loseCaptureResponse) throw Error('Synthetic response lost after capture');
      }
      return response(order);
    }
  });
  const gateway = new NegotiationGateway({ merchants: simulatedMerchants, payments });
  const server = createApp({ gateway });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (route, payload = {}, headers = {}) => {
    const response = await fetch(base + route, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) });
    return { status: response.status, data: await response.json() };
  };
  const created = await post('/api/intents', { item: 'Synthetic printed cards', quantity: 100,
    maxTotalMinor: 22000, maxRounds: 2 });
  assert.equal(created.status, 201);
  const path = '/api/intents/' + created.data.intentId;
  await post(path + '/rounds', {}, { 'Idempotency-Key': 'checkout-e2e-round' });
  const advice = await post(path + '/recommend');
  const checkout = await post(path + '/checkout', { offerId: advice.data.offerId, amountMinor: 1, currency: 'EUR' });
  assert.equal(checkout.status, 200);
  assert.equal(checkout.data.checkout.amountMinor, 21600);
  assert.equal(checkout.data.checkout.currency, 'USD');
  return { post, base, path, calls, order, checkout: checkout.data.checkout };
}

test('HTTP purchase journey handles cancellation, approval, capture and refresh without duplicates', { timeout: 30000 }, async t => {
  const f = await start(t);
  const early = await f.post(f.path + '/capture', { orderId: f.order.id });
  assert.equal(early.status, 409);
  assert.equal(early.data.error.code, 'ORDER_NOT_APPROVED');
  const cancelled = await fetch(f.base + '/?intent=' + f.order.purchase_units[0].reference_id + '&cancelled=1');
  assert.equal(cancelled.status, 200);
  assert.equal((await f.post(f.path + '/reconcile')).data.state, 'AWAITING_BUYER_APPROVAL');
  f.order.status = 'APPROVED';
  const paid = await f.post(f.path + '/capture', { orderId: f.order.id });
  assert.equal(paid.data.state, 'COMPLETED');
  assert.equal(paid.data.checkout.captureId, 'SYNTHETICCAPTURE123');
  assert.equal((await f.post(f.path + '/capture', { orderId: f.order.id })).data.state, 'COMPLETED');
  assert.equal((await f.post(f.path + '/reconcile')).data.state, 'COMPLETED');
  const refreshed = await (await fetch(f.base + f.path)).json();
  assert.equal(refreshed.events.filter(e => e.type === 'payment.completed').length, 1);
  assert.equal(f.calls.filter(c => c.url.endsWith('/capture')).length, 1);
  assert.equal(f.calls.filter(c => c.url.endsWith('/v2/checkout/orders')).length, 1);
  assert.ok(f.calls.every(c => c.url.startsWith('https://api-m.sandbox.paypal.com/')));
  assert.equal(JSON.stringify(refreshed).includes('SYNTHETIC_TOKEN'), false);
});

test('HTTP reconciliation recovers a lost response using GET only and blocks cross-origin access', { timeout: 30000 }, async t => {
  const f = await start(t, true);
  f.order.status = 'APPROVED';
  const failed = await f.post(f.path + '/capture', { orderId: f.order.id });
  assert.equal(failed.status, 502);
  assert.equal((await (await fetch(f.base + f.path)).json()).state, 'RECONCILIATION_REQUIRED');
  const count = f.calls.length;
  const forbidden = await f.post(f.path + '/reconcile', {}, { Origin: 'https://attacker.example' });
  assert.equal(forbidden.status, 403);
  assert.equal(f.calls.length, count);
  const recovered = await f.post(f.path + '/reconcile', { orderId: 'ATTACKER_ORDER', amountMinor: 1 });
  assert.equal(recovered.status, 200);
  assert.equal(recovered.data.checkout.orderId, 'SYNTHETICORDER123');
  assert.equal(recovered.data.checkout.captureId, 'SYNTHETICCAPTURE123');
  assert.deepEqual(f.calls.slice(count).map(c => c.method), ['GET']);
  assert.equal(f.calls.filter(c => c.url.endsWith('/capture')).length, 1);
});
