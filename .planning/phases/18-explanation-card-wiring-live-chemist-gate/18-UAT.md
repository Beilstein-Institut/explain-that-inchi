---
status: testing
phase: 18-explanation-card-wiring-live-chemist-gate
source: [18-VERIFICATION.md]
started: 2026-06-29T08:30:00Z
updated: 2026-06-29T08:30:00Z
---

## Current Test

number: 1
name: Tetrahedral stereo card accuracy (SC#5 case 1)
expected: |
  Hover/pin the /t/m/s stereo sub-token of a stereocenter molecule (e.g. L-alanine
  InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1). The card shows the
  "Tetrahedral stereocenter" copy and explicitly states the +/- sign is a PARITY,
  NOT an R/S descriptor. Chemically accurate.
awaiting: user response

## Tests

### 1. Tetrahedral stereo card accuracy (SC#5 case 1)
expected: Hovering/pinning a /t/m/s stereo sub-token (real getInchi() molecule, e.g. L-alanine) shows the "Tetrahedral stereocenter" card, and the +/- sign is described as a parity, not R/S. String is chemically accurate.
result: [pending]

### 2. Mobile-H card accuracy (SC#5 case 2)
expected: Hovering/pinning an (H,X,Y) mobile-hydrogen group (e.g. the alanine carboxylate (H,5,6) group, or imidazole) shows the "Mobile hydrogen" card with chemically accurate copy scoped to the correct atoms.
result: [pending]

### 3. H-count card accuracy (SC#5 case 3)
expected: Hovering/pinning a heteroatom bearing explicit H in the h layer shows the "Hydrogen count" card with the correct count and a chemically accurate description.
result: [pending]

### 4. Multi-fragment element scoping (SC#5 case 4)
expected: For a salt / multi-component formula (per-component element count), hovering an element sub-token shows a count scoped to the hovered fragment, the named element matches the highlighted atoms, and the Hill-order note is present and accurate.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
