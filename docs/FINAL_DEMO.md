# Problem-led private video review

Revised 13 October 2026 after the owner asked to focus on the problem. Target **2:45**, English captions, private review only. The prior technical review cut is preserved locally. No new inference, order, approval or capture; no publication or final entry.

## Buyer story and actual problem

**Illustrative buyer, synthetic quotes:** “I need 100 matte prints for an event in three days. I want an AI to help buy them, but I need control over the price and terms I agree to, how long my permission lasts, and whether payment completed.” Cobalt's USD 201/four-day estimate is cheap but too late for this illustrative need. Birch USD 203/three-day and Atlas USD 207/two-day illustrate the price/timing tradeoff. These are synthetic estimates, not real merchant commitments.

In separate actual model tests, explanations misstated comparative price, assumed an uncertain deadline was acceptable and mislabeled cents as USD. No model case created a checkout. A hypothetical lost payment response raises another question: whether it is safe to try again. Synthetic recovery tests exercise that failure; the earlier real Sandbox observation proves one completed capture and restored receipt. No observed fraud or universal protection claim is supported.

Introduce Vowrail after those buyer concerns: **AI advice must stay within the buyer's purchase permission, and the buyer must be able to check the outcome**. Keep implementation details and measurement tables secondary in [MODEL_QUALIFICATION.md](MODEL_QUALIFICATION.md).

## 2:45 script and exact cut sequence

| Time | Screen / source | Narration and purpose |
|---|---|---|
| 0:00–0:20 | Original app-only story card with three synthetic quotes; label illustrative buyer. | I need 100 matte prints for an event in three days. I want AI help, while retaining control over the agreed price and terms, when permission ends and whether payment completed. The cheapest offer may miss the event. |
| 0:20–0:38 | Recorded actual model explanation visibly unverified. Label separate from the earlier payment. | Separate model tests got prices and deadline assumptions wrong. Advice cannot settle what I meant or authorize purchase. An uncertain payment response also needs a checkable answer before anyone pays again. No purchase occurred in these model cases. |
| 0:38–1:00 | Existing recorded simulation clip: create USD 220 ceiling/two-round mandate. | Vowrail begins with permission stored outside model reasoning. I allow at most USD 220 and two rounds. Sellers receive public requirements, not the private ceiling. Buyer review and approval remain explicit. |
| 1:00–1:18 | Recorded bidding, then retained gateway-denial panel. | The gateway enforces those bounds. Above-budget or invented offers cannot begin checkout. The gateway checks the round limit; a disabled button only represents those checks. |
| 1:18–1:40 | Existing explicit offer-review screen. | I compare stored price, delivery estimate and expiry, then choose. Delivery and missing tax/refund terms still need review. Order creation, buyer approval and capture are separate. Model explanations stay unverified. |
| 1:40–1:55 | Labeled synthetic expiry replay of shipped UI; no checkout/capture. | Permission has a lifetime. Expired quotes cannot begin checkout; expired mandates cannot authorize capture. Previously completed payment status can still be checked. Existing gateway expiry tests are separate enforcement evidence. |
| 1:55–2:25 | Sanitized historical text summary, without receipt image or transaction references. Label earlier Sandbox run, separate from model cases. | In an earlier separate PayPal Sandbox run, one USD 207 purchase completed. Independent checks matched stored amount, currency and reference. Restart restored the receipt after expiry; recovery made no capture call. The synthetic seller was not the PayPal payee. |
| 2:25–2:45 | Buyer-outcome card with small scope/evidence footer. | Use AI help while keeping permission explicit and the outcome checkable. This local prototype demonstrates those controls; model reasoning and physical delivery are not guaranteed. Model cases and Sandbox purchase were separate runs. Private review only. |

The [matched captions](demo-assets/final-sequence-captions.vtt) are the narration script. Keep provenance labels concise. Three parsed outputs, three truncated Nvidia responses and two Google429s remain in linked evidence; the small sample is not broad qualification. Do not imply cheapest-choice correctness, automatic resolution of an ambiguous deadline, fulfillment, observed fraud or universal guarantees.

## Demonstrated boundary and honest limits

- Price ceiling, rounds, stored offer identity/currency/amount and authorization expiry are deterministic controls. The model cannot expand them or issue payment.
- Buyer selection, provider approval and capture are separate. Stored values govern execution; model narrative stays unverified.
- Delivery is a nonbinding estimate. Free-text requirements and missing tax/refund terms require buyer review. The gateway does not certify them or ensure physical delivery.
- Receipt matching and read-only recovery make the payment outcome checkable. The earlier Sandbox run is independent of recorded model cases.
- Label recorded simulation, historical model text, synthetic expiry replay and earlier Sandbox summary. No new real-provider end-to-end run is implied.

## Private assembly and delivery

Reuse app-only local footage and recorded model evidence. Render original story/outcome cards and a labeled synthetic expiry replay headlessly, leaving foreground apps untouched. Exclude account dashboards, browser chrome, credentials, transaction references and unrelated projects. Library delivery uses the historical text summary, never the private receipt screenshot. Preserve the earlier local cut; replace the same Library identity with its observed version guard.

Source/video stay private. Owner reviews story, edit, narration/aspect ratio, exact source/video/channel release, dedicated free judge access and eligibility/rights/final declarations. [READINESS.md](READINESS.md) retains provider-negative, accessibility and remaining submission gates. No final agreement or entry here.
