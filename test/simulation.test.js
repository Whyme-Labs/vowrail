import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NegotiationGateway } from '../src/core.js';
import { SimulatedPayments } from '../src/adapters/simulated-payments.js';
import { simulatedMerchants } from '../src/adapters/merchants.js';
import { FileJournal } from '../src/store.js';
import { createApp } from '../src/http.js';

async function fixture(t, { loss = false, directory = null, payments = null } = {}) {
  const provider = payments ?? new SimulatedPayments({ loseCaptureResponseOnce: loss,
    store: directory ? new FileJournal(join(directory, 'provider'), { collection: 'orders' }) : null });
  const gateway = new NegotiationGateway({ merchants: simulatedMerchants, payments: provider,
    store: directory ? new FileJournal(join(directory, 'gateway')) : null });
  const server = createApp({ gateway });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const stop = () => new Promise(resolve => server.close(resolve));
  t.after(stop);
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (path, body = {}, headers = {}) => {
    const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  const create = await post('/api/intents', { item: 'Synthetic print request', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 });
  const path = '/api/intents/' + create.data.intentId;
  await post(path + '/rounds', {}, { 'Idempotency-Key': 'simulation-round-one' });
  return { gateway, provider, base, post, path, id: create.data.intentId, stop };
}

test('simulation health and approval routes never report a configured PayPal connection', async t => {
  const f = await fixture(t);
  const h = await (await fetch(f.base + '/api/health')).json();
  assert.equal(h.checkoutMode, 'simulation');
  assert.equal(h.checkoutConfigured, true);
  assert.equal(h.paypalConfigured, false);
  assert.equal(h.aiConfigured, false);
  assert.match(await (await fetch(f.base + '/simulation/approval')).text(), /not a PayPal/);
});

test('simulated HTTP journey preserves policy, explicit approval, cancellation and one capture', async t => {
  const f = await fixture(t);
  await f.post(f.path + '/rounds', {}, { 'Idempotency-Key': 'simulation-round-two' });
  assert.equal((await f.post(f.path + '/rounds', {}, { 'Idempotency-Key': 'simulation-round-three' })).data.error.code, 'ROUND_LIMIT');
  const view = f.gateway.getIntent(f.id);
  const over = view.offers.find(o => o.amountMinor > 22000);
  assert.equal((await f.post(f.path + '/checkout', { offerId: over.offerId })).data.error.code, 'INVALID_OFFER');
  const advice = (await f.post(f.path + '/recommend')).data;
  assert.equal(advice.mode, 'deterministic');
  const checkout = (await f.post(f.path + '/checkout', { offerId: advice.offerId, amountMinor: 1, mode: 'paypal_sandbox' })).data.checkout;
  assert.equal(checkout.mode, 'simulation');
  assert.equal(checkout.amountMinor, 20100);
  assert.equal(checkout.approveUrl, '/simulation/approval?intent=' + f.id + '&order=' + checkout.orderId);
  assert.equal((await f.post(f.path + '/capture', { orderId: checkout.orderId })).data.error.code, 'ORDER_NOT_APPROVED');
  await fetch(f.base + '/?intent=' + f.id + '&cancelled=1');
  assert.equal((await f.post(f.path + '/reconcile')).data.state, 'AWAITING_BUYER_APPROVAL');
  assert.equal((await f.post(f.path + '/simulation-approval', { orderId: 'SIMORDER_wrong' })).data.error.code, 'ORDER_MISMATCH');
  assert.equal((await f.post(f.path + '/simulation-approval', { orderId: checkout.orderId }, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await f.post(f.path + '/simulation-approval', { orderId: checkout.orderId })).data.orderStatus, 'APPROVED');
  assert.equal(f.gateway.getIntent(f.id).state, 'AWAITING_BUYER_APPROVAL', 'approval alone cannot capture');
  const completed = (await f.post(f.path + '/capture', { orderId: checkout.orderId })).data;
  assert.equal(completed.state, 'COMPLETED');
  assert.match(completed.checkout.captureId, /^SIMCAPTURE_/);
  assert.equal((await f.post(f.path + '/capture', { orderId: checkout.orderId })).data.state, 'COMPLETED');
  assert.equal((await f.post(f.path + '/reconcile')).data.state, 'COMPLETED');
  assert.equal(f.provider.captureCalls, 1);
  assert.equal(completed.events.filter(e => e.type === 'payment.completed').length, 1);
});

test('simulation lost response and restart reconcile the persisted receipt without recapture', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'vowrail-simulation-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const f = await fixture(t, { loss: true, directory });
  const advice = (await f.post(f.path + '/recommend')).data;
  const box = (await f.post(f.path + '/checkout', { offerId: advice.offerId })).data.checkout;
  await f.post(f.path + '/simulation-approval', { orderId: box.orderId });
  assert.equal((await f.post(f.path + '/capture', { orderId: box.orderId })).data.error.code, 'SIMULATED_RESPONSE_LOST');
  assert.equal(f.gateway.getIntent(f.id).state, 'RECONCILIATION_REQUIRED');
  await f.stop();
  const provider = new SimulatedPayments({ store: new FileJournal(join(directory, 'provider'), { collection: 'orders' }) });
  const gateway = new NegotiationGateway({ payments: provider, store: new FileJournal(join(directory, 'gateway')) });
  const completed = await gateway.reconcileCheckout(f.id);
  assert.equal(completed.checkout.mode, 'simulation');
  assert.equal(completed.state, 'COMPLETED');
  assert.equal(provider.captureCalls, 0);
  assert.throws(() => new NegotiationGateway({ payments: { isConfigured: () => true }, store: new FileJournal(join(directory, 'gateway')) }), /Invalid persisted intent/);
});

test('default runtime cannot expose simulator approval or accept its local approval link', async t => {
  const f = await fixture(t, { payments: { isConfigured: () => false } });
  assert.equal((await fetch(f.base + '/simulation/approval')).status, 404);
  assert.equal((await f.post(f.path + '/simulation-approval')).status, 404);
  const h = await (await fetch(f.base + '/api/health')).json();
  assert.equal(h.checkoutMode, 'paypal_sandbox');
  assert.equal(h.checkoutConfigured, false);
  const stale = await f.post(f.path + '/recommend', {}, { 'X-Vowrail-Checkout-Mode': 'simulation' });
  assert.equal(stale.data.error.code, 'CHECKOUT_MODE_MISMATCH');
  f.gateway.payments = { isConfigured: () => true, createOrder: async () => ({ id: 'SIMORDER_invalid', approveUrl: '/simulation/approval' }) };
  await assert.rejects(f.gateway.createCheckout(f.id, f.gateway.eligibleOffers(f.id)[0].offerId, f.base), e => e.code === 'INVALID_PAYPAL_RESPONSE');
});

test('simulated approval persists and an expired mandate cannot approve or capture', async t => {
  const f = await fixture(t);
  const box = (await f.post(f.path + '/checkout', { offerId: f.gateway.eligibleOffers(f.id)[0].offerId })).data.checkout;
  f.gateway.intents.get(f.id).expiresAt = Date.now() - 1;
  assert.equal((await f.post(f.path + '/simulation-approval', { orderId: box.orderId })).data.error.code, 'MANDATE_EXPIRED');
  assert.equal((await f.post(f.path + '/capture', { orderId: box.orderId })).data.error.code, 'MANDATE_EXPIRED');
  assert.equal((await f.provider.getOrder(box.orderId)).status, 'PAYER_ACTION_REQUIRED');
  assert.equal(f.provider.captureCalls, 0);
});

test('simulated provider rejects damaged receipts and journal collection mixing', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'vowrail-provider-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const store = new FileJournal(join(directory, 'orders'), { collection: 'orders' });
  const provider = new SimulatedPayments({ store });
  const intentId = '12345678-1234-1234-1234-123456789abc';
  const order = await provider.createOrder({ intentId, amountMinor: 20000, currency: 'USD', idempotencyKey: 'vr-create-' + intentId });
  await provider.approveOrder(order.id);
  const restored = new SimulatedPayments({ store: new FileJournal(join(directory, 'orders'), { collection: 'orders' }) });
  assert.equal((await restored.getOrder(order.id)).status, 'APPROVED');
  const captured = await restored.captureOrder(order.id, 'vr-capture-' + intentId);
  assert.equal(captured.status, 'COMPLETED');
  assert.deepEqual(await restored.captureOrder(order.id, 'vr-capture-' + intentId), captured);
  assert.equal(restored.captureCalls, 1);
  // Use the current writer after the second adapter's save; stale writers are tested separately.
  const writer = new FileJournal(join(directory, 'orders'), { collection: 'orders' });
  const records = writer.load();
  records[0].order.purchase_units[0].payments.captures[0].amount.value = '1.00';
  writer.save(records);
  assert.throws(() => new SimulatedPayments({ store: new FileJournal(join(directory, 'orders'), { collection: 'orders' }) }), /Invalid simulated order/);
  assert.throws(() => new FileJournal(join(directory, 'orders')), /Invalid local journal/);
  assert.throws(() => new SimulatedPayments({ store: new FileJournal(join(directory, 'gateway')) }), /own orders journal/);
});

test('a conflicting simulated provider checkpoint fails closed during approval or capture', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'vowrail-provider-conflict-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const action of ['approve', 'capture']) {
    const path = join(directory, action);
    const provider = new SimulatedPayments({ store: new FileJournal(path, { collection: 'orders' }) });
    const intentId = '12345678-1234-1234-1234-123456789abc';
    const order = await provider.createOrder({ intentId, amountMinor: 20000, currency: 'USD', idempotencyKey: 'vr-create-' + intentId });
    if (action === 'capture') await provider.approveOrder(order.id);
    const otherWriter = new FileJournal(path, { collection: 'orders' });
    otherWriter.save(otherWriter.load());
    await assert.rejects(action === 'approve' ? provider.approveOrder(order.id)
      : provider.captureOrder(order.id, 'vr-capture-' + intentId), e => e.code === 'SIMULATION_STORAGE_UNAVAILABLE');
    assert.equal(provider.storageHealthy, false);
    await assert.rejects(provider.getOrder(order.id), e => e.code === 'SIMULATION_STORAGE_UNAVAILABLE');
    await assert.rejects(provider.captureOrder(order.id, 'vr-capture-' + intentId), e => e.code === 'SIMULATION_STORAGE_UNAVAILABLE');
    const authoritative = new SimulatedPayments({ store: new FileJournal(path, { collection: 'orders' }) });
    assert.equal((await authoritative.getOrder(order.id)).status, action === 'capture' ? 'APPROVED' : 'PAYER_ACTION_REQUIRED');
  }
});
