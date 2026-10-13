const safeText = value => typeof value === 'string' ? value
  .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
  .replace(/\bsk-[A-Za-z0-9_-]+/g, '[redacted-key]')
  .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted-identifier]')
  .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]').slice(0, 600) : null;

/** Allowlisted error/rate metadata only. Never preserves raw provider payloads or headers. */
export function rateDiagnostics(status, headers, error, now = Date.now()) {
  const rateHeaders = Object.fromEntries(['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']
    .filter(key => headers.get(key) !== null).map(key => [key, safeText(headers.get(key))]));
  const metadata = Object.fromEntries(['error_type', 'provider_code', 'provider_name', 'limit_source', 'reason', 'remedy_hint', 'resets_at']
    .filter(key => error?.metadata?.[key] != null).map(key => [key, typeof error.metadata[key] === 'number'
      ? error.metadata[key] : safeText(error.metadata[key])]));
  const remaining = Number(rateHeaders['x-ratelimit-remaining']);
  const scope = [401, 402, 403].includes(status) || metadata.limit_source?.startsWith('openrouter_')
    || (status === 429 && rateHeaders['x-ratelimit-remaining'] != null && Number.isFinite(remaining) && remaining <= 0)
    ? 'account_or_platform' : metadata.provider_name || metadata.provider_code != null ? 'provider' : 'unconfirmed';
  const retry = rateHeaders['retry-after'];
  let delay = retry == null ? 0 : /^\d+(?:\.\d+)?$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - now;
  if (!Number.isFinite(delay) || delay < 0) delay = 0;
  for (const reset of [rateHeaders['x-ratelimit-reset'], metadata.resets_at]) {
    if (reset == null) continue;
    const numeric = Number(reset);
    const resetAt = Number.isFinite(numeric) && numeric > 1e9 ? numeric * (numeric < 1e12 ? 1000 : 1) : Date.parse(reset);
    if (Number.isFinite(resetAt)) delay = Math.max(delay, resetAt - now);
  }
  return { status, scope, rateHeaders, error: { code: typeof error?.code === 'number' ? error.code : status,
    message: safeText(error?.message), metadata },
    retryDelayMs: [429, 503].includes(status) ? Math.max(30000, Math.ceil(delay)) : null };
}
