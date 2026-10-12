# Observed PayPal Sandbox purchase

One owner-authorized synthetic USD 207.00 purchase completed on 12 October 2026. This used the existing Default Application Sandbox merchant and a separate Personal Sandbox buyer. The Atlas print quote is simulated; Atlas is not the receiving PayPal merchant. No live payment was made.

| Check | Observed result |
|---|---|
| Locked intent | `dc40a936-c0c9-49fb-a426-b859cb94a2a9`, 100-unit synthetic print run, USD 207.00 |
| PayPal order | `32559119TH0114416`, intent `CAPTURE`, matching purchase-unit reference and currency/amount |
| Before capture | Independent order GET at 23:52:57 MYT: `APPROVED`, zero captures, mandate active, attempt lock false |
| Gateway execution | One explicit capture action at approximately 23:54 MYT, before mandate expiry at 23:57:41 |
| Authoritative receipt | Independent order GET at 23:56:22 MYT: `COMPLETED`, exactly one completed capture `0UE226455L081041X`, USD 207.00 |
| Restart | Completed local receipt restored before a provider read; at 00:00:51 MYT on 13 October the stored receipt remained completed after expiry, with attempt lock retained |
| Buyer dashboard | Completed Test Store payment, USD 207.00, matching synthetic description. Buyer transaction reference differs from the API capture reference |
| Older attempts | Two expired orders remain uncaptured, with no capture-attempt lock or capture ID |

The completed `/reconcile` endpoint returns the restored local receipt without querying PayPal. The separate authoritative GET above independently verified provider completion. Recovery did not call a capture endpoint, extend the expired mandate or rebind an older order.

[Sanitized checks](demo-assets/paypal-sandbox-proof.json) retain only observation times, transaction references, statuses and verification results. [App receipt screenshot](demo-assets/paypal-sandbox-receipt.jpg) is an unaltered crop of the rendered app, excluding account pages, browser chrome, credentials and payment-method values. These are captured observations, not reusable provider fixtures. Preserve the private journals and original evidence; do not create another payment to reproduce a screenshot.

The linked fictional funding method was verified before the fresh order; the owner entered authentication privately. No account emails, passwords, client secrets, full card numbers, expiry or security codes are included here. Provider identifiers are Sandbox references, not credentials.

The success path now has actual provider evidence. Actual canceled/declined buyer approval remains an open gate in [issue #5](https://github.com/Whyme-Labs/vowrail/issues/5); its existing synthetic regressions do not qualify those provider cases. Lost-response crash behavior is proven by synthetic transport and worker tests, not by forcing an additional real transaction. Real AI qualification is separate in [MODEL_QUALIFICATION.md](MODEL_QUALIFICATION.md).
