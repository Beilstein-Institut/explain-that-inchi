---
phase: 17-sub-token-copy-core-element-table-pure-module-tests
plan: 02
subsystem: ui-copy
tags: [subTokenInfo, inchi, stereo, parity, tdd, vitest, pure-module]

requires:
  - phase: 17-01
    provides: ELEMENT_NAMES extended to 120 entries (118 IUPAC + D + T), subscript helper
provides:
  - src/lib/subTokenInfo.ts — pure subTokenInfo(sub, atomElements) returning SubTokenCopy | null
  - Card copy for element / hAtoms / mobileH / stereo; null for atom/bond/branch (graceful fall-through)
  - Real-fixture vitest suite pinning every chemical-accuracy invariant by assertion
affects: [phase-18-explanation-render, subTokenInfo, stereo-card, mobileH-card]

tech-stack:
  added: []
  patterns:
    - "Pure prose module mirroring inchiKeyInfo.ts: switch(kind) → {title, body} | null"
    - "Verbatim-passthrough: consume offset SubHover fields only, never re-read the raw string"
    - "Chemical-accuracy invariants pinned by string-content assertion against real getInchi() fixtures"

key-files:
  created:
    - src/lib/subTokenInfo.ts
    - src/lib/__tests__/subTokenInfo.test.ts
  modified: []

key-decisions:
  - "Bare 'atom N' phrasing for hAtoms (D-08-safest; no functional-group inference risk)"
  - "atomElements param retained in signature but unused (_-prefixed) — Phase 18 / future element-prefixing"
  - "Dropped the unused subscript import — bare atom labels need no Unicode subscripts (ponytail)"

patterns-established:
  - "Pattern: load-bearing caveat (parity ≠ R/S) authored as a fixed clause that survives prose trimming (D-05)"

metrics:
  duration: ~30 min
  completed: 2026-06-26
  tasks: 2
  files: 2

status: complete
---

# Phase 17 Plan 02: Sub-token copy core (subTokenInfo) Summary

Pure DOM-free `subTokenInfo(sub, atomElements)` that turns a hovered/pinned `SubHover` of kind
`element` / `hAtoms` / `mobileH` / `stereo` into chemically-accurate card copy and returns `null`
for the three c-layer kinds — backed by a real-`getInchi()`-fixture vitest suite pinning every
D-08/D-10/D-11/D-14 invariant by assertion. TDD RED → GREEN.

## What was built

- `src/lib/subTokenInfo.ts` — exports `type SubTokenCopy = { title; body; reading? }` and
  `subTokenInfo(sub: SubHover, _atomElements: Record<number, string>): SubTokenCopy | null` as a
  `switch (sub.kind)`:
  - `element`: title `"Carbon (C)"` (case-exact name + symbol, D-16); body explains the count is
    that element's atom count, appends the per-component scope clause only when `canonRange` is
    present (D-14, presence-only), and the Hill-order note only for C/H (D-17).
  - `hAtoms`: title `"Hydrogen count"`; collective "atom N bears n hydrogen(s)" (D-09); never names
    a functional group (D-08 — the alanine `1H3` methyl trap).
  - `mobileH`: title `"Mobile hydrogen"`; reads `sub.atoms` only (never `sub.count`, Pitfall 3 / D-10);
    "shared/tautomeric proton", no count, no fixed-bond/per-atom claim.
  - `stereo`: title `"Tetrahedral stereocenter"`; sp³ handedness primer (D-15), states the hovered
    sign (D-12), carries the load-bearing parity-NOT-R/S caveat (D-11), points at /m and /s (D-13).
  - default (`atom`/`bond`/`branch`): `null`.
- `src/lib/__tests__/subTokenInfo.test.ts` — real alanine + methylamine-hydrochloride salt fixtures,
  anti-fabrication sanity (`/^InChI=1S\//` on every const), and all chemical-correctness pins lifted
  verbatim from RESEARCH § "Invariants Pinned by Assertion".

## Verification

- `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/lib/__tests__/layerInfo.test.ts` → 61 passed.
- Full suite `npx vitest run` → 401 passed, 21 files. No regression.
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
- PASSTHROUGH-OK grep prints: imports `SubHover` from `./parseInchi`, contains no `layer.text`,
  no `getInchi`, no parser call, no `parseAuxMapping` import.
- Module emits no HTML (`<b>`/markup grep empty) — Phase 18 renders as safe React text children.

## Fixtures (real getInchi() output, D-18)

| Fixture | InChI | Provenance |
|---------|-------|------------|
| L-alanine | `InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1` | Byte-identical reuse from HelpTour.test.tsx:11 |
| methylamine hydrochloride | `InChI=1S/CH5N.ClH/c1-2;/h2H2,1H3;1H` | Live WASM tool, provenance-confirmed via resolved checkpoint |

The D-14 `canonRange` scope assertion is written against a constructed `SubHover` literal
(`{kind:'element', el:'Na', canonRange:[4,4]}`) — `subTokenInfo` consumes `SubHover` fields, not
the InChI string, so this is legitimate (not fabrication). The salt fixture documents the molecule
the literal models.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused `ELEMENT_NAMES` test import and unused `subscript` module import**
- **Found during:** Task 2 (GREEN type-check)
- **Issue:** `tsconfig.app.json` has `noUnusedLocals`/`noUnusedParameters: true`; the PATTERNS-suggested
  `ELEMENT_NAMES` test import and the `subscript` module import were never used (assertions hardcode
  titles; atom labels are bare "atom N"), failing `tsc`.
- **Fix:** Dropped both unused imports; prefixed the unconsumed `atomElements` param as `_atomElements`
  (TS-sanctioned intentional-unused marker — signature types/arity unchanged, acceptance criterion met).
- **Files modified:** src/lib/subTokenInfo.ts, src/lib/__tests__/subTokenInfo.test.ts
- **Commit:** bc583e5

**2. [Rule 3 - Blocking] Reworded a source comment to avoid tripping the PASSTHROUGH-OK grep**
- **Found during:** Task 2 verify
- **Issue:** A header comment contained the literal token `layer.text`, which the forbidden-pattern
  grep matched even though it was prose, not code.
- **Fix:** Reworded the comment to "the raw layer string". No behavioural change.
- **Commit:** bc583e5

## Authentication Gates

None.

## Self-Check: PASSED

- FOUND: src/lib/subTokenInfo.ts
- FOUND: src/lib/__tests__/subTokenInfo.test.ts
- FOUND commit 7c44a7d (RED test)
- FOUND commit bc583e5 (GREEN implementation)

## TDD Gate Compliance

- RED: `test(17-02)` commit 7c44a7d — suite failed only because the module did not exist.
- GREEN: `feat(17-02)` commit bc583e5 — suite passes.
- REFACTOR: none needed.
