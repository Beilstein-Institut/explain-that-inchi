---
phase: 17-sub-token-copy-core-element-table-pure-module-tests
verified: 2026-06-26T15:12:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "Human chemical-accuracy verify gate (SUBEX-10 / Phase-18 SC#5)"
    addressed_in: "Phase 18"
    evidence: "Phase 18 SC#5: 'A human chemist reviews the live card strings ... confirms chemical accuracy — this gate is not bypassed before the phase is marked verified.' Phase 17 PLAN explicitly scopes the live chemist gate to Phase 18; SUBEX-07/SUBEX-09 (live behaviour) are Phase 18 requirements."
human_verification:
  - test: "Chemist reads the four card body strings (element, hAtoms, mobileH, stereo) emitted by subTokenInfo for real molecules"
    expected: "Prose is chemically accurate — hAtoms names no functional group, mobileH is shared/tautomeric with no count, stereo carries the parity≠R/S caveat and correct sign, element count/scope correct"
    why_human: "String-content regex pins (parity, /not.*R\\/S/, no-methyl, no-count) catch the documented error classes, but full chemical-prose correctness is a judgment call. The PLAN and SUBEX-10 route this to the Phase-18 live chemist gate; it is not machine-verifiable here."
---

# Phase 17: Sub-token copy core (element table + pure module + tests) Verification Report

**Phase Goal:** Full periodic-table element names and the chemically-verified, unit-tested pure module that turns a hovered/pinned sub-token into card copy.
**Verified:** 2026-06-26T15:12:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | ELEMENT_NAMES extended in place to full periodic table; non-organic resolves (K→potassium), case-exact (Co→cobalt ≠ C+O); existing layerInfo tests stay green | ✓ VERIFIED | `Object.keys(ELEMENT_NAMES).length === 120`; Co=cobalt, C=carbon, O=oxygen, K=potassium; D=deuterium, T=tritium, S=sulfur, P=phosphorus, Al=aluminium, Cs=caesium, Og=oganesson. Zero uppercase values, zero duplicate keys. layerInfo.test.ts green (D-19 block + existing). |
| 2 | New pure module subTokenInfo returns {title, body, reading?} for element/hAtoms/mobileH/stereo and null for atom/bond/branch | ✓ VERIFIED | `src/lib/subTokenInfo.ts` switch(sub.kind): 4 kinds return `{title, body}`, default returns null. Tests pin null for atom/bond/branch (3 passing). Signature `(sub: SubHover, _atomElements: Record<number,string>) => SubTokenCopy | null`. |
| 3 | hAtoms card never names a functional group; mobileH says shared/mobile/tautomeric, no count, no "bond between"/"each" | ✓ VERIFIED | hAtoms body: "atom N bears n hydrogen(s)... nothing about what kind of group" — test `not.toMatch(/methyl|amine|carboxyl|functional group/i)` passes. mobileH body matches `/shared\|mobile\|tautomer/i` and `not.toMatch(/bond between\|each\|\bcount\b/i)`. mobileH branch reads `sub.atoms` only — grep confirms no `sub.count`. |
| 4 | Stereo card explains fixed sp³ handedness AND states +/− is parity, NOT R/S — body matches /parity/ and /not.*R\/S/i | ✓ VERIFIED | Body asserted true for: `/parity/i`, `/not.*R\/S/i`, sign `/[−-]/`, and `/m`+`/s` pointers. All 5 stereo tests pass. Caveat is a fixed clause (D-05, survives trimming). |
| 5 | All fixtures are real getInchi() output (/^InChI=1S\//); fragment-2+ copy derived from offset SubHover fields, never re-parsing layer.text | ✓ VERIFIED | ALANINE fixture byte-identical to HelpTour.test.tsx:11 (`REAL_INCHI_ALANINE`). SALT = `InChI=1S/CH5N.ClH/c1-2;/h2H2,1H3;1H` (methylamine HCl, user-confirmed live-tool output). Anti-fabrication `it` pins `/^InChI=1S\//` on both. Passthrough grep: module imports only `type SubHover` from ./parseInchi + ELEMENT_NAMES from ./layerInfo; no `layer.text`, no `getInchi`, no parser call, no parseAuxMapping. D-14 canonRange test uses constructed SubHover literal (plan-sanctioned, not fabrication). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
| - | ---- | ------------ | -------- |
| 1 | Human chemical-accuracy verify gate (SUBEX-10) | Phase 18 | Phase 18 SC#5 owns the live chemist gate; Phase 17 PLAN scopes the human content check to Phase 18. SUBEX-07/SUBEX-09 (observable live behaviour) are Phase 18 requirements, not Phase 17. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/layerInfo.ts` | ELEMENT_NAMES extended to 120 | ✓ VERIFIED | 120 lowercase entries, signature `Record<string,string>` unchanged, elementColor whitelist still 10 elements |
| `src/lib/__tests__/layerInfo.test.ts` | D-19 invariant block | ✓ VERIFIED | D-19 block pins count, case-exactness, K=potassium, D/T defined; full file green |
| `src/lib/subTokenInfo.ts` | pure subTokenInfo + SubTokenCopy | ✓ VERIFIED | Exports both; pure, DOM-free; imports only ./parseInchi (type) + ./layerInfo |
| `src/lib/__tests__/subTokenInfo.test.ts` | real-fixture suite | ✓ VERIFIED | 22 tests passing; real fixtures + anti-fabrication sanity |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| subTokenInfo.ts | parseInchi.ts | `import type { SubHover }` | ✓ WIRED | type-only import; SubHover union carries all consumed fields |
| subTokenInfo.ts | layerInfo.ts | `import { ELEMENT_NAMES }` | ✓ WIRED | used in elementTitle + element body |
| formulaSegmentReading | ELEMENT_NAMES | `ELEMENT_NAMES[el] \|\| el` | ✓ WIRED | additive extension; single-fragment output byte-unchanged (formulaReading tests green) |
| elementColor | (independent whitelist) | NOT widened | ✓ VERIFIED | whitelist still `['C','H','N','O','S','P','F','Cl','Br','I']` |
| mobileH branch | sub.atoms only | never sub.count | ✓ WIRED | grep confirms no sub.count in mobileH branch |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full vitest suite | `npx vitest run` | 401 passed, 21 files | ✓ PASS |
| subTokenInfo suite | (within full run) | 22 passed | ✓ PASS |
| layerInfo suite | (within full run) | green incl. D-19 | ✓ PASS |
| Type check | `npx tsc -p tsconfig.app.json --noEmit` | exit 0 | ✓ PASS |
| ELEMENT_NAMES = 120 case-exact lowercase | node extract | count 120, 0 uppercase, 0 dupes | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| SUBEX-03 | 17-02 | H-count card, no functional group | ✓ SATISFIED | Truth 3; no-methyl test passes |
| SUBEX-04 | 17-02 | Mobile-H shared/tautomeric, not fixed bond | ✓ SATISFIED | Truth 3; shared + no-count tests pass |
| SUBEX-05 | 17-02 | Stereo: sp³ handedness, +/− is parity | ✓ SATISFIED | Truth 4; parity test passes |
| SUBEX-06 | 17-02 | Stereo: parity NOT R/S + m/s note | ✓ SATISFIED | Truth 4; /not.*R\/S/ + /m + /s tests pass |
| SUBEX-08 | 17-01 | Full periodic-table table, case-exact | ✓ SATISFIED | Truth 1; 120 entries, case-exact |
| SUBEX-10 | 17-02 | Pure unit-tested module, real fixtures, parity caveat pinned | ✓ SATISFIED (Phase-17 portion) | Truth 5 + Truth 4. Human chemist gate deferred to Phase 18 (per SUBEX-10 wording + PLAN scope) |

All 6 phase requirement IDs accounted for. SUBEX-07 and SUBEX-09 are mapped to Phase 18 in REQUIREMENTS.md (live behaviour) — correctly NOT claimed by this phase. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | No TBD/FIXME/XXX/HACK/PLACEHOLDER in any modified file | — | — |

Note: the `reading?` field is declared in `SubTokenCopy` but unused, and `_atomElements` is an intentionally-unused parameter — both documented (D-07 / Phase-18 forward-use) with explanatory comments, not stubs. The SALT fixture is referenced only by the anti-fabrication sanity `it`; the D-14 scope assertion uses a plan-sanctioned constructed `SubHover` literal. This is by design, not a gap.

### Human Verification Required

#### 1. Chemical-accuracy review of card prose

**Test:** A chemist reads the four card `body` strings (element, hAtoms, mobileH, stereo) produced by `subTokenInfo` for real molecules.
**Expected:** Prose is chemically correct and not misleading — hAtoms names no functional group, mobileH is shared/tautomeric with no count, stereo carries the parity≠R/S caveat with the correct sign, element count/scope is accurate.
**Why human:** The regex pins catch the documented error classes (parity vs R/S, methyl trap, mobileH count), but full prose correctness is a chemist's judgment. SUBEX-10 and the Phase-17 PLAN explicitly route this to the Phase-18 live chemist gate — it is not machine-verifiable in this phase.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria and all 6 phase requirement IDs are satisfied by codebase evidence: ELEMENT_NAMES is exactly 120 case-exact lowercase entries with the elementColor whitelist untouched; subTokenInfo is a verbatim-passthrough pure module returning the four card shapes and null for c-layer kinds; every fixture is real getInchi() output with the parity≠R/S caveat pinned; full suite (401 tests) and tsc are green.

Status is `human_needed` (not `passed`) solely because the SUBEX-10 chemical-accuracy gate is a human judgment call deliberately deferred to the Phase-18 live chemist review. No automated check is outstanding.

---

_Verified: 2026-06-26T15:12:00Z_
_Verifier: Claude (gsd-verifier)_
