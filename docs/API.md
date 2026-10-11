# Local HTTP API (experimental)

Base URL: `http://127.0.0.1:8787`. JSON only for POST. **No authentication; do not expose publicly.**

| Endpoint | Function |
|---|---|
| `GET /api/health` | Server status and whether AI/PayPal are configured, not secrets |
| `POST /api/intents` | Create mandate from `{item, quantity, requirements, currency:"USD", maxTotalMinor, maxRounds}` |
| `GET /api/intents/:id` | Public-facing state, offers, decisions and event history; no private ceiling in seller requests |
| `POST /api/intents/:id/rounds` | Reserve and execute exactly one coordinated round, subject to max rounds |
| `POST /api/intents/:id/recommend` | Advisory AI recommendation if configured; otherwise deterministic fallback marked as such |
| `POST /api/intents/:id/checkout` | `{offerId}`; creates PayPal Sandbox order only after checks |
| `POST /api/intents/:id/capture` | Verify order approval and amount, then capture once after PayPal redirect |

Errors: JSON object `{error:{code, message}}`, with 400 validation errors, 404 missing intents/offers, 409 state and policy conflicts, and 503 unconfigured provider. Exact endpoint response fields follow source implementation.

Environment:
- `HOST=127.0.0.1`; `PORT=8787`
- `PUBLIC_BASE_URL` for PayPal Sandbox approval callbacks; choose a reachable approved origin.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: PayPal **Sandbox** only.
- `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`: optional compatible chat-completions API.
- No runtime secrets in client-side JS.

Developer note: all stored order references are process-local in M1. Restarting during checkout is not safe. Never submit a transaction twice after an ambiguous failure without reconciliation.


## Optional synthetic AI merchant

Set `AI_MERCHANTS=1` **with** `AI_API_KEY` and `AI_MODEL` to replace one scripted merchant with a model-driven simulated merchant. Each run makes up to one additional model API call per negotiation round. The AI merchant receives only the public request and its own synthetic price floor/ceiling. Gateway checks the output independently; failed or invalid bids are rejected. The AI merchant is not a real business, cannot receive actual PayPal payouts, and does not establish fairness or reliable negotiation performance.
