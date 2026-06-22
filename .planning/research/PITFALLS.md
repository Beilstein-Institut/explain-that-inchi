# Domain Pitfalls — v1.5 Inorganic / Organometallic Capability

**Domain:** Extending an in-browser InChI explainer to handle inorganic, organometallic, and salt species
**Researched:** 2026-06-22
**Confidence:** HIGH on the parser/charge-alignment pitfalls (traced against the actual code in `parseInchi.ts` / `highlightUtils.ts` / `parseAuxMapping.ts` / `layerInfo.ts` and the verified inorganic strings); MEDIUM on preset round-tripping and AuxInfo-for-lone-metals (API path is sound; both require live verification, which is itself the point of the pitfall).

> Scope note. These are pitfalls **specific to adding inorganic features to THIS codebase**, not generic web-app warnings. Each names the warning sign, the prevention, a real-InChI test fixture, and which phase should own it. The team's two hard-won lessons — (a) fabricated fixtures that pass tests while the feature is broken, and (b) bypassed human-verify gates (PROJECT.md D-row "c-layer test fixtures must be REAL InChI", ⚠ Lesson v1.4) — are reinforced throughout and are non-negotiable for this milestone.

---

## Critical Pitfalls

Mistakes that cause a shipped-but-wrong feature, a teaching error, or a rewrite.

### Pitfall 1 — The `/q` blurb is actively wrong for salts, and chemists will trust it

**What goes wrong:** `LAYER_INFO.q.blurb` reads *"The overall formal charge of the molecule"* and `readingFor`'s `q` case returns `'net charge: <b>' + layer.text + '</b>'`. For a salt this is a **factual error**. `/q` is **per-component, semicolon-separated**, and an empty slot means "this component is neutral." For NaCl (`/q;+1`) the current UI renders "net charge: ;+1" — both visually broken and conceptually wrong (the net charge of NaCl as written is 0; the `+1` belongs to the sodium component, balanced by `/p-1`).

**Why it happens:** The blurb and reading were written for organic monocations/monoanions where `/q` is a single value. When multi-fragment `/q` *highlighting* was fixed in v1.1, the highlight code became per-component aware but the **prose did not**.

**Consequences:** An inorganic chemist — exactly the v1.5 target user — reads an authoritative-sounding but incorrect explanation. Worse than no explanation: the tool's entire value proposition is "trust this to demystify InChI."

**Prevention:**
- Rewrite `readingFor`'s `q` case to split `layer.text` on `;`, align each slot to a formula component (reuse the `multi`/`fragCounts`/`cumulativeOffset` pattern already present in the `c`/`h`/`t` cases — do **not** invent a new mechanism), and render per-component prose: `component 1 (Cl): neutral · component 2 (Na): +1`.
- Rewrite the `q` blurb to state per-component, semicolon-separated semantics with empty-slot = neutral.
- Do the identical treatment for `/p` (`readingFor` `p` case + `LAYER_INFO.p.blurb`).

**Detection / warning sign:** Load NaCl; if the charge card contains a literal `;` or the word "molecule" (whole-species framing), it's still wrong.

**Worked fixture (REAL InChI, NIST-verified):** `InChI=1S/ClH.Na/h1H;/q;+1/p-1` — assert the reading produces two component clauses, first neutral, second +1.

**Owning phase:** First content phase (corrected `/q`/`/p` semantics — P1 table stakes).

---

### Pitfall 2 — The per-component `/q` off-by-one: aligning `;` charge slots to formula components

**What goes wrong:** `/q` slots are positional and align **one-to-one with the dot-separated formula components in formula order**, including `N*` multiplier expansion. Three ways to get it wrong:

1. **Empty slots dropped.** A naive `text.split(';').filter(Boolean)` discards neutral slots and shifts every charge to the wrong component. The empty slot is **data** ("this component is neutral"), not noise.
2. **`N*` multiplier not expanded in the component count.** `6CN.Fe` is **7** components (six CN + one Fe), not 2. The `/q` string `;;;;;;-4` has exactly **7** slots. If component counting stops at the dot-split (`["6CN","Fe"]` → 2), `-4` lands on slot index 1 instead of slot index 6 — the charge explains/highlights the wrong component.
3. **Heavy-atom count vs component count confusion.** `formulaFragmentCounts` returns **heavy-atom counts per component** (`[2,2,2,2,2,2,1]` for `6CN.Fe`), whereas `/q` slots are **per component** (7 slots). Different cardinalities for different purposes — atom-offset accumulation (existing `c`/`h` machinery) vs. charge-slot alignment (new). Conflating them is the subtle trap.

**Why it happens:** The existing `q` handler in `highlightUtils.ts` gets the *highlighting* alignment right because it walks `qFragments` and `fragmentAtomCountsQ` in lockstep with `cumulativeOffsetQ`. But the **number of `/q` slots must equal `formulaFragmentCounts(...).length`** for that lockstep to hold — and a hand-written *prose* path (Pitfall 1's fix) that re-implements the split is where the off-by-one silently reappears.

**Worked example (ferrocyanide, verified):**
```
formula : 6CN.Fe
/q      : ;;;;;;-4
```
- `formulaFragmentCounts("6CN.Fe")` = `[2,2,2,2,2,2,1]` → **7 components**, total 13 heavy atoms.
- `"/q;;;;;;-4".slice(prefix).split(';')` = `["","","","","","","-4"]` → **7 slots**. ✓ counts match.
- Slot index 6 (`-4`) ↔ component index 6 ↔ the **Fe** component. The `-4` is the **overall complex charge parked on the metal slot by the disconnection algorithm**, not a charge "on the iron atom" chemically — see Pitfall 3 for the messaging trap this creates.

**Counter-example to test empty-slot handling (NaCl):** `/q;+1` → `["","+1"]` (2 slots) ↔ `formulaFragmentCounts("ClH.Na")` = `[1,1]` (2 components). Slot 0 empty (Cl neutral), slot 1 `+1` (Na). Drop the empty and `+1` wrongly maps to Cl.

**Prevention:**
- **Assert the invariant in code and tests:** `text.split(';').length === formulaFragmentCounts(formulaText).length`. On disagreement, render a safe degraded reading rather than a confidently wrong one.
- **Never `.filter(Boolean)` the slot array.** Preserve empties positionally (exactly as `parseRcField` deliberately preserves empty coordinate triples — same discipline).
- Reuse `formulaFragmentCounts` for component counting; do not re-derive from a dot-split.

**Detection / warning sign:** Hover `-4` in ferrocyanide — must highlight iron, not a cyanide. Hover `+1` in NaCl — must highlight sodium, not chloride. A one-position shift is the signature.

**Test fixtures (REAL InChI):**
| Species | InChI | Asserts |
|---------|-------|---------|
| NaCl | `1S/ClH.Na/h1H;/q;+1/p-1` | empty leading slot kept; `+1`→Na |
| Ferrocyanide | `1S/6CN.Fe/c6*1-2;/q;;;;;;-4` | `N*` → 7 slots; `-4`→Fe (slot 6) |
| Prussian blue | `1S/18CN.7Fe/c18*1-2;;;;;;;/q;;;;;;;;;;;;;;;;;;3*-4;4*+3` | **`N*` multiplier INSIDE a `/q` slot** (`3*-4`, `4*+3`) |

**The Prussian-blue trap within the trap:** `/q` can itself carry `N*` multipliers (`3*-4;4*+3` = three components at −4, four at +3). `expandLayerText` already expands `N*` for `c`/`h`/`t`/`b` — but it is **NOT currently applied to the `q` layer** (the `q` case in `highlightUtils.ts` does a plain `layer.text.split(';')`). If you support Prussian blue, the `/q` path must run through `expandLayerText` too, or the multiplied charge slots won't align.

**Owning phase:** First content phase (shares the parser change with Pitfall 1). Even if Prussian blue is not a shipped preset, add it as a **unit fixture** so the parser is correct.

---

### Pitfall 3 — The honesty trap: the canvas draws metal–ligand bonds the InChI string drops

**What goes wrong:** The user draws/loads ferrocene with bonds from Fe to both rings. Standard InChI **disconnects every metal–ligand bond** — the `/c` layer is `c2*1-2-4-5-3-1;` where the trailing `;` is Fe's *empty* connectivity slot (Fe has **no bonds** in the string). The canvas still shows the drawn bonds. The app's core promise is "hover a layer → it highlights what that layer denotes." If hovering the `/c` layer or the `.Fe` component implies the drawn Fe–ring bonds are "in" the InChI, the teaching is actively misleading.

**Why it happens:** Two faithful systems disagree. The canvas is faithful to *what the user drew*; the InChI is faithful to *Standard InChI normalization*, which severs metal bonds. The app sits between them and must not paper over the gap.

**Consequences:** The single biggest credibility risk of the milestone. An organometallic chemist who sees the tool imply "InChI knows about the Fe–Cp bonds" will correctly distrust the whole tool — that is the one thing they already know is *not* true about InChI.

**Prevention — message the gap, don't hide it (this is the v1.5 "aha", per FEATURES.md):**
- Make the **disconnection itself the teaching point.** When a metal appears as its own single-atom component with an empty `/c` slot, surface prose: "InChI deliberately cut every bond to the iron. The metal becomes its own component; the bonds you drew are not in the connection layer. This is normal Standard-InChI behavior, not an error."
- **Hovering the `.Fe` formula component highlights only the iron atom** (lone atom, no bonds) — faithful, because that is exactly what the string says about Fe.
- **Do NOT highlight the drawn Fe–ring bonds for any InChI token** — no token denotes them. (The "disconnection diff" idea — dimming dropped bonds — is explicitly deferred to v2 in FEATURES.md; do not sneak it into v1.5.)
- Mirror the proven v1.3 pattern: *the absence is the lesson* (INKEY-09 made InChIKey segments deliberately NOT highlight atoms).

**Detection / warning sign:** During live verification, hover every layer on ferrocene; confirm **no** highlight ever lights an Fe–ring bond.

**Test fixture (REAL, PubChem-verified):** `1S/2C5H5.Fe/c2*1-2-4-5-3-1;/h2*1-5H;` — assert the `c` layer's bonds contain **only** intra-ring bonds and **zero** bonds incident to the Fe canonical index.

**Owning phase:** Disconnection-explanation phase (metal-disconnection prose, P1 table stakes), with a live-canvas verification gate on ferrocene.

---

### Pitfall 4 — Lone-metal AuxInfo mapping: the iron highlights the wrong atom (or nothing)

**What goes wrong:** Highlighting depends on the canonical→Ketcher-pool-ID map built by `parseAuxMapping` + `remapAuxToPoolIds`. A disconnected metal is a **single-atom component with no bonds**. Two specific failure modes:

1. **Coordinate-match miss.** `remapAuxToPoolIds` matches each molfile rank's `(x,y)` to a live editor atom within `EPSILON = 0.05`. A lone metal has coordinates like any atom, so it *should* match — but if the metal's coordinate is absent/`NaN` in the `/rC:` field (Ketcher sometimes emits placeholder `;;;` triples — `parseRcField` preserves them as `NaN`), the match silently falls back to `fallbackPoolIds[rank]` (iteration order), which can resolve to the wrong atom.
2. **Cross-component bleed in CN-rich ligands.** Ferrocyanide has six identical CN components plus Fe. The `N:` field uses `N*` local-rank notation; `parseAuxMapping`'s multi-fragment branch advances `fragFormulaIdx` per expanded instance. An off-by-one in `globalOffset`/`fragFormulaIdx` accounting (the exact bug the existing code guards against for CuSO₄) would map a CN carbon's canonical to Fe's pool ID, or vice versa.

**Why it happens:** The coordinate-matching remap was added in v1.1 for CuSO₄-style interleaving and is sound — but a **lone bondless metal** and **six identical small ligands** are configurations not previously exercised. "It works for CuSO₄" is a hypothesis, not proof, for ferrocene/ferrocyanide.

**Consequences:** Wrong-atom highlight is a *silent* teaching error — it looks like it's working (an atom lights up) but it's the wrong atom. Highest-severity silent failure in the milestone.

**Prevention:**
- **Do the live-canvas verification gate FIRST**, before any content work (STACK.md's "one live verification gate"): load ferrocene, call `getInchi(true)`, confirm (a) the string is the expected `1S` form, (b) `remapAuxToPoolIds` resolves the Fe pool ID **not via fallback** (log which path fired), (c) hovering `.Fe` highlights the iron and only the iron.
- Add a unit fixture for ferrocyanide asserting the full canonical→element map: six carbons, six nitrogens, one iron land on distinct, correctly-typed atoms (catches cross-component bleed deterministically without the canvas).
- Repeat the live check for ferrocyanide (lone metal + many identical ligands) and one polyatomic-oxo-anion salt (AgNO₃).

**Detection / warning sign:** In the live check, log match-vs-fallback per atom. **Any fallback firing on a metal atom is a red flag** — correctness then depends on iteration order coinciding with rank order.

**Owning phase:** A dedicated verification gate at the **start** of the milestone (blocks everything downstream). Make-or-break feasibility check.

---

### Pitfall 5 — Presets that don't round-trip through Ketcher `setMolecule` (silent wrong teaching)

**What goes wrong:** Presets are SMILES loaded via `setMolecule`. If a SMILES doesn't parse cleanly in ketcher-standalone — or parses to a *different* structure than intended — the canvas shows molecule A, the InChI describes A', and every explanation anchors to the wrong species. The failure is **silent**: something loads, so it looks fine.

**Why it happens:** Inorganic SMILES stress Ketcher's parser in ways organic presets never did: explicit metal charges (`[Fe+2]`, `[Mn]`), unusual valences (permanganate Mn(VII)), dative bonds, aromatic-anion ligands (`[cH-]1cccc1`), large component counts.

**High-risk molecules (named, from FEATURES.md shortlist):**
- **KMnO₄** (`[K+].[O-][Mn](=O)(=O)=O`) — Mn(VII) valence/charge is the classic case Ketcher may reject or auto-"correct." ⚠
- **Hexaamminecobalt(III) chloride** (`[Co+3].N.N.N.N.N.N.[Cl-].[Cl-].[Cl-]`) — 10 components; high round-trip risk. ⚠ (stretch only)
- **Ferrocene** (`[cH-]1cccc1.[cH-]1cccc1.[Fe+2]`, fallback `C1=CC=C[CH]1.C1=CC=C[CH]1.[Fe]`) — cyclopentadienyl anion and iron sandwich are hardest to draw; the two SMILES forms may yield *different* InChI. ⚠
- Anything with **dative/coordinate bonds** — Standard InChI disconnects them regardless (Pitfall 3).

**Prevention — this is where the v1.4 fabricated-fixture lesson bites hardest:**
- **Every preset's expected InChI must be the REAL string ketcher-standalone emits for that exact SMILES, captured from the running app — never hand-written or predicted.** FEATURES.md marks several preset InChI strings as "predicted (MEDIUM)"; predicted strings are hypotheses. Loading the preset and copying the live `getInchi` output is the only acceptable source for a fixture or doc assertion.
- For each candidate: (1) load via `setMolecule`, (2) confirm the canvas structure matches intent (the formula + heavy-atom-count overlay already exists — use it), (3) capture the verbatim InChI, (4) pin that exact string. If a SMILES fails any step, it does not ship.
- Ship the **verified core** (NaCl, KCl, MgCl₂, CuSO₄, AgNO₃, NH₄Cl, ferrocene) before the ⚠ stretch presets (KMnO₄, hexaamminecobalt).

**Detection / warning sign:** Canvas formula overlay disagrees with the intended formula; or the captured InChI differs from the FEATURES.md "predicted" string (treat the prediction as wrong, the live output as truth).

**Owning phase:** Preset phase, **gated by a blocking human-verify step** (do not auto-mark presets green from unit tests alone — the v1.4 lesson: 333 unit tests passed while the feature was broken because the fixtures were fabricated).

---

## Moderate Pitfalls

### Pitfall 6 — `Fe`, `Na`, `Mn` and other two-letter / non-organic elements fall through the hardcoded element tables

**What goes wrong:** `ELEMENT_NAMES` (in `layerInfo.ts`) lists only `H,C,N,O,S,P,F,Cl,Br,I`. `elementColor`'s `known` array is the same set. For an unknown element, `formulaSegmentReading` falls back to the raw symbol (`Fe` → "1 Fe" instead of "1 iron") and `elementColor` returns generic `var(--c-formula)`. Ferrocene's formula reading would say "1 Fe" — not wrong but unpolished — and iron gets no distinct swatch color.

**Prevention:** Extend `ELEMENT_NAMES` with the metals used in the preset set (iron, sodium, potassium, magnesium, copper, silver, manganese, calcium, cobalt) and decide a metal color policy (a single shared "metal" token is acceptable and arguably *clearer* than per-metal colors). Data-only; no logic change. **Warning sign:** formula card showing a bare element symbol instead of a name.

**Owning phase:** Content/formula phase (cheap, do alongside Pitfall 1).

---

### Pitfall 7 — Verbatim-passthrough drift on multi-component / charged strings

**What goes wrong:** The project's bedrock invariant (MEMORY: *never reconstruct InChI; display the verbatim Ketcher output*) is most tempting to violate here. A "salt component breakdown panel" or per-ion summary could lead someone to re-join parsed `q`/`p`/formula fields into a displayed string. The displayed/copied InChI and InChIKey must remain the **literal** WASM output, sliced by offset only (the v1.3 `parseInchiKey` returns offsets only; renderer slices verbatim — keep that discipline).

**Prevention:** Derived panels read **from** parsed layers but render their **own** prose; they never produce a string presented as "the InChI." InChIKey for inorganic species is computed by `ketcher.getInChIKey()` (handles multi-component/charged species) and displayed verbatim — no special-casing. **Warning sign:** any code path concatenating layer `.text` fields into something shown as an InChI/InChIKey.

**Owning phase:** Any phase introducing a derived/summary view (the salt-breakdown differentiator, if pursued).

---

### Pitfall 8 — `/p` proton slots are also per-component and interact with `/q`

**What goes wrong:** `/p` (mobile proton balance) is `;`-separated per component, same shape as `/q`, and for salts the two layers tell a *combined* story (NaCl: `/q;+1/p-1` — Na carries +1, the chloride lost a proton). Explaining `/p` as a whole-molecule proton count (current blurb) is the same error class as Pitfall 1. There's also a highlight subtlety: the existing `p` case highlights mobile-H-bearing atoms from `/h` — for a simple chloride salt there may be no mobile-H notation, triggering the heteroatom fallback, which could highlight the wrong component.

**Prevention:** Give `/p` the same per-component treatment as `/q` (prose + alignment). Verify `/p` highlighting on NaCl specifically (the canonical `/p-1` case). **Warning sign:** `/p` card framing protons as a single molecule-wide count, or `/p-1` on NaCl highlighting sodium instead of chloride.

**Owning phase:** First content phase (shares machinery with Pitfalls 1–2).

---

## Minor Pitfalls

### Pitfall 9 — `formulaFragmentCounts` multiplier regex assumes a single uppercase letter

**What goes wrong:** `formulaFragmentCounts` matches `/^(\d+)([A-Z])/` to detect the leading multiplier (`6CN`, `2C5H5`, `7Fe`). The `[A-Z]` matches the first letter so two-letter elements (`7Fe`) still count correctly — but it's worth a confirming test on `7Fe` (Prussian blue) that the iron-multiplier component counts as 7 single-iron components.

**Prevention:** Add `7Fe` / `18CN` count assertions as unit fixtures (covered by the Prussian-blue fixture in Pitfall 2). **Warning sign:** component count mismatch on Prussian blue.

**Owning phase:** Parser/fixture phase.

### Pitfall 10 — Disconnection-detection heuristic over- or under-fires

**What goes wrong:** The "why is the metal gone?" callout (differentiator) needs a heuristic: a formula component that is a single metal element with an empty `/c` slot. A hardcoded metal-element set that's too small misses cases; the empty-`/c`-slot signal is more reliable.

**Prevention:** Prefer the structural signal (single-atom component + empty connectivity slot) over an element-name allowlist; keep the allowlist as secondary confirmation only. Defer this differentiator if it adds risk — it's P2, not table stakes. **Warning sign:** callout firing on a neutral organic fragment, or missing on a metal.

**Owning phase:** Differentiator phase (P2 / fast-follow).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **AuxInfo / lone-metal mapping verification (do FIRST)** | #4 lone-metal maps wrong / via fallback; CN cross-bleed | Live gate on ferrocene + ferrocyanide; log match-vs-fallback; assert full canonical→element map in a unit fixture |
| **`/q` + `/p` per-component semantics** | #1 wrong blurb, #2 off-by-one slot alignment, #8 `/p` combined story | Reuse existing `multi`/`cumulativeOffset` pattern; assert `slots.length === components.length`; never `.filter(Boolean)`; run `q` through `expandLayerText` for `N*`-in-`/q` |
| **Metal-disconnection explanation prose** | #3 canvas-draws-bonds-InChI-drops honesty trap | Make absence the lesson; ferrocene assert zero Fe-incident bonds; never highlight drawn metal bonds |
| **Element tables** | #6 `Fe`/`Na`/`Mn` fall through | Extend `ELEMENT_NAMES`; metal color policy (single shared token OK) |
| **Inorganic presets** | #5 SMILES don't round-trip / load wrong silently | Capture REAL live InChI per preset; blocking human-verify; ship verified core before ⚠ KMnO₄/hexaammine |
| **Derived/summary views** | #7 verbatim-passthrough drift | Derived prose only; never re-join into a displayed InChI/InChIKey |
| **Differentiators (disconnection callout, breakdown panel)** | #10 heuristic mis-fires; scope creep | Structural signal over allowlist; keep P2/deferred |

---

## Anti-Features (explicitly DO NOT build — scope-creep traps)

| Anti-feature | Why it's a trap | What to do instead |
|--------------|-----------------|--------------------|
| **`/r` reconnected-layer parsing** | `ketcher.getInchi(withAuxInfo?: boolean)` has no options param; the app can only ever receive Standard `1S` InChI, which **never** contains `/r`. A `/r` parser is dead code for output you cannot produce. (HIGH — STACK.md) | Explain metal **disconnection** (the thing that actually happens); mention `/r` only as the non-standard alternative the tool can't show |
| **Patching ketcher to send `/RecMet`** | Produces **non-standard** `1/` InChI, breaks the "we explain *Standard* InChI" identity, desyncs InChIKey | Keep `getInchi(true)` exactly as shipped |
| **Importing `indigo-ketcher` directly** to set `inchi-options` | Transitive dep; bypasses public API; version-skew risk; **CLAUDE.md explicitly forbids it** | Only the ketcher public API |
| **Drawing dative/coordinate bonds and expecting them in `/c`** | Standard InChI disconnects metals regardless of how bonds are drawn; "draw the bond, see it" is a false promise | Teach disconnection as intentional normalization — the absent bond IS the lesson (Pitfall 3) |
| **3D coordination geometry / octahedral-tetrahedral viewer** | Out of scope per PROJECT.md; InChI carries no coordination geometry | Stay a 2D notation explainer |
| **Crystallographic / lattice / unit-cell view for salts** | InChI represents discrete ionic species, not the solid-state lattice | Explain InChI describes Na⁺ + Cl⁻, not the crystal |
| **Auto charge-balancing / valence "correction" of drawn ions** | Silently editing the structure breaks verbatim passthrough (MEMORY: never reconstruct) | Show the InChI of exactly what was drawn; presets carry correct charges in SMILES |
| **Disconnection diff visualization** (dimming dropped bonds) in v1.5 | Gated on unverified AuxInfo reliability for disconnected metals; research-heavy | Deferred to v2 per FEATURES.md; do not sneak into v1.5 |

---

## Sources

- This codebase, traced directly (HIGH): `src/lib/parseInchi.ts` (`formulaFragmentCounts`, `expandLayerText`, `enrichLayers`), `src/lib/highlightUtils.ts` (`q`/`p` cases — confirmed `q` does a plain `split(';')` and does **not** run through `expandLayerText`), `src/lib/parseAuxMapping.ts` (`remapAuxToPoolIds` coordinate matching, `EPSILON=0.05`, `NaN` placeholder preservation), `src/lib/layerInfo.ts` (`ELEMENT_NAMES`, `elementColor` allowlists; `q`/`p` blurbs and `readingFor`).
- `.planning/PROJECT.md` — verbatim-passthrough + no-remount invariants; D-row "c-layer test fixtures must be REAL InChI" (⚠ Lesson v1.4); v1.1 multi-fragment `/q`/`/p` highlight fix.
- `.planning/research/STACK.md` — no `/r` reachable; AuxInfo describes the disconnected structure; the one live verification gate.
- `.planning/research/FEATURES.md` — per-component `/q`/`/p` semantics, preset shortlist with ⚠ round-trip risks, anti-features, "absence is the lesson" pattern.
- Verified inorganic InChI strings (milestone context, cross-checked NIST/PubChem): ferrocene `1S/2C5H5.Fe/c2*1-2-4-5-3-1;/h2*1-5H;`; NaCl `1S/ClH.Na/h1H;/q;+1/p-1`; ferrocyanide `1S/6CN.Fe/c6*1-2;/q;;;;;;-4`; Prussian blue `1S/18CN.7Fe/c18*1-2;;;;;;;/q;;;;;;;;;;;;;;;;;;3*-4;4*+3`.
