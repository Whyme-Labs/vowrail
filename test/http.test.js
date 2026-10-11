import test from 'node:test';
import assert from 'node:assert/strict';
import { NegotiationGateway } from '../src/core.js';
import { simulatedMerchants } from '../src/adapters/merchants.js';
import { createApp } from '../src/http.js';

async function start(testContext) {
  const gateway = new NegotiationGateway({ merchants: simulatedMerchants, payments: { isConfigured: () => false } });
  const server = createApp({ gateway, baseUrl: 'http://127.0.0.1:8787' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  testContext.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (route, payload = {}, headers = {}) => {
    const response = await fetch(base + route, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) });
    return { status: response.status, data: await response.json() };
  };
  return { gateway, base, post };
}
test('homepage and health function without external services', async t => {
  const { base } = await start(t);
  const index = await fetch(base + '/');
  assert.equal(index.status, 200);
  assert.ok((await index.text()).includes('VOWRAIL'));
  const ui = await fetch(base + '/app.js');
  assert.equal(ui.status, 200);
  const health = await fetch(base + '/api/health');
  const result = await health.json();
  assert.equal(result.paypalConfigured, false);
  assert.equal(result.demoOnly, true);
});
test('API end-to-end simulation enforces max rounds and declines unconfigured payments', async t => {
  const { base, post } = await start(t);
  const created = await post('/api/intents', {
    item: 'Printed cards', quantity: 100, requirements: 'Matte',
    maxTotalMinor: 22000, maxRounds: 2, currency: 'USD'
  });
  assert.equal(created.status, 201);
  const id = created.data.intentId;
  const first = await post('/api/intents/' + id + '/rounds', {}, { 'Idempotency-Key': 'http-test-round-one' });
  assert.equal(first.status, 200);
  assert.equal(first.data.round, 1);
  assert.equal(first.data.offers.length, 3);
  const replay = await post('/api/intents/' + id + '/rounds', {}, { 'Idempotency-Key': 'http-test-round-one' });
  assert.equal(replay.data.round, 1);
  const second = await post('/api/intents/' + id + '/rounds', {}, { 'Idempotency-Key': 'http-test-round-two' });
  assert.equal(second.data.round, 2);
  const rejected = await post('/api/intents/' + id + '/rounds', {}, { 'Idempotency-Key': 'http-test-round-third' });
  assert.equal(rejected.status, 409);
  assert.equal(rejected.data.error.code, 'ROUND_LIMIT');
  const recommend = await post('/api/intents/' + id + '/recommend');
  assert.equal(recommend.status, 200);
  assert.equal(recommend.data.mode, 'deterministic');
  const checkout = await post('/api/intents/' + id + '/checkout', { offerId: recommend.data.offerId });
  assert.equal(checkout.status, 503);
  assert.equal(checkout.data.error.code, 'PAYPAL_NOT_CONFIGURED');
  const view = await fetch(base + '/api/intents/' + id);
  assert.equal((await view.json()).round, 2);
});
test('rejects invalid JSON, request origins and malformed idempotency', async t => {
  const { base, post } = await start(t);
  const rejected = await fetch(base + '/api/intents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malformed'
  });
  assert.equal(rejected.status, 400);
  const crossOrigin = await post('/api/intents', {}, { Origin: 'https://attacker.example' });
  assert.equal(crossOrigin.status, 403);
  const made = await post('/api/intents', {
    item: 'Cards', quantity: 1, maxTotalMinor: 30000, maxRounds: 2, currency: 'USD'
  });
  const noKey = await post('/api/intents/' + made.data.intentId + '/rounds');
  assert.equal(noKey.status, 400);
  assert.equal(noKey.data.error.code, 'INVALID_IDEMPOTENCY_KEY');
});
