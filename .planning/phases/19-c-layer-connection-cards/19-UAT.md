---
status: complete
phase: 19-c-layer-connection-cards
source: [19-VERIFICATION.md]
started: 2026-06-30T06:55:15Z
updated: 2026-06-30T08:59:22Z
---

## Current Test

[testing complete]

## Tests

### 1. Single-component live card accuracy
expected: Atom card lists the bonded atoms matching the printed-string adjacency (title "Atom"); hyphen → "Bond" card names the two joined atoms; "(" and ")" show the SAME "Branch" card (branch-point atom + bond pairs, en-dash). Canvas highlight unchanged from Phase 15.
result: pass

### 2. Multi-component per-component numbering
expected: Load/draw a salt or co-crystal whose SECOND component has a real ring/chain (e.g. toluene co-crystal). Hover an atom/hyphen/parenthesis IN COMPONENT 2 → card numbers match the per-component numbers PRINTED in the string (reset after the ";"), card shows "(component 2)", and the canvas highlight still lights the correct atoms via global canonicals.
result: issue
reported: "Numbers in the card text don't match the printed string for repeated/duplicated components. Caffeine+toluene+3*benzene: hovering atom token '2' in the c-layer '3*1-2-4-6-5-3-1' shows 'Atom 23 is bonded to atoms 22, 25, 28, 29, 34 and 35' (global numbers, neighbours fanned across all 3 benzene copies = 6 neighbours instead of 2). Same family of bug in h-layer: '2*1-6H' shows 'Atoms 1..12 (component 3)' instead of '1-6'. Highlight is correct (lights atom in every copy); card text is wrong."
severity: major

### 3. No-remount + no false claims
expected: On any c-layer hover/pin, the canvas shows no loading overlay / no re-init flash (no-remount). Cards make NO bond-order, hydrogen-count, or geometry claim — atom numbers only.
result: pass

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "In a multi-component molecule the card numbers match the per-component numbering printed in the string, while the highlight resolves correct atoms via global canonicals."
  status: failed
  reason: "User reported: for N* duplicated-fragment notation (e.g. 3*1-2-4-6-5-3-1), the c-layer Atom card shows global atom numbers and fans neighbours across all N copies (atom 2 → 'Atom 23 bonded to 22,25,28,29,34,35'); the h-layer Hydrogen card merges both copies ('atoms 1-12 (component 3)' for 2*1-6H). Highlight is correct (CLYR-05); card text is wrong."
  severity: major
  test: 2
  artifacts: ["src/components/LayerText.tsx:334-345 (ConnectionText segMult branch)", "src/components/LayerText.tsx:520+ (HydrogenText segMult branch)", "src/components/LayerText.tsx:194-206 (incidentPairs fan-out via canonicalFn.canonicals[])"]
  missing: ["Per-component LOCAL display numbering for the N* card (currently global, fragmentOffset=0)", "Single-fragment incidentPairs/atom-list for the N* card (currently fanned across all N copies)", "Real N*-fixture test (e.g. 2C6H6 or caffeine+toluene+3C6H6)"]
  root_cause: "In the N* segMult branch, the multi-fragment canonicalFn (returns canonicals[] across all N copies — correct for the CLYR-05 highlight) is reused to build the card's incidentPairs/atom number, and the branch passes fragmentOffset=0. The HIGHLIGHT data and the CARD-DISPLAY data are not decoupled for the N* case: card needs single-fragment, local-numbered data; highlight needs all-fragment globals."
  scope_note: "c-layer card is Phase 19 in-scope. h-layer card is the pre-existing Phase 17/18 analogue exposed by the same notation — same root-cause family; fix BOTH layers in this gap cycle (user-approved)."

- truth: "Connection-layer (c-layer) cards are titled 'Connection layer - Atom' / 'Connection layer - Bond' / 'Connection layer - Branch' so the description box names the layer the hovered token belongs to."
  status: failed
  reason: "User-requested enhancement at the chemist gate; not yet applied — titles are still plain 'Atom'/'Bond'/'Branch'."
  severity: minor
  test: 1
  artifacts: ["src/lib/subTokenInfo.ts:109,117 (Atom title x2)", "src/lib/subTokenInfo.ts:127 (Bond title)", "src/lib/subTokenInfo.ts:139 (Branch title)", "src/lib/__tests__/subTokenInfo.test.ts (title assertions)"]
  missing: ["'Connection layer - ' prefix on the three c-layer card titles", "updated title assertions in subTokenInfo.test.ts"]
