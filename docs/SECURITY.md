# Threat model and verification plan

**Classification:** early contest demo, **NOT** production software. No live payments or real secrets.

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

Assume a trustworthy Node process and code, sandbox PayPal account, correct host, and no public-network deployment. There is currently no user authentication and state is not persisted.

## Required attack tests

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
| LLM selects nonexistent offer | Ignore/advisory failure, never payment authority |
| No credentials | Demo works for negotiation, checkout reports unconfigured |

## Privacy caveat

Structured merchant requests reduce direct disclosure, but cannot eliminate inferences from product specificity, purchase timing, or acceptance decisions. An unconstrained model capable of arbitrary outbound text can covertly encode private information. For a stronger guarantee, isolate sensitive context from seller-facing components and use predetermined output serialization.

Remote AI providers receive data sent to their API. The initial AI adapter only needs the public requirements and normalized eligible offers.

## Payment caveats

- The selected simulated merchant is not a PayPal payee. Real payment is made only to the sandbox merchant configured in the app.
- A payment capture can be accepted by PayPal but response delivery can fail. Reconciliation must call the authoritative PayPal API, not infer failure from an HTTP timeout.
- Server restart loses the in-memory order/intent mapping. Therefore restart during a pending checkout is a **known severe demo limitation**. Do not use as a payment system.
- No authentic merchant quotes, dispute flows, refunds, chargebacks, tax calculation or comprehensive regulatory compliance in this prototype.
- A hosted version requires authentication, CSRF defense, origin/host validation, rate limits, durable state, structured logs without secrets, and signed merchant/issuer attestations.

## Responsible disclosure

For now use GitHub's private vulnerability reporting if enabled, or contact repository maintainers privately. Do not post credential dumps or security-sensitive proof-of-concepts in public issues.

## Verification evidence

Use `npm test`, `npm run test:coverage`, CI logs and separately documented PayPal Sandbox test receipts. Passing unit tests does not constitute a third-party certification.
