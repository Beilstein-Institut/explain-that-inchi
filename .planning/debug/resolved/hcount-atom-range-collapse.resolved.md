---
status: diagnosed
trigger: "h-layer H-count sub-token must name exactly the atoms that bear hydrogens (the discrete atom set parsed from the token), not a min-to-max range. Token 3-4,7-8,15H (InChIKey DRLFMBDRBRZALE) → card says 'Atoms 3–15 each bear one hydrogen' (false)."
created: 2026-06-29T00:00:00Z
updated: 2026-06-29T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — atomPhrase() in subTokenInfo.ts collapses a discrete atom array to a Math.min..Math.max range; the hAtoms card thus prints "atoms 3–15" for the set {3,4,7,8,15}.
test: traced full data path token → expandAtoms → SubHover.atoms → subTokenInfo.atomPhrase; reproduced with a standalone node check.
expecting: parsed set is [3,4,7,8,15] (correct) but card phrase is "atoms 3–15" (wrong).
next_action: diagnose-only — return ROOT CAUSE FOUND. No fix applied (gap-closure planning handles fixes).

## Symptoms

expected: Hovering the h-layer token `3-4,7-8,15H` (InChIKey DRLFMBDRBRZALE) should describe atoms {3,4,7,8,15} accurately.
actual: Card reads "Atoms 3–15 each bear one hydrogen" — false; atoms 5-6 and 9-14 do not bear those hydrogens. Hyphens are ranges INSIDE comma groups (3-4→3,4; 7-8→7,8; 15→15), so the set is {3,4,7,8,15}, not the contiguous range 3..15.
errors: none
reproduction: Test 3 in .planning/phases/18-explanation-card-wiring-live-chemist-gate/18-UAT.md (live hover in running app).
started: discovered during /gsd-verify-work 18 (live chemist gate); pre-existing since Phase 17 introduced subTokenInfo.

## Eliminated

- hypothesis: The atom set is parsed wrong upstream (parser collapses the range).
  evidence: src/components/LayerText.tsx:360-374 expandAtoms("3-4,7-8,15", 0) returns [3,4,7,8,15]. Verified by standalone node run. The discrete set is built correctly and stored verbatim on SubHover.atoms (LayerText.tsx:402). Defect is purely in rendering, not parsing.
  timestamp: 2026-06-29T00:00:00Z

- hypothesis: Other sub-token kinds (element, stereo, mobileH) share the same range-collapse defect.
  evidence: grep shows atomPhrase has exactly ONE caller — the hAtoms branch (subTokenInfo.ts:64). element/stereo cards list no atoms; mobileH (line 72) uses atoms.join(' and ') which enumerates correctly. Range-collapse is isolated to atomPhrase/hAtoms.
  timestamp: 2026-06-29T00:00:00Z

## Evidence

- timestamp: 2026-06-29T00:00:00Z
  checked: src/lib/subTokenInfo.ts:28-33 atomPhrase()
  found: For atoms.length > 1 it returns `atoms ${Math.min(...atoms)}–${Math.max(...atoms)}`. This collapses ANY multi-element array to a min–max range, discarding which atoms are actually present.
  implication: A discontiguous set like [3,4,7,8,15] renders as "atoms 3–15", asserting 13 atoms bear H when only 5 do. This is the root cause.

- timestamp: 2026-06-29T00:00:00Z
  checked: src/components/LayerText.tsx:360-374 (expandAtoms) and :396-408 (H-token → SubHover build)
  found: expandAtoms splits on ',' then expands each 'a-b' as an inclusive range; "3-4,7-8,15" → [3,4,7,8,15]. The SubHover at :402 is `{ kind:'hAtoms', atoms, count }` carrying that exact array.
  implication: The discrete atom set is correct all the way to subTokenInfo. The bug is confined to the final phrasing function.

- timestamp: 2026-06-29T00:00:00Z
  checked: standalone node reproduction of expandAtoms + atomPhrase logic on "3-4,7-8,15"
  found: parsed atoms = [3,4,7,8,15]; current card phrase = "atoms 3–15"; atoms in 3..15 NOT in the set = {5,6,9,10,11,12,13,14}.
  implication: Confirms the false-positive atoms the card silently claims bear hydrogens.

- timestamp: 2026-06-29T00:00:00Z
  checked: grep for atomPhrase callers across src
  found: single caller — subTokenInfo.ts:64 (hAtoms). No other kind routes through it.
  implication: Blast radius for THIS bug is the H-count card only. (Note: UAT Test 4 reports a SEPARATE major issue — global-offset vs per-component numbering — which is NOT this bug and lives in the offset logic, not atomPhrase.)

## Resolution

root_cause: src/lib/subTokenInfo.ts lines 28-33 — atomPhrase(atoms) renders any multi-atom array as `atoms ${Math.min}–${Math.max}`, a min-to-max RANGE. For a discontiguous H-count set such as [3,4,7,8,15] this prints "atoms 3–15", falsely asserting that the intervening atoms (5,6,9-14) also bear the hydrogens. The atom set is parsed and carried correctly upstream (expandAtoms in LayerText.tsx, stored verbatim on SubHover.atoms); the defect is purely in this rendering function. Fix direction: enumerate the actual atoms (e.g. join with ', ' and a final 'and', like mobileH already does) instead of collapsing to a range. Note the existing D-09 comment "collective, never per-atom listed" reflects the original (wrong) intent — the chemist gate establishes that per-atom enumeration is the correct, accurate behavior here.
fix: [not applied — diagnose-only mode]
verification: [pending fix]
files_changed: []
