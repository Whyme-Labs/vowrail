# Factual project-description draft

Updated from verified observations on 13 October 2026 (MYT). Editable English copy for the existing draft; no entry or eligibility declaration has been submitted. Functional free-model advice is now observed; its quality and sample limits remain explicit.

## Project name

Vowrail

## Short description

AI negotiates. You stay in control. A deterministic gateway enforces private spending limits, bounded negotiation and explicit checkout permission.

## Inspiration

A shopping agent can recommend an offer, but a recommendation should not expand what its buyer authorized. We built a small executable boundary around purchase permission: a private mandate, a fixed negotiation allowance, validated offers and separate checkout actions.

## What it does

The buyer defines an item, quantity, private USD ceiling and maximum rounds. Three simulated sellers receive public requirements and return quotes. The gateway consumes rounds before requesting bids, retains valid earlier offers and blocks checkout above the ceiling. Advice is optional and cannot select an offer or authorize a payment.

The buyer reviews the stored amount, delivery and expiry before creating an order. Approval and capture remain separate. If a capture response is lost, an immutable attempt lock prevents another capture; read-only receipt reconciliation recovers a verified matching result.

The credential-free demo completes this journey using clearly labeled local approval and receipt simulation, with no PayPal/model requests or money movement. Separately, the Sandbox-only PayPal Orders v2 adapter completed one owner-authorized USD 207.00 synthetic print purchase. Independent API checks verified one matching completed capture; the Sandbox buyer dashboard confirmed completion, and restart restored the locked receipt after mandate expiry. The configured Sandbox merchant receives the payment; the three synthetic sellers are not PayPal payees. Actual OpenRouter Nvidia free-model advice now parsed successfully for delivery, ambiguous requirements and hostile merchant text. The gateway validated offered IDs and retained all execution authority. Eight cumulative requests include earlier rate failures and truncated outputs; six completed Nvidia responses reported USD 0. Rationale/units and ambiguity errors were observed, so buyer review remains necessary.

## How it is built

Node.js 22, native HTTP/fetch, plain HTML/CSS/JavaScript and no runtime npm dependencies. A deterministic state machine owns authorization; merchant content, browser inputs and model advice are untrusted. The server derives payment amounts from accepted offers rather than client amounts. A private local file journal persists mandates, consumed rounds, order references and capture-attempt locks across process restart.

## Evidence and limits

Actual Node tests cover policy, concurrency, malformed provider/model output, expiry, response loss, process termination and restart. A bounded HTTP rehearsal checks normal completion and lost-response/restart recovery. Safari checks cover responsive rendering, keyboard navigation, cancellation and the explicit simulated receipt. [Actual Sandbox observations](PAYPAL_EVIDENCE.md) are distinct from these synthetic fault tests. See [demo evidence](demo-assets/README.md) and [current status](STATUS.md) for exact observations.

This is a single-process, unauthenticated local prototype. The three sellers are synthetic and are not PayPal payees. No customer outcomes, testimonials, measured economic advantage, certified security or recognized protocol adoption are claimed. Simulated receipts do not qualify the real Sandbox gate; deterministic fallback does not qualify the real AI gate.

## Remaining work before final entry

The owner accepted the 90-second Remotion movie, Library version 4; its exact file/source identities are preserved privately. It distinguishes local simulation, synthetic expiry and earlier separate Sandbox/recovery observations. Model explanations remain unverified; the eight-attempt evidence stays linked in the written materials. No further video edit is planned. Owner decisions remain audio/publication rights, exact source/video release, secure dedicated judge access and final entrant declarations/submission. Existing engineering limitations remain disclosed; no additional inference or payment was performed. The Devpost draft stays a draft. [READINESS.md](READINESS.md) lists the concise checklist.
