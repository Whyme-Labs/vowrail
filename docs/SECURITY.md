# Threat model and verification plan

**Classification:** early contest demo, **NOT** production software. No live payments. Owner-configured Sandbox secrets stay in a private ignored environment file; none are included in source or evidence.

## Security objectives

S1: an agent, merchant or browser cannot cause an extra authorized bargaining round.

S2: a merchant integration does not receive a buyer's private spending cap directly.

S3: selecting or capturing a payment cannot exceed the mandate amount or change the currency or offer silently.

S4: uncertain payment outcomes cannot silently trigger duplicate capture.

S5: an untrusted response cannot take execution authority from the policy engine.

## Threat actors / trust assumptions

- Adversarial merchant returns malformed prices, prompt injection, requests for private ceiling, or a third round.
- Compromised or errant buyer LLM proposes policy-breaking behavior.
- Malicious HTTP client races requests, replays checkout or substitutes an offer ID.
- External payment provider times out after a request succeeds.
- Malicious operator who controls gateway code, model, logs and accounts is **outside** the scope of a process-local reference monitor. Independent authorization, audits and external evidence are needed to reduce operator risk.

Assume a trustworthy Node process and code, sandbox PayPal account, correct host, private local filesystem and no public-network deployment. There is no user authentication. The server's local journal persists synthetic buyer mandates, round replay records and payment references; it contains the private cap and must remain private.

## Required attack tests

The [Workers path](WORKERS.md) adds isolated anonymous session principals, signed secure cookies, per-intent ownership, session-bound CSRF, fixed host/Origin validation, bounded bodies, native and durable rate limits, private SQLite snapshots and secret-backed fixed provider routes. The Node server above remains a loopback-only development route. A stolen valid session cookie or malicious operator is still outside those session guarantees; the hosted demo is not production account authentication or live financial software.

| Test | Expected behavior |
|---|---|
| Third round when max is 2 | Reject with stable policy error; no merchant call |
| Two simultaneous round requests | Round reservation occurs before asynchronous calls; cannot create an extra round |
| Budget field in merchant request | Not present in serialized request |
| Seller asks for budget in output | Discard unrecognized content, never echo private cap |
| Negative/non-integer/too-large offer | Reject and record rejection without authorizing checkout |
| Wrong currency or offer ID | Reject checkout |
| Two checkout requests | Only one order is created; additional request conflicts or returns same locked order |
| Payment amount tampered client-side | Ignored; gateway uses stored validated amount |
| PayPal API unavailable | Never report payment complete |
| PayPal approval with changed amount/currency | Reject before capture and require reconciliation |
| Capture error or uncertain timeout | Mark reconciliation required, no blind retry |
| Lost capture response followed by order GET | Record one matching completed receipt, no second capture |
| Reconciliation returns APPROVED after a capture attempt | Remain locked for manual investigation |
| Order reference points at another intent | Reject before execution or recording completion |
| Mandate expires during approval/read | No new capture; read-only receipt recovery allowed |
| Live or untrusted approval link | Do not expose link; retain known order ID for reconciliation |
| Process killed during capture/reconciliation | Restore the durable attempt lock; recover only through authoritative order GET |
| Process killed during negotiation | Retain the consumed round and request key; do not rerun that request |
| Checkpoint failure or conflicting writer | Fail closed before the next external call; HTTP reports storage unavailable |
| Damaged latest journal record | Refuse startup; do not silently roll back to an older payment state |
| LLM selects nonexistent offer | Ignore/advisory failure, never payment authority |
| No credentials | Explicit simulator completes local rehearsal; default real adapter reports checkout unconfigured |
| Stale simulation tab posts to default adapter | Expected-mode mismatch rejects before mutation; header cannot select a mode |
| Simulated receipt loaded by PayPal runtime | Startup rejects incompatible checkout mode |
| Simulation approval for a different/expired order | Reject; approval cannot capture or alter the locked amount |

## Privacy caveat

Structured merchant requests reduce direct disclosure, but cannot eliminate inferences from product specificity, purchase timing, or acceptance decisions. An unconstrained model capable of arbitrary outbound text can covertly encode private information. For a stronger guarantee, isolate sensitive context from seller-facing components and use predetermined output serialization.

Remote AI providers receive data sent to their API. The initial AI adapter only needs the public requirements and normalized eligible offers.

Model requests use a 10-second abort deadline through response-body consumption. Timeout follows the existing rejected-bid or deterministic-advice fallback paths; it never adds a round, retries a model call or grants execution authority.

Model request bodies are limited to 8 KiB in UTF-8 and completions to 256 tokens. Oversized input fails before transport without truncating or dropping policy text; output limits do not grant payment authority. Price/billing checks and actual call authorization remain separate from these technical bounds.

## Payment caveats

- The selected simulated merchant is not a PayPal payee. Real payment is made only to the sandbox merchant configured in the app.
- A payment capture can be accepted by PayPal but response delivery can fail. Reconciliation must call the authoritative PayPal API, not infer failure from an HTTP timeout.
- The app now supports read-only reconciliation of a known order ID. It verifies the full locked amount and capture receipt and never retries an ambiguous capture. If the create response lost the order ID, manual dashboard inspection is required. OAuth/Orders HTTP requests are bounded to 10 seconds each.
- The local journal restores the order/intent mapping after process death. It cannot recover an order ID that was never returned or checkpointed, nor protect against deletion/rollback of the journal, filesystem loss, a malicious local operator or an unverified hosted deployment. Preserve all records; do not reset the directory to retry an uncertain payment.
- No authentic merchant quotes, dispute flows, refunds, chargebacks, tax calculation or comprehensive regulatory compliance in this prototype.
- A hosted version requires authentication, CSRF defense, origin/host validation, rate limits, durable state, structured logs without secrets, and signed merchant/issuer attestations.

## Responsible disclosure

For now use GitHub's private vulnerability reporting if enabled, or contact repository maintainers privately. Do not post credential dumps or security-sensitive proof-of-concepts in public issues.

## Verification evidence

Use `npm test`, `npm run test:coverage`, CI logs and separately documented PayPal Sandbox test receipts. Passing unit tests does not constitute a third-party certification.
