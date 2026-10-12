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

## Demo preparation

Use the [rehearsal and final-video shot plan](DEMO.md). The separate [actual Sandbox purchase](PAYPAL_EVIDENCE.md) now has verified API, dashboard and restart evidence. Real model qualification remains pending; its [one-call plan](MODEL_QUALIFICATION.md) is prepared. Keep simulated sellers distinct from the receiving Sandbox merchant and factual claims tied to observations.

## Submission gates

G0 docs and issue roadmap reviewed.
G1 backend state machine, deterministic tests and CI green.
G2 complete accessible local demo for creating mandates and comparing offers.
G3 required meaningful real AI use demonstrated with exact provider/model and observed advice; deterministic policy remains authoritative. The app can run without AI, but fallback does not qualify this competition gate.
G4 PayPal Sandbox order, buyer approval, API-verified capture demonstrated; ambiguity and retry behavior tested.
G5 product usability, failure flows, accessibility and video recording finished.
G6 public repo license/IP/secrets review, no fake functionality, Devpost fields submitted before deadline.

## Credential ownership

Developer must provision PayPal Sandbox app credentials outside GitHub source control. All demo payment calls go only to `api-m.sandbox.paypal.com`. A separate Sandbox buyer account is needed for approval. Do not place passwords or secrets in the public repository or demo recording.
