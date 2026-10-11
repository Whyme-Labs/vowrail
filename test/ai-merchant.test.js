import test from 'node:test';
import assert from 'node:assert/strict';
import { AdvisoryModel } from '../src/adapters/ai.js';
import { createAIMerchant } from '../src/adapters/ai-merchant.js';
import { NegotiationGateway } from '../src/core.js';

const request = { intentId: 'uuid', round: 1, item: 'Printed cards', quantity: 100, requirements: 'Matte' };
const good = { amountMinor: 20900, currency: 'USD', description: 'All charges included; synthetic terms', deliveryDays: 3 };

test('AI seller sees only public request and own floor/ceiling', async () => {
  let observed;
  const ai = { isConfigured: () => true, quoteAsMerchant: async args => { observed = args; return good; } };
  const agent = createAIMerchant(ai);
  assert.equal((await agent.quote(request)).amountMinor, 20900);
  assert.deepEqual(Object.keys(observed.publicRequest).sort(), Object.keys(request).sort());
  assert.equal(JSON.stringify(observed).includes('maxTotalMinor'), false);
  assert.equal(observed.sellerTerms.floorMinor, 18500);
});

test('AI seller price and descriptions cannot bypass merchant-side limits', async () => {
  for (const response of [{ ...good, amountMinor: 500 }, { ...good, amountMinor: 100000 },
    { ...good, amountMinor: '20900' }, { ...good, currency: 'EUR' },
    { ...good, description: '' }, { ...good, deliveryDays: -1 }, null]) {
    const ai = { isConfigured: () => true, quoteAsMerchant: async () => response };
    await assert.rejects(createAIMerchant(ai).quote(request));
  }
});

test('gateway rejects a malformed AI merchant but still accepts scripted merchant', async () => {
  const ai = { isConfigured: () => true, quoteAsMerchant: async () => ({ ...good, amountMinor: -10 }) };
  const merchants = [createAIMerchant(ai), { id: 'scripted', name: 'Scripted', quote: async () => good }];
  const gateway = new NegotiationGateway({ merchants, payments: { isConfigured: () => false } });
  const id = gateway.createIntent({ item: 'Printed cards', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 }).intentId;
  const state = await gateway.runRound(id, 'ai-merchant-round-one');
  assert.equal(state.offers.length, 1);
  assert.equal(state.offers[0].merchantId, 'scripted');
  assert.equal(state.events.filter(e => e.type === 'offer.rejected').length, 1);
});

test('remote AI adapter actually invokes compatible chat completion with JSON input', async () => {
  const calls = [];
  const model = new AdvisoryModel({
    apiKey: 'test-key', model: 'mock-model', baseUrl: 'https://ai.test/v1',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({
        choices: [{ message: { content: JSON.stringify(good) } }]
      }) };
    }
  });
  const quote = await model.quoteAsMerchant({ publicRequest: request, sellerTerms: { floorMinor: 18500, ceilingMinor: 24500 } });
  assert.equal(quote.amountMinor, 20900);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://ai.test/v1/chat/completions');
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.model, 'mock-model');
  assert.equal(JSON.stringify(payload).includes('maxTotalMinor'), false);
});
