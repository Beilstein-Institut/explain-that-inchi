---
phase: 13-content-explanation
plan: "01"
subsystem: content
tags: [inchikey, prose, explanation, tdd]
dependency_graph:
  requires: [12-01, 12-02]
  provides: [inchiKeyInfo.ts, SC-1 test]
  affects: [src/components/Explanation.tsx]
tech_stack:
  added: []
  patterns: [static-data-module, companion-unit-test]
key_files:
  created:
    - src/lib/inchiKeyInfo.ts
    - src/lib/__tests__/inchiKeyInfo.test.ts
  modified:
    - src/components/Explanation.tsx
decisions:
  - "KEY_ZONE_COPY extracted to inchiKeyInfo.ts (parallel to layerInfo.ts) for testability"
  - "SHARED_TAGLINE appended verbatim to every zone body for SC-1 substring pinning"
  - "Explanation.tsx imports KEY_ZONE_COPY via named import — no inline prose remains"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 13 Plan 01: InChIKey Explanation Prose + SC-1 Test Summary

**One-liner:** InChIKey hover-card prose extracted to `inchiKeyInfo.ts` with one-way-hash tagline on all 4 zones and SC-1 offset/label test pinning parseInchiKey.ts constants.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract inchiKeyInfo.ts and author prose | 86fb918 | src/lib/inchiKeyInfo.ts (created), src/components/Explanation.tsx (modified) |
| 2 | SC-1 offset/label unit test | 13018bc | src/lib/__tests__/inchiKeyInfo.test.ts (created) |

## What Was Built

**`src/lib/inchiKeyInfo.ts`** — new data module exporting:
- `SHARED_TAGLINE` — the one-way-hash gist constant (D-02 / INKEY-09): states the InChIKey cannot be decoded back to the structure or mapped to atoms, explaining why segments do not highlight.
- `KEY_ZONE_COPY` — `Record<KeyHoverZone, { label, title, body }>` for all 4 zones:
  - `skeleton` — cites 14-char connectivity hash, 27-char key purpose (INKEY-07/08), same-connectivity→same-first-block lookup basis (INKEY-11), one-key-per-assembly (D-04)
  - `hash` — cites 8-char remaining-layers hash (stereo/isotope/proton, INKEY-07), collision caveat (INKEY-10)
  - `flagVersion` — names S=standard, N=non-standard (INKEY-12), A=version 1 (INKEY-12)
  - `protonation` — single-char protonation state (N=neutral preset)

**`src/components/Explanation.tsx`** — removed inline `KEY_ZONE_COPY` declaration (placeholder text); added named import `{ KEY_ZONE_COPY }` from `'../lib/inchiKeyInfo'`. No render changes, no new UI surface, no store fields.

**`src/lib/__tests__/inchiKeyInfo.test.ts`** — 23 `it()` assertions across 5 describe blocks:
- All zones present with non-empty label/title/body
- SC-1: 5 segment offsets pinned against parseInchiKey (skeleton 0-14, hash 15-23, flag 23-24, version 24-25, protonation 26-27)
- SC-1: zone labels contain expected keywords (case-insensitive)
- SC-1: body char-count references ('14', '27' on skeleton; '8' on hash)
- SHARED_TAGLINE prefix present on all 4 zone bodies (INKEY-09 / D-02)
- D-07: no zone body contains 'reverse' or 'unique identifier'

## Test Results

Full suite: 301 tests across 17 test files — all pass.
New test file: 23/23 assertions pass.
Pre-existing layerInfo.test.ts: 35/35 pass (no regressions).

## Requirements Coverage

| Requirement | Zone | How Covered |
|-------------|------|-------------|
| INKEY-07 | skeleton, hash, flagVersion, protonation | Block structure described in every card |
| INKEY-08 | skeleton | 27-char purpose statement in body |
| INKEY-09 | all | SHARED_TAGLINE on every card body |
| INKEY-10 | hash | Collision caveat in hash body |
| INKEY-11 | skeleton | Same-connectivity→same-first-block lookup basis |
| INKEY-12 | flagVersion | S/N flag and A version character named |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all 4 zone bodies contain accurate, complete prose per D-05 terseness constraints.

## Threat Flags

None — this phase edits static string constants only. No new network endpoints, auth paths, file access patterns, or schema changes. React text children (not dangerouslySetInnerHTML) are used for all key-card prose rendering, as established in Phase 12.

## Self-Check: PASSED

- [x] src/lib/inchiKeyInfo.ts exists
- [x] src/lib/__tests__/inchiKeyInfo.test.ts exists
- [x] src/components/Explanation.tsx modified (imports from inchiKeyInfo)
- [x] Commit 86fb918 exists (Task 1)
- [x] Commit 13018bc exists (Task 2)
- [x] Full test suite green: 301 tests passed
