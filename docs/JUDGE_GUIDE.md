# Judge walkthrough: working local build and evidence

This private pre-release prototype has a complete credential-free simulator and a separately verified actual USD 207.00 Sandbox purchase. Actual meaningful model inference and private judge access are still pending; this guide does not claim the final competition entry is ready. It targets a desktop browser and Node 22+; commands below were checked on macOS.

## Run from source without accounts or keys

Use an authorized source checkout. The repository is currently private; public clone access awaits owner approval. There are no npm dependencies to install. No `.env` is required or loaded for this walkthrough.

```sh
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

## Inspect actual integration evidence separately

| Evidence | What was observed / what it does not replace |
|---|---|
| [Actual Sandbox purchase](PAYPAL_EVIDENCE.md), [receipt crop](demo-assets/paypal-sandbox-receipt.jpg), [sanitized checks](demo-assets/paypal-sandbox-proof.json) | One authorized actual USD 207.00 order and exactly one matching completed capture, independent API/dashboard verification, receipt restored after restart/expiry. Stored observations from 12 October, not permission to execute another transaction. |
| [Simulation rehearsal](demo-assets/judge-rehearsal.json) | Two current local HTTP paths, synthetic providers/sellers and deterministic advice. Not PayPal evidence, a model result or an economics benchmark. |
| [Model request preflight](demo-assets/model-request-preflight.json) | Shipped request shape and limits, private cap omitted, zero external calls. Actual provider/model inference remains unverified. |
| [Exact-head verification](VERIFICATION.md) | Local Node source checks with a separately labeled successful commit status. Hosted Actions failed before steps for account resources; the two outcomes remain distinct. |
| [Accessibility](ACCESSIBILITY.md) | Earlier actual responsive/keyboard Safari observations. Auditory screen-reader, physical-device and zoom qualification remain open. |

Atlas/Birch/Cobalt are synthetic and are not the receiving PayPal merchant. Real model and Sandbox credentials, if later authorized for private judge testing, must follow the owner's approved test-access arrangement. The owner's current environment file and buyer credentials are never part of source/video. No new credentials, paid model request, public service or payment is needed for this walkthrough.

For app-only recording, use [the simulation captions](demo-assets/simulation-captions.vtt) with the [rehearsal shot plan](DEMO.md). These are preparation assets for simulation footage, not a finished public video. The final AI footage slot remains pending explicit spending approval and successful inference. Owner eligibility/rights declarations, publication and submission remain separate in [READINESS.md](READINESS.md).
