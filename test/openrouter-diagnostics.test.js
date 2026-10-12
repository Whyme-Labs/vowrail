import test from 'node:test';
import assert from 'node:assert/strict';
import { rateDiagnostics } from '../scripts/openrouter-diagnostics.js';

test('rate diagnostics distinguishes platform counters from named provider capacity', () => {
  const platform = rateDiagnostics(429, new Headers({ 'X-RateLimit-Remaining': '0' }), { code: 429 });
  assert.equal(platform.scope, 'account_or_platform');
  assert.equal(rateDiagnostics(429, new Headers(), { metadata: { provider_name: 'Nvidia', provider_code: 429 } }).scope, 'provider');
  assert.equal(rateDiagnostics(429, new Headers(), {}).scope, 'unconfirmed');
});
test('retry timing honors seconds, HTTP date and later reset with a minimum backoff', () => {
  const now = Date.parse('2026-10-12T18:00:00Z');
  assert.equal(rateDiagnostics(429, new Headers({ 'Retry-After': '90' }), {}, now).retryDelayMs, 90000);
  assert.equal(rateDiagnostics(429, new Headers({ 'Retry-After': 'Mon, 12 Oct 2026 18:01:00 GMT' }), {}, now).retryDelayMs, 60000);
  assert.equal(rateDiagnostics(429, new Headers({ 'Retry-After': '1', 'X-RateLimit-Reset': String((now + 120000) / 1000) }), {}, now).retryDelayMs, 120000);
  assert.equal(rateDiagnostics(503, new Headers({ 'Retry-After': 'invalid' }), {}, now).retryDelayMs, 30000);
});
test('diagnostics redact secrets and omit raw provider errors and unrelated headers', () => {
  const out = rateDiagnostics(429, new Headers({ Authorization: 'Bearer synthetic-private-value', 'Set-Cookie': 'private', 'Retry-After': '2' }),
    { code: 429, message: 'Bearer secret-token sk-or-v1-synthetic-private-value person@example.com', metadata: { raw: 'private upstream payload', provider_name: 'Nvidia' } });
  const serialized = JSON.stringify(out);
  for (const text of ['secret-token', 'sk-or-v1-', 'person@example.com', 'private upstream', 'Set-Cookie', 'Authorization']) assert.equal(serialized.includes(text), false);
  assert.equal(out.scope, 'provider');
});
