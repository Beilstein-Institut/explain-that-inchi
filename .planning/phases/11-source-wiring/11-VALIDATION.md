---
phase: 11
slug: source-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` (separate from `vite.config.ts`) |
| **Quick run command** | `npx vitest run src/lib/__tests__/parseInchiKey.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5s (parser only) / ~30s (full suite, 256+ tests) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/parseInchiKey.test.ts` (parser tests, < 5s)
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd:verify-work`:** Full suite green + manual smoke (benzene InChIKey appears in store; canvas clear resets key)
- **Max feedback latency:** 5 seconds (per-task) / 30 seconds (per-wave)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-xx | 01 | 1 | INKEY-02 | — | N/A | unit | `npx vitest run src/lib/__tests__/parseInchiKey.test.ts` | ❌ W0 | ⬜ pending |
| 11-02-xx | 02 | 1 | INKEY-02 (store verbatim) | — | N/A | unit | `npx vitest run src/__tests__/store.test.ts` | ✅ | ⬜ pending |
| 11-03-xx | 03 | 2 | INKEY-01, INKEY-06 | — | N/A | manual smoke | — (live WASM) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/parseInchiKey.test.ts` — stubs for INKEY-02, INKEY-06 (parser path)
- [ ] Pin live benzene `getInChIKey()` output once to confirm bare 27-char string (not `InChIKey=` prefixed) and offset positions (flag@23, version@24, protonation@26)

*Existing Vitest infrastructure (`vitest.config.ts`, `src/__tests__/store.test.ts`) covers the store-reducer path — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| InChIKey appears in store after molecule drawn | INKEY-01 | Requires live Ketcher WASM + `'change'` event + debounce | Draw benzene; assert `store.inchiKey` is a 27-char key |
| `generationRef` stale-guard discards slow results under rapid edits | INKEY-01 | Browser-runtime debounce timing; not reproducible in Vitest node env | Rapidly edit; confirm key never lags/overwrites with stale value |
| Concurrent fetch (`allSettled`) — key-only failure never blanks valid InChI | INKEY-01 | Requires live dual WASM calls | Observe InChI renders even if key call fails |
| Empty/disconnected canvas → `inchiKey: ''` in same atomic write + catch path | INKEY-06 | `getInChIKey()` on empty canvas needs live WASM | Clear canvas; assert key resets to `''`, no lingering stale key, no error |
| Preset load → InChIKey updates in one tick | INKEY-01 | Live editor `'change'` event + debounce | Load a preset; confirm key updates in sync with InChI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (manual-smoke items justified above)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`parseInchiKey.test.ts`)
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 5s (per-task) / 30s (per-wave)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
