# Product requirements (PRD)

**Version:** 0.1, 11 October 2026. **Audience:** engineers, judges, designers, security reviewers.

## Problem

Autonomous buying agents can inspect an individual's confidential requirements and negotiate with sellers. Prompt instructions alone cannot reliably prevent overspending, uncontrolled bargaining, unwanted disclosure, or unverified merchant claims. An agent may obtain an authorized price while still presenting biased options.

## Product thesis

Keep a buyer-controlled mandate and a deterministic execution gateway separate from probabilistic models. Provide a usable shopping and negotiation experience, observable enforcement evidence, and an adapter for PayPal Sandbox checkout.

## Personas

- Buyer: asks an agent to obtain a custom service, approves a maximum total amount, wants a fair comparison and control over disclosures.
- Merchant: receives a minimal request, responds with a price and explicit fulfillment terms, without access to the buyer's private ceiling.
- Developer: integrates different agent frameworks or merchants with a common gateway and independently testable policy.
- Evaluator: replays attacks and checks decisions from protocol events rather than trusting an LLM's justification.

## Competition MVP user journey

1. Buyer creates an intent for a standardized custom printing order. Enters buyer-controlled spending cap and maximum negotiation rounds (default 2).
2. Backend creates a mandate. Merchant adapters receive **only** public requirements. Sandbox catalog merchants are synthetic and identified as such.
3. Buyer runs round 1. Independent simulated sellers return comparable quotes, gateway validates and records them.
4. Optional round 2 permits one final quote update per seller. A third attempt is rejected even if requested by an agent.
5. An AI-based recommendation can assess the **eligible public offer set**, but the gate validates selection. A no-API fallback is a deterministic selector, clearly labelled.
6. User chooses a valid offer. With configured credentials, backend creates a **real PayPal Sandbox** order to the single configured demo merchant. Buyer is redirected for payer approval.
7. On return, the server independently retrieves the PayPal order and confirms approval and amount before capture; the sandbox capture result and policy event are shown.
8. UI displays reasons for denials and the event trail, with caveats that process memory is not tamper-resistant.

## Must-have functional requirements

- F01: create immutable mandate with unique intent ID, allowed currency, integer-minor-unit budget, expiry, approved round cap and public requirements.
- F02: never expose the private budget through merchant-facing payload construction, error responses, or offer generation.
- F03: count coordinated rounds per intent, reject attempts above mandate cap and reject attempts after checkout starts.
- F04: validate offer source, exact amount/currency, mandatory terms, identity and supported fields.
- F05: enforce price ceiling at selection and payment creation, not solely in model prompts.
- F06: actual PayPal Sandbox OAuth, create-order, buyer approval and capture with server-side verification.
- F07: allow only one active checkout for the demo intent; use stable idempotency identifiers and surface uncertain outcomes as requiring reconciliation.
- F08: demo UI with failure states, simulated seller disclosure, and evidence/event history.
- F09: adversarial deterministic tests and CI without private credentials.
- F10: fully documented local instructions so judges can reproduce the demo.

## Non-functional requirements

- No mandatory third-party npm dependencies to run the core local demo. Node >=22.
- Default HTTP binding 127.0.0.1, not public network; no live payment configuration.
- Per-intent business logic must be independently testable.
- Avoid storing real buyer PII, card details or free-form private conversation in this prototype.
- Transactions use integer minor units (USD in competition MVP), never binary floats for accounting.
- Explicit error codes for policy denials, unconfigured integrations and ambiguous external-payment states.
- Accessibility: semantic controls, labelled fields, keyboard usability, responsive layout.

## Explicit non-goals for hackathon MVP

- Real merchant onboarding, marketplace settlement, live payments or KYC.
- Guaranteed lowest available price, antitrust analysis or a universal fairness score.
- Production identity management, persistent audit ledgers, regulatory compliance certification.
- Cryptographic zero-knowledge negotiation or global round enforcement outside participating systems.
- Arbitrary products and currencies, dynamic tax/shipping, refunds or recurring billing.

## Measurable gates

- Unit tests show 100% rejection in scripted unauthorized-third-round, overspend, currency mismatch, duplicate checkout and budget-leak cases.
- Mock PayPal server test confirms actual create/capture HTTP requests, no live hostname and amount verification.
- Manual Sandbox test demonstrates an approved order and completed capture; document its timestamp and sanitized transaction reference.
- Compare matched scenarios with and without policy gate. Report real denominators and limitations, not marketing claims.
- Judge can start locally from README and interact with the complete flow.

## Open questions

- Which buyer-model provider and budget for the competition?
- Should hackathon deployment be local-only, or host a credential-isolated read-only demo?
- How will judges obtain a sandbox buyer account without distributing credentials publicly?
- Which merchant-facing data fields are essential for a future real partner?
