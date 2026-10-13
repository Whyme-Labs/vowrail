import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions, Request as RuntimeRequest } from 'miniflare';

const origin = 'https://vowrail.example';
const secret = 'synthetic-session-signing-key-not-a-real-secret';
let mf, directory, bundle, fixtureSource, sequence = 0;
async function fixture() { return (await mf.getDurableObjectNamespace('PROVIDER', 'fixture-provider')).getByName('synthetic'); }
async function providerRequests() { return (await fixture()).summary(); }

function options(publicOrigin = origin) {
  const common = {
    // Execute the exact Wrangler-compiled bytes without separate module-path resolution.
    script: bundle, modules: true,
    compatibilityDate: '2026-10-13', compatibilityFlags: ['nodejs_compat'],
    bindings: { PUBLIC_ORIGIN: publicOrigin, SESSION_SECRET: secret, PAYPAL_CLIENT_ID: 'synthetic-client',
      PAYPAL_CLIENT_SECRET: 'synthetic-secret', OPENROUTER_API_KEY: 'synthetic-key',
      OPENROUTER_MODEL: 'nvidia/nemotron-3.5-lightning:free' },
    outboundService: 'fixture-provider', stripCfConnectingIp: false,
    ratelimits: { API_RATE: { namespace_id: '818271001', simple: { limit: 120, period: 60 } } },
    assets: { directory: resolve('public'), binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true } }
  };
  return convertV4MiniflareOptions({
    // The loopback proxy must recognize the app Origin; the Worker still enforces its exact Origin/CSRF rules.
    upstream: origin, resourcePersistencePath: join(directory, 'state'), cf: false, telemetry: { enabled: false },
    workers: [
      { ...common, name: 'vowrail-runtime', durableObjects: {
        SESSIONS: { className: 'JudgeSession', useSQLite: true }, LIMITS: { className: 'RequestLimits', useSQLite: true } } },
      { ...common, name: 'second-edge', durableObjects: {
        SESSIONS: { className: 'JudgeSession', scriptName: 'vowrail-runtime', useSQLite: true },
        LIMITS: { className: 'RequestLimits', scriptName: 'vowrail-runtime', useSQLite: true } } },
      { name: 'fixture-provider', script: fixtureSource, modules: true, compatibilityDate: '2026-10-13',
        durableObjects: { PROVIDER: { className: 'ProviderFixture', useSQLite: true } } }
    ]
  });
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'vowrail-workers-'));
  const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
  for (const key of ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'OPENROUTER_API_KEY', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL']) delete env[key];
  await promisify(execFile)(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run',
    '--outdir', join(directory, 'bundle')], { env, timeout: 30000, maxBuffer: 1024 * 1024 });
  bundle = await readFile(join(directory, 'bundle', 'worker.js'), 'utf8');
  fixtureSource = await readFile(new URL('./provider-fixture.js', import.meta.url), 'utf8');
  mf = new Miniflare(options());
  await mf.ready;
});
after(async () => { try { if (mf) await mf.dispose(); } finally { if (directory) await rm(directory, { recursive: true, force: true }); } });

async function actor(simulation = false) {
  const ip = '192.0.2.' + ++sequence;
  const prefix = simulation ? '/demo' : '';
  const response = await mf.dispatchFetch(origin + prefix + '/api/health', { headers: { 'CF-Connecting-IP': ip } });
  assert.equal(response.status, 200, await response.clone().text());
  const health = await response.json();
  const cookie = response.headers.get('Set-Cookie')?.split(';')[0];
  assert.ok(cookie);
  return { ip, prefix, health, cookie };
}
async function call(actor, path, method = 'GET', body, extra = {}, edge) {
  const headers = { Cookie: actor.cookie, 'CF-Connecting-IP': actor.ip,
    ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json',
      'X-Vowrail-CSRF': actor.health.csrfToken, 'X-Vowrail-Checkout-Mode': actor.health.checkoutMode } : {}), ...extra };
  const url = origin + actor.prefix + path;
  const options = { method, headers, ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}) };
  return edge ? (await mf.getWorker(edge)).fetch(new RuntimeRequest(url, options)) : mf.dispatchFetch(url, options);
}
async function data(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text()); return response.json();
}
async function purchase(actor) {
  const intent = await data(await call(actor, '/api/intents', 'POST', {
    item: 'Synthetic matte printing', quantity: 100, requirements: 'Three days preferred.', maxTotalMinor: 22000, maxRounds: 2
  }), 201);
  const path = '/api/intents/' + intent.intentId;
  await data(await call(actor, path + '/rounds', 'POST', {}, { 'Idempotency-Key': 'worker-first-' + randomUUID() }));
  const view = await data(await call(actor, path + '/rounds', 'POST', {}, { 'Idempotency-Key': 'worker-second-' + randomUUID() }));
  return { path, view, offer: view.offers.find(offer => offer.round === 2 && offer.amountMinor === 20700) };
}
const captureCount = async () => (await providerRequests()).filter(request => request.path.endsWith('/capture')).length;

test('hosted assets have security headers and allow top-level return from PayPal', async () => {
  const response = await mf.dispatchFetch(origin + '/?intent=synthetic-return', { headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(response.status, 200, await response.clone().text());
  assert.match(await response.text(), /Create purchasing mandate/);
  assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await mf.dispatchFetch(origin + '/.env')).status, 404);
});

test('configured canonical host rejects a request reaching the wrong origin', async () => {
  await mf.setOptions(options('https://other.example'));
  const response = await mf.dispatchFetch(origin + '/');
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'FORBIDDEN_HOST');
  await mf.setOptions(options());
});

test('separate browser sessions cannot read, mutate or approve each other\'s purchases', async () => {
  const a = await actor(true), b = await actor(true);
  const { path, offer } = await purchase(a);
  for (const [route, method, body] of [[path, 'GET'], [path + '/checkout', 'POST', { offerId: offer.offerId }],
    [path + '/simulation-approval', 'GET'], [path + '/capture', 'POST', { orderId: 'forged' }]]) {
    const result = await data(await call(b, route, method, body), 404);
    assert.equal(result.error.code, 'INTENT_NOT_FOUND');
  }
});

test('missing sessions, forged cookies, missing CSRF and hostile Origin fail before mutation', async () => {
  const a = await actor(true);
  const payload = { item: 'Synthetic request', quantity: 1, maxTotalMinor: 22000 };
  assert.equal((await mf.dispatchFetch(origin + '/demo/api/intents', { method: 'POST' })).status, 401);
  assert.equal((await call(a, '/api/intents', 'POST', payload, { Cookie: '__Host-vowrail=forged' })).status, 401);
  assert.equal((await call(a, '/api/intents', 'POST', payload, { 'X-Vowrail-CSRF': '' })).status, 403);
  assert.equal((await call(a, '/api/intents', 'POST', payload, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await call(a, '/api/intents', 'POST', payload, { 'X-Vowrail-Checkout-Mode': 'paypal_sandbox' })).status, 409);
  assert.equal((await call(a, '/api/intents', 'POST', { ...payload, item: 'x'.repeat(17000) })).status, 413);
});

test('simulator completes stored-quote checkout and separate consent with zero provider calls', async () => {
  const before = (await providerRequests()).length;
  const a = await actor(true), { path, offer } = await purchase(a);
  assert.equal((await data(await call(a, path + '/rounds', 'POST', {}, { 'Idempotency-Key': 'third-round-attempt' }), 409)).error.code, 'ROUND_LIMIT');
  const advice = await data(await call(a, path + '/recommend', 'POST'));
  assert.equal(advice.mode, 'deterministic');
  const pending = await data(await call(a, path + '/checkout', 'POST', { offerId: offer.offerId, amountMinor: 1 }));
  assert.equal(pending.checkout.amountMinor, 20700);
  assert.match(pending.checkout.approveUrl, /^\/demo\/simulation\/approval\?/);
  const orderId = pending.checkout.orderId;
  assert.equal((await data(await call(a, path + '/capture', 'POST', { orderId }), 409)).error.code, 'ORDER_NOT_APPROVED');
  await data(await call(a, path + '/simulation-approval', 'POST', { orderId }));
  const completed = await data(await call(a, path + '/capture', 'POST', { orderId }));
  assert.equal(completed.state, 'COMPLETED');
  assert.equal((await data(await call(a, path + '/capture', 'POST', { orderId }))).checkout.captureId, completed.checkout.captureId);
  assert.equal((await providerRequests()).length, before);
});

test('free advisory uses only public offer data and cannot create or execute payment', async () => {
  const a = await actor(), { path } = await purchase(a);
  const beforeCaptures = await captureCount();
  const advice = await data(await call(a, path + '/recommend', 'POST'));
  assert.equal(advice.mode, 'ai_advisory');
  assert.equal((await data(await call(a, path))).state, 'OPEN');
  assert.equal(await captureCount(), beforeCaptures);
  assert.equal((await providerRequests()).at(-1).host, 'openrouter.ai');
});

test('two Worker instances share durable checkout and capture reservations', async () => {
  const a = await actor(), { path, offer } = await purchase(a);
  const createsBefore = (await providerRequests()).filter(request => request.path === '/v2/checkout/orders').length;
  const responses = await Promise.all([call(a, path + '/checkout', 'POST', { offerId: offer.offerId }),
    call(a, path + '/checkout', 'POST', { offerId: offer.offerId }, {}, 'second-edge')]);
  assert.ok(responses.every(response => [200, 409].includes(response.status)), JSON.stringify(await Promise.all(responses.map(async response =>
    ({ status: response.status, body: response.status === 200 ? null : await response.clone().text() })) )));
  const pending = await data(await call(a, path));
  assert.equal((await providerRequests()).filter(request => request.path === '/v2/checkout/orders').length, createsBefore + 1);
  await (await fixture()).approve(pending.checkout.orderId);
  const before = await captureCount();
  const captures = await Promise.all([call(a, path + '/capture', 'POST', { orderId: pending.checkout.orderId }),
    call(a, path + '/capture', 'POST', { orderId: pending.checkout.orderId }, {}, 'second-edge')]);
  assert.ok(captures.every(response => [200, 409].includes(response.status)));
  const completed = await data(await call(a, path));
  assert.equal(completed.state, 'COMPLETED');
  assert.equal(await captureCount(), before + 1);
});

test('lost capture response survives runtime restart and recovers through a read only order query', async () => {
  const a = await actor(), { path, offer } = await purchase(a);
  const pending = await data(await call(a, path + '/checkout', 'POST', { offerId: offer.offerId }));
  await (await fixture()).approve(pending.checkout.orderId);
  const before = await captureCount();
  await (await fixture()).loseNextCapture();
  assert.equal((await call(a, path + '/capture', 'POST', { orderId: pending.checkout.orderId })).status, 502);
  await mf.dispose(); mf = new Miniflare(options()); await mf.ready;
  assert.equal((await data(await call(a, path))).state, 'RECONCILIATION_REQUIRED');
  assert.equal((await call(a, path + '/capture', 'POST', { orderId: pending.checkout.orderId })).status, 409);
  assert.equal((await data(await call(a, path + '/reconcile', 'POST'))).state, 'COMPLETED');
  assert.equal(await captureCount(), before + 1);
});

test('amount tampering in authoritative provider data blocks capture', async () => {
  const a = await actor(), { path, offer } = await purchase(a);
  const pending = await data(await call(a, path + '/checkout', 'POST', { offerId: offer.offerId }));
  await (await fixture()).changeAmount(pending.checkout.orderId);
  const before = await captureCount();
  const response = await data(await call(a, path + '/capture', 'POST', { orderId: pending.checkout.orderId }), 409);
  assert.equal(response.error.code, 'AMOUNT_MISMATCH');
  assert.equal(await captureCount(), before);
});

test('native API limiter returns 429 and Retry-After', async () => {
  const a = await actor(true);
  let blocked;
  for (let index = 0; index < 125; index++) {
    const response = await call(a, '/api/health');
    if (response.status === 429) { blocked = response; break; }
  }
  assert.ok(blocked);
  assert.equal(blocked.headers.get('Retry-After'), '60');
});

test('strict advice limits are atomic and survive restart without resetting counters', async () => {
  const namespace = await mf.getDurableObjectNamespace('LIMITS', 'vowrail-runtime');
  const name = 'synthetic-strict-limit-' + randomUUID();
  const limits = namespace.getByName(name);
  const results = await Promise.all(Array.from({ length: 4 }, () => limits.consume('advice')));
  assert.equal(results.filter(result => result.success).length, 3);
  assert.ok(results.find(result => !result.success).retryAfter > 0);
  await mf.dispose(); mf = new Miniflare(options()); await mf.ready;
  const restored = (await mf.getDurableObjectNamespace('LIMITS', 'vowrail-runtime')).getByName(name);
  assert.equal((await restored.consume('advice')).success, false);
});
