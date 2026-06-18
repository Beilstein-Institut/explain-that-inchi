---
phase: 11-source-wiring
plan: "03"
subsystem: app-wiring
tags: [app, handleChange, promise-allsettled, inchikey, concurrent-fetch]
dependency_graph:
  requires: [11-02]
  provides: [inchiKey-live-pipeline]
  affects: [src/App.tsx]
tech_stack:
  added: []
  patterns: [promise-allsettled-concurrent-wasm, generationref-stale-guard-extended, asymmetric-rejection-handling]
key_files:
  modified: [src/App.tsx]
decisions:
  - "Promise.allSettled replaces single await getInchi(true) — both WASM calls run concurrently in the same 150ms debounce tick (D-01, D-02a)"
  - "generationRef stale guard fires after allSettled resolves, covering both inchiResult and keyResult atomically (T-11-03)"
  - "Asymmetric rejection handling: rejected inchiResult blanks inchi+inchiKey; rejected keyResult produces '' for inchiKey without affecting inchi display (D-02, T-11-04)"
  - "All four setInchiData call sites have explicit 6th arg — the new rejected-InChI early-return path, empty-canvas guard, catch path, and success path (D-05)"
  - "No second editor.subscribe, no new generationRef, no getInChIKey() call outside handleChange (Invariant #4)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-18"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 11 Plan 03: App Wiring — concurrent InChIKey fetch via Promise.allSettled

Replaces the single `await ketcher.getInchi(true)` in the existing debounced `handleChange` with `await Promise.allSettled([ketcher.getInchi(true), ketcher.getInChIKey()])`, propagating `inchiKey` through all `setInchiData` call sites. The Zustand store's `inchiKey` field is now populated on every molecule change, cleared on empty/error, and never lags due to the existing `generationRef` stale guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace getInchi await with Promise.allSettled and wire inchiKey into all setInchiData calls | f19b1e7 | src/App.tsx |

## Verification Results

- `npx tsc --noEmit` exits 0
- `npx vitest run` exits 0 — 275 tests pass, no regressions
- `grep -c "allSettled" src/App.tsx` = 1
- `grep -c "getInChIKey" src/App.tsx` = 1
- `grep -c "editor.subscribe" src/App.tsx` = 1 (no second subscription added)
- All 4 `setInchiData` call sites have explicit 6th arg (`''` or `inchiKey` variable)
- `inchiResult.status === 'rejected'` early-return added after allSettled (D-02 symmetric)
- `keyResult.status === 'fulfilled' ? keyResult.value : ''` resolves inchiKey (D-02 asymmetric)

## Deviations from Plan

**Minor scope note — 4 setInchiData call sites instead of 3:** The plan's interface section documented 3 call sites (empty-canvas guard, catch, success). The implementation correctly adds a 4th: the `if (inchiResult.status === 'rejected')` early-return branch inserted after the allSettled await. This is present in the plan's target-code snippet (line 105) and is a correct mechanical consequence of the allSettled migration. No actual deviation — the plan counted the pre-existing call sites, not the new early-return that allSettled requires.

## Threat Surface Scan

No new security-relevant surface introduced. Changes are confined to the existing `handleChange` debounce body inside `App.tsx`. T-11-03 (stale result overwrite) mitigated — generationRef check fires after allSettled resolves before any setInchiData call. T-11-04 (key rejection blanks valid InChI) mitigated — asymmetric handling implemented explicitly.

## Self-Check: PASSED

- [x] `src/App.tsx` modified and committed at f19b1e7
- [x] `npx tsc --noEmit` exits 0
- [x] `npx vitest run` exits 0 (275 tests)
- [x] `Promise.allSettled` present in handleChange
- [x] `getInChIKey()` called inside allSettled array
- [x] `inchiResult.status === 'rejected'` early-return present
- [x] `keyResult.status === 'fulfilled' ? keyResult.value : ''` present
- [x] All 4 setInchiData calls have explicit 6th argument
- [x] `grep -c "editor.subscribe" src/App.tsx` = 1
- [x] No `getInChIKey` call outside handleChange debounce body
