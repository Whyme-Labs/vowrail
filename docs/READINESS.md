# Submission readiness: 13 October 2026 MYT

The owner accepted the 90-second video, Library version 4, on 13 October 2026 (MYT). Its MP4 and source identities are frozen in the private submission review package. The complete local journey, one independently verified actual USD 207.00 Sandbox purchase/restart and three functional free-model advice cases are documented. Public release, audio rights, judge access and final entrant declarations remain owner decisions. No final Devpost entry was sent.

## Accepted cut and remaining owner decisions

Accepted file: `vowrail-sanitized-review-90s.mp4`, 90 seconds, 1920×1080, 30fps, 13,228,291 bytes; SHA256 `6f663e4bcfdb017c994f99b6b051178a81919a8764181044d711fb06c5208338`. Picture source: `fbf79114a3bc6975108500c9abd5ef769d79a7e9`; final audio edit: `dc07718619b8ed838f5d09965f61b4cd7638692b`. The original audio's final two seconds are removed before looping. Acceptance records the cut; it grants no public-release or declaration authority. No further video edit is planned.

| Owner decision | Concrete item to resolve |
|---|---|
| Audio rights | Confirm ownership or permission covering the supplied track's public YouTube and competition use. Attachment and cut acceptance do not establish those rights. |
| Public release | Select the YouTube channel and explicitly authorize publishing this accepted MP4 and changing Whyme-Labs/vowrail to public at the final reviewed release SHA. Source/history/assets review and preparation of that exact SHA are engineering work before the release request. |
| Judge access | Choose a secure private handoff for usable dedicated Sandbox-only test access and a restricted free-model test key throughout judging. Confirm dedicated resources exist; the owner's current `.env` and personal buyer password stay private. No credential provisioning is assumed. |
| Entrant and final entry | Confirm individual/team/organization details and representative if needed, eligibility/ownership/integration declarations, final form/copy, then explicitly authorize the final submission. No agreement is accepted here. |

The [official rules](https://paypalaihackathon.devpost.com/rules) were read again on 13 October: public open-source repository, public YouTube video under three minutes, functional free judge access and permitted third-party material. Deadline: **13 November 2026, 04:00 MYT**. Keep the private package and Library metadata out of the public repository.

## Ready for review

| Deliverable | Evidence |
|---|---|
| Buyer journey and deterministic authority | Mandate, private cap, two rounds, normalized offers, explicit review/selection, separate approval and capture. [Runbook](RUNBOOK.md). |
| Actual PayPal success path | [Sandbox observations](PAYPAL_EVIDENCE.md), sanitized JSON and app-only receipt crop. One capture, independently checked; older orders uncaptured. |
| Local crash/retry behavior | Attempt locks, preserved order references, no capture from reconciliation, restored receipt. Synthetic SIGKILL/HTTP regressions plus actual completed receipt restart. |
| Actual Node validation | Exact accepted audio-edit source `dc07718619b8ed838f5d09965f61b4cd7638692b`, Node 22.23.0: **124 tests passed**, zero failures/cancellations/skips; clean-source sequential coverage, smoke and both bounded HTTP rehearsal paths passed. The full suite took **2.926 seconds** under its 30-second watchdog. Documentation successors do not inherit a new test count. [Verification method](VERIFICATION.md). |
| Review follow-up | Storage-health gap reproduced during simulated approval/capture, then fixed in `f55b467`. Gateway actions and HTTP health now fail closed after either journal fails. [Separate review reports](PR16_REVIEW.md). |
| Demo materials | Owner-accepted [90-second Remotion cut](FINAL_DEMO.md), 15 continuous English captions, checked audio/video and exact source/file identity; [factual English copy](SUBMISSION_COPY.md). Prior cuts remain preserved. |
| Judge walkthrough | [Source-to-browser guide](JUDGE_GUIDE.md), enhanced two-path local HTTP rehearsal and simulation-only captions. The guide uses a separate port/state root and preserves existing Sandbox records. Actual AI evidence is available; private judge integration access remains pending. |
| Free-only AI route | Existing owner OpenRouter key loaded normally, explicit free variants and zero-price/no-fallback guards. [Eight cumulative attempts](MODEL_QUALIFICATION.md) include three valid Nvidia advisory results and reported USD 0 completed-request cost; earlier failures and quality errors remain visible. |

## Engineering evidence and follow-up

1. **Model integration:** functional free-only Nvidia advice is observed for delivery, ambiguity and hostile-input cases. [Exact cumulative evidence](MODEL_QUALIFICATION.md): eight requests, three accepted results, six completed Nvidia responses reporting USD 0; rejected-request usage unavailable. Rationale accuracy and uncertain-deadline confirmation still need buyer review. Keep explicit free routing/no paid fallback; no additional spending approval is needed for the existing authorized free scope.
2. **Provider negative cases:** #5 success/receipt is observed; actual canceled/declined approval is unqualified. Further Sandbox activity requires its own exact scope. No further transaction was performed during this preparation.
3. **Hosted Actions resource restriction:** exact-head `eae9c58` run [38279967305](https://github.com/Whyme-Labs/vowrail/actions/runs/38279967305) has zero executed steps. Its annotation explicitly reports failed recent account payments or a spending-limit restriction. This is GitHub's hosted runner restriction, not an extra approval requirement for routine tests or a code-test failure. Repository runner inventory reports zero registered self-hosted runners; no authorized home-ci route was discovered locally. Existing Mac Node capacity completes the engineering checks without hosted minutes, artifact storage or billing changes. See [exact-head verification](VERIFICATION.md). Hosted Actions remains red until account allocation is restored, but does not block local engineering validation.
4. **Release preparation:** finish the source/history/assets review, identify the exact release SHA, map existing English copy and safe app artifacts to the actual form fields, verify the selected judge-access instructions, and check public URLs after separately authorized publication. These are preparation tasks; the owner decisions are listed above. The current repository stays private and PR16 stays draft.

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
