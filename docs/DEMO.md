# Current prototype demo and submission checklist

This is a rehearsal script for the executable local prototype, checked on 11 October 2026. It is not a completed competition entry. Merchants are simulated; the model is unconfigured and uses labeled deterministic advice. The actual PayPal adapter has synthetic integration coverage but no observed real Sandbox create/approve/capture yet.

## Honest 2:30 rehearsal

Start a fresh intent on the loopback app with provider credentials unset. Use only synthetic data. Record the app content, not unrelated browser tabs, account dashboards, environment files or terminal history.

| Time | Action and narration |
|---|---|
| 0:00–0:20 | Show the app. “An agent can suggest a purchase, but a suggestion cannot expand my permission. Vowrail puts the spending and round limits in a deterministic gateway.” |
| 0:20–0:45 | Create the default 100-unit print request with a $220 private cap and two rounds. “The seller request contains public requirements. The private cap stays with the gateway.” |
| 0:45–1:10 | Run round 1. Show Birch at $216, Cobalt at $228 and Atlas at $235. “These are three simulated sellers. Quotes above my cap cannot proceed; the app shows the excess.” |
| 1:10–1:35 | Run round 2, show the disabled third-round control and event history. “The gateway consumes and enforces the authorized rounds. An HTTP regression test also verifies that a third request is rejected.” |
| 1:35–1:55 | Ask for advice. “This run uses the explicitly labeled deterministic fallback. A configured model can advise, but cannot select or pay.” |
| 1:55–2:15 | Review Atlas's $207/two-day quote; compare Cobalt's $201/four-day quote. Show total, delivery, expiry, budget margin and missing refund/tax terms. Back out. “Review is separate from order creation.” |
| 2:15–2:30 | Show disabled Sandbox order creation and the test result. “No real Sandbox payment or model call is demonstrated here. The adapter and recovery tests use synthetic transport. Existing provider setup and an observed Sandbox receipt are the next gates.” |

Prices above are the default scripted fixture, not market prices. If the configuration, fixture or observed result changes, update the narration. Use the actual test count shown by the recorded command; do not relabel synthetic receipts as PayPal evidence.

For the eventual competition video, replace the final segment only after independently observing the configured model and real Sandbox order, buyer approval and API-verified capture. Record actual working footage and state the provider/model used. Keep simulated sellers distinct from the single receiving Sandbox merchant. No fabricated completion screen or model response qualifies that gate.

## Submission checklist

The [official rules](https://paypalaihackathon.devpost.com/rules), checked 11 October 2026, require a working PayPal + AI app, public open-source code with a visible license, English materials and a public YouTube demonstration shorter than three minutes. Judges may run the app locally using clear instructions; public hosting is not mandatory. Access must remain free through judging, ending 15 December 2026 at 08:00 Pacific. Submission closes 12 November 2026 at 12:00 PST. Recheck the rules before submitting.

| Deliverable | Actual status / next action |
|---|---|
| Reproducible local app | Node 22+, no dependencies, synthetic core journey works. Run tests and smoke from an independent clean checkout before recording. |
| Accessibility and mobile | Responsive Safari and keyboard checks documented in [ACCESSIBILITY.md](ACCESSIBILITY.md). Auditory screen-reader and physical-device checks remain open. |
| Meaningful AI | Adapter and adversarial tests exist; actual provider/model evidence remains open in #4. |
| PayPal Sandbox | Actual Sandbox create/approve/capture and sanitized receipt remain open in #5. No live payments. |
| CI | Local tests pass; GitHub jobs currently cannot start because of account billing/spending limits (#1). |
| Source release | MIT license exists. Repo remains private; owner-approved secret/IP review and exact visibility approval are required (#9). |
| Video and project description | This rehearsal script is ready. Public video, screenshots and final factual fields must match the observed integration (#10). Existing Devpost draft remains a draft. |
| Eligibility and final submission | Owner confirms eligibility, rights and final agreement; owner performs the final submission and retains confirmation. |

## Only prerequisites for the next real integration test

1. **PayPal:** privately supply the existing Sandbox app's `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, with an existing business merchant and a separate personal Sandbox buyer for browser approval. Set `PUBLIC_BASE_URL` to the chosen return origin. First check whether the local browser can return to loopback; public hosting is not a prerequisite. An externally exposed server would need a separately approved secure design.
2. **Model:** choose an existing compatible provider and exact model, privately supply `AI_API_KEY` and `AI_MODEL`, and agree on a permitted bounded call. `AI_BASE_URL` is optional; its default is `https://api.openai.com/v1`. Keep `AI_MERCHANTS=0` for the smallest buyer-advice test. No paid call is authorized in this work.

The supported private handoff is an owner-entered, ignored, owner-readable `.env` (`chmod 600 .env`) loaded with `node --env-file=.env src/server.js`, or inherited environment variables. `.env.local` is not automatically loaded. Do not paste secrets into chat, issues or recordings. No dedicated secret-entry tool for this local runtime was exposed in the available tooling; the cloud environment setup form is for a different execution environment. After owner setup, verify names/presence only, then follow the [runbook](RUNBOOK.md). Never create or rotate credentials as part of this rehearsal. Configured flags are not evidence of a successful provider request.

PayPal setup follows [Sandbox account types](https://developer.paypal.com/sandbox-testing/accounts) and [REST authentication](https://developer.paypal.com/api/rest/authentication/). Approval and capture remain separate explicit actions. Preserve the journal; an uncertain capture must use read-only reconciliation rather than another capture attempt.
