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
