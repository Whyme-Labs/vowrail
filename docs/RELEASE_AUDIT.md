# Private source release audit

Audited candidate `94d1eddadcf4ea7bd090d1259314c45fbaf4e64c` on 13 October 2026 (MYT): 32 reachable commits, 301 unique reachable blobs, including 299 text blobs and two binary blobs. The audit reads committed objects only; private environment files, journals and ignored media inputs are not opened or modified.

## Publication holds

- The actual Sandbox receipt image `docs/demo-assets/paypal-sandbox-receipt.jpg` displays order/capture references. `docs/demo-assets/paypal-sandbox-proof.json`, `docs/demo-assets/recorded-evidence.html` and `docs/PAYPAL_EVIDENCE.md` also retain references, including older uncaptured orders. These are Sandbox test identifiers, not credentials or live-payment secrets. Current evidence and reachable history need sanitation before public exposure, unless the owner specifically authorizes publishing those values. Values are deliberately omitted from this report.
- Changing current files alone does not remove their historical blobs. Preserve the private evidence and repository work; do not rewrite, delete or force-push history without an exact approved release plan.
- Public repository approval is outstanding. The accepted video excludes the actual receipt image and private payment references; its SHA256 remains `6f663e4bcfdb017c994f99b6b051178a81919a8764181044d711fb06c5208338`.

## Credential and asset checks

All 14 credential-pattern matches were manually classified: 12 empty historical `.env.example` assignments matched because the scan's whitespace expression crossed a newline; two were static error-body fixtures in the pure diagnostic-redaction unit test. No real credential was identified by these checks, and no tracked environment/journal/private-key path was found. Current `.env`, journal contents and supplied audio/media are ignored. This pattern scan is evidence, not a secrets certification.

The source adapter fixes PayPal to its Sandbox host. The model setup supports strict explicit free-only OpenRouter routing, while legacy model settings remain available and should be blank in judge instructions. The unauthenticated server refuses public network binding.

Current media: original control-flow SVG, actual Sandbox receipt JPEG and simulated receipt PDF. The JPEG requires reference cleanup. Simulation media must retain its labels. The source is MIT-licensed; Remotion's separate terms and the owner's confirmed personal/small-team scope remain documented. The owner has now confirmed the supplied audio can be used publicly. Git history also contains author metadata; the eventual repository-release scope includes that history.

## Current boundary

No repository visibility change, history rewrite, credential provisioning, inference, payment or final submission occurred in this audit. Publication of the accepted video on the verified Whyme Labs channel is separately authorized; its outcome must be checked in Studio after the browser connection is restored. The private audit record contains object/path locations without printing credentials or transaction-reference values.
