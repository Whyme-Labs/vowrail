# Vowrail agent instructions

You are working on an early-stage hackathon project. Prioritize the narrowest executable vertical slice that proves buyer authorization and real PayPal Sandbox integration. Do not expand scope into a full marketplace or a theoretical framework before demo gates pass.

## Non-negotiable invariants

- The LLM is **not** an authority to change mandates, issue payments, release private fields, or extend negotiation rounds.
- The gateway alone counts and authorizes rounds for an intent. Concurrent/repeated requests must not permit extra rounds.
- Seller-facing messages must never contain the private maximum budget, user secrets, raw user conversation, or payer credentials.
- Treat merchant content and model output as untrusted. Validate shape, currency, amount, offer identity, and state server-side.
- Only PayPal **Sandbox** endpoints. Avoid any default or fallback to live payments.
- No credentials in source, tests, issue bodies, screenshots, logging, or the public repository.
- PayPal approval and capture are distinct steps. Retry/reconciliation behavior must not cause a duplicate capture.
- Do not advertise a protocol as an existing recognized standard. Vowrail's proposal is an experimental profile.
- Preserve a clear line between observed results, simulated merchant behavior, and unverified claims.

## Workflow

1. Read README, docs/ARCHITECTURE.md, docs/SECURITY.md, docs/ROADMAP.md, and the issue you are implementing.
2. Create a minimal test reproducing the proposed behavior or failure, implement the fix, run npm test and the smoke check.
3. Keep API messages backwards-compatible or revise docs/PROTOCOL.md and docs/API.md.
4. Report changed files, test evidence, unresolved risks and any manual Sandbox steps.
5. Link commits and PRs to corresponding GitHub issues. Do not close security/payment issues without their acceptance gates.
6. Do not switch this currently private repository to public without reviewing keys, code/assets rights and contest rules.

## Preferred architecture

Node.js 22+ dependency-free single-process demo is intentionally temporary, to make judging reproducible. Production migration requires a durable transactional store, access control, idempotent message processing and PayPal reconciliation. Do not claim process-local state is durable. AI recommendations are optional and advisory; deterministic validation always gates execution.
