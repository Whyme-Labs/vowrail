import { decimalToMinor, moneyToDecimal, PolicyError } from '../core.js';

const approvalLink = (intentId, orderId) => '/simulation/approval?intent=' + intentId + '&order=' + orderId;
const orderIdFor = intentId => 'SIMORDER_' + intentId.replaceAll('-', '');
const captureIdFor = intentId => 'SIMCAPTURE_' + intentId.replaceAll('-', '');

/** Local fixture, not PayPal. No fetch, OAuth, payer credentials or money movement. */
export class SimulatedPayments {
  get mode() { return 'simulation'; }
  constructor({ store = null, loseCaptureResponseOnce = false } = {}) {
    if (typeof loseCaptureResponseOnce !== 'boolean') throw Error('Invalid simulation fault option');
    if (store && store.collection !== 'orders') throw Error('Simulation needs its own orders journal');
    this.store = store;
    this.storageHealthy = true;
    this.loseCaptureResponseOnce = loseCaptureResponseOnce;
    this.captureCalls = 0;
    this.orders = new Map();
    for (const record of store?.load() ?? []) {
      if (!this._validRecord(record) || this.orders.has(record.order.id)) throw Error('Invalid simulated order; preserve the journal');
      this.orders.set(record.order.id, record);
    }
  }
  isConfigured() { return true; }
  _validRecord(record) {
    try {
      const order = record?.order;
      const unit = order?.purchase_units?.[0];
      const id = unit?.reference_id;
      const captures = unit?.payments?.captures;
      return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
        && order.id === orderIdFor(id) && order.intent === 'CAPTURE'
        && ['PAYER_ACTION_REQUIRED', 'APPROVED', 'COMPLETED'].includes(order.status)
        && order.purchase_units.length === 1 && unit.amount?.currency_code === 'USD'
        && decimalToMinor(unit.amount.value) > 0
        && record.requestId === 'vr-create-' + id
        && order.links?.length === 1 && order.links[0].rel === 'approve' && order.links[0].href === approvalLink(id, order.id)
        && (order.status === 'COMPLETED'
          ? record.captureRequestId === 'vr-capture-' + id && captures?.length === 1
            && captures[0].id === captureIdFor(id) && captures[0].status === 'COMPLETED'
            && captures[0].amount?.currency_code === 'USD' && captures[0].amount.value === unit.amount.value
          : record.captureRequestId === null && captures === undefined);
    } catch { return false; }
  }
  _assertStorage() {
    if (!this.storageHealthy) throw new PolicyError('SIMULATION_STORAGE_UNAVAILABLE', 'Simulated provider storage unavailable; preserve its journal', 503);
  }
  _persist() {
    this._assertStorage();
    try { this.store?.save([...this.orders.values()]); }
    catch { this.storageHealthy = false; this._assertStorage(); }
  }
  _order(orderId) {
    this._assertStorage();
    const record = this.orders.get(orderId);
    if (!record) throw new PolicyError('SIMULATED_ORDER_NOT_FOUND', 'Local simulated order is unavailable', 404);
    return record;
  }
  async createOrder({ intentId, amountMinor, currency, idempotencyKey }) {
    this._assertStorage();
    if (!/^[0-9a-f-]{36}$/i.test(intentId) || currency !== 'USD' || !Number.isSafeInteger(amountMinor)
      || amountMinor < 1 || idempotencyKey !== 'vr-create-' + intentId) {
      throw new PolicyError('INVALID_SIMULATED_ORDER', 'Invalid simulated order request', 400);
    }
    const id = orderIdFor(intentId);
    let record = this.orders.get(id);
    if (record && record.order.purchase_units[0].amount.value !== moneyToDecimal(amountMinor)) {
      throw new PolicyError('SIMULATION_MISMATCH', 'Simulated order is already bound to another amount');
    }
    if (!record) {
      record = { requestId: idempotencyKey, captureRequestId: null, order: {
        id, intent: 'CAPTURE', status: 'PAYER_ACTION_REQUIRED',
        purchase_units: [{ reference_id: intentId, amount: { currency_code: currency, value: moneyToDecimal(amountMinor) } }],
        links: [{ rel: 'approve', href: approvalLink(intentId, id) }]
      } };
      this.orders.set(id, record);
      this._persist();
    }
    return { id, approveUrl: record.order.links[0].href };
  }
  async getOrder(orderId) { return structuredClone(this._order(orderId).order); }
  async approveOrder(orderId) {
    const record = this._order(orderId);
    if (record.order.status === 'PAYER_ACTION_REQUIRED') {
      record.order.status = 'APPROVED'; this._persist();
    }
    return structuredClone(record.order);
  }
  async captureOrder(orderId, idempotencyKey) {
    const record = this._order(orderId), order = record.order;
    const id = order.purchase_units[0].reference_id;
    if (idempotencyKey !== 'vr-capture-' + id) throw new PolicyError('SIMULATION_MISMATCH', 'Invalid simulated capture key');
    if (order.status === 'COMPLETED') return structuredClone(order);
    if (order.status !== 'APPROVED') throw new PolicyError('ORDER_NOT_APPROVED', 'Simulated buyer approval is required');
    this.captureCalls++;
    order.status = 'COMPLETED';
    order.purchase_units[0].payments = { captures: [{ id: captureIdFor(id), status: 'COMPLETED', amount: { ...order.purchase_units[0].amount } }] };
    record.captureRequestId = idempotencyKey;
    this._persist();
    if (this.loseCaptureResponseOnce) {
      this.loseCaptureResponseOnce = false;
      throw new PolicyError('SIMULATED_RESPONSE_LOST', 'Simulated capture response lost. Check the local receipt; do not capture again.', 502);
    }
    return structuredClone(order);
  }
}
