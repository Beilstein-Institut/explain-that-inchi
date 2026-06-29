---
status: testing
phase: 18-explanation-card-wiring-live-chemist-gate
source: [18-VERIFICATION.md]
started: 2026-06-29T08:30:00Z
updated: 2026-06-29T13:45:00Z
---

## Current Test

number: 2
name: Mobile-H card accuracy (SC#5 case 2) — re-confirm incl. 3+-atom mobile-H grammar (WR-03)
expected: |
  Hovering/pinning an (H,X,Y) mobile-hydrogen group shows the "Mobile hydrogen" card with
  chemically accurate copy scoped to the correct atoms. Additionally check a 3-or-more-atom
  mobile-H group (e.g. a (H2,1,2,3,4)-style group): the card must read a grammatical list
  ("atoms 1, 2, 3 and 4"), NOT "atoms 1 and 2 and 3 and 4" (WR-03, unfixed — confirm severity on real molecule).
awaiting: user response

## Tests

### 1. Tetrahedral stereo card accuracy (SC#5 case 1)
expected: Hovering/pinning a /t/m/s stereo sub-token (real getInchi() molecule, e.g. L-alanine) shows the "Tetrahedral stereocenter" card, and the +/- sign is described as a parity, not R/S. String is chemically accurate.
result: pass

### 2. Mobile-H card accuracy (SC#5 case 2)
expected: Hovering/pinning an (H,X,Y) mobile-hydrogen group (e.g. the alanine carboxylate (H,5,6) group, or imidazole) shows the "Mobile hydrogen" card with chemically accurate copy scoped to the correct atoms. Also confirm a 3+-atom mobile-H group reads as a grammatical list ("atoms 1, 2, 3 and 4"), not a chain of "and" (WR-03 is unfixed — flag if a real molecule produces the bad string).
result: [pending]
note: re-test — previously passed; WR-03 (3+-atom mobile-H grammar) folded in per 18-VERIFICATION.md.

### 3. H-count card accuracy (SC#5 case 3) — RE-TEST after GAP-1 fix
expected: |
  Hovering/pinning a discontiguous h-layer H-count token (e.g. 3-4,7-8,15H) shows the
  "Hydrogen count" card enumerating the exact discrete atom set — "atoms 3, 4, 7, 8 and 15" —
  and NEVER the min–max range "atoms 3–15". (GAP-1, fixed in 18-02.)
result: [pending]
note: previously `issue`/blocker (card showed "Atoms 3–15"); code-fixed in 18-02 (atomList enumeration). Re-confirm on live canvas.

### 4. Multi-fragment element scoping (SC#5 case 4) — RE-TEST after GAP-2 fix
expected: |
  For a multi-component InChI (e.g. C13H16N2O2.C7H8), hovering an h-layer token in the
  second component (e.g. 2-6H) shows per-component numbering matching the InChI string —
  "atoms 2, 3, 4, 5 and 6 (component 2)" — NOT globally-offset canonicals ("atoms 19–23").
  The canvas highlight must still light up the correct atoms (global canonical resolution preserved). (GAP-2, fixed in 18-02.)
result: [pending]
note: previously `issue`/major (card showed "Atoms 19–23"); code-fixed in 18-02 (display-only fragmentOffset). Re-confirm both the card string and the canvas highlight on live canvas.

## Summary

total: 4
passed: 1
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

- truth: "An h-layer H-count sub-token names exactly the atoms that bear hydrogens (the discrete atom set parsed from the token), not the min-to-max range."
  status: resolved
  resolution: "Fixed in 18-02 (commit 82718b8): atomList in src/lib/subTokenInfo.ts enumerates the discrete set ('atoms 3, 4, 7, 8 and 15'); no Math.min/Math.max range survives. Test guards the old '3–15' is absent. Awaiting live-canvas re-confirmation (test 3)."
  severity: blocker
  test: 3
  debug_session: .planning/debug/hcount-atom-range-collapse.md

- truth: "A multi-component h-layer (or any sub-token) names atoms using numbering consistent with the InChI string the user is reading (per-component), or clearly indicates a renumbering — not silently globally-offset canonicals."
  status: resolved
  resolution: "Fixed in 18-02 (commit 9c0173b): display-only fragmentOffset + componentMarker on SubHover; atomPhrase subtracts the offset for display ('atoms 2, 3, 4, 5 and 6 (component 2)') while SubHover.atoms keep global canonicals so the highlight is unchanged (guard test highlightUtils.test.ts:803-820). Awaiting live-canvas re-confirmation (test 4)."
  severity: major
  test: 4
  debug_session: .planning/debug/multicomponent-atom-numbering-mismatch.md
