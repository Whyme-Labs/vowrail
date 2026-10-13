import { PolicyError } from './core.js';

export const COOKIE_NAME = '__Host-vowrail';
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), byte => parseInt(byte, 16));

async function key(secret) {
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 512) {
    throw new PolicyError('HOSTED_NOT_CONFIGURED', 'Hosted sessions are not configured', 503);
  }
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function sign(secret, value) {
  return hex(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(value)));
}

async function verify(secret, value, signature) {
  return typeof signature === 'string' && /^[0-9a-f]{64}$/.test(signature)
    && crypto.subtle.verify('HMAC', await key(secret), unhex(signature), encoder.encode(value));
}

export async function newSession(secret, now = Date.now()) {
  const payload = crypto.randomUUID() + '.' + now;
  return { id: payload.split('.')[0], issued: now, value: payload + '.' + await sign(secret, 'session:' + payload) };
}

export async function readSession(cookie, secret, now = Date.now()) {
  const values = (cookie || '').split(';').map(value => value.trim()).filter(value => value.startsWith(COOKIE_NAME + '='));
  if (values.length !== 1) return null;
  const value = values[0].slice(COOKIE_NAME.length + 1);
  const parts = value.split('.');
  if (parts.length !== 3 || !/^[0-9a-f-]{36}$/.test(parts[0]) || !/^[0-9]{13}$/.test(parts[1])) return null;
  const issued = Number(parts[1]);
  if (issued > now || now - issued >= SESSION_TTL || !await verify(secret, 'session:' + parts[0] + '.' + parts[1], parts[2])) return null;
  return { id: parts[0], issued, value };
}

export const sessionCookie = session => COOKIE_NAME + '=' + session.value
  + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + SESSION_TTL / 1000;

export const csrfToken = (session, secret) => sign(secret, 'csrf:' + session.id + '.' + session.issued);

export async function checkMutation(request, origin, session, secret) {
  if (request.headers.get('Origin') !== origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    throw new PolicyError('FORBIDDEN_ORIGIN', 'Use this website to change your purchase', 403);
  }
  if (!await verify(secret, 'csrf:' + session.id + '.' + session.issued, request.headers.get('X-Vowrail-CSRF'))) {
    throw new PolicyError('INVALID_CSRF', 'Refresh this page before changing your purchase', 403);
  }
}

export async function readHostedJSON(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) {
    throw new PolicyError('INVALID_CONTENT_TYPE', 'Expected application/json', 415);
  }
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 16384)) {
    throw new PolicyError('REQUEST_TOO_LARGE', 'Body exceeds 16 KiB', 413);
  }
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new PolicyError('REQUEST_TOO_LARGE', 'Body exceeds 16 KiB', 413);
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new PolicyError('INVALID_JSON', 'Invalid JSON body', 400); }
}

export const SECURITY_HEADERS = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};

/** Provider URLs are fixed; redirects must never forward an authorization header. */
export function providerFetch(fetchImpl = globalThis.fetch) {
  return (value, options = {}) => {
    const url = new URL(value);
    const sandbox = url.hostname === 'api-m.sandbox.paypal.com'
      && (url.pathname === '/v1/oauth2/token' || /^\/v2\/checkout\/orders(?:\/[A-Za-z0-9_-]{4,80}(?:\/capture)?)?$/.test(url.pathname));
    const freeModel = url.hostname === 'openrouter.ai' && url.pathname === '/api/v1/chat/completions';
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash || (!sandbox && !freeModel)) {
      throw new PolicyError('FORBIDDEN_PROVIDER', 'Provider route is not permitted', 503);
    }
    // Workers supports manual/follow, not redirect:error. Reject redirects explicitly.
    return Promise.resolve(fetchImpl.call(globalThis, url.toString(), { ...options, redirect: 'manual' })).then(async response => {
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        throw new PolicyError('FORBIDDEN_PROVIDER_REDIRECT', 'Provider redirects are not permitted', 502);
      }
      return response;
    });
  };
}
