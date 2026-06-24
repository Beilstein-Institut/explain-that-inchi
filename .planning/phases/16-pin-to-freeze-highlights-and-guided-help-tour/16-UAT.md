---
status: testing
phase: 16-pin-to-freeze-highlights-and-guided-help-tour
source:
  - .planning/phases/16-pin-to-freeze-highlights-and-guided-help-tour/16-01-SUMMARY.md
  - .planning/phases/16-pin-to-freeze-highlights-and-guided-help-tour/16-02-SUMMARY.md
started: 2026-06-23T10:00:00.000Z
updated: 2026-06-23T10:00:00.000Z
---

## Current Test

number: 9
name: Navigate through all 8 tour steps
expected: |
  Click Next repeatedly. The spotlight and callout move to each of: Presets list, InChI
  string (×2 steps for hover and pin), InChIKey, Legend, Reset/Help buttons. The counter
  reads "2 of 8" … "8 of 8". On the last step, "Next" becomes "Finish".
awaiting: user response

## Tests

### 1. Click a layer chunk to pin the highlight
expected: Load a preset (e.g. Alanine). Hover a layer chunk to see the canvas highlight. Click it — the highlight should freeze on canvas even after you move the mouse away. A ring border appears on the pinned chunk and a "Pinned — press Esc to release" hint appears.
result: pass

### 2. Pinned highlight doesn't change when hovering other chunks
expected: While a chunk is pinned (ring + hint visible), hover other layer chunks. The canvas highlight should NOT change — it stays frozen on the originally-pinned layer.
result: pass

### 3. Esc key releases the pin
expected: With a chunk pinned, press Esc. The ring and hint disappear. The canvas highlight clears. Hovering other chunks now updates the highlight again normally.
result: pass

### 4. Click pinned chunk again to release
expected: With a chunk pinned (ring visible), click that same chunk again. The pin is released (ring and hint disappear), and hovering now works freely again.
result: pass

### 5. Click outside releases the pin
expected: With a chunk pinned, click somewhere outside the InChI strip (e.g. on the canvas area or the legend). The pin is released (ring and hint disappear).
result: pass

### 6. Sub-token click-to-pin
expected: Hover a sub-token inside a layer (e.g. a formula element like "C" or a connection-layer atom number). Click it — the canvas highlight freezes on that sub-token's atoms. A ring appears on the sub-token. Esc or clicking outside releases it.
result: pass

### 7. Help button visible in toolbar
expected: A "Help" button appears in the toolbar to the left of "Reset" and "Send feedback". It matches the same pill-shaped style as the Reset button.
result: pass

### 8. Click Help opens 8-step tour
expected: Click the Help button. A dimmed overlay appears with a spotlight cutout around the Ketcher editor. A callout card shows "1 of 8", a title "The molecule editor", and body text about drawing structures. Back and Next buttons are present; Back is disabled on step 1.
result: pass

### 9. Navigate through all 8 tour steps
expected: Click Next repeatedly. The spotlight and callout move to each of: Presets list, InChI string (×2 steps for hover and pin), InChIKey, Legend, Reset/Help buttons. The counter reads "2 of 8" … "8 of 8". On the last step, "Next" becomes "Finish".
result: [pending]

### 10. All 4 close paths dismiss the tour
expected: Test each: (a) click the × button on the callout — tour closes; (b) reopen, click outside the spotlight on the dimmed area — tour closes; (c) reopen, press Esc — tour closes; (d) reopen, advance to last step and click Finish — tour closes. In all cases the overlay disappears cleanly.
result: [pending]

### 11. Empty canvas auto-loads Caffeine on Help click
expected: Reset the canvas (or start fresh) so no molecule is loaded. Click Help. Before or as the tour opens, the Caffeine molecule should appear in the editor — so the tour demonstrations are live. The Caffeine molecule persists after closing the tour.
result: [pending]

### 12. Non-empty canvas — tour opens without replacing the molecule
expected: Load any preset (e.g. Alanine). Click Help. The tour opens but the canvas still shows Alanine — the existing molecule is NOT replaced with Caffeine or cleared.
result: [pending]

### 13. Reopening the tour starts from step 1
expected: Open the tour, advance to step 3 or 4, then close. Click Help again. The tour opens at step 1 ("The molecule editor"), not where you left off.
result: [pending]

## Summary

total: 13
passed: 8
issues: 0
skipped: 0
pending: 5

## Gaps

[none yet]
