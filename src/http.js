import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { NegotiationGateway, PolicyError } from './core.js';

const files = new Map([
  ['/', ['../public/index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['../public/app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['../public/styles.css', 'text/css; charset=utf-8']]
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
      if (request.method === 'GET' && path === '/api/health') {
        return send(response, 200, {
          ok: true, demoOnly: true, store: 'process-memory',
          aiConfigured: Boolean(gateway.ai?.isConfigured?.()),
          paypalConfigured: Boolean(gateway.payments?.isConfigured?.())
        });
      }
      if (request.method === 'GET' && files.has(path)) {
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
      const match = path.match(/^\/api\/intents\/([0-9a-fA-F-]{36})(?:\/(rounds|recommend|checkout|capture))?$/);
      if (match) {
        const intentId = match[1], action = match[2];
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
