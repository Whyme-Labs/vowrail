import test from 'node:test';
import assert from 'node:assert/strict';
import { AdvisoryModel } from '../src/adapters/ai.js';
import { NegotiationGateway } from '../src/core.js';
import { simulatedMerchants } from '../src/adapters/merchants.js';

test('buyer advice bounds output and preserves gateway authority in one request', async () => {
  const requests = [];
  const ai = new AdvisoryModel({ apiKey: 'synthetic-key', model: 'synthetic-model', fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    assert.equal(body.max_completion_tokens, 256);
    assert.ok(Buffer.byteLength(options.body) <= 8192);
    const input = JSON.parse(body.messages[1].content);
    const offer = input.offers.find(o => o.deliveryDays === 2);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ offerId: offer.offerId, reason: 'Synthetic delivery preference' }) } }] }) };
  } });
  const gateway = new NegotiationGateway({ merchants: simulatedMerchants, ai });
  const id = gateway.createIntent({ item: 'Synthetic print run', quantity: 100, requirements: 'Three-day delivery preferred', maxTotalMinor: 22000, maxRounds: 2 }).intentId;
  await gateway.runRound(id, 'bounded-advice-first');
  await gateway.runRound(id, 'bounded-advice-second');
  const before = gateway.getIntent(id);
  assert.equal((await gateway.recommend(id)).mode, 'ai_advisory');
  assert.deepEqual(gateway.getIntent(id), before);
  assert.equal(requests.length, 1);
  assert.equal(JSON.stringify(requests).includes('maxTotalMinor'), false);
});

test('oversized UTF-8 model input is rejected before transport without truncation or retry', async () => {
  let calls = 0;
  const ai = new AdvisoryModel({ apiKey: 'synthetic-key', model: 'synthetic-model', fetchImpl: async () => { calls++; throw Error('Transport must not run'); } });
  await assert.rejects(ai.recommend({ item: '印'.repeat(3000), quantity: 100, requirements: '', offers: [] }), /8 KiB/);
  assert.equal(calls, 0);
});
