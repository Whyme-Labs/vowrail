import { moneyToDecimal, PolicyError } from '../core.js';

const SANDBOX = 'https://api-m.sandbox.paypal.com';

/** No live-host configuration is supported. Inject fetch only for tests. */
export class PayPalSandbox {
  constructor({ clientId = '', clientSecret = '', fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }
  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }
  async token() {
    if (!this.isConfigured()) throw new PolicyError('PAYPAL_NOT_CONFIGURED', 'Sandbox credentials not configured', 503);
    if (this.accessToken && this.tokenExpiry > this.now() + 30000) return this.accessToken;
    const auth = Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64');
    const response = await this.fetchImpl(SANDBOX + '/v1/oauth2/token', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    if (!response.ok) throw new PolicyError('PAYPAL_AUTH_FAILED', 'PayPal Sandbox authorization failed', 502);
    const data = await response.json();
    if (!data?.access_token || !Number.isFinite(data.expires_in)) throw new PolicyError('PAYPAL_AUTH_FAILED', 'PayPal returned invalid access token', 502);
    this.accessToken = data.access_token;
    this.tokenExpiry = this.now() + data.expires_in * 1000;
    return this.accessToken;
  }
  async request(path, { method = 'GET', body = undefined, idempotencyKey = undefined } = {}) {
    const token = await this.token();
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    if (idempotencyKey) headers['PayPal-Request-Id'] = idempotencyKey;
    const response = await this.fetchImpl(SANDBOX + path, {
      method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) {
      // Never leak the provider's raw response, which may contain sensitive data.
      throw new PolicyError('PAYPAL_API_ERROR', 'PayPal Sandbox request failed (HTTP ' + response.status + ')', 502);
    }
    return response.json();
  }
  async createOrder({ intentId, amountMinor, currency, returnUrl, cancelUrl, idempotencyKey }) {
    if (currency !== 'USD') throw new PolicyError('UNSUPPORTED_CURRENCY', 'Demo supports USD only');
    const response = await this.request('/v2/checkout/orders', {
      method: 'POST',
      idempotencyKey,
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: intentId,
          description: 'Vowrail synthetic custom printing demo',
          amount: { currency_code: currency, value: moneyToDecimal(amountMinor) }
        }],
        payment_source: { paypal: { experience_context: {
          return_url: returnUrl, cancel_url: cancelUrl,
          user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING'
        } } }
      }
    });
    const approveUrl = response.links?.find(link => ['payer-action', 'approve'].includes(link.rel))?.href;
    return { id: response.id, approveUrl };
  }
  async getOrder(orderId) {
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(orderId)) throw new PolicyError('INVALID_ORDER_ID', 'Invalid PayPal order identifier', 400);
    return this.request('/v2/checkout/orders/' + encodeURIComponent(orderId));
  }
  async captureOrder(orderId, idempotencyKey) {
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(orderId)) throw new PolicyError('INVALID_ORDER_ID', 'Invalid PayPal order identifier', 400);
    return this.request('/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', { method: 'POST', idempotencyKey, body: {} });
  }
}
