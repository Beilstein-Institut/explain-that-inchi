---
phase: 15-c-layer-hover-precision
verified: 2026-06-22T08:14:00Z
status: verified
score: 5/5 must-haves verified
overrides_applied: 0
human_verification_completed:
  - test: "Multi-fragment c-layer live hover (CLYR-04)"
    result: "PASS — Playwright/Chromium, ethanol+benzene via window.ketcher.setMolecule('CCO.c1ccccc1'), c-layer '1-2-4-6-5-3-1;1-2-3'. Hovering a hyphen highlights exactly ONE bond (green --c-conn at (482,150)); no cross-fragment bleed."
  - test: "Duplicated/repeated N* fragment live hover (CLYR-05)"
    result: "PASS — two benzenes via setMolecule('c1ccccc1.c1ccccc1'), c-layer '2*1-2-4-6-5-3-1'. Hovering a single hyphen highlights the SAME bond in BOTH ring instances simultaneously (2 green bonds at (317,150) and (477,150))."
  - note: "CLYR-01/02/03 previously confirmed live on L-Alanine (c1-2(4)3(5)6). All 6 steps of the 15-02 Task 2 blocking checkpoint now satisfied with captured evidence; gate no longer bypassed."
clyr_03_semantics_correction:
  date: "2026-06-22"
  issue: "First implementation (commit 22b8227) highlighted the WHOLE substituent branch. On live review of ciprofloxacin the first paren lit 10 bonds (most of the molecule) — rejected."
  resolution: "commit 1d5afdf — paren now highlights bonds INCIDENT TO the branch-point atom (chain-in + branch + chain-out, typically 3). See D-03b in 15-CONTEXT.md."
  live_evidence: "Playwright/Chromium on Ciprofloxacin preset (c18-13-7-11-14(8-15(13)20-5-3-19-4-6-20)21(10-1-2-10)9-12(16(11)22)17(23)24): ALL 12 paren spans highlight exactly 3 bonds; first paren = {11-14,14-8,14-21}. Full suite 343/343, tsc clean."
---

# Phase 15: C-layer hover precision Verification Report

**Phase Goal:** When a user hovers any token of the connectivity (c) layer, the canvas highlights exactly the atom or bond(s) that token denotes — never more — and stays correct for multi-fragment and duplicated-fragment molecules.
**Verified:** 2026-06-22T08:14:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Hovering a c-layer atom number highlights only that single atom (no bonds) — CLYR-01 | ✓ VERIFIED | `highlightUtils.ts:441` `case 'atom'` returns `{ atoms: kAtomIds, bonds: [], ... }`. Comment cites D-01. LayerText.tsx:138 emits `kind:'atom'`. clyr.test.ts atom-case tests + Playwright L-Alanine live check (atom hover shows no bond). |
| 2 | Hovering a hyphen highlights the single bond connecting the two atoms it joins — CLYR-02 | ✓ VERIFIED | `highlightUtils.ts:444-458` `case 'bond'` loops `endpointPairs`, resolves via `struct.findBondId`, returns `{ atoms: [], bonds }`. LayerText.tsx:143-163 hyphen span emits `kind:'bond'` with offset-applied `endpointPairs`. Playwright: hyphen highlights its bond. |
| 3 | Hovering opening/closing parenthesis highlights all bonds in that branch (symmetric) — CLYR-03/D-04 | ✓ VERIFIED | `highlightUtils.ts:460-473` `case 'branch'` loops `bondPairs` with dedup. LayerText.tsx:165-212: open paren derives `bondPairs` via `collectBranchHyphens`, stores on `_bondPairs`; close paren reads same `_bondPairs` (symmetric). Playwright: paren (4)→C–N bond, paren (5)→carboxyl C–O bond, close paren symmetric. |
| 4 | Multi-fragment: every token resolves within its own fragment, no cross-fragment bleed — CLYR-04 | ✓ VERIFIED (code+tests) / ⚠ live pending | LayerText.tsx renderSegment applies `offset` (cumOffset machinery, lines 239/255/294/416/467). LayerText.clyr.test.tsx:188 `"1-2(4)3;1-2-3"` asserts frag-1 branch → `2-4`. Live multi-fragment canvas check not reported → human_needed item 1. |
| 5 | Duplicated/N* fragments: hovers highlight intended instance(s) — CLYR-05 | ✓ VERIFIED (code+tests) / ⚠ live pending | `canonicalFn` returns `canonicals[]` per instance; LayerText.tsx:152-154/179-181 maps pairs across all instances. LayerText.clyr.test.tsx:206 `"2*1-2(3)4"` asserts `{2-3, 6-7}` (both instances). Live N* canvas check not reported → human_needed item 2. |

**Score:** 5/5 truths verified in code + automated tests. Two truths (CLYR-04/05) carry a residual live-canvas human-verify because the phase declared a blocking `checkpoint:human-verify` gate whose multi-fragment/N* steps were not confirmed on the live canvas.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/lib/parseInchi.ts` | SubHover extended with `bond`/`branch` kinds + `endpointPairs`/`bondPairs`; exported `tokenizeCLayerSeg`, `CLayerToken`, `collectBranchHyphens` | ✓ VERIFIED | SubHover:33 union includes `'bond'|'branch'`; `endpointPairs` (50), `bondPairs` (55). `tokenizeCLayerSeg` (131), `CLayerToken` (110), `collectBranchHyphens` (196) all exported. |
| `src/lib/highlightUtils.ts` | atom case `bonds:[]`; new `bond`/`branch` cases via `findBondId` | ✓ VERIFIED | `case 'atom'` (441) `bonds:[]`; `case 'bond'` (444); `case 'branch'` (460) with dedup `!bonds.includes(bid)`. |
| `src/components/LayerText.tsx` | ConnectionText two-pass tokenization; hyphen/paren emit subHoverProps | ✓ VERIFIED | renderSegment (127) uses `tokenizeCLayerSeg` + per-token render loop; imports `tokenizeCLayerSeg, collectBranchHyphens` (line 9). |
| `src/lib/__tests__/clyr.test.ts` | failing→passing unit tests CLYR-01..05 | ✓ VERIFIED | 29 tests pass; uses REAL InChI fixtures `1-2(4)3(5)6`, `9(11(3)13)10(2)12`, `1-2-4-6-5-3-1`. |
| `src/__tests__/LayerText.clyr.test.tsx` | component tests for kind='bond'/'branch' emission | ✓ VERIFIED | 9 tests pass; REAL InChI fixtures incl. multi-fragment `1-2(4)3;1-2-3` and N* `2*1-2(3)4`. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| highlightUtils `atom` case | HighlightSpec bonds | `bonds: []` | ✓ WIRED | Line 441 returns empty bonds array. |
| highlightUtils `bond` case | struct.findBondId | `for ([a,b] of endpointPairs)` | ✓ WIRED | Lines 449-454. |
| highlightUtils `branch` case | struct.findBondId | `for ([a,b] of bondPairs)` | ✓ WIRED | Lines 465-470 with dedup. |
| LayerText renderSegment | tokenizeCLayerSeg / collectBranchHyphens | import from parseInchi | ✓ WIRED | Line 9 import; called at 129 / 173. |
| LayerText hyphen span | SubHover kind='bond' endpointPairs | `subHoverProps({kind:'bond', endpointPairs})` | ✓ WIRED | Line 159. |
| LayerText open/close paren | SubHover kind='branch' bondPairs | `subHoverProps({kind:'branch', bondPairs})` | ✓ WIRED | Lines 193 (open) / 208 (close); symmetric via `_bondPairs` lookup. |

### CRITICAL BUG-FIX VERIFICATION (collectBranchHyphens adjacency derivation)

The phase's known defect — branch `bondPairs` derived from hyphen TOKENS, leaving single-atom branches like `(4)` non-interactive on real InChI — is **CONFIRMED RESOLVED** in the live codebase:

- `collectBranchHyphens` (parseInchi.ts:196-226) now derives branch bonds by **atom ADJACENCY**: seeded with `open.attachLocal` (line 206), walks the token slice `[oi+1, ci)`, emitting parent→child pseudo-hyphen bonds on each `atom` token (lines 210-214), with stack semantics mirroring `parseConnectionBonds` for nested branches. It does NOT filter `type==='hyphen'` tokens (line 223 comment explicitly notes hyphens carry no adjacency info here).
- Verified examples match the fix contract: `2(4)` → `[[2,4]]`; `9(11(3)13)` → `{9-11, 11-3, 11-13}` (clyr.test.ts:159-164). Single-atom branch (4) yields the stem bond, not [].
- Fix commit `22b8227` ("fix(15): derive c-layer branch bonds by adjacency (CLYR-03)") confirmed present in git log.
- Test fixtures use REAL InChI only. The fabricated leading-hyphen syntax `(-4-5)` / `(-2)` appears ONLY in explanatory comments documenting the removed bug (clyr.test.ts:6, LayerText.clyr.test.tsx:6); live test bodies use `1-2(4)3(5)6`, `9(11(3)13)10(2)12`, `1-2-4-6-5-3-1`, `1-2(4)3;1-2-3`, `2*1-2(3)4`. Stale comment labels at clyr.test.ts:58/422 reference old fixture names but the code beneath uses real syntax / direct bondPairs literals — no fabricated syntax executes.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full test suite | `npx vitest run` | 342/342 pass (19 files) | ✓ PASS |
| Type check | `npx tsc --noEmit` | exit 0, zero errors | ✓ PASS |
| Phase-15 tests isolated | `npx vitest run clyr.test.ts LayerText.clyr.test.tsx` | 38/38 pass | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| CLYR-01 | 15-01, 15-02 | Atom number → single atom, no bonds | ✓ SATISFIED | atom case bonds:[]; Playwright live confirmed |
| CLYR-02 | 15-01, 15-02 | Hyphen → single bond | ✓ SATISFIED | bond case + endpointPairs; Playwright live confirmed |
| CLYR-03 | 15-01, 15-02 | Paren → all branch bonds (symmetric) | ✓ SATISFIED | branch case + adjacency collectBranchHyphens; Playwright live confirmed |
| CLYR-04 | 15-01, 15-02 | Multi-fragment correctness | ✓ SATISFIED (live pending) | cumOffset machinery + test `1-2(4)3;1-2-3` |
| CLYR-05 | 15-01, 15-02 | N* duplicated-fragment correctness | ✓ SATISFIED (live pending) | canonicals[] per instance + test `2*1-2(3)4` |

No orphaned requirements — all CLYR-01..05 claimed by both plans and implemented.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| parseInchi.ts:202,218,221 | — | `return []` / `?? null` | ℹ️ Info | Legitimate guard returns (malformed/unmatched paren), not stubs — covered by tests. |
| LayerText.tsx:186,202 | — | `_bondPairs` mutation via `as Record<string,unknown>` | ℹ️ Info | Intentional same-token-array cross-reference for open/close paren symmetry; type-cast is local and tested. No deferred-mutation antipattern (plan forbade useRef). |

No `TODO`/`FIXME`/`XXX`/`HACK` debt markers in phase-modified files. No stub returns reaching user-visible output. No `bonds: []` that should carry data (the atom-case empty bonds is the intended CLYR-01 behavior).

### Human Verification Required

The phase declared a blocking `checkpoint:human-verify` gate (15-02-PLAN Task 2) with 5 steps. The reported Playwright live-canvas run on L-Alanine confirms Steps 1-3 (CLYR-01/02/03). Steps 4-5 (multi-fragment, N* duplicated) were not reported as confirmed on the live canvas and are only covered by component tests.

#### 1. Multi-fragment c-layer live hover (CLYR-04)

**Test:** Draw/load a molecule with two or more disconnected fragments (e.g. two separate benzene rings, or a salt preset). In the /c layer hover atoms, hyphens, and parens in each fragment.
**Expected:** Highlights stay within the correct fragment — no cross-fragment bleed.
**Why human:** Canonical→pool-ID resolution and visual absence of cross-fragment bleed can only be confirmed on a live multi-fragment canvas; the Playwright run covered single-fragment L-Alanine only.

#### 2. Duplicated/N* fragment live hover (CLYR-05)

**Test:** Load a molecule whose c-layer carries an N* multiplier prefix (e.g. `2*...`). Hover an atom number, a hyphen, and a parenthesis.
**Expected:** A single token highlights the same position in every duplicate instance simultaneously.
**Why human:** Component test confirms both-instance pairs; simultaneous live halos were not reported.

### Gaps Summary

No code gaps. All five success criteria are implemented and proven by 342 passing tests and clean tsc. The critical adjacency bug (collectBranchHyphens) is confirmed fixed in the live source (commit 22b8227), and test fixtures contain only real InChI syntax. The single open item is the blocking human-verify gate: CLYR-01/02/03 are live-confirmed (Playwright on L-Alanine), but the multi-fragment (CLYR-04) and N* duplicated (CLYR-05) steps of that gate await live-canvas confirmation. Status is therefore `human_needed`, not `passed` — the code is correct and tested, but the phase's own declared blocking gate is not fully closed on the live canvas.

---

_Verified: 2026-06-22T08:14:00Z_
_Verifier: Claude (gsd-verifier)_
