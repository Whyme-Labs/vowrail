# Roadmap, issue plan and acceptance gates

Baseline: 11 October 2026. Deadline: 13 November 2026, 04:00 MYT.

## Milestone M0: project foundation (target 11 Oct)
- Product/architecture/protocol/security docs, source layout, MIT license, CONTRIBUTING/AGENTS, issue backlog and CI.
- Gate: source and docs visible in repository; README cross-links work; no secrets; Node 22+ tests pass.

## Milestone M1: deterministic purchase boundary (target 15 Oct)
- Immutable buyer mandate; common intent identifier; atomic in-process reservation of rounds; private public-projection boundary; normalized synthetic offers; checks at checkout.
- Gate: tests cover cap=0/1/2, parallel attempts, malformed seller payloads, offer IDs/currencies, budget ceiling and selected-offer locking.

## Milestone M2: judge-friendly interactive app (target 20 Oct)
- Responsive UI: mandate, competing offers, timeline, errors, refused third round, selectable quote and checkout status.
- Gate: fresh machine can npm start and complete two-round simulation using synthetic data, without API keys.

## Milestone M3: meaningful AI capability (target 25 Oct)
- Configurable model-assisted buyer selection, optional agent-to-agent merchant negotiation, adversarial merchant prompts and measured baseline.
- Gate: demonstrate at least one actual model call with provider/model disclosed and recorded inputs; test that malicious model output cannot spend, extend rounds or access private cap.

## Milestone M4: PayPal Sandbox transaction (target 30 Oct)
- OAuth2 credentials, Orders v2 creation, buyer approval return, amount/currency re-read, capture, idempotency and recovery tests.
- Gate: real Sandbox create/approve/capture flow observed and sanitized proof in docs. No live credentials/routes.

## Milestone M5: resilience + evaluation (target 5 Nov)
- Durable intent/outbox design or implementation, reconciliation/cleanup, authentication for any hosted deployment, fail-closed cases and reproducible experiments.
- Gate: no silent duplicate checkout on retries or ambiguity. If durability incomplete, explicitly restrict showcase to local demo.

## Milestone M6: submission (target 10 Nov)
- Publish under open-source license after secret/IP scan; usability and accessibility checks; three-minute public YouTube demo; Devpost entry; judge instructions.
- Gate: complete checklist against https://paypalaihackathon.devpost.com/rules and final independent clean setup validation.

## Priority discipline

P0: a real PayPal Sandbox purchase plus working model-driven shopping within enforced boundaries.
P1: adversarial evidence and polished interface.
P2: open formal protocol, multi-provider integrations and production hardening.
Not in hackathon scope: full multi-merchant settlement, paid customer onboarding, decentralized identity, legally binding certification.

## Definition of done for each GitHub issue

- Reproducible steps and measurable acceptance criteria.
- Automated tests or specifically documented manual verification.
- Docs updated where behavior/interface changes.
- Limitations stated; no unsupported security guarantees.
- A commit/PR referenced. Mark blocked instead of implying completion.

## Linked issues (15)

| Issue | Priority | Owner of next acceptance gate |
|---|---|---|
| [#1](https://github.com/Whyme-Labs/vowrail/issues/1) foundation CI | P0 | Verify runner and actual Node test output |
| [#2](https://github.com/Whyme-Labs/vowrail/issues/2) negotiation policy | P0 | Harden and prove mandate invariants |
| [#3](https://github.com/Whyme-Labs/vowrail/issues/3) buyer console | P0 | Accessibility and browser usability verification |
| [#4](https://github.com/Whyme-Labs/vowrail/issues/4) real AI | P0 | Actual model-driven seller/buyer experiment |
| [#5](https://github.com/Whyme-Labs/vowrail/issues/5) PayPal Sandbox | P0 | End-to-end real Sandbox receipt |
| [#6](https://github.com/Whyme-Labs/vowrail/issues/6) durability | P0 | Durable reconciliation + concurrency |
| [#7](https://github.com/Whyme-Labs/vowrail/issues/7) benchmark | P0 | Reproducible adversarial and economic metrics |
| [#8](https://github.com/Whyme-Labs/vowrail/issues/8) deployment security | P0 | Access control before hosted service |
| [#9](https://github.com/Whyme-Labs/vowrail/issues/9) public release | P0 | Owner changes visibility after audit |
| [#10](https://github.com/Whyme-Labs/vowrail/issues/10) submission | P0 | Demo video and Devpost |
| [#11](https://github.com/Whyme-Labs/vowrail/issues/11) authenticated offers | P1 | Signed/normalized real merchant quotes |
| [#12](https://github.com/Whyme-Labs/vowrail/issues/12) schemas | P1 | Protocol conformance tests and SDK |
| [#13](https://github.com/Whyme-Labs/vowrail/issues/13) round economics | P1 | Empirical 0/1/2-round evaluation |
| [#14](https://github.com/Whyme-Labs/vowrail/issues/14) Channel3 | P2 | Optional product discovery |
| [#15](https://github.com/Whyme-Labs/vowrail/issues/15) buyer-interest policy | P1 | Auditability and conflict disclosures |

Keep P0 payment and AI gates ahead of protocol abstraction. See [STATUS.md](STATUS.md) for observed progress rather than counting open issue descriptions as finished work.
