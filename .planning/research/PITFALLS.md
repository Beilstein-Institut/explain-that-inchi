# Pitfalls Research

**Domain:** Educational InChI explainer — adding sub-token-specific explanation copy (v1.5)
**Researched:** 2026-06-26
**Confidence:** HIGH (chemical facts cross-checked against InChI Technical Manual + J. Cheminform. 2015; integration facts read directly from store.ts / Explanation.tsx / parseInchi.ts / layerInfo.ts / LayerText.tsx)

> **Scope note.** This milestone adds *copy* and a *card-rendering tier* — almost no new highlight logic (sub-token hover already highlights the right atoms; see PROJECT.md EXPL/INCHI-04/05/08). So the two risk surfaces are: **(A) the words must be chemically true**, and **(B) the new card tier must slot into the existing precedence chain without breaking the verbatim-passthrough / no-remount invariants or regressing the multi-fragment offset work**. The repeat-offense risk is testing this on fabricated InChI (v1.4 scar). Phases are not yet defined; pitfalls are mapped to the three feature areas named in PROJECT.md — **H** (hydrogen sub-tokens), **T** (tetrahedral stereo), **F** (formula elements) — plus a shared **INT** (integration/card-tier) area.

---

## Critical Pitfalls

### Pitfall A1: Stating or implying InChI parity (+/−) equals R/S

**What goes wrong:**
The t-layer copy says something like "+ means R, − means S" or "the + sign tells you the stereocenter's configuration." It does not. InChI tetrahedral parity is computed from the **canonical atom numbering and 3D geometry** — *not* from CIP priority. There is **no general relationship** between InChI +/− and R/S. The same parity sign can correspond to R in one molecule and S in another.

**Why it happens:**
Chemists pattern-match +/− onto the only sp³-handedness label they know (R/S). The current `t` blurb already hedges correctly ("parity of the four-substituent arrangement under the canonical ordering") — but a sub-token card that zooms in on a single stereocenter is exactly where someone will be tempted to "finally tell the user what it means" and overshoot into R/S.

**How to avoid:**
- The t-layer sub-token card MUST carry an explicit caveat: "+/− is a parity sign derived from InChI's own canonical atom numbering and the 3D geometry — it is **not** the CIP R/S label and does not map to R/S." (PROJECT.md milestone goal already mandates this caveat — treat it as a hard requirement, not optional polish.)
- Explain the m-layer relationship correctly: the **/m flag flips interpretation of the whole t-layer**. Enantiomers share an identical /t layer and differ only in /m (m0 vs m1). So a single stereocenter's sign is only meaningful *together with* /m. Don't explain a t-sign in isolation as if it were absolute handedness.
- Explain /s correctly: 1 = absolute, 2 = relative, 3 = racemic configuration (matches existing `s` blurb). The card for a stereocenter should not assert "absolute configuration" unless /s=1 is actually present.

**Warning signs:**
Copy contains the letters "R/S", "CIP", "priority", "clockwise = R", or asserts a fixed sign→configuration mapping. Any sentence that lets a user read absolute handedness off a single + or − without referencing /m and /s.

**Phase to address:** T (tetrahedral stereo copy). Verification: chemist/human review gate on the exact t-layer card strings, plus a unit test pinning that the t-card copy string contains the "not R/S" caveat substring.

---

### Pitfall A2: Equating H-count to a functional group or hybridization

**What goes wrong:**
H sub-token copy says "1H3 = a methyl group" or "2H2 = a CH₂ / methylene" or infers sp³ from H-count. H-count alone does **not** determine the group: `1H3` on a carbon is a methyl *only if* atom 1 is carbon with no other heavy-atom context that changes it; `H3` on nitrogen would be an ammonium-ish situation, on boron something else. The InChI h-layer states **how many H sit on a given canonical atom**, full stop. It does not name groups, and it does not distinguish implicit vs explicit at the chemistry level — InChI's H-layer is the *total* H on that atom regardless of how it was drawn.

**Why it happens:**
"H3 = methyl" is the most natural-feeling explanation and is *usually* visually true for the common organic presets. It quietly breaks on heteroatoms and on the formula's total-H count.

**How to avoid:**
- H sub-token card says exactly what the notation says: "**atom N carries 3 hydrogens**" (element-aware via `atomLabel` / `atomElements`, which the existing `readingFor('h')` already does — reuse it, don't reinvent the prose). Optionally: "for a carbon, that is a CH₃" framed as an *example conditioned on the element*, never as the definition.
- Clarify the implicit/explicit distinction honestly: the InChI h-layer reports the **total** hydrogen count on the atom; whether they were drawn explicitly or left implicit in Ketcher is irrelevant to the string. (The canvas badge already shows implicit H — INCHI-08 — so the card should not contradict it.)
- Formula total-H caveat: the H count in the molecular formula (Pitfall A4) is the molecule-wide total including all implicit H, not a per-atom count.

**Warning signs:**
Card copy contains "methyl", "methylene", "amine", "hydroxyl", or any group name as the *primary* definition of an H sub-token rather than the literal "atom N bears n H." Copy that says "explicit hydrogens" as if implicit ones are excluded.

**Phase to address:** H (hydrogen sub-token copy). Verification: card copy for `1H3` on a real heteroatom fixture (e.g. an amine, ammonium) must not name "methyl"; unit test asserting the H-card reading is generated by the element-aware path.

---

### Pitfall A3: Mis-explaining mobile / tautomeric H groups `(H,X,Y)`

**What goes wrong:**
The `(H,3,4)` card says "atoms 3 and 4 each carry a hydrogen" or "there is an H bond between 3 and 4." Wrong on both counts. `(H,3,4)` means **one (or `Hn`, n) mobile proton is shared across the set {3,4}** — the H is delocalized/tautomeric over those positions, not fixed to any one of them, and not a bond between them. `(H2,3,4,5)` means two mobile protons shared over {3,4,5}.

**Why it happens:**
The parenthesis visually resembles the c-layer's bond-branch parentheses, so people reach for "bond between" language. And "shared" is a subtler concept than "located at."

**How to avoid:**
- Mobile-H card copy: "**A mobile (tautomeric) proton shared over atoms {3,4}** — InChI records that the H can sit on any of these positions, so tautomers map to one identifier." Reuse the existing `parseMobileHydrogens` set + `atomLabel` prose ("mobile H shared by …" already in `readingFor('h')`).
- If a leading count is present (`(H2,…)`), state the proton count explicitly ("two mobile protons shared over …"). Note the existing `parseMobileHydrogens` regex `\(H\d*,([^)]+)\)` captures the atom set but **drops the `H\d*` count** — if the card wants to say "two protons," the count must be parsed separately (see Integration Pitfall B5).
- Never use "bond", "between", or "each" for mobile-H copy.

**Warning signs:**
Copy contains "bond between", "each atom", or treats the parenthesized set as a connectivity branch. The card for `(H,X,Y)` looking identical in structure to a c-layer branch card.

**Phase to address:** H. Verification: real tautomeric fixture (alanine zwitterion `InChI=1S/C3H7NO2/...(H,7,8)` is already in the test corpus, plus adenine/imidazole are good additions) — card copy asserts "shared / mobile," not "bond" or "each."

---

### Pitfall A4: Hill-system formula nuances and multi-fragment per-element meaning

**What goes wrong:**
Formula-element card gets the ordering rule or the multi-fragment semantics wrong. Specifics:
- **Hill order**: Carbon first, Hydrogen second, then **all other elements alphabetically by symbol**. (When there is no carbon, *all* elements including H go strictly alphabetical — edge case, e.g. inorganics.) The card must not claim "alphabetical" without the C-then-H exception, nor claim a count reflects position/importance.
- **The H count is the molecule's total hydrogen** (incl. implicit), not "the hydrogens you can see."
- **Multi-fragment formulas** are dot-separated (`C12H19N.C11H17N.C6H6`) and may carry a leading multiplier per component (`2C6H6` = two benzenes). A per-element count like the `6` in one of three `.`-separated `C6H6` fragments means "6 carbons **in that fragment**," not 18 across the molecule. The multiplier in `2C6H6` multiplies the *whole component*, so it is 12 carbons total across two identical benzene fragments.

**Why it happens:**
The existing `formulaReading` already handles `.` and `2C6H6` multipliers correctly (verified in `layerInfo.ts`), but a *per-element-on-hover* card is a new granularity. Explaining "this 6 = 6 carbons" is easy to state without the per-fragment qualifier, producing a wrong whole-molecule count for multi-fragment species.

**How to avoid:**
- Reuse `formulaFragmentCounts` / the `formulaReading` segment logic — do not write a second formula parser for the card.
- Element-count card copy is per-fragment-aware: "6 carbon atoms in this component" for multi-fragment, plain "6 carbon atoms" for single. The existing `SubHover.canonRange` already restricts the highlight to the hovered fragment — the copy must respect the same scoping.
- Hill-order explanation, if shown, states the C-then-H-then-alphabetical rule with the no-carbon exception, and clarifies the H count is the total.

**Warning signs:**
Card says a multi-fragment element count is the whole-molecule total. Copy says "alphabetical order" with no C/H exception. Copy implies the formula H is per-atom.

**Phase to address:** F (formula element copy). Verification: the 3-component fixture already in tests (`C12H19N.C11H17N.C6H6`) — hovering the `6` of the third component yields "in this component" scoped copy, and the highlight (canonRange) matches.

---

### Pitfall A5: Element-name table errors — case sensitivity and coverage

**What goes wrong:**
The new full-periodic-table element-name table mislabels symbols. The classic trap is **case sensitivity**: `Co` (cobalt) vs `CO` (carbon + oxygen), `Cs` (caesium) vs `CS`, `Hf`/`HF`, `Sn`/`SN`, `Ni`/`NI`, `Nb`, `Cu`, `Cl`, `Sc`, `Si`, `Se`. A naive uppercase or case-insensitive lookup turns `Co` into "carbon monoxide" or fails entirely. Secondary traps: wrong/typo'd element names, missing elements (current `ELEMENT_NAMES` only has the 10 common organics — `H C N O S P F Cl Br I`), and US/IUPAC spelling (sulfur vs sulphur, aluminium vs aluminum — pick one and be consistent; existing table uses "sulfur").

**Why it happens:**
Hand-typing 118 element names invites transcription errors, and the formula regex `[A-Z][a-z]?` already correctly tokenizes two-letter symbols, so the *lookup* is the only weak point — but a careless `.toUpperCase()` or `.toLowerCase()` normalization destroys the Co/CO distinction at the lookup boundary.

**How to avoid:**
- Generate the element table from a known-correct source (a vetted symbol→name list) rather than hand-typing; keep it **case-exact** keyed (`Co` not `CO`/`co`). The existing `ELEMENT_NAMES` lookup is already case-exact (`ELEMENT_NAMES[el]` with `el` straight from the `[A-Z][a-z]?` capture) — preserve that; never normalize case.
- Add a unit test that round-trips every symbol in the table and explicitly asserts a few collision pairs resolve differently (`Co`→cobalt, and that `C`+`O` tokenize as two elements, never "Co").
- Keep the existing US spellings ("sulfur") for consistency with the 10-element table already shipped; don't introduce "sulphur" in the new rows.
- Decide deliberately whether to cover the full periodic table or just elements InChI/Ketcher can actually emit; the `formulaReading` fallback (`ELEMENT_NAMES[el] || el`) already degrades safely to the raw symbol, so an incomplete table is graceful, not broken.

**Warning signs:**
A test or hover shows `Co`→"carbon..." or an element symbol echoed raw where a name was expected for a common element. Any `.toUpperCase()`/`.toLowerCase()` in the element-name lookup path.

**Phase to address:** F. Verification: table-completeness + case-collision unit test (real fixture with a metal or halogen symbol, e.g. a chloride or a cobalt complex if supported).

---

### Pitfall B1: Breaking the verbatim-passthrough invariant

**What goes wrong:**
While adding sub-token copy, someone reconstructs or re-derives a displayed InChI fragment from parsed `layer.text` / `SubHover` fields instead of slicing the stored raw string. This is the exact scar from `feedback_inchi_passthrough` (the `.`-drop bug) and `parseInchiKey`. The new card copy *describes* sub-tokens — it must never feed a rebuilt string back into what the user sees as "the InChI."

**Why it happens:**
A sub-token card naturally wants to echo "the piece you hovered." It's tempting to render `subHover`-derived text as if it were the canonical fragment.

**How to avoid:**
- The card shows **explanatory prose**, not a reconstructed InChI. Any echo of the hovered literal must come from slicing the already-stored raw string (the renderer already slices in `LayerText`), never from re-joining parsed fields.
- Keep the new tier read-only on the data: it consumes `subHover`/`pinned.sub` + `atomElements` and emits copy. It must not write back to `inchi`/`layers` or influence the displayed string.

**Warning signs:**
Any `.join('/')`, `.join('')`, or template literal that assembles an InChI-looking string for display. The displayed InChI strip changing when a sub-token card renders. (memory: `feedback_inchi_passthrough`)

**Phase to address:** INT (card-tier integration). Verification: existing passthrough tests stay green; grep for string-reassembly in the new card code; live check that displayed/copied InChI is byte-identical with and without a sub-token card open.

---

### Pitfall B2: Remounting the editor / recreating the WASM provider

**What goes wrong:**
The new card tier is wired in a way that conditionally renders `<Editor>` or touches the module-level `StandaloneStructServiceProvider`, causing a WASM re-init (loading overlay, lost canvas). This is the no-remount invariant violated in a new place.

**Why it happens:**
Less likely here — the card is a leaf in the explanation panel, far from the canvas — but a careless refactor (e.g. lifting state, restructuring `Explanation`'s parent, or adding a provider) could reach it.

**How to avoid:**
- The sub-token tier lives **entirely inside `Explanation.tsx`** (a leaf sibling, same as the feedback dialog, InchiKeySection, Reset, HelpTour — every prior milestone followed this). Zero changes to `KetcherPanel` / `<Editor>` / the provider.
- Store-only + leaf-render: read `subHover`/`pinned`, render copy. No new provider, no conditional `<Editor>`.

**Warning signs:**
A loading overlay flashes when hovering a sub-token. `<Editor>` or `StandaloneStructServiceProvider` appears in the v1.5 diff. (PROJECT.md D-13 / Key Decisions invariant)

**Phase to address:** INT. Verification: diff touches no canvas/provider files; live UAT confirms no loading overlay on sub-token hover/pin.

---

### Pitfall B3: Sub-token card precedence bugs in the existing chain

**What goes wrong:**
The new sub-token tier is slotted into `Explanation.tsx`'s precedence chain incorrectly. Current chain (read from the file): `keyHoverKind → layer (effIdx = pinned?.idx ?? hoverIdx) → legendHover → idle`. The new sub-token copy must:
- **Override the layer blurb** when a sub-token is hovered/pinned (the user hovered a specific piece, not the whole layer) — i.e. sit *inside* or *above* the `layer` branch, refining it.
- **NOT override `keyHoverKind`** — InChIKey segment cards have no sub-tokens and must keep top precedence (they're a different surface; INKEY-09 says they deliberately don't highlight).
- **Honor `pinned.sub`** — when pinned, the frozen sub-token's copy must show, not the live hover. The store already freezes `subHover` via the `pinned` gate, but `Explanation` currently only derives `effIdx` from `pinned.idx`; it does **not** read `pinned.sub`. So today the card shows the *layer* blurb even when a *sub-token* is pinned. The new tier must derive an `effSub = pinned ? pinned.sub : subHover` exactly parallel to the existing `effIdx`.

**Why it happens:**
The precedence chain is a 4-way ternary; inserting a 5th condition in the wrong spot (e.g. above `keyHoverKind`, or reading `subHover` instead of `pinned.sub` when pinned) is an easy off-by-one in the conditional ladder. And `pinned.sub` is currently unused in `Explanation`, so it's a silent gap, not a visible bug.

**How to avoid:**
- Insert the sub-token branch **between `keyHoverKind` and the plain-layer branch**: `keyHoverKind ? … : effSub ? <sub-token card> : layer ? <layer card> : legendHover ? … : idle`.
- Derive `effSub = pinned ? pinned.sub : subHover` (mirror the existing `effIdx = pinned ? pinned.idx : hoverIdx`). When `pinned` is set, both `effIdx` and `effSub` come from the pin.
- A sub-token card still needs its parent layer's accent/title context — derive the layer from `effIdx`. Verify in `LayerText` that a sub-token hover sets **both** `hoverIdx` and `subHover` (so `effIdx` stays consistent); if a sub-token hover does NOT also set `hoverIdx`, the card must derive its layer/accent from the sub-token's `kind` instead.

**Warning signs:**
Hovering a sub-token shows the generic layer blurb (override failed). A pinned sub-token shows layer copy instead of sub-token copy (`pinned.sub` ignored). Hovering an InChIKey segment shows a sub-token card (precedence inverted).

**Phase to address:** INT. Verification: unit tests on `Explanation` for each precedence pair — (sub-hover beats layer), (key beats sub), (pinned.sub beats live sub-hover), (idle when all null). This is the single highest-leverage test cluster in the milestone.

---

### Pitfall B4: Regressing multi-fragment canonical offset when naming the hovered atom/element

**What goes wrong:**
The new copy re-derives the atom/element label and gets the canonical offset wrong for multi-fragment molecules, after `readingFor` already solved this. `readingFor` threads `fragCounts` + a `cumulativeOffset` per fragment so that atom 2 of fragment 3 gets its global canonical number and the right `atomElements[canon]` element. A naive sub-token card that just does `atomElements[subHover.atom]` with a local (pre-offset) number names the wrong atom in fragments 2+.

**Why it happens:**
`SubHover` carries `canonical`/`canonicals`/`canonRange`/`atoms` that are **already globally offset** (per the comments in `parseInchi.ts` and the `buildSubHoverSpecs` design), but a card author might re-parse `layer.text` locally and forget the offset — re-introducing exactly the bug `readingFor`'s per-fragment loop was written to avoid.

**How to avoid:**
- Build the sub-token copy from the **already-offset fields on `SubHover`** (`canonical`, `atoms`, `el`+`canonRange`), passing them through `atomLabel(atomElements, …)`. Do not re-tokenize `layer.text` in the card.
- For element naming in multi-fragment formulas, use the existing `canonRange` to scope, mirroring how the highlight is already scoped — don't recompute fragment boundaries.
- Where prose like "atom N bears 3H" or "stereocenter at N" is needed and already exists in `readingFor`, **reuse it** rather than duplicating; the offset handling is the load-bearing part.

**Warning signs:**
Sub-token card names the wrong atom number or wrong element on the 2nd/3rd fragment of a `.`-separated or `N*` fixture, while the canvas highlight (which uses the offset-correct path) lights the right atom — a tell-tale copy/highlight mismatch.

**Phase to address:** All copy phases (H/T/F), enforced at INT. Verification: the existing multi-fragment real fixtures (`2C7H8.2C6H6`, `C12H19N.C11H17N.C6H6`) — assert the card's named atom/element equals the highlighted one for a fragment-2+ sub-token.

---

### Pitfall B5: Testing on fabricated InChI fixtures (REPEAT-OFFENSE risk)

**What goes wrong:**
Tests are written against hand-invented InChI strings that are syntactically plausible but not real WASM output. In v1.4 this let **333 tests pass green while the c-layer feature was actually broken on real InChI** (fabricated `(-2)` notation that real InChI never emits; real branches like `(4)` have no internal hyphen). The blocking human-verify gate was then bypassed. This is the project's most expensive recorded mistake.

**Why it happens:**
Fabricated fixtures are faster to write and feel sufficient when tests go green. Sub-token copy is *especially* exposed: a wrong mental model of `(H,X,Y)`, t-layer parity, or multi-fragment formula notation produces a fixture that "confirms" the wrong copy.

**How to avoid:**
- **Every fixture is a real Ketcher/WASM-emitted InChI**, generated by actually drawing/loading the molecule, not hand-typed. The repo already has a real-fixture corpus (alanine `(H,7,8)`, ciprofloxacin, the multi-fragment amine mixtures) — extend it; add real fixtures for: a stereocenter molecule with /t /m /s (e.g. alanine, a sugar), a heteroatom-H molecule (an amine for Pitfall A2), a tautomer (imidazole/adenine for A3), and a multi-element formula (a halide/metal for A5).
- **Do not bypass the human-verify gate.** Chemical-accuracy copy must be reviewed by a human against a real molecule on the live canvas before the phase is marked verified — green unit tests are necessary but not sufficient (memory: `feedback_real_domain_fixtures_and_gates`).
- Where the milestone parses a *new* sub-field (e.g. the `Hn` count inside `(Hn,X,Y)` for A3), add the real fixture that exercises it before writing the parser.

**Warning signs:**
A fixture string in a test file that no `getInchi()` call produced. A PR where chemistry copy changed but the only evidence is unit tests. A skipped/auto-passed human-verify checkbox.

**Phase to address:** All phases — this is a process gate, not a feature. Verification: each chemistry phase's plan names the real molecule(s) its fixtures came from; the verify step includes a live-canvas chemist read of the actual card strings.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hand-type the full element-name table | Fast, no data source | Transcription/case errors (Co/CO), wrong names ship silently | Never — generate from a vetted list + collision test |
| Re-parse `layer.text` in the card for atom/element names | Self-contained card code | Re-introduces the multi-fragment offset bug `readingFor` already fixed (B4) | Never — consume offset-correct `SubHover` fields |
| Reuse the c-layer-branch parenthesis mental model for mobile-H `(H,X,Y)` | One paren handler | Chemically wrong copy ("bond between") (A3) | Never |
| Fabricate InChI fixtures to get tests green | Faster test authoring | Green-but-broken (v1.4 scar) (B5) | Never for chemistry copy |
| Show "1H3 = methyl" as the definition | Intuitive, reads well | Wrong on heteroatoms; conflates count with group (A2) | Only as an element-conditioned *example*, never the definition |
| Add a sub-token branch without reading `pinned.sub` | Smaller diff | Pinned sub-tokens show the wrong (layer) card (B3) | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `Explanation.tsx` precedence chain | Insert sub-token branch above `keyHoverKind`, or read live `subHover` while pinned | Insert between `keyHoverKind` and `layer`; derive `effSub = pinned ? pinned.sub : subHover` |
| `pinned` store field | Use `pinned.idx` only (current code), ignore `pinned.sub` | Honor `pinned.sub` for the frozen sub-token's copy |
| `SubHover` canonical fields | Use local pre-offset numbers from re-parsing | Use the already-globally-offset `canonical`/`atoms`/`canonRange` |
| `parseMobileHydrogens` | Assume it returns the proton count | It returns only the atom set; the `Hn` count is dropped — parse it separately if the copy states a count (A3) |
| `readingFor` prose | Duplicate atom-naming/offset logic in the card | Reuse `readingFor`/`atomLabel`/`formulaReading` — they own the offset correctness |
| `ELEMENT_NAMES` lookup | Normalize case (`toUpperCase`) | Keep case-exact keys; `[A-Z][a-z]?` token feeds the lookup raw |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-parsing the formula/layer on every hover render | Minor jank on rapid hover | Memoize per-layer derived data, or reuse already-parsed `layers`/`SubHover` | Negligible at this scale (single molecule, in-browser) — do not over-engineer |
| Full-periodic-table object rebuilt per render | None observable | Module-level constant (like existing `ELEMENT_NAMES`) | Effectively never; flagged only to keep the table a static const |

*(This is a single-molecule, in-browser educational tool — there is no scale dimension. Do not add caching/virtualization for hypothetical load.)*

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Render new card copy via `dangerouslySetInnerHTML` from sub-token-derived text | XSS-shaped bug if any field carries user-influenced chars | New copy is static prose + `<b>`/`<span>`-only `readingFor` output (the existing D-09 pattern); render plain prose as React text children (the `KEY_ZONE_COPY` / WR-02 pattern). Reserve `dangerouslySetInnerHTML` for the known-safe `readingFor` HTML only |
| Echo raw `layer.text` as markup | `<`/`>` in an edge parse becomes markup | Render fallbacks as React text children (already done — WR-02) |

*(Inputs are WASM-generated InChI, not free user text, so risk is low — but keep the established "prose as React children, HTML only for readingFor" boundary.)*

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Sub-token card and canvas highlight disagree (copy names atom 5, highlight lights atom 12) | Destroys trust in the whole tool | Drive copy from the same offset-correct `SubHover` the highlight uses (B4) |
| Card overshoots into confident-but-wrong chemistry (R/S, "methyl", "bond between") | Teaches falsehoods to students — worse than no copy | Honest, literal copy + explicit caveats (A1–A3) |
| Sub-token hover doesn't visibly change the card from the layer blurb | User can't tell the sub-token did anything | Sub-token card must be visibly more specific than the layer blurb (B3) |
| Card flips back to layer blurb the instant the cursor leaves the exact glyph | Flicker; hard to read | Same hover ergonomics as existing sub-token highlights (already solved) — reuse, don't re-tune |

## "Looks Done But Isn't" Checklist

- [ ] **t-layer card:** Often missing the explicit "+/− is not R/S, and depends on /m and /s" caveat — verify the caveat substring is present and a chemist confirms it (A1).
- [ ] **H sub-token card:** Often silently wrong on heteroatoms (H3 named "methyl") — verify against a real amine/ammonium fixture (A2).
- [ ] **Mobile-H card:** Often says "bond between" — verify it says "shared/mobile proton over {…}" on a real tautomer (A3).
- [ ] **Formula element card:** Often gives whole-molecule count for a multi-fragment component — verify "in this component" scoping on the 3-component fixture (A4).
- [ ] **Element table:** Often missing case-collision handling — verify `Co`≠`CO` and a few two-letter symbols (A5).
- [ ] **Pinned sub-token:** Often shows the layer card not the sub-token card — verify `pinned.sub` is honored (B3).
- [ ] **Multi-fragment naming:** Often names fragment-1 atom while highlighting fragment-2 atom — verify copy==highlight on fragment 2+ (B4).
- [ ] **Fixtures:** Often fabricated — verify every fixture traces to a real `getInchi()` output and the human-verify gate ran (B5).
- [ ] **Verbatim InChI strip:** Verify byte-identical with a sub-token card open (B1).
- [ ] **No remount:** Verify no loading overlay on sub-token hover/pin (B2).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Shipped chemically-wrong copy (A1–A5) | LOW (copy-only) | Fix the string; it's static prose in `layerInfo`-style modules. Cheap to patch, but reputationally costly — prevent via human gate |
| Precedence bug (B3) | LOW–MEDIUM | Fix the ternary order / add `effSub`; covered by unit tests if they exist |
| Multi-fragment offset regression (B4) | MEDIUM | Re-route copy through offset-correct `SubHover` fields; re-run multi-fragment fixtures |
| Verbatim-passthrough break (B1) | MEDIUM | Revert to slicing stored raw string; re-run passthrough tests (known scar pattern) |
| Remount introduced (B2) | MEDIUM | Move logic back to leaf render; remove provider/`<Editor>` changes |
| Green-but-broken from fabricated fixtures (B5) | HIGH | Re-author fixtures from real output, re-validate live — the v1.4 cost. Avoid entirely |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| A1 Parity ≠ R/S | T (tetrahedral copy) | Caveat-substring unit test + human chemist read of t-card on real stereocenter |
| A2 H-count ≠ group | H (hydrogen copy) | Heteroatom fixture; card says "bears n H," not "methyl" |
| A3 Mobile-H mis-explain | H | Real tautomer fixture; copy says "shared/mobile," not "bond/each" |
| A4 Hill / multi-fragment formula | F (formula copy) | 3-component fixture; per-component scoped count |
| A5 Element-table case errors | F | Table round-trip + Co/CO collision test |
| B1 Verbatim passthrough | INT (card tier) | Existing passthrough tests green; displayed InChI byte-identical |
| B2 No remount | INT | No canvas/provider files in diff; no loading overlay on hover |
| B3 Precedence / pinned.sub | INT | Precedence unit-test cluster (key>sub>layer>legend>idle; pinned.sub honored) |
| B4 Multi-fragment offset | H/T/F, gated at INT | Copy==highlight on fragment 2+ of real multi-fragment fixtures |
| B5 Fabricated fixtures | ALL (process gate) | Each plan names real source molecule; human-verify gate not bypassed |

## Sources

- InChI Technical Manual (parity from canonical numbering + geometry, /m enantiomer flag, /s 1/2/3) — https://www.inchi-trust.org/download/104/InChI_TechMan.pdf — HIGH
- "InChI, the IUPAC International Chemical Identifier", J. Cheminformatics 7:23 (2015) — "no simple relation between InChI parities and R/S; InChI does not use CIP rules"; enantiomers share /t, differ in /m — https://jcheminf.biomedcentral.com/articles/10.1186/s13321-015-0068-4 — HIGH
- InChI Technical FAQ — https://www.inchi-trust.org/technical-faq/ — HIGH
- Project memory `feedback_inchi_passthrough` (never reconstruct the InChI) — HIGH (project-canonical)
- Project memory `feedback_real_domain_fixtures_and_gates` (v1.4 green-but-broken, bypassed gate) — HIGH (project-canonical)
- Project memory `reference_inchi_clayer_adjacency` (real InChI branch notation) — HIGH (project-canonical)
- Source read: `src/store.ts`, `src/components/Explanation.tsx`, `src/lib/parseInchi.ts`, `src/lib/layerInfo.ts`, `src/components/LayerText.tsx` — HIGH (direct read)

---
*Pitfalls research for: educational InChI explainer — sub-token explanation copy (v1.5)*
*Researched: 2026-06-26*
