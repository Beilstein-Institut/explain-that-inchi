---
phase: 11-source-wiring
plan: "02"
subsystem: store
tags: [zustand, state, inchikey, backward-compatible]
dependency_graph:
  requires: [11-01]
  provides: [inchiKey-store-field]
  affects: [src/store.ts]
tech_stack:
  added: []
  patterns: [zustand-single-set-atomicity, trailing-optional-arg-extension]
key_files:
  modified: [src/store.ts]
decisions:
  - "Single atomic set() call in setInchiData writes inchiKey together with all other fields (D-04) — prevents InChI/inchiKey out-of-sync window (T-11-02)"
  - "Trailing optional inchiKey param defaults to '' — all existing 5-arg call sites in App.tsx compile without modification"
  - "No separate setInchiKey action — inchiKey is always written atomically with inchi and layers (D-03)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-18"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 11 Plan 02: Store Extension — inchiKey field and setInchiData extension

Extends `InchiState` with a verbatim `inchiKey: string` field and extends the `setInchiData` action with a trailing optional `inchiKey?: string` parameter that defaults to `''`, using a single atomic `set()` call (D-03, D-04).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add inchiKey field to InchiState and extend setInchiData (D-03, D-04) | 4e76253 | src/store.ts |

## Verification Results

- `npx tsc --noEmit` exits 0 — all existing App.tsx callers compile with 5 args unchanged
- `grep -c "inchiKey" src/store.ts` = 5 (comment, interface field, interface sig, initial state, setter arg)
- `grep -c "setInchiKey" src/store.ts` = 0 — no separate action added
- Exactly 3 `set()` calls: one each in setInchiData, setHover, setSubHover — no extra set() call

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new security-relevant surface introduced. The change is a pure TypeScript interface/initializer extension with no network I/O, no external calls, and no new trust boundaries. T-11-02 (two-set window) is mitigated by the single `set()` call constraint enforced in the implementation.

## Self-Check: PASSED

- [x] `src/store.ts` modified and committed at 4e76253
- [x] `npx tsc --noEmit` exits 0
- [x] `inchiKey: string` field present in InchiState interface
- [x] `setInchiData` signature ends with `, inchiKey?: string`
- [x] `inchiKey: ''` in initial store state
- [x] Single atomic `set()` call includes `inchiKey`
- [x] No `setInchiKey` action anywhere in store.ts
