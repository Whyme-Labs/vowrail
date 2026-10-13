# Submission readiness: 13 October 2026 MYT

The owner published the [accepted 90-second video](https://youtu.be/eAb3qrygLpA) on the verified Whyme Labs channel on 13 October 2026 (MYT), then made the existing MIT repository public after PR #16 was merged. Its MP4 and source identities remain frozen in the private review package. The complete local journey, one independently verified actual USD 207.00 Sandbox purchase/restart and three functional free-model advice cases are documented. Public source, license and setup guide are accessible without sign-in. Usable free integration test access and final terms/submission remain pending.

## Accepted cut and remaining owner decisions

Published file: `vowrail-sanitized-review-90s.mp4`, 90 seconds, 1920×1080, 30fps, 13,228,291 bytes; SHA256 `6f663e4bcfdb017c994f99b6b051178a81919a8764181044d711fb06c5208338`. Picture source: `fbf79114a3bc6975108500c9abd5ef769d79a7e9`; final audio edit: `dc07718619b8ed838f5d09965f61b4cd7638692b`. The original audio's final two seconds are removed before looping. Public/Published status and the 90-second player were verified. No further video edit is planned.

| Release item | Observed state and next step |
|---|---|
| Audio/video | Complete. The owner confirmed audio public-use permission and published the accepted cut on the verified Whyme Labs channel. The existing public video is preserved. |
| Repository release | Complete. PR #16 was normally merged as `1f63210777bb952964aacbba2ffe5ebd663824da`; its tree matches tested head `4e35845918970af53f883069b03c664c3a9dfca3`. The owner made Whyme-Labs/vowrail public. Anonymous access and GitHub's detected MIT license were verified. The [audit](RELEASE_AUDIT.md) identified no real credentials within its scope; history and evidence were preserved. |
| Judge access | Use the local Node 22 route. Dedicated entrant test access is recommended, not mandated by the rules; judge-owned existing credentials are technically supported. The rules leave credential ownership unspecified while requiring usable free testing. [Access choices and prerequisites](JUDGE_GUIDE.md) distinguish the rule from the recommendation. |
| Final declarations/entry | The existing Individual draft is at 4/5 steps. Its owner answers, eligibility confirmations, factual sponsor selection, video, corrected integration text and public working-build guide URL were saved and reread. The project story now records actual evidence and limitations. Private integration access remains pending. Final terms remain unchecked and Submit has not been clicked. |

The [official rules](https://paypalaihackathon.devpost.com/rules) were read again on 13 October: public open-source repository, public YouTube video under three minutes, functional free judge access and permitted third-party material. Deadline: **13 November 2026, 04:00 MYT**. Keep the private package and Library metadata out of the public repository.

## Ready for review

| Deliverable | Evidence |
|---|---|
| Buyer journey and deterministic authority | Mandate, private cap, two rounds, normalized offers, explicit review/selection, separate approval and capture. [Runbook](RUNBOOK.md). |
| Actual PayPal success path | [Sandbox observations](PAYPAL_EVIDENCE.md), sanitized JSON and app-only receipt crop. One capture, independently checked; older orders uncaptured. |
| Local crash/retry behavior | Attempt locks, preserved order references, no capture from reconciliation, restored receipt. Synthetic SIGKILL/HTTP regressions plus actual completed receipt restart. |
| Actual Node validation | Tested head `4e35845918970af53f883069b03c664c3a9dfca3`, Node 22.23.0: **124 tests passed**, zero failures/cancellations/skips, 7.051 seconds; clean-source sequential coverage, smoke and both bounded HTTP rehearsal paths passed. Also checked 45 JavaScript syntax files, 132 local Markdown links and 11 JSON files. Merged main has the same tree. Later changes receive separate exact-head evidence in their PR. [Verification method](VERIFICATION.md). |
| Review follow-up | Storage-health gap reproduced during simulated approval/capture, then fixed in `f55b467`. Gateway actions and HTTP health now fail closed after either journal fails. [Separate review reports](PR16_REVIEW.md). |
| Demo materials | Owner-published [90-second Remotion cut](FINAL_DEMO.md), 15 continuous English captions, checked audio/video and exact source/file identity; [factual English copy](SUBMISSION_COPY.md). Prior cuts remain preserved. |
| Judge walkthrough | [Source-to-browser guide](JUDGE_GUIDE.md), enhanced two-path local HTTP rehearsal and simulation-only captions. The guide uses a separate port/state root and preserves existing Sandbox records. Actual AI evidence is available; private judge integration access remains pending. |
| Free-only AI route | Existing owner OpenRouter key loaded normally, explicit free variants and zero-price/no-fallback guards. [Eight cumulative attempts](MODEL_QUALIFICATION.md) include three valid Nvidia advisory results and reported USD 0 completed-request cost; earlier failures and quality errors remain visible. |

## Engineering evidence and follow-up

1. **Model integration:** functional free-only Nvidia advice is observed for delivery, ambiguity and hostile-input cases. [Exact cumulative evidence](MODEL_QUALIFICATION.md): eight requests, three accepted results, six completed Nvidia responses reporting USD 0; rejected-request usage unavailable. Rationale accuracy and uncertain-deadline confirmation still need buyer review. Keep explicit free routing/no paid fallback; no additional spending approval is needed for the existing authorized free scope.
2. **Provider negative cases:** #5 success/receipt is observed; actual canceled/declined approval is unqualified. Further Sandbox activity requires its own exact scope. No further transaction was performed during this preparation.
3. **Hosted Actions resource restriction:** tested head `4e35845` run [38398440720](https://github.com/Whyme-Labs/vowrail/actions/runs/38398440720) has zero executed job steps. Its annotation reports failed recent account payments or a spending-limit restriction. Existing Mac Node checks passed separately without billing changes. See [exact-head verification](VERIFICATION.md). Hosted Actions allocation and local code validation remain distinct.
4. **Submission preparation:** public source, detected MIT license, published video and the source setup guide are verified. The draft's working-build field points to the public judge guide. Complete the private free integration-access arrangement, then let the owner review and approve final terms/submission. No new credential, paid model request or payment is needed to prepare these materials.

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
