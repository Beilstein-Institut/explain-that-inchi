---
phase: "10"
plan: "03"
subsystem: feedback-wiring
tags: [feedback, app-wiring, dialog, context-assembly, toolbar]
dependency_graph:
  requires:
    - phase: "10-01"
      provides: "buildFeedbackUrl with BuildFeedbackUrlResult.fullBody"
    - phase: "10-02"
      provides: "FeedbackDialog component accepting dialogRef/onSubmit/contextPreview"
  provides:
    - "FeedbackDialog mounted in App.tsx as leaf sibling"
    - "handleFeedbackSubmit async function assembling FeedbackContext at submit time"
    - "Feedback toolbar row (right-aligned pill button) between Header and KetcherPanel"
  affects: [human-verify checkpoint — visual/functional browser verification required]
tech-stack:
  added: []
  patterns:
    - "getState() store read (not hook subscription) for impure context assembly at submit time (D-14)"
    - "dialogRef.current?.showModal() for imperative modal open from toolbar button"
    - "contextPreview snapshot computed per-render for dialog preview prop (smiles=undefined, live only at submit)"
    - "silent catch fallback for getSmiles() — smiles becomes undefined, submit never blocked (D-12)"
key-files:
  created: []
  modified:
    - src/App.tsx
key-decisions:
  - "contextPreview snapshot computed inline per-render (not memoized) — selectedMolId is state so re-renders happen naturally on preset change; no stale preview risk"
  - "Inline styles used for toolbar row and pill button — no App.module.css existed, and creating a CSS module for a single layout row would be over-engineering"
  - "FeedbackDialog placed as leaf sibling before KetcherPanel, not after — ensures dialog is in DOM before KetcherPanel mounts, consistent with HTML5 dialog best practice (modals near their trigger)"
patterns-established:
  - "Impure context assembly (Ketcher API, navigator, store) belongs in App.tsx handleFeedbackSubmit — not in dialog components (D-14)"
requirements-completed:
  - FEED-01
  - FEED-08

# Metrics
duration: ~8min
completed: 2026-06-17
---

# Phase 10 Plan 03: App Wiring Summary

**Right-aligned pill button toolbar entry point wired to FeedbackDialog modal via dialogRef, with handleFeedbackSubmit assembling live FeedbackContext from Ketcher WASM, Zustand store, and navigator at submit time.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-17T14:20:00Z
- **Completed:** 2026-06-17T14:28:00Z
- **Tasks:** 1 of 2 (Task 2 is checkpoint:human-verify — awaiting human approval)
- **Files modified:** 1

## Accomplishments

- Added three imports to App.tsx: FeedbackDialog component, buildFeedbackUrl function, and associated types (FeedbackCategory, FeedbackContext, BuildFeedbackUrlResult)
- Added `dialogRef = useRef<HTMLDialogElement>(null)` alongside existing refs
- Added `contextPreview` snapshot computed per-render for the dialog preview prop (smiles=undefined; live getSmiles() is only called at submit time per D-12)
- Added `handleFeedbackSubmit` assembling FeedbackContext at submit time: reads inchi via `useInchiStore.getState().inchi` (not a hook subscription per D-14), awaits `ketcherRef.current?.getSmiles()` with silent catch fallback, reads presetName from MOLECULES.find, reads userAgent from navigator.userAgent verbatim (D-13), formats appVersion as `v${__APP_VERSION__} (${__APP_COMMIT__.slice(0,7)})`
- Inserted feedback toolbar row (right-aligned pill, inline styles) between `<Header />` and `<KetcherPanel ...>` in JSX
- Mounted `<FeedbackDialog>` as leaf sibling before KetcherPanel — KetcherPanel, InchiSection, and Explanation positions unchanged (D-02)
- tsc exits 0, vitest run exits 0 (255 tests pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire FeedbackDialog into App.tsx — toolbar row, dialogRef, submit handler** - `d10a04d` (feat)

**Plan metadata:** (committed below)

## Files Created/Modified

- `src/App.tsx` — Added FeedbackDialog imports, dialogRef, contextPreview snapshot, handleFeedbackSubmit, toolbar row JSX, FeedbackDialog mount

## Decisions Made

- `contextPreview` computed inline each render (not in a `useMemo`) — selectedMolId is React state so re-renders happen naturally when presets change; the snapshot stays fresh without explicit memoization overhead
- Used inline styles for toolbar row and pill button — no `App.module.css` existed; creating a dedicated CSS module for a single layout row adds file noise without benefit
- FeedbackDialog placed as leaf sibling immediately before KetcherPanel (not after all panels) — keeps the dialog element near its opener in the DOM; all three existing components (KetcherPanel, InchiSection, Explanation) are untouched

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The `contextPreview.smiles` is intentionally `undefined` in the preview (the plan specifies this: live getSmiles() is only called at submit time). The dialog renders the D-15 placeholder "(none)" for SMILES in the preview — this is by design, not a stub.

## Threat Flags

No new trust surface beyond the threat model:
- T-10-03-02 (getSmiles throws): silent catch sets smiles=undefined — mitigated
- T-10-03-04 (KetcherPanel remount risk): KetcherPanel position in JSX unchanged — mitigated
- T-10-03-SC (npm/build install): no new packages added

## Self-Check: PASSED

- [x] `src/App.tsx` modified — imports, dialogRef, contextPreview, handleFeedbackSubmit, toolbar, FeedbackDialog mount
- [x] Commit d10a04d exists (feat(10-03): wire FeedbackDialog into App)
- [x] `tsc -b --noEmit`: exits 0
- [x] `vitest run`: 255 tests pass, 0 regressions
- [x] FeedbackDialog is a leaf sibling — KetcherPanel appears after it at line 219
- [x] All `useInchiStore` usages are `getState()` — no hook subscription for feedback

## Checkpoint Status

Task 2 is `type="checkpoint:human-verify"` — awaiting human visual/functional verification of the complete feedback feature in the browser.
