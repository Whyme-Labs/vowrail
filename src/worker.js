import { DurableObject } from 'cloudflare:workers';
import { NegotiationGateway, PolicyError } from './core.js';
import { simulatedMerchants } from './adapters/merchants.js';
import { PayPalSandbox } from './adapters/paypal.js';
import { SimulatedPayments } from './adapters/simulated-payments.js';
import { AdvisoryModel } from './adapters/ai.js';
import { readSession, newSession, sessionCookie, csrfToken, checkMutation, readHostedJSON,
  SECURITY_HEADERS, sign, providerFetch } from './worker-security.js';

const ASSETS = new Map([['/', '/'], ['/demo/', '/'], ['/app.js', '/app.js'],
  ['/styles.css', '/styles.css'], ['/approval.js', '/approval.js'], ['/demo/simulation/approval', '/approval.html']]);
const RATE_RULES = {
  session: [{ key: 'sessions.hour', limit: 20, period: 3600000 }],
  create: [{ key: 'writes.minute', limit: 30, period: 60000 }, { key: 'intents.day', limit: 40, period: 86400000 }],
  write: [{ key: 'writes.minute', limit: 30, period: 60000 }],
  advice: [{ key: 'writes.minute', limit: 30, period: 60000 }, { key: 'advice.minute', limit: 3, period: 60000 },
    { key: 'advice.day', limit: 60, period: 86400000 }],
  provider: [{ key: 'writes.minute', limit: 30, period: 60000 }, { key: 'paypal.minute', limit: 8, period: 60000 },
    { key: 'paypal.day', limit: 100, period: 86400000 }],
  globalAdvice: [{ key: 'free-model.day', limit: 500, period: 86400000 }]
};

function json(status, body, extra = {}) {
  return Response.json(body, { status, headers: { ...SECURITY_HEADERS, ...extra } });
}
function failure(error) {
  const known = error instanceof PolicyError;
  if (!known) console.error(JSON.stringify({ event: 'request.failure', type: error?.name || 'Error' }));
  return json(known ? error.status : 503, { error: { code: known ? error.code : 'SERVICE_UNAVAILABLE',
    message: known ? error.message : 'The service is unavailable. Preserve pending purchases and try reading their status later.' } });
}

/** Synchronous SQL implements the gateway's checkpoint contract; each object owns its records. */
class SqlSnapshot {
  constructor(storage, collection) {
    this.storage = storage; this.collection = collection; this.kind = 'durable-object-sqlite';
    storage.sql.exec('CREATE TABLE IF NOT EXISTS snapshots (collection TEXT PRIMARY KEY, data TEXT NOT NULL)');
  }
  load() {
    const row = this.storage.sql.exec('SELECT data FROM snapshots WHERE collection = ?', this.collection).toArray()[0];
    return row ? JSON.parse(row.data) : [];
  }
  save(records) {
    this.storage.transactionSync(() => this.storage.sql.exec(
      'INSERT INTO snapshots (collection, data) VALUES (?, ?) ON CONFLICT(collection) DO UPDATE SET data = excluded.data',
      this.collection, JSON.stringify(records)));
  }
}

/** Strict counters per pseudonymous IP. The global instance handles only the free-model daily budget. */
export class RequestLimits extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)');
  }
  consume(category) {
    const rules = RATE_RULES[category];
    if (!rules) throw Error('Unknown rate category');
    return this.ctx.storage.transactionSync(() => {
      const now = Date.now();
      const entries = rules.map(rule => {
        const window = Math.floor(now / rule.period);
        const row = this.ctx.storage.sql.exec('SELECT window, count FROM counters WHERE key = ?', rule.key).toArray()[0];
        return { ...rule, window, count: row?.window === window ? row.count : 0 };
      });
      const blocked = entries.filter(entry => entry.count >= entry.limit);
      if (blocked.length) return { success: false, retryAfter: Math.max(...blocked.map(entry =>
        Math.ceil(((entry.window + 1) * entry.period - now) / 1000))) };
      for (const entry of entries) this.ctx.storage.sql.exec(
        'INSERT INTO counters (key, window, count) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET window = excluded.window, count = excluded.count',
        entry.key, entry.window, entry.count + 1);
      return { success: true };
    });
  }
}

export class JudgeSession extends DurableObject {
  #gateways = new Map();
  constructor(ctx, env) { super(ctx, env); }
  #gateway(mode) {
    if (this.#gateways.has(mode)) return this.#gateways.get(mode);
    const simulation = mode === 'simulation';
    const remoteFetch = providerFetch();
    const payments = simulation ? new SimulatedPayments({
      store: new SqlSnapshot(this.ctx.storage, 'orders'),
      // Only local runtime tests can bind this; deployment config never exposes fault injection.
      loseCaptureResponseOnce: this.env.SIMULATED_LOST_RESPONSE === '1'
    }) : new PayPalSandbox({ clientId: this.env.PAYPAL_CLIENT_ID, clientSecret: this.env.PAYPAL_CLIENT_SECRET, fetchImpl: remoteFetch });
    const ai = !simulation && this.env.OPENROUTER_API_KEY ? new AdvisoryModel({
      apiKey: this.env.OPENROUTER_API_KEY, model: this.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free',
      baseUrl: 'https://openrouter.ai/api/v1', freeOnly: true, fetchImpl: remoteFetch
    }) : null;
    const gateway = new NegotiationGateway({ merchants: simulatedMerchants, payments, ai,
      store: new SqlSnapshot(this.ctx.storage, mode + '-intents') });
    this.#gateways.set(mode, gateway);
    return gateway;
  }
  async handle({ mode, method, path, body, requestId, baseUrl }) {
    try {
      if (!['simulation', 'paypal_sandbox'].includes(mode)) throw new PolicyError('INVALID_MODE', 'Unknown checkout mode', 400);
      const gateway = this.#gateway(mode);
      let result;
      let status = 200;
      if (path === '/api/health' && method === 'GET') {
        return { status: gateway.storageHealthy ? 200 : 503, body: {
          ok: gateway.storageHealthy, demoOnly: true, hosted: true, sourceCommit: this.env.SOURCE_COMMIT ?? null, store: gateway.store.kind,
          aiConfigured: Boolean(gateway.ai?.isConfigured()), aiModel: gateway.ai?.model ?? null, freeOnly: true,
          paypalConfigured: mode === 'paypal_sandbox' && gateway.payments.isConfigured(),
          checkoutMode: mode, checkoutConfigured: gateway.storageHealthy && gateway.payments.isConfigured()
        } };
      }
      if (path === '/api/intents' && method === 'POST') {
        if (gateway.intents.size >= 50) throw new PolicyError('SESSION_LIMIT', 'This session has reached its purchase limit', 429);
        result = gateway.createIntent(body); status = 201;
      } else {
        const match = path.match(/^\/api\/intents\/([0-9a-fA-F-]{36})(?:\/(rounds|recommend|checkout|capture|reconcile|simulation-approval))?$/);
        if (!match) throw new PolicyError('NOT_FOUND', 'Route not found', 404);
        const [, id, action] = match;
        if (method === 'GET' && !action) result = gateway.getIntent(id);
        else if (action === 'simulation-approval' && mode === 'simulation' && ['GET', 'POST'].includes(method)) {
          const view = gateway.getIntent(id), box = view.checkout;
          if (!box?.orderId) throw new PolicyError('INVALID_STATE', 'Create a simulated order first');
          if (method === 'POST') {
            if (view.state !== 'AWAITING_BUYER_APPROVAL') throw new PolicyError('INVALID_STATE', 'Simulated approval cannot change this checkout');
            if (body?.orderId !== box.orderId) throw new PolicyError('ORDER_MISMATCH', 'Order does not match the locked checkout');
            if (Date.now() >= Date.parse(view.expiresAt)) throw new PolicyError('MANDATE_EXPIRED', 'Mandate expired');
            await gateway.payments.approveOrder(box.orderId);
          }
          const order = await gateway.payments.getOrder(box.orderId);
          result = { mode, intentId: id, orderId: box.orderId, orderStatus: order.status,
            amountMinor: box.amountMinor, currency: box.currency, item: view.mandate.item, quantity: view.mandate.quantity,
            merchantName: view.offers.find(offer => offer.offerId === box.offerId)?.merchantName, expiresAt: view.expiresAt };
        } else if (method !== 'POST' || !action) throw new PolicyError('METHOD_NOT_ALLOWED', 'Unsupported method', 405);
        else if (action === 'rounds') result = await gateway.runRound(id, requestId);
        else if (action === 'recommend') result = await gateway.recommend(id);
        else if (action === 'checkout') result = await gateway.createCheckout(id, body?.offerId, baseUrl);
        else if (action === 'capture') result = await gateway.captureCheckout(id, body?.orderId);
        else if (action === 'reconcile') result = await gateway.reconcileCheckout(id);
        else throw new PolicyError('NOT_FOUND', 'Route not found', 404);
      }
      // Translate the simulator's internal relative approval route into its hosted UI path.
      if (mode === 'simulation' && result.checkout?.approveUrl) result = { ...result,
        checkout: { ...result.checkout, approveUrl: '/demo' + result.checkout.approveUrl } };
      return { status, body: result };
    } catch (error) {
      const response = failure(error);
      return { status: response.status, body: await response.json() };
    }
  }
}

async function consume(env, name, category) {
  const result = await env.LIMITS.getByName(name).consume(category);
  if (!result.success) return json(429, { error: { code: 'RATE_LIMITED',
    message: 'Testing limit reached. Retry after the indicated delay; do not retry an uncertain payment.' } },
  { 'Retry-After': String(result.retryAfter) });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const origin = new URL(env.PUBLIC_ORIGIN).origin;
      if (url.origin !== origin) throw new PolicyError('FORBIDDEN_HOST', 'Use the configured Vowrail website', 403);
      if (url.pathname === '/demo') return new Response(null, { status: 302, headers: { ...SECURITY_HEADERS, Location: '/demo/' } });
      if (ASSETS.has(url.pathname) && ['GET', 'HEAD'].includes(request.method)) {
        const asset = await env.ASSETS.fetch(new Request(origin + ASSETS.get(url.pathname), { method: request.method }));
        const headers = new Headers(asset.headers);
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
        return new Response(asset.body, { status: asset.status, headers });
      }
      const simulation = url.pathname.startsWith('/demo/api/');
      const path = simulation ? url.pathname.slice(5) : url.pathname;
      const mode = simulation ? 'simulation' : 'paypal_sandbox';
      if (!path.startsWith('/api/')) return json(404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
      if (request.headers.has('Origin') && request.headers.get('Origin') !== origin) throw new PolicyError('FORBIDDEN_ORIGIN', 'Cross-origin API requests are blocked', 403);
      if (request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new PolicyError('FORBIDDEN_ORIGIN', 'Cross-site API requests are blocked', 403);
      if (!['GET', 'POST'].includes(request.method)) return json(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Unsupported method' } });
      const ip = await sign(env.SESSION_SECRET, 'ip:' + (request.headers.get('CF-Connecting-IP') || 'unknown'));
      if (!(await env.API_RATE.limit({ key: 'vowrail:' + ip })).success) return json(429,
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a minute before trying again.' } }, { 'Retry-After': '60' });
      let session = await readSession(request.headers.get('Cookie'), env.SESSION_SECRET);
      let created = false;
      if (!session) {
        if (path !== '/api/health' || request.method !== 'GET') throw new PolicyError('SESSION_REQUIRED', 'Open Vowrail to start a private testing session', 401);
        if (request.headers.has('Origin') && request.headers.get('Origin') !== origin) throw new PolicyError('FORBIDDEN_ORIGIN', 'Cross-origin sessions are blocked', 403);
        const blocked = await consume(env, ip, 'session'); if (blocked) return blocked;
        session = await newSession(env.SESSION_SECRET); created = true;
      }
      let body;
      if (request.method === 'POST') {
        await checkMutation(request, origin, session, env.SESSION_SECRET);
        const expectedMode = request.headers.get('X-Vowrail-Checkout-Mode');
        if (expectedMode && expectedMode !== mode) throw new PolicyError('CHECKOUT_MODE_MISMATCH', 'Checkout mode changed. Reload before continuing.');
        body = await readHostedJSON(request);
        const category = path === '/api/intents' ? 'create' : !simulation && path.endsWith('/recommend') ? 'advice'
          : !simulation && /\/(checkout|capture|reconcile)$/.test(path) ? 'provider' : 'write';
        const blocked = await consume(env, ip, category); if (blocked) return blocked;
        if (category === 'advice' && env.OPENROUTER_API_KEY) {
          const exhausted = await consume(env, 'global-free-model-budget', 'globalAdvice'); if (exhausted) return exhausted;
        }
      }
      const result = await env.SESSIONS.getByName(session.id).handle({ mode, method: request.method,
        path, body, baseUrl: origin, requestId: request.headers.get('Idempotency-Key') });
      const value = path === '/api/health' && result.status === 200 ? { ...result.body,
        csrfToken: await csrfToken(session, env.SESSION_SECRET) } : result.body;
      return json(result.status, value, created ? { 'Set-Cookie': sessionCookie(session) } : {});
    } catch (error) { return failure(error); }
  }
};
