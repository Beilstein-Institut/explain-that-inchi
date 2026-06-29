---
status: complete
phase: 18-explanation-card-wiring-live-chemist-gate
source: [18-VERIFICATION.md]
started: 2026-06-29T08:30:00Z
updated: 2026-06-29T08:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Tetrahedral stereo card accuracy (SC#5 case 1)
expected: Hovering/pinning a /t/m/s stereo sub-token (real getInchi() molecule, e.g. L-alanine) shows the "Tetrahedral stereocenter" card, and the +/- sign is described as a parity, not R/S. String is chemically accurate.
result: pass

### 2. Mobile-H card accuracy (SC#5 case 2)
expected: Hovering/pinning an (H,X,Y) mobile-hydrogen group (e.g. the alanine carboxylate (H,5,6) group, or imidazole) shows the "Mobile hydrogen" card with chemically accurate copy scoped to the correct atoms.
result: pass

### 3. H-count card accuracy (SC#5 case 3)
expected: Hovering/pinning a heteroatom bearing explicit H in the h layer shows the "Hydrogen count" card with the correct count and a chemically accurate description.
result: issue
reported: "h-layer token h3-4,7-8,15H — card says 'Atoms 3–15 each bear one hydrogen' but that is not true: 5-6 and 9-14 do not bear those hydrogens. The atom set is {3,4,7,8,15}, not the contiguous range 3 through 15."
severity: blocker

### 4. Multi-fragment element scoping (SC#5 case 4)
expected: For a salt / multi-component formula (per-component element count), hovering an element sub-token shows a count scoped to the hovered fragment, the named element matches the highlighted atoms, and the Hill-order note is present and accurate.
result: issue
reported: "Two-component InChI (C13H16N2O2.C7H8). Hovering h-layer token '2-6H' in the second component (component-local atoms 2-6) shows 'Atoms 19–23' in the card. Count is correct (5 atoms) but the card uses globally-offset canonical numbering (local + 17-atom offset for component 1) while the InChI string prints per-component numbering (2-6). The numbers shown don't match the numbers the user is reading in the string."
severity: major

## Summary

total: 4
passed: 2
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "An h-layer H-count sub-token names exactly the atoms that bear hydrogens (the discrete atom set parsed from the token), not the min-to-max range."
  status: failed
  reason: "User reported: h-layer token h3-4,7-8,15H — card says 'Atoms 3–15 each bear one hydrogen' but only atoms {3,4,7,8,15} do. The hAtoms copy in subTokenInfo renders the atom set as a min–max range instead of enumerating the actual atoms."
  severity: blocker
  test: 3
  artifacts: []
  missing: []

- truth: "A multi-component h-layer (or any sub-token) names atoms using numbering consistent with the InChI string the user is reading (per-component), or clearly indicates a renumbering — not silently globally-offset canonicals."
  status: failed
  reason: "User reported: two-component InChI C13H16N2O2.C7H8; hovering '2-6H' in component 2 shows 'Atoms 19–23' (local 2-6 + 17-atom offset). Count correct but the card's globally-offset canonical numbering does not match the per-component numbering printed in the InChI string."
  severity: major
  test: 4
  artifacts: []
  missing: []
