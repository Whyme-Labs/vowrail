import test from 'node:test';
import assert from 'node:assert/strict';
import { PayPalSandbox } from '../src/adapters/paypal.js';

function transport() {
  const calls = [];
  const mock = async (url, config) => {
    calls.push({ url, config });
    if (url.endsWith('/v1/oauth2/token')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'TEST_TOKEN', expires_in: 3600 }) };
    }
    if (url.endsWith('/v2/checkout/orders') && config.method === 'POST') {
      return { ok: true, status: 201, json: async () => ({
        id: 'SANDBOXORDER123', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=SANDBOXORDER123' }]
      }) };
    }
    if (url.endsWith('/capture')) return { ok: true, status: 201, json: async () => ({ id: 'SANDBOXORDER123' }) };
    return { ok: true, status: 200, json: async () => ({ id: 'SANDBOXORDER123' }) };
  };
  return { mock, calls };
}
test('PayPal adapter calls only Sandbox endpoints and creates exact amount with stable idempotency key', async () => {
  const { mock, calls } = transport();
  const api = new PayPalSandbox({ clientId: 'sandbox-id', clientSecret: 'sandbox-secret', fetchImpl: mock });
  const order = await api.createOrder({
    intentId: 'this-is-a-uuid', amountMinor: 20815, currency: 'USD',
    returnUrl: 'http://127.0.0.1:8787/?intent=abc', cancelUrl: 'http://127.0.0.1:8787/?cancelled=1',
    idempotencyKey: 'create-12345678'
  });
  assert.equal(order.id, 'SANDBOXORDER123');
  assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.url.startsWith('https://api-m.sandbox.paypal.com/')));
  const payload = JSON.parse(calls[1].config.body);
  assert.equal(payload.purchase_units[0].amount.value, '208.15');
  assert.equal(payload.purchase_units[0].amount.currency_code, 'USD');
  assert.equal(payload.intent, 'CAPTURE');
  assert.equal(calls[1].config.headers['PayPal-Request-Id'], 'create-12345678');
  assert.equal(JSON.stringify(payload).includes('sandbox-secret'), false);
  await api.getOrder('SANDBOXORDER123');
  await api.captureOrder('SANDBOXORDER123', 'capture-12345678');
  assert.equal(calls.filter(c => c.url.endsWith('/v1/oauth2/token')).length, 1);
  assert.equal(calls.at(-1).config.headers['PayPal-Request-Id'], 'capture-12345678');
});

test('PayPal adapter requires credentials and rejects unsupported currency', async () => {
  const api = new PayPalSandbox();
  assert.equal(api.isConfigured(), false);
  await assert.rejects(api.token(), e => e.code === 'PAYPAL_NOT_CONFIGURED');
  const configured = new PayPalSandbox({ clientId: 'x', clientSecret: 'y' });
  await assert.rejects(configured.createOrder({ currency: 'EUR', amountMinor: 1000 }), e => e.code === 'UNSUPPORTED_CURRENCY');
});

test('provider failure is redacted rather than revealing response text', async () => {
  const api = new PayPalSandbox({ clientId: 'x', clientSecret: 'SECRET', fetchImpl: async () => ({
    ok: false, status: 401, text: async () => 'SECRET!'
  }) });
  await assert.rejects(api.token(), e => e.code === 'PAYPAL_AUTH_FAILED' && !e.message.includes('SECRET'));
});

test('invalid order IDs cannot be used in PayPal request path', async () => {
  const { mock, calls } = transport();
  const api = new PayPalSandbox({ clientId: 'x', clientSecret: 'y', fetchImpl: mock });
  await assert.rejects(api.getOrder('../production'), e => e.code === 'INVALID_ORDER_ID');
  assert.equal(calls.length, 0);
});
