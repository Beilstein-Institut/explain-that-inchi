---
phase: 18-explanation-card-wiring-live-chemist-gate
plan: 02
subsystem: inchi-card-rendering
tags: [inchi, sub-token, h-layer, multi-fragment, gap-closure]
requires:
  - "Phase 17 subTokenInfo card surface (atomPhrase, hAtoms/mobileH cards)"
  - "LayerText HLayerText multi-fragment offset logic"
provides:
  - "H-count card enumerates the discrete atom set (no false min–max range)"
  - "Multi-component H-count/mobile-H cards show per-component numbering + '(component N)' marker"
  - "SubHover.fragmentOffset / componentIndex display-only fields"
affects:
  - "src/lib/subTokenInfo.ts"
  - "src/lib/parseInchi.ts"
  - "src/components/LayerText.tsx"
tech-stack:
  added: []
  patterns:
    - "Display-only de-offset: global canonicals stay on SubHover.atoms (auxMap key); fragmentOffset subtracted in the card prose only"
key-files:
  created:
    - "src/__tests__/LayerText.fragmentOffset.test.tsx"
  modified:
    - "src/lib/subTokenInfo.ts"
    - "src/lib/parseInchi.ts"
    - "src/components/LayerText.tsx"
    - "src/lib/__tests__/subTokenInfo.test.ts"
    - "src/lib/__tests__/highlightUtils.test.ts"
decisions:
  - "GAP-1 + GAP-2 fixed in one atomPhrase rewrite (atomList): enumerate the set AND subtract fragmentOffset"
  - "Single MELATONIN_TOLUENE real fixture covers both gaps (component-1 token 3-4,7-8,15H = GAP-1; component-2 token 2-6H = GAP-2)"
  - "fragmentOffset is display-only; SubHover.atoms stay GLOBAL so the canvas highlight is unchanged"
  - "Task-3 highlight guard placed in highlightUtils.test.ts (matches existing buildSubHoverSpecs conventions) per the plan's escape clause"
metrics:
  tasks: 3
  commits: 3
  files_changed: 6
  tests_total: 421
  completed: 2026-06-29
status: complete
---

# Phase 18 Plan 02: Live-Chemist-Gate H-Count Defects Summary

Closed the two chemist-gate H-count rendering defects in one coherent `atomPhrase` rewrite: the H-count card now enumerates the exact discrete atom set (never a false min–max range) and de-offsets multi-component tokens to the per-component numbers the chemist reads in the InChI string — while `SubHover.atoms` stay global so the canvas highlight is untouched.

## What was built

- **GAP-1 (blocker):** `atomPhrase` → `atomList` replaced `atoms ${Math.min}–${Math.max}` with per-atom enumeration. The discontiguous set `{3,4,7,8,15}` now reads "atoms 3, 4, 7, 8 and 15" instead of the false "atoms 3–15".
- **GAP-2 (major):** Added display-only `fragmentOffset?` / `componentIndex?` to `SubHover`. `LayerText` sets both at all three hAtoms/mobileH construction sites (plain `;`-segment, pure-`N*`, `;`-with-`N*`). `atomList` and the mobileH path subtract `fragmentOffset` for display and append a "(component N)" marker. Component-2 token `2-6H` now reads "atoms 2, 3, 4, 5 and 6 (component 2)" instead of "atoms 19–23".
- **Task 3:** A `buildSubHoverSpecs` guard test proves the highlight still resolves via the global `subHover.atoms` (auxMap keyed by 19), ignoring `fragmentOffset`.

## Real fixture (D-04a)

`MELATONIN_TOLUENE` = `InChI=1S/C13H16N2O2.C7H8/c1-9(16)14-6-5-10-8-15-13-4-3-11(17-2)7-12(10)13;1-7-5-3-2-4-6-7/h3-4,7-8,15H,5-6H2,1-2H3,(H,14,16);2-6H,1H3` — real `getInchi()` output generated verbatim from the indigo WASM engine (the same engine behind `ketcher-standalone`'s `getInchi`). One fixture exercises both gaps: component 1 (17 heavy atoms, offset 0) carries the GAP-1 token `3-4,7-8,15H`; component 2 (toluene, offset 17) carries the GAP-2 token `2-6H`. SubHover literals in the unit tests are the documented parsed projection of this string (subTokenInfo consumes numeric SubHover fields, not the string — verbatim-passthrough holds).

## Verification

- `npx vitest run src/lib/__tests__/subTokenInfo.test.ts` — GAP-1 enumeration + GAP-2 de-offset green.
- `npx vitest run src/__tests__/LayerText.fragmentOffset.test.tsx` — component-2 hit carries global atoms [18,24], fragmentOffset 17, componentIndex 1; component-1 hit fragmentOffset 0.
- `npx vitest run` — 421 passed (≥ 411 prior + 10 new GAP/guard tests), 0 failures.
- `npx tsc --noEmit` — clean.
- `grep -c "InChI=1S/" src/lib/__tests__/subTokenInfo.test.ts` = 4 (≥ 3: ALANINE + SALT + MELATONIN_TOLUENE).

## Deviations from Plan

None — plan executed as written. The Task-3 highlight guard was placed in `src/lib/__tests__/highlightUtils.test.ts` (the plan's stated alternative when it fits existing conventions better). No prior test asserted the old range phrasing, so no prior test needed correcting.

## Self-Check: PASSED
- `src/__tests__/LayerText.fragmentOffset.test.tsx` exists.
- Commits 82718b8, 9c0173b, 6a21af9 present in git log.
- All 421 tests green; tsc clean.
