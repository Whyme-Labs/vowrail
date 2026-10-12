# Architecture and trust boundaries

## Runtime slices

```text
Buyer browser (untrusted)
  | creates mandate, requests rounds, selects offer
  v
Local HTTP API (no auth, demo only, 127.0.0.1)
  | validated domain operations
  v
Vowrail policy engine <---- in-memory Map + local checkpoint journal
  | records mandatory state transitions and events
  |---> public request projection ---> scripted synthetic merchant adapters
  |<--- normalized and validated offers
  |---> eligible offer projection ---> optional LLM recommendation adapter
  |<--- advisory offer ID, validated by policy engine
  v
Checkout adapter ---> PayPal Sandbox OAuth -> Orders v2 -> buyer approval -> capture
```

Explicit `npm run demo` substitutes a local `SimulatedPayments` adapter and disables remote AI configuration. It provides a separate local consent page and persisted synthetic receipt so the full journey can be rehearsed without secrets. Default startup still selects only the real Sandbox adapter. Runtime mode is recorded on checkout, approval links are restricted by that mode, cross-mode journals fail startup, and the browser binds mutations to its observed mode. These controls prevent misleading simulator evidence or stale-tab actions; they do not authenticate a buyer. Both gateway and simulator journals are separate and must be preserved for recovery.

The browser **cannot** supply authoritative offer prices or payment amounts. Only server-owned accepted offers are eligible. Buyer selection does not override the mandate. A model's recommendation cannot modify state or grant authorization.

## Trust boundaries

T0: Buyer-input boundary: form values are untrusted; parse maximum spend as **integer minor units**, constrain length/type, reject unsupported currencies.

T1: Merchant boundary: project only `intentId`, round, item, quantity and whitelisted requirements. Never serialize a raw mandate or send private notes. A seller may infer urgency from a deadline, but cannot directly read the buyer's max budget from this request.

T2: Model boundary: only eligible normalized offers + public requirements go to the optional remote AI provider. The model returns a candidate ID and rationale; the engine validates the ID and continues independently. Rationale accuracy and interpretation of delivery requirements are not validated. The browser labels the explanation unverified, shows the stored quote separately and requires explicit buyer review. Remote-model provider sees those inputs, subject to its own data policy.

T3: Payment boundary: PayPal order is built from a stored validated offer and locked intent. The demo uses one PayPal Sandbox merchant account and payer approval. It does **not** settle to the three simulated merchants.

T4: Persistence boundary: the server checkpoints its existing Map representation into a local file journal before external operations and before returning successful transitions. Restart restores the mandate, rounds, replay results, offer lock, order/capture IDs and request IDs. Checkpoint or writer conflicts stop further operations. This is local recovery on a trusted filesystem, not a hosted or distributed datastore; see [LOCAL_JOURNAL.md](LOCAL_JOURNAL.md).

T5: Network boundary: this is a **local developer demo**. There is no login/tenant isolation, distributed anti-replay, production CSRF defense, rate limiting, or hardened secure hosting. Do not expose this server publicly.

## State machine

```text
OPEN (round 0)
  -> ROUND_IN_PROGRESS -> OPEN (round N) [N <= mandate.maxRounds]
  -> CHECKOUT_CREATING -> AWAITING_BUYER_APPROVAL -> CAPTURE_IN_PROGRESS
  -> COMPLETED
                                  \-> RECONCILIATION_REQUIRED
                                      -> RECONCILIATION_IN_PROGRESS [order GET only]
                                      -> COMPLETED [one matching completed capture]
```

A round is reserved **before** calling any merchant. If merchant communication fails, the already-started round still consumes the authorized slot; client retries cannot obtain extra turns. A second concurrent attempt during round execution is rejected.

Checkout reserves the transaction for one **selected normalized offer**. No new rounds or offer swaps once checkout starts. For uncertain PayPal errors, fail closed into reconciliation; never blindly initiate a second capture.

Read-only reconciliation checks the stored order reference against the locked intent and amount. A matching completed capture can recover the receipt after a response was lost. `captureAttempted` is checkpointed before the capture call and never cleared: even an `APPROVED` order cannot unlock another capture after an ambiguous attempt or restart. A failed order read before any capture can recover to buyer approval. Early approval checks preserve that approval state; execution requires an unexpired mandate both before and after the order read. The server retains these records locally across process restarts; direct gateway tests without a store still use memory.

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
