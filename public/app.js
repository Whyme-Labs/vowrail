const $ = id => document.getElementById(id);
const format = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
let intent = null;
let health = null;
let busy = false;
const params = new URLSearchParams(window.location.search);

function notice(message, isError = false) {
  const box = $('notice');
  box.textContent = message;
  box.classList.toggle('error', isError);
}
async function request(path, method = 'GET', body = undefined, extra = {}) {
  const response = await fetch(path, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json', ...extra } : {},
    ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {})
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Request failed');
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}
async function perform(callback) {
  if (busy) return;
  busy = true;
  render();
  try {
    await callback();
  } catch (error) {
    notice((error.code ? error.code + ': ' : '') + error.message, true);
  } finally {
    busy = false;
    render();
  }
}
function node(tag, text, klass) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (klass) element.className = klass;
  return element;
}
function render() {
  $('empty-state').hidden = Boolean(intent);
  $('console').hidden = !intent;
  $('mandate-form').hidden = Boolean(intent);
  $('mandate-summary').hidden = !intent;
  if (!intent) return;
  const mandate = intent.mandate;
  const summary = $('mandate-summary');
  summary.replaceChildren(node('p', mandate.item + ', quantity ' + mandate.quantity),
    node('p', 'Private maximum: ' + format(mandate.maxTotalMinor)),
    node('p', 'Intent: ' + intent.intentId));
  $('round-display').textContent = intent.round + ' / ' + mandate.maxRounds;
  $('state-display').textContent = intent.state.replaceAll('_', ' ');
  $('run-round').disabled = busy || intent.state !== 'OPEN' || intent.round >= mandate.maxRounds;
  $('run-round').textContent = intent.round >= mandate.maxRounds ? 'Round cap reached. No further bargaining.' : 'Run next bidding round →';
  $('recommend').disabled = busy || intent.state !== 'OPEN' || intent.round === 0;
  const offers = $('offers');
  offers.replaceChildren();
  const latest = [...intent.offers].sort((a, b) => b.round - a.round || a.amountMinor - b.amountMinor);
  if (!latest.length) offers.append(node('p', intent.round === 0 ? 'Start round 1 to receive quotes.' : 'No valid merchant quotes.', 'hint'));
  for (const offer of latest) {
    const eligible = offer.amountMinor <= mandate.maxTotalMinor && Date.parse(offer.validUntil) > Date.now();
    const card = node('div', undefined, 'offer' + (eligible ? '' : ' ineligible'));
    const info = node('div');
    info.append(node('div', offer.merchantName, 'name'),
      node('small', offer.description), node('small', 'Delivery: ' + offer.deliveryDays + ' days; round ' + offer.round));
    const pricing = node('div');
    pricing.append(node('div', format(offer.amountMinor), 'price'),
      node('div', eligible ? 'Within mandate' : 'Above budget or expired', 'tag' + (eligible ? '' : ' warning')));
    const select = node('button', 'Checkout via PayPal Sandbox', 'pick');
    select.type = 'button';
    select.disabled = !eligible || intent.state !== 'OPEN' || busy || !health?.paypalConfigured;
    select.addEventListener('click', () => perform(async () => {
      intent = await request('/api/intents/' + intent.intentId + '/checkout', 'POST', { offerId: offer.offerId });
      notice('PayPal Sandbox order created. Approve it with a sandbox buyer account.');
    }));
    pricing.append(select);
    card.append(info, pricing);
    offers.append(card);
  }
  const payment = $('payment');
  payment.replaceChildren();
  if (intent.checkout) {
    const box = intent.checkout;
    payment.append(node('strong', 'PayPal Sandbox checkout: ' + box.status));
    payment.append(node('div', 'Selected total: ' + format(box.amountMinor)));
    if (box.approveUrl && box.status === 'AWAITING_BUYER_APPROVAL') {
      const anchor = node('a', 'Approve payment on PayPal Sandbox ↗', 'paypal-link');
      anchor.href = box.approveUrl; anchor.rel = 'noreferrer';
      payment.append(anchor);
      if (params.get('intent') === intent.intentId && params.get('cancelled') !== '1') {
        const capture = node('button', 'Verify approval and capture in Sandbox', 'secondary');
        capture.disabled = busy;
        capture.addEventListener('click', () => perform(async () => {
          intent = await request('/api/intents/' + intent.intentId + '/capture', 'POST', { orderId: box.orderId });
          notice('Verified PayPal Sandbox capture completed.');
        }));
        payment.append(capture);
      }
    }
    if (box.status === 'RECONCILIATION_REQUIRED') {
      payment.append(node('p', 'External payment result is uncertain. Do not retry checkout or capture. Reconcile in the Sandbox merchant dashboard.', 'tag warning'));
    }
  } else if (!health?.paypalConfigured) {
    payment.append(node('p', 'Configure PayPal Sandbox credentials in your local environment to enable checkout. No real money is used.', 'hint'));
  }
  const events = $('events');
  events.replaceChildren();
  for (const event of [...intent.events].reverse()) {
    const entry = node('li');
    const label = node('span');
    label.append(node('strong', event.type), node('span', ' · ' + [event.round != null ? 'round ' + event.round : null,
      event.reason, event.amountMinor != null ? format(event.amountMinor) : null].filter(Boolean).join(' / ')));
    entry.append(label, node('time', event.at.slice(11, 19) + ' UTC'));
    events.append(entry);
  }
}
$('mandate-form').addEventListener('submit', event => {
  event.preventDefault();
  perform(async () => {
    const rawBudget = $('budget').value.trim();
    if (!/^(0|[1-9][0-9]{0,6})(?:\.[0-9]{1,2})?$/.test(rawBudget)) {
      throw new Error('Budget must be valid USD with at most two decimal places.');
    }
    const [dollars, cents = ''] = rawBudget.split('.');
    const maxTotalMinor = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
    intent = await request('/api/intents', 'POST', {
      item: $('item').value, quantity: Number($('quantity').value), requirements: $('requirements').value,
      currency: 'USD', maxTotalMinor, maxRounds: Number($('rounds').value)
    });
    history.replaceState(null, '', '/?intent=' + encodeURIComponent(intent.intentId));
    notice('Mandate created. The private budget will not be sent to simulated merchants.');
  });
});
$('run-round').addEventListener('click', () => perform(async () => {
  intent = await request('/api/intents/' + intent.intentId + '/rounds', 'POST', {},
    { 'Idempotency-Key': crypto.randomUUID() });
  $('advice').replaceChildren();
  notice('Coordinated round ' + intent.round + ' completed. Each simulated merchant received only public requirements.');
}));
$('recommend').addEventListener('click', () => perform(async () => {
  const advice = await request('/api/intents/' + intent.intentId + '/recommend', 'POST');
  const offer = intent.offers.find(o => o.offerId === advice.offerId);
  $('advice').replaceChildren(node('strong', advice.mode === 'ai_advisory' ? 'Model advice' : 'Deterministic fallback'),
    node('p', (offer ? offer.merchantName + ': ' : '') + advice.reason));
}));
async function main() {
  try {
    health = await request('/api/health');
    const status = $('integration');
    const paypal = node('span', health.paypalConfigured ? '● PayPal Sandbox configured' : '○ PayPal Sandbox not configured',
      health.paypalConfigured ? 'yes' : 'no');
    const ai = node('span', health.aiConfigured ? '● Buyer model configured' : '○ Buyer model not configured; deterministic fallback',
      health.aiConfigured ? 'yes' : 'no');
    status.append(paypal, ai);
    const intentId = params.get('intent');
    if (intentId && /^[0-9a-fA-F-]{36}$/.test(intentId)) {
      try {
        intent = await request('/api/intents/' + intentId);
        if (params.get('cancelled') === '1') notice('PayPal approval was cancelled. No capture was requested.', true);
        else if (params.get('token')) notice('Returned from PayPal. Verify the order before completing capture.');
      } catch {
        notice('Intent unavailable, possibly due to a server restart. Do not retry any pending payment before reconciling.', true);
      }
    }
  } catch (error) {
    notice('Unable to connect to local Vowrail service: ' + error.message, true);
  }
  render();
}
main();
