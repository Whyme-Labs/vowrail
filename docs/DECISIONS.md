# Architecture decision records

## ADR-001: deterministic enforcement owns decisions
**Accepted 2026-10-11.** The LLM proposes, the gateway validates. Model outputs cannot mutate a mandate, raise limits or directly call payment credentials. A model prompt is not an enforcement mechanism.

## ADR-002: two-round default, configurable authorized cap
**Accepted 2026-10-11.** Zero bargaining rounds are allowed for posted-price flow; two is the consumer demo default. A round means one coordinated opportunity for sellers, not every message. Max is part of buyer mandate and cannot silently reset across retries.

## ADR-003: in-process prototype before distributed deployment
**Accepted with explicit limitation 2026-10-11.** Use Node 22+ standard libraries and in-memory state to make a reproducible, dependency-free hackathon slice. All money values integer minor units. Production deployment is blocked until we have durable transactional state, authentication and payment reconciliation.

## ADR-004: one Sandbox payee while sellers are simulated
**Accepted 2026-10-11.** Real payment using PayPal Orders v2 is central to the contest. The demo's seller quotations are synthetic, and checkout uses the configured demo PayPal merchant, not the simulated merchant's account. Communicate this plainly.

## ADR-005: privacy by construction
**Accepted 2026-10-11.** Seller adapters only receive a manually constructed public request. Never hand a full intent object to a merchant. Remote model recommendations see only eligible offers and public requirements, rather than the ceiling. This reduces direct leakage but does not prevent inference, covert channels if free text is allowed, or operator compromise.

## ADR-006: do not build another payment authorization standard
**Accepted 2026-10-11.** Vowrail is an experimental negotiation policy profile. Reuse well-supported OAuth and PayPal constructs; study AP2/UCP/A2A for interoperability later. Avoid falsely claiming certification or adoption.
