# Judge walkthrough: hosted and local builds

This public pre-release prototype has a complete credential-free simulator and a separately verified actual USD 207.00 Sandbox purchase. Three actual free-model advisory cases are observed. The hosted route provides the server integrations; judges use their own Personal Sandbox buyer account for approval. Final terms/submission remain pending. It targets a desktop browser and Node 22+; commands below were checked on macOS.

## Hosted browser route

The Workers deployment targets [Sandbox + free AI](https://vowrail-judges.swmengappdev.workers.dev/) and [provider-free simulation](https://vowrail-judges.swmengappdev.workers.dev/demo/). Deployment availability is verified separately in its implementation PR. No Vowrail account, software installation or API key is required in the browser. Server-side Workers secrets provide the existing merchant/model integrations. Actual PayPal approval uses the judge's own Personal **Sandbox** buyer account; never use a live PayPal account. The simulator needs no buyer login and makes no provider calls.

For the hosted Sandbox route, create the default synthetic mandate, run two rounds, ask the free buyer model for advisory evaluation, review and select a stored quote, create the Sandbox order, approve it in PayPal Sandbox and return for explicit capture. Advice has no execution authority. A provider quota/error produces a labeled deterministic fallback. Configuration flags do not prove an actual provider request succeeded. Keep this browser's session cookie to reopen a pending purchase. For uncertain capture, use read-only status recovery rather than another capture.

For the simulator, follow the interactive walkthrough below, replacing the local URL with the hosted `/demo/` URL. Its separate approval page and receipt remain labeled simulation. Temporary hosted traffic limits return `429` with a retry delay; they do not change the mandate, extend rounds or reset payment locks. See [deployment boundaries and traffic limits](WORKERS.md), including the permanent session-capacity exception.

## Judge-owned Sandbox buyer access

Use your own Personal Sandbox buyer account with enough test balance for the selected quote. Sign in only on PayPal's `sandbox.paypal.com` checkout page. Vowrail does not ask for or store that password, and the entrant does not share a buyer login. No Sandbox merchant app credentials or model API key is needed for the hosted app.

If you do not have a Sandbox buyer account, use the [PayPal Developer Dashboard](https://developer.paypal.com/) to access the free Sandbox environment. PayPal automatically supplies a default Personal account when you register as a developer. Open **Sandbox > Accounts**, find the **Personal** account, then choose **View/Edit Account** to obtain its Sandbox email/password. See [PayPal's account instructions](https://developer.paypal.com/sandbox-testing/accounts). Account setup belongs to the judge; this project creates no provider account or credential on their behalf.

The [official Testing requirements](https://paypalaihackathon.devpost.com/rules) require free access and complete instructions, including any necessary Sandbox login details or instructions for obtaining access. They do not specify the owner of a buyer account or expressly guarantee acceptance of a bring-your-own-account route. These instructions state that prerequisite, while the hosted server integrations and simulator require no judge-supplied API secrets. The simulator is immediately usable without a PayPal login.

## Rules and local access choices

The [official Testing requirements](https://paypalaihackathon.devpost.com/rules) require a working build, free access through judging, and the credentials or instructions needed to test it. They do not specify who must own provider credentials. Entrant-supplied dedicated credentials are a recommendation, not a stated competition requirement. Judge-owned existing Sandbox/model credentials are technically supported and not expressly prohibited; the rules do not explicitly guarantee acceptance of a bring-your-own-credentials-only route. Ensure the chosen instructions provide usable access, rather than claiming configuration alone satisfies the requirement.

The local build needs no public server or app login. Its credential-free simulation demonstrates the controls. To exercise actual AI and PayPal, use either authorized dedicated test access handed to judges privately, or the judge's own existing free provider accounts. No owner credential, buyer password or filled `.env` belongs in the public repository. This preparation creates or transmits no credentials or provider accounts.

## Run from source without accounts or keys

Clone the [public MIT repository](https://github.com/Whyme-Labs/vowrail). There are no runtime npm dependencies to install for this local path; the optional Workers development tools use `npm ci`. No `.env` is required or loaded for this walkthrough. Use a new directory rather than replacing an existing checkout.

```sh
git clone https://github.com/Whyme-Labs/vowrail.git
cd vowrail
node --version
npm test -- --test-concurrency=1
npm run smoke
npm run rehearse
PORT=8788 VOWRAIL_STATE_DIR=.vowrail/judge-simulation npm run demo
```

Open http://127.0.0.1:8788 in a desktop browser. The separate port and simulation state root preserve an existing Sandbox server and its journals. Do not stop another project's service. If 8788 is occupied, use an unused loopback port and update the browser URL. The simulator constructs no PayPal/model adapter and ignores inherited provider configuration.

Expected startup: **LOCAL SIMULATION**, **no PayPal or model calls**, **no money moves**. The app labels three synthetic sellers and deterministic fallback. A read-only `GET /api/health` reports `checkoutMode: "simulation"`, `paypalConfigured: false`, `aiConfigured: false` and `checkoutConfigured: true`; that last flag refers to the local simulator.

## Five-minute interactive walkthrough

1. Keep the default synthetic print request: 100 units, private USD 220 ceiling, two rounds, three-day delivery preferred. Create the mandate. Sellers receive only intent ID, round, item, quantity and public requirements.
2. Run round 1. Birch USD 216 is eligible; Atlas USD 235 and Cobalt USD 228 exceed the ceiling. Run round 2. The third-round button is disabled; the HTTP rehearsal independently attempts a third round and receives `ROUND_LIMIT`. Earlier valid quotes remain selectable until expiry.
3. Ask for advice. The displayed **deterministic fallback** picks Cobalt USD 201/four-day delivery by price. Advice does not select an offer, alter the mandate or create an order. It is not an observed model result.
4. Review Atlas's round-2 USD 207/two-day quote. Compare it with Cobalt's cheaper four-day quote and Birch's USD 203/three-day quote. Select Atlas explicitly if you prefer delivery. Review shows stored price, expiry and budget margin; missing tax/refund guarantees remain disclosed. Click **Create simulated order**. The server ignores caller-supplied amounts and locks its own USD 207 quote.
5. Open separate simulated buyer approval. Choose **Return without approving** first, then resume the same order and approve. Approval alone leaves the gateway awaiting buyer approval. Return to the purchase and explicitly click **Verify simulated approval and capture**.
6. Inspect **Simulated receipt**, the `SIMORDER_`/`SIMCAPTURE_` references and one completion event. Reloading or repeating a completed action returns the existing receipt without another simulated capture. This receipt is simulation, even though its amount matches the separate actual Sandbox observation.

Quotes expire after ten minutes; mandates after thirty. If expired, use **Start a new purchase** instead of extending an old authorization. Existing records are retained.

## Recovery demonstration

Stop only the judge server you started with Ctrl-C. Keep its two journals. Restart with the same port/state root and the injected-loss command:

```sh
PORT=8788 VOWRAIL_STATE_DIR=.vowrail/judge-simulation npm run demo:recovery
```

Create a new synthetic mandate and repeat the selection/approval steps. The first simulated capture records completion but loses its response. The app requires read-only recovery and removes capture. Use **Check simulated receipt (read only)**; completion returns without another capture. Restart with the same simulation state root to verify that the stored receipt remains available. Never delete journals or switch their mode to reset a payment attempt.

The bounded `npm run rehearse` command automates both normal and lost-response/restart paths on temporary loopback servers. [Current judge rehearsal JSON](demo-assets/judge-rehearsal.json) records the USD 201 advice, independent USD 207 choice, amount-tampering rejection, separate consent, policy denials and zero captures during recovery. Its asset-serving checks verify HTTP content/headers; they are not new visual-browser observations. It cleans only its own temporary synthetic records.

## Actual integrations with existing judge credentials

Prerequisites: Node 22+, an existing PayPal Sandbox application client ID/secret, an existing Personal Sandbox buyer login for browser approval, and an existing OpenRouter key able to use an explicit free model. Free-provider quotas/availability must remain usable for judging; no paid fallback is configured in this route. The observed model is `nvidia/nemotron-3.5-lightning:free`. The buyer login stays in PayPal's browser flow, never in Vowrail source or logs.

1. In the judge's own checkout, copy `.env.example` to ignored `.env`. Fill only the judge-owned or privately authorized test credentials. Keep legacy `AI_API_KEY`/`AI_MODEL` blank and `AI_MERCHANTS=0`; configure `OPENROUTER_API_KEY` and the explicit free model. Do not copy the entrant's existing environment file.
2. Set `HOST=127.0.0.1`, an unused `PORT` such as `8789`, `PUBLIC_BASE_URL=http://127.0.0.1:8789`, and a fresh private `VOWRAIL_STATE_DIR=.vowrail/judge-sandbox`. Use a clean test terminal with inherited legacy `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, `DEMO_MODE` and `SIMULATE_LOST_CAPTURE` unset; existing shell values take precedence over an env file. Preserve credential files and any existing journals.
3. Start `node --env-file=.env src/server.js`, then open the matching loopback URL. This selects the Sandbox adapter; `npm run demo` would deliberately ignore the real credentials. Configuration labels are not evidence of provider success.
4. Create a synthetic mandate and two rounds. Ask for advice to exercise the actual free-model route; model output remains unverified and advisory. Review a stored offer explicitly. Order creation, Sandbox buyer approval and capture are distinct actions the tester controls. The configured Sandbox merchant is the payee; the three displayed sellers remain synthetic.
5. Check the completed receipt, or use read-only receipt reconciliation if the result is uncertain. Restart with the same private state root to inspect recovery. Never repeat capture to resolve uncertainty. Stop only this test server afterward.

These instructions are derived from the current source and existing observations. No new model request, order or capture was executed while preparing them. Existing integration limits remain in [READINESS.md](READINESS.md).

## Inspect actual integration evidence separately

| Evidence | What was observed / what it does not replace |
|---|---|
| [Actual Sandbox purchase](PAYPAL_EVIDENCE.md), [receipt crop](demo-assets/paypal-sandbox-receipt.jpg), [sanitized checks](demo-assets/paypal-sandbox-proof.json) | One authorized actual USD 207.00 order and exactly one matching completed capture, independent API/dashboard verification, receipt restored after restart/expiry. Stored observations from 12 October, not permission to execute another transaction. |
| [Simulation rehearsal](demo-assets/judge-rehearsal.json) | Two current local HTTP paths, synthetic providers/sellers and deterministic advice. Not PayPal evidence, a model result or an economics benchmark. |
| [Model preflight](demo-assets/model-request-preflight.json) and [free-only attempts](MODEL_QUALIFICATION.md) | Historical generic request shape plus eight cumulative free-model attempts: three accepted Nvidia advice cases, three truncated Nvidia responses and two earlier Google 429s. Actual cost/token observations and quality errors remain separate from simulation. |
| [Exact-head verification](VERIFICATION.md) | Local Node source checks with a separately labeled successful commit status. Hosted Actions failed before steps for account resources; the two outcomes remain distinct. |
| [Accessibility](ACCESSIBILITY.md) | Earlier actual responsive/keyboard Safari observations. Auditory screen-reader, physical-device and zoom qualification remain open. |

Atlas/Birch/Cobalt are synthetic and are not the receiving PayPal merchant. Real model and Sandbox credentials, if later authorized for private judge testing, must follow the owner's approved test-access arrangement. The owner's current environment file and buyer credentials are never part of source/video. No new credentials, paid model request, public service or payment is needed for this walkthrough.

For app-only recording, use [the simulation captions](demo-assets/simulation-captions.vtt) with the [rehearsal shot plan](DEMO.md). These are preparation assets for simulation footage, not a finished public video. The AI footage slot can use the three accepted free-model observations while disclosing their quality limits; simulation footage remains labeled separately. Owner declarations, publication and submission remain separate in [READINESS.md](READINESS.md).
