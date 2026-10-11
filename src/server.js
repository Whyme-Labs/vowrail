import { NegotiationGateway } from './core.js';
import { simulatedMerchants } from './adapters/merchants.js';
import { createAIMerchant } from './adapters/ai-merchant.js';
import { PayPalSandbox } from './adapters/paypal.js';
import { AdvisoryModel } from './adapters/ai.js';
import { createApp } from './http.js';
import { FileJournal } from './store.js';

const host = process.env.HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  throw new Error('Public network binding is prohibited for this unauthenticated demo');
}
const port = Number(process.env.PORT || 8787);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const baseUrl = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:' + port;
const payments = new PayPalSandbox({
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || ''
});
const ai = new AdvisoryModel({
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || '',
  baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
});
const aiMerchantEnabled = process.env.AI_MERCHANTS === '1' && ai.isConfigured();
const merchants = aiMerchantEnabled
  ? [simulatedMerchants[0], createAIMerchant(ai), simulatedMerchants[2]]
  : simulatedMerchants;
const store = new FileJournal(process.env.VOWRAIL_STATE_DIR || '.vowrail/journal');
const gateway = new NegotiationGateway({ merchants, payments, ai, store });
const server = createApp({ gateway, baseUrl });
server.listen(port, host, () => {
  console.log('Vowrail local demo at http://' + host + ':' + port);
  console.log('AI advisory: ' + (ai.isConfigured() ? 'configured' : 'deterministic fallback'));
  console.log('AI merchant: ' + (aiMerchantEnabled ? 'configured, SYNTHETIC' : 'scripted synthetic sellers'));
  console.log('PayPal: ' + (payments.isConfigured() ? 'SANDBOX configured' : 'not configured'));
  console.log('Local journal enabled. No user authentication; never expose this demo to the internet.');
});
