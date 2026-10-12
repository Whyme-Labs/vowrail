# Demo and validation runbook

## Prerequisites

- Node.js 22+ (no third-party packages required).
- Optional compatible chat-completions model credentials for a real AI recommendation.
- Optional PayPal **Sandbox** app ID/secret and separate sandbox buyer account.

## No-credential demo

```sh
npm test -- --test-concurrency=1
npm run smoke
npm run rehearse
npm run demo
```

Open http://127.0.0.1:8787.

For recording, use the [honest current demo script and submission checklist](DEMO.md). For responsive/keyboard reproduction and remaining assistive-technology checks, see [ACCESSIBILITY.md](ACCESSIBILITY.md).

1. Create synthetic print job, budget $220, two rounds.
2. Run round 1. Merchant quotes are synthetic; any quote outside cap cannot be paid.
3. Run round 2. Display new prices and original event history.
4. Attempt another round. The button is disabled. For a protocol-level proof run `npm test`, which sends a third-round request and asserts HTTP 409 `ROUND_LIMIT`.
5. Ask for advice. Without AI config it says **deterministic fallback**, not AI.
6. Click **Review offer**. Compare the stored total, delivery, quote expiry and remaining private budget. Quotes above budget state the exact excess and stay disabled. Reviewing or backing out does not create an order.
7. Press **Create simulated order** to lock the quote. Open the separate **simulated buyer approval** page, check its locked amount and approve. Returning without approval leaves the same order pending; opening the page again resumes it. Approval alone cannot capture.
8. Return to the app and explicitly press **Verify simulated approval and capture**. Check the completed **Simulated receipt**, mode disclosure and policy event. Reload preserves completion without requesting capture.
9. **Start a new purchase** returns to a fresh mandate form; previous records remain in the journal. Expiry disables execution without a network request.

For recovery, stop the normal demo, then run `npm run demo:recovery` and create a new mandate. Its first simulated capture persists a receipt and intentionally loses the response. The app shows `RECONCILIATION_REQUIRED` and removes capture. Press **Check simulated receipt (read only)**; completion must appear without another capture. Restarting the same mode with both journals preserved also permits read-only recovery. Do not delete records to retry.

If the simulated approval response is lost, consent may already be saved. The page marks its status unknown, disables another approval and offers a neutral **Return to purchase**. Reloading the approval page reads the saved status; it cannot approve or capture automatically. A failed response is never reported as successful cancellation.

For the unconfigured real-adapter view, stop the demo and use `npm start` with credentials unset. **Create PayPal Sandbox order** is disabled with a setup explanation; negotiation/review still work. It does not silently switch to simulation.

## Minimum local demo configuration

No credentials are needed for the complete simulator. Node 22+, one server bound to loopback and private persistent journals are sufficient. Defaults are `HOST=127.0.0.1`, `PORT=8787`. `npm start` uses `.vowrail/journal`; `npm run demo` uses `.vowrail/simulation/{gateway,provider}`. In simulation a custom `VOWRAIL_STATE_DIR` is a root containing those two subdirectories. Choose a separate root for each mode. Preserve the journals across restarts; do not run two writers against them or delete payment records to retry. Simulation ignores inherited provider settings, including `AI_MERCHANTS` and `PUBLIC_BASE_URL`.

For a separately authorized real-provider check, supply existing Sandbox app credentials as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`; set `PUBLIC_BASE_URL` to the intended buyer return URL. Optional model advice needs `AI_API_KEY` and `AI_MODEL`; `AI_BASE_URL` defaults to the OpenAI chat-completion endpoint and can point at a compatible provider. Keep `AI_MERCHANTS=0` for scripted merchants. Configured flags only mean nonempty settings, not that credentials or providers have been verified.

The supported configuration inputs are inherited environment variables or a developer-owned `.env` loaded explicitly with `node --env-file=.env src/server.js`. `.env.local` is not automatically loaded. If using `.env`, keep it ignored and owner-readable only (`chmod 600 .env`); enter secrets privately, never through chat, screenshots or issues. The app does not read a credential vault. No persistent access grant, cloud service, database or public hosting is necessary for this single-instance local demo.

## Real AI advisory demonstration

Before an actual call, use the [one-call qualification plan](MODEL_QUALIFICATION.md) to confirm provider/model compatibility, private configuration and explicit cost permission. Free-only OpenRouter use is authorized through the existing key; the current Nvidia route has three accepted actual advisory cases. No paid model call is authorized.

Set `AI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL`, using a provider compatible with chat completions. Restart. Ask for an offer recommendation. Inspect `ai_advisory` vs fallback in the HTTP response. The source `src/adapters/ai.js` makes an actual remote API call only when configured. There is no model key included in the repo. By default the merchant agents remain synthetic scripted price functions. Set `AI_MERCHANTS=1` to use one optional synthetic LLM merchant, with merchant-side price bounds still enforced by code. This is not a real merchant.

Model requests have a 10-second deadline covering both headers and response body. A timeout rejects the synthetic merchant's bid, preserves the consumed negotiation round and lets the other merchants' offers finish. Buyer recommendation failures return the explicitly labeled deterministic fallback. No model request is automatically retried.

The adapter also rejects serialized UTF-8 requests above 8 KiB before transport and limits each completion to 256 tokens. Compatible providers must accept `max_completion_tokens`; provider errors retain the labeled fallback, without retrying with an omitted limit. These limits bound work, not authority, and paid inference still needs the specific owner cost authorization.

## Real PayPal Sandbox test

The success path has already been observed once with independent capture and restart evidence: [PAYPAL_EVIDENCE.md](PAYPAL_EVIDENCE.md). The procedure below documents that path; preparing a video or inspecting its stored receipt does not authorize another transaction.

1. Use an existing Sandbox app, business merchant and personal buyer from the [PayPal Developer Dashboard](https://developer.paypal.com/sandbox-testing/accounts). New credentials/accounts require separate owner action.
2. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from the **Sandbox** app. Do not commit or paste credentials in issues.
3. Set a usable `PUBLIC_BASE_URL` that PayPal can redirect to. For local-only tests, determine whether loopback callbacks work for your sandbox configuration; use an HTTPS development tunnel when needed and secure it appropriately. The server itself intentionally binds only to loopback.
4. Launch with `node --env-file=.env src/server.js`.
5. Sign in as the separate Personal Sandbox buyer and check its funding methods before creating a mandate. Enter passwords privately. A virtual balance alone may not satisfy checkout. Our default MY buyer had virtual funds but PayPal requested a linked card. If a test card is needed, use the [official PayPal fictional-card generator](https://developer.paypal.com/credit-card-number-generator). Obtain owner approval before saving a new test payment method; verify it appears in the buyer's Sandbox wallet. Never use real card details.
6. Create a purchase intent. Run one or two rounds, review an eligible quote and explicitly press **Create PayPal Sandbox order**. Scripted quotes expire after 10 minutes; the mandate expires after 30 minutes. Finish sign-in and funding setup before starting these timers.
7. Browser is linked to PayPal Sandbox approval. Check the order, currency and locked total, then approve as the Sandbox buyer. Do **not** use live credentials.
8. Upon return, press **Verify approval and capture in Sandbox**. The gateway fetches the order from Sandbox to verify its identity, amount and approval before one capture. Approval alone does not capture.
9. Confirm the completed order in the Sandbox dashboard and sanitized event log. Preserve a redacted transaction reference privately for verification.
10. If a timeout or mismatch occurs, use **Check PayPal status (read only)**. The server reads the stored order ID and verifies an existing completed receipt without issuing another capture. A still-ambiguous result stays locked; inspect the Sandbox dashboard. If no order ID was returned, the app cannot recover automatically.

PayPal's add-card form expects `MM/YY`. Check the displayed future expiry before Save; an input mask can truncate `MM/YYYY` to an expired year. If saving returns to sign-in, treat the saved-method state as unverified. Restore the buyer session privately and inspect its wallet before another Save attempt.

If setup outlasts a mandate, retain its order and journal. Capture remains prohibited after expiry. Complete the funding check, obtain authorization for a fresh mandate/order, and leave the expired order uncaptured. Do not extend expiry or rebind an old provider order to another intent.

An early check before payer approval returns `ORDER_NOT_APPROVED` and keeps the original approval link available. A cancelled redirect never sends capture; the buyer can resume approval for the same locked order. **Refresh gateway status** reloads current state without executing payment. The capture button is available on a refreshed pending checkout and always requires an explicit click. After mandate expiry, use read-only reconciliation; a new capture is prohibited. Repeated completed capture requests return the already-recorded receipt without another provider call.

## Synthetic checkout regression

```sh
node --test --test-concurrency=1 test/reconciliation.test.js test/checkout-e2e.test.js
```

The end-to-end cases use real loopback HTTP, the gateway and the actual Sandbox adapter with an injected synthetic PayPal transport. They exercise locked-price selection, early approval, cancellation return, explicit capture, refresh/replay, a lost response and GET-only reconciliation. They make **no real PayPal or model calls** and do not qualify the real Sandbox acceptance gate.

Provider response checks follow the [PayPal Orders v2 checkout examples](https://developer.paypal.com/api/rest/integration/orders-api/api-use-cases/standard). Actual provider behavior still requires the separate Sandbox test above.

**Important:** Synthetic merchants are *not* the receiving PayPal payees. Funds move only in the sandbox to the configured demo merchant. Preserve `.vowrail/journal/` or your configured `VOWRAIL_STATE_DIR` across restarts. Interrupted checkout stays locked for read-only reconciliation; an unknown order ID still requires dashboard investigation. Do not deploy this unauthenticated demo publicly or use real data.

## Synthetic restart regression

```sh
node --test --test-concurrency=1 test/durability.test.js test/server-restart.test.js
```

These tests kill synthetic workers at negotiation, order-create, known-order, pre-capture read, capture, reconciliation and completed-response boundaries. They restart from the same local journal, assert no duplicate capture, preserve round limits and exercise real loopback HTTP and the actual server entry point. See [LOCAL_JOURNAL.md](LOCAL_JOURNAL.md) for fault handling and remaining limitations.

## Competition final smoke gate

- Clean source: `npm test -- --test-concurrency=1`, `npm run smoke`, `npm run rehearse`, then `npm run demo`.
- Entire local simulated checkout works without AI/PayPal secrets, with persistent mode disclosures. `npm start` separately exercises unconfigured real-adapter behavior.
- With credentials, an actual AI request and a real PayPal Sandbox purchase are independently observed.
- Video under three minutes on public YouTube.
- Repo open source/public before submission, secrets/IP checked, license visible.
- All factual claims match recorded artifacts and event trail.

Existing `OPENROUTER_API_KEY` selects the official free-only route ahead of legacy `AI_*` settings. Optional `OPENROUTER_MODEL` must be an explicit `:free` variant; paid IDs/routers are rejected, all price caps are zero and fallbacks are disabled. OpenRouter uses `max_tokens:256`; generic providers retain `max_completion_tokens:256`. The owner environment file is loaded normally and never printed or rewritten. See [free-only qualification](MODEL_QUALIFICATION.md).
