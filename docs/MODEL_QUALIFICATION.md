# Free-only model qualification

The owner supplied an existing `OPENROUTER_API_KEY` privately and explicitly authorized free-model use on 13 October 2026 MYT. This supersedes the previous direct-OpenAI paid-call proposal. No paid inference, new credential or private environment-file change is authorized or performed.

## Shipped route and constraints

The application loads its existing environment normally. When `OPENROUTER_API_KEY` is present, it takes precedence over legacy `AI_*` settings and selects the official OpenRouter API with explicit `google/gemma-4-31b-it:free`. `OPENROUTER_MODEL` can select another explicit `:free` variant; paid IDs and automatic routers are rejected before transport. The [official model catalog](https://openrouter.ai/api/v1/models) listed both that ID and `google/gemma-4-26b-a4b-it:free` with zero prompt/completion pricing when checked.

Requests set `provider.max_price` to zero for prompt, completion and per-request charges, `allow_fallbacks:false`, and `require_parameters:true`, with no model fallback array. OpenRouter documents [price filtering](https://openrouter.ai/docs/guides/routing/provider-selection); unavailable zero-price routing must fail instead of routing to a paid option. The adapter uses OpenRouter's `max_tokens:256`, an 8 KiB UTF-8 request limit and ten-second deadline. Nonzero/invalid reported cost is rejected; missing usage is unavailable, not assumed zero.

Only public synthetic requirements and normalized eligible offers are sent. The private cap, raw conversation, payer data, credentials and Authorization header are absent from evidence. `npm run demo` still constructs no model adapter and ignores configured OpenRouter settings. Keep `AI_MERCHANTS=0` for the smallest advice test; no payment adapter is constructed by the qualification script.

## Actual observations and blocker

[Sanitized report](demo-assets/openrouter-free-qualification.json) records **two inference requests**, one independently selected case for each verified free model:

| Explicit model | Actual result | Time |
|---|---|---|
| `google/gemma-4-31b-it:free` | HTTP 429; deterministic fallback | 970 ms |
| `google/gemma-4-26b-a4b-it:free` | HTTP 429; deterministic fallback | 863 ms |

Each run stopped at its first account/rate error, without retry or provider/model fallback. No successful actual model output was obtained, so the real AI gate remains unqualified. Provider token/cost usage was not returned. The read-only quota check between runs reported used 0, limit 1000, remaining 1000; daily exhaustion is not established. The precise upstream/platform per-minute or capacity cause is unknown. [Official rate-limit documentation](https://openrouter.ai/docs/api_reference/limits) distinguishes platform and provider limits; no credits were purchased to alter them.

The planned small set was delivery preference, ambiguous requirements and hostile merchant text with invalid proposals for both models, at most six requests. Four remaining cases were not executed after rate failures. Gateway state remained unchanged; third-round, forged-offer and above-budget attempts were refused. Those policy checks ran locally around blocked requests. Synthetic tests separately exercise successful parsing, ambiguity and hostile/invalid advice; they are not actual model observations.

## Reproduce within the authorized free-only scope

From existing private configuration, when free-provider capacity permits:

```sh
node --env-file=.env scripts/qualify-free-models.js --execute
```

The script rechecks the public catalog, uses only the two fixed IDs, caps the set at six requests, and stops on 401/402/403/429 or reported nonzero cost. `--model=google/gemma-4-26b-a4b-it:free` selects only that independent variant and caps its set at three. There is no automatic retry, credit purchase or switch to paid inference. Do not rerun repeatedly against a rate limit. Record successful `ai_advisory`, exact model/provider, request count/latency/available usage and unchanged authority before factual AI footage.

The [older model preflight](demo-assets/model-request-preflight.json) remains a historical generic-adapter shape check before OpenRouter routing, not an actual model transcript. Judge access and publication remain owner decisions in [READINESS.md](READINESS.md); the owner's `.env` is not distributed.
