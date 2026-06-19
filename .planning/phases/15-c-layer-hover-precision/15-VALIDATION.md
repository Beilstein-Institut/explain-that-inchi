---
phase: 15
slug: c-layer-hover-precision
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-19
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/__tests__/clyr.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1 second (current full suite: 304 tests, ~0.8s) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/clyr.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-W0 | — | 0 | CLYR-01..05 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts` | ❌ W0 | ⬜ pending |
| CLYR-01 | TBD | TBD | CLYR-01 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "atom hover"` | ❌ W0 | ⬜ pending |
| CLYR-01-reg | TBD | TBD | CLYR-01 | — | N/A | regression | `npx vitest run src/lib/__tests__/highlightUtils.test.ts` | ✅ | ⬜ pending |
| CLYR-02 | TBD | TBD | CLYR-02 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "hyphen hover"` | ❌ W0 | ⬜ pending |
| CLYR-02-ring | TBD | TBD | CLYR-02 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "ring closure"` | ❌ W0 | ⬜ pending |
| CLYR-03-open | TBD | TBD | CLYR-03 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "branch open"` | ❌ W0 | ⬜ pending |
| CLYR-03-close | TBD | TBD | CLYR-03 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "branch close"` | ❌ W0 | ⬜ pending |
| CLYR-03-single | TBD | TBD | CLYR-03 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "single atom branch"` | ❌ W0 | ⬜ pending |
| CLYR-04-hyphen | TBD | TBD | CLYR-04 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "multi fragment hyphen"` | ❌ W0 | ⬜ pending |
| CLYR-04-branch | TBD | TBD | CLYR-04 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "multi fragment branch"` | ❌ W0 | ⬜ pending |
| CLYR-05-hyphen | TBD | TBD | CLYR-05 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "N-star hyphen"` | ❌ W0 | ⬜ pending |
| CLYR-05-branch | TBD | TBD | CLYR-05 | — | N/A | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "N-star branch"` | ❌ W0 | ⬜ pending |
| CLYR-render | TBD | TBD | CLYR-01..05 | — | N/A | component | `npx vitest run src/__tests__/LayerText.clyr.test.tsx` | ❌ W0 | ⬜ pending |
| CLYR-regress | TBD | TBD | CLYR-01..05 | — | N/A | regression | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Plan/Wave columns are filled by the planner; this strategy predates plan decomposition.*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/clyr.test.ts` — unit coverage for CLYR-01..05: `tokenizeCLayerSeg`, `buildSubHoverSpecs` atom/bond/branch cases, multi-fragment offsets, N* duplicate pairs
- [ ] `src/__tests__/LayerText.clyr.test.tsx` — component-level: `ConnectionText` renders hoverable `-`/`(`/`)` spans; `setSubHover` called with correct `kind`, `endpointPairs`, `bondPairs`

### Test Fixtures (from RESEARCH §Validation Architecture)

- **Fixture A — Linear + branch** `"1-2-3(-4-5)-6"`, auxMap `{1:0..6:5}`: atom 3 → `atoms=[2],bonds=[]`; hyphen 4-5 → bond only; `(`/`)` → branch bond set (symmetric).
- **Fixture B — Benzene ring closure** `"1-2-4-6-5-3-1"`: last hyphen → ring-closure bond id.
- **Fixture C — Multi-fragment branch** `"1-2-3(-4)-5;1-2-3"`, fragCounts `[5,3]`: frag-2 hyphens resolve at offset 5.
- **Fixture D — N* duplicated branch** `"2*1-2(-3)-4"`, fragCounts `[4,4]`: hyphen `endpointPairs=[[1,2],[5,6]]`; branch `bondPairs=[[2,3],[6,7]]`.
- **Fixture E — tokenizeCLayerSeg pure-function** including nested `"1-2-3(-4(-5)-6)-7"`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas halos visually appear on the intended atom/bond(s) in the live Ketcher editor | CLYR-01..05 | Ketcher WASM render + halo overlay cannot be asserted in jsdom; spec correctness is unit-tested but pixel rendering is not | `npm run dev`; draw a branched molecule (e.g. isobutane / caffeine); hover c-layer atom numbers, hyphens, and parens; confirm exactly the denoted atom/bond(s) highlight |

*Spec computation is fully automated; only the final WASM canvas highlight is manual.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`clyr.test.ts`, `LayerText.clyr.test.tsx`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
