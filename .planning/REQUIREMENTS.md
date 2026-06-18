# Requirements — Milestone v1.3: InChIKey display & explanation

**Milestone goal:** Display the molecule's InChIKey below the InChI, with each segment color-coded, hoverable, and explained — mirroring the existing InChI strip treatment.

**Core value tie-in:** Extends "every chunk is hoverable, explained, and linked back" to the InChIKey — while deliberately teaching the one place the link breaks: a one-way hash cannot point back to atoms.

## v1.3 Requirements

### InChIKey display (INKEY)

- [x] **INKEY-01**: A live InChIKey appears below the InChI strip, computed from the same in-browser WASM source as the InChI (`ketcher.getInChIKey()`), updating in sync with the molecule.
- [x] **INKEY-02**: The displayed and copied InChIKey is the verbatim library output string — never reconstructed or re-joined from parsed segments.
- [ ] **INKEY-03**: The InChIKey is rendered as color-coded segments — skeleton hash (14), remaining-layers hash (8), flag + version chars, protonation char — with the two hyphens visually dimmed/de-emphasized.
- [ ] **INKEY-04**: Hovering a segment surfaces a per-segment explanation card, mirroring the InChI strip's hover behaviour.
- [ ] **INKEY-05**: A copy-to-clipboard control copies the verbatim InChIKey with visual confirmation, matching the InChI copy button (PLSH-04 parity).
- [x] **INKEY-06**: An empty or invalid structure shows a placeholder (no key, no error), matching the InChI strip's empty state (PLSH-01 parity).

### InChIKey explanation content (INKEY)

- [ ] **INKEY-07**: Explanation content describes the block structure — 14-char skeleton/connectivity hash, 8-char remaining-layers (stereo/isotope/proton) hash, standard/non-standard flag + version char, and the protonation char.
- [ ] **INKEY-08**: Explanation content describes what the InChIKey is for — a fixed 27-char, web/database-search-friendly hashed form of the InChI.
- [ ] **INKEY-09**: Explanation content states the InChIKey is a one-way hash — not reversible and not atom-mappable; its segments deliberately do NOT highlight atoms in the canvas (unlike InChI layers).
- [ ] **INKEY-10**: Explanation content includes the collision caveat — collisions are improbable but theoretically possible, so the key is for lookup/indexing, not proof of identity.
- [ ] **INKEY-11**: The skeleton-hash (first block) explanation notes that molecules sharing the same connectivity share this first block — the basis for InChIKey database/web lookup.
- [ ] **INKEY-12**: The flag/version segment explanation distinguishes the standard (`S`) vs non-standard (`N`) flag and the version character (`A`), beyond merely labelling the segment.

## Future Requirements (deferred)

- **INKEY-F1**: "Search this InChIKey on the web / PubChem" outbound link — deferred to v2 (heavier scope; surface when users ask how to look a key up).
- **INKEY-F2**: A charged-species preset to live-demo the protonation character — ties into CONT-01 preset expansion.
- **INKEY-F3**: First-block partial-match interactive / "how the hash is built" deep dive.
- Carried from prior milestones: MAP-03 (shareable URL), ACCS-01/02 (keyboard nav, screen-reader labels), CONT-01/02 (more presets, search), APPR-01/02 (dark mode, print styles).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Canvas highlight on InChIKey segment hover | The key is a one-way hash with no atom mapping — highlighting would be impossible and pedagogically misleading. The *absence* of highlighting is the lesson (INKEY-09). |
| Decode / reconstruct a molecule from a pasted InChIKey | One-way hash; not invertible. |
| Editable paste-in InChIKey field | The tool derives the key from the drawn structure; a paste-in field is a different product. |
| Computing the InChIKey in JS / adding a hashing library | `ketcher.getInChIKey()` already provides it from the loaded WASM — no new dependency, no re-hashing. |
| Outbound web-search link | Deferred to v2 (INKEY-F1). |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INKEY-01 | Phase 11 | Complete |
| INKEY-02 | Phase 11 | Complete |
| INKEY-03 | Phase 12 | pending |
| INKEY-04 | Phase 12 | pending |
| INKEY-05 | Phase 12 | pending |
| INKEY-06 | Phase 11 | Complete |
| INKEY-07 | Phase 13 | pending |
| INKEY-08 | Phase 13 | pending |
| INKEY-09 | Phase 13 | pending |
| INKEY-10 | Phase 13 | pending |
| INKEY-11 | Phase 13 | pending |
| INKEY-12 | Phase 13 | pending |

*(Phase column filled by the roadmap.)*
