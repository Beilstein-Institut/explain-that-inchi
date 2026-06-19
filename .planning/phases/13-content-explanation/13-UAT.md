---
status: complete
phase: 13-content-explanation
source: [13-01-SUMMARY.md]
started: 2026-06-19
updated: 2026-06-19
---

## Current Test

[testing complete]

## Tests

### 1. Skeleton hash card
expected: Hover the first 14-char block → "Skeleton hash" card: 14-char connectivity hash, 27-char web/DB-search-friendly purpose, same-connectivity = shared first block (lookup basis), salt yields one key for whole assembly.
result: pass

### 2. Remaining-layers hash card
expected: Hover the 8-char middle block (after the first dash) → "Remaining-layers hash" card: 8-char hash of stereo/isotope/proton layers; collisions improbable but theoretically possible, suited for lookup/indexing, not proof of identity.
result: issue
reported: "there is redundant text in the left card: for example it says 'skeleton hash' and 'skeleton hash'. this is true for most all hovers. redundant information. the same is also for the when hovering over the inchi layers."
severity: cosmetic
note: Cross-cutting — the card renders both `label` and `title`, which are near-identical for the InChIKey skeleton/hash zones (and for InChI-layer cards from earlier phases). The remaining-layers explanation content itself was not reported as wrong.

### 3. Standard flag & version card
expected: Hover the flag/version character(s) → "Standard flag & version" card: S = standard InChI, N = non-standard; the following character A identifies InChIKey version 1.
result: pass

### 4. Protonation flag card
expected: Hover the final protonation character → "Protonation flag" card: single character encodes protonation state of the drawn assembly (N = neutral, the standard preset).
result: pass

### 5. One-way-hash lesson + no atom highlighting
expected: Every key-segment card ends with the one-way-hash tagline ("cannot be decoded back to the structure or mapped to atoms…"); AND hovering any InChIKey segment does NOT highlight atoms/bonds on the molecule canvas (unlike InChI layers) — the absence of highlighting is the teaching point.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Each hover card shows non-redundant header text — the label and title should not repeat the same words (e.g. card shows 'skeleton hash' then 'Skeleton hash')."
  status: resolved
  reason: "User reported: there is redundant text in the left card: for example it says 'skeleton hash' and 'skeleton hash'. this is true for most all hovers. redundant information. the same is also for the when hovering over the inchi layers."
  severity: cosmetic
  test: 2
  scope: "Cross-cutting display issue — affects InChIKey segment cards (this phase) and InChI-layer cards (earlier phases)."
  resolution: "Inline quick fix (user-chosen approach: drop the tag for key zones). Explanation.tsx key-segment branch no longer renders the redundant layerTag/label row; swatch moved inline onto the descriptive title (KEY_ZONE_COPY.title). InChI-layer cards left unchanged (their tag = notation code, meaningfully distinct from the human title). `label` field retained in inchiKeyInfo.ts (still pinned by SC-1 test). tsc clean; 301/301 tests pass."
  artifacts: [src/components/Explanation.tsx]
  missing: []
