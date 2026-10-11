import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { NegotiationGateway, PolicyError } from './core.js';
import { SimulatedPayments } from './adapters/simulated-payments.js';

const files = new Map([
  ['/', ['../public/index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['../public/app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['../public/styles.css', 'text/css; charset=utf-8']],
  ['/simulation/approval', ['../public/approval.html', 'text/html; charset=utf-8']],
  ['/approval.js', ['../public/approval.js', 'text/javascript; charset=utf-8']]
]);

async function readJSON(request) {
  if (!(request.headers['content-type'] || '').startsWith('application/json')) {
    throw new PolicyError('INVALID_CONTENT_TYPE', 'Expected application/json', 415);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16384) throw new PolicyError('REQUEST_TOO_LARGE', 'Body exceeds 16 KiB', 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new PolicyError('INVALID_JSON', 'Invalid JSON body', 400);
  }
}
const send = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  response.end(JSON.stringify(body));
};

export function createApp({ gateway, baseUrl = 'http://127.0.0.1:8787' } = {}) {
  if (!(gateway instanceof NegotiationGateway)) throw new Error('gateway is required');
  return http.createServer(async (request, response) => {
    try {
      const current = new URL(request.url, 'http://localhost');
      const path = current.pathname;
      const expectedMode = request.headers['x-vowrail-checkout-mode'];
      if (request.method === 'POST' && expectedMode && expectedMode !== gateway.paymentMode) {
        throw new PolicyError('CHECKOUT_MODE_MISMATCH', 'Checkout mode changed. Reload the app before any further action.');
      }
      if (request.method === 'GET' && path === '/api/health') {
        return send(response, gateway.storageHealthy ? 200 : 503, {
          ok: gateway.storageHealthy, demoOnly: true, store: gateway.store?.kind ?? 'process-memory',
          aiConfigured: Boolean(gateway.ai?.isConfigured?.()),
          paypalConfigured: gateway.paymentMode === 'paypal_sandbox' && Boolean(gateway.payments?.isConfigured?.()),
          checkoutMode: gateway.paymentMode,
          checkoutConfigured: Boolean(gateway.payments?.isConfigured?.())
        });
      }
      if (request.method === 'GET' && files.has(path)) {
        if (['/simulation/approval', '/approval.js'].includes(path) && gateway.paymentMode !== 'simulation') {
          return send(response, 404, { error: { code: 'NOT_FOUND', message: 'Simulation is not enabled' } });
        }
        const [name, contentType] = files.get(path);
        const payload = await readFile(new URL(name, import.meta.url));
        response.writeHead(200, {
          'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
          'Cache-Control': 'no-store'
        });
        return response.end(payload);
      }
      if (path === '/api/intents' && request.method === 'POST') {
        checkOrigin(request, baseUrl);
        return send(response, 201, gateway.createIntent(await readJSON(request)));
      }
      const match = path.match(/^\/api\/intents\/([0-9a-fA-F-]{36})(?:\/(rounds|recommend|checkout|capture|reconcile|simulation-approval))?$/);
      if (match) {
        const intentId = match[1], action = match[2];
        if (action === 'simulation-approval') {
          if (gateway.paymentMode !== 'simulation' || !(gateway.payments instanceof SimulatedPayments)) {
            return send(response, 404, { error: { code: 'NOT_FOUND', message: 'Simulation is not enabled' } });
          }
          if (!['GET', 'POST'].includes(request.method)) return send(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Unsupported method' } });
          let body;
          if (request.method === 'POST') { checkOrigin(request, baseUrl); body = await readJSON(request); }
          const view = gateway.getIntent(intentId), box = view.checkout;
          if (box?.mode !== 'simulation' || !box.orderId) throw new PolicyError('INVALID_STATE', 'Create a simulated order first');
          if (request.method === 'POST') {
            if (view.state !== 'AWAITING_BUYER_APPROVAL') throw new PolicyError('INVALID_STATE', 'Simulated approval cannot change this checkout');
            if (body?.orderId !== box.orderId) throw new PolicyError('ORDER_MISMATCH', 'Order does not match the locked checkout');
            if (gateway.now() >= Date.parse(view.expiresAt)) throw new PolicyError('MANDATE_EXPIRED', 'Mandate expired; simulated approval is blocked');
            await gateway.payments.approveOrder(box.orderId);
          }
          const order = await gateway.payments.getOrder(box.orderId);
          return send(response, 200, { mode: 'simulation', intentId, orderId: box.orderId, orderStatus: order.status,
            amountMinor: box.amountMinor, currency: box.currency, item: view.mandate.item, quantity: view.mandate.quantity,
            merchantName: view.offers.find(o => o.offerId === box.offerId)?.merchantName, expiresAt: view.expiresAt });
        }
        if (request.method === 'GET' && !action) return send(response, 200, gateway.getIntent(intentId));
        if (request.method !== 'POST') return send(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Unsupported method' } });
        checkOrigin(request, baseUrl);
        if (action === 'rounds') {
          await readJSON(request);
          return send(response, 200, await gateway.runRound(intentId, request.headers['idempotency-key']));
        }
        if (action === 'recommend') {
          await readJSON(request);
          return send(response, 200, await gateway.recommend(intentId));
        }
        if (action === 'checkout') {
          const body = await readJSON(request);
          return send(response, 200, await gateway.createCheckout(intentId, body?.offerId, baseUrl));
        }
        if (action === 'capture') {
          const body = await readJSON(request);
          return send(response, 200, await gateway.captureCheckout(intentId, body?.orderId));
        }
        if (action === 'reconcile') {
          await readJSON(request);
          return send(response, 200, await gateway.reconcileCheckout(intentId));
        }
      }
      return send(response, 404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
    } catch (error) {
      const known = error instanceof PolicyError;
      const status = known ? error.status : 500;
      send(response, status, { error: { code: known ? error.code : 'INTERNAL_ERROR',
        message: known ? error.message : 'Unexpected server error' } });
      if (!known) console.error('Unexpected request failure:', error?.name || 'Error');
    }
  });
}

function checkOrigin(request, baseUrl) {
  const origin = request.headers.origin;
  if (origin && origin !== new URL(baseUrl).origin) {
    throw new PolicyError('FORBIDDEN_ORIGIN', 'Cross-origin mutations are blocked', 403);
  }
}
