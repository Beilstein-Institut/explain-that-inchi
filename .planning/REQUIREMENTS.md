# Requirements — Explain that InChI

## Milestone: v1.5 Sub-token-specific explanations

**Goal:** The existing explanation card becomes sub-token-aware — hovering or pinning an individual sub-token updates that same card to explain the specific piece, chemically accurately. No new card or surface.

**Source:** PROJECT.md current milestone; `.planning/research/SUMMARY.md` (+ STACK/FEATURES/ARCHITECTURE/PITFALLS, 2026-06-26).

### v1.5 Requirements

#### Card framework (sub-token tier)

- [x] **SUBEX-01**: Hovering a sub-token in the InChI string updates the *existing* explanation card (no new card or surface) with content specific to that sub-token, and reverts to the whole-layer explanation when only the layer — not a sub-token — is hovered.
- [x] **SUBEX-02**: A pinned sub-token (`pinned.sub`) shows its sub-token-specific card; precedence is keyHoverKind → sub-token → layer → legend → idle.

#### Hydrogen sub-tokens

- [x] **SUBEX-03**: Hovering an `H` / `H2` / `H3` (and range like `1-6H`) group updates the card to state, in plain language, that the named atom(s) bear that many hydrogens — without claiming a functional group (must not equate `H3` with "methyl").
- [x] **SUBEX-04**: Hovering a mobile `(H,X,Y)` group updates the card to explain it as a mobile/tautomeric hydrogen shared across the listed atoms (InChI's one-identifier-per-tautomer device), not a fixed bond or physical delocalisation claim.

#### Tetrahedral stereo (t-layer)

- [x] **SUBEX-05**: Hovering a t-layer stereocenter updates the card with a plain-language explanation (a fixed 3-D handedness at an sp³ centre) and states that `+`/`-` is a parity of the canonical neighbour order.
- [x] **SUBEX-06**: The stereocenter card states explicitly that the `+`/`-` parity is **not** R/S, and briefly notes that the m-layer (and s-layer absolute/relative/racemic) qualify which enantiomer is meant.

#### Molecular formula elements

- [x] **SUBEX-07**: Hovering a specific element in the formula updates the card with the element's name and that the count is the number of that element's atoms (scoped correctly to the molecule or the hovered fragment in multi-component formulas), with a brief Hill-order note.
- [x] **SUBEX-08**: Element naming is backed by a full periodic-table symbol→name table (extended in place from the existing 10-entry `ELEMENT_NAMES`), so no element shows only a bare symbol; lookup stays case-exact (`Co` ≠ `CO`).

#### Correctness & non-regression

- [x] **SUBEX-09**: All sub-token copy is derived from already-offset parsed `SubHover` data — it never reconstructs the InChI string (verbatim-passthrough invariant) and never remounts the Ketcher canvas / re-initialises WASM (no-remount invariant).
- [x] **SUBEX-10**: Sub-token copy is produced by a pure, unit-tested module; tests use real `getInchi()` InChI fixtures (no fabricated fixtures), pin the mandatory "parity ≠ R/S" caveat, and pass a human chemical-accuracy verify gate before the milestone closes.

### Future Requirements (deferred)

Carried from prior milestones — not in v1.5 scope:

- [ ] MAP-03: Current molecule state encoded in URL for bookmarking/sharing
- [ ] ACCS-01 / ACCS-02: Full keyboard navigation + screen-reader labels for the InChI display
- [ ] CONT-01 / CONT-02: Additional preset molecules; molecule search by name or InChI
- [ ] APPR-01 / APPR-02: Dark mode; print styles
- [ ] INKEY-F1 / INKEY-F2 / INKEY-F3: InChIKey web/PubChem search link; charged-species preset; hash-build deep dive

### Out of Scope (this milestone)

| Feature | Reason |
|---------|--------|
| New explanation card / separate surface | User constraint: enrich the *existing* card only |
| Element trivia (atomic number, group, mass, electron config) | Not about reading the InChI; encyclopaedia bloat dilutes the terse card voice |
| Asserting CIP R/S descriptors per stereocenter | InChI does not compute CIP; would fabricate data the tool lacks |
| Claiming functional groups from H-count (e.g. H3 → methyl) | h-layer encodes a count, not connectivity; functional-group identity needs the c-layer |
| New parsing of mobile-H counts beyond what `SubHover` carries | Reuse existing parsers; only add count parsing if a card states a count |
| Sub-token cards for c-layer kinds (atom/bond/branch) | v1.4 already covers c-layer hover highlights; copy tier returns null → graceful fall-through |

### Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SUBEX-01 | Phase 18 | Complete |
| SUBEX-02 | Phase 18 | Complete |
| SUBEX-03 | Phase 17 | Complete |
| SUBEX-04 | Phase 17 | Complete |
| SUBEX-05 | Phase 17 | Complete |
| SUBEX-06 | Phase 17 | Complete |
| SUBEX-07 | Phase 18 | Complete |
| SUBEX-08 | Phase 17 | Complete |
| SUBEX-09 | Phase 18 | Complete |
| SUBEX-10 | Phase 17 | Complete |

**Coverage:** 10/10 v1.5 requirements mapped to exactly one phase. No orphans, no duplicates.

> Note: the element-card *copy* (incl. per-fragment scoping for SUBEX-07) is authored in the Phase 17 pure module alongside SUBEX-08's table, but SUBEX-07's observable behaviour — the live card updating on element hover with correct fragment scoping — is only verifiable once wired in Phase 18, so the requirement is mapped to the phase where it becomes observable.
