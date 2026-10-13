# Cloudflare Workers judge deployment

Configured target: `vowrail-judges` in the owner-selected Cloudflare account, at https://vowrail-judges.swmengappdev.workers.dev . Deployment and browser observations are recorded separately in the implementation PR; a configured URL alone is not evidence that the service is running.

The root app uses the existing PayPal **Sandbox** merchant and an explicit free OpenRouter model. `/demo/` runs a credential-free simulator with no PayPal or model requests. Both show the same buyer journey. Three merchants remain synthetic; the configured Sandbox merchant receives the Sandbox payment.

## Session and transaction boundaries

The Worker serves the existing assets and authenticates an anonymous browser principal through a random, HMAC-signed `__Host-vowrail` cookie. It is Secure, HttpOnly, SameSite=Lax, has no Domain attribute and expires after seven days. Every mutation requires the exact configured Origin and a CSRF proof bound to that cookie. Cross-site API requests and unexpected hosts are blocked. Top-level PayPal return navigation remains allowed.

One SQLite-backed Durable Object owns each session's gateways and snapshots. The same session routes to that object from different Worker instances. Each mode has a separate intent snapshot; the simulator's provider has its own orders snapshot. Intent IDs grant no access without the owning session. The existing gateway checkpoints round reservations, selected offers, provider request IDs, order references and capture-attempt locks synchronously before external calls. SQL storage gates protect those writes. Restart retains the locks and uses read-only reconciliation for ambiguous outcomes. A caller-supplied amount cannot replace the stored quote.

These are anonymous demo sessions, not verified personal accounts. A stolen valid cookie grants its holder that session's capability. TLS, HttpOnly cookies, CSP and absence of third-party scripts reduce exposure; they do not replace account authentication or protect against a malicious operator. Clearing cookies loses browser access to retained records. Do not start another purchase to resolve an uncertain capture. Production identity, authenticated merchants, a general payment outbox and live payments remain outside this slice.

## Secrets and egress

Only `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `OPENROUTER_API_KEY` and `SESSION_SECRET` are uploaded as Workers secrets. The Personal Sandbox buyer password is not stored on the Worker. Judges use their own Personal Sandbox buyer account and enter its login only in PayPal's Sandbox browser approval flow. No entrant buyer login is shared. [Buyer-account setup](JUDGE_GUIDE.md#judge-owned-sandbox-buyer-access) is free; the simulator requires no PayPal login.

`scripts/deploy-workers.js` reads the three existing provider values from the ignored `.env`, preserves a separate private session-signing key in `.vowrail/workers/`, and uploads a whitelist through Wrangler's supported `--secrets-file` mechanism. The temporary file is mode 0600 inside a mode 0700 directory and is removed after the command. No credential value is a shell argument, public asset, source file or log field. The signing key stays stable between deployments so pending sessions continue to work. No provider account or API key is created.

Outbound provider requests allow only the official PayPal Sandbox OAuth/Orders paths and OpenRouter chat-completions path over HTTPS. Redirects use Workers' supported manual mode and are rejected before another request, so authorization headers cannot be forwarded to another host. The Worker never uses the legacy paid-model settings. Model requests require an explicit `:free` variant, zero prompt/completion/request price caps, no fallback, bounded input/output and a ten-second deadline. Unavailable models produce a labeled deterministic recommendation, not an extra or paid request. The existing provider key's USD 1 cap is a backup; no provider-wide free-model allowlist is claimed.

## Rate limits

| Operation | Limit | Enforcement |
|---|---|---|
| All API requests | 120/minute/IP | Cloudflare native limiter, per location and eventually consistent |
| New browser sessions | 20/hour/IP | Durable SQL counter |
| Mutations | 30/minute/IP | Durable SQL counter |
| New intents | 40/day/IP, 50/session/mode | Durable counter and session state |
| AI advice attempts | 3/minute/IP, 60/day/IP | Durable SQL counter |
| All free-model advice attempts | 500/day | Dedicated durable budget counter |
| Sandbox checkout/capture/reconciliation attempts | 8/minute/IP, 100/day/IP | Durable SQL counter |

The native API limiter counts requests after host, Origin and method checks, including requests later rejected for session, CSRF, checkout-mode or JSON validation. Durable operation counters count requests that pass those transport checks, including later gateway policy rejections. Time-window quotas return `429` with `Retry-After`. The permanent 50-intent session/mode capacity cap returns `429 SESSION_LIMIT` without that header because it has no retry window. Per-IP durable object names are keyed hashes, not raw IP addresses. Cookie resets do not reset IP quotas. The low-volume global object handles only model-budget reservations, not general app traffic. Fixed daily windows reset at 00:00 UTC, or 08:00 MYT. Simulator advice and checkout do not consume provider budgets. Gateway mandate and round checks remain separate from traffic limits.

## Local verification and deployment

The Node simulator still has no runtime npm dependencies. Workers development tools are pinned separately in the lockfile. Run sequentially on Node 22+:

```sh
npm ci
npm test -- --test-concurrency=1
npm run smoke
npm run rehearse
npm run test:workers
npm run workers:check
```

Workers tests execute Wrangler's compiled module in workerd with real SQLite-backed Durable Objects, two front-end Worker instances and a native fixture provider. They use synthetic secrets and intercept all provider fetches, including OAuth, free advice, order creation, capture and read-only recovery. Persistence checks dispose and recreate the runtime against the same temporary SQLite directory. No real payment or model call is part of this suite.

For local UI checks, create ignored `.dev.vars` with a synthetic `SESSION_SECRET` of at least 32 characters, then run `npm run workers:dev` and open http://127.0.0.1:8790/demo/ . Actual local integration requires explicitly configured existing test credentials.

After committing and verifying the intended source, an owner-authorized deployment uses the existing Wrangler login:

```sh
npm run workers:deploy
```

The helper verifies the intended account/Worker, supplies the source commit as non-secret metadata and creates a single code-and-secrets deployment. No DNS, custom domain, unrelated Worker or billing plan is changed. `/api/health` reports configuration and source identity; it does not itself make or verify a provider request. Logs contain fixed event/error names. Request bodies, cookies, credentials and raw provider errors are not explicitly logged. Invocation logs are disabled; sampled Workers logs/traces are enabled.

See [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [SQLite storage gates](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [rate-limit consistency](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) and [judge instructions](JUDGE_GUIDE.md).
