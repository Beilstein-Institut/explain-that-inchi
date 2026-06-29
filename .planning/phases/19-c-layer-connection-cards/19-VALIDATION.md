---
phase: 19
slug: c-layer-connection-cards
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from
> `19-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.0.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1 second (quick) / ~1 second (full, 422 tests today) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/lib/__tests__/subTokenInfo.test.ts`
- **After every plan wave:** `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/lib/__tests__/highlightUtils.test.ts`
- **Before `/gsd-verify-work`:** full suite green (`npx vitest run`), then the **human chemical-accuracy gate** on the live card strings (v1.5 load-bearing control — must NOT be bypassed).
- **Max feedback latency:** ~2 seconds

---

## Per-Requirement Verification Map

(Task IDs assigned by the planner; every task carries an `<automated>` verify command.)

| Requirement | Behavior | Test Type | Automated Command | File |
|-------------|----------|-----------|-------------------|------|
| CONN-01 | atom card lists full neighbour set (ALANINE atom 2 → "1, 3 and 4") | unit | `vitest run subTokenInfo.test.ts -t "atom card"` | extend `subTokenInfo.test.ts` |
| CONN-01 | zero-neighbour atom → "no bonds recorded" (empty-list guard / WR-04) | unit | `-t "no bonds recorded"` | extend |
| CONN-02 | hyphen card names the two joined atoms (ALANINE `1-2` → "Atoms 1 and 2") | unit | `-t "bond card"` | extend |
| CONN-02 | branch card names branch-point + bond pairs (ALANINE `(4)` off atom 2 → "2–4") | unit | `-t "branch card"` | extend |
| CONN-03 | component-2 atom/bond/branch de-offsets to printed numbers + "(component 2)" (MELATONIN_TOLUENE toluene ring) | unit | `-t "component"` | extend |
| CONN-03 | `buildSubHoverSpecs` guard — c-layer SubHover with non-zero `fragmentOffset` still resolves via GLOBAL canonical | unit | `vitest run highlightUtils.test.ts -t "GAP-2 guard"` | extend (mirror `:803`) |
| CONN-04 | copy-safety — no card body contains "single", "double", "order", "geometry", or element words | unit | `-t "copy safety"` | extend |
| CONN-04 | c-layer kinds NO LONGER return null | unit | `-t "atom kind"` | **replace** `subTokenInfo.test.ts:193-205` |

---

## Wave 0 Requirements

- [ ] No NEW test files — extend `subTokenInfo.test.ts` and `highlightUtils.test.ts` in place.
- [ ] **REPLACE** `subTokenInfo.test.ts:193-205` ("c-layer kinds fall through to null") — this phase reverses that behaviour; the block must be updated to the new contract or the suite contradicts itself.
- [ ] Reuse existing real fixtures ALANINE + MELATONIN_TOLUENE (no new fixtures). Derive the `SubHover` literals (`incidentPairs`/`endpointPairs`/`bondPairs`/`fragmentOffset`) as the parsed projection of those real `getInchi()` strings — the precedent the file already uses for hAtoms (legitimate, not fabrication).
- [ ] The c-layer SubHover literals in the `highlightUtils.test.ts` GAP-2 guard carry a non-zero `fragmentOffset` AND a global canonical that maps in the mock `auxMap` (mirror `:803-820`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live card strings are chemically/notationally accurate on a real molecule (atom neighbours, hyphen pair, branch bonds, per-component numbering) | CONN-01..04 | Chemical/notation judgement on the live canvas — the v1.5 load-bearing control | Draw/load a multi-fragment molecule, hover an atom number, a hyphen, and a parenthesis in the c-layer; confirm the card text matches the numbers printed in the string and the highlight lights the right atoms. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 replaces the contradictory null-assertion block
- [ ] No watch-mode flags (use `vitest run`, never bare `vitest`)
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
