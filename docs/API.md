# Local HTTP API (experimental)

Base URL: `http://127.0.0.1:8787`. JSON only for POST. **No authentication; do not expose publicly.**

The separate [Workers transport](WORKERS.md) exposes the same operations with mandatory session ownership and CSRF. `GET /api/health` bootstraps a signed HttpOnly browser cookie and returns its CSRF proof; subsequent POST requests must send that cookie, the exact website Origin and `X-Vowrail-CSRF`. `/demo/api/...` selects the isolated hosted simulator. The existing checkout-mode header detects stale tabs and cannot change an intent's stored mode. Time-window traffic limits return `429` with `Retry-After`. The permanent per-session intent-capacity limit returns `429 SESSION_LIMIT` without a retry window or that header. The Worker health includes `hosted`, `sourceCommit`, `store: "durable-object-sqlite"` and explicit free-model metadata, never credentials.

| Endpoint | Function |
|---|---|
| `GET /api/health` | Server status, `checkoutMode`, `checkoutConfigured`, and AI/PayPal configured flags; not secrets or successful-provider evidence |
| `POST /api/intents` | Create mandate from `{item, quantity, requirements, currency:"USD", maxTotalMinor, maxRounds}` |
| `GET /api/intents/:id` | Public-facing state, offers, decisions and event history; no private ceiling in seller requests |
| `POST /api/intents/:id/rounds` | Reserve and execute exactly one coordinated round, subject to max rounds |
| `POST /api/intents/:id/recommend` | Advisory AI recommendation if configured; otherwise deterministic fallback marked as such. `reason` is unverified model text, not a checked price or delivery claim. |
| `POST /api/intents/:id/checkout` | `{offerId}`; creates an order in the server-selected checkout mode only after checks |
| `POST /api/intents/:id/capture` | `{orderId}`; verify intent, approval, amount and active mandate, then capture once on explicit buyer action; completed retries return the stored receipt |
| `POST /api/intents/:id/reconcile` | `{}`; read the stored PayPal order ID and verify any completed capture; never sends another capture or accepts a caller-supplied order ID |
| `GET /api/intents/:id/simulation-approval` | Simulation only: locked offer/order summary, excluding the private cap |
| `POST /api/intents/:id/simulation-approval` | Simulation only: `{orderId}`; validate binding and active mandate, then mark local consent; does not capture |

Errors: JSON object `{error:{code, message}}`, with 400 validation errors, 404 missing intents/offers, 409 state and policy conflicts, and 503 unconfigured provider or `STORAGE_UNAVAILABLE`. Exact endpoint response fields follow source implementation. Health returns `store: "local-file-journal"` for the server and HTTP 503 with `ok: false` and `checkoutConfigured: false` after a gateway or simulated-provider checkpoint failure. All gateway state reads and actions then reject with 503; configuration-presence flags are not proof of availability.

Environment:
- `HOST=127.0.0.1`; `PORT=8787`
- `VOWRAIL_STATE_DIR=.vowrail/journal`: private local checkpoint directory, retained across restarts.
- `PUBLIC_BASE_URL` for PayPal Sandbox approval callbacks; choose a reachable approved origin.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: PayPal **Sandbox** only.
- `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`: optional compatible chat-completions API.
- `OPENROUTER_API_KEY`: existing key selects official free-only routing; optional `OPENROUTER_MODEL` must end in `:free` and cannot be an automatic router. It takes precedence over legacy settings.
- No runtime secrets in client-side JS.

Model HTTP requests have a 10-second deadline, an 8 KiB UTF-8 serialized-body limit and `max_completion_tokens: 256`. Oversized input rejects before transport rather than truncating policy text. A compatible chat-completions provider must accept that output bound; failures follow the labeled deterministic fallback without retry. These limits do not authorize inference spending.

`DEMO_MODE=1` explicitly selects the local simulator (`npm run demo`). It constructs neither PayPal nor model adapter, ignores inherited provider configuration and uses local approval links only. `SIMULATE_LOST_CAPTURE=1` is accepted only in this mode (`npm run demo:recovery`) and injects one persisted capture with a lost response per process. Default startup is unchanged: `paypal_sandbox`, never a live provider or an automatic simulator fallback. Simulation pages/endpoints return 404 in the default mode.

Checkout responses persist `checkout.mode` as `simulation` or `paypal_sandbox`. Legacy records without the field are interpreted as PayPal Sandbox. Loading records from the other mode refuses startup. The shipped browser sends `X-Vowrail-Checkout-Mode` on every POST; a mismatch returns 409 `CHECKOUT_MODE_MISMATCH` before mutation. This header detects stale tabs, is not authentication, and cannot select a server mode. It remains optional for existing clients. `paypalConfigured` is always false in simulation; `checkoutConfigured` refers to the active adapter. Simulated receipts/events remain explicitly labeled.

The server restores checkout references from its local journal. Never submit a transaction twice after an ambiguous failure; use the existing intent's read-only reconciliation. Do not delete or substitute the journal to reset a payment lock.

## Checkout recovery

An order still in `CREATED` or `PAYER_ACTION_REQUIRED` remains `AWAITING_BUYER_APPROVAL` after an early capture request returns HTTP 409 `ORDER_NOT_APPROVED`. Approval, cancellation redirects and browser refresh do not themselves capture a payment.

Reconciliation reserves `RECONCILIATION_IN_PROGRESS` before reading the order. It verifies order ID, `CAPTURE` intent, one purchase unit, the intent's `reference_id`, and the exact locked USD amount. Completion requires one capture with a nonempty valid ID, status `COMPLETED`, matching currency/amount, and order status `COMPLETED`. Only the sanitized order/capture references and decision events are retained; raw payer/provider payloads are not returned.

If a capture was ever attempted, an approved order with no verified completed receipt stays `RECONCILIATION_REQUIRED`. No retry button or reconciliation read unlocks a second capture. If only the pre-capture read failed, a subsequent verified approval read can return to `AWAITING_BUYER_APPROVAL` for a first explicit capture. Expired mandates cannot issue a capture, but read-only receipt recovery remains available.

Unknown order ID after a lost create response yields `ORDER_REFERENCE_UNAVAILABLE`; inspect the Sandbox dashboard manually. OAuth and Orders HTTP requests each have a 10-second timeout. Interrupted checkout states become `RECONCILIATION_REQUIRED` on restart; attempted capture flags and request IDs survive. See [local journal recovery](LOCAL_JOURNAL.md) for the exact scope.

The browser refreshes gateway state after failed actions. If that read also fails, it displays `STATUS UNAVAILABLE` and disables execution until a successful refresh; read-only recovery remains available. Capture responses undergo the same order intent/reference/amount checks as order reads before a receipt is recorded.

For a known order whose create response was interrupted before the approval link was saved, reconciliation can recover a validated `approve` or `payer-action` Sandbox link from the authoritative order. An approved order needs no link to expose the explicit verification/capture control. Unapproved orders without a valid link remain unresolved; existing capture attempts are never reopened.


## Optional synthetic AI merchant

Set `AI_MERCHANTS=1` **with** `AI_API_KEY` and `AI_MODEL` to replace one scripted merchant with a model-driven simulated merchant. Each run makes up to one additional model API call per negotiation round. The AI merchant receives only the public request and its own synthetic price floor/ceiling. Gateway checks the output independently; failed or invalid bids are rejected. The AI merchant is not a real business, cannot receive actual PayPal payouts, and does not establish fairness or reliable negotiation performance.

OpenRouter requests use `max_tokens:256`, zero `provider.max_price` for prompt/completion/request, `allow_fallbacks:false`, `require_parameters:true` and no model fallback array. Rate errors follow labeled deterministic fallback without another request. Explicit simulation ignores OpenRouter settings.
