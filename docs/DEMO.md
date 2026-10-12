# Current prototype demo and submission checklist

Updated 13 October 2026 (MYT). The script below rehearses local simulation; its advice is labeled deterministic fallback. Separately, one actual USD 207.00 Sandbox purchase and restart receipt recovery are verified in [PAYPAL_EVIDENCE.md](PAYPAL_EVIDENCE.md). Real model inference and the final competition video remain incomplete.

## Honest 2:30 rehearsal

Run `npm run rehearse`, then `npm run demo` and open http://127.0.0.1:8787. No installation, credentials, external service or model billing is required. Start a fresh intent with synthetic data. Record only app content, excluding unrelated browser tabs, account dashboards, environment files and terminal history. The simulator ignores inherited provider configuration.

| Time | Action and narration |
|---|---|
| 0:00–0:15 | Show the persistent simulation banner. “Vowrail keeps purchase permission in a deterministic gateway. This recording uses local simulation: no PayPal or model calls, and no money moves.” |
| 0:15–0:35 | Create the default 100-unit print request, $220 private cap, two rounds. “Sellers see the public request; the cap stays with the gateway.” |
| 0:35–0:55 | Run round 1. Show Birch $216, Cobalt $228, Atlas $235. “Three simulated sellers. Above-cap quotes cannot proceed.” |
| 0:55–1:15 | Run round 2 and show the disabled third-round control and event trail. “An HTTP test also rejects a third request. Retained earlier quotes remain available until expiry.” |
| 1:15–1:30 | Ask for advice. “This is deterministic fallback. A configured model can advise; it cannot choose or pay.” |
| 1:30–1:55 | Review Atlas $207/two-day delivery versus Cobalt $201/four-day. Show total, expiry, margin and missing tax/refund terms. Create the simulated order. “I choose the offer; the gateway locks its stored amount.” |
| 1:55–2:15 | Open separate simulated approval, review $207 and approve. Return, then explicitly request simulated capture. “Consent and capture are separate. Neither navigation nor refresh sends capture.” |
| 2:15–2:30 | Show **Simulated receipt**, completion event and mode label. “This rehearses the local controls. A separate Sandbox purchase is verified; this screen remains simulation. Real model qualification and the competition entry remain pending.” |

Prices above are the default scripted fixture, not market prices. If the configuration, fixture or observed result changes, update the narration. Use the actual test count shown by the recorded command; do not relabel synthetic receipts as PayPal evidence.

Optional recovery segment: use `npm run demo:recovery` with a new mandate. After explicit capture, the simulated response is lost; capture disappears. Use **Check simulated receipt (read only)** to recover completion. Narrate “The receipt already exists. Recovery reads it without another capture.” Cancellation can also be rehearsed by **Return without approving**, then resuming the same order. These replace footage within the time limit; a longer internal rehearsal is not a submitted video.

[Reusable assets](demo-assets/README.md) contain an actual Safari page export, bounded HTTP rehearsal JSON and an original architecture diagram. [Submission copy](SUBMISSION_COPY.md) is a factual English draft. No public video or final submission has been created.

## Final-video shot plan, after model qualification

Keep the recording within 2:45. Show the functioning app and exact provider/model; retain synthetic-seller disclosures throughout. Use the existing completed Sandbox receipt and timestamped checks rather than executing another payment for footage. The receipt image documents an earlier authorized run, so narrate that provenance explicitly. Browser tabs, account pages, environment files and unrelated projects stay outside the recording.

| Time | Required footage / claim |
|---|---|
| 0:00–0:20 | Explain the buyer's authorization boundary and create a synthetic print mandate. |
| 0:20–0:55 | Show both rounds, normalized quotes, cap denial and the third-round denial from the recorded HTTP test. Sellers are simulated. |
| 0:55–1:25 | Show one actually observed `ai_advisory` result and exact model/provider. Compare its delivery reasoning to the same eligible minimum-price baseline; do not claim a better outcome unless observed. This segment is blocked until authorized model qualification. |
| 1:25–1:55 | Review stored price, delivery and expiry. Explain offer selection and separate order/approval/capture permission. Do not create a new order during filming. |
| 1:55–2:25 | Show the existing Sandbox completed receipt: USD 207.00, order and capture references. Explain the independent API check and restart restoration after expiry. State that Atlas is synthetic and the configured Sandbox merchant receives payment. |
| 2:25–2:45 | Show local test/rehearsal evidence and disclose single-process local scope, remaining provider negative cases and access instructions. |

The current model preflight is request-shape evidence only and cannot fill the AI footage slot. The Sandbox still image alone does not constitute a completed functioning video. No video has been recorded or uploaded for final entry.

## Submission checklist

The [official rules](https://paypalaihackathon.devpost.com/rules), rechecked 13 October 2026 MYT, require a working PayPal + AI app, public open-source code with a visible license, English materials and a public YouTube demonstration shorter than three minutes. Judges may run the app locally using clear instructions; public hosting is not mandatory. Access must remain free through judging, ending 15 December 2026 at 08:00 Pacific. Submission closes 12 November 2026 at 12:00 PST. Recheck the rules before submitting.

| Deliverable | Actual status / next action |
|---|---|
| Reproducible local app | Node 22+, no dependencies, complete explicitly simulated approval/capture/receipt and recovery journey. Run tests, smoke and bounded `rehearse` from clean source before recording. |
| Accessibility and mobile | Responsive Safari and keyboard checks documented in [ACCESSIBILITY.md](ACCESSIBILITY.md). Auditory screen-reader and physical-device checks remain open. |
| Meaningful AI | Adapter and adversarial tests exist; actual provider/model evidence remains open in #4. |
| PayPal Sandbox | Actual create/approve/capture, independent API/dashboard checks and restart receipt are verified. [Sanitized proof](PAYPAL_EVIDENCE.md). Actual canceled/declined paths remain open in #5. No live payments. |
| CI | Local tests pass; GitHub jobs currently cannot start because of account billing/spending limits (#1). |
| Source release | MIT license exists. Repo remains private; owner-approved secret/IP review and exact visibility approval are required (#9). |
| Video and project description | This rehearsal script is ready. Public video, screenshots and final factual fields must match the observed integration (#10). Existing Devpost draft remains a draft. |
| Eligibility and final submission | Owner confirms eligibility, rights and final agreement; owner performs the final submission and retains confirmation. |

## Prerequisites for the next integration gate

**Model:** choose an existing compatible provider and exact model, privately supply `AI_API_KEY` and `AI_MODEL`, and authorize one synthetic advice call with a cost limit or free quota. `AI_BASE_URL` is optional; its default is `https://api.openai.com/v1`. Keep `AI_MERCHANTS=0`. [MODEL_QUALIFICATION.md](MODEL_QUALIFICATION.md) specifies the prepared request, baseline, output-limit prerequisite and evidence checks. No paid call is authorized in this work. Existing PayPal configuration and completed journals should be preserved; no further payment is needed for this preparation.

The supported private handoff is an owner-entered, ignored, owner-readable `.env` (`chmod 600 .env`) loaded with `node --env-file=.env src/server.js`, or inherited environment variables. `.env.local` is not automatically loaded. Do not paste secrets into chat, issues or recordings. No dedicated secret-entry tool for this local runtime was exposed in the available tooling; the cloud environment setup form is for a different execution environment. After owner setup, verify names/presence only, then follow the [runbook](RUNBOOK.md). Never create or rotate credentials as part of this rehearsal. Configured flags are not evidence of a successful provider request.

PayPal setup follows [Sandbox account types](https://developer.paypal.com/sandbox-testing/accounts) and [REST authentication](https://developer.paypal.com/api/rest/authentication/). Approval and capture remain separate explicit actions. Preserve the journal; an uncertain capture must use read-only reconciliation rather than another capture attempt.
