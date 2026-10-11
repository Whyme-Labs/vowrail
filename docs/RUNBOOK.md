# Demo and validation runbook

## Prerequisites

- Node.js 22+ (no third-party packages required).
- Optional compatible chat-completions model credentials for a real AI recommendation.
- Optional PayPal **Sandbox** app ID/secret and separate sandbox buyer account.

## No-credential demo

```sh
npm test
npm run smoke
npm start
```

Open http://127.0.0.1:8787.

1. Create synthetic print job, budget $220, two rounds.
2. Run round 1. Merchant quotes are synthetic; any quote outside cap cannot be paid.
3. Run round 2. Display new prices and original event history.
4. Attempt another round. The button is disabled. For a protocol-level proof run `npm test`, which sends a third-round request and asserts HTTP 409 `ROUND_LIMIT`.
5. Ask for advice. Without AI config it says **deterministic fallback**, not AI.
6. Checkout is disabled without configured PayPal Sandbox credentials.

## Real AI advisory demonstration

Set `AI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL`, using a provider compatible with chat completions. Restart. Ask for an offer recommendation. Inspect `ai_advisory` vs fallback in the HTTP response. The source `src/adapters/ai.js` makes an actual remote API call only when configured. There is no model key included in the repo. By default the merchant agents remain synthetic scripted price functions. Set `AI_MERCHANTS=1` to use one optional synthetic LLM merchant, with merchant-side price bounds still enforced by code. This is not a real merchant.

## Real PayPal Sandbox test

1. Create an app and Sandbox accounts at https://developer.paypal.com/.
2. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from the **Sandbox** app. Do not commit or paste credentials in issues.
3. Set a usable `PUBLIC_BASE_URL` that PayPal can redirect to. For local-only tests, determine whether loopback callbacks work for your sandbox configuration; use an HTTPS development tunnel when needed and secure it appropriately. The server itself intentionally binds only to loopback.
4. Launch with `node --env-file=.env src/server.js`.
5. Create a purchase intent. Run one or two rounds, select an eligible quote and press checkout.
6. Browser is linked to PayPal Sandbox approval. Approve as the sandbox buyer. Do **not** use live credentials.
7. Upon return, press 'Verify approval and capture'. Backend fetches the order from Sandbox to verify amount and status before capturing. Capture is explicitly not automatic.
8. Confirm the completed order in the Sandbox dashboard and sanitized event log. Preserve a redacted transaction reference privately for verification.
9. If a timeout or mismatch occurs, checkout moves to `RECONCILIATION_REQUIRED`. Do not blindly repeat a capture; reconcile in the Sandbox dashboard.

**Important:** Synthetic merchants are *not* the receiving PayPal payees. Funds move only in the sandbox to the configured demo merchant. State is lost after a restart. Do not deploy this unauthenticated demo publicly or use real data.

## Competition final smoke gate

- Clean clone: `npm test && npm run smoke && npm start`
- App works with no AI/PayPal secrets and correctly discloses limited functionality.
- With credentials, an actual AI request and a real PayPal Sandbox purchase are independently observed.
- Video under three minutes on public YouTube.
- Repo open source/public before submission, secrets/IP checked, license visible.
- All factual claims match recorded artifacts and event trail.
