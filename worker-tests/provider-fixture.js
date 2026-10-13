import { DurableObject } from 'cloudflare:workers';

// Test-only provider running inside workerd. Nothing here can reach a real provider.
export class ProviderFixture extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS calls (host TEXT, path TEXT, method TEXT)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS flags (key TEXT PRIMARY KEY, value TEXT)');
  }
  order(id) {
    const row = this.ctx.storage.sql.exec('SELECT data FROM orders WHERE id = ?', id).toArray()[0];
    if (!row) throw Error('Unknown fixture order');
    return JSON.parse(row.data);
  }
  save(order) {
    this.ctx.storage.sql.exec('INSERT INTO orders (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', order.id, JSON.stringify(order));
  }
  summary() { return this.ctx.storage.sql.exec('SELECT host, path, method FROM calls').toArray(); }
  approve(id) { const order = this.order(id); order.status = 'APPROVED'; this.save(order); }
  changeAmount(id) { const order = this.order(id); order.status = 'APPROVED'; order.purchase_units[0].amount.value = '1.00'; this.save(order); }
  loseNextCapture() { this.ctx.storage.sql.exec("INSERT OR REPLACE INTO flags (key, value) VALUES ('lose', '1')"); }
  respond({ url: value, method, body }) {
    const url = new URL(value);
    this.ctx.storage.sql.exec('INSERT INTO calls (host, path, method) VALUES (?, ?, ?)', url.hostname, url.pathname, method);
    if (url.hostname === 'openrouter.ai') {
      const prices = body.provider?.max_price;
      if (!body.model.endsWith(':free') || prices?.prompt !== 0 || prices?.completion !== 0 || prices?.request !== 0
        || body.provider.allow_fallbacks !== false) throw Error('Unsafe model route');
      const payload = JSON.parse(body.messages[1].content);
      if (Object.hasOwn(payload, 'maxTotalMinor')) throw Error('Private budget leaked');
      return { status: 200, body: { usage: { cost: 0 }, choices: [{ message: { content: JSON.stringify({
        offerId: payload.offers[0].offerId, reason: 'Synthetic free-model fixture.' }) } }] } };
    }
    if (url.hostname !== 'api-m.sandbox.paypal.com') throw Error('Forbidden fixture host');
    if (url.pathname === '/v1/oauth2/token') return { status: 200, body: { access_token: 'synthetic-token', expires_in: 3600 } };
    if (url.pathname === '/v2/checkout/orders' && method === 'POST') {
      if (new URL(body.payment_source.paypal.experience_context.return_url).origin !== 'https://vowrail.example') throw Error('Unsafe callback');
      const id = 'TESTORDER_' + crypto.randomUUID().replaceAll('-', '');
      const order = { id, status: 'PAYER_ACTION_REQUIRED', intent: 'CAPTURE', purchase_units: body.purchase_units,
        links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=' + id }] };
      this.save(order); return { status: 200, body: order };
    }
    const match = url.pathname.match(/^\/v2\/checkout\/orders\/(TESTORDER_[0-9a-f]{32})(\/capture)?$/);
    if (!match) throw Error('Unknown fixture route');
    const order = this.order(match[1]);
    if (match[2]) {
      if (method !== 'POST' || order.status !== 'APPROVED') throw Error('Duplicate or unapproved fixture capture');
      order.status = 'COMPLETED';
      order.purchase_units[0].payments = { captures: [{ id: 'TESTCAPTURE_' + crypto.randomUUID().replaceAll('-', ''),
        status: 'COMPLETED', amount: { ...order.purchase_units[0].amount } }] };
      this.save(order);
      if (this.ctx.storage.sql.exec("SELECT value FROM flags WHERE key = 'lose'").toArray().length) {
        this.ctx.storage.sql.exec("DELETE FROM flags WHERE key = 'lose'");
        return { status: 504, body: { error: 'Synthetic lost response' } };
      }
    }
    return { status: 200, body: order };
  }
}

export default {
  async fetch(request, env) {
    const json = request.method === 'POST' && request.headers.get('Content-Type')?.startsWith('application/json');
    const result = await env.PROVIDER.getByName('synthetic').respond({ url: request.url, method: request.method,
      body: json ? await request.json() : null });
    return Response.json(result.body, { status: result.status });
  }
};
