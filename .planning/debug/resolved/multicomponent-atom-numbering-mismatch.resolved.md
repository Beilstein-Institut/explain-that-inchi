---
status: diagnosed
trigger: "Multi-component sub-token card must name atoms using per-component numbering consistent with the InChI string the user is reading (resets after each ;), or clearly indicate a renumbering — not silently use globally-offset canonical numbers. Test 4, phase 18 UAT: C13H16N2O2.C7H8, hovering '2-6H' in component 2 shows 'Atoms 19–23' (local 2-6 + 17-atom offset)."
created: 2026-06-29T09:00:00Z
updated: 2026-06-29T09:00:00Z
mode: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED — the card prints globally-offset canonical atom numbers while the InChI string prints per-component (post-`;`) numbers, so they disagree. This is a display-layer gap, not a highlight bug. The global offset is deliberate and load-bearing (it is the auxMap key for canvas highlights) and must NOT be removed.
test: traced full data flow from raw InChI → LayerText (display) and → SubHover.atoms (offset) → subTokenInfo (card) and → buildSubHoverSpecs (canvas)
expecting: complete
next_action: return diagnosis (find_root_cause_only — no fix)

## Symptoms

expected: For two-component InChI C13H16N2O2.C7H8, hovering h-layer token "2-6H" in the SECOND component presents atom numbers matching what the InChI string prints (component-local 2-6), or clearly indicates a renumbering was applied.
actual: Card shows "Atoms 19–23 each bear one hydrogen". Count correct (5 atoms) but numbers are globally-offset canonicals: component 1 has 17 heavy atoms (C13 N2 O2), so component-2 local atoms 2-6 are offset by +17 → 19-23. InChI string prints per-component 2-6, so card ≠ string.
errors: none
reproduction: Test 4 in .planning/phases/18-explanation-card-wiring-live-chemist-gate/18-UAT.md — live hover in running app.
started: discovered during /gsd-verify-work 18 (live chemist gate); behavior present since multi-fragment offset logic landed (pre-v1.5).

## Eliminated

- hypothesis: "The offset on SubHover.atoms is a bug and should be removed so the card shows local numbers."
  evidence: The offset is REQUIRED. auxMap (built by parseAuxMapping) is keyed by GLOBAL canonical indices 1..N across all components (parseAuxMapping applies fragOffset/globalOffset; keys are global). buildSubHoverSpecs resolves the canvas highlight via auxMap[canon] for hAtoms/mobileH/stereo/element. If SubHover.atoms were local (2-6), auxMap[2..6] would point at component-1 atoms — the WRONG atoms would highlight on the canvas. Removing the offset fixes the card but breaks the highlight. Confirmed in src/lib/highlightUtils.ts:492-509 (hAtoms case) and src/lib/parseAuxMapping.ts:70-124.
  timestamp: 2026-06-29T09:00:00Z

- hypothesis: "h-layer is special — other layers don't have this mismatch."
  evidence: All spatial layers apply the same global offset to SubHover numbers (LayerText.tsx: ConnectionText cumOffset, ParityText cumOffset, HLayerText cumOffset). The mismatch is universal. h-layer is only the FIRST to surface it because subTokenInfo.ts renders atom numbers in prose ONLY for hAtoms/mobileH/stereo kinds; c-layer kinds (atom/bond/branch) return null from subTokenInfo and never print a number, so the discrepancy is invisible there. stereo cards print no atom number either (they describe the parity, not the atom id). So h-layer (hAtoms + mobileH) is currently the only card surface that prints offset numbers. element cards print no atom number (only counts).
  timestamp: 2026-06-29T09:00:00Z

## Evidence

- timestamp: 2026-06-29T09:00:00Z
  checked: src/components/InchiSection.tsx:135-141 + src/components/LayerText.tsx HLayerText (lines 355-528)
  found: The InChI STRING display passes rawText={l.text} verbatim and HLayerText renders seg.slice / `buf + pattern.slice(...)` verbatim. The visible string therefore shows the raw per-component token "2-6H" (numbers reset after ';'). cumOffset is applied ONLY to the SubHover.atoms payload (expandAtoms(buf, offset) at line 400-402), never to the displayed characters.
  implication: The string the chemist reads = per-component (2-6). The card payload = global (19-23). The two are computed from the same characters but diverge by the offset.

- timestamp: 2026-06-29T09:00:00Z
  checked: src/lib/subTokenInfo.ts:28-33 (atomPhrase) + 58-66 (hAtoms case) + 68-77 (mobileH case)
  found: subTokenInfo consumes sub.atoms verbatim and renders Math.min/Math.max as "atoms lo–hi" (hAtoms) or "atoms a and b" (mobileH). It has NO access to fragment boundaries and NO transform back to per-component numbering. The module's invariant (header comment + STATE.md v1.5 invariants) is verbatim-passthrough: it consumes ONLY already-offset SubHover numeric fields and must not re-read layer.text or call a parser.
  implication: subTokenInfo prints exactly the global-offset numbers it is handed. To show per-component numbers OR an annotation, it needs either (a) the fragment offset/index passed alongside sub.atoms, or (b) the de-offset done upstream in LayerText before building the SubHover. It cannot derive the fragment boundary from its current inputs.

- timestamp: 2026-06-29T09:00:00Z
  checked: src/lib/parseAuxMapping.ts:70-124 (parseAuxMapping) + src/App.tsx:218-226 (remapAuxToPoolIds + setInchiData)
  found: auxMap is GLOBAL — keys are global canonical indices (parseAuxMapping accumulates globalOffset across ';' segments; for a plain second segment it writes map[globalOffset + i + 1]). Values are Ketcher pool IDs. There is exactly one global auxMap for the whole molecule; nothing is keyed per-component-local.
  implication: Any code that needs a canvas highlight MUST hand buildSubHoverSpecs a global canonical. SubHover.atoms is that global value by necessity. The card display is the only consumer that wants the per-component view.

- timestamp: 2026-06-29T09:00:00Z
  checked: src/lib/highlightUtils.ts:483-519 (buildSubHoverSpecs hAtoms + mobileH cases)
  found: hAtoms does auxMap[canon] for each canon in subHover.atoms to find the heavy atom, then traverses bonds to explicit H. mobileH does auxMap[c] directly. Both REQUIRE the global canonical to hit the right atom.
  implication: Confirms the offset must stay in SubHover.atoms for the highlight path. The fix must live at the DISPLAY boundary (card text), not in the SubHover payload.

- timestamp: 2026-06-29T09:00:00Z
  checked: cross-layer card surfaces — subTokenInfo.ts switch (element/hAtoms/mobileH/stereo) + c-layer kinds returning null
  found: Only hAtoms and mobileH print atom NUMBERS in card prose. element prints counts (no atom id). stereo describes parity (no atom id). c-layer atom/bond/branch → subTokenInfo returns null (card falls through to generic layer card, which prints no per-atom number). So today the offset mismatch is user-visible ONLY on h-layer cards.
  implication: Scope of the display fix is small and localized to two cases (hAtoms, mobileH). But the right design choice should be consistent for any future card that prints an atom number.

## Resolution

root_cause: |
  DESIGN GAP (not a code defect). Atom numbers in SubHover.atoms are deliberately GLOBAL canonical
  indices (local component number + cumulative heavy-atom offset of preceding components) because they
  are the lookup key into the single global auxMap (canonical→Ketcher pool ID) that drives canvas
  highlighting. The InChI STRING, however, is displayed verbatim and InChI prints per-component
  numbering that resets after every ';'. subTokenInfo.atomPhrase() prints the global SubHover.atoms
  values verbatim ("Atoms 19–23"), so the card's numbers contradict the per-component numbers (2-6)
  the chemist reads in the string directly above the card.

  The offset is correct and must NOT be removed (removing it would highlight the wrong atoms — proven
  in Eliminated #1). The defect is that there is no display-time transform from the global canonical
  back to the per-component number the user sees, and no annotation telling the user the numbers were
  renumbered. The card and the string are computed from the same characters but the card applies the
  offset to its payload while the string does not.

fix: |
  NOT APPLIED (find_root_cause_only). Two viable directions for gap-closure planning:

  DIRECTION A — render per-component numbers in the card (preferred; matches the truth statement's
  first clause "numbering consistent with the InChI string"):
    - Carry the fragment context onto the SubHover so the card can de-offset for DISPLAY while the
      highlight still uses the global value. Minimal addition: a `fragmentOffset?: number` (and
      optionally `componentIndex?: number`) field on SubHover, set by LayerText where cumOffset is
      already in scope (HLayerText line ~400-402 for hAtoms, ~387 for mobileH; and the N*/mixed
      branches that also build hAtoms/mobileH hits). subTokenInfo.atomPhrase subtracts fragmentOffset
      for display: "atoms 2–6" (and could append "(component 2)" when componentIndex > 0).
    - Touches: src/lib/parseInchi.ts (SubHover type: add fragmentOffset/componentIndex), 
      src/components/LayerText.tsx (set the field on every hAtoms/mobileH hit — note there are THREE
      construction sites: plain ;-segment renderSegment, the pure-N* branch, and the ;-with-N*-segment
      branch), src/lib/subTokenInfo.ts (de-offset in atomPhrase + the mobileH "a and b" path).
    - Invariant check: this stays within verbatim-passthrough — subTokenInfo still consumes ONLY
      SubHover numeric fields, never re-reads layer.text. fragmentOffset is just one more pre-computed
      numeric field, computed upstream exactly where the offset already lives.
    - Risk: must update ALL hit-construction sites consistently (hAtoms + mobileH × 3 branches) or some
      multi-fragment shapes (N*, mixed ;+N*) will show inconsistent numbering. Single-fragment is
      unaffected because fragmentOffset would be 0.

  DIRECTION B — annotate the renumbering (cheaper, weaker UX; matches the truth statement's
  "or clearly indicate a renumbering" escape clause):
    - Keep global numbers in the card but append a note when componentIndex > 0, e.g. "renumbered
      across components — these are global atom IDs". Still needs the fragment context on SubHover to
      know whether to show the note, so it touches the same type + LayerText sites as A, minus the
      arithmetic and minus the subTokenInfo de-offset.

  RECOMMENDATION: Direction A. The truth statement leads with "numbering consistent with the InChI
  string"; the chemist's mental model is the string they are reading. Annotation (B) leaves the
  numbers still mismatched and pushes cognitive load onto the reader. The extra cost of A over B is
  one subtraction in atomPhrase.

  OUT OF SCOPE for this gap: the Test-3 blocker (range-vs-set: "Atoms 3–15" should enumerate {3,4,7,8,15})
  is a SEPARATE defect in atomPhrase (min–max range instead of the discrete set) tracked as its own gap
  in 18-UAT.md. If both are fixed together, atomPhrase changes once: de-offset AND enumerate the actual
  set rather than a range.

verification: NOT APPLIED (diagnose-only).
files_changed: []
