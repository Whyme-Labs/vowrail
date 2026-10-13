# Engineering verification and runner status

Routine syntax, Node tests, smoke and local HTTP rehearsal are authorized project work. No additional owner permission is needed for them. They run sequentially on the existing Mac with a 30-second watchdog per command, synthetic transports and temporary journals. No GitHub artifact upload, hosted dispatch, new runner registration or provider payment is needed.

## Exact-head evidence

The final draft PR head is checked from a clean `git archive` export, with no `.env`, private journals or untracked files. All shipped JavaScript gets `node --check`; the full Node suite, smoke and both HTTP rehearsal paths execute from that exported commit. Relative Markdown links and JSON artifacts are checked too. The draft PR's `local/node22` commit status and issue/PR comment record the full SHA, Node version, actual counts/duration and command results after execution. A result is posted only after the exported commit passes. Local logs stay in the task's private evidence directory.

The last earlier validation was 104 passing tests at runtime commit `f55b467`; it preceded the small model request/output-bound follow-up. Do not reuse that count as verification of a later head. The final comment/status is the source of truth for the exact successor.

## What the hosted restriction means

For `eae9c58492239dfea38eb8e74d5024b7c1948415`, [Actions run 38279967305](https://github.com/Whyme-Labs/vowrail/actions/runs/38279967305) completed as failure with zero executed job steps. Check annotation `114914596353` states that the job was not started because recent account payments failed or the spending limit needed increasing. That is a hosted resource/account restriction, not a source test failure or a request for permission to run local tests.

Read-only repository runner inventory reported zero registered self-hosted runners. Local project inventory, relevant Codex memory and SSH host aliases exposed no existing authorized home-ci route. The available Mac can execute this lightweight suite; no new CI infrastructure is necessary for the engineering verification loop. If a home-ci route is later supplied, use its existing approved capacity rather than registering or provisioning one automatically.

The GitHub connector could read workflow/jobs/steps but received `403 Resource not accessible by integration` for combined commit statuses. The existing GitHub CLI session successfully read exact-head check runs and annotations. That connector permission limitation is separate from runner availability; do not mistake it for a test failure.

Hosted Actions remains visibly red until its account resource restriction is resolved. A separately labeled `local/node22` status reports the actual Mac verification and does not relabel the failed hosted run. Restoring hosted allocation is optional for continuing local engineering work; it requires account-owner action only if hosted CI is desired. No billing change or repeated run dispatch was performed.
