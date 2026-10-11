import { NegotiationGateway } from './core.js';
import { simulatedMerchants } from './adapters/merchants.js';
import { createAIMerchant } from './adapters/ai-merchant.js';
import { PayPalSandbox } from './adapters/paypal.js';
import { AdvisoryModel } from './adapters/ai.js';
import { createApp } from './http.js';
import { FileJournal } from './store.js';
import { SimulatedPayments } from './adapters/simulated-payments.js';
import { join } from 'node:path';

if (process.env.DEMO_MODE && process.env.DEMO_MODE !== '1') throw Error('DEMO_MODE must be 1 or unset');
const simulation = process.env.DEMO_MODE === '1';
if (process.env.SIMULATE_LOST_CAPTURE && (process.env.SIMULATE_LOST_CAPTURE !== '1' || !simulation)) {
  throw Error('SIMULATE_LOST_CAPTURE=1 requires DEMO_MODE=1');
}

const host = process.env.HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  throw new Error('Public network binding is prohibited for this unauthenticated demo');
}
const port = Number(process.env.PORT || 8787);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const baseUrl = simulation ? 'http://127.0.0.1:' + port : process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:' + port;
const directory = process.env.VOWRAIL_STATE_DIR || (simulation ? '.vowrail/simulation' : '.vowrail/journal');
const payments = simulation ? new SimulatedPayments({
  store: new FileJournal(join(directory, 'provider'), { collection: 'orders' }),
  loseCaptureResponseOnce: process.env.SIMULATE_LOST_CAPTURE === '1'
}) : new PayPalSandbox({
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || ''
});
const ai = simulation ? null : new AdvisoryModel({
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || '',
  baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
});
const aiMerchantEnabled = process.env.AI_MERCHANTS === '1' && Boolean(ai?.isConfigured());
const merchants = aiMerchantEnabled
  ? [simulatedMerchants[0], createAIMerchant(ai), simulatedMerchants[2]]
  : simulatedMerchants;
const store = new FileJournal(simulation ? join(directory, 'gateway') : directory);
const gateway = new NegotiationGateway({ merchants, payments, ai, store });
const server = createApp({ gateway, baseUrl });
server.listen(port, host, () => {
  console.log('Vowrail local demo at http://' + host + ':' + port);
  console.log('AI advisory: ' + (ai?.isConfigured() ? 'configured' : 'deterministic fallback'));
  console.log('AI merchant: ' + (aiMerchantEnabled ? 'configured, SYNTHETIC' : 'scripted synthetic sellers'));
  console.log('Checkout: ' + (simulation ? 'LOCAL SIMULATION. No PayPal or model calls. No money moves.'
    : payments.isConfigured() ? 'PayPal SANDBOX configured' : 'PayPal not configured'));
  if (simulation) console.log('Simulated provider and gateway journals are separate from Sandbox records.');
  console.log('Local journal enabled. No user authentication; never expose this demo to the internet.');
});
