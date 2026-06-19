---
status: complete
phase: 12-render-layout
source:
  - 12-01-SUMMARY.md
  - 12-02-SUMMARY.md
started: 2026-06-19T06:03:05Z
updated: 2026-06-19T06:06:10Z
---

## Current Test

[testing complete]

## Tests

### 1. InChIKey strip appears below the InChI
expected: With a molecule loaded (e.g. caffeine preset), an InChIKey strip renders directly below the InChI strip — dimmed "InChIKey" prefix (no "="), then the 27-character key as color-coded segments with dimmed hyphens at the boundaries.
result: pass

### 2. Segment hover surfaces a per-segment explanation card
expected: Hovering any InChIKey segment surfaces an explanation card in the explanation panel (one of: Skeleton hash / remaining-layers hash / flag+version / protonation). The hovered segment is emphasized and the other segments dim.
result: pass

### 3. No canvas highlight on key hover (the teaching point — Invariant #2)
expected: While hovering an InChIKey segment, NO atoms or bonds light up in the molecule canvas — unlike InChI layers, the key segments never highlight the structure. (This absence is intentional: the key is a one-way hash.)
result: pass

### 4. Stale card clears when the canvas empties (CR-01 fix)
expected: Hover an InChIKey segment so its card shows, then clear the canvas (delete the molecule). The InChIKey strip switches to its "Draw a molecule above…" placeholder AND the explanation panel returns to the idle/default card — no stale "Skeleton hash" (or other) key card stays stuck over the empty strip.
result: pass

### 5. Key-hover and InChI-layer hover are mutually exclusive (WR-01 fix)
expected: Hover an InChIKey segment (key card shows), then move to hover an InChI layer chunk above — the panel switches to the InChI-layer card and the key card is gone. Reverse direction works too: hovering a key segment after an InChI layer replaces the layer card with the key card. Only one card is ever shown.
result: pass

### 6. Copy button copies the verbatim key
expected: Clicking the InChIKey copy button shows a visual confirmation (e.g. checkmark / "Copied"), and pasting elsewhere yields exactly the displayed 27-character key — identical to what's on screen, no characters dropped or rejoined.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
