---
phase: 11-source-wiring
plan: "01"
subsystem: lib
tags: [parser, inchikey, offsets, tdd]
dependency_graph:
  requires: []
  provides: [parseInchiKey, InchiKeySegmentKind, InchiKeySegment]
  affects: [Phase 12 InchiKeySection renderer]
tech_stack:
  added: []
  patterns: [offset-range parser, TDD RED/GREEN]
key_files:
  created:
    - src/lib/parseInchiKey.ts
    - src/lib/__tests__/parseInchiKey.test.ts
  modified: []
decisions:
  - "No .slice() in parser body — offsets only; callers slice verbatim key at render time (Invariant #1)"
  - "Guard returns [] for length !== 27 or missing hyphens at positions 14/25 (D-08/T-11-01)"
metrics:
  duration: "83 seconds"
  completed: "2026-06-18"
  tasks: 2
  files: 2
---

# Phase 11 Plan 01: parseInchiKey Pure Parser Summary

Pure offset-range parser for 27-char InChIKey strings with TDD RED/GREEN cycle — segments by {kind, start, end} only, never reassembles text.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing parseInchiKey tests | 206823b | src/lib/__tests__/parseInchiKey.test.ts |
| GREEN | Implement parseInchiKey (Task 1 + 2 combined) | 1de6ca2 | src/lib/parseInchiKey.ts |

## What Was Built

`src/lib/parseInchiKey.ts` — pure, Node-compatible parser that takes a 27-char InChIKey string and returns an array of 5 `InchiKeySegment` objects with `{kind, start, end}` offset fields only. No `.slice()` call in the function body; callers slice the verbatim key string at render time (Invariant #1, mirroring the InChI passthrough invariant).

`src/lib/__tests__/parseInchiKey.test.ts` — 19 tests across 6 describe groups:
- Group 1: benzene fixture with all 5 pinned segment offsets and slice-boundary assertions
- Group 2: protonated key (protonation char L)
- Group 3: non-standard flag (position 23 = N)
- Group 4: empty string returns []
- Group 5: malformed/short strings return []
- Group 6: Object.keys invariant — no text/value/chars on any segment

## TDD Gate Compliance

- RED gate commit: `206823b` — `test(11-01): add failing tests for parseInchiKey (RED)`
- GREEN gate commit: `1de6ca2` — `feat(11-01): implement parseInchiKey pure offset-range parser (GREEN)`
- No REFACTOR phase needed (implementation was clean on first pass)

## Verification Results

- `npx vitest run src/lib/__tests__/parseInchiKey.test.ts` — 19/19 passed
- `npx vitest run` (full suite) — 275/275 passed, zero regressions
- `npx tsc --noEmit` — no errors
- No `.slice()` call in parseInchiKey function body (verified with grep)
- Exports confirmed: `InchiKeySegmentKind`, `InchiKeySegment`, `parseInchiKey`

## Deviations from Plan

None — plan executed exactly as written. The plan lists Task 1 (implementation) before Task 2 (tests), but TDD requires tests first; the RED/GREEN ordering was applied as required by the TDD execution protocol. Both files were committed with correct TDD gate commit types.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `parseInchiKey` is a pure in-memory function with no I/O. T-11-01 (DoS via malformed input) is mitigated by the length/hyphen guard returning [] immediately.

## Self-Check: PASSED

- [x] src/lib/parseInchiKey.ts exists and verified
- [x] src/lib/__tests__/parseInchiKey.test.ts exists and verified
- [x] Commit 206823b exists (test RED)
- [x] Commit 1de6ca2 exists (feat GREEN)
- [x] 275 tests passing, zero regressions
