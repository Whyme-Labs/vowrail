# Architecture and trust boundaries

## Runtime slices

```text
Buyer browser (untrusted)
  | creates mandate, requests rounds, selects offer
  v
Local HTTP API (no auth, demo only, 127.0.0.1)
  | validated domain operations
  v
Vowrail policy engine <---- process-local intent store (temporary)
  | records mandatory state transitions and events
  |---> public request projection ---> scripted synthetic merchant adapters
  |<--- normalized and validated offers
  |---> eligible offer projection ---> optional LLM recommendation adapter
  |<--- advisory offer ID, validated by policy engine
  v
Checkout adapter ---> PayPal Sandbox OAuth -> Orders v2 -> buyer approval -> capture
```

The browser **cannot** supply authoritative offer prices or payment amounts. Only server-owned accepted offers are eligible. Buyer selection does not override the mandate. A model's recommendation cannot modify state or grant authorization.

## Trust boundaries

T0: Buyer-input boundary: form values are untrusted; parse maximum spend as **integer minor units**, constrain length/type, reject unsupported currencies.

T1: Merchant boundary: project only `intentId`, round, item, quantity and whitelisted requirements. Never serialize a raw mandate or send private notes. A seller may infer urgency from a deadline, but cannot directly read the buyer's max budget from this request.

T2: Model boundary: only eligible normalized offers + public requirements go to the optional remote AI provider. The model returns a candidate ID and rationale; the engine validates the ID and continues independently. Remote-model provider sees those inputs, subject to its own data policy.

T3: Payment boundary: PayPal order is built from a stored validated offer and locked intent. The demo uses one PayPal Sandbox merchant account and payer approval. It does **not** settle to the three simulated merchants.

T4: Persistence boundary: this initial implementation keeps all state in one Node process. JavaScript synchronous transitions are atomic against other handlers in that process, but **NOT durable or distributed**. A proper deployment needs a transactional datastore, leases, consistency rules, and order reconciliation.

T5: Network boundary: this is a **local developer demo**. There is no login/tenant isolation, distributed anti-replay, production CSRF defense, rate limiting, or hardened secure hosting. Do not expose this server publicly.

## State machine

```text
OPEN (round 0)
  -> ROUND_IN_PROGRESS -> OPEN (round N) [N <= mandate.maxRounds]
  -> CHECKOUT_CREATING -> AWAITING_BUYER_APPROVAL -> CAPTURE_IN_PROGRESS
  -> COMPLETED
                                  \-> RECONCILIATION_REQUIRED
```

A round is reserved **before** calling any merchant. If merchant communication fails, the already-started round still consumes the authorized slot; client retries cannot obtain extra turns. A second concurrent attempt during round execution is rejected.

Checkout reserves the transaction for one **selected normalized offer**. No new rounds or offer swaps once checkout starts. For uncertain PayPal errors, fail closed into reconciliation; never blindly initiate a second capture.

## Why one process first?

The contest needs a reproducible reference app, actual agent behavior and a real sandbox checkout. A distributed ledger or marketplace would add failure modes and delay validation. Transition to Durable Objects or transactional SQL when the locally validated protocol and payment adapter pass tests.

## Production target

An authenticated buyer principal owns the mandate. Every message carries signed/mTLS or equivalent sender identity plus `intent_id`, `round_id` and unique message ID. State changes use SERIALIZABLE transactions or comparable CAS semantics. A payment outbox handles recoverable external calls and reconciles webhook + API status. The buyer can obtain independently verifiable records from trusted execution and merchant/payment parties.

## Related specifications

- [RFC 9396, OAuth Rich Authorization Requests](https://www.rfc-editor.org/rfc/rfc9396)
- [RFC 9449, DPoP](https://www.rfc-editor.org/rfc/rfc9449)
- [AP2 specification](https://ap2-protocol.org/ap2/specification/)
- [PayPal Orders v2](https://developer.paypal.com/docs/api/orders/v2/)

These are informative references, **not** claims of existing interoperability.
