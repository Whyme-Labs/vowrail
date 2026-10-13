# Vowrail private film

Built with [Remotion](https://www.remotion.dev/); [licensing](https://remotion.pro/license) applies independently of Vowrail's MIT license. The owner confirmed personal work / at most three people for this use. No paid render service, license purchase or signup was used.

This isolated video package preserves the dependency-free Node application. Install from the official npm registry in this directory. Local assets and rendered outputs are intentionally ignored; preserve them privately. The supplied asset manifest distinguishes recorded local simulation, historical model text, synthetic UI replay and a historical Sandbox text summary. Never add account screenshots, payment references, credentials or journals.

The film is a 165-second 1920×1080 composition at 30fps. All motion is deterministic from frame numbers. No voice, music, external fonts or provider calls. Historical observations are not a continuous live purchase demonstration. Buyer review of delivery estimates/free-text terms remains necessary.

Rendering uses one browser renderer, sequential chunks and one encoding thread. Temporary HTTP servers are bound to loopback by a process-local wrapper, tested with an explicit wildcard bind request. This does not change system networking or other applications. Preview and inspect before the complete render. A prepared asset manifest and renderer report record exact files, source revision and limits. Keep the previous cut. Private review only; no public release or final submission.

From the repository root, after supplying the retained private app-only assets:

```sh
cd video
npm ci
node prepare-assets.mjs /path/to/vowrail-private-demo
node verify.mjs
npm run studio
REMOTION_BROWSER_EXECUTABLE=/path/to/verified/chrome-headless-shell npm run preview
REMOTION_BROWSER_EXECUTABLE=/path/to/verified/chrome-headless-shell npm run render
```

The renderer refuses a complete export from an uncommitted working tree. Each chunk has a source/asset fingerprint and SHA256 receipt; only a matching completed chunk is resumed. Missing/changed chunks are preserved under a different name. Every chunk has a 180-second watchdog; the cumulative work budget is 25 minutes. Source, footage and final files stay private. All local assets are sourced from a three-file allowlist; the historical Sandbox section is authored text, never a receipt screenshot.
