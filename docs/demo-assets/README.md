# Demo assets and observed integration evidence

Each asset states its source and scope. Simulation assets are reproducible without credentials. The separate Sandbox screenshot and checks record one actual authorized purchase; they are not reusable test fixtures. The model request preflight made no external request. None is a customer endorsement or submitted competition video.

| Asset | Provenance and use |
|---|---|
| [simulated-receipt.pdf](simulated-receipt.pdf) | Native Safari **Export as PDF** of the actual rendered local app on 11 October 2026 at 15:41 UTC. Two rounds, Atlas's synthetic $207 quote, return without approval, resumed local consent, intentionally lost capture response, read-only reconciliation and completed simulated receipt. Export contains only app content; unrelated tabs/account pages are excluded. |
| [rehearsal.json](rehearsal.json) | Actual `node scripts/rehearse.js` stdout from the bounded local HTTP run. Normal and lost-response/restart scenarios, exact locked amount, policy rejections and one completion event. Two scripted paths, not a performance benchmark or external-provider evidence. |
| [judge-rehearsal.json](judge-rehearsal.json) | Current enhanced HTTP rehearsal: shipped app assets/disclosures, USD 201 deterministic advice, independent buyer choice of Atlas USD 207/two-day delivery, stored-price locking, separate consent and zero capture calls during restarted recovery. Local simulation only; no new visual-browser or provider observation. |
| [simulation-captions.vtt](simulation-captions.vtt) | Original English WebVTT captions for the 2:30 simulation shot plan. Preparation text, not footage or a finished competition video. Keep simulation disclosures when using this track. |
| [control-flow.svg](control-flow.svg) | Original source-created explanatory diagram. This is an architecture illustration, not a screenshot or observed provider result. |
| [paypal-sandbox-receipt.jpg](paypal-sandbox-receipt.jpg) | Unaltered app-only crop from the completed actual USD 207.00 Sandbox purchase on 12 October 2026. No account page, browser chrome or credential/payment-method values. [Full provenance](../PAYPAL_EVIDENCE.md). |
| [paypal-sandbox-proof.json](paypal-sandbox-proof.json) | Curated actual API, restart and dashboard observations with Sandbox references/statuses only. Provider payer payloads and account details are excluded. |
| [model-request-preflight.json](model-request-preflight.json) | Actual shipped gateway/adapter request serialized through an injected local transport, 13 October MYT. Stable synthetic IDs, private cap omitted, gateway state unchanged, zero external requests. No real model result; see [qualification plan](../MODEL_QUALIFICATION.md). |
| [English description](../SUBMISSION_COPY.md) | Factual editable copy with real-provider and owner gates left open. No eligibility or rights declaration. |
| [2:30 narration and shot plan](../DEMO.md) | Reproducible local recording plan. A public competition video has not been produced or uploaded. |

From clean source with Node 22+: `npm test -- --test-concurrency=1`, `npm run smoke`, `npm run rehearse`, then `npm run demo`. Open http://127.0.0.1:8787 and follow [RUNBOOK.md](../RUNBOOK.md). Use `npm run demo:recovery` for an injected lost response. Provider settings are ignored in simulation. No npm installation or external provider request is required.

Preserve both private simulation journals for restart recovery. Never distribute `.env`, `.vowrail`, the browser's other tabs or account pages. New synthetic IDs and timestamps will differ across rehearsals; the checks and results should agree. Do not replace the simulation disclosure with PayPal branding or describe these receipts as verified Sandbox transactions.
