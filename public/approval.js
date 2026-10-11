const $ = id => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const intentId = params.get('intent'), orderId = params.get('order');
let order = null;
let busy = false;
let approvalUncertain = false;
let expiryTimer;
const returnUrl = '/?intent=' + encodeURIComponent(intentId ?? '');
const path = '/api/intents/' + encodeURIComponent(intentId ?? '') + '/simulation-approval';
function message(text, error = false) {
  $('approval-notice').textContent = text;
  $('approval-notice').classList.toggle('error', error);
}
async function request(method = 'GET') {
  const response = await fetch(path, { method, headers: method === 'POST'
    ? { 'Content-Type': 'application/json', 'X-Vowrail-Checkout-Mode': 'simulation' } : {},
    ...(method === 'POST' ? { body: JSON.stringify({ orderId }) } : {}) });
  const data = await response.json();
  if (!response.ok) throw Error(data?.error?.message || 'Simulated approval unavailable');
  if (data.mode !== 'simulation' || data.intentId !== intentId || data.orderId !== orderId) throw Error('Simulated order reference does not match');
  return data;
}
function details() {
  const lines = [order.item + ' · Quantity ' + order.quantity, order.merchantName,
    'Locked total: ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.amountMinor / 100),
    'Simulated order: ' + order.orderId,
    'Status: ' + (approvalUncertain ? 'UNKNOWN — reload to check saved consent' : order.orderStatus)];
  $('approval-details').replaceChildren(...lines.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
}
function controls() {
  clearTimeout(expiryTimer);
  const expired = order && Date.parse(order.expiresAt) <= Date.now();
  const expiryFocus = expired && document.activeElement === $('approve-simulation');
  $('approve-simulation').disabled = busy || !order || expired || approvalUncertain || order.orderStatus !== 'PAYER_ACTION_REQUIRED';
  $('cancel-simulation').disabled = busy || !order;
  $('cancel-simulation').textContent = approvalUncertain || (order && order.orderStatus !== 'PAYER_ACTION_REQUIRED')
    ? 'Return to purchase' : 'Return without approving';
  if (expired && order.orderStatus === 'PAYER_ACTION_REQUIRED') message('Mandate expired. Simulated approval is blocked. Return to inspect the purchase.', true);
  if (expiryFocus) $('approval-notice').focus();
  if (order && !expired) expiryTimer = setTimeout(controls, Date.parse(order.expiresAt) - Date.now() + 1);
}
$('approval-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || $('approve-simulation').disabled) return;
  busy = true; controls();
  try {
    order = await request('POST');
    window.location.assign(returnUrl + '&simulatedApproval=1');
  } catch (error) {
    approvalUncertain = true;
    details();
    message(error.message + '. Simulated consent may already be recorded. Return to purchase or reload this page to check. No capture was requested.', true);
    $('approval-notice').focus();
  }
  finally { busy = false; controls(); }
});
$('cancel-simulation').addEventListener('click', () => {
  if (busy || !order) return;
  window.location.assign(returnUrl + (!approvalUncertain && order.orderStatus === 'PAYER_ACTION_REQUIRED' ? '&cancelled=1' : ''));
});
async function main() {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(intentId) || !/^SIMORDER_[0-9a-f]{32}$/i.test(orderId)) throw Error('Invalid simulated order reference');
    order = await request();
    details();
    message(order.orderStatus === 'PAYER_ACTION_REQUIRED' ? 'Review the locked amount. This is a local consent rehearsal, not a financial authorization.'
      : 'Approval or completion is already recorded in the local simulation. Return to the purchase.');
    controls(); $('approval-heading').focus();
  } catch (error) { message(error.message, true); controls(); $('approval-notice').focus(); }
}
main();
