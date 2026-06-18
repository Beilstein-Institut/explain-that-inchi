---
phase: 11-source-wiring
verified: 2026-06-18T14:32:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
gap_resolution: "SC-2 contract test added in commit 9de02a5 (test(11-store): add inchiKey verbatim-passthrough contract test). store.test.ts now resets inchiKey in beforeEach, asserts initial inchiKey === '', and asserts setInchiData persists 'UHOVQNZJYSORNB-UHFFFAOYSA-N' verbatim. 276/276 tests pass, tsc clean."
gaps:
  - truth: "The stored InChIKey is the verbatim library output string — a test asserts the stored value equals the raw getInChIKey() output, with no reconstruction or re-joining"
    status: resolved
    reason: "No test anywhere in the suite asserts that the inchiKey field in the store holds the verbatim getInChIKey() output. The store.test.ts neither resets inchiKey in beforeEach nor checks it in the initial-state test. parseInchiKey.test.ts verifies the pure parser, not the store round-trip. Success Criterion 2 from ROADMAP.md is explicit that a test must make this assertion."
    artifacts:
      - path: "src/__tests__/store.test.ts"
        issue: "beforeEach does not reset inchiKey; initial-state test does not assert inchiKey === ''; no test verifies setInchiData persists inchiKey verbatim"
    missing:
      - "Add inchiKey: '' to the beforeEach reset object in store.test.ts"
      - "Add expect(state.inchiKey).toBe('') to the initial-state test"
      - "Add a test calling setInchiData with a known inchiKey value and asserting state.inchiKey equals that exact value (verbatim passthrough contract, SC-2)"
---

# Phase 11: Source & Wiring Verification Report

**Phase Goal:** The molecule's InChIKey is computed live from the same in-browser WASM source as the InChI, stored verbatim, and stays in sync with the molecule across rapid edits, preset loads, and empty/invalid states.
**Verified:** 2026-06-18T14:32:00Z
**Status:** passed (gap resolved post-verification)
**Re-verification:** Gap closed in commit 9de02a5 — SC-2 verbatim-passthrough contract test added to store.test.ts; 276/276 tests pass, tsc clean.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | When a user draws or loads a molecule, an InChIKey value appears in the store, computed via `ketcher.getInChIKey()` from the same WASM source as the InChI, updating in sync | ✓ VERIFIED | App.tsx L146-148: `Promise.allSettled([ketcher.getInchi(true), ketcher.getInChIKey()])` in handleChange; L198: success path writes inchiKey to store; generationRef guard applies to both results atomically |
| 2 | The stored InChIKey is the verbatim library output string — a test asserts the stored value equals the raw `getInChIKey()` output, with no reconstruction or re-joining | ✗ FAILED | store.test.ts has no inchiKey coverage. beforeEach does not reset inchiKey. No test asserts the stored value equals raw getInChIKey() output. parseInchiKey.test.ts tests the pure parser only, not the store round-trip. |
| 3 | Under rapid edits the InChIKey never lags or overwrites with a stale value — rides the existing `generationRef` guard and fetches concurrently via `Promise.allSettled` in the same debounced tick | ✓ VERIFIED | App.tsx L144: `thisGen = ++generationRef.current` before allSettled; L151: `if (thisGen !== generationRef.current) return` after allSettled resolves, before any setInchiData call; single 150ms debounce unchanged |
| 4 | Clearing the canvas (or empty/invalid/disconnected) resets the InChIKey to empty in the same atomic write and in the catch path — no lingering key, no error | ✓ VERIFIED | App.tsx L154: `setInchiData('', [], {}, {}, [], '')` on rejected inchiResult; L161: `setInchiData('', [], {}, {}, [], '')` on empty-canvas guard (layers < 2); L204: `setInchiData('', [], {}, {}, [], '')` in catch — all 4 call sites have explicit 6th arg |
| 5 | A pure `parseInchiKey.ts` returns segment offset ranges only (`{kind, start, end}`) and tolerates malformed/short keys without throwing — unit-tested, never returns reassembled text | ✓ VERIFIED | parseInchiKey.ts: no `.slice()` call in function body; interface has only `{kind, start, end}`; Group 6 test asserts `Object.keys(seg).sort() === ['end','kind','start']`; Group 5 tests malformed inputs; 19/19 tests green |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/parseInchiKey.ts` | Pure offset-range parser, exports InchiKeySegmentKind, InchiKeySegment, parseInchiKey | ✓ VERIFIED | 62 lines; no slice() in function body; correct offsets for all 5 segments; guard on length !== 27 or missing hyphens; never throws |
| `src/lib/__tests__/parseInchiKey.test.ts` | 6-group test suite, BENZENE_KEY fixture | ✓ VERIFIED | 19 tests across 6 describe blocks; all 19 pass; BENZENE_KEY = 'UHOVQNZJYSORNB-UHFFFAOYSA-N' at top; Group 6 Object.keys invariant present |
| `src/store.ts` | InchiState.inchiKey: string; setInchiData trailing inchiKey?: string; single atomic set() | ✓ VERIFIED | L16: `inchiKey: string`; L20: `, inchiKey?: string` in signature; L38: `inchiKey: ''` initial state; L41: single set() call includes inchiKey; grep -c "setInchiKey" returns 0 |
| `src/App.tsx` | handleChange uses Promise.allSettled; all setInchiData calls have 6th arg; no second subscribe | ✓ VERIFIED | L146-149: `Promise.allSettled([ketcher.getInchi(true), ketcher.getInChIKey()])`; 4 setInchiData call sites each with explicit 6th arg; 1 editor.subscribe call only |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/__tests__/parseInchiKey.test.ts` | `src/lib/parseInchiKey.ts` | `import { parseInchiKey, InchiKeySegment }` | ✓ WIRED | L2 of test file imports both exports; all 19 tests exercise the real function |
| `src/App.tsx handleChange` | `ketcher.getInChIKey` | `Promise.allSettled` | ✓ WIRED | L148: `ketcher.getInChIKey()` inside allSettled array; L197: `keyResult.status === 'fulfilled' ? keyResult.value : ''` |
| `src/App.tsx handleChange` | `useInchiStore.getState().setInchiData` | 6th arg inchiKey | ✓ WIRED | All 4 call sites pass explicit 6th arg (`''` or `inchiKey` variable); L198 success path: `..., hAtomPoolIds, inchiKey` |
| `src/store.ts setInchiData` | `InchiState.inchiKey` | `set({ ..., inchiKey })` | ✓ WIRED | L41: single set() includes inchiKey in the spread |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `src/store.ts InchiState.inchiKey` | `inchiKey` | `ketcher.getInChIKey()` via `App.tsx` `Promise.allSettled` | Yes — WASM call, not hardcoded; fallback `''` on rejection | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points without browser/WASM. The InChIKey pipeline requires `ketcher.getInChIKey()` which is a WASM call requiring a live Ketcher instance. Covered instead by the unit tests and TypeScript compilation checks.

### Probe Execution

No probes defined or conventional probe files found for this phase (confirmed by VALIDATION.md reference to `npx vitest run` and `npx tsc --noEmit` as the verification commands, not shell probes).

### Build and Test Results

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| TypeScript compilation | `npx tsc --noEmit` | 0 errors | ✓ PASS |
| parseInchiKey unit tests | `npx vitest run src/lib/__tests__/parseInchiKey.test.ts` | 19/19 passed | ✓ PASS |
| Full test suite | `npx vitest run` | 275/275 passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| INKEY-01 | 11-02, 11-03 | Live InChIKey appears in store, computed from WASM via `ketcher.getInChIKey()`, updating in sync | ✓ SATISFIED | `Promise.allSettled` in handleChange; inchiKey field in store; success path wired |
| INKEY-02 | 11-01, 11-02, 11-03 | Displayed/copied InChIKey is verbatim library output — never reconstructed | PARTIAL | Implementation correctly stores verbatim (no transformation in store or App.tsx); parser returns offsets only; but SC-2 requires a test asserting the verbatim contract at the store level — that test is absent |
| INKEY-06 | 11-03 | Empty/invalid structure shows placeholder — no key, no error | ✓ SATISFIED | All 4 setInchiData call sites write `''` as 6th arg on empty/error paths; no exception thrown on empty canvas |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/__tests__/store.test.ts` | 11-17 | `beforeEach` does not include `inchiKey` in setState reset; `initial state` test does not assert `inchiKey === ''` | ⚠️ Warning | Store test state isolation is incomplete for the new inchiKey field; tests could pass with stale inchiKey from a previous test if ordering changes |

### Human Verification Required

None — the automated checks are sufficient for this phase. Phase 11 is pure backend wiring (WASM call, store field, debounce pipeline) with no new UI components requiring human testing.

### Gaps Summary

One gap blocks full acceptance: **Success Criterion 2 is partially satisfied at the implementation level but not at the test level**.

The ROADMAP explicitly states SC-2 as: "a test asserts the stored value equals the raw `getInChIKey()` output". The implementation correctly stores the verbatim WASM output (no transformation occurs in either App.tsx or store.ts), but no test makes this assertion. The store.test.ts file:

1. Does not include `inchiKey` in its `beforeEach` reset object (state isolation gap)
2. Does not check `inchiKey` in the "has correct initial state" test
3. Has no test calling `setInchiData` with a known `inchiKey` value and asserting `state.inchiKey` equals that value

The three missing items are straightforward additions to the existing store.test.ts file. No new files are needed.

---

_Verified: 2026-06-18T14:32:00Z_
_Verifier: Claude (gsd-verifier)_
