---
phase: 15-c-layer-hover-precision
plan: "01"
subsystem: highlight-pipeline
tags: [c-layer, tokenizer, subhover, tdd, library-tier]
dependency_graph:
  requires: []
  provides: [tokenizeCLayerSeg, collectBranchHyphens, SubHover.bond, SubHover.branch, buildSubHoverSpecs.bond, buildSubHoverSpecs.branch]
  affects: [src/lib/parseInchi.ts, src/lib/highlightUtils.ts]
tech_stack:
  added: []
  patterns: [discriminated-union-tokens, stack-machine-tokenizer, tdd-red-green]
key_files:
  created:
    - src/lib/__tests__/clyr.test.ts
    - src/__tests__/LayerText.clyr.test.tsx
  modified:
    - src/lib/parseInchi.ts
    - src/lib/highlightUtils.ts
    - src/lib/__tests__/highlightUtils.test.ts
decisions:
  - CLYR-01 (D-01): atom case in buildSubHoverSpecs now returns bonds:[] — incident bonds removed; atom number hover highlights only the atom
  - CLYR-02 (D-02): new 'bond' kind in SubHover + buildSubHoverSpecs; hyphen hover highlights single bond via endpointPairs
  - CLYR-03 (D-03/D-04): new 'branch' kind with bondPairs; open and close parens share identical bond set for symmetry
  - tokenizeCLayerSeg stores local (pre-offset) integers only — offset applied by caller (Pitfall 3 avoidance)
  - collectBranchHyphens exported from parseInchi.ts for LayerText use in Plan 15-02
metrics:
  duration_minutes: 6
  completed_date: "2026-06-19"
  tasks_completed: 3
  files_changed: 5
---

# Phase 15 Plan 01: Scaffold Wave 0 Tests + Library Tier Implementation Summary

One-liner: TDD RED→GREEN cycle establishing CLayerToken type, tokenizeCLayerSeg stack-machine tokenizer, SubHover.bond/branch extensions, and corrected buildSubHoverSpecs atom/bond/branch cases.

## What Was Built

### Task 1 — TDD RED: Scaffold failing tests

Created two test files covering CLYR-01..05 at library and component levels:

- `src/lib/__tests__/clyr.test.ts` — 24 unit tests for `tokenizeCLayerSeg` (Fixtures A/B/E) and `buildSubHoverSpecs` atom/bond/branch cases. All failed in RED state (tokenizeCLayerSeg not exported; 'bond'/'branch' kinds not in SubHover).
- `src/__tests__/LayerText.clyr.test.tsx` — 5 component tests asserting hyphen/paren spans emit `kind='bond'`/`kind='branch'` SubHover payloads. Remains RED (LayerText.tsx not yet refactored — expected at wave boundary).

### Task 2 — TDD GREEN: tokenizeCLayerSeg and SubHover extension

Extended `src/lib/parseInchi.ts`:

- `SubHover.kind` union extended to include `'bond' | 'branch'`
- New optional fields: `endpointPairs?: [number, number][]` (bond kind) and `bondPairs?: [number, number][]` (branch kind)
- Exported `CLayerToken` discriminated union type (`atom | hyphen | open | close | other`)
- Exported `tokenizeCLayerSeg(seg: string): CLayerToken[]` — O(n) single forward scan stack machine mirroring `parseConnectionBonds`; stores local (pre-offset) integers; restores `lastLocal` on `)` (Pitfall 2 avoidance)
- Exported `collectBranchHyphens(tokens, oi, ci)` — pure slice+filter for collecting hyphen tokens in a branch range

All 8 tokenizeCLayerSeg tests turned GREEN.

### Task 3 — TDD GREEN: Fix atom case + add bond/branch cases in buildSubHoverSpecs

Modified `src/lib/highlightUtils.ts`:

- `'atom'` case: removed 3-line `struct.bonds.forEach` incident-bond scan; returns `bonds: []` (CLYR-01, D-01)
- New `'bond'` case: iterates `endpointPairs ?? []`; resolves via `auxMap + struct.findBondId`; returns empty spec if no bonds resolved (CLYR-02, D-02)
- New `'branch'` case: iterates `bondPairs ?? []` with `bonds.includes(bid)` dedup guard; returns empty spec if no bonds resolved (CLYR-03, D-03/D-04)
- Both new cases return `rgroupAttachmentPoints: []` and `color: resolveVarFn('--c-conn')` (D-05, Claude's Discretion)
- `'default'` case remains last in the switch

Updated `highlightUtils.test.ts` 'kind atom' test to assert `bonds: []` (behavioral change from pre-Phase-15).

All 24 clyr.test.ts library-tier tests GREEN. All 54 highlightUtils.test.ts tests GREEN. No regressions in 328 existing tests.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (RED) | 55a9f21 | test(15-01): scaffold Wave 0 failing tests for CLYR-01..05 (RED) |
| 2 (GREEN tokenizer) | a50f4d7 | feat(15-01): extend SubHover type and implement tokenizeCLayerSeg in parseInchi.ts |
| 3 (GREEN spec-builder) | 297a5b8 | feat(15-01): fix atom case and add bond/branch cases in buildSubHoverSpecs |

## Deviations from Plan

**1. [Rule 1 - Bug] Updated highlightUtils.test.ts atom test to match CLYR-01 behavioral change**
- **Found during:** Task 3
- **Issue:** The existing 'kind atom' test in highlightUtils.test.ts asserted `bonds.length > 0` and specific incident bond IDs — which is the pre-Phase-15 behavior that CLYR-01 explicitly removes.
- **Fix:** Updated the test description and assertions to assert `bonds: []` (no incident bonds), matching the new D-01 contract. The test name was clarified to reference CLYR-01.
- **Files modified:** src/lib/__tests__/highlightUtils.test.ts
- **Commit:** 297a5b8

## Test Results

| File | Tests | Status |
|------|-------|--------|
| src/lib/__tests__/clyr.test.ts | 24/24 | GREEN |
| src/lib/__tests__/highlightUtils.test.ts | 54/54 | GREEN |
| src/__tests__/LayerText.clyr.test.tsx | 0/5 | RED (expected — LayerText.tsx not yet refactored) |
| Full suite (excluding LayerText.clyr) | 328/328 | GREEN |

## Known Stubs

None — all library-tier logic is fully implemented and tested. The RED state in `LayerText.clyr.test.tsx` is intentional: ConnectionText in LayerText.tsx does not yet emit `kind='bond'/'branch'` payloads. This is the wave boundary — Plan 15-02 refactors ConnectionText.renderSegment.

## Threat Flags

None — this plan is pure client-side library logic (parseInchi.ts, highlightUtils.ts). No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. See PLAN.md threat model for full STRIDE register (all accepted).

## Self-Check: PASSED

- `src/lib/__tests__/clyr.test.ts` — exists, 24 tests green
- `src/__tests__/LayerText.clyr.test.tsx` — exists, 5 tests red (expected)
- `src/lib/parseInchi.ts` — exists, tokenizeCLayerSeg and collectBranchHyphens exported
- `src/lib/highlightUtils.ts` — exists, 'bond' and 'branch' cases present
- Commits 55a9f21, a50f4d7, 297a5b8 — all verified in git log
