import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AdvisoryModel } from '../src/adapters/ai.js';
import { createAIMerchant } from '../src/adapters/ai-merchant.js';
import { simulatedMerchants } from '../src/adapters/merchants.js';
import { NegotiationGateway } from '../src/core.js';

const modelOptions = { apiKey: 'synthetic-key', model: 'synthetic-model', baseUrl: 'https://model.test/v1' };
const advice = { item: 'Cards', quantity: 100, requirements: 'Matte', offers: [] };

function untilAborted(signal) {
  return new Promise((resolve, reject) => {
    // Keep this synthetic stalled call bounded even before the implementation exists.
    const watchdog = setTimeout(() => reject(new Error('Missing model request deadline')), 250);
    const abort = () => { clearTimeout(watchdog); reject(signal.reason); };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

test('model requests have a default deadline and reject invalid timeout configuration', async () => {
  let signal;
  const model = new AdvisoryModel({ ...modelOptions, fetchImpl: async (url, options) => {
    signal = options.signal;
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) };
  } });
  await model.recommend(advice);
  assert.equal(model.timeoutMs, 10000);
  assert.ok(signal instanceof AbortSignal);
  for (const timeoutMs of [0, -1, 30001, 1.5, '20', NaN]) {
    assert.throws(() => new AdvisoryModel({ timeoutMs }), /Invalid AI timeout/);
  }
});

test('a stalled model response before headers aborts within the configured deadline', async () => {
  const model = new AdvisoryModel({ ...modelOptions, timeoutMs: 20,
    fetchImpl: (url, options) => untilAborted(options.signal) });
  await assert.rejects(model.recommend(advice), { name: 'TimeoutError' });
});

test('the model deadline also covers reading the response body', async () => {
  const model = new AdvisoryModel({ ...modelOptions, timeoutMs: 20,
    fetchImpl: async (url, options) => ({ ok: true, json: () => untilAborted(options.signal) }) });
  await assert.rejects(model.recommend(advice), { name: 'TimeoutError' });
});

test('model timeout releases the round without replaying it and buyer advice falls back', async () => {
  const calls = [];
  const model = new AdvisoryModel({ ...modelOptions, timeoutMs: 20,
    fetchImpl: (url, options) => { calls.push(options); return untilAborted(options.signal); } });
  const gateway = new NegotiationGateway({
    merchants: [createAIMerchant(model), simulatedMerchants[0]], ai: model,
    payments: { isConfigured: () => false }
  });
  const id = gateway.createIntent({ item: 'Cards', quantity: 100, maxTotalMinor: 30000, maxRounds: 1 }).intentId;
  const result = await gateway.runRound(id, 'bounded-model-round');
  assert.equal(result.state, 'OPEN');
  assert.equal(result.round, 1);
  assert.equal(result.offers.length, 1);
  assert.equal(result.events.find(event => event.type === 'offer.rejected').reason, 'MERCHANT_UNAVAILABLE');
  assert.equal(calls[0].signal?.aborted, true);
  await gateway.runRound(id, 'bounded-model-round');
  assert.equal(calls.length, 1);
  assert.throws(() => gateway.runRound(id, 'different-model-round'), { code: 'ROUND_LIMIT' });
  const fallback = await gateway.recommend(id);
  assert.equal(fallback.mode, 'deterministic');
  assert.equal(fallback.offerId, result.offers[0].offerId);
  assert.equal(fallback.reason, 'Model unavailable; using eligible lowest-price fallback');
  assert.equal(calls.length, 2);
  assert.equal(calls.map(call => call.body).join('').includes('maxTotalMinor'), false);
  assert.equal(gateway.getIntent(id).checkout, null);
});

test('actual fetch aborts a local synthetic provider that stalls its JSON body', { timeout: 20000 }, async t => {
  let requests = 0;
  const provider = http.createServer((request, response) => {
    if (request.method === 'GET') { response.end('{}'); return; }
    requests++;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write('{"choices":');
    // Intentionally leave the body unfinished. No remote service or credentials are used.
  });
  await new Promise((resolve, reject) => {
    provider.once('error', reject);
    provider.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => { provider.closeAllConnections(); return new Promise(resolve => provider.close(resolve)); });
  const base = 'http://127.0.0.1:' + provider.address().port;
  // Initialize Node's real fetch and its loopback connection before timing the stalled body.
  // A cold fetch on a busy shared Mac can spend the short deadline before sending headers.
  const ready = await fetch(base + '/ready', { signal: AbortSignal.timeout(10000) });
  await ready.text();
  const model = new AdvisoryModel({ ...modelOptions, timeoutMs: 1000, baseUrl: base + '/v1' });
  let watchdog;
  try {
    await assert.rejects(Promise.race([
      model.recommend(advice),
      new Promise((resolve, reject) => { watchdog = setTimeout(() => reject(new Error('Missing model request deadline')), 5000); })
    ]), error => ['AbortError', 'TimeoutError'].includes(error.name));
  } finally { clearTimeout(watchdog); }
  assert.equal(requests, 1);
});
