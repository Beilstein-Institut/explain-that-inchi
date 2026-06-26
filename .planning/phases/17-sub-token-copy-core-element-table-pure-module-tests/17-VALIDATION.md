---
phase: 17
slug: sub-token-copy-core-element-table-pure-module-tests
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-26
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` (separate from `vite.config.ts` — Vite 8 / Vitest 3 Plugin type conflict) |
| **Quick run command** | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/lib/__tests__/layerInfo.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds (pure-logic, no DOM, no WASM in these tests) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (the test file for the module just touched)
- **After every plan wave:** Run `npx vitest run` (full suite — confirm the extended `ELEMENT_NAMES` table did not break existing `layerInfo`/`formulaReading`/`elementColor` importers)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | SUBEX-08 | T-17-01 | N/A (static lookup data) | unit | `npx vitest run src/lib/__tests__/layerInfo.test.ts` | ✅ exists | ⬜ pending |
| 17-01-02 | 01 | 1 | SUBEX-08 | T-17-01 | N/A (static lookup data) | unit | `npx vitest run src/lib/__tests__/layerInfo.test.ts` | ✅ exists | ⬜ pending |
| 17-02-01 | 02 | 2 | SUBEX-03/04/05/06/10 | T-17-05 | anti-fabrication: every fixture `/^InChI=1S\//` (RED step) | unit | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts` (expect RED) | created in-task | ⬜ pending |
| 17-02-02 | 02 | 2 | SUBEX-03/04/05/06 | T-17-04 | chemical-correctness pins: parity≠R/S, no functional-group, mobileH shared/no-count, null fall-through (GREEN step) | unit | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/lib/__tests__/layerInfo.test.ts` | created in-task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. File Exists: layerInfo.test.ts pre-exists; subTokenInfo.test.ts is a phase deliverable (created in 17-02-01), not Wave 0 setup.*

*The planner maps each task to a vitest assertion. Mandatory pins for this phase (from RESEARCH § Validation Architecture):*
- *`ELEMENT_NAMES` entry count `=== 120`; case-exact lookup (`Co`→cobalt, never `C`+`O`); `K`→potassium; `D` and `T` present.*
- *hAtoms card body never contains a functional-group name (assert no `/methyl/i` for the alanine `1H3` token).*
- *mobileH card body contains no count and no `/bond between|each/i`; says shared/mobile/tautomeric.*
- *stereo card body matches `/parity/i` AND `/not.*R\/S/i` (the load-bearing chemical-accuracy pin).*
- *c-layer kinds (`atom`/`bond`/`branch`) → `subTokenInfo()` returns `null`.*
- *fragment-2+ element/atom copy derived from offset `SubHover` fields, never `layer.text`.*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — vitest + `vitest.config.ts` are already installed and green (11 existing `src/lib/__tests__/*.test.ts` files). The new `subTokenInfo.test.ts` and the extended `layerInfo.test.ts` assertions ARE phase deliverables, not Wave 0 setup.

**Fixture prerequisite (manual, before the multi-fragment test is written):** generate the real `getInchi()` string for the salt fixture (methylamine hydrochloride, per CONTEXT D-18 / RESEARCH A1) from the running app — InChI generation is WASM-only and not statically derivable. Alanine is already in-repo and verified real (`HelpTour.test.tsx:11`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Salt fixture InChI is genuinely real | SUBEX-10 | InChI gen is WASM-only; cannot be derived statically | Run `npm run dev`, draw methylamine hydrochloride, copy the verbatim InChI into the test fixture |

*The human chemical-accuracy sign-off on rendered card strings is **Phase 18's** gate, not Phase 17's. Phase 17 is fully automated via assertion pins above.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (4/4 tasks mapped above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has an `<automated>` command)
- [x] Wave 0 covers all MISSING references (no Wave 0 work — existing vitest infra)
- [x] No watch-mode flags (use `vitest run`, never bare `vitest`)
- [x] Feedback latency < 10s (~5s pure-logic suite)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-26
