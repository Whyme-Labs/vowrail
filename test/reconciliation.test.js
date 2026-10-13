import test from 'node:test';
import assert from 'node:assert/strict';
import { NegotiationGateway } from '../src/core.js';

async function checkoutFixture({ status = 'APPROVED', captureError = false } = {}) {
  let clock = Date.now();
  const calls = { create: 0, capture: 0, get: 0 };
  let order;
  const payments = {
    isConfigured: () => true,
    async createOrder({ intentId }) {
      calls.create++;
      order = { id: 'ORDER123', intent: 'CAPTURE', status, purchase_units: [{
        reference_id: intentId, amount: { currency_code: 'USD', value: '200.00' }
      }] };
      return { id: order.id, approveUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123' };
    },
    async getOrder() { calls.get++; return structuredClone(order); },
    async captureOrder() {
      calls.capture++;
      if (captureError) throw Error('private transport detail');
      complete();
      return structuredClone(order);
    }
  };
  const gateway = new NegotiationGateway({ payments, now: () => clock, merchants: [{
    id: 'synthetic', name: 'Synthetic', quote: async () => ({
      amountMinor: 20000, currency: 'USD', description: 'All inclusive', deliveryDays: 2
    })
  }] });
  const id = gateway.createIntent({ item: 'Printed cards', quantity: 100, maxTotalMinor: 22000, maxRounds: 1 }).intentId;
  await gateway.runRound(id, 'fixture-round');
  await gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, 'http://127.0.0.1:8787');
  function complete() {
    order.status = 'COMPLETED';
    order.purchase_units[0].payments = { captures: [{
      id: 'CAPTURE123', status: 'COMPLETED', amount: { currency_code: 'USD', value: '200.00' }
    }] };
  }
  return { gateway, id, calls, order, payments, complete, expire: () => { clock += 31 * 60 * 1000; } };
}

test('early approval check preserves checkout and permits later explicit capture', async () => {
  const { gateway, id, calls, order } = await checkoutFixture({ status: 'PAYER_ACTION_REQUIRED' });
  await assert.rejects(gateway.captureCheckout(id, order.id), e => e.code === 'ORDER_NOT_APPROVED');
  assert.equal(gateway.getIntent(id).state, 'AWAITING_BUYER_APPROVAL');
  assert.equal(calls.capture, 0);
  order.status = 'APPROVED';
  assert.equal((await gateway.captureCheckout(id, order.id)).state, 'COMPLETED');
  assert.equal(calls.capture, 1);
});

test('expired mandate prevents execution but permits read-only receipt recovery', async () => {
  const f = await checkoutFixture();
  f.expire();
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'MANDATE_EXPIRED');
  assert.equal(f.calls.capture, 0);
  f.complete();
  assert.equal((await f.gateway.reconcileCheckout(f.id)).state, 'COMPLETED');
  assert.equal(f.calls.capture, 0);
});

test('lost capture response recovers one verified receipt without another capture', async () => {
  const f = await checkoutFixture({ captureError: true });
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'INTEGRATION_ERROR');
  assert.equal(f.gateway.getIntent(f.id).state, 'RECONCILIATION_REQUIRED');
  f.complete();
  const recovered = await f.gateway.reconcileCheckout(f.id);
  assert.equal(recovered.checkout.captureId, 'CAPTURE123');
  assert.equal(recovered.state, 'COMPLETED');
  await f.gateway.reconcileCheckout(f.id);
  assert.equal(f.calls.capture, 1);
  assert.equal(f.calls.create, 1);
  assert.equal(recovered.events.filter(e => e.type === 'payment.completed').length, 1);
  assert.equal(JSON.stringify(recovered).includes('private transport detail'), false);
});

test('approved order after a capture attempt stays locked even after repeated reconciliation', async () => {
  const f = await checkoutFixture({ captureError: true });
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id));
  for (let i = 0; i < 2; i++) {
    assert.equal((await f.gateway.reconcileCheckout(f.id)).state, 'RECONCILIATION_REQUIRED');
  }
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'INVALID_STATE');
  assert.equal(f.calls.capture, 1);
});

test('capture directly rejects an existing attempt even if approval state is inconsistent', async () => {
  const f = await checkoutFixture();
  f.gateway.intents.get(f.id).checkout.captureAttempted = true;
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'CAPTURE_ALREADY_ATTEMPTED');
  assert.equal(f.calls.capture, 0);
  assert.equal(f.calls.get, 0);
});

test('read-only verification failure before capture can recover to buyer approval', async () => {
  const f = await checkoutFixture();
  const original = f.payments.getOrder;
  f.payments.getOrder = async () => { throw Error('network timeout'); };
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id));
  f.payments.getOrder = original;
  assert.equal((await f.gateway.reconcileCheckout(f.id)).state, 'AWAITING_BUYER_APPROVAL');
  assert.equal(f.calls.capture, 0);
  await f.gateway.captureCheckout(f.id, f.order.id);
  assert.equal(f.calls.capture, 1);
});

test('untrusted order identity, amount and capture data cannot manufacture completion', async () => {
  const mutations = [
    o => { o.id = 'OTHER_ORDER'; },
    o => { o.intent = 'AUTHORIZE'; },
    o => { o.purchase_units[0].reference_id = 'another-intent'; },
    o => { o.purchase_units[0].amount.value = '201.00'; },
    o => { o.purchase_units[0].amount.currency_code = 'EUR'; },
    o => { o.purchase_units.push(structuredClone(o.purchase_units[0])); },
    o => { o.purchase_units[0].payments.captures[0].amount.value = '199.00'; },
    o => { o.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR'; },
    o => { o.purchase_units[0].payments.captures[0].status = 'PENDING'; },
    o => { delete o.purchase_units[0].payments.captures[0].id; },
    o => { o.purchase_units[0].payments.captures[0].id = 123456; },
    o => { o.purchase_units[0].payments.captures.push(structuredClone(o.purchase_units[0].payments.captures[0])); },
    o => { o.status = 'APPROVED'; }
  ];
  for (const mutate of mutations) {
    const f = await checkoutFixture();
    f.complete();
    mutate(f.order);
    await assert.rejects(f.gateway.reconcileCheckout(f.id));
    assert.equal(f.gateway.getIntent(f.id).state, 'RECONCILIATION_REQUIRED');
    assert.equal(f.calls.capture, 0);
  }
});

test('parallel reconciliation reserves the state and blocks capture or a second read', async () => {
  const f = await checkoutFixture();
  let resolve;
  f.payments.getOrder = () => new Promise(r => { resolve = r; });
  const first = f.gateway.reconcileCheckout(f.id);
  await assert.rejects(f.gateway.reconcileCheckout(f.id), e => e.code === 'INVALID_STATE');
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'INVALID_STATE');
  resolve(f.order);
  await first;
  assert.equal(f.calls.capture, 0);
});

test('create ambiguity with no known order ID remains blocked for manual reconciliation', async () => {
  const { gateway, payments, calls } = await checkoutFixture();
  const id = gateway.createIntent({ item: 'Cards', quantity: 1, maxTotalMinor: 100 }).intentId;
  await assert.rejects(gateway.reconcileCheckout(id), e => e.code === 'INVALID_STATE');
  const secondId = gateway.createIntent({ item: 'Cards', quantity: 100, maxTotalMinor: 22000 }).intentId;
  await gateway.runRound(secondId, 'unknown-order-round');
  payments.createOrder = async () => { throw Error('response lost'); };
  await assert.rejects(gateway.createCheckout(secondId, gateway.eligibleOffers(secondId)[0].offerId, 'http://127.0.0.1:8787'));
  await assert.rejects(gateway.reconcileCheckout(secondId), e => e.code === 'ORDER_REFERENCE_UNAVAILABLE');
  assert.equal(gateway.getIntent(secondId).state, 'RECONCILIATION_REQUIRED');
  assert.equal(calls.get, 0);
  assert.equal(calls.capture, 0);
});

test('mandate expiring during the verification read cannot execute capture', async () => {
  const f = await checkoutFixture();
  const get = f.payments.getOrder;
  f.payments.getOrder = async () => { const order = await get(); f.expire(); return order; };
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'MANDATE_EXPIRED');
  assert.equal(f.calls.capture, 0);
});

test('mismatched purchase reference is rejected before capture', async () => {
  const f = await checkoutFixture();
  f.order.purchase_units[0].reference_id = 'other-intent';
  await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'ORDER_MISMATCH');
  assert.equal(f.calls.capture, 0);
});

test('capture response must match the verified order intent, reference and unit total', async () => {
  for (const mutate of [
    o => { o.intent = 'AUTHORIZE'; },
    o => { o.purchase_units[0].reference_id = 'other-intent'; },
    o => { o.purchase_units[0].amount = { currency_code: 'EUR', value: '1.00' }; }
  ]) {
    const f = await checkoutFixture();
    f.payments.captureOrder = async () => {
      f.calls.capture++;
      f.complete();
      mutate(f.order);
      return f.order;
    };
    await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id));
    assert.equal(f.gateway.getIntent(f.id).state, 'RECONCILIATION_REQUIRED');
    assert.equal(f.calls.capture, 1);
    await assert.rejects(f.gateway.captureCheckout(f.id, f.order.id), e => e.code === 'INVALID_STATE');
  }
});
