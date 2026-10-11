# Factual project-description draft

Prepared from the executable local prototype on 11 October 2026. This is editable English copy for the existing draft, not a submitted entry or an eligibility declaration. Replace integration wording only after actual provider evidence exists.

## Project name

Vowrail

## Short description

AI negotiates. You stay in control. A deterministic gateway enforces private spending limits, bounded negotiation and explicit checkout permission.

## Inspiration

A shopping agent can recommend an offer, but a recommendation should not expand what its buyer authorized. We built a small executable boundary around purchase permission: a private mandate, a fixed negotiation allowance, validated offers and separate checkout actions.

## What it does

The buyer defines an item, quantity, private USD ceiling and maximum rounds. Three simulated sellers receive public requirements and return quotes. The gateway consumes rounds before requesting bids, retains valid earlier offers and blocks checkout above the ceiling. Advice is optional and cannot select an offer or authorize a payment.

The buyer reviews the stored amount, delivery and expiry before creating an order. Approval and capture remain separate. If a capture response is lost, an immutable attempt lock prevents another capture; read-only receipt reconciliation recovers a verified matching result.

The current credential-free demo completes this journey using clearly labeled local approval and receipt simulation. It makes no PayPal or model requests and moves no money. The repository also contains the actual Sandbox-only PayPal Orders v2 adapter and an optional compatible model adapter. Neither has yet been independently exercised against its real provider.

## How it is built

Node.js 22, native HTTP/fetch, plain HTML/CSS/JavaScript and no runtime npm dependencies. A deterministic state machine owns authorization; merchant content, browser inputs and model advice are untrusted. The server derives payment amounts from accepted offers rather than client amounts. A private local file journal persists mandates, consumed rounds, order references and capture-attempt locks across process restart.

## Evidence and limits

Actual Node tests cover policy, concurrency, malformed provider/model output, expiry, response loss, process termination and restart. A bounded HTTP rehearsal checks normal completion and lost-response/restart recovery. Safari checks cover responsive rendering, keyboard navigation, cancellation and the explicit simulated receipt. See [demo evidence](demo-assets/README.md) and [current status](STATUS.md) for exact observations.

This is a single-process, unauthenticated local prototype. The three sellers are synthetic and are not PayPal payees. No customer outcomes, testimonials, measured economic advantage, certified security or recognized protocol adoption are claimed. Simulated receipts do not qualify the real Sandbox gate; deterministic fallback does not qualify the real AI gate.

## Remaining work before final entry

Observe an authorized model call and a real PayPal Sandbox create/approve/capture, record factual evidence, and update the video accordingly. The owner must review rights and secrets, approve the exact repository visibility change, publish the required demo video, confirm eligibility and perform final agreement/submission. The existing Devpost draft stays a draft.
