# Submission readiness: 13 October 2026 MYT

The complete local journey is runnable without credentials, and one actual USD 207.00 Sandbox purchase has independently verified completion and restart evidence. The submission is not ready: actual meaningful model use, judge access, public source/video and owner declarations remain open. [Official requirements and deadline](HACKATHON.md) were rechecked; no final Devpost entry was sent.

## Ready for review

| Deliverable | Evidence |
|---|---|
| Buyer journey and deterministic authority | Mandate, private cap, two rounds, normalized offers, explicit review/selection, separate approval and capture. [Runbook](RUNBOOK.md). |
| Actual PayPal success path | [Sandbox observations](PAYPAL_EVIDENCE.md), sanitized JSON and app-only receipt crop. One capture, independently checked; older orders uncaptured. |
| Local crash/retry behavior | Attempt locks, preserved order references, no capture from reconciliation, restored receipt. Synthetic SIGKILL/HTTP regressions plus actual completed receipt restart. |
| Actual Node validation | Verified head `5f32f76`, Node 22.23.0: **106 tests passed**, zero failures/cancellations/skips, clean-source sequential coverage in **8.87 seconds** under a 30-second watchdog. Core lines **99.58%**, branches **97.67%**; journal lines **100%**. Smoke and both bounded HTTP rehearsal paths passed. New heads receive their own [exact-head report](VERIFICATION.md). No external provider requests in these checks. |
| Review follow-up | Storage-health gap reproduced during simulated approval/capture, then fixed in `f55b467`. Gateway actions and HTTP health now fail closed after either journal fails. [Separate review reports](PR16_REVIEW.md). |
| Demo materials | [Factual English copy](SUBMISSION_COPY.md), [2:45 final shot plan](DEMO.md), existing original diagram and clearly labeled simulation artifacts. These are preparation materials, not a final video. |
| Judge walkthrough | [Source-to-browser guide](JUDGE_GUIDE.md), enhanced two-path local HTTP rehearsal and simulation-only captions. The guide uses a separate port/state root and preserves existing Sandbox records. Successful actual AI evidence and private judge integration access remain pending. |
| Free-only AI route | Existing owner OpenRouter key loaded normally, explicit free variants and zero-price/no-fallback guards. [Two actual rate-limited requests](MODEL_QUALIFICATION.md) obtained no successful inference; tokens/cost unavailable. |

## Exact remaining inputs and gates

1. **Model integration:** free-only OpenRouter use is authorized through the existing key; the paid OpenAI proposal is superseded. Explicit `google/gemma-4-31b-it:free` and `google/gemma-4-26b-a4b-it:free` each returned HTTP 429 once. [Actual report and constraints](MODEL_QUALIFICATION.md). Free-provider availability is the blocker, not another spending approval. No retry, paid fallback, credit purchase or credential creation. Successful parsing/ambiguous/hostile actual-model cases remain unobserved; synthetic tests do not qualify them.
2. **Provider negative cases:** #5 success/receipt is observed; actual canceled/declined approval is unqualified. Further Sandbox activity requires its own exact scope. No further transaction was performed during this preparation.
3. **Hosted Actions resource restriction:** exact-head `eae9c58` run [38279967305](https://github.com/Whyme-Labs/vowrail/actions/runs/38279967305) has zero executed steps. Its annotation explicitly reports failed recent account payments or a spending-limit restriction. This is GitHub's hosted runner restriction, not an extra approval requirement for routine tests or a code-test failure. Repository runner inventory reports zero registered self-hosted runners; no authorized home-ci route was discovered locally. Existing Mac Node capacity completes the engineering checks without hosted minutes, artifact storage or billing changes. See [exact-head verification](VERIFICATION.md). Hosted Actions remains red until account allocation is restored, but does not block local engineering validation.
4. **Judge access:** proposed route is the reproducible Node 22+ local build plus a private owner-controlled handoff of existing **dedicated Sandbox-only test credentials and a restricted model test key**, free through judging. Owner must confirm those dedicated resources exist and authorize that specific private test access; if unavailable, choose a secure access arrangement before final entry. Do not share the owner's current `.env` or publish buyer credentials. No credential provisioning is authorized. Public hosting is not required and this unauthenticated app cannot be exposed as a service.
5. **Source and video:** proposed publication scope is **Whyme-Labs/vowrail**, MIT-licensed source/history and committed sanitized evidence at the reviewed release commit, following source/assets/secrets review; the exact release SHA must be included in the owner's visibility approval. Video scope is the reviewed app-only functioning recording on the owner's selected YouTube channel, public, under three minutes; no account pages, unrelated apps, environment files or credential/payment-method values. Obtain exact approval for that reviewed recording before publishing. The current repository stays private and PR16 stays draft.
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
