---
phase: 17-sub-token-copy-core-element-table-pure-module-tests
plan: 01
subsystem: lib
tags: [element-table, layerInfo, periodic-table, SUBEX-08]
requires: []
provides:
  - ELEMENT_NAMES (120-entry full periodic table, symbol→name lookup)
affects:
  - src/lib/layerInfo.ts
  - src/lib/subTokenInfo.ts (Plan 02 consumer)
tech-stack:
  added: []
  patterns: [in-place additive constant extension, invariant-pinning unit tests]
key-files:
  created: []
  modified:
    - src/lib/layerInfo.ts
    - src/lib/__tests__/layerInfo.test.ts
decisions:
  - "ELEMENT_NAMES extended in place from 10 organic entries to 120 (118 IUPAC H–Og + D + T), lowercase, IUPAC-2005 spelling"
  - "elementColor whitelist deliberately NOT widened — colour palette stays at 10 elements"
metrics:
  duration: ~2min
  completed: 2026-06-26
status: complete
---

# Phase 17 Plan 01: Core Element Table Summary

Extended `ELEMENT_NAMES` in `src/lib/layerInfo.ts` to the full periodic table — exactly 120 lowercase IUPAC-2005-spelled entries (118 elements H–Og + the `D`/`T` pseudo-symbols) — and pinned the invariant with a D-19 test block, so no element ever surfaces as a bare symbol downstream. Satisfies SUBEX-08.

## What Was Built

- **Task 1** (`661b6a6`): Replaced the 10-entry organic `ELEMENT_NAMES` literal with all 118 IUPAC elements in atomic-number order plus `D`/`T`. Case-exact two-letter keys (`Co`, `Cl`, `Na`). Retained `sulfur`/`phosphorus`; used `aluminium`, `caesium`, `oganesson` (118). Export signature unchanged (`Record<string, string>`); `formulaSegmentReading`, `elementColor`, and `subscript` byte-unchanged.
- **Task 2** (`aa9a8bf`): Added `describe('ELEMENT_NAMES — D-19 full periodic table')` to `layerInfo.test.ts`, importing `ELEMENT_NAMES`. Pins count===120, case-exact `Co`/`C`/`O`, `K`=potassium, `D`/`T` defined. All pre-existing describe blocks untouched.

## Verification

- `npx vitest run src/lib/__tests__/layerInfo.test.ts` → 39 passed (4 new D-19 + 35 existing)
- `npx vitest run` (full suite) → 379 passed across 20 files — no importer broke
- Runtime check: `Object.keys(ELEMENT_NAMES).length === 120`; `Co`→cobalt, `K`→potassium, `D`→deuterium, `T`→tritium, `S`→sulfur, `Al`→aluminium, `Cs`→caesium

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/lib/layerInfo.ts
- FOUND: src/lib/__tests__/layerInfo.test.ts
- FOUND commit: 661b6a6 (Task 1)
- FOUND commit: aa9a8bf (Task 2)
