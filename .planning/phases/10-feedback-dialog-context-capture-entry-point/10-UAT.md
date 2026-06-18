---
status: complete
phase: 10-feedback-dialog-context-capture-entry-point
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md]
started: 2026-06-18T07:22:49Z
updated: 2026-06-18T07:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Open the feedback dialog
expected: A "Send feedback" trigger sits right-aligned on the "Draw a molecule…" section-label row. Clicking it opens a centered modal dialog over a dimmed backdrop, rendered above (not behind) the Ketcher canvas, with no wasted empty band where the trigger lives.
result: pass

### 2. Dialog contents
expected: The open dialog shows — five category radio options with "General" pre-selected; a message textarea with a placeholder; a read-only context-preview block listing InChI / SMILES / Preset / Version / User-Agent; and a note stating the issue will be filed publicly (the word "public" emphasized).
result: pass

### 3. Context preview reflects the current molecule
expected: With a preset molecule loaded (e.g. pick one from the presets), the preview block shows that molecule's actual InChI string and the preset's name, plus an app version string. Drawing a custom molecule (or empty canvas) instead shows the placeholders "(no structure loaded)" / "(none)" / "(custom molecule)" where appropriate rather than stale data.
result: issue
reported: "if I have drawn a molecule, shouldn't the smiles be shown in the what-gets-attached panel? You show the inchi correctly, why not show the SMILES?"
severity: minor

### 4. Submit opens a prefilled GitHub issue
expected: Type a message, optionally pick a category, click submit. A new browser tab opens to GitHub's "new issue" page for this repo, pre-filled — the title is prefixed by the chosen category and the body contains your message plus the auto-collected context (InChI/SMILES/preset/version/UA) inside fenced code blocks. Back in the app, the dialog closes and the form resets (category back to General, message cleared).
result: pass

### 5. Large-molecule truncation / clipboard fallback
expected: For a molecule whose context makes the URL exceed GitHub's size budget (e.g. the big multi-fragment repro molecule), submitting keeps the dialog OPEN and reveals a truncation notice with a "Copy full issue body" button. Clicking it copies the full untruncated issue body to the clipboard and shows a transient "Copied!" confirmation that disappears after a few seconds. (Skip if you can't easily load a large molecule.)
result: pass

### 6. Cancel / dismiss the dialog
expected: Pressing Escape (or clicking Cancel) closes the dialog cleanly. The dialog fully disappears — it does not linger as a ghost element behind the Ketcher canvas — and the canvas remains fully interactive afterward. No console errors.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

<!-- YAML format for plan-phase --gaps consumption -->
- truth: "The feedback context-preview panel should display the current molecule's SMILES when a structure is drawn/loaded, consistent with how it already shows the InChI."
  status: resolved
  resolved_by: 10-04
  reason: "User reported: if I have drawn a molecule, shouldn't the smiles be shown in the what-gets-attached panel? You show the inchi correctly, why not show the SMILES?"
  severity: minor
  test: 3
  root_cause: "App.tsx contextPreview hardcodes smiles: undefined (line 70). InChI is read synchronously from the Zustand store, but SMILES requires an async ketcherRef.getSmiles() call which the original design deferred to submit-time only (D-12/D-14). Preview always renders 'SMILES: (none)'. The SMILES IS still collected and attached at submit time — only the preview omits it."
  artifacts:
    - path: "src/App.tsx"
      issue: "contextPreview.smiles hardcoded to undefined (~line 70); never populated for the preview"
  missing:
    - "Populate preview SMILES via a single getSmiles() call on dialog open (showModal), not per-render"
  debug_session: ""
