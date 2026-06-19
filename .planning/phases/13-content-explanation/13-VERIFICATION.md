---
phase: 13-content-explanation
verified: 2026-06-19T09:23:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 13: Content & Explanation — Verification Report

**Phase Goal:** A chemist hovering any InChIKey segment understands what that segment encodes, why the key exists, and the critical mental-model corrections — it is a one-way hash, not reversible, not atom-mapped, and not collision-proof.
**Verified:** 2026-06-19T09:23:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Each segment card describes its block structure correctly (14-char skeleton/connectivity hash, 8-char remaining-layers hash, standard/non-standard flag + version char, protonation char) with offsets pinned by a slice-boundary + label unit test | VERIFIED | `inchiKeyInfo.ts`: skeleton body cites "14-character", hash body cites "8-character", flagVersion body names S/N/A, protonation body names the single char. Test file pins all 5 segment offsets against `parseInchiKey.ts` in 23 passing assertions. |
| SC-2 | Content explains the InChIKey's purpose: a fixed 27-char, web/database-search-friendly hashed form of the InChI | VERIFIED | `inchiKeyInfo.ts` skeleton body: "the InChIKey as a whole is the fixed 27-character, web- and database-search-friendly hashed form of the full InChI" |
| SC-3 | Content states the InChIKey is a one-way hash — not reversible and not atom-mappable — and explicitly notes segments do NOT highlight atoms; includes collision caveat (improbable but theoretically possible; for lookup/indexing, not proof of identity) | VERIFIED | `SHARED_TAGLINE`: "cannot be decoded back to the structure or mapped to atoms, which is why these segments do not highlight" — appended verbatim to all 4 zone bodies. Hash body: "Collisions are improbable but theoretically possible, so the key is suited for lookup and indexing, not as proof of identity." |
| SC-4 | Skeleton-hash card notes molecules sharing same connectivity share the first block (basis for lookup); flag/version card distinguishes S vs N and version character A | VERIFIED | Skeleton body: "Molecules that share the same connectivity share this first block, making it the basis for InChIKey database and web lookup". FlagVersion body: "S indicates a standard InChI; N indicates a non-standard InChI. The following character A identifies InChIKey version 1." |
| SC-5 | Content notes a multi-component/salt structure yields one key for the entire assembly (no per-fragment keys); no prose implies reversibility, atom-mapping, or guaranteed uniqueness | VERIFIED | Skeleton body: "a multi-component or salt structure yields one key for the whole drawn assembly, not separate keys per fragment". Test `D-07 — no reversibility/identity claims` confirms no zone body contains "reverse" or "unique identifier". All 23 test assertions pass. |

**Score: 5/5 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/inchiKeyInfo.ts` | Exports `KEY_ZONE_COPY` and `SHARED_TAGLINE` for all 4 zones | VERIFIED | File exists, 65 lines, exports both constants. `KEY_ZONE_COPY` typed as `Record<KeyHoverZone, { label, title, body }>`. No placeholder or stub body text. |
| `src/lib/__tests__/inchiKeyInfo.test.ts` | SC-1 offset/label pinning test, >= 12 assertions | VERIFIED | File exists, 23 `it()` assertions across 5 describe blocks. All 23 pass. |
| `src/components/Explanation.tsx` | Imports `KEY_ZONE_COPY` from `../lib/inchiKeyInfo` — no inline prose data | VERIFIED | Line 14: `import { KEY_ZONE_COPY } from '../lib/inchiKeyInfo';`. No inline `KEY_ZONE_COPY` declaration remains in the file. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/Explanation.tsx` | `src/lib/inchiKeyInfo.ts` | named import `KEY_ZONE_COPY` | WIRED | Line 14 imports it; lines 68, 70, 71 consume `KEY_ZONE_COPY[keyHoverKind].label/title/body` in the key-segment card branch. |
| `src/lib/__tests__/inchiKeyInfo.test.ts` | `src/lib/parseInchiKey.ts` | imported `parseInchiKey` for offset cross-check | WIRED | Line 3 imports `parseInchiKey`; tests call it with `REF_KEY` and assert all 5 segment offsets. |

---

### Data-Flow Trace (Level 4)

This phase is content-only (static string constants). `KEY_ZONE_COPY` is a static data object, not a dynamic data consumer. Level 4 trace is not applicable — the data source is the compiled constant itself, which is fully substantive as verified in Level 2.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| inchiKeyInfo.test.ts — 23 assertions | `npm test -- --run src/lib/__tests__/inchiKeyInfo.test.ts` | 23/23 passed, exit 0 | PASS |
| Full suite (no regressions) | `npm test -- --run` | 301/301 passed across 17 files, exit 0 | PASS |

---

### Probe Execution

No probes declared in PLAN; this is a content-only phase. Step 7c: SKIPPED (no probe scripts for this phase type).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INKEY-07 | 13-01-PLAN.md | Block structure — 14-char skeleton hash, 8-char remaining-layers hash, flag+version, protonation char | SATISFIED | All 4 zone bodies describe their block structure; 14-char in skeleton body, 8-char in hash body, S/N/A in flagVersion body, single-char in protonation body. |
| INKEY-08 | 13-01-PLAN.md | Purpose — fixed 27-char web/database-search-friendly hashed form of InChI | SATISFIED | Skeleton body: "the fixed 27-character, web- and database-search-friendly hashed form of the full InChI". Test asserts `skeleton.body.includes('27')`. |
| INKEY-09 | 13-01-PLAN.md | One-way hash — not reversible, not atom-mappable; segments do NOT highlight | SATISFIED | `SHARED_TAGLINE` appended to all 4 bodies. Content: "cannot be decoded back to the structure or mapped to atoms, which is why these segments do not highlight." Test pins tagline prefix on all 4 zones. |
| INKEY-10 | 13-01-PLAN.md | Collision caveat — improbable but possible; for lookup/indexing, not proof of identity | SATISFIED | Hash body: "Collisions are improbable but theoretically possible, so the key is suited for lookup and indexing, not as proof of identity." |
| INKEY-11 | 13-01-PLAN.md | Skeleton-hash explanation — molecules sharing same connectivity share first block | SATISFIED | Skeleton body: "Molecules that share the same connectivity share this first block, making it the basis for InChIKey database and web lookup." |
| INKEY-12 | 13-01-PLAN.md | Flag/version card distinguishes S vs N and version character A | SATISFIED | FlagVersion body: "S indicates a standard InChI; N indicates a non-standard InChI. The following character A identifies InChIKey version 1." |

All 6 requirement IDs (INKEY-07 through INKEY-12) are satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

Scanned `src/lib/inchiKeyInfo.ts`, `src/lib/__tests__/inchiKeyInfo.test.ts`, and `src/components/Explanation.tsx` for debt markers and stub patterns.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

No TBD, FIXME, XXX, TODO, placeholder text, empty implementations, or misleading prose found in any modified file.

---

### Human Verification Required

None identified. This phase is content-only (static string constants). All verifiable properties are deterministic and have been checked programmatically via the 23-assertion test suite.

The only area that could benefit from human review is the prose quality and pedagogical voice — whether the wording reads naturally for a working chemist — but this is aesthetic rather than functional and does not block goal achievement. The success criteria are structural (specific facts must be stated, specific terms forbidden), and all are verified above.

---

### Gaps Summary

No gaps. All 5 success criteria verified, all 6 requirement IDs satisfied, all artifacts exist and are substantive and wired, tests pass 301/301.

---

_Verified: 2026-06-19T09:23:00Z_
_Verifier: Claude (gsd-verifier)_
