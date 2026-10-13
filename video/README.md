# Vowrail private film

Built with [Remotion](https://www.remotion.dev/); [licensing](https://remotion.pro/license) applies independently of Vowrail's MIT license. The owner confirmed personal work / at most three people for this use. No paid render service, license purchase or signup was used.

This isolated video package preserves the dependency-free Node application. Install from the official npm registry in this directory. Local assets and rendered outputs are intentionally ignored; preserve them privately. The supplied asset manifest distinguishes recorded local simulation, historical model text, synthetic UI replay and a historical Sandbox text summary. Never add account screenshots, payment references, credentials or journals.

The original silent film is a 165-second 1920×1080 composition at 30fps. The owner's shorter revision is `Vowrail90`, 90 seconds at the same resolution/rate: buyer problem, Vowrail at six seconds, permission, negotiation, review, expiry, separate Sandbox result, recovery and outcome. It uses only the audio from the owner's uploaded clip, normalized to a quieter level and looped with 0.5-second joins and a final fade. The uploaded video's images are excluded. The audio stays in ignored private assets; public use/rights are not assumed. All motion is deterministic from frame numbers. No external fonts or provider calls. Historical observations are not a continuous live purchase demonstration. Buyer review of delivery estimates/free-text terms remains necessary.

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

To prepare and render the shorter edit, use a separate output directory so earlier cuts remain intact:

```sh
node prepare-audio.mjs /private/path/to/user-uploaded-clip.MP4
node verify-short.mjs
REMOTION_BROWSER_EXECUTABLE=/path/to/verified/chrome-headless-shell VOWRAIL_VIDEO_OUT=/private/path/to/new-output node render.mjs --short --stills
REMOTION_BROWSER_EXECUTABLE=/path/to/verified/chrome-headless-shell VOWRAIL_VIDEO_OUT=/private/path/to/new-output node render.mjs --short --render
```

The owner requested removing the final two seconds of the original track. Use `node prepare-audio.mjs /private/path/to/user-uploaded-clip.MP4 --trim-end-seconds=2`. Trimming happens before normalization and repetition, so the removed ending does not recur in the loops. The video remains 90 seconds; a previously verified silent video stream can be remuxed with the new checked audio without rerendering its frames. Preserve the previous audio asset/manifest and movie first.

The short composition previews its prepared audio with Remotion's Audio component. Export renders silent chunks and muxes that same checked 90-second audio once, preserving continuous audio across chunk boundaries. The file is not a speech transcription; captions are authored story text.

The renderer refuses a complete export from an uncommitted working tree. Each chunk has a source/asset fingerprint, composition ID and SHA256 receipt; only a matching completed chunk is resumed. Missing/changed chunks are preserved under a different name. Every chunk has a 180-second watchdog; the cumulative work budget is 25 minutes. Source, footage and final files stay private. Local assets are limited to three existing app-media files plus the optional checked supplied-audio derivative; the historical Sandbox section is authored text, never a receipt screenshot.
