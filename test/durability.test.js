import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { NegotiationGateway } from '../src/core.js';
import { FileJournal } from '../src/store.js';
import { createApp } from '../src/http.js';

const merchants = [{ id: 'synthetic', name: 'Synthetic', quote: async () => ({
  amountMinor: 20000, currency: 'USD', description: 'Synthetic all-inclusive offer', deliveryDays: 2
}) }];
const mandate = { item: 'Synthetic printed cards', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 };
const baseUrl = 'http://127.0.0.1:8787';
function directory(t) {
  const dir = mkdtempSync(join(tmpdir(), 'vowrail-restart-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function provider(dir) {
  const path = join(dir, 'synthetic-provider.json');
  const read = () => JSON.parse(readFileSync(path, 'utf8'));
  const save = data => writeFileSync(path, JSON.stringify(data));
  const payments = {
    isConfigured: () => true,
    async getOrder() { const data = read(); data.get++; save(data); return data.order; },
    async captureOrder() {
      const data = read(); data.capture++;
      data.order.status = 'COMPLETED';
      data.order.purchase_units[0].payments = { captures: [{ id: 'CAPTURE123', status: 'COMPLETED',
        amount: data.order.purchase_units[0].amount }] };
      save(data); return data.order;
    }
  };
  return { payments, read, save };
}

// Each child is killed at an external-call boundary; all provider state is synthetic.
for (const phase of ['round', 'create', 'known-order', 'verify', 'capture', 'reconcile', 'complete']) {
  test('SIGKILL then restart at ' + phase + ' preserves locks and cannot duplicate payment', { timeout: 30000 }, async t => {
    const dir = directory(t);
    const child = spawnSync(process.execPath, ['test-support/crash-worker.js', dir, phase], {
      cwd: new URL('../', import.meta.url), timeout: 15000, env: {}, encoding: 'utf8'
    });
    assert.equal(child.error, undefined, child.stderr);
    assert.equal(child.signal, 'SIGKILL', child.stderr);
    const p = provider(dir);
    const before = p.read();
    const gateway = new NegotiationGateway({ merchants, payments: p.payments,
      store: new FileJournal(join(dir, 'journal')) });
    const id = before.intentId;
    const restored = gateway.getIntent(id);
    if (phase === 'round') {
      assert.equal(restored.round, 1);
      assert.equal(restored.state, 'OPEN');
      assert.equal((await gateway.runRound(id, 'crash-round-key')).round, 1);
      await gateway.runRound(id, 'next-round-key');
      assert.throws(() => gateway.runRound(id, 'extra-round-key'), e => e.code === 'ROUND_LIMIT');
    } else if (phase === 'create') {
      assert.equal(restored.state, 'RECONCILIATION_REQUIRED');
      assert.equal(restored.checkout.orderId, null);
      await assert.rejects(gateway.createCheckout(id, restored.checkout.offerId, baseUrl), e => e.code === 'INVALID_STATE');
      await assert.rejects(gateway.reconcileCheckout(id), e => e.code === 'ORDER_REFERENCE_UNAVAILABLE');
    } else {
      assert.equal(restored.checkout.orderId, 'ORDER123');
      const recovered = await gateway.reconcileCheckout(id);
      const expected = ['capture', 'reconcile', 'complete'].includes(phase) ? 'COMPLETED' : 'AWAITING_BUYER_APPROVAL';
      assert.equal(recovered.state, expected);
      if (expected === 'COMPLETED') {
        for (let i = 0; i < 2; i++) {
          assert.equal((await gateway.captureCheckout(id, 'ORDER123')).checkout.captureId, 'CAPTURE123');
          await gateway.reconcileCheckout(id);
        }
        const again = new NegotiationGateway({ payments: p.payments, store: new FileJournal(join(dir, 'journal')) });
        assert.equal((await again.captureCheckout(id, 'ORDER123')).state, 'COMPLETED');
        assert.equal(again.getIntent(id).events.filter(e => e.type === 'payment.completed').length, 1);
      } else {
        // Approval replay returns the same order; restarting did not create a replacement.
        if (phase === 'known-order') {
          assert.equal(recovered.checkout.approveUrl, 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123');
          const data = p.read(); data.order.status = 'APPROVED'; p.save(data);
        }
        assert.equal((await gateway.createCheckout(id, restored.checkout.offerId, baseUrl)).checkout.orderId, 'ORDER123');
        await gateway.captureCheckout(id, 'ORDER123');
      }
    }
    assert.equal(p.read().create, before.create);
    assert.ok(p.read().capture <= 1);
  });
}

test('an ambiguous capture stays locked across repeated restarts when order is still approved', async t => {
  const dir = directory(t);
  const calls = { create: 0, capture: 0 };
  let order;
  const payments = { isConfigured: () => true,
    async createOrder({ intentId }) {
      calls.create++;
      order = { id: 'ORDER123', intent: 'CAPTURE', status: 'APPROVED', purchase_units: [{
        reference_id: intentId, amount: { currency_code: 'USD', value: '200.00' }
      }] };
      return { id: order.id, approveUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123' };
    },
    async getOrder() { return structuredClone(order); },
    async captureOrder() { calls.capture++; throw Error('synthetic timeout'); }
  };
  let gateway = new NegotiationGateway({ merchants, payments, store: new FileJournal(join(dir, 'journal')) });
  const id = gateway.createIntent(mandate).intentId;
  await gateway.runRound(id, 'uncertain-round');
  await gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, baseUrl);
  await assert.rejects(gateway.captureCheckout(id, order.id));
  for (let i = 0; i < 3; i++) {
    gateway = new NegotiationGateway({ payments, store: new FileJournal(join(dir, 'journal')) });
    assert.equal((await gateway.reconcileCheckout(id)).state, 'RECONCILIATION_REQUIRED');
    await assert.rejects(gateway.captureCheckout(id, order.id), e => e.code === 'INVALID_STATE');
  }
  assert.deepEqual(calls, { create: 1, capture: 1 });
});

test('checkpoint failure before capture makes no payment call and blocks later execution', async t => {
  const dir = directory(t);
  const journal = new FileJournal(join(dir, 'journal'));
  let fail = false, captures = 0;
  const store = { kind: journal.kind, load: () => journal.load(), save: state => {
    if (fail && state.some(i => i.checkout?.captureAttempted)) throw Error('synthetic disk failure');
    journal.save(state);
  } };
  let order;
  const payments = { isConfigured: () => true,
    async createOrder({ intentId }) {
      order = { id: 'ORDER123', intent: 'CAPTURE', status: 'APPROVED', purchase_units: [{
        reference_id: intentId, amount: { currency_code: 'USD', value: '200.00' }
      }] };
      return { id: order.id, approveUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123' };
    },
    async getOrder() { return order; }, async captureOrder() { captures++; }
  };
  const gateway = new NegotiationGateway({ merchants, payments, store });
  const id = gateway.createIntent(mandate).intentId;
  await gateway.runRound(id, 'failed-disk-round');
  await gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, baseUrl);
  fail = true;
  await assert.rejects(gateway.captureCheckout(id, order.id), e => e.code === 'STORAGE_UNAVAILABLE');
  await assert.rejects(gateway.captureCheckout(id, order.id), e => e.code === 'STORAGE_UNAVAILABLE');
  assert.throws(() => gateway.getIntent(id), e => e.code === 'STORAGE_UNAVAILABLE');
  assert.equal(captures, 0);
  const restored = new NegotiationGateway({ payments, store: new FileJournal(join(dir, 'journal')) });
  assert.equal(restored.getIntent(id).checkout.captureAttempted, false);
  assert.equal((await restored.reconcileCheckout(id)).state, 'AWAITING_BUYER_APPROVAL');
});

test('a stale journal writer fails closed instead of overwriting newer state', async t => {
  const dir = directory(t), path = join(dir, 'journal');
  const first = new NegotiationGateway({ store: new FileJournal(path) });
  const stale = new NegotiationGateway({ store: new FileJournal(path) });
  const created = first.createIntent(mandate);
  assert.throws(() => stale.createIntent(mandate), e => e.code === 'STORAGE_UNAVAILABLE');
  assert.throws(() => stale.createIntent(mandate), e => e.code === 'STORAGE_UNAVAILABLE');
  assert.equal(new NegotiationGateway({ store: new FileJournal(path) }).getIntent(created.intentId).round, 0);
});

test('known-order recovery rejects unsafe approval links and resumes only a validated Sandbox link', async t => {
  const dir = directory(t);
  const child = spawnSync(process.execPath, ['test-support/crash-worker.js', dir, 'known-order'], {
    cwd: new URL('../', import.meta.url), timeout: 15000, env: {}, encoding: 'utf8'
  });
  assert.equal(child.signal, 'SIGKILL', child.stderr);
  const p = provider(dir), id = p.read().intentId;
  const gateway = new NegotiationGateway({ payments: p.payments, store: new FileJournal(join(dir, 'journal')) });
  for (const url of ['https://paypal.com/checkoutnow', 'https://www.sandbox.paypal.com.attacker.example',
    'https://user:password@www.sandbox.paypal.com/checkoutnow']) {
    const data = p.read(); data.order.links[0].href = url; p.save(data);
    const recovered = await gateway.reconcileCheckout(id);
    assert.equal(recovered.state, 'RECONCILIATION_REQUIRED');
    assert.equal(recovered.checkout.approveUrl, null);
  }
  const data = p.read(); data.order.links[0].href = 'https://sandbox.paypal.com/checkoutnow?token=ORDER123'; p.save(data);
  assert.equal((await gateway.reconcileCheckout(id)).state, 'AWAITING_BUYER_APPROVAL');
  assert.equal(p.read().capture, 0);
});

test('inconsistent persisted checkout state cannot reopen an attempted capture', async t => {
  const dir = directory(t), path = join(dir, 'journal');
  const child = spawnSync(process.execPath, ['test-support/crash-worker.js', dir, 'capture'], {
    cwd: new URL('../', import.meta.url), timeout: 15000, env: {}, encoding: 'utf8'
  });
  assert.equal(child.signal, 'SIGKILL', child.stderr);
  const file = join(path, readdirSync(path).filter(name => name.endsWith('.json')).sort().at(-1));
  const original = JSON.parse(readFileSync(file, 'utf8'));
  for (const mutate of [i => { i.state = i.checkout.status = 'AWAITING_BUYER_APPROVAL'; },
    i => { i.checkout.status = 'COMPLETED'; }]) {
    const data = structuredClone(original); mutate(data.intents[0]); writeFileSync(file, JSON.stringify(data));
    assert.throws(() => new NegotiationGateway({ store: new FileJournal(path) }), /Invalid persisted intent/);
  }
});

test('completed round replay retains its original response after restart and a later round', async t => {
  const dir = directory(t), path = join(dir, 'journal');
  let gateway = new NegotiationGateway({ merchants, store: new FileJournal(path) });
  const id = gateway.createIntent(mandate).intentId;
  const first = await gateway.runRound(id, 'original-round-key');
  gateway = new NegotiationGateway({ merchants, store: new FileJournal(path) });
  await gateway.runRound(id, 'second-round-key');
  assert.deepEqual(await gateway.runRound(id, 'original-round-key'), first);
  assert.equal(gateway.getIntent(id).round, 2);
});

test('restart preserves mandate expiry and the capture request identity', async t => {
  const dir = directory(t), path = join(dir, 'journal');
  let now = Date.now(), captures = 0, order;
  const payments = { isConfigured: () => true,
    async createOrder({ intentId }) {
      order = { id: 'ORDER123', intent: 'CAPTURE', status: 'APPROVED', purchase_units: [{
        reference_id: intentId, amount: { currency_code: 'USD', value: '200.00' }
      }] };
      return { id: order.id, approveUrl: 'https://sandbox.paypal.com/checkoutnow?token=ORDER123' };
    },
    async getOrder() { return order; }, async captureOrder() { captures++; }
  };
  let gateway = new NegotiationGateway({ merchants, payments, now: () => now, store: new FileJournal(path) });
  const id = gateway.createIntent(mandate).intentId;
  await gateway.runRound(id, 'expiry-round-key');
  const pending = await gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, baseUrl);
  assert.equal(pending.checkout.captureRequestId, 'vr-capture-' + id);
  now += 31 * 60 * 1000;
  gateway = new NegotiationGateway({ payments, now: () => now, store: new FileJournal(path) });
  assert.equal(gateway.getIntent(id).expiresAt, pending.expiresAt);
  await assert.rejects(gateway.captureCheckout(id, order.id), e => e.code === 'MANDATE_EXPIRED');
  assert.equal(captures, 0);
  assert.equal((await gateway.reconcileCheckout(id)).state, 'AWAITING_BUYER_APPROVAL');
});

test('damaged but parseable stored mandates are rejected before provider calls', async t => {
  for (const mutate of [i => { i.mandate.maxTotalMinor = -1; }, i => { i.mandate.quantity = 0; },
    i => { i.round = 3; }, i => { i.events = [{}]; }]) {
    const dir = directory(t), path = join(dir, 'journal');
    const gateway = new NegotiationGateway({ store: new FileJournal(path) });
    gateway.createIntent(mandate);
    const file = join(path, readdirSync(path).filter(name => name.endsWith('.json')).sort().at(-1));
    const data = JSON.parse(readFileSync(file, 'utf8'));
    mutate(data.intents[0]); writeFileSync(file, JSON.stringify(data));
    assert.throws(() => new NegotiationGateway({ store: new FileJournal(path) }), /Invalid persisted intent/);
  }
});

test('journal ignores incomplete staging files, restricts permissions and rejects damaged latest records', t => {
  const dir = directory(t), path = join(dir, 'journal');
  const gateway = new NegotiationGateway({ store: new FileJournal(path) });
  const id = gateway.createIntent(mandate).intentId;
  writeFileSync(join(path, '.pending-interrupted'), '{');
  assert.equal(new NegotiationGateway({ store: new FileJournal(path) }).getIntent(id).intentId, id);
  const record = readdirSync(path).filter(name => name.endsWith('.json')).sort().at(-1);
  assert.equal(statSync(join(path, record)).mode & 0o777, 0o600);
  assert.equal(statSync(path).mode & 0o777, 0o700);
  writeFileSync(join(path, record), '{');
  assert.throws(() => new FileJournal(path));
});

test('real local HTTP after restart retrieves and replays a receipt without another capture', { timeout: 30000 }, async t => {
  const dir = directory(t);
  const child = spawnSync(process.execPath, ['test-support/crash-worker.js', dir, 'capture'], {
    cwd: new URL('../', import.meta.url), timeout: 15000, env: {}, encoding: 'utf8'
  });
  assert.equal(child.signal, 'SIGKILL', child.stderr);
  const p = provider(dir), id = p.read().intentId;
  const gateway = new NegotiationGateway({ payments: p.payments, store: new FileJournal(join(dir, 'journal')) });
  const server = createApp({ gateway });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = async (action, payload = {}) => {
    const response = await fetch(base + '/api/intents/' + id + '/' + action, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(response.status, 200); return response.json();
  };
  assert.equal((await (await fetch(base + '/api/intents/' + id)).json()).state, 'RECONCILIATION_REQUIRED');
  assert.equal((await post('reconcile', { orderId: 'UNTRUSTED_ORDER' })).checkout.captureId, 'CAPTURE123');
  assert.equal((await post('capture', { orderId: 'ORDER123' })).state, 'COMPLETED');
  assert.equal((await (await fetch(base + '/api/health')).json()).store, 'local-file-journal');
  assert.equal(p.read().capture, 1);
});
