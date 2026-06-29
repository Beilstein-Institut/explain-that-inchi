---
phase: 18-explanation-card-wiring-live-chemist-gate
verified: 2026-06-29T14:05:00Z
status: passed
score: 13/14 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/10
  gaps_closed:

    - "GAP-1: H-count card collapsed a discrete atom set {3,4,7,8,15} to a false min–max range 'atoms 3–15'"
    - "GAP-2: multi-component h-token showed globally-offset canonicals 'atoms 19–23' instead of the per-component numbers '2–6' the chemist reads in the InChI string"
  gaps_remaining: []
  regressions: []
re_verification_note: >
  Code defects from the prior live-chemist UAT (18-UAT.md cases 3 and 4) are now fixed and proven by tests.
  BUT the SC#5 live-chemist accuracy gate has NOT been re-run on the live canvas against the fixed cards.
  The gate remains open exactly as it was at the prior verification — it cannot be auto-closed on green tests.
human_verification:

  - test: "SC#5 / D-04 — Live chemist accuracy gate, RE-RUN after gap-closure. In the running app, hover (and pin) a sub-token for each of four real-molecule cases and read the explanation card aloud. (1) Tetrahedral stereo (/t/m/s, e.g. L-alanine InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1) — previously PASSED, regression-confirm. (2) Mobile-H ((H,X,Y) group, e.g. alanine carboxylate (H,5,6) or imidazole) — previously PASSED, regression-confirm; ALSO check a 3+-atom mobile-H group reads grammatically (see WR-03 below). (3) H-count: the GAP-1 fixture (InChIKey DRLFMBDRBRZALE / melatonin, h-token 3-4,7-8,15H) — the card MUST now read 'atoms 3, 4, 7, 8 and 15', NOT 'atoms 3–15'. (4) Multi-fragment: the GAP-2 fixture (C13H16N2O2.C7H8 melatonin·toluene), component-2 h-token 2-6H — the card MUST now read 'atoms 2, 3, 4, 5 and 6 (component 2)', NOT 'atoms 19–23', AND the canvas highlight must still light the correct toluene atoms."
    expected: "All four cards are chemically accurate on the LIVE canvas. Cases 3 and 4 specifically show the fixed enumeration / per-component numbering (the two prior blocker/major UAT issues are resolved). The canvas highlight for case 4 still lands on the correct atoms (global canonicals preserved). Stereo card still states +/- is a parity, NOT R/S. Every InChI is real getInchi() output (D-04a). Re-run during /gsd-verify-work 18 and record sign-off in 18-UAT.md (status must advance from 'diagnosed' to a pass)."
    why_human: "Chemical-accuracy judgement of rendered prose on the live canvas cannot be verified programmatically. This gate is LOAD-BEARING — the prior milestone (Phase 15) broke because a human-verify gate was bypassed on fake fixtures, and this very phase's first UAT caught two real defects that 333+ green tests did not. Green tests after the fix prove the code path; they do NOT discharge the gate. The phase is NOT verified until the chemist re-confirms all four cases (especially the two previously-failed ones) and 18-UAT.md carries the sign-off."
---

# Phase 18: Explanation-card wiring + live chemist gate — Verification Report (Re-verification)

**Phase Goal:** The existing explanation card becomes sub-token-aware — hovering or pinning a sub-token updates that same card with the Phase-17 copy, reverting to the whole-layer explanation when only the layer is hovered — all via one new precedence branch and zero store changes, then verified on the live canvas against real molecules by a human chemist before the milestone closes.
**Verified:** 2026-06-29T14:05:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap-closure plan 18-02 closed two live-chemist-gate H-count defects (GAP-1, GAP-2).

## Re-verification Summary

The prior verification (2026-06-29T08:28) was `human_needed` with the SC#5 live-chemist gate outstanding. The live UAT (18-UAT.md) then ran four cases: stereo and mobile-H **passed**; H-count (GAP-1) and multi-fragment (GAP-2) **failed** (blocker + major). Gap-closure plan 18-02 fixed both defects.

This re-verification confirms the **two code gaps are CLOSED** (full 3-level + data-flow + behavioral checks below) and **regression-checks the 18-01 wiring** (SC#1–4, Explanation.tsx untouched, tests green). The score moves from 9/10 to 13/14 verified.

**The SC#5 live-chemist gate stays OPEN.** The code is fixed and tests are green, but no human chemist has re-reviewed the corrected cards on the live canvas. 18-UAT.md still reads `status: diagnosed` with cases 3 and 4 marked `issue`. Per the load-bearing-gate rule, this is routed to human verification — it is NOT auto-passed on green tests.

## Goal Achievement

### Observable Truths

#### Gap-closure must_haves (18-02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | H-count sub-token names exactly the discrete atoms (no min–max range): `3-4,7-8,15H` reads "atoms 3, 4, 7, 8 and 15" (GAP-1) | ✓ VERIFIED | `subTokenInfo.ts:36-41` `atomList` joins all-but-last with ", " + " and " + last; single-atom → "atom N". Test `subTokenInfo.test.ts:94` asserts body contains "3, 4, 7, 8 and 15" and `:104` asserts NOT "3–15". No `Math.min/Math.max` or en-dash in production prose (grep: only a comment at line 29). |
| 2 | Multi-component h-token names atoms with per-component numbering (resets after ';'): component-2 `2-6H` reads "atoms 2, 3, 4, 5 and 6 (component 2)", not "atoms 19–23" (GAP-2) | ✓ VERIFIED | `atomList(atoms, fragmentOffset)` subtracts offset for display (`subTokenInfo.ts:37`); `componentMarker` (`:113-116`) appends " (component N)" for componentIndex>0. Test `subTokenInfo.test.ts:115-121`: global {19..23} + offset 17 → body contains "2, 3, 4, 5 and 6" and "(component 2)", NOT "19"/"23". |
| 3 | Canvas highlight still resolves correct atoms: SubHover.atoms stay GLOBAL (auxMap key); fragmentOffset is display-only, never subtracted in buildSubHoverSpecs (GAP-2) | ✓ VERIFIED | Dedicated guard `highlightUtils.test.ts:803-820`: `buildSubHoverSpecs({hAtoms, atoms:[19], fragmentOffset:17}, {19:0}, ...)` resolves via global 19 → pool 6; comment notes auxMap[2] would be undefined if offset were subtracted. spec resolved. GAP-2 LayerText test (`LayerText.fragmentOffset.test.tsx:55-62`) asserts emitted hit.atoms ∈ [18,24] (global), never de-offset on the payload. |
| 4 | Single-fragment unchanged: fragmentOffset 0/absent → plain atom numbers, no component marker; element/stereo/mobileH cards untouched (no regression) | ✓ VERIFIED | `atomList` short-circuits de-offset when fragmentOffset falsy (`:37` `fragmentOffset ? ... : atoms`); `componentMarker` returns '' for idx 0. GAP-1 single-fragment fixture renders literal numbers. Full suite 421 green; element/stereo bodies unchanged. |
| 5 | Every InChI used is real getInchi() output, never fabricated (D-04a) | ✓ VERIFIED | `subTokenInfo.test.ts` has 4 `InChI=1S/` fixtures (grep count = 4: ALANINE + SALT + MELATONIN_TOLUENE used for both gaps). `LayerText.fragmentOffset.test.tsx:16` pins the real `C13H16N2O2.C7H8` string. SubHover literals documented as parsed projections (legitimate — module consumes numeric fields, not the string). |
| 6 | Verbatim-passthrough holds: subTokenInfo consumes ONLY numeric SubHover fields (now incl. fragmentOffset/componentIndex), never re-reads layer.text, never emits an InChI fragment | ✓ VERIFIED | Module imports only `SubHover` type + `ELEMENT_NAMES`; no parser call, no layer.text read, no string arg. New fields are pre-computed numerics. `dangerouslySetInnerHTML` absent from module (plain string assembly). |

#### 18-01 wiring must_haves (regression — Explanation.tsx untouched by gap-closure)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Hover/pin sub-token updates the existing card; reverts to layer card when only layer hovered (SUBEX-01) | ✓ VERIFIED (regression) | `Explanation.tsx:64` `effSub`, `:68` `subCopy`, `:113` `subCopy ?` branch — intact (last touched 7bd42a3, before gap-closure). Explanation.test.tsx 10/10 green. |
| 8 | Pinned sub-token via effSub; precedence keyHoverKind→sub→layer→legend→idle; InChIKey hover wins (SUBEX-02) | ✓ VERIFIED (regression) | `Explanation.tsx:64` `effSub = pinned ? pinned.sub : subHover`; ternary order unchanged. Tests D/E green. |
| 9 | Element-formula sub-token: name + count + Hill-order, fragment-scoped (SUBEX-07) | ✓ VERIFIED (regression) | `subTokenInfo.ts:50-64` element branch: name + "count is the number in this component" (canonRange) + Hill-order for C/H. Unchanged by gap-closure. Test F green. |
| 10 | All sub-token copy from subTokenInfo; never reads layer.text, never emits InChI fragment, no remount (SUBEX-09) | ✓ VERIFIED (regression) | Branch reads only `subCopy.title`/`.body`; `dangerouslySetInnerHTML` count == 1 (pre-existing layer branch only). Gap-closure touched no canvas/provider file. |
| 11 | Verbatim-passthrough: displayed InChI byte-identical card-open vs closed; no WASM re-init on sub-hover (SC#4) | ✓ VERIFIED (regression) | No store field added; effSub/subCopy/subAccent are local consts. Gap-closure diff = 5 lib/test files, none touch Editor/provider/store-shape. |
| 12 | Parent-layer accent inherited on sub-token card (D-01) | ✓ VERIFIED (regression) | `Explanation.tsx:81-85` subAccent from effIdx; unchanged. |

#### Live-chemist gate (SC#5)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 13 | The two previously-failed UAT cases (GAP-1, GAP-2) are CODE-fixed and proven by behavioral tests | ✓ VERIFIED | See truths 1–3. The exact strings the UAT flagged ("atoms 3–15", "atoms 19–23") are now asserted ABSENT and the corrected strings asserted present. |
| 14 | SC#5 / D-04 live-chemist accuracy gate RE-RUN on the live canvas after gap-closure, all four cases confirmed, sign-off in 18-UAT.md | ⚠️ HUMAN-REQUIRED | 18-UAT.md still `status: diagnosed`; cases 3 & 4 `result: issue`. No live re-run after the fix. The fixed cards have NOT been read on the live canvas by a chemist. Routed to human verification — NOT auto-passed (load-bearing gate; Phase-15 precedent). |

**Score:** 13/14 truths verified (truth 14 is the load-bearing human gate, deferred to /gsd-verify-work 18 by design).

### Required Artifacts (18-02)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/subTokenInfo.ts` | atomList enumerates discrete set + subtracts fragmentOffset; componentMarker | ✓ VERIFIED | `atomList` (36-41), `componentMarker` (113-116), hAtoms (66-74) + mobileH (76-88) consume them. Substantive + wired (called by Explanation.tsx:68). |
| `src/lib/parseInchi.ts` | SubHover gains fragmentOffset?/componentIndex? (display-only) | ✓ VERIFIED | Lines 53-54 with doc comment (49-51) stating atoms[] stay GLOBAL, offset for display only. |
| `src/components/LayerText.tsx` | All 3 hAtoms + 3 mobileH sites set fragmentOffset + componentIndex | ✓ VERIFIED | 6 construction sites (390,404,442,456,498,512): plain ';'-seg (offset/componentIdx), pure-N* (0/0), ';'-with-N* (baseOffset/fragIdx). grep count 7 each (6 sites + 1 comment). |
| `src/lib/__tests__/subTokenInfo.test.ts` | GAP-1 enumeration + GAP-2 de-offset cases | ✓ VERIFIED | 28 tests; GAP-1 (94-104), GAP-2 (115-136). All green. |
| `src/__tests__/LayerText.fragmentOffset.test.tsx` | Multi-fragment hit carries offset/index while atoms stay global | ✓ VERIFIED | 3 tests; component-2 global [18,24]+offset17+idx1, component-1 offset0. Green. |

### Key Link Verification (18-02)

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| LayerText cumOffset/baseOffset | SubHover.fragmentOffset | set at same site global offset applied to atoms | ✓ WIRED | All 6 sites set fragmentOffset alongside the global atoms array; atoms computation unchanged. |
| SubHover.fragmentOffset | atomList de-offset (DISPLAY only) | subTokenInfo.ts:37 | ✓ WIRED | `local = fragmentOffset ? atoms.map(a => a - fragmentOffset) : atoms`. |
| SubHover.atoms (global) | buildSubHoverSpecs → auxMap[canon] → highlight | UNCHANGED | ✓ WIRED | Guard test highlightUtils.test.ts:803 proves offset ignored on this path. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| subTokenInfo card body | sub.atoms / sub.fragmentOffset | LayerText hit construction from parsed InChI layers (real getInchi via Ketcher WASM) | Yes (parsed offsets, real fixtures) | ✓ FLOWING |
| canvas highlight | subHover.atoms (global canonicals) | auxMap (parseAuxMapping, real AuxInfo) | Yes — guard test confirms resolution | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| GAP-1/GAP-2 card copy correct | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/__tests__/LayerText.fragmentOffset.test.tsx` | 31 passed | ✓ PASS |
| Highlight ignores fragmentOffset (state-preservation invariant) | named guard `highlightUtils.test.ts` GAP-2 guard | passed (resolves via global 19) | ✓ PASS |
| Explanation wiring no regression | `npx vitest run src/components/__tests__/Explanation.test.tsx` | 10 passed | ✓ PASS |
| Full suite no regression | `npx vitest run` | 421 passed, 0 failures | ✓ PASS |
| Types sound | `npx tsc --noEmit` | clean | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SUBEX-01 | 18-01 | Hover sub-token updates existing card; reverts to layer | ✓ SATISFIED | Truths 7; regression green. |
| SUBEX-02 | 18-01 | Pinned via effSub; precedence chain | ✓ SATISFIED | Truth 8. |
| SUBEX-07 | 18-01 / 18-02 | Element hover name+count+Hill-order, fragment-scoped; per-component h-token display (GAP-2) | ✓ SATISFIED | Truths 2, 9. |
| SUBEX-09 | 18-01 / 18-02 | Copy from offset-only SubHover; no reconstruction; no remount; verbatim-passthrough | ✓ SATISFIED | Truths 6, 10, 11. |

All four declared requirement IDs (SUBEX-01/02/07/09) accounted for. REQUIREMENTS.md traceability maps exactly these four to Phase 18 — no orphans, no extras. (18-02 frontmatter declares SUBEX-07/09, the subset its gap-fix touches; both are within the phase's four. No scope reduction.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| subTokenInfo.ts | 76-88 | `mobileH` uses `local.join(' and ')` (REVIEW WR-03) — a 3+-atom mobile-H group reads "atoms 1 and 2 and 3 and 4" instead of routing through `atomList` | ⚠️ Warning | Grammatically broken for ≥3-atom mobile-H groups. NOT in 18-02 must_haves; the gap-closure scoped only hAtoms enumeration + de-offset. Mobile-H DID get the de-offset (correct numbers) but kept the old join grammar. Real but narrow — flag for the SC#5 chemist to check on a 3+-atom mobile-H molecule. |
| subTokenInfo.ts | 36-41 | `atomList([])` → "atoms  and undefined" (REVIEW WR-04) — no empty-array guard; reachable via LayerText:389 non-(H…) parenthesis group emitting a mobileH with atoms=[] | ⚠️ Warning | Latent malformed card on an edge-case parenthesis group. NOT in 18-02 must_haves. One-line guard `if (atoms.length === 0) return ''` closes it. Not a gap-closure regression (the path predates 18-02). |

No debt markers (TBD/FIXME/XXX) in any changed file. No `Math.min/Math.max` or en-dash range in production prose (the one en-dash is in an explanatory comment).

### Human Verification Required

**1. SC#5 / D-04 — Live chemist accuracy gate, RE-RUN after gap-closure (LOAD-BEARING)**

**Test:** In the running app, hover and pin a sub-token for each of four real-molecule cases, reading the explanation card:

  1. Tetrahedral stereo (`/t/m/s`, e.g. L-alanine) — previously PASSED, regression-confirm the parity-not-R/S wording.
  2. Mobile-H (`(H,X,Y)` group) — previously PASSED, regression-confirm. **Additionally** test a mobile-H group with 3+ atoms (e.g. a `(H2,1,2,3,4)`-style group) to check it reads grammatically — REVIEW WR-03 flags `mobileH` still uses "X and Y and Z" joining.
  3. H-count, the GAP-1 fixture (InChIKey DRLFMBDRBRZALE / melatonin, h-token `3-4,7-8,15H`): the card MUST now read "atoms 3, 4, 7, 8 and 15", **NOT** "atoms 3–15". (This was the prior BLOCKER.)
  4. Multi-fragment, the GAP-2 fixture (`C13H16N2O2.C7H8` melatonin·toluene), component-2 h-token `2-6H`: the card MUST now read "atoms 2, 3, 4, 5 and 6 (component 2)", **NOT** "atoms 19–23", AND the canvas highlight must still light the correct toluene atoms. (This was the prior MAJOR.)

**Expected:** All four cards chemically accurate on the LIVE canvas; cases 3 & 4 show the fixed enumeration / per-component numbering; case 4 highlight lands on the correct atoms (global canonicals preserved); stereo states `+`/`−` is a parity, NOT R/S. Every InChI is real `getInchi()` output (D-04a). Sign-off recorded in **18-UAT.md** (status must advance from `diagnosed` to a pass).

**Why human:** Chemical-accuracy judgement of rendered prose on the live canvas is not programmatically verifiable. This gate is LOAD-BEARING — the prior milestone (Phase 15) broke because a human-verify gate was bypassed on fake fixtures, and this phase's first UAT caught two real defects that 333+ green tests missed. Green tests after the fix prove the code path executes; they do NOT discharge the gate. The phase is NOT verified until the chemist re-confirms all four cases (especially the two previously-failed ones) and 18-UAT.md carries the sign-off.

### Gaps Summary

**No code gaps.** Both gap-closure must_have sets are fully satisfied: GAP-1 (discrete-set enumeration) and GAP-2 (per-component display de-offset with global canonicals preserved for highlight) are implemented, wired at all six construction sites, and proven by failing-first → green behavioral tests plus a dedicated highlight-preservation guard. Full suite 421 green, tsc clean, diff scoped to the five declared files, real fixtures pinned. The 18-01 wiring (SC#1–4) is untouched by gap-closure and regression-green.

**One outstanding item — the SC#5 live-chemist accuracy gate.** The two defects the chemist found in the first UAT are code-fixed, but the corrected cards have NOT been re-read on the live canvas by a chemist; 18-UAT.md still reads `status: diagnosed`. By the load-bearing-gate rule (and explicit task instruction), this is routed to human verification and is NOT auto-passed on green tests. Status is therefore `human_needed`, not `passed`.

Two REVIEW warnings (WR-03 mobileH grammar for 3+-atom groups; WR-04 `atomList([])` empty-set malformed string) are quality-adjacent, outside the 18-02 must_haves, and folded into the SC#5 chemist checklist (WR-03) — they do not block the gap-closure truths but should be resolved before milestone close.

---

_Verified: 2026-06-29T14:05:00Z_
_Verifier: Claude (gsd-verifier)_
_Mode: re-verification (gap-closure 18-02)_
