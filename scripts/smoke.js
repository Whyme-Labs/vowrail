import assert from 'node:assert/strict';
import { NegotiationGateway } from '../src/core.js';
import { simulatedMerchants } from '../src/adapters/merchants.js';

const gateway = new NegotiationGateway({ merchants: simulatedMerchants, payments: { isConfigured: () => false } });
const id = gateway.createIntent({
  item: 'Synthetic print run', quantity: 100, requirements: 'Matte, 3 day delivery',
  maxTotalMinor: 22000, currency: 'USD', maxRounds: 2
}).intentId;
const first = await gateway.runRound(id, 'smoke-first-round');
const second = await gateway.runRound(id, 'smoke-second-round');
const eligible = gateway.eligibleOffers(id);
const recommendation = await gateway.recommend(id);
assert.equal(first.round, 1);
assert.equal(second.round, 2);
assert.equal(second.offers.length, 6);
assert.equal(eligible.length, 3);
assert.equal(recommendation.mode, 'deterministic');
assert.throws(() => gateway.runRound(id, 'smoke-third-round'), e => e.code === 'ROUND_LIMIT');
console.log(JSON.stringify({ result: 'PASS', simulatedMerchants: 3, roundCap: 2,
  acceptedOffers: second.offers.length, eligibleOffers: eligible.length, recommendation: recommendation.mode,
  note: 'No actual AI calls or PayPal transactions occurred in this smoke test' }, null, 2));
