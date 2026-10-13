# Existing repository release audit

Inspected `68683c25b4fe82f6a336e5a2c9e9dc348fb34117` on 13 October 2026 (MYT): 33 reachable commits and 304 unique reachable blobs, including 302 text blobs and two binary blobs. The audit reads committed objects only. Ignored environment files, journals, raw audio and renders are not opened or included. The owner chose to use **Whyme-Labs/vowrail**, retaining its development history and issue board.

## Credential findings

No real credential, private key or populated credential environment file was identified within the pattern scan's scope. No filled environment or private journal path is tracked. Commit-message credential patterns also produced zero matches. These checks are evidence within a defined scope, not a secrets certification.

- Two historical versions of `test/openrouter-diagnostics.test.js` contain a deliberately synthetic error-body token used to test redaction. It is not an owner key and requires no deletion or rotation.
- The earlier scan reported 12 empty `.env.example` assignments because its whitespace pattern crossed a newline. The corrected scan excludes those false positives.
- Static order IDs in `test/checkout-e2e.test.js` belong to an injected synthetic PayPal transport. They are test fixtures.
- No current source contains absolute user-directory paths or native Library file identifiers.

The PayPal adapter fixes its host to Sandbox. OpenRouter supports an explicit free model, zero-price routing and no fallback; legacy model settings should remain blank in judge instructions. The unauthenticated server refuses public network binding.

## Sandbox evidence and assets

Four actual Sandbox order/capture references occur in `docs/PAYPAL_EVIDENCE.md`, `docs/STATUS.md`, `docs/demo-assets/paypal-sandbox-proof.json`, `docs/demo-assets/recorded-evidence.html` and the receipt JPEG. These are **nonsecret Sandbox identifiers**, not credentials, bearer tokens or live-payment secrets. Values are omitted from this audit summary.

Visual review of `docs/demo-assets/paypal-sandbox-receipt.jpg` showed only the Sandbox label, USD 207 amount and two references. No account name, email, password or funding-method details appear. The historical JPEG and labeled synthetic receipt PDF match the previously reviewed binary objects. The original control-flow SVG is authored documentation. Simulation and actual provider evidence retain distinct labels.

The source is MIT-licensed. Optional Remotion tooling has separate terms; the owner confirmed personal work / at most three people for its free-license scope and confirmed public use of the supplied audio. Raw footage/audio and renders stay ignored. The [published 90-second movie](https://youtu.be/eAb3qrygLpA) preserves the accepted file and excludes the actual receipt image and transaction references.

## Publication scope

The findings do not require credential cleanup or history rewriting. The earlier unconditional hold for Sandbox-reference sanitation was too broad. Removing these nonsecret values from current files would not erase historical blobs and is not recommended solely because the references exist. Ordinary Git author metadata remains part of the existing history.

The owner approved PR #16's normal merge at reviewed head `4e35845918970af53f883069b03c664c3a9dfca3`; merged main is `1f63210777bb952964aacbba2ffe5ebd663824da` with the same tree. The owner then made the existing repository public. Anonymous access to source, the detected MIT license and judge guide was verified. Source, evidence and history were preserved. [GitHub's visibility documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility) describes the public Actions history/logs. No history rewrite or final submission occurred.

Source and video publication are complete. Usable free integration access and final terms/submission remain pending in [READINESS.md](READINESS.md). No credential is included in this publication record.
