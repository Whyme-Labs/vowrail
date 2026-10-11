import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NegotiationGateway } from '../src/core.js';
import { SimulatedPayments } from '../src/adapters/simulated-payments.js';
import { simulatedMerchants } from '../src/adapters/merchants.js';
import { FileJournal } from '../src/store.js';
import { createApp } from '../src/http.js';

// Bounded, credential-independent real HTTP rehearsal. No model/PayPal adapter is constructed.
const watchdog = setTimeout(() => { console.error('Rehearsal exceeded 20 seconds'); process.exit(1); }, 20000);
watchdog.unref();
async function scenario(loseCaptureResponseOnce) {
  const directory = mkdtempSync(join(tmpdir(), 'vowrail-rehearsal-'));
  let server, base, gateway, payments;
  const stop = () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  const start = async () => {
    payments = new SimulatedPayments({ store: new FileJournal(join(directory, 'provider'), { collection: 'orders' }), loseCaptureResponseOnce });
    gateway = new NegotiationGateway({ merchants: simulatedMerchants, payments, store: new FileJournal(join(directory, 'gateway')) });
    server = createApp({ gateway });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    base = 'http://127.0.0.1:' + server.address().port;
  };
  const request = async (path, method = 'GET', body = {}) => {
    assert.ok(path.startsWith('/'), 'request must stay on the local rehearsal server');
    const r = await fetch(base + path, { method, signal: AbortSignal.timeout(3000),
      headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-Vowrail-Checkout-Mode': 'simulation', 'Idempotency-Key': body.key ?? 'rehearsal-key' } : {},
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json() };
  };
  try {
    await start();
    const health = (await request('/api/health')).data;
    assert.equal(health.checkoutMode, 'simulation'); assert.equal(health.paypalConfigured, false); assert.equal(health.aiConfigured, false);
    const id = (await request('/api/intents', 'POST', { item: 'Synthetic rehearsal print run', quantity: 100,
      requirements: 'Matte finish, three-day delivery preferred.', maxTotalMinor: 22000, maxRounds: 2 })).data.intentId;
    const path = '/api/intents/' + id;
    assert.deepEqual(Object.keys(gateway.publicMerchantRequest(id, 1)).sort(), ['intentId', 'item', 'quantity', 'requirements', 'round']);
    await request(path + '/rounds', 'POST', { key: 'rehearsal-round-one' });
    const second = (await request(path + '/rounds', 'POST', { key: 'rehearsal-round-two' })).data;
    const third = await request(path + '/rounds', 'POST', { key: 'rehearsal-round-three' });
    assert.equal(third.status, 409); assert.equal(third.data.error.code, 'ROUND_LIMIT');
    const over = second.offers.find(o => o.amountMinor > 22000);
    const rejected = await request(path + '/checkout', 'POST', { offerId: over.offerId });
    assert.equal(rejected.data.error.code, 'INVALID_OFFER');
    const advice = (await request(path + '/recommend', 'POST')).data;
    assert.equal(advice.mode, 'deterministic');
    const box = (await request(path + '/checkout', 'POST', { offerId: advice.offerId, amountMinor: 1 })).data.checkout;
    assert.equal(box.mode, 'simulation'); assert.equal(box.amountMinor, 20100);
    const early = await request(path + '/capture', 'POST', { orderId: box.orderId });
    assert.equal(early.data.error.code, 'ORDER_NOT_APPROVED'); assert.equal(payments.captureCalls, 0);
    const approval = (await request(path + '/simulation-approval')).data;
    assert.equal(JSON.stringify(approval).includes('maxTotalMinor'), false);
    await request(path + '/simulation-approval', 'POST', { orderId: box.orderId });
    assert.equal(gateway.getIntent(id).state, 'AWAITING_BUYER_APPROVAL');
    const capture = await request(path + '/capture', 'POST', { orderId: box.orderId });
    assert.equal(payments.captureCalls, 1);
    if (loseCaptureResponseOnce) {
      assert.equal(capture.data.error.code, 'SIMULATED_RESPONSE_LOST');
      await stop(); await start();
      assert.equal(gateway.getIntent(id).checkout.captureAttempted, true);
      assert.equal((await request(path + '/reconcile', 'POST')).data.state, 'COMPLETED');
      assert.equal(payments.captureCalls, 0, 'restart recovery cannot recapture');
    } else assert.equal(capture.data.state, 'COMPLETED');
    const completed = (await request(path)).data;
    await request(path + '/capture', 'POST', { orderId: box.orderId });
    assert.equal(completed.events.filter(e => e.type === 'payment.completed').length, 1);
    assert.equal(completed.checkout.mode, 'simulation');
    assert.match(completed.checkout.captureId, /^SIMCAPTURE_/);
    return { scenario: loseCaptureResponseOnce ? 'lost-response-and-restart' : 'explicit-approval-and-capture', result: 'PASS',
      roundLimit: third.data.error.code, overBudget: rejected.data.error.code, earlyCapture: early.data.error.code,
      lockedAmountMinor: box.amountMinor, receiptMode: completed.checkout.mode, completedEvents: 1 };
  } finally {
    if (server?.listening) await stop();
    rmSync(directory, { recursive: true, force: true });
  }
}
try {
  const scenarios = [await scenario(false), await scenario(true)];
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), result: 'PASS', provider: 'LOCAL_SIMULATION_NOT_PAYPAL',
    model: 'deterministic_fallback', network: 'loopback_only', scenarios,
    limitation: 'Two scripted rehearsal paths, not a benchmark, real model call or PayPal Sandbox receipt.' }, null, 2));
} finally { clearTimeout(watchdog); }
