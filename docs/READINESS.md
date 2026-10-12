# Submission readiness: 13 October 2026 MYT

The complete local journey is runnable without credentials, and one actual USD 207.00 Sandbox purchase has independently verified completion and restart evidence. The submission is not ready: actual meaningful model use, judge access, public source/video and owner declarations remain open. [Official requirements and deadline](HACKATHON.md) were rechecked; no final Devpost entry was sent.

## Ready for review

| Deliverable | Evidence |
|---|---|
| Buyer journey and deterministic authority | Mandate, private cap, two rounds, normalized offers, explicit review/selection, separate approval and capture. [Runbook](RUNBOOK.md). |
| Actual PayPal success path | [Sandbox observations](PAYPAL_EVIDENCE.md), sanitized JSON and app-only receipt crop. One capture, independently checked; older orders uncaptured. |
| Local crash/retry behavior | Attempt locks, preserved order references, no capture from reconciliation, restored receipt. Synthetic SIGKILL/HTTP regressions plus actual completed receipt restart. |
| Actual Node validation | Node 22.23.0: **104 tests passed**, zero failures/cancellations/skips, sequential coverage in **6.21 seconds** under a 30-second watchdog. Core lines **99.58%**, branches **97.67%**; journal lines **100%**. Smoke and both bounded HTTP rehearsal paths passed. No external provider requests in these checks. |
| Review follow-up | Storage-health gap reproduced during simulated approval/capture, then fixed in `f55b467`. Gateway actions and HTTP health now fail closed after either journal fails. [Separate review reports](PR16_REVIEW.md). |
| Demo materials | [Factual English copy](SUBMISSION_COPY.md), [2:45 final shot plan](DEMO.md), existing original diagram and clearly labeled simulation artifacts. These are preparation materials, not a final video. |
| Next AI request | [Prepared qualification plan](MODEL_QUALIFICATION.md) and exact shipped adapter request-shape preflight, with no key/header/private cap and zero external calls. |

## Exact remaining inputs and gates

1. **Model integration:** select the existing compatible provider, exact model and base URL; enter the key privately in `.env`; authorize one synthetic buyer-advice call with a spend cap or confirmed free quota. Confirm a provider-side output limit or add a compatible completion bound before any paid request. Record actual model, latency, calls, available usage/cost and `ai_advisory`; fallback does not qualify. Optional synthetic model-merchant evaluation remains separate in #4/#7.
2. **Provider negative cases:** #5 success/receipt is observed; actual canceled/declined approval is unqualified. Further Sandbox activity requires its own exact scope. No further transaction was performed during this preparation.
3. **CI allocation:** latest observed Actions run [38128014845](https://github.com/Whyme-Labs/vowrail/actions/runs/38128014845) failed before steps because of account billing/spending limits. Local checks pass. The owner must resolve allocation before qualifying #1; no billing setting or repeated dispatch was changed here.
4. **Judge access:** agree on a free way to run the configured AI/PayPal paths for the judging period. The local simulator needs no credentials; it does not replace integration qualification. Keep owner secrets and buyer credentials out of source, video and public testing instructions. Any shared test access needs a separate approved secure arrangement. Public hosting is not required and this unauthenticated app cannot be exposed as a service.
5. **Source and video:** review source/assets/license/secrets and the intended release commit, then obtain exact owner approval to make this repository public. Record functioning footage with the actual model and existing verified Sandbox receipt; publish an owner-approved public YouTube video and retain its URL. The current repository stays private and PR16 stays draft.
6. **Owner declarations:** confirm entrant/representative eligibility, ownership and permitted asset/integration use; review the actual form fields, final factual copy and testing access; perform final agreement/submission and retain confirmation. This work makes no declarations on the owner's behalf.

Physical-device, zoom and auditory screen-reader checks remain in [ACCESSIBILITY.md](ACCESSIBILITY.md). Hosted authentication, transactional storage/outbox and multiple-worker qualification remain outside the current local slice (#6/#8). No customer-outcome, security-certification or improved-economics claim is supported by these observations.

## Minimum clean-source reproduction

Use Node 22+ with provider settings unset. Run sequentially:

```sh
npm test -- --test-concurrency=1
npm run smoke
npm run rehearse
npm run demo
```

Open http://127.0.0.1:8787 and follow the explicitly simulated journey. Use a fresh private state directory for a clean rehearsal; preserve the existing Sandbox and simulation journals. No installation or dependency download is needed. Configuration presence is not provider success. The actual success observation is retained as evidence, not permission to rerun a payment.
