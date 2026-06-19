---
phase: 13-content-explanation
reviewed: 2026-06-19T09:25:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/lib/inchiKeyInfo.ts
  - src/lib/__tests__/inchiKeyInfo.test.ts
  - src/components/Explanation.tsx
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-06-19T09:25:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Phase 13 is a content-only change: a new static prose module (`inchiKeyInfo.ts`), its companion offset-pinning test (`inchiKeyInfo.test.ts`), and a one-line import swap in `Explanation.tsx`. The work is low-risk by design — no new inputs cross a trust boundary, the render branch uses React text children (not `dangerouslySetInnerHTML`), and `KEY_ZONE_COPY` is typed as an exhaustive `Record<KeyHoverZone, …>`.

Verified independently:
- `tsc --noEmit` is clean; the `Record` covers all 4 zones from `src/store.ts:17`.
- The test's `REF_KEY` (`'AAAAAAAAAAAAAA-BBBBBBBBSA-N'`) is length 27, matches the parser regex `^[A-Z]{14}-[A-Z]{10}-[A-Z]$`, and places `S`/`A`/`N` at positions 23/24/26 — self-documenting and correct.
- All cited offsets (skeleton 0–14, hash 15–23, flag 23–24, version 24–25, protonation 26–27) match `parseInchiKey.ts:60-66` exactly.
- All 23 assertions pass; full suite reported green (301 tests).
- Chemistry claims are accurate: `S`=standard / `N`=non-standard flag, `A`=version 1, 14/8/27 char structure, `N`=neutral protonation are all correct per the InChI Trust spec.
- The no-reversibility / no-atom-mapping / no-guaranteed-uniqueness invariant (D-07) holds: `SHARED_TAGLINE` states the one-way-hash lesson plainly, the collision caveat ("improbable but theoretically possible … not as proof of identity") is present, and no body reconstructs the key from segments (D-08).

No Critical defects. One Warning concerns a brittle test assertion that could silently pass against incorrect prose; the Info items are test-robustness and consistency nits.

## Warnings

### WR-01: `hash body includes "8"` assertion is too loose — passes on any digit-bearing prose

**File:** `src/lib/__tests__/inchiKeyInfo.test.ts:111-113`
**Issue:** The test pins the 8-character hash claim with `expect(KEY_ZONE_COPY.hash.body).toContain('8')`. A bare `'8'` substring check is satisfied by many unrelated strings — e.g. if the prose were rewritten to "the 18-character block" or "covers 8% of cases" or any sentence containing "version 1.8", the assertion still passes while the chemistry is wrong. This is the one assertion most likely to give a false green if the prose drifts, which is precisely the failure mode SC-1 exists to catch. The skeleton checks (`'14'`, `'27'`) are similarly loose but those numbers are distinctive enough to be lower risk; `'8'` is a single ubiquitous digit.

**Fix:** Tighten to the specific phrase so the assertion fails if the block size claim changes:
```ts
it('hash body cites the 8-character block (INKEY-07)', () => {
  expect(KEY_ZONE_COPY.hash.body).toMatch(/8-character/);
});
```
Apply the same `\d+-character` anchoring to the skeleton `'14'` and `'27'` checks (lines 103-109) for consistency, e.g. `/14-character/` and `/27-character/`.

## Info

### IN-01: Tagline pin uses a 20-char prefix that does not reach any load-bearing word

**File:** `src/lib/__tests__/inchiKeyInfo.test.ts:117-118`
**Issue:** `SHARED_TAGLINE.slice(0, 20)` yields `"The InChIKey is a on"` — it stops mid-word at "on[e-way hash]". The pin verifies the tagline *starts* the same way but covers none of the semantically load-bearing content ("one-way hash", "cannot be decoded", "do not highlight"). If `SHARED_TAGLINE` were edited to keep the opening clause but drop the no-decode/no-highlight gist (the actual D-02/INKEY-09 requirement), every tagline test still passes. The check pins identity-of-constant, not correctness-of-meaning.

**Fix:** Assert against a substring that carries the gist, or assert the full constant:
```ts
it('skeleton body includes the shared tagline gist', () => {
  expect(KEY_ZONE_COPY.skeleton.body).toContain('do not highlight');
});
```
Or simply `.toContain(SHARED_TAGLINE)` (full constant) since every body appends it verbatim.

### IN-02: D-07 negative checks omit "decode"/"decoded" and are case-sensitive

**File:** `src/lib/__tests__/inchiKeyInfo.test.ts:140-150`
**Issue:** The D-07 guard rejects `'reverse'` (case-sensitive `.toContain`) and `/unique identifier/i`. Two gaps: (1) `.toContain('reverse')` would miss a capitalized `'Reverse'` at a sentence start; (2) the plan's intent (PLAN line 139) also forbids phrasings implying reversibility such as "decode" used in a reversible sense — yet `SHARED_TAGLINE` itself contains "cannot be decoded back", so a naive `decode` ban can't be added without exempting the negation. The current tests therefore cannot detect a future edit that drops the "cannot" and asserts the key *can* be decoded.

**Fix:** Make the reverse check case-insensitive (`.not.toMatch(/reverse/i)`), and add a positive assertion that the no-decode framing is preserved, e.g. `expect(SHARED_TAGLINE).toMatch(/cannot be decoded|can.?t be decoded/i)`. This pins the negation rather than banning the verb.

### IN-03: Stale/misleading guardrail comments carried into Explanation.tsx header

**File:** `src/components/Explanation.tsx:1-8`
**Issue:** The file header still documents `D-09: innerHTML for reading-code block` and the idle/precedence behavior, which is fine, but the inline comments at lines 34-35 (`CR-01 (defensive)`) and 99-101 (`WR-02`) reference finding IDs from a *prior* phase's review. Carrying another phase's review-finding IDs as permanent code comments is confusing for future readers (they suggest unresolved items live here) and is not load-bearing documentation. This phase only changed line 14 (the import) and removed the inline `KEY_ZONE_COPY`; the comments are pre-existing, but the import swap is a natural moment to note they reference resolved historical findings.

**Fix:** Non-blocking. Consider trimming review-finding-ID comments to plain rationale (e.g. "Defensive: an empty key can never show a key-segment card") so they read as design intent rather than open tickets. No behavioral change.

### IN-04: Test does not assert `KEY_ZONE_COPY` zone keys equal the `KeyHoverZone` union

**File:** `src/lib/__tests__/inchiKeyInfo.test.ts:10-17`
**Issue:** The "all zones present" block asserts the four expected keys exist via a hardcoded `ZONE_KEYS` array, but never asserts there are *exactly* four, nor that they match the `KeyHoverZone` union from the store. If a fifth zone were added to `KeyHoverZone` (and to the `Record`, forced by `tsc`), the prose test would still pass without authoring/pinning copy for the new zone — the offset/label drift guard SC-1 is meant to prevent would have a blind spot for zone-count drift. (Low severity: `tsc`'s exhaustive `Record` check forces the data to stay in sync; only the *test coverage* of new zones lags.)

**Fix:** Add `expect(Object.keys(KEY_ZONE_COPY)).toHaveLength(4);` so a zone-count change forces a test update. Optionally derive `ZONE_KEYS` from `Object.keys(KEY_ZONE_COPY)` and assert the set against the four expected names.

---

_Reviewed: 2026-06-19T09:25:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
