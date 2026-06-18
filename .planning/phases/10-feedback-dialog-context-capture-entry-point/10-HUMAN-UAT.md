---
status: partial
phase: 10-feedback-dialog-context-capture-entry-point
source: [10-VERIFICATION.md]
started: 2026-06-18T07:58:00Z
updated: 2026-06-18T07:58:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Trigger placement and dialog open
expected: The "Send feedback" control sits inline on the "Draw a molecule…" section-label row (no empty toolbar band). Clicking it opens the modal above the canvas with a backdrop; Escape closes it cleanly (no lingering dialog behind the canvas).
result: [pending]

### 2. SMILES in preview on dialog open (gap-closure re-confirmation — UAT Test 3)
expected: With a molecule drawn or a preset loaded, opening the feedback dialog shows the molecule's actual SMILES in the "what gets attached" preview — NOT "SMILES: (none)". Open/close/reopen with a different molecule: the preview shows the new molecule's SMILES with no flash of the previous one.
result: [pending]

### 3. Submit opens prefilled GitHub tab
expected: Clicking submit opens a prefilled GitHub issues/new page in a new tab without being popup-blocked; category, message, and context body are pre-filled.
result: [pending]

### 4. Canvas integrity after repeated open/close
expected: After repeatedly opening/closing the dialog, the Ketcher canvas does not remount, the console shows no errors, and drawing + InChI generation continue working normally.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
