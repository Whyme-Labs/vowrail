// Synthetic crash fixture. Never imports a real provider or reads credentials.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NegotiationGateway } from '../src/core.js';
import { FileJournal } from '../src/store.js';

const [dir, phase] = process.argv.slice(2);
if (!dir || !['round', 'create', 'known-order', 'verify', 'capture', 'reconcile', 'complete'].includes(phase)) {
  throw Error('Expected a synthetic test directory and crash phase');
}
const path = join(dir, 'synthetic-provider.json');
const read = () => JSON.parse(readFileSync(path, 'utf8'));
const save = data => writeFileSync(path, JSON.stringify(data));
const crash = () => process.kill(process.pid, 'SIGKILL');
const journal = new FileJournal(join(dir, 'journal'));
const store = { kind: journal.kind, load: () => journal.load(), save: state => {
  journal.save(state);
  if (phase === 'known-order' && state.some(i => i.state === 'CHECKOUT_CREATING' && i.checkout?.orderId)) crash();
} };
let reconciling = false;
const payments = { isConfigured: () => true,
  async createOrder({ intentId }) {
    const data = read(); data.create++;
    data.order = { id: 'ORDER123', intent: 'CAPTURE', status: phase === 'known-order' ? 'PAYER_ACTION_REQUIRED' : 'APPROVED',
      links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123' }], purchase_units: [{
      reference_id: intentId, amount: { currency_code: 'USD', value: '200.00' }
    }] };
    save(data);
    if (phase === 'create') crash();
    return { id: 'ORDER123', approveUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123' };
  },
  async getOrder() {
    const data = read(); data.get++; save(data);
    if (phase === 'verify' || (phase === 'reconcile' && reconciling)) crash();
    return data.order;
  },
  async captureOrder() {
    const data = read(); data.capture++;
    data.order.status = 'COMPLETED';
    data.order.purchase_units[0].payments = { captures: [{ id: 'CAPTURE123', status: 'COMPLETED',
      amount: data.order.purchase_units[0].amount }] };
    save(data);
    if (phase === 'capture') crash();
    if (phase === 'reconcile') throw Error('synthetic lost capture response');
    return data.order;
  }
};
const merchants = [{ id: 'synthetic', name: 'Synthetic', quote: async () => {
  if (phase === 'round') crash();
  return { amountMinor: 20000, currency: 'USD', description: 'Synthetic offer', deliveryDays: 2 };
} }];
const gateway = new NegotiationGateway({ payments, merchants, store });
const id = gateway.createIntent({ item: 'Synthetic printed cards', quantity: 100, maxTotalMinor: 22000, maxRounds: 2 }).intentId;
save({ intentId: id, create: 0, get: 0, capture: 0, order: null });
await gateway.runRound(id, 'crash-round-key');
await gateway.createCheckout(id, gateway.eligibleOffers(id)[0].offerId, 'http://127.0.0.1:8787');
try { await gateway.captureCheckout(id, 'ORDER123'); } catch (error) {
  if (phase !== 'reconcile') throw error;
}
if (phase === 'reconcile') { reconciling = true; await gateway.reconcileCheckout(id); }
crash();
