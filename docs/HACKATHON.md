# PayPal AI Hackathon 2026 submission plan

**Rules source:** https://paypalaihackathon.devpost.com/rules

**Submission opens:** 1 Oct 2026. **Closes:** 12 Nov 2026 at 12:00 PST, **13 Nov 2026 at 04:00 Malaysia time**. Confirm final clock before submission.

## Non-negotiable eligibility and deliverables

- A *working app* integrating a PayPal developer platform feature with a meaningful AI tool/model. **Sandbox** is permitted.
- Public **open-source** source repository with detectably visible LICENSE and complete setup instructions.
- A functional app judges can run locally or reach on a hosted URL, free during evaluation.
- English project description, technologies used, screenshots and functioning video on **public YouTube**, under three minutes.
- Confirm official rules, entrant eligibility, branding/IP, registration, submission form, and any special award qualifications before the deadline.
- Currently this GitHub repo is **private**. A human owner/admin must make it public after security/IP review. GitHub connector does not expose the needed visibility operation here.

## Positioning

**Vowrail: Trust Infrastructure for Agentic Commerce.** The judge-facing demo is a buyer-agent app that negotiates with synthetic merchant agents, respects a private mandate, and completes a verified PayPal Sandbox order. The open specification is a supporting asset, not a replacement for a real product demonstration.

## Judging framing

Official rules score technological implementation, design, potential impact, innovation and presentation equally at 20% each. A functional UI and real payment matter as much as novel policy ideas.

## Proposed 2:55 video script

- 0:00–0:25: show the risk, agent may overspend or reveal a private cap.
- 0:25–1:00: buyer sets mandate, synthetic sellers bid in round 1.
- 1:00–1:40: optional AI advice, second round and blocked unauthorized third round; event trail.
- 1:40–2:20: PayPal Sandbox order approval and completed capture.
- 2:20–2:55: adversarial tests, transparent caveats, interoperability vision.

Show real, repeatable behavior. Do not imply a synthetic seller is a real PayPal recipient. Do not claim live merchant negotiation, universal lowest prices or a certified standard.

## Submission gates

G0 docs and issue roadmap reviewed.
G1 backend state machine, deterministic tests and CI green.
G2 complete accessible local demo for creating mandates and comparing offers.
G3 optional real AI model issues meaningful advice while deterministic policy remains authoritative.
G4 PayPal Sandbox order, buyer approval, API-verified capture demonstrated; ambiguity and retry behavior tested.
G5 product usability, failure flows, accessibility and video recording finished.
G6 public repo license/IP/secrets review, no fake functionality, Devpost fields submitted before deadline.

## Credential ownership

Developer must provision PayPal Sandbox app credentials outside GitHub source control. All demo payment calls go only to `api-m.sandbox.paypal.com`. A separate Sandbox buyer account is needed for approval. Do not place passwords or secrets in the public repository or demo recording.
