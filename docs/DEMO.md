# Current prototype demo and submission checklist

This is a rehearsal script for the executable local prototype, checked on 11 October 2026. It is not a completed competition entry. Merchants and checkout are explicitly simulated; advice is labeled deterministic fallback. The actual PayPal adapter has synthetic integration coverage but no observed real Sandbox create/approve/capture yet.

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
| 2:15–2:30 | Show **Simulated receipt**, completion event and mode label. “This proves the local control journey. Real model and PayPal Sandbox evidence remain pending. It is not a completed competition entry.” |

Prices above are the default scripted fixture, not market prices. If the configuration, fixture or observed result changes, update the narration. Use the actual test count shown by the recorded command; do not relabel synthetic receipts as PayPal evidence.

Optional recovery segment: use `npm run demo:recovery` with a new mandate. After explicit capture, the simulated response is lost; capture disappears. Use **Check simulated receipt (read only)** to recover completion. Narrate “The receipt already exists. Recovery reads it without another capture.” Cancellation can also be rehearsed by **Return without approving**, then resuming the same order. These replace footage within the time limit; a longer internal rehearsal is not a submitted video.

[Reusable assets](demo-assets/README.md) contain an actual Safari page export, bounded HTTP rehearsal JSON and an original architecture diagram. [Submission copy](SUBMISSION_COPY.md) is a factual English draft. No public video or final submission has been created.

For the eventual competition video, replace the final segment only after independently observing the configured model and real Sandbox order, buyer approval and API-verified capture. Record actual working footage and state the provider/model used. Keep simulated sellers distinct from the single receiving Sandbox merchant. No fabricated completion screen or model response qualifies that gate.

## Submission checklist

The [official rules](https://paypalaihackathon.devpost.com/rules), checked 11 October 2026, require a working PayPal + AI app, public open-source code with a visible license, English materials and a public YouTube demonstration shorter than three minutes. Judges may run the app locally using clear instructions; public hosting is not mandatory. Access must remain free through judging, ending 15 December 2026 at 08:00 Pacific. Submission closes 12 November 2026 at 12:00 PST. Recheck the rules before submitting.

| Deliverable | Actual status / next action |
|---|---|
| Reproducible local app | Node 22+, no dependencies, complete explicitly simulated approval/capture/receipt and recovery journey. Run tests, smoke and bounded `rehearse` from clean source before recording. |
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
