const $ = id => document.getElementById(id);
const format = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
let intent = null;
let health = null;
let busy = false;
let stateUnavailable = false;
let selectedOfferId = null;
let expiryTimer;
const isSimulation = () => health?.checkoutMode === 'simulation';
const checkoutConfigured = () => Boolean(health?.checkoutConfigured ?? health?.paypalConfigured);
const params = new URLSearchParams(window.location.search);

function notice(message, isError = false) {
  const box = $('notice');
  box.textContent = message;
  box.classList.toggle('error', isError);
}
async function request(path, method = 'GET', body = undefined, extra = {}) {
  const response = await fetch(path, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json', ...extra,
      ...(health?.checkoutMode ? { 'X-Vowrail-Checkout-Mode': health.checkoutMode } : {}) } : {},
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
async function perform(callback, focusAfter) {
  if (busy) return;
  busy = true;
  render();
  let focusTarget = focusAfter;
  try {
    await callback();
    stateUnavailable = false;
  } catch (error) {
    focusTarget = 'notice';
    if (intent) {
      try {
        intent = await request('/api/intents/' + intent.intentId);
        stateUnavailable = false;
      } catch { stateUnavailable = true; }
    }
    notice((error.code ? error.code + ': ' : '') + error.message
      + (stateUnavailable ? ' Current gateway state unavailable. Refresh status before further execution.' : ''), true);
  } finally {
    busy = false;
    render();
    if (focusTarget) $(focusTarget).focus();
  }
}
function node(tag, text, klass) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (klass) element.className = klass;
  return element;
}
function offerBlockReason(offer) {
  if (Date.parse(intent.expiresAt) <= Date.now()) return 'Mandate expired. New execution is blocked.';
  if (offer.amountMinor > intent.mandate.maxTotalMinor) return 'Above budget by ' + format(offer.amountMinor - intent.mandate.maxTotalMinor);
  if (Date.parse(offer.validUntil) <= Date.now()) return 'Quote expired. Choose a current quote or start a new authorized round.';
  if (intent.state !== 'OPEN') return 'Checkout already started. The gateway has locked the selected offer.';
  return null;
}
function scheduleExpiry() {
  clearTimeout(expiryTimer);
  if (!intent) return;
  const next = [intent.expiresAt, ...intent.offers.map(o => o.validUntil)]
    .map(Date.parse).filter(time => time > Date.now()).sort((a, b) => a - b)[0];
  if (next) expiryTimer = setTimeout(render, next - Date.now() + 1);
}
function render() {
  const focused = document.activeElement;
  const replacedFocus = $('offers').contains(focused) ? 'offers-heading'
    : $('payment').contains(focused) ? 'payment' : null;
  scheduleExpiry();
  $('empty-state').hidden = Boolean(intent);
  $('console').hidden = !intent;
  $('mandate-form').hidden = Boolean(intent);
  $('mandate-summary').hidden = !intent;
  $('new-purchase').hidden = !intent;
  if (!intent) return;
  const mandate = intent.mandate;
  const expired = Date.parse(intent.expiresAt) <= Date.now();
  const summary = $('mandate-summary');
  summary.replaceChildren(node('p', mandate.item + ', quantity ' + mandate.quantity),
    node('p', 'Private maximum: ' + format(mandate.maxTotalMinor)),
    node('p', 'Intent: ' + intent.intentId),
    node('p', expired ? 'Mandate expired. Payment status can still be checked; new execution is blocked.'
      : 'Mandate expires at ' + new Date(intent.expiresAt).toLocaleTimeString(), expired ? 'tag warning' : 'hint'));
  $('round-display').textContent = intent.round + ' / ' + mandate.maxRounds;
  $('state-display').textContent = stateUnavailable ? 'STATUS UNAVAILABLE' : intent.state.replaceAll('_', ' ');
  $('refresh-status').disabled = busy;
  $('run-round').disabled = busy || stateUnavailable || expired || intent.state !== 'OPEN' || intent.round >= mandate.maxRounds;
  $('run-round').textContent = intent.round >= mandate.maxRounds ? 'Round cap reached. No further bargaining.' : 'Run next bidding round →';
  $('recommend').disabled = busy || stateUnavailable || expired || intent.state !== 'OPEN' || intent.round === 0;
  const offers = $('offers');
  offers.replaceChildren();
  const latest = [...intent.offers].sort((a, b) => b.round - a.round || a.amountMinor - b.amountMinor);
  if (!latest.length) offers.append(node('p', intent.round === 0 ? 'Start round 1 to receive quotes.' : 'No valid merchant quotes.', 'hint'));
  for (const offer of latest) {
    const blocked = offerBlockReason(offer);
    const eligible = !blocked;
    const card = node('div', undefined, 'offer' + (eligible ? '' : ' ineligible'));
    const info = node('div');
    info.append(node('div', offer.merchantName, 'name'),
      node('small', offer.description), node('small', 'Delivery: ' + offer.deliveryDays + ' days; round ' + offer.round));
    const pricing = node('div');
    pricing.append(node('div', format(offer.amountMinor), 'price'),
      node('div', blocked || 'Within mandate', 'tag' + (eligible ? '' : ' warning')));
    const select = node('button', offer.offerId === selectedOfferId ? 'Reviewing this offer' : 'Review offer', 'pick');
    select.setAttribute('aria-label', 'Review offer from ' + offer.merchantName + ', round ' + offer.round + ', ' + format(offer.amountMinor));
    select.type = 'button';
    select.disabled = !eligible || stateUnavailable || busy;
    select.addEventListener('click', () => {
      selectedOfferId = offer.offerId;
      render();
      $('review-heading').focus();
    });
    pricing.append(select);
    card.append(info, pricing);
    offers.append(card);
  }
  const selected = intent.offers.find(o => o.offerId === selectedOfferId);
  $('offer-review').hidden = !selected || Boolean(intent.checkout);
  if (selected && !intent.checkout) {
    $('review-details').replaceChildren(
      node('strong', selected.merchantName),
      node('p', mandate.item + ' · Quantity ' + mandate.quantity),
      node('p', 'Selected total: ' + format(selected.amountMinor) + ' USD · Remaining within private budget: '
        + format(mandate.maxTotalMinor - selected.amountMinor)),
      node('p', selected.description),
      node('p', 'Delivery: ' + selected.deliveryDays + ' days · Quote from round ' + selected.round),
      node('p', 'Quote expires at ' + new Date(selected.validUntil).toLocaleTimeString()),
      node('p', 'Simulated offer. Refund and tax rules are not supplied. '
        + (isSimulation() ? 'This rehearsal does not use PayPal.' : 'Sandbox checkout uses one configured demo merchant account.'), 'hint'));
    const reason = offerBlockReason(selected);
    $('review-message').textContent = reason || (stateUnavailable ? 'Gateway status unavailable. Refresh status before creating an order.'
      : !checkoutConfigured() ? 'PayPal Sandbox is not configured. You can review offers; order creation requires local Sandbox setup.'
        : isSimulation() ? 'Creating a simulated order locks this quote. Simulated buyer approval and capture are separate steps. No money moves.'
          : 'Creating an order locks this quote. Buyer approval and an explicit capture request are separate steps.');
    $('create-order').textContent = isSimulation() ? 'Create simulated order' : 'Create PayPal Sandbox order';
    $('create-order').disabled = busy || stateUnavailable || Boolean(reason) || !checkoutConfigured();
    $('clear-review').disabled = busy;
  }
  const payment = $('payment');
  payment.replaceChildren();
  if (intent.checkout) {
    const box = intent.checkout;
    const simulated = box.mode === 'simulation';
    payment.setAttribute('aria-label', simulated ? 'Local simulated checkout' : 'Sandbox checkout');
    payment.append(node('strong', (simulated ? 'Local simulated checkout: ' : 'PayPal Sandbox checkout: ') + box.status));
    if (simulated) payment.append(node('p', 'Not a PayPal transaction. No money moved.', 'hint'));
    payment.append(node('div', 'Selected total: ' + format(box.amountMinor)));
    if (box.orderId) payment.append(node('p', 'Order: ' + box.orderId, 'hint'));
    if (box.captureId) payment.append(node('p', (simulated ? 'Simulated receipt: ' : 'Verified capture: ') + box.captureId, 'hint'));
    if (box.approveUrl && box.status === 'AWAITING_BUYER_APPROVAL') {
      const anchor = node('a', simulated ? 'Open simulated buyer approval →' : 'Approve payment on PayPal Sandbox ↗', 'paypal-link');
      anchor.href = box.approveUrl; anchor.rel = 'noreferrer';
      payment.append(anchor);
    }
    if (box.orderId && box.status === 'AWAITING_BUYER_APPROVAL') {
      const capture = node('button', simulated ? 'Verify simulated approval and capture' : 'Verify approval and capture in Sandbox', 'secondary');
      capture.disabled = busy || stateUnavailable || expired;
      capture.addEventListener('click', () => perform(async () => {
        intent = await request('/api/intents/' + intent.intentId + '/capture', 'POST', { orderId: box.orderId });
        notice(simulated ? 'Simulated capture completed. No PayPal request or money movement.' : 'Verified PayPal Sandbox capture completed.');
      }, 'payment'));
      payment.append(capture);
    }
    if (box.orderId && ['AWAITING_BUYER_APPROVAL', 'RECONCILIATION_REQUIRED'].includes(box.status)) {
      const reconcile = node('button', simulated ? 'Check simulated receipt (read only)' : 'Check PayPal status (read only)', 'secondary');
      reconcile.disabled = busy;
      reconcile.addEventListener('click', () => perform(async () => {
        intent = await request('/api/intents/' + intent.intentId + '/reconcile', 'POST');
        notice(simulated ? (intent.state === 'COMPLETED' ? 'Existing simulated receipt recovered. No new capture was requested.'
          : 'Local simulated order checked. Approval and capture remain separate explicit actions.')
          : intent.state === 'COMPLETED' ? 'Existing PayPal Sandbox capture verified. No new payment was requested.'
          : intent.state === 'AWAITING_BUYER_APPROVAL' ? 'Order verified. Approve in Sandbox, then explicitly request capture.'
            : 'Outcome still uncertain. Capture remains blocked; inspect the Sandbox dashboard.', intent.state === 'RECONCILIATION_REQUIRED');
      }, 'payment'));
      payment.append(reconcile);
    }
    if (box.status === 'RECONCILIATION_REQUIRED') {
      payment.append(node('p', simulated ? 'Simulated response is uncertain. Check the local receipt without another capture.'
        : 'External payment result is uncertain. Check status without sending another capture. If unresolved, inspect the Sandbox merchant dashboard.', 'tag warning'));
    }
  } else if (!checkoutConfigured()) {
    payment.append(node('p', 'Configure PayPal Sandbox credentials in your local environment to enable checkout. No real money is used.', 'hint'));
  }
  const events = $('events');
  events.replaceChildren();
  for (const event of [...intent.events].reverse()) {
    const entry = node('li');
    const label = node('span');
    label.append(node('strong', event.type + (event.mode === 'simulation' ? ' (simulated)' : '')), node('span', ' · ' + [event.round != null ? 'round ' + event.round : null,
      event.reason, event.amountMinor != null ? format(event.amountMinor) : null].filter(Boolean).join(' / ')));
    entry.append(label, node('time', event.at.slice(11, 19) + ' UTC'));
    events.append(entry);
  }
  if (replacedFocus) $(replacedFocus).focus();
  else if (focused?.disabled) {
    if (focused === $('create-order')) $('review-heading').focus();
    else if (focused === $('run-round') || focused === $('recommend') || focused === $('refresh-status')) $('activity-heading').focus();
  }
}
$('clear-review').addEventListener('click', () => {
  if (busy) return;
  selectedOfferId = null;
  render();
  $('offers-heading').focus();
});
$('create-order').addEventListener('click', () => perform(async () => {
  const selected = intent.offers.find(o => o.offerId === selectedOfferId);
  const reason = selected && offerBlockReason(selected);
  if (!selected || reason || !checkoutConfigured() || stateUnavailable) throw new Error(reason || 'Offer is unavailable for checkout.');
  intent = await request('/api/intents/' + intent.intentId + '/checkout', 'POST', { offerId: selected.offerId });
  selectedOfferId = null;
  notice(isSimulation() ? 'Local simulated order created. Open simulated buyer approval, then explicitly request simulated capture. No PayPal calls.'
    : 'PayPal Sandbox order created for the reviewed quote. Approve it with a sandbox buyer account, then explicitly request capture.');
}, 'payment'));
$('mandate-form').addEventListener('submit', event => {
  event.preventDefault();
  return perform(async () => {
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
  }, 'activity-heading');
});
$('run-round').addEventListener('click', () => perform(async () => {
  intent = await request('/api/intents/' + intent.intentId + '/rounds', 'POST', {},
    { 'Idempotency-Key': crypto.randomUUID() });
  $('advice').replaceChildren();
  notice('Coordinated round ' + intent.round + ' completed. Each simulated merchant received only public requirements.');
}, 'offers-heading'));
$('refresh-status').addEventListener('click', () => perform(async () => {
  intent = await request('/api/intents/' + intent.intentId);
  notice('Current gateway state loaded. No payment was requested.');
}, 'activity-heading'));
$('recommend').addEventListener('click', () => perform(async () => {
  const advice = await request('/api/intents/' + intent.intentId + '/recommend', 'POST');
  const offer = intent.offers.find(o => o.offerId === advice.offerId);
  const modelAdvice = advice.mode === 'ai_advisory';
  const box = $('advice');
  box.replaceChildren(node('strong', modelAdvice ? 'Model suggestion' : 'Deterministic fallback'));
  if (modelAdvice) {
    box.append(node('p', offer ? offer.merchantName + ' · Stored quote: ' + format(offer.amountMinor)
      + ' USD · ' + offer.deliveryDays + '-day delivery estimate.' : 'Suggested quote is not loaded. Refresh status before choosing an offer.'),
      node('p', 'Unverified model explanation: ' + advice.reason),
      node('p', 'The explanation may contain price, delivery or unit errors. Compare stored quotes and confirm delivery meets your requirements before choosing an offer.'));
  } else box.append(node('p', (offer ? offer.merchantName + ': ' : '') + advice.reason));
  notice('Offer evaluation loaded. Advice does not authorize checkout.');
}, 'advice'));
async function main() {
  try {
    health = await request('/api/health');
    const status = $('integration');
    const paypal = node('span', isSimulation() ? '● Local checkout simulation · no PayPal connection'
      : health.paypalConfigured ? '● PayPal Sandbox configured' : '○ PayPal Sandbox not configured',
      isSimulation() || health.paypalConfigured ? 'yes' : 'no');
    const ai = node('span', health.aiConfigured ? '● Buyer model configured' : '○ Buyer model not configured; deterministic fallback',
      health.aiConfigured ? 'yes' : 'no');
    status.append(paypal, ai);
    $('simulation-banner').hidden = !isSimulation();
    if (isSimulation()) $('environment-label').textContent = 'LOCAL SIMULATION / NO PAYPAL';
    const intentId = params.get('intent');
    if (intentId && /^[0-9a-fA-F-]{36}$/.test(intentId)) {
      try {
        intent = await request('/api/intents/' + intentId);
        if (intent.state === 'COMPLETED') notice(isSimulation()
          ? 'Existing completed simulated receipt loaded. No new capture was requested. No PayPal calls.'
          : 'Existing completed Sandbox receipt loaded. No new capture was requested.');
        else if (intent.state === 'RECONCILIATION_REQUIRED') notice('Capture outcome requires read-only reconciliation. Do not capture again.', true);
        else if (params.get('cancelled') === '1') notice((isSimulation() ? 'Simulated' : 'PayPal') + ' approval was cancelled. No capture was requested.', true);
        else if (isSimulation() && params.get('simulatedApproval') === '1') notice('Returned from simulated approval. Capture still requires an explicit request. No PayPal calls.');
        else if (params.get('token')) notice('Returned from PayPal. Verify the order before completing capture.');
      } catch {
        notice('Intent unavailable. Preserve this intent reference and check the local gateway records before retrying any pending payment.', true);
      }
    }
  } catch (error) {
    notice('Unable to connect to local Vowrail service: ' + error.message, true);
  }
  render();
  if (intent && (params.get('cancelled') === '1' || params.get('token')
    || (isSimulation() && params.get('simulatedApproval') === '1'))) $('payment').focus();
}
main();
