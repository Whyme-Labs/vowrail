# Reusable rehearsal assets

These assets document a local simulation. They are not a real PayPal receipt, a model evaluation, a customer endorsement or a submitted competition video. No credentials are needed to reproduce them.

| Asset | Provenance and use |
|---|---|
| [simulated-receipt.pdf](simulated-receipt.pdf) | Native Safari **Export as PDF** of the actual rendered local app on 11 October 2026 at 15:41 UTC. Two rounds, Atlas's synthetic $207 quote, return without approval, resumed local consent, intentionally lost capture response, read-only reconciliation and completed simulated receipt. Export contains only app content; unrelated tabs/account pages are excluded. |
| [rehearsal.json](rehearsal.json) | Actual `node scripts/rehearse.js` stdout from the bounded local HTTP run. Normal and lost-response/restart scenarios, exact locked amount, policy rejections and one completion event. Two scripted paths, not a performance benchmark or external-provider evidence. |
| [control-flow.svg](control-flow.svg) | Original source-created explanatory diagram. This is an architecture illustration, not a screenshot or observed provider result. |
| [English description](../SUBMISSION_COPY.md) | Factual editable copy with real-provider and owner gates left open. No eligibility or rights declaration. |
| [2:30 narration and shot plan](../DEMO.md) | Reproducible local recording plan. A public competition video has not been produced or uploaded. |

From clean source with Node 22+: `npm test -- --test-concurrency=1`, `npm run smoke`, `npm run rehearse`, then `npm run demo`. Open http://127.0.0.1:8787 and follow [RUNBOOK.md](../RUNBOOK.md). Use `npm run demo:recovery` for an injected lost response. Provider settings are ignored in simulation. No npm installation or external provider request is required.

Preserve both private simulation journals for restart recovery. Never distribute `.env`, `.vowrail`, the browser's other tabs or account pages. New synthetic IDs and timestamps will differ across rehearsals; the checks and results should agree. Do not replace the simulation disclosure with PayPal branding or describe these receipts as verified Sandbox transactions.
