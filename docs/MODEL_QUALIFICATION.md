# Next gate: one real buyer-advice call

The model adapter and synthetic hostile-output/deadline tests pass. No actual model inference has been observed. Deterministic advice and the preflight below do not satisfy the meaningful AI gate in [issue #4](https://github.com/Whyme-Labs/vowrail/issues/4).

## Concrete owner inputs

- An existing compatible provider, exact model identifier and approved API base URL. The adapter uses `/chat/completions`; check that the chosen model supports its request fields.
- Enter `AI_API_KEY` and `AI_MODEL` privately in the ignored, owner-readable `.env`; set `AI_BASE_URL` if required. Existing PayPal settings remain private. Do not send key values through chat or issues.
- Explicitly permit one synthetic buyer-advice request and set its maximum allowed spend or confirm an existing free quota. A 10-second timeout is not a token or monetary cap. The current adapter does not impose a completion-token cap, so confirm a provider-side limit or implement a compatible bounded output before any paid call.

No account or credential creation is required for this plan. No paid inference is authorized yet. Keep `AI_MERCHANTS=0`, `DEMO_MODE` unset and all checkout actions unused; two merchant rounds then make no model calls.

## Prepared request and baseline

[model-request-preflight.json](demo-assets/model-request-preflight.json) was produced from the shipped gateway and adapter with an injected local transport. It contains the exact public requirements and normalized eligible-offer projection for the synthetic print fixture, with stable fixture IDs. It is a request-shape check, not a model transcript. The API key/header is excluded. The private cap, raw conversations and checkout credentials are not present in the payload.

Use item `Synthetic model qualification print run`, quantity 100, requirements `Matte finish. Delivery within three days matters more than a small price saving.`, USD ceiling 22000 cents and two rounds. The deterministic baseline chooses Cobalt's USD 201/four-day quote by amount; Atlas's USD 207/two-day and Birch's USD 203/three-day quotes are also eligible. An observed model choice must be reported honestly, even if it agrees with the baseline or misses the delivery preference. One sample demonstrates integration and decision support; it does not prove better economics.

## Authorized run and evidence, when inputs are ready

1. Use the actual adapter on loopback with preserved private state. Check configuration names/presence only, then create the synthetic mandate and run both scripted rounds. Never enable the synthetic model merchant for this one-call test.
2. Record the deterministic baseline from the same eligible offers before requesting advice. Verify the adapter request projection; capture only sanitized fields and omit Authorization and raw headers.
3. Issue exactly one recommendation request. Record actual provider/model/base URL, UTC timestamp, elapsed time, request count, response `mode`, selected eligible ID and reason. Record provider-returned token usage if available and cost only from an actual provider usage record or clearly labeled calculation; missing usage/cost stays unavailable. Do not retry a failed, timed-out or fallback result without new authorization.
4. Require `ai_advisory` and a valid offered ID to qualify the successful integration. Check that mandate, round count, offers and checkout are unchanged. Advice does not select the browser's offer or create/capture a payment.
5. Link the sanitized observation to #4 and update the demo with the exact model used. Existing hostile/malformed/timeout tests remain separately labeled synthetic evidence. No free-form model text is sent to a seller.

Judge access to this configured path still needs an owner-approved free access plan through judging. Do not publish the owner's `.env` or PayPal buyer credentials. The credential-free simulator remains independently runnable, while the actual AI and PayPal modes have distinct setup and evidence.
