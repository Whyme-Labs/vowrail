import { randomUUID } from 'node:crypto';

export class PolicyError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'PolicyError';
    this.code = code;
    this.status = status;
  }
}

const bounded = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;
const validText = (value, low, high) => typeof value === 'string' && value.trim().length >= low && value.trim().length <= high;
export const moneyToDecimal = minor => {
  if (!bounded(minor, 0, 1000000000)) throw new PolicyError('INVALID_AMOUNT', 'Amount must be an integer in USD cents', 400);
  return (minor / 100).toFixed(2);
};
export const decimalToMinor = value => {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,6})\.[0-9]{2}$/.test(value)) {
    throw new PolicyError('INVALID_PROVIDER_AMOUNT', 'Provider returned an invalid price');
  }
  const minor = Number(value.replace('.', ''));
  if (!bounded(minor, 0, 1000000000)) throw new PolicyError('INVALID_PROVIDER_AMOUNT', 'Provider amount exceeds limit');
  return minor;
};
const assert = (condition, code, message, status = 409) => {
  if (!condition) throw new PolicyError(code, message, status);
};
const toError = error => error instanceof PolicyError ? error : new PolicyError('INTEGRATION_ERROR', 'External integration failed', 502);

/**
 * A deliberately local-only reference monitor. All state mutations before an
 * external await are synchronous in one Node process. There is no durable
 * multi-instance guarantee, buyer authentication or production payment safety.
 */
export class NegotiationGateway {
  constructor({ merchants, payments, ai = null, now = () => Date.now(), id = randomUUID } = {}) {
    this.intents = new Map();
    this.merchants = Array.isArray(merchants) ? merchants : [];
    this.payments = payments;
    this.ai = ai;
    this.now = now;
    this.id = id;
  }

  createIntent(input) {
    assert(input && typeof input === 'object' && !Array.isArray(input), 'INVALID_MANDATE', 'Mandate must be an object', 400);
    const item = input.item;
    const quantity = input.quantity;
    const requirements = input.requirements ?? '';
    const maxRounds = input.maxRounds ?? 2;
    const maxTotalMinor = input.maxTotalMinor;
    const currency = input.currency ?? 'USD';
    assert(validText(item, 3, 120), 'INVALID_ITEM', 'Item must contain 3 to 120 characters', 400);
    assert(bounded(quantity, 1, 10000), 'INVALID_QUANTITY', 'Quantity must be a positive safe integer <= 10000', 400);
    assert(typeof requirements === 'string' && requirements.length <= 280, 'INVALID_REQUIREMENTS', 'Requirements must be <= 280 characters', 400);
    assert(currency === 'USD', 'UNSUPPORTED_CURRENCY', 'Demo supports USD only', 400);
    assert(bounded(maxTotalMinor, 1, 1000000000), 'INVALID_BUDGET', 'Max spend must be positive integer cents', 400);
    assert(bounded(maxRounds, 0, 2), 'INVALID_ROUND_LIMIT', 'Demo mandate allows 0, 1, or 2 rounds', 400);
    const intentId = this.id();
    const intent = {
      intentId,
      mandate: Object.freeze({ item: item.trim(), quantity, requirements: requirements.trim(), currency, maxTotalMinor, maxRounds }),
      createdAt: this.now(),
      expiresAt: this.now() + 30 * 60 * 1000,
      state: 'OPEN',
      round: 0,
      offers: [],
      events: [],
      checkout: null,
      roundRequests: new Map()
    };
    this.intents.set(intentId, intent);
    this._event(intent, 'mandate.created', { maxRounds });
    return this.getIntent(intentId);
  }

  _intent(intentId) {
    const intent = this.intents.get(intentId);
    assert(intent, 'INTENT_NOT_FOUND', 'Purchase intent not found', 404);
    return intent;
  }

  _event(intent, type, details = {}) {
    intent.events.push({ sequence: intent.events.length + 1, at: new Date(this.now()).toISOString(), type, ...details });
  }

  getIntent(intentId) {
    const intent = this._intent(intentId);
    return {
      intentId: intent.intentId,
      // Buyer view only. No auth exists in this local demo, so never expose publicly.
      mandate: { ...intent.mandate },
      createdAt: new Date(intent.createdAt).toISOString(),
      expiresAt: new Date(intent.expiresAt).toISOString(),
      state: intent.state,
      round: intent.round,
      offers: intent.offers.map(({ offerId, merchantId, merchantName, round, amountMinor, currency, description, deliveryDays, validUntil }) =>
        ({ offerId, merchantId, merchantName, round, amountMinor, currency, description, deliveryDays, validUntil })),
      checkout: intent.checkout ? { ...intent.checkout } : null,
      events: [...intent.events]
    };
  }

  publicMerchantRequest(intentId, round) {
    const intent = this._intent(intentId);
    assert(bounded(round, 1, intent.mandate.maxRounds), 'INVALID_ROUND', 'Round outside authorized mandate', 400);
    const { item, quantity, requirements } = intent.mandate;
    return Object.freeze({ intentId, round, item, quantity, requirements });
  }

  /** Idempotency key applies to a single round request, not to a model's messages. */
  runRound(intentId, idempotencyKey) {
    const intent = this._intent(intentId);
    assert(typeof idempotencyKey === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKey),
      'INVALID_IDEMPOTENCY_KEY', 'Provide an 8-80 character Idempotency-Key', 400);
    if (intent.roundRequests.has(idempotencyKey)) return intent.roundRequests.get(idempotencyKey);
    assert(intent.state === 'OPEN', 'INVALID_STATE', 'Negotiation is not open');
    assert(this.now() < intent.expiresAt, 'MANDATE_EXPIRED', 'Mandate expired');
    assert(intent.round < intent.mandate.maxRounds, 'ROUND_LIMIT', 'Authorized negotiation rounds exhausted');
    // Reserve synchronously BEFORE awaiting any merchant or agent.
    intent.round += 1;
    const round = intent.round;
    intent.state = 'ROUND_IN_PROGRESS';
    this._event(intent, 'round.started', { round });
    const operation = this._collectRound(intent, round);
    intent.roundRequests.set(idempotencyKey, operation);
    return operation;
  }

  async _collectRound(intent, round) {
    const request = this.publicMerchantRequest(intent.intentId, round);
    // Every merchant receives the same minimal request; no competing offers or private ceiling.
    const responses = await Promise.allSettled(this.merchants.map(merchant =>
      Promise.resolve().then(() => merchant.quote({ ...request }))));
    responses.forEach((response, i) => {
      const merchant = this.merchants[i];
      try {
        if (response.status === 'rejected') throw response.reason;
        const quote = response.value;
        assert(quote && typeof quote === 'object' && !Array.isArray(quote), 'BAD_OFFER', 'Malformed merchant quote');
        assert(bounded(quote.amountMinor, 1, 1000000000), 'BAD_OFFER', 'Merchant amount must be positive integer cents');
        assert(quote.currency === 'USD', 'BAD_OFFER', 'Merchant currency mismatch');
        assert(validText(quote.description, 1, 200), 'BAD_OFFER', 'Missing or invalid offer terms');
        assert(bounded(quote.deliveryDays, 0, 365), 'BAD_OFFER', 'Missing or invalid delivery terms');
        const normalized = {
          offerId: this.id(),
          merchantId: merchant.id,
          merchantName: merchant.name,
          round,
          amountMinor: quote.amountMinor,
          currency: quote.currency,
          description: quote.description,
          deliveryDays: quote.deliveryDays,
          validUntil: new Date(this.now() + 10 * 60 * 1000).toISOString()
        };
        intent.offers.push(normalized);
        this._event(intent, 'offer.accepted', { round, merchantId: merchant.id, offerId: normalized.offerId, amountMinor: normalized.amountMinor });
      } catch (error) {
        this._event(intent, 'offer.rejected', { round, merchantId: merchant.id, reason: error instanceof PolicyError ? error.code : 'MERCHANT_UNAVAILABLE' });
      }
    });
    intent.state = 'OPEN';
    this._event(intent, 'round.completed', { round, offerCount: intent.offers.filter(o => o.round === round).length });
    return this.getIntent(intent.intentId);
  }

  eligibleOffers(intentId) {
    const intent = this._intent(intentId);
    return intent.offers.filter(o => o.currency === intent.mandate.currency
      && o.amountMinor <= intent.mandate.maxTotalMinor && Date.parse(o.validUntil) > this.now());
  }

  async recommend(intentId) {
    const intent = this._intent(intentId);
    assert(intent.state === 'OPEN' && intent.round > 0, 'INVALID_STATE', 'Complete a round before requesting a recommendation');
    const eligible = this.eligibleOffers(intentId).sort((a, b) => a.amountMinor - b.amountMinor || a.merchantId.localeCompare(b.merchantId));
    assert(eligible.length > 0, 'NO_ELIGIBLE_OFFERS', 'No quotes satisfy the mandate');
    const baseline = { offerId: eligible[0].offerId, reason: 'Lowest eligible quoted amount; delivery and terms still require buyer review', mode: 'deterministic' };
    if (!this.ai?.isConfigured?.()) return baseline;
    try {
      const { item, quantity, requirements } = intent.mandate;
      const advice = await this.ai.recommend({ item, quantity, requirements, offers: eligible.map(o => ({
        offerId: o.offerId, merchantName: o.merchantName, amountMinor: o.amountMinor,
        currency: o.currency, deliveryDays: o.deliveryDays, description: o.description
      })) });
      const valid = eligible.some(o => o.offerId === advice?.offerId);
      return valid ? {
        offerId: advice.offerId, reason: typeof advice.reason === 'string' ? advice.reason.slice(0, 400) : 'Model recommended eligible offer',
        mode: 'ai_advisory'
      } : { ...baseline, reason: 'Model returned an invalid offer; using eligible lowest-price fallback' };
    } catch {
      return { ...baseline, reason: 'Model unavailable; using eligible lowest-price fallback' };
    }
  }

  async createCheckout(intentId, offerId, baseUrl) {
    const intent = this._intent(intentId);
    if (intent.state === 'AWAITING_BUYER_APPROVAL' && intent.checkout?.offerId === offerId) return this.getIntent(intentId);
    assert(intent.state === 'OPEN', 'INVALID_STATE', 'Cannot begin checkout in current state');
    assert(this.now() < intent.expiresAt, 'MANDATE_EXPIRED', 'Mandate expired');
    const offer = this.eligibleOffers(intentId).find(o => o.offerId === offerId);
    assert(offer, 'INVALID_OFFER', 'Offer unavailable, expired, or above authorized ceiling');
    assert(this.payments?.isConfigured?.(), 'PAYPAL_NOT_CONFIGURED', 'PayPal Sandbox credentials are required', 503);
    const publicOrigin = new URL(baseUrl);
    assert(publicOrigin.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(publicOrigin.hostname),
      'INVALID_PUBLIC_URL', 'Approval URL must use HTTPS or local loopback', 400);
    const redirect = new URL('/', publicOrigin);
    redirect.searchParams.set('intent', intentId);
    const cancel = new URL(redirect);
    cancel.searchParams.set('cancelled', '1');
    // Bind the offer/amount before the first awaited external operation.
    intent.state = 'CHECKOUT_CREATING';
    intent.checkout = {
      status: 'CREATING',
      offerId, amountMinor: offer.amountMinor, currency: offer.currency,
      requestId: 'vr-create-' + intentId, orderId: null, approveUrl: null,
      captureAttempted: false
    };
    this._event(intent, 'checkout.locked', { offerId, amountMinor: offer.amountMinor });
    try {
      const order = await this.payments.createOrder({
        intentId, amountMinor: offer.amountMinor, currency: offer.currency,
        returnUrl: redirect.toString(), cancelUrl: cancel.toString(),
        idempotencyKey: intent.checkout.requestId
      });
      assert(typeof order?.id === 'string' && /^[A-Za-z0-9_-]{4,80}$/.test(order.id) && typeof order.approveUrl === 'string',
        'INVALID_PAYPAL_RESPONSE', 'PayPal did not return an order and approval link', 502);
      // Retain the order reference for reconciliation even if its link is invalid.
      intent.checkout.orderId = order.id;
      const approval = new URL(order.approveUrl);
      assert(approval.protocol === 'https:' && ['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(approval.hostname)
        && !approval.username && !approval.password && !approval.port,
        'INVALID_PAYPAL_RESPONSE', 'Approval link must belong to PayPal Sandbox', 502);
      intent.checkout.approveUrl = order.approveUrl;
      intent.checkout.status = 'AWAITING_BUYER_APPROVAL';
      intent.state = 'AWAITING_BUYER_APPROVAL';
      this._event(intent, 'checkout.created', { orderId: order.id });
      return this.getIntent(intentId);
    } catch (error) {
      intent.checkout.status = 'RECONCILIATION_REQUIRED';
      intent.state = 'RECONCILIATION_REQUIRED';
      this._event(intent, 'checkout.uncertain', { stage: 'create' });
      throw toError(error);
    }
  }

  async captureCheckout(intentId, providedOrderId) {
    const intent = this._intent(intentId);
    const checkout = intent.checkout;
    assert(intent.state === 'AWAITING_BUYER_APPROVAL' || intent.state === 'COMPLETED',
      'INVALID_STATE', 'Order cannot be captured in current state');
    assert(typeof providedOrderId === 'string' && checkout.orderId === providedOrderId,
      'ORDER_MISMATCH', 'PayPal order ID does not match locked checkout');
    if (intent.state === 'COMPLETED') return this.getIntent(intentId);
    assert(this.now() < intent.expiresAt, 'MANDATE_EXPIRED', 'Mandate expired; only read-only reconciliation is allowed');
    intent.state = 'CAPTURE_IN_PROGRESS';
    checkout.status = 'CAPTURE_IN_PROGRESS';
    try {
      const order = await this.payments.getOrder(checkout.orderId);
      this._verifyOrder(intent, order);
      const captures = this._captures(order);
      if (order.status === 'COMPLETED' || captures.length > 0) {
        return this._completeCheckout(intent, order, 'order_read');
      }
      if (['CREATED', 'PAYER_ACTION_REQUIRED'].includes(order.status)) {
        intent.state = checkout.status = 'AWAITING_BUYER_APPROVAL';
        this._event(intent, 'checkout.approval_pending', { orderId: checkout.orderId });
        throw new PolicyError('ORDER_NOT_APPROVED', 'Approve the order in PayPal Sandbox before capture');
      }
      assert(order.status === 'APPROVED', 'ORDER_NOT_APPROVED', 'PayPal order has not been approved');
      // Recheck after the network read: an expired mandate cannot issue a capture.
      assert(this.now() < intent.expiresAt, 'MANDATE_EXPIRED', 'Mandate expired; only read-only reconciliation is allowed');
      checkout.captureAttempted = true;
      const captured = await this.payments.captureOrder(checkout.orderId, 'vr-capture-' + intentId);
      return this._completeCheckout(intent, captured, 'capture_response');
    } catch (error) {
      if (intent.state === 'AWAITING_BUYER_APPROVAL') throw toError(error);
      intent.state = 'RECONCILIATION_REQUIRED';
      checkout.status = 'RECONCILIATION_REQUIRED';
      this._event(intent, 'payment.uncertain', { stage: 'verify_or_capture' });
      throw toError(error);
    }
  }

  _verifyOrder(intent, order) {
    const checkout = intent.checkout;
    assert(order?.id === checkout.orderId && order.intent === 'CAPTURE'
      && Array.isArray(order.purchase_units) && order.purchase_units.length === 1
      && order.purchase_units[0]?.reference_id === intent.intentId,
      'ORDER_MISMATCH', 'PayPal order does not match the locked purchase intent');
    const amount = order.purchase_units[0].amount;
    assert(amount?.currency_code === checkout.currency && decimalToMinor(amount.value) === checkout.amountMinor,
      'AMOUNT_MISMATCH', 'PayPal order amount differs from the locked checkout');
  }

  _captures(order) {
    const captures = order?.purchase_units?.[0]?.payments?.captures;
    assert(captures === undefined || Array.isArray(captures), 'CAPTURE_MISMATCH', 'Invalid PayPal capture data');
    return captures ?? [];
  }

  _completeCheckout(intent, order, source) {
    const checkout = intent.checkout;
    this._verifyOrder(intent, order);
    const captures = this._captures(order);
    assert(order.status === 'COMPLETED'
      && captures.length === 1 && typeof captures[0]?.id === 'string' && /^[A-Za-z0-9_-]{4,80}$/.test(captures[0].id)
      && captures[0].status === 'COMPLETED'
      && captures[0].amount?.currency_code === checkout.currency
      && decimalToMinor(captures[0].amount.value) === checkout.amountMinor,
      'CAPTURE_MISMATCH', 'PayPal capture was not verified');
    intent.state = checkout.status = 'COMPLETED';
    checkout.captureId = captures[0].id;
    this._event(intent, 'payment.completed', {
      orderId: checkout.orderId, captureId: checkout.captureId, amountMinor: checkout.amountMinor, source
    });
    return this.getIntent(intent.intentId);
  }

  /** Read authoritative order data only. Never create or retry a capture here. */
  async reconcileCheckout(intentId) {
    const intent = this._intent(intentId);
    if (intent.state === 'COMPLETED') return this.getIntent(intentId);
    assert(['AWAITING_BUYER_APPROVAL', 'RECONCILIATION_REQUIRED'].includes(intent.state),
      'INVALID_STATE', 'Checkout cannot be reconciled in current state');
    const checkout = intent.checkout;
    assert(checkout?.orderId, 'ORDER_REFERENCE_UNAVAILABLE',
      'No known order ID; inspect the Sandbox dashboard before any further payment');
    intent.state = checkout.status = 'RECONCILIATION_IN_PROGRESS';
    this._event(intent, 'checkout.reconciliation_started', { orderId: checkout.orderId });
    try {
      const order = await this.payments.getOrder(checkout.orderId);
      this._verifyOrder(intent, order);
      const captures = this._captures(order);
      if (order.status === 'COMPLETED' || captures.length > 0) {
        return this._completeCheckout(intent, order, 'reconciliation');
      }
      const awaiting = ['CREATED', 'PAYER_ACTION_REQUIRED', 'APPROVED'].includes(order.status)
        && !checkout.captureAttempted;
      intent.state = checkout.status = awaiting ? 'AWAITING_BUYER_APPROVAL' : 'RECONCILIATION_REQUIRED';
      this._event(intent, 'checkout.reconciled', { result: awaiting ? 'AWAITING_BUYER_APPROVAL' : 'UNRESOLVED' });
      return this.getIntent(intentId);
    } catch (error) {
      intent.state = checkout.status = 'RECONCILIATION_REQUIRED';
      this._event(intent, 'checkout.reconciliation_failed', {
        reason: error instanceof PolicyError ? error.code : 'INTEGRATION_ERROR'
      });
      throw toError(error);
    }
  }
}
