---
phase: 19
plan: 01
subsystem: sub-token-cards
tags: [c-layer, subTokenInfo, connection-cards, gap-2, tdd]
status: complete
requires:
  - "subTokenInfo pure module (Phase 17)"
  - "SubHover type + ConnectionText SubHover construction (Phase 15)"
  - "buildSubHoverSpecs global-canonical highlight path (Phase 15)"
provides:
  - "subTokenInfo 'atom'/'bond'/'branch' cards (no longer null)"
  - "SubHover.incidentPairs? + SubHover.branchPoint? fields"
  - "exported segmentBonds (plan 02 reuses it at the LayerText atom-token site)"
  - "bondPairList helper"
affects:
  - "src/components/LayerText.tsx (plan 02 wires incidentPairs/branchPoint/offset)"
tech-stack:
  added: []
  patterns:
    - "GAP-2 display-only de-offset over global SubHover payloads"
    - "neighbour derivation from incident pairs (dedupe + sort)"
key-files:
  created: []
  modified:
    - src/lib/parseInchi.ts
    - src/lib/subTokenInfo.ts
    - src/lib/__tests__/subTokenInfo.test.ts
    - src/lib/__tests__/highlightUtils.test.ts
    - src/components/__tests__/Explanation.test.tsx
decisions:
  - "branchPoint as an explicit SubHover field (research A1) rather than bondPairs[0][0] direction inference"
  - "atom-card connectivity caveat phrased WITHOUT the word 'hydrogens' to satisfy the CONN-04 element-word copy-safety guard (design said 'not bond order, hydrogens, or 3-D shape' → shipped 'not bond order or 3-D shape')"
metrics:
  duration: ~3min
  completed: 2026-06-30
  tasks: 3
  files: 5
---

# Phase 19 Plan 01: c-layer connection cards (pure value core) Summary

Filled the three `null` c-layer cases in `subTokenInfo` so a hovered/pinned connection-layer atom, hyphen, or parenthesis renders its own explanation card (neighbour set / joined atoms / branch + bond pairs), and added the two SubHover fields (`incidentPairs?`, `branchPoint?`) those cards consume — all global canonicals, de-offset for display only. Test-first against the real ALANINE and MELATONIN_TOLUENE fixtures.

## What Was Built

- **Task 1 (RED, `ff7cb8d`):** Replaced the `subTokenInfo.test.ts` null-fallthrough block with the reversed non-null contract; added atom/bond/branch/component/copy-safety card tests and two c-layer GAP-2 highlight-invariance guards (atom + bond kind) in `highlightUtils.test.ts`. Every SubHover literal is the parsed projection of a real fixture.
- **Task 2 (`3d3e483`):** Added `SubHover.incidentPairs?: [number,number][]` and `SubHover.branchPoint?: number` (both global canonicals, documented GAP-2 style); exported `segmentBonds` for plan 02's LayerText incident-pair computation.
- **Task 3 (GREEN, `b149e43`):** Implemented `case 'atom'` (deduped/sorted neighbour set; "no bonds recorded" empty guard), `case 'bond'` (names the two joined atoms), `case 'branch'` (names branch-point + lists bond pairs), plus the `bondPairList` en-dash helper. De-offset is display-only; `sub` is never mutated.

## Verification

- `npx vitest run` — **440 passed** (full suite green; 422 baseline + new c-layer tests).
- `npx tsc --noEmit` — passes with the two new SubHover fields.
- CONN-01: ALANINE atom 2 → "Atom 2 is bonded to ... 1, 3 and 4"; empty list → "no bonds recorded", no "undefined" / "atoms  and".
- CONN-02: bond card "Atoms 1 and 2 are bonded"; branch card names "atom 2" + bond "2–4" (en-dash).
- CONN-03: MELATONIN_TOLUENE component-2 bond de-offsets [18,24]→"1 and 7" + "(component 2)", never shows 18/24; GAP-2 guards resolve highlights via GLOBAL canonical with a non-zero fragmentOffset on the payload.
- CONN-04: copy-safety — no positive bond-order claim, no element word, no geometry; pure module, real fixtures, empty-list guard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Stale test] Explanation Test B asserted the old null fall-through**
- **Found during:** Task 3 (GREEN full-suite run)
- **Issue:** `Explanation.test.tsx` "Test B: c-layer bond sub-token falls through to the layer card" asserted `getByText('Connection layer')`. That is exactly the behaviour this phase reverses (the sibling of the `subTokenInfo.test.ts:193` block the plan flagged). With the Bond card now rendering, the assertion failed.
- **Fix:** Updated Test B to the CONN-02 contract — asserts the **Bond** card shows and "Connection layer" does NOT. No production code touched.
- **Files modified:** src/components/__tests__/Explanation.test.tsx
- **Commit:** b149e43

### Copy-safety wording adjustment (not a deviation, a discretion item)

The research §Code Examples atom body read "not bond order, hydrogens, or 3-D shape". The CONN-04 element-word guard forbids the word "hydrogens". Shipped the negative-only caveat as "not bond order or 3-D shape" — preserves intent (connectivity-only, no positive chemistry claim) while passing the guard.

## Threat Surface

No new surface. Cards are plain strings (digits, en-dashes, fixed copy) rendered as React text children by the pre-existing Phase 18 path — no `dangerouslySetInnerHTML`, no parser call, no string reconstruction (verbatim-passthrough). Matches the plan's T-19-01/02/03 register; no threat flags.

## Notes for Plan 02

`segmentBonds` is now exported; `SubHover.incidentPairs`/`branchPoint` are typed and consumed. Plan 02 must populate them at the `ConnectionText` atom/bond/branch construction sites (apply `cumOffset`→`fragmentOffset`, `fragIdx`→`componentIndex`, and `open.attachLocal + offset`→`branchPoint`) as GLOBAL canonicals — never de-offset before storing.

## Self-Check: PASSED

- src/lib/subTokenInfo.ts — FOUND (3 cases + bondPairList)
- src/lib/parseInchi.ts — FOUND (incidentPairs/branchPoint, exported segmentBonds)
- Commits ff7cb8d, 3d3e483, b149e43 — all FOUND in git log
