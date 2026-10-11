# Buyer-flow accessibility evidence

Checked 11 October 2026 on the actual loopback app in Safari on the Mac, with PayPal/model credentials disabled and an isolated synthetic journal. The baseline passed 80 actual Node tests. These observations cover responsive rendering, keyboard input, accessibility-tree labels and source-palette contrast; they do not certify WCAG conformance.

## Defects and fixes

- Creating a mandate hid the focused form without moving focus. Completion now focuses the negotiation heading; the next keyboard stop is the bidding button.
- A completed round could disable the focused control, while rebuilding offers or checkout controls could remove the focused element. Focus now moves to the resulting offers, advice or checkout region. Expiry returns focus from a replaced offer to its heading; errors focus the visible status message. These reading positions have visible outlines.
- A successful advice retry left the prior request error visible. It now replaces the stale error with a success message while preserving the labeled advice mode.
- Secondary text failed normal-text contrast: hints were 4.06:1, offer details 3.78:1 and event times 2.69:1 on white. The muted palette is darker; a regression checks ten actual text/background pairs at 4.5:1 or higher.
- Buttons, inputs and round selection have a 44 CSS pixel minimum height. Secondary actions occupy separate lines. Panels and offer columns allow long unbroken item text to wrap instead of widening the layout.

The contrast and reflow criteria come from [WCAG 2.2](https://www.w3.org/TR/WCAG22/), especially 1.4.3 and 1.4.10. The 44-pixel height is a project touch-usability target. Disabled controls are visibly unavailable and remain outside the keyboard sequence.

## Manual checks

| View / action | Observed result |
|---|---|
| 320 × 844 CSS pixels | Form labels and fields fit; keyboard submission creates the mandate. Long unbroken synthetic item wraps in mandate/review. Review shows price, delivery, expiry, margin and configuration status. |
| Keyboard form → round → review → back | Tab traverses fields; Option-Tab reaches buttons under this Mac's current Safari keyboard settings. Space activates them. Focus lands on the console, offers and review headings, then returns to comparison. No global keyboard preference was changed. |
| 390 × 844 | Both rounds and retained quotes render; round 3 stays disabled. A transient recommendation request failure focused its error; an explicit retry returned labeled deterministic advice. The stale-error defect was reproduced and fixed. |
| 768 × 844 | Advice and side-by-side offer details fit; fallback is labeled and focus outlined. Reload preserves the capped intent without automatically executing a payment. |
| 1024 × 844 | Both main panels fit side by side; long item text wraps within the mandate panel and secondary actions remain separate. |

Safari's [keyboard shortcuts documentation](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac) describes Option-Tab traversal. The accessibility tree exposes associated form labels, named sections, merchant/round/price review labels, disabled controls and live status regions. Auditory VoiceOver testing was not performed; actual speech ordering and announcement behavior remain a manual gate.

## Reproduce and remaining limits

Run `node --test test/browser-state.test.js test/accessibility.test.js`, then `npm start` with credentials unset. In Safari Responsive Design Mode check 320, 390, 768 and 1024 pixel widths. Create a synthetic mandate, use both rounds, ask for advice, review/back out and reload. Repeat with a long item, keyboard only, a network failure and quote expiry. The shipped-script tests cover focus after creation/final round/advice/checkout, expiry with no request, stale-error recovery and lost-capture errors. The full sequential Node 22.23.0 coverage run passed all 86 tests with no failures/cancellations. Provider transport and payment recovery remain synthetic in the automated end-to-end tests.

Physical touch devices, zoom at 200%/400%, auditory screen readers, real Sandbox approval/cancellation and configured-model output remain unverified. No full accessibility completion is claimed for #3. Responsive screenshots and the native accessibility tree were inspected during the session; they contain only synthetic app data.
