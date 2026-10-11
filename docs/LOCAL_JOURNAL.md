# Local journal and restart recovery

`npm start` uses the existing in-memory intent Map with a local checkpoint journal. Default directory: `.vowrail/journal/`, ignored by Git. `VOWRAIL_STATE_DIR` can select a private local directory. Direct `NegotiationGateway` construction without a store remains memory-only for isolated tests and smoke demonstrations.

Each state transition checkpoints the mandate, offers, consumed rounds, round request keys/results, checkout amount, stable create/capture request IDs, known order ID, capture-attempt flag, confirmed capture ID and policy events. The journal stores synthetic buyer data including the private cap. It excludes credentials, access tokens, raw model messages and raw payer/provider payloads. Do not upload it to GitHub, Devpost or public logs.

## Commit behavior

The store writes a versioned JSON checkpoint into a uniquely named staging file with mode `0600`, flushes it, then creates a hard link at the next numbered revision. Existing revisions cannot be replaced by this operation. It flushes the containing directory before allowing execution to continue. The newly created directory has mode `0700`. This uses Node's [standard filesystem API](https://nodejs.org/docs/latest-v22.x/api/fs.html), with no runtime dependency or database service.

A second writer working from an older revision fails rather than overwriting the newer reservation. Any storage error latches the gateway unavailable: no later execution or state response is allowed from the possibly stale process. Health returns HTTP 503. Stop the process, preserve the journal, investigate disk/permission/conflict errors, and restart from the same directory. Do not bypass a failed checkpoint.

The latest committed record is authoritative. Incomplete `.pending-*` files are ignored; invalid latest records or incompatible versions refuse startup. The loader does not silently fall back to an older revision. Historical records and staging files are not automatically pruned; this is intended for a small synthetic demo. Keep the directory private and monitor disk space. Never delete newer records to reset a checkout.

## Restart behavior

| State at interruption | Restored behavior |
|---|---|
| `ROUND_IN_PROGRESS` | Retain consumed round and request key; return to `OPEN`; replay does not resend merchant requests |
| `CHECKOUT_CREATING` | `RECONCILIATION_REQUIRED`; use the known order ID if checkpointed and recover a validated Sandbox approval link from order GET when needed, otherwise manual dashboard investigation |
| `CAPTURE_IN_PROGRESS` | `RECONCILIATION_REQUIRED`; retain whether capture was reserved; read-only verification can recover a receipt |
| `RECONCILIATION_IN_PROGRESS` | `RECONCILIATION_REQUIRED`; another read is safe, another attempted capture is prohibited |
| `AWAITING_BUYER_APPROVAL` | Retain selected offer, amount, expiry and approval link; first capture remains explicit |
| `COMPLETED` | Return the stored receipt on repeated matching requests without provider execution |

If capture was reserved but the process died before sending it, recovery still treats the outcome as uncertain and never retries. This deliberately prefers an unresolved checkout over duplicate execution. When a verified read proves no capture was ever reserved, a still-active mandate can resume its first explicit capture. Expiry never resets on restart.

Inconsistent checkout status/state or an awaiting-approval record with an existing capture attempt refuses startup. Capture also checks the attempt flag directly before any provider read. An approved known order can be explicitly verified/captured even if its approval link was not retained; the browser renders that control independently of the link. A still-unapproved order without a valid Sandbox link stays unresolved for dashboard investigation.

## Proven scope and remaining work

Synthetic tests use actual worker `SIGKILL`, real Node filesystem operations, restart, repeated requests and local HTTP. They cover lost create/capture responses, known-order recovery, interrupted verification/reconciliation, persisted receipt replay, consumed rounds, disk failures and stale writers. They do not call real PayPal or model services.

Run one local server per journal on a trusted machine. A conflict guard is not a supported multi-worker deployment or automatic replication scheme. Network filesystems, Windows behavior, hardware/power failure, deletion/rollback, malicious operators, journal migration and production crash durability have not been qualified. The local journal has no encryption, authenticated principals, hosted transactional store, outbox or background capture retry. Those remain separate acceptance gates in issue #6 and deployment work in #8.
