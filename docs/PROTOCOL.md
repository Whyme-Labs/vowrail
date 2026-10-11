# Vowrail negotiation profile, draft 0.1

**Status:** experimental profile; not an adopted protocol or certification. The reference demo implements a narrow subset with simulated sellers.

## Definitions

- **Intent:** one buyer purchase objective with an immutable identifier.
- **Mandate:** approved constraints on that intent, held by the trusted gateway.
- **Round:** one coordinated opportunity for the participating sellers to submit or revise offers. Multiple seller messages in the same round count once.
- **Seller bid:** binding or otherwise clearly characterized price plus terms for a defined quantity. In the demo, bids are simulated and **not externally binding**.
- **Finality:** once checkout begins, negotiations cannot resume within the same intent.
- **Offer equality:** compare like-for-like item, quantity, delivery and fees. This prototype demonstrates a single standardized product and does not claim broader normalization.

## Default consumer policy

- `max_rounds = 2`, set during buyer authorization, not hardcoded into the format.
- `max_total_minor` is a strictly positive safe integer, privately stored.
- `currency = USD` for the first reference implementation.
- Round 0 represents fixed-price acceptance if the product later supports it; it does not consume a bargaining round.
- No reset via model swapping, request retries, different client sessions or delegated agents sharing the same mandate.

## Example buyer mandate (PRIVATE, not transmitted to merchants)

```json
{
  "intent_id": "random-uuid",
  "item": "Custom print run",
  "quantity": 100,
  "requirements": "Three-day turnaround, matte finish",
  "currency": "USD",
  "max_total_minor": 22000,
  "max_rounds": 2
}
```

## Example minimal merchant request (PUBLIC)

```json
{
  "intent_id": "random-uuid",
  "round": 1,
  "item": "Custom print run",
  "quantity": 100,
  "requirements": "Three-day turnaround, matte finish"
}
```

Never include `max_total_minor`, private notes, payment credentials, raw conversation or profile data in a seller payload. Round timing and acceptance behavior may still convey information indirectly.

## Gateway transitions

1. `createIntent`: validate and freeze mandate; store private max.
2. `runRound`: synchronously reserve one round for intent; build public projection and solicit each registered merchant independently; validate and store offers; complete the round. No extra sends after cap.
3. `recommend`: optionally ask AI to rank eligible offers. Reject IDs not in validated candidates.
4. `createCheckout`: verify offer belongs to intent, matches currency, amount within cap, and state permits checkout; lock exact details before external call.
5. `capture`: independently verify PayPal order amount/currency and buyer approval; capture at most once or fail closed pending reconciliation.
6. `reconcile`: read the already-known order ID; validate the bound intent, locked amount and completed receipt. Never create an order or send another capture. Ambiguous capture attempts remain locked if the read cannot prove completion; pre-capture read failures may recover to awaiting approval.

## Security-critical rules

- There is no "please disregard the policy" agent message or merchant override path.
- Unknown negotiation states or payment fields fail closed.
- All relevant pricing components must appear in the authorized amount. Dynamic tax, shipping, fees and variable services are out of scope for the first demo.
- Merchant authentication and signed binding quotes are requirements for real commerce, not features of the synthetic adapter.
- For strong isolation, seller-facing agent must not receive private fields and outbound channel format must not be arbitrary user-supplied text.
- Process-local safety tests do not establish durability after a crash or protection against a malicious operator.
- An amount below ceiling is not proof of fair pricing. Competition disclosures, supplier coverage, and marketplace conflict audits belong to a separate assurance layer.

## Extension policy

A buyer may create **a new mandate**, explicitly approved with a new round cap, for a new purchase evaluation. Silently treating a restart as a fresh intent to bypass limits violates the proposed profile. Future production systems need binding between semantically identical objectives, identities and expiry windows; perfect objective deduplication is not generally decidable.

## Compatibility

The profile should be carried within an existing commerce or agent workflow where practical. Payment mandates may be expressed using AP2 or scoped authorization designs. This document intentionally does not claim AP2, UCP or A2A have adopted Vowrail's round semantics.

## Offer preservation across rounds

The prototype keeps earlier valid offers eligible until their stated expiry; starting a new round does **not** delete a previous better quote. This avoids strategic loss of buyer options when a seller raises its second-round price. Real integrations must establish whether a merchant's signed revised offer explicitly supersedes or withdraws an earlier commitment. The synthetic sellers do not implement withdrawals.
