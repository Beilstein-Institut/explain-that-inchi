---
phase: "10"
plan: "04"
subsystem: feedback-dialog
tags: [gap-closure, smiles-preview, uat-fix, tdd]
dependency_graph:
  requires: ["10-03"]
  provides: ["previewSmiles-on-dialog-open", "FEED-03-gap-closure"]
  affects: ["src/App.tsx", "src/components/__tests__/FeedbackDialog.test.tsx"]
tech_stack:
  added: []
  patterns: ["async-on-open-fetch", "silent-catch-per-D12", "preview-state-ephemeral"]
key_files:
  created: []
  modified:
    - src/App.tsx
    - src/components/__tests__/FeedbackDialog.test.tsx
decisions:
  - "previewSmiles stored as React useState (not Zustand) — ephemeral UI state, reset each open"
  - "handleFeedbackOpen fetches SMILES before showModal(); dialog open is never blocked (T-10-04-02)"
  - "handleFeedbackSubmit left byte-for-byte unchanged per plan constraint"
metrics:
  duration_minutes: 5
  completed_date: "2026-06-18"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 10 Plan 04: Populate Preview SMILES on Dialog Open Summary

**One-liner:** Async `handleFeedbackOpen` fetches SMILES via `getSmiles()` before `showModal()`, eliminating the UAT-T3 gap where the context-preview showed "(none)" for SMILES even with a molecule drawn.

## What Was Built

Closed the UAT gap identified in Phase 10 Test 3: the feedback dialog context-preview `<pre>` block now shows the molecule's SMILES at dialog open time instead of `(none)`.

**App.tsx changes:**
- Added `previewSmiles` React state (`useState<string | undefined>(undefined)`)
- Added `handleFeedbackOpen` async handler that calls `ketcherRef.current?.getSmiles()` with a silent catch, sets `previewSmiles`, then calls `dialogRef.current?.showModal()`
- Updated `contextPreview.smiles` to use `previewSmiles` instead of the hardcoded `undefined` literal
- Replaced the inline `() => dialogRef.current?.showModal()` arrow on `onFeedbackClick` with `handleFeedbackOpen`
- Updated the comment above `contextPreview` to reflect the new pattern

**FeedbackDialog.test.tsx changes:**
- Added new test: `'context preview renders supplied SMILES string (gap-10-UAT-T3)'`
- Renders `<FeedbackDialog>` with `contextPreview={{ smiles: 'CC(=O)O' }}` and asserts the `<pre>` block contains the supplied SMILES and does not show `(none)` for SMILES

## Verification Results

- `tsc -b --noEmit`: exits 0 — no type errors
- `vitest run`: 256 tests pass (15 test files, no regressions)
- FeedbackDialog suite: 10/10 pass (9 existing + 1 new gap-closure regression test)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. T-10-04-02 (DoS via getSmiles throwing) mitigated as required: silent catch keeps `previewSmiles` as `undefined` and `showModal()` always fires regardless.

## Known Stubs

None. `previewSmiles` is fully wired: set in `handleFeedbackOpen`, consumed in `contextPreview.smiles`, rendered by `FeedbackDialog`.

## Self-Check: PASSED

- `src/App.tsx` modified and committed at `83698ee`
- `src/components/__tests__/FeedbackDialog.test.tsx` modified and committed at `61fa55e`
- Both commits confirmed in git log
- 256 tests pass
