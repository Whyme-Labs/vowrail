# Implementation status

**Snapshot:** 11 October 2026. **Repository:** Whyme-Labs/vowrail. **Visibility:** PRIVATE.

## Committed

- Product requirements, security/threat model, draft negotiation profile, interface/HTTP API, competition requirements, runbook, experimental evaluation plan, architecture decisions and MIT license.
- Single-process policy gateway with a private buyer mandate, authorized 0–2 negotiation rounds, idempotency-key replay handling, minimal merchant request projection, quote validation and budget-gated checkout.
- Browser console with synthetic merchant bidding and event history. Earlier valid bids remain selectable until expiry.
- A configurable buyer-side AI recommendation adapter and optional LLM-based **synthetic** merchant with seller-side price bounds. These require developer-supplied model credentials. They have **not** been exercised against a live model provider yet.
- PayPal **Sandbox-only** OAuth and Orders v2 create, approval verification and capture adapter. The integration has not been run against real Sandbox credentials; automated tests use mocks.
- Unit tests for mandate/round/payment controls, concurrency, seller outputs, AI adapter and local HTTP API, plus GitHub Actions workflow.

## Validation evidence

- Isolated V8 execution of the actual committed core, seller and PayPal adapter sources: 29 test cases passed with substitutes for Node URL/Buffer.
- Additional in-memory HTTP handler simulation passed: create intent, run two rounds, reject third, preserve earlier bid, give deterministic recommendation, reject PayPal checkout without credentials, reject cross-origin mutation.
- These are useful interim checks **but are not equivalent to npm test running in actual Node**.
- GitHub Actions runs, including [38118628003](https://github.com/Whyme-Labs/vowrail/actions/runs/38118628003), failed before running any job steps. GitHub reported no assigned runner / no steps. Exact account or runner configuration cause has not been established. **CI gate remains open** in issue #1.
- No real AI inference and no real PayPal Sandbox checkout have been verified. Do not count G3 or G4 as complete.

## Priority blockers

1. [#1 Verify CI execution](https://github.com/Whyme-Labs/vowrail/issues/1): have a working GitHub Actions runner, then confirm npm test + smoke.
2. [#4 Real buyer and merchant AI](https://github.com/Whyme-Labs/vowrail/issues/4): run model-backed experiment and record measured inputs/outcomes.
3. [#5 PayPal Sandbox E2E](https://github.com/Whyme-Labs/vowrail/issues/5): configure account credentials privately and verify approve/capture.
4. [#6 Durable state and reconciliation](https://github.com/Whyme-Labs/vowrail/issues/6): mandatory before any publicly exposed or unattended payment service.
5. [#9 Public repository](https://github.com/Whyme-Labs/vowrail/issues/9) and [#10 Devpost submission](https://github.com/Whyme-Labs/vowrail/issues/10): review secrets/license/IP, publish before contest and submit public demo video.

## Known limitations

This is a single-process unauthenticated local demo. Never bind to a public interface, use production payment credentials or treat synthetic merchants as real PayPal payees. The demo's PayPal account would receive simulated purchase amounts in Sandbox only. Merchant offers are nonbinding; the model provider receives sanitized buying data when enabled but may still infer intent. No certification, universal price optimality, zero-leakage or external merchant verification is claimed.

For detailed gates, see [ROADMAP.md](ROADMAP.md) and [HACKATHON.md](HACKATHON.md).
