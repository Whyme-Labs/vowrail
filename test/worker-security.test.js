import test from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_NAME, SESSION_TTL, newSession, readSession, sessionCookie, csrfToken,
  checkMutation, readHostedJSON, providerFetch } from '../src/worker-security.js';

const secret = 'synthetic-session-signing-key-with-no-real-credentials';
const origin = 'https://vowrail.example';

test('hosted sessions reject forged, duplicate, expired and future cookies', async () => {
  const now = Date.now();
  const session = await newSession(secret, now);
  const cookie = COOKIE_NAME + '=' + session.value;
  assert.equal((await readSession(cookie, secret, now + 100)).id, session.id);
  for (const invalid of ['', cookie.replace(session.id, '11111111-1111-1111-1111-111111111111'),
    cookie + '; ' + cookie, cookie + '.extra']) assert.equal(await readSession(invalid, secret, now), null);
  assert.equal(await readSession(cookie, secret, now + SESSION_TTL), null);
  assert.equal(await readSession(cookie, secret, now - 1), null);
  assert.equal(await readSession(cookie, 'another-synthetic-key-of-sufficient-length', now), null);
  assert.match(sessionCookie(session), /Path=\/; HttpOnly; Secure; SameSite=Lax/);
  await assert.rejects(newSession('short'), error => error.code === 'HOSTED_NOT_CONFIGURED');
});

test('CSRF proof is bound to its session and requires the exact Origin', async () => {
  const a = await newSession(secret), b = await newSession(secret);
  const token = await csrfToken(a, secret);
  const request = headers => new Request(origin + '/api/intents', { method: 'POST', headers });
  await checkMutation(request({ Origin: origin, 'X-Vowrail-CSRF': token }), origin, a, secret);
  for (const headers of [{ Origin: 'https://other.example', 'X-Vowrail-CSRF': token },
    { 'X-Vowrail-CSRF': token }, { Origin: origin }, { Origin: origin, 'X-Vowrail-CSRF': token, 'Sec-Fetch-Site': 'cross-site' }]) {
    await assert.rejects(checkMutation(request(headers), origin, a, secret), error => error.status === 403);
  }
  await assert.rejects(checkMutation(request({ Origin: origin, 'X-Vowrail-CSRF': token }), origin, b, secret),
    error => error.code === 'INVALID_CSRF');
});

test('hosted JSON checks type, declared size and streamed size before parsing', async () => {
  const request = (body, headers = {}) => new Request(origin, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers }, body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}) });
  assert.deepEqual(await readHostedJSON(request('{"synthetic":true}')), { synthetic: true });
  await assert.rejects(readHostedJSON(request('{}', { 'Content-Type': 'text/plain' })), error => error.status === 415);
  await assert.rejects(readHostedJSON(request('{}', { 'Content-Length': '16385' })), error => error.status === 413);
  await assert.rejects(readHostedJSON(request('{broken')), error => error.status === 400);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(9000)); controller.enqueue(new Uint8Array(9000)); controller.close(); } });
  await assert.rejects(readHostedJSON(request(stream)), error => error.status === 413);
});

test('hosted provider egress rejects live PayPal, routers, credentials in URLs and redirects', async () => {
  const calls = [];
  const remote = providerFetch(async (url, options) => { calls.push({ url, options }); return new Response('{}'); });
  for (const url of ['https://api-m.paypal.com/v2/checkout/orders', 'https://other.example/api/v1/chat/completions',
    'http://openrouter.ai/api/v1/chat/completions', 'https://user:password@openrouter.ai/api/v1/chat/completions',
    'https://openrouter.ai/api/v1/chat/completions?redirect=1', 'https://api-m.sandbox.paypal.com/another-api']) {
    assert.throws(() => remote(url), error => error.code === 'FORBIDDEN_PROVIDER');
  }
  assert.equal(calls.length, 0);
  await remote('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', redirect: 'follow' });
  await remote('https://api-m.sandbox.paypal.com/v1/oauth2/token', { method: 'POST' });
  assert.ok(calls.every(call => call.options.redirect === 'manual'));
  const redirected = providerFetch(async () => new Response('redirect', { status: 302, headers: { Location: 'https://other.example/' } }));
  await assert.rejects(redirected('https://openrouter.ai/api/v1/chat/completions'), error => error.code === 'FORBIDDEN_PROVIDER_REDIRECT');
});
