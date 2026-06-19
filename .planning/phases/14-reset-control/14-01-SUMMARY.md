---
phase: 14-reset-control
plan: "01"
subsystem: store + UI + CSS
tags: [reset, zustand, ketcher, css]
dependency_graph:
  requires: []
  provides: [resetAll-action, Reset-button, handleReset-callback]
  affects: [src/store.ts, src/components/KetcherPanel.tsx, src/App.tsx, src/styles.css]
tech_stack:
  added: []
  patterns: [TDD-RED-GREEN, single-set-reset, optional-prop-pattern]
key_files:
  created: []
  modified:
    - src/store.ts
    - src/__tests__/store.test.ts
    - src/components/KetcherPanel.tsx
    - src/App.tsx
    - src/styles.css
decisions:
  - "resetAll uses single set() call covering all 9 fields — never calls actions from actions (Zustand 5 anti-pattern)"
  - "Both action buttons wrapped in .section-label-actions div (display:flex; gap:8px) so they stay grouped on the right under justify-content:space-between"
  - "handleReset calls setMolecule('') then resetAll() then setSelectedMolId(null) — hover cleared immediately without waiting for 150ms debounce"
metrics:
  duration: "~2 minutes"
  completed: "2026-06-19"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 5
---

# Phase 14 Plan 01: Reset Control Summary

**One-liner:** Atomic Reset control — `resetAll` Zustand action + pill button in KetcherPanel header row wired via `handleReset` in App.tsx, clearing canvas and all hover/data fields in one click.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing resetAll tests | f5b7dd3 | src/__tests__/store.test.ts |
| 1 (GREEN) | Add resetAll action to Zustand store | 8ed893f | src/store.ts |
| 2 | Reset button, CSS, handleReset wiring | e62942f | src/components/KetcherPanel.tsx, src/App.tsx, src/styles.css |

## Task 3: Pending Human Checkpoint

Task 3 is a `checkpoint:human-verify` task requiring browser verification. The implementation for Tasks 1 and 2 is complete; Task 3 cannot be auto-approved (it requires visual and interactive browser testing). See the checkpoint details below.

## What Was Built

### Task 1 — `resetAll` store action (TDD)

- Added `resetAll: () => void` to the `InchiState` interface in `src/store.ts`
- Implemented `resetAll` using a single `set()` call covering all 9 fields: `inchi`, `layers`, `auxMap`, `atomElements`, `hAtomPoolIds`, `inchiKey`, `hoverIdx`, `subHover`, `keyHoverKind`, `legendHover`
- 3 new tests in `src/__tests__/store.test.ts`: reset from non-idle, no-op on idle (RESET-05), keyHoverKind cleared from non-null
- All 304 tests pass (12 store tests, 304 total suite)

### Task 2 — Reset button + CSS + App.tsx wiring

- `KetcherPanel.tsx`: added optional `onResetClick?: () => void` prop; wrapped both action buttons in a new `.section-label-actions` div; Reset button rendered to the left of Send feedback
- `styles.css`: added `.reset-trigger` pill rule (height:28px, border-radius:999px, background:var(--line), color:var(--ink-soft)) with hover/focus-visible states; added `.section-label-actions` flex rule (display:flex, align-items:center, gap:8px)
- `App.tsx`: added `handleReset` async function calling `setMolecule('')`, `resetAll()`, and `setSelectedMolId(null)`; passed `onResetClick={handleReset}` to `<KetcherPanel>`
- TypeScript: zero errors (`npx tsc --noEmit`)
- RESET-04 invariant: no conditional rendering of `<Editor>` introduced

## Verification Results

- `npx vitest run src/__tests__/store.test.ts` — 12/12 pass
- `npx vitest run` — 304/304 pass (zero regressions)
- `npx tsc --noEmit` — zero errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all wiring is complete. The Reset button is fully connected from the UI through `handleReset` to the store and Ketcher canvas.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. All changes are in-browser, in-memory, and client-only (matches threat model T-14-01..SC).

## Self-Check

- [x] `src/store.ts` — resetAll declared in interface and implemented
- [x] `src/__tests__/store.test.ts` — 3 new test cases added
- [x] `src/components/KetcherPanel.tsx` — onResetClick prop + reset-trigger button
- [x] `src/App.tsx` — handleReset + onResetClick passed to KetcherPanel
- [x] `src/styles.css` — .reset-trigger and .section-label-actions rules added
- [x] Commits f5b7dd3, 8ed893f, e62942f exist in git log

## Self-Check: PASSED
