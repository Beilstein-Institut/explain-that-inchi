---
phase: 18-explanation-card-wiring-live-chemist-gate
plan: 01
subsystem: explanation-card
tags: [react, explanation-card, sub-token, inchi]
requires: [src/lib/subTokenInfo.ts, src/store.ts (subHover/pinned.sub), src/lib/parseInchi.ts (SubHover), src/lib/layerInfo.ts (swatchVar)]
provides: [sub-token-aware explanation card (SUBEX-01/02/07/09)]
affects: [src/components/Explanation.tsx]
tech-stack:
  added: []
  patterns: [precedence-ternary branch, store-selector read, pure-module passthrough]
key-files:
  created:
    - src/components/__tests__/Explanation.test.tsx
  modified:
    - src/components/Explanation.tsx
decisions:
  - "effSub = pinned ? pinned.sub : subHover — local const, no new store field (mirrors effIdx)."
  - "Branch guarded on subCopy (not effSub) so c-layer kinds (subTokenInfo → null) fall through to the layer card."
  - "Accent inherits parent-layer swatch via existing accentVar; D-01a fallback maps sub.kind → LayerType → swatchVar when effIdx is unresolvable."
metrics:
  duration: ~4 min
  completed: 2026-06-29
status: complete
---

# Phase 18 Plan 01: Explanation Card Sub-Token Wiring Summary

Made the existing explanation card sub-token-aware by inserting one read-only precedence branch that renders `subTokenInfo()` copy for a hovered/pinned sub-token, falling through to the whole-layer card for c-layer kinds — closing the v1.5 core value with a two-file diff.

## What Was Built

- **`src/components/Explanation.tsx`** — added a `subHover` store selector, two local consts (`effSub = pinned ? pinned.sub : subHover`, `subCopy = effSub ? subTokenInfo(effSub, atomElements) : null`), a `subAccent` derivation (parent-layer swatch via existing `accentVar`, with a D-01a `sub.kind → LayerType → swatchVar` fallback), and one new JSX branch in the precedence ternary positioned `keyHoverKind → subCopy → layer → legendHover → idle`. The branch renders `subCopy.title`/`subCopy.body` as React text children — no `dangerouslySetInnerHTML`, no new store field, no mutator call.
- **`src/components/__tests__/Explanation.test.tsx`** — new component test (10 cases): real-fixture sanity, Tests A–G (hover, c-layer fall-through, layer-only, pin, key-precedence, element scoping, accent), plus two SUBEX-09 invariant guards (no store mutator invoked; body === pure-module output). Pins real L-alanine `getInchi()` output `InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1`; every SubHover object is documented as the parsed projection of one of its layers.

## TDD Gate Compliance

- RED (Task 1, commit `8d55be3`): `test(...)` commit — Tests A/D/F failed against the unwired card (Tests B/G coincidentally green because the existing layer card already satisfied their weaker assertions; A/D/F prove branch absence).
- GREEN (Task 2, commit `7bd42a3`): `feat(...)` commit — all 8 cases pass.
- Guards (Task 3, commit `aebe5b4`): `test(...)` commit — invariant guards added; suite at 10 cases.

## Verification Results

- `npx vitest run src/components/__tests__/Explanation.test.tsx` — 10 passed.
- `npx vitest run` — 411 passed (401 prior + 10 new), 0 failures.
- `npx tsc --noEmit` — clean.
- `grep -c 'dangerouslySetInnerHTML' src/components/Explanation.tsx` — 1 (pre-existing layer branch only; new branch adds none).
- `grep -E 'effSub|subCopy' src/components/Explanation.tsx` — both locals present.
- `grep -c "InChI=1S/" src/components/__tests__/Explanation.test.tsx` — 1 (real fixture, D-04a).
- `git diff --name-only` (source files) — only `src/components/Explanation.tsx` + its new test; no store/provider/canvas/subTokenInfo file touched (D-03).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mock-store TDZ at import time**
- **Found during:** Task 1 (RED).
- **Issue:** `Legend.tsx` calls `useInchiStore.getState()` at module top-level, which the hoisted `vi.mock` factory services during `Explanation` import — before the test file's mock-state and setter-spy `const`s initialize, throwing `ReferenceError: Cannot access ... before initialization`. (The existing `InchiSection.test.tsx` pattern never triggers this because nothing calls `getState()` at its import.)
- **Fix:** Held the mutable mock state and the setter spies on `var`-hoisted holders (`mock`, `spies`), assigned the spies inside the factory, and made `storeState()` null-safe so the import-time `getState()` returns defaults. Documented inline.
- **Files modified:** `src/components/__tests__/Explanation.test.tsx`.
- **Commit:** `8d55be3`.

**2. [Rule 1 - Gate accuracy] Comment echoed `dangerouslySetInnerHTML` literal**
- **Found during:** Task 2 (GREEN).
- **Issue:** A branch comment containing the word `dangerouslySetInnerHTML` pushed the `grep -c` gate to 2, though the actual JSX usage stayed at 1.
- **Fix:** Reworded the comment to "no raw-HTML injection". Gate back to 1.
- **Files modified:** `src/components/Explanation.tsx`.
- **Commit:** `7bd42a3`.

## Notes

- **SC#5 (live chemist accuracy gate)** is intentionally NOT a code task. It is a human-review item for `/gsd-verify-work 18` (tetrahedral stereo, mobile-H, H-count, multi-fragment element), sign-off recorded in `18-UAT.md`. Do not mark the phase verified until all four are confirmed.
- Tests B and G pass in the RED state because the pre-existing layer card already satisfies their assertions; A/D/F are the load-bearing RED cases proving the branch was absent.

## Self-Check: PASSED
- FOUND: src/components/Explanation.tsx
- FOUND: src/components/__tests__/Explanation.test.tsx
- FOUND commit 8d55be3 (test RED)
- FOUND commit 7bd42a3 (feat GREEN)
- FOUND commit aebe5b4 (test guards)
