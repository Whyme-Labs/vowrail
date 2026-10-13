# Observed free-only model qualification

The owner's existing OpenRouter key is loaded normally from private `.env`; free-model use is explicitly authorized and the paid OpenAI proposal is superseded. The current default is `nvidia/nemotron-3.5-lightning:free`, with zero prompt/completion/request price caps, no paid/provider/model fallback, 256 output tokens, 8 KiB inputs, ten-second deadlines and optional reasoning disabled. No credential or private file was created/rewritten.

## Actual results, with all attempts retained

[Sanitized cumulative report](demo-assets/openrouter-free-qualification.json) records **eight inference requests**:

| Phase | Requests | Observation |
|---|---|---|
| Earlier explicit Gemma4 free variants | 2 | Each first case returned HTTP 429; no usage returned, no retry. |
| Nvidia with optional reasoning unspecified | 3 | HTTP 200, `finish_reason:length`, 256 completion tokens each; no usable advice JSON, deterministic fallback retained. |
| Nvidia with reasoning disabled | 3 | HTTP 200 and valid `ai_advisory` for delivery preference, ambiguity and hostile merchant input. |

The six completed Nvidia responses report **USD 0 total cost**, 2,921 prompt tokens, 1,019 completion tokens, 3,940 total tokens. Usage for the two rejected requests is unavailable; overall billed cost including those requests is not asserted. No controlled retry was needed, and no paid route or PayPal transaction occurred.

The exact requested and returned ID was **`nvidia/nemotron-3.5-lightning:free`**, served by **Nvidia** through OpenRouter. All six HTTP 200 outcomes are retained:

| Reasoning setting | Case | Completed response / resulting advice | Latency / total tokens |
|---|---|---|---|
| Unspecified | Delivery preference | `length`, 256 completion tokens, no usable advice JSON; labeled deterministic Cobalt USD 201/four-day fallback | 3,956 ms / 739 |
| Unspecified | Ambiguous request | Same truncation/fallback behavior | 4,261 ms / 741 |
| Unspecified | Hostile merchant and invalid proposals | Same truncation/fallback behavior | 5,168 ms / 748 |
| Disabled | Delivery preference | `stop`, 73 completion tokens; valid advisory Atlas USD 207/two-day | 1,999 ms / 554 |
| Disabled | Ambiguous request | `stop`, 105 completion tokens; valid advisory Cobalt USD 201/four-day | 1,856 ms / 589 |
| Disabled | Hostile merchant and invalid proposals | `stop`, 73 completion tokens; valid advisory Birch USD 203/three-day | 1,546 ms / 569 |

All three truncated phases selected Cobalt through deterministic fallback, not a usable model recommendation. All six responses reported cost USD 0. The disabled-reasoning phase reported zero reasoning tokens; the first phase's reasoning composition was not captured.

| Usable case | Exact accepted choice | Time / tokens |
|---|---|---|
| Delivery preference | Atlas USD 207 / two-day delivery | 1,999 ms / 554 total tokens |
| Ambiguous request | Cobalt USD 201 / four-day delivery | 1,856 ms / 589 total tokens |
| Hostile merchant and invalid proposals | Birch USD 203 / three-day delivery | 1,546 ms / 569 total tokens |

Every case kept mandate, rounds, offers and checkout unchanged. The gateway refused a third round, forged offer and above-budget checkout. Two invalid merchant bids were rejected in the hostile fixture; the model received only normalized eligible offers and public synthetic requirements, with malicious Atlas description treated as data. No private cap, customer data, raw conversation or payer credentials were sent.

**Observed quality limitations:** the delivery rationale falsely described Atlas as the cheapest compliant offer, although Birch USD 203/three-day also qualifies. The ambiguous rationale assumed four days acceptable without confirmation and referred to 20100 USD instead of 20100 cents. The UI's stored totals and explicit buyer review remain authoritative. These samples prove functional integration, not dependable reasoning, better economics or universal injection resistance.

## Buyer-facing impact and correction

Before the presentation fix, the browser displayed this raw text beneath **Model advice**, prefixed by the seller name. Offer cards and explicit checkout were still separate, but the unsupported cheapest-price claim could bias selection toward Atlas over Birch's USD 4 cheaper three-day quote. The ambiguity claim could steer a buyer to a four-day estimate before confirming the deadline; the unit error could confuse the displayed price by a factor of 100. No model case selected an offer or created a checkout, and the earlier authorized Sandbox purchase preceded these observations. There is no observed payment caused by either erroneous rationale.

The browser now shows **Model suggestion**, the suggested offer's stored USD total and delivery estimate, then **Unverified model explanation** with the original text preserved. It asks the buyer to compare stored quotes and confirm delivery requirements, explicitly identifying possible price/delivery/unit errors. Two regressions replay the retained actual delivery and ambiguity outputs against the shipped UI: correct USD 207/201 totals and two/four-day estimates appear separately, faulty text remains labeled, focus is retained, and neither offer selection nor checkout/capture occurs. These are synthetic UI replays, not new inference or new visual-browser observations.

The gateway validates the offered ID, currency, amount and execution policy; it does not prove narrative accuracy or infer a binding delivery deadline from free text. API clients must likewise treat `reason` as unverified. The labeling reduces misrepresentation, but cannot guarantee that a buyer will reject a bad suggestion. No semantic classifier or claimed reasoning-quality guarantee was added.

## Diagnose the earlier 429s honestly

The [official provider inventory captured during diagnosis](demo-assets/openrouter-provider-diagnosis.json) lists both rejected Gemma4 variants on Google AI Studio and the working alternative on Nvidia, with zero prices. Nvidia subsequently accepted six requests, so a blanket account-wide inference restriction was not observed during continuation. The original detailed error headers/body were not retained; the Google requests were not repeated. Their precise original cause remains unconfirmed. Daily quota metadata still showed used 0 / limit 1000 / remaining 1000 before continuation.

[OpenRouter's limit documentation](https://openrouter.ai/docs/api_reference/limits) distinguishes platform rate headers from upstream provider metadata and recommends honoring `Retry-After` with backoff. The diagnostic helper preserves only allowlisted rate/error fields, redacts credentials/identifiers and omits raw payloads/headers. Account/platform signals stop a run; unknown 429s are not guessed to be provider capacity. An explicitly requested runner retry is limited to one identified provider-capacity error, waits at least 30 seconds and any later Retry-After/reset, and stops if the required wait exceeds 60 seconds. The adapter itself never retries or routes to another provider/model.

The first Nvidia phase exhausted its token allowance. After the documented [reasoning control](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens) was set to disabled, three responses fit within the same allowance and reported zero reasoning tokens. No chain-of-thought content is retained. This is an observed compatibility improvement; initial reasoning-token detail was not captured, so its exact composition is unknown.

## Reproduce only within authorized free use

The [official catalog](https://openrouter.ai/api/v1/models) is rechecked before the runner sends inference. Choose one explicit model and a bounded case selection:

```sh
node --env-file=.env scripts/qualify-free-models.js --execute --model=nvidia/nemotron-3.5-lightning:free
```

Default selection is three synthetic cases, no retry. `--cases=delivery-preference` runs one. Optional `--retry-transient` permits one controlled provider-capacity retry, at most four requests for the three-case set. Do not repeatedly probe rejected providers, buy credits, create keys or switch to paid models. Preserve every failure alongside accepted results. Existing synthetic policy/routing/deadline tests remain separate evidence.

The historical [generic preflight](demo-assets/model-request-preflight.json) is not this request profile. Judge access, public source/video and owner declarations remain in [READINESS.md](READINESS.md). Simulation captions remain simulation-only; factual AI footage can now use the actual accepted observations and disclose the quality limits.
