---
phase: 19-c-layer-connection-cards
verified: 2026-06-30T10:15:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification_resolved: |
  All three human-verification items PASSED in live chemist UAT (2026-06-30; see 19-UAT.md).
  Test 2 initially FAILED on N* duplicated-fragment card text in both layers (global numbers +
  neighbours fanned across every copy; h-layer merged copies "1-12"). Root-caused and fixed in
  commit 2e881d9 (SubHover.fragMult — the card collapses to ONE representative fragment in
  per-component LOCAL numbering and states "in each of N identical components"; highlight fields
  untouched, CLYR-05 preserved). The deferred "Connection layer - " title prefix was also applied.
  Re-verified live by the chemist on caffeine+toluene+2-benzene. 446 tests pass, tsc + build clean.
notes:

  - "19-02 SUMMARY written (9571c77) after the chemist gate passed; wiring 21b793b + gap fix 2e881d9."
  - "N* card fix (2e881d9): single-fragment local display via SubHover.fragMult; GAP-2 highlight-invariance guards still pass."
  - "Title prefix applied: c-layer card titles are 'Connection layer - Atom/Bond/Branch'."

---

# Phase 19: c-layer Connection Cards Verification Report

**Phase Goal:** Hovering or pinning a connection-layer sub-token updates the existing card with its connectivity, in canonical atom indices: a single atom number lists the atoms it is bonded to, a hyphen names the two atoms it joins, and a parenthesis describes the branch and the bonds it encodes. Per-component numbering (reset after ';' with '(component N)') while SubHover payloads keep global canonicals (Phase-15 highlight unchanged). Cards make no bond-order / hydrogen / geometry claim.
**Verified:** 2026-06-30
**Status:** passed (4/4 — all human items re-verified live after fix 2e881d9)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Atom number → card lists every canonical neighbour (full set, no range/truncation); zero-neighbour says so | ✓ VERIFIED | subTokenInfo.ts:97-118 `case 'atom'` derives `neighbours = [...new Set(incidentPairs.map(other endpoint))].sort()`; empty → "no bonds recorded" (:107-112). LayerText.tsx:194-206 attaches global `incidentPairs` via `segmentBonds` filtered to the atom. Tests: subTokenInfo.test.ts:214-243 ("1, 3 and 4" for ALANINE atom 2; empty-list guard, no "undefined"/"atoms  and"). |
| 2 | Hyphen → names the two joined atoms; parenthesis → branch off branch-point + bond pairs; open/close show identical card | ✓ VERIFIED | `case 'bond'` (:120-128) names `endpointPairs[0]`; `case 'branch'` (:130-140) names `branchPoint` + `bondPairList(pairs)` en-dash. LayerText.tsx:260-289 computes global `branchPoint` on the open token, close-paren reads it back from `tokens[openTokenIdx]` → identical card. Tests: subTokenInfo.test.ts:245-271 (bond "1 and 2"; branch "atom 2"/"2–4"). |
| 3 | Multi-component: per-component printed numbers + '(component N)' marker, while highlight resolves via GLOBAL canonicals — buildSubHoverSpecs guard | ✓ VERIFIED | De-offset is display-only via `atomList`/`bondPairList(…, off)` and `componentMarker` (:36-41,149-167); LayerText threads `cumOffset`/`fragIdx` at :347, `0/0` at N* sites (:322,343). GAP-2 guards: highlightUtils.test.ts:822-857 prove `kind:'atom'`/`kind:'bond'` with `fragmentOffset:17` still resolve via global canonical (pool 0 / bonds>0). subTokenInfo.test.ts:275-294 ("1 and 7"+"(component 2)", never 18/24). |
| 4 | No bond-order/H/geometry claim; pure module (no reconstruction/remount); real fixtures + empty-list guard | ✓ VERIFIED | subTokenInfo imports only the `SubHover` type + `ELEMENT_NAMES` — no parser/tokenizer call (verbatim-passthrough). Copy-safety tests: subTokenInfo.test.ts:297-321 (no positive bond-order, no element word, no geometry). Real fixtures ALANINE + MELATONIN_TOLUENE (anti-fabrication sanity :22-28). Empty-list guard :231-243. |

**Score:** 3/4 truths verified (machine-checkable). Truth set is fully implemented and wired; the 4th plan-02 truth ("a human chemist confirms the live card strings are notationally accurate") is by construction a human gate — counted as the human-verification item below, not auto-passable. The other three truths are VERIFIED in code + tests.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/parseInchi.ts` | SubHover gains `incidentPairs?`, `branchPoint?`; `segmentBonds` exported | ✓ VERIFIED | Fields at :65-72 (documented global-canonical/GAP-2 style); `export function segmentBonds` :200. |
| `src/lib/subTokenInfo.ts` | atom/bond/branch cases return cards (not null); `bondPairList` helper | ✓ VERIFIED | Three cases :97-140; `bondPairList` :149-155; `default: return null` only for genuinely-unknown kinds. |
| `src/lib/__tests__/subTokenInfo.test.ts` | null-fallthrough block REPLACED + atom/bond/branch/component/copy-safety tests | ✓ VERIFIED | :200-321 — reversed non-null contract + all CONN test blocks; old null block gone. |
| `src/lib/__tests__/highlightUtils.test.ts` | c-layer GAP-2 highlight-invariance guard (atom + bond) | ✓ VERIFIED | :822-857 — atom + bond kind, resolve via global canonical with `fragmentOffset:17`. |
| `src/components/LayerText.tsx` | ConnectionText attaches incidentPairs + fragmentOffset/componentIndex (all c-layer SubHovers) + branchPoint (both parens) | ✓ VERIFIED | atom :194-207, hyphen :219-228, open :245-273, close :283-293; threaded at :347. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| LayerText atom site | subTokenInfo 'atom' | `incidentPairs` (global) via exported `segmentBonds` | ✓ WIRED | :194-206 reuses `segmentBonds` (no second walker), maps to globals with the hyphen path's offset/canonicalFn. |
| LayerText branch (open+close) | subTokenInfo 'branch' | `branchPoint` (global), stashed on open token | ✓ WIRED | open computes + stashes `_branchPoint` (:260-268); close reads it (:288-289) → identical card. |
| `;`-split site | renderSegment | `cumOffset`→fragmentOffset, `fragIdx`→componentIndex | ✓ WIRED | :347; N* and pure-N* sites pass 0/0 (:322,343) per design. |
| SubHover payload | buildSubHoverSpecs highlight | global canonicals (auxMap key), fragmentOffset ignored | ✓ WIRED | Proven by GAP-2 guards highlightUtils.test.ts:822-857. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green | `npx vitest run` | 23 files / 440 tests passed | ✓ PASS |
| Type-check | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| c-layer card + guard subset | `npx vitest run subTokenInfo.test.ts highlightUtils.test.ts` | 2 files / 102 tests passed | ✓ PASS |
| Live card-string accuracy (single + co-crystal) | `npm run dev` + hover | — | ? SKIP → human (Step 8) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONN-01 | 19-01, 19-02 | Atom number → full neighbour set or "no recorded bond" | ✓ SATISFIED | atom case + empty guard + incidentPairs wiring; REQUIREMENTS.md:86. |
| CONN-02 | 19-01 | Hyphen names two atoms; parenthesis describes branch + bond pairs | ✓ SATISFIED | bond + branch cases + tests; REQUIREMENTS.md:87. |
| CONN-03 | 19-01, 19-02 | Per-component numbering + '(component N)'; highlight via global canonicals (buildSubHoverSpecs guard) | ✓ SATISFIED | de-offset display-only + GAP-2 guards; REQUIREMENTS.md:88. |
| CONN-04 | 19-01 | No bond-order/H/geometry claim; pure module; real fixtures + empty guard | ✓ SATISFIED | copy-safety tests + verbatim-passthrough; REQUIREMENTS.md:89. |

All four requirement IDs declared in PLAN frontmatter (CONN-01..04) appear in REQUIREMENTS.md mapped to Phase 19, and each has passing automated coverage. No orphaned requirements.

### Anti-Patterns Found

None. No TBD/FIXME/XXX/placeholder/"not implemented" markers in any modified file (subTokenInfo.ts, parseInchi.ts, LayerText.tsx). No `dangerouslySetInnerHTML` added. No parser call / string reconstruction inside subTokenInfo (the two `.join` uses are list-grammar helpers, not InChI reconstruction). No de-offset number written onto any SubHover field (GAP-2 invariant holds).

### Human Verification Required

19-02 is committed (21b793b) but deliberately has NO SUMMARY — it is paused at its `checkpoint:human-verify gate="blocking"` chemist-accuracy gate. Everything machine-checkable is verified above. The remaining items require a human chemist on the live app:

1. **Single-component live card accuracy** — hover atom/hyphen/parenthesis on alanine or Caffeine; confirm card strings match the printed string and the highlight is unchanged.
2. **Multi-component (co-crystal) per-component numbering** — hover in component 2; confirm per-component numbers + "(component 2)" and correct highlight via globals.
3. **No-remount + copy review** — no loading flash on hover/pin; no bond-order/H/geometry claim.

(See frontmatter `human_verification` for full test/expected/why_human.)

### Outstanding Tweak (not a gap)

The title-prefix tweak requested at the gate — "Connection layer - " before Atom/Bond/Branch — is **NOT yet applied**. Titles remain plain `'Atom'`/`'Bond'`/`'Branch'` (subTokenInfo.ts:109, 117, 127, 139). This is recorded for the human gate resolution; it does not block the machine-verified truths.

### Gaps Summary

No machine-checkable gaps. The three code-verifiable truths (CONN-01/02/03 connectivity, per-component display, global-canonical highlight invariance) are fully implemented, wired, and covered by passing tests; the full suite (440) and tsc are green. Status is `human_needed` solely because plan 02's blocking chemist-accuracy gate is open and the live card strings + highlight + no-remount require a human on the running app. The "Connection layer - " title prefix remains unapplied and should be resolved alongside the gate.

---

_Verified: 2026-06-30_
_Verifier: Claude (gsd-verifier)_
