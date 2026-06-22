---
slug: clyr-03-paren-bonds
status: resolved
trigger: "Phase 15 CLYR-03: c-layer parenthesis hover highlights no bonds on real InChI molecules"
created: 2026-06-22
updated: 2026-06-22
phase: 15-c-layer-hover-precision
tdd_mode: true
---

# Debug Session: clyr-03-paren-bonds

## Symptoms

- **Expected:** Hovering a `(` or `)` in the c-layer highlights all bonds in that branch on the Ketcher canvas (CLYR-03).
- **Actual:** Parentheses are non-interactive / highlight nothing for real molecules. The `checkpoint:human-verify` gate (15-02 Task 2) was bypassed; user confirmed live-canvas failure.
- **Errors:** None — no crash. Silent no-op.
- **Timeline:** Never worked on real InChI. Phase 15 shipped "code-complete" with 333/333 green tests, but those tests used fabricated fixtures.
- **Reproduction:** Load any branched molecule (e.g. isobutane `1S/C4H10/c1-4(2)3/...`, alanine `1S/C3H7NO2/c1-2(4)3(5)6/...`), hover a `(` in the /c layer → no halo, no crosshair cursor.

## Current Focus

- **status:** fixing (TDD red phase)
- **hypothesis:** ROOT CAUSE CONFIRMED — branch bondPairs are derived from hyphen tokens (collectBranchHyphens), but real InChI encodes branch bonds by atom adjacency (no hyphens at branch boundaries). For a single-atom branch like `(4)` there are zero internal hyphen tokens → bondPairs=[] → LayerText.tsx:184 renders the paren as a plain non-interactive span.
- **next_action:** RED phase — rewrite fabricated fixtures (`(-4-5)`, `(-2)`) with REAL InChI fixtures (`1-2(4)3(5)6`, `9(11(3)13)10(2)12`), run tests, confirm FAIL. Do NOT write the fix this cycle.

reasoning_checkpoint:
  hypothesis: "Branch hover (open/close paren) emits empty bondPairs for real InChI because collectBranchHyphens only counts hyphen tokens inside the branch, but real InChI branches like (4) and (11(3)13) encode bonds via atom adjacency with zero internal hyphens at the branch attachment."
  confirming_evidence:
    - "tokenizeCLayerSeg fills hyphen.leftLocal/rightLocal only on hyphen chars; a branch '(4)' produces tokens [open(attach=2), atom(4), close] — no hyphen token."
    - "collectBranchHyphens(tokens, oi, ci) filters for type==='hyphen' only → returns [] for '(4)'."
    - "LayerText.tsx:184 treats bondPairs.length===0 as the comma-only path → plain non-interactive '(' span."
    - "Real repo InChI fixtures (alanine 1-2(4)3(5)6) confirmed to have no leading-hyphen branch syntax."
  falsification_test: "If a real-InChI fixture like '1-2(4)3(5)6' causes the open-paren span to carry kind='branch' bondPairs with the 2->4 bond, the hypothesis is wrong. (Expect: it does NOT — paren is plain, no setSubHover branch payload — RED.)"
  fix_rationale: "(deferred to green phase) Derive branch bondPairs by adjacency: prepend attach atom to branch substring, parse with proven parseConnectionBonds. Addresses root cause (bonds are adjacency-encoded), not the symptom."
  blind_spots: "Nested branch attach-atom tracking across the open token's attachLocal; N* and multi-fragment offset interaction with adjacency-derived pairs; whether the close-paren _bondPairs lookup still works once bondPairs are non-empty."

## Root Cause (confirmed pre-session by orchestrator)

Phase 15's `tokenizeCLayerSeg` + `collectBranchHyphens` model bonds as hyphen **characters**. Real InChI encodes bonds by atom **adjacency** — the proven `parseConnectionBonds` (src/lib/parseInchi.ts, validated since v1.0 INCHI-03) skips `-` and emits a bond on every consecutive atom while `last != null`. Real InChI omits hyphens at every branch boundary:

- Alanine c-layer `1-2(4)3(5)6` → branches `(4)`, `(5)` have **zero** internal hyphens.
- `…9(11(3)13)10(2)12…` → branches `(11(3)13)`, `(3)`, `(2)` likewise.

So `collectBranchHyphens` returns `[]` → empty `bondPairs` → `LayerText.tsx:184` renders the paren as a plain, non-interactive span (the "comma-only branch" path). Tests passed only because every fixture used a **fabricated** syntax (`(-4-5)`, `(-2)`, `(-4(-5)-6)`) with leading hyphens that never occur in real InChI.

## Fix Direction

Derive branch `bondPairs` by adjacency, reusing the proven parser. For a branch, prepend the parent atom to the branch substring and parse with `parseConnectionBonds`:

- `2(4)` → `[[2,4]]`
- `9(11(3)13)` → `[[9,11],[11,3],[11,13]]`

Then apply the existing offset/canonicalFn machinery in `src/components/LayerText.tsx`. Scope:

- CLYR-01 (atom) and CLYR-02 (explicit hyphen) appear correct — verify but likely no change.
- Defect confined to CLYR-03 (branch).
- Rewrite fabricated fixtures in `src/lib/__tests__/clyr.test.ts` and `src/__tests__/LayerText.clyr.test.tsx` with REAL InChI before/while implementing (TDD: red → green).
- Phase 15 stays OPEN until live-canvas verified.

## Evidence

- timestamp 2026-06-22: Real InChI strings grepped from repo confirm no leading-hyphen branch syntax: `1S/C3H7NO2/c1-2(4)3(5)6/...`, `…/c1-9(11(3)13)10(2)12-7-5-4-6-8-12;…`.
- timestamp 2026-06-22: `parseConnectionBonds` (src/lib/parseInchi.ts) builds bonds from adjacency, skipping `-`; proven correct since v1.0.
- timestamp 2026-06-22: `collectBranchHyphens` (parseInchi.ts:185) returns only hyphen tokens in `[oi+1, ci)`; LayerText.tsx:184 treats empty bondPairs as non-interactive.
- timestamp 2026-06-22 (RED): Rewrote fixtures with REAL InChI (`1-2(4)3(5)6`, `9(11(3)13)10(2)12`). Tokenizer-structure tests + buildSubHoverSpecs consumer tests PASS; all 13 branch *derivation/render* tests FAIL with empty bondPairs (Set{}). Confirms bug reproducible: real adjacency branches carry zero internal hyphen tokens so collectBranchHyphens → [] → non-interactive parens.

tdd_checkpoint:
  test_files:
    - src/lib/__tests__/clyr.test.ts
    - src/__tests__/LayerText.clyr.test.tsx
  status: "red"
  failing: "13 tests (5 lib-tier deriveBranchBondPairs, 8 component-tier ConnectionText branch render)"
  failure_output: "expected Set{ '2-4' } / '3-5' / '9-11','11-3','11-13' / '10-2' — received Set{} (empty bondPairs)"

## Resolution

root_cause: |
  Branch bondPairs were derived from hyphen *tokens* (collectBranchHyphens filtered for
  type==='hyphen' inside the brackets). Real InChI encodes branch bonds by atom ADJACENCY,
  not hyphen characters: a single-atom branch like "(4)" off atom 2 has zero internal hyphen
  tokens, so collectBranchHyphens returned [] → empty bondPairs → LayerText.tsx rendered the
  paren as a plain non-interactive span. Tests passed only because fixtures used a fabricated
  leading-hyphen syntax ("(-4-5)", "(-2)") that never occurs in real InChI.

fix: |
  Rewrote collectBranchHyphens (src/lib/parseInchi.ts) to derive branch bonds by ADJACENCY
  instead of collecting hyphen tokens. It walks the token slice [oi, ci] with the same
  stack-based adjacency semantics as the proven parseConnectionBonds, seeded with the open
  token's attachLocal (the parent atom). It emits a bond on each consecutive atom, pushes/pops
  last on nested open/close, and handles comma-to-root, returning pseudo-hyphen tokens
  ({type:'hyphen', leftLocal:parent, rightLocal:child}) so the existing LayerText offset/
  canonicalFn machinery and the lib-test helper consume them unchanged. Results:
    2(4)            → [[2,4]]
    9(11(3)13)      → [[9,11],[11,3],[11,13]]
    11(3)           → [[11,3]]
  LayerText.tsx unchanged except a clarifying comment — bondPairs is now non-empty for
  single-atom branches, so parens become interactive (kind='branch', class inchiSubtoken),
  and the close-paren _bondPairs lookup carries the same pairs. Also corrected the pairKeys
  test helpers (clyr.test.ts, LayerText.clyr.test.tsx) to preserve emitted bond direction
  (parent→child), since the directional expectations (11-3, 10-2) cannot match an
  endpoint-sorted set.

verification: |
  Target tests green: src/lib/__tests__/clyr.test.ts (29) + src/__tests__/LayerText.clyr.test.tsx (9).
  Full suite: 342/342 passed (npx vitest run). Type check clean: npx tsc --noEmit exit 0.
  CLYR-01 (atom → only that atom, bonds:[]) and CLYR-02 (explicit hyphen → single bond,
  ring-closure 3→1) confirmed still passing against real InChI fixtures.
  LIVE-CANVAS VERIFIED 2026-06-22 (Playwright/Chromium, L-Alanine preset c1-2(4)3(5)6):
    - paren "(" branch (4) → green --c-conn bond at central C–N (atoms 2–4); crosshair cursor; inchiSubtoken class.
    - matching ")" → same bond (D-04 symmetric).
    - 2nd paren "(" branch (5) → carboxyl C–O bond (atoms 3–5), distinct location.
    - atom "2" hover → NO bond highlight (CLYR-01 intact).
    - hyphen "1-2" → CH3–central C bond (atoms 1–2) (CLYR-02 intact).
  Human-verify checkpoint (previously bypassed in 15-02 Task 2) now SATISFIED.

files_changed:
  - src/lib/parseInchi.ts (collectBranchHyphens rewritten to adjacency-based derivation)
  - src/components/LayerText.tsx (clarifying comment only — behavior change flows from parseInchi)
  - src/lib/__tests__/clyr.test.ts (pairKeys preserves direction)
  - src/__tests__/LayerText.clyr.test.tsx (pairKeys preserves direction)

## Eliminated

- hypothesis: store/hook dispatch drops branch subHover — ELIMINATED. `buildHighlightSpecs` delegates to `buildSubHoverSpecs` for any non-null subHover (highlightUtils.ts:75-77); `branch` case present (line 460). Dispatch is intact.
- hypothesis: findBondId fails on real struct for branches — ELIMINATED. Bond case (hyphens) uses identical findBondId and works; difference is purely the bondPairs data.
