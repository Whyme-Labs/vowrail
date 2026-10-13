# Vowrail

**AI negotiates. You stay in control.**

Vowrail is an open-source, buyer-controlled negotiation and transaction policy gateway for agentic commerce. A language model may propose purchases or negotiate; a deterministic reference monitor controls the rounds, authorizations, permitted disclosures, and payment execution.

> **Status: pre-release hackathon prototype.** Sandbox only, local single-process development. Do not use with live payments, real purchasing authority, or sensitive customer data. This implementation is neither an industry standard nor a certified security product.

Watch the [published 90-second demo](https://youtu.be/eAb3qrygLpA). It labels the local simulation and the separate historical model and PayPal Sandbox observations. Use the [Node 22 judge walkthrough](docs/JUDGE_GUIDE.md) to run the complete credential-free simulation locally.

## Why

Autonomous agents can negotiate or shop on someone's behalf, yet the agent may see private information that merchants should not, and its recommendations may be biased or incorrect. A prompt cannot reliably enforce spending limits, a maximum negotiation round count, or a user's authorization.

Vowrail separates:
1. **Mandate**: what the buyer authorized, including a private spend ceiling.
2. **Agents**: probabilistic suggestions, seller interactions, and offer evaluations.
3. **Gateway**: mandatory, deterministic state transitions and authorization checks.
4. **Execution**: a PayPal **Sandbox** checkout that cannot bypass the selected-offer policy.
5. **Evidence**: policy events and checkout locks retained in a local journal across server restarts.

A round is a *single coordinated opportunity* for participating merchants to submit offers for one buyer intent, not one LLM message or one seller response. The proposed consumer default is at most two negotiation rounds, with a buyer-approved configurable limit.

## Run locally

Requires Node.js **22+**. The reference implementation has no runtime npm dependencies.

```sh
npm test -- --test-concurrency=1
npm run smoke
npm run rehearse
npm run demo
# Open http://127.0.0.1:8787
```

`npm run demo` completes the entire **local simulation** without credentials: mandate, two merchant rounds, labeled deterministic advice, offer review, separate simulated buyer approval, explicit capture and simulated receipt. Persistent labels distinguish it from PayPal. This mode ignores inherited PayPal/model settings and constructs neither remote adapter; no money moves or external provider request is made. `npm run rehearse` checks the normal and lost-response/restart journeys over bounded real loopback HTTP, emits honest JSON evidence and cleans its temporary synthetic records. `npm run demo:recovery` injects one lost capture response per server process for the browser rehearsal; use read-only receipt recovery afterward.

`npm start` selects the actual **PayPal Sandbox** adapter. Without credentials, negotiation and review work, and order creation explains the missing configuration. Review shows the stored total, delivery, expiry and remaining budget. Creating a Sandbox order is a separate explicit action; buyer approval and capture remain distinct steps. A model-assisted buyer recommendation is optional and must be configured explicitly; deterministic fallback is identified as non-AI. With `AI_MERCHANTS=1` and model credentials, one synthetic merchant also uses a real model call for each round, with fixed seller-side bid bounds.

`npm start` preserves synthetic mandates, offers, round replay records and payment references in the ignored `.vowrail/journal/` directory. Keep that directory across restarts; set `VOWRAIL_STATE_DIR` to choose another private local directory. Interrupted checkout resumes through read-only reconciliation, with attempted captures still locked. See [local journal recovery](docs/LOCAL_JOURNAL.md). No credentials or raw payer payloads are stored there.

Simulation uses separate `.vowrail/simulation/gateway/` and `provider/` journals. A simulation receipt cannot be loaded as a PayPal checkout. Preserve both journals to rehearse recovery. **Start a new purchase** creates a new explicit mandate without deleting old records. The simulator demonstrates controls; it does not satisfy the real AI or Sandbox integration gates.

To exercise **real PayPal Sandbox** APIs, copy `.env.example` into your own environment and set the credentials in the shell before starting the server. `node --env-file=.env` is supported on Node 22+. The demo merchant is one configured PayPal Sandbox account; simulated sellers are **not** onboarded PayPal merchants.

```sh
node --env-file=.env src/server.js
```

Never commit client secrets. There are **no live PayPal endpoints** in the prototype.

An existing `OPENROUTER_API_KEY` selects strict free-only advice ahead of legacy settings: explicit `nvidia/nemotron-3.5-lightning:free`, zero prompt/completion/request price caps and no provider/model fallback. Optional `OPENROUTER_MODEL` must be an explicit `:free` variant. Three actual Nvidia advice cases now parse and preserve gateway authority, with reported USD 0 cost. Earlier Google 429s, truncated responses and model-quality errors remain in the [qualification report](docs/MODEL_QUALIFICATION.md). No paid fallback is used. Simulation ignores all model settings.

One owner-authorized **USD 207.00 Sandbox purchase** completed on 12 October, with independently verified capture and restart receipt recovery. [Actual Sandbox evidence](docs/PAYPAL_EVIDENCE.md) is separate from the local simulator. Three actual free-model advisory results are now observed; [model evidence and limitations](docs/MODEL_QUALIFICATION.md) are recorded.

## Documentation

- [Current implementation status and blockers](docs/STATUS.md)
- [Judge walkthrough and evidence guide](docs/JUDGE_GUIDE.md)
- [Submission readiness and exact remaining inputs](docs/READINESS.md)
- [Current honest demo script and submission checklist](docs/DEMO.md)
- [Reusable demo assets and evidence provenance](docs/demo-assets/README.md)
- [Factual English project-description draft](docs/SUBMISSION_COPY.md)
- [Buyer-flow accessibility evidence and remaining checks](docs/ACCESSIBILITY.md)
- [Product requirements](docs/PRODUCT.md)
- [Architecture and trust boundaries](docs/ARCHITECTURE.md)
- [Proposed negotiation protocol](docs/PROTOCOL.md)
- [Security model and limitations](docs/SECURITY.md)
- [Hackathon eligibility, deliverables and deadlines](docs/HACKATHON.md)
- [Milestones, acceptance gates and backlog](docs/ROADMAP.md)
- [API and developer guide](docs/API.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Local journal and restart recovery](docs/LOCAL_JOURNAL.md)

Progress is tracked in [GitHub issues](https://github.com/Whyme-Labs/vowrail/issues). The focus is a functional, experimentally validated submission for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/). Deadline: **12 November 2026, 12:00 PST** (**13 November, 04:00 MYT**). The rules require a working AI + PayPal application, public open-source repository, and public demo video under three minutes.

**Repository visibility is public.** The owner published this existing MIT repository after PR #16 was merged and the source/history audit completed. The [judge guide](docs/JUDGE_GUIDE.md) includes public clone and local run instructions. Usable free integration access and final competition terms/submission remain pending; the credential-free simulator runs without accounts or keys.

## Scope and honesty

The reference demo has local journal recovery, scripted seller bids, no buyer login and no merchant authentication. The journal is for a small local demo on one trusted machine; it is not a hosted transactional database or a production-secure wallet. The issue backlog tracks authentication, real AI negotiation, real Sandbox evidence, durable deployment and payment recovery.

## License

MIT. See [LICENSE](LICENSE).

## Responsible use

Use sandbox credentials and synthetic data only. The system must never claim to find the globally cheapest offer or prevent all information leakage. See [SECURITY.md](docs/SECURITY.md) for the actual threat model.
