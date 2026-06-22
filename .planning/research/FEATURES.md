# Feature Research

**Domain:** Inorganic / organometallic / salt explanation in an InChI explainer (v1.5 milestone)
**Researched:** 2026-06-22
**Confidence:** HIGH (InChI behavior + Ketcher API verified against primary sources; exact preset InChI strings verified for the two anchor presets)

---

## TL;DR for the requirements writer

The single most important finding reshapes the milestone:

> **The `/r` reconnected layer is UNREACHABLE with this app's stack and must be treated as an anti-feature, not a feature.**

`/r` is produced only by the InChI **`RecMet`** option, which makes the InChI **non-standard**. Ketcher's only InChI entry point is `getInchi(withAuxInfo?: boolean)` — a single boolean, **no flavor/options parameter** — so the app can only ever obtain **Standard InChI** (`InChI=1S/...`), which by definition never contains `/r`. (HIGH — verified against InChI Technical FAQ, Indigo InChI options page, and the documented Ketcher API signature.)

So the v1.5 teaching story is **not** "explain the reconnected layer." It is:

1. **Explain metal _disconnection_** — why the metal vanished into its own dot-separated component and the bonds you drew are gone from the connectivity layer. This is the real "aha" for inorganic chemists and is fully achievable from the Standard InChI the app already gets.
2. **Explain `/q` per-component charge + `/p` proton balance for salts/ions** — extend the already-shipped `q`/`p` layers (which already work for multi-fragment salts like CuSO₄, per v1.1) with salt-aware, per-component prose and highlighting.
3. **Inorganic presets** that make 1 and 2 vivid.

Everything below ties back to the core value: every chunk hoverable, explained, and linked to atoms. Note that for `/q`/`/p` the "linked to atoms" part is partly the lesson — disconnected metals and charge tokens highlight **whole components**, and the metal's bonds are deliberately *absent* from `/c`, which is itself the teaching point (mirrors the v1.3 InChIKey "absence is the lesson" pattern).

---

## Feature Landscape

### Table Stakes (Users Expect These)

A chemist who loads ferrocene or NaCl and sees an unfamiliar dot-separated formula will expect the tool to *explain why*, not just color it. These are the minimum to make v1.5 feel complete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Metal-disconnection explanation in the formula / `/c` / `/h` layers** — prose telling the user that InChI broke all bonds to the metal and split the species into dot-separated components | A chemist sees `2C5H5.Fe` and `/c2*1-2-4-5-3-1;` (the `;` with nothing after it = the Fe component has no bonds) and is confused unless told disconnection happened | MEDIUM | Per-component prose. The existing `formulaReading` already splits on `.` and renders multipliers (`2×`); extend with a note when a metal element is a standalone single-atom component. No change to the layer data model needed — the data is already there. |
| **`/q` charge layer: per-component reading** — for `/q;+1` say "component 1 (chloride): neutral; component 2 (sodium): +1" rather than the current flat "net charge: +1" | The current `q` blurb ("overall formal charge of the molecule") is **wrong for salts** — `/q` is per-component, semicolon-separated, and empty slots mean "this component is neutral" | MEDIUM | Verified: NaCl = `InChI=1S/ClH.Na/h1H;/q;+1/p-1`. The `;` before `+1` is the empty (neutral) chloride slot. Parser must split `q.text` on `;` and align to components. The `readingFor` `q` case currently returns a single flat string — needs per-component expansion mirroring the existing multi-fragment pattern in the `c`/`h`/`t` cases. |
| **`/q` / `/p` hover highlights the correct component's atoms** | Core value: hovering a charge token must light up *which* ions carry the charge | MEDIUM | v1.1 already fixed `/q` and `/p` highlighting for multi-fragment salts (CuSO₄). v1.5 should confirm it still works on the new presets and that hovering a *specific* per-component charge token (e.g. just the `+1`) highlights only that ion — likely needs sub-token hover, paralleling the c-layer CLYR work. |
| **At least a few inorganic presets** that load and render in Ketcher | Users need one-click examples to see the new behavior; nobody hand-draws ferrocene to test a tool | LOW | Presets are embedded SMILES loaded via `setMolecule`; the format already exists in `molecules.ts`. The only risk is whether a given SMILES round-trips through Ketcher standalone — must be live-checked (flag for STACK/verification). |
| **Corrected `q` / `p` legend + blurb copy** | The shipped `q` blurb describes whole-molecule charge; inorganic users will trust it and be misled on salts | LOW | One-line copy edit + the per-component expansion. Match the educational tone of `LAYER_INFO` (plain, second-person, one concrete worked example in `egLabel`/`eg`). |

### Differentiators (Competitive Advantage)

These make "Explain that InChI" the tool chemists recommend specifically for the confusing inorganic cases. None are required to ship, but each strengthens the core value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"Why is the metal gone?" callout when disconnection is detected** — a contextual explanation surfaced when the loaded structure triggers metal disconnection (a metal appears as its own formula component) | This is *the* moment of confusion for inorganic InChI. Surfacing it proactively (not only on hover) is genuinely differentiating — no other InChI tool explains the disconnection rule interactively | MEDIUM | Detect: a dot-separated formula component that is a single metal element with an empty `/c` slot. Heuristic only — maintain a small metal-element set. Tie into the existing explanation-card system; reuse the idle/hover precedence machinery. |
| **Disconnection diff visualization** — when hovering the metal component, dim the (now-absent) metal–ligand bonds on the canvas or annotate "these bonds were cut by InChI" | Makes the abstract disconnection rule physically visible on the drawing the user made — pure core-value payoff | HIGH | The canvas still *shows* the drawn dative/coordinate bonds; InChI dropped them. Highlighting "the bonds InChI ignored" requires mapping drawn bonds NOT present in `/c`. Novel highlight mode; flag as research-heavy. Defer if AuxInfo mapping for disconnected metals proves unreliable. |
| **Salt component breakdown panel** — for a multi-component salt, a small per-ion summary (formula · charge · proton offset) derived from `/q` + `/p` | Turns the opaque `/q;+1/p-1` into "Na⁺ + Cl⁻" in chemist-readable terms | MEDIUM | Pure derived view over already-parsed layers; no new Ketcher calls. Strong educational value, low risk. |
| **`/p` proton-balance salt prose** — explain that `/p-1` means one proton removed (e.g. HCl → Cl⁻) relative to the neutral drawn form | The `/p` layer is genuinely arcane; salts are where it actually shows up and where the explanation pays off | LOW-MEDIUM | Extend existing `p` blurb/reading with the salt framing. NaCl's `/p-1` is the canonical teaching example. |

### Anti-Features (Commonly Requested, Often Problematic)

These will be requested ("why doesn't it show the reconnected form / the real coordination bonds / a 3D complex?") and must be explicitly declined with rationale, to protect scope and the static-build constraint.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **`/r` reconnected-layer parsing & explanation** | The original milestone framing assumed `/r` is what users see for organometallics | **Unreachable with this stack.** `/r` requires the non-standard `RecMet` option; `ketcher.getInchi(withAuxInfo?)` exposes no options parameter and emits Standard InChI only. The app will *never* receive a `/r` layer. (HIGH — verified) | Explain **disconnection** (the thing that actually happens in Standard InChI) instead. If `/r` is ever wanted, it's a STACK-level change (different WASM/InChI invocation) — out of scope for v1.5. Flag explicitly. |
| **Drawing dative / coordinate bonds, then expecting them in `/c`** | Users want to draw ferrocene "correctly" with η⁵ or dative bonds | Even if Ketcher can draw a dative bond, **Standard InChI disconnects the metal regardless** — the bond will not appear in `/c`. Promising "draw the bond and see it" sets a false expectation | Teach that disconnection is *intentional InChI normalization*, independent of how the bond was drawn. The absent bond IS the lesson. |
| **3D coordination geometry / octahedral–tetrahedral viewer** | Coordination complexes are inherently 3D; users may expect geometry | Out of scope per PROJECT.md ("3D structure viewer — InChI is a 2D notation; 3D adds scope without illuminating InChI"). InChI carries no coordination geometry at all | None — stays a 2D notation explainer. Reaffirm the existing out-of-scope decision. |
| **Crystallographic / lattice / unit-cell structure for salts** | NaCl "is" a crystal; users might expect lattice info | InChI represents the discrete molecular/ionic species, not the solid-state lattice. Showing a lattice would misrepresent what InChI encodes | Explain that InChI describes the disconnected ions (Na⁺, Cl⁻), not the crystal — itself a useful clarification. |
| **Supporting the v1.07 "keep metal bonds" decision-tree behavior** | Recent InChI (v1.07, 2025) preserves some metal–ligand bonds | Ketcher 3.12.0 bundles an older InChI library; the new behavior is not available. Building UI assuming preserved bonds would be wrong for what the app actually emits | Build for what Ketcher emits today (full disconnection). Note the v1.07 development as a "the standard is evolving" footnote at most. (MEDIUM — exact bundled InChI version to confirm at STACK level.) |
| **Auto-charge-balancing / valence "correction" of drawn ions** | Users may draw `[Cl]` without a charge and expect the tool to fix it | The tool explains what InChI made of *their* drawing; silently editing the structure breaks the "verbatim passthrough" principle the project holds (see MEMORY: never reconstruct, always show library output) | Show the InChI of exactly what they drew; if it's odd, that's informative. Presets carry correct charges in SMILES. |

---

## Feature Dependencies

```
Inorganic presets (load via setMolecule)
    └──enable demonstration of──> Metal-disconnection explanation
                                       └──requires──> per-component formula/c/h reading (mostly EXISTS)

/q per-component reading
    └──requires──> split q.text on ';' + align to components (NEW)
    └──enhances──> Salt component breakdown panel
    └──pairs with──> /p proton-balance salt prose

/q / /p per-component HOVER highlight
    └──requires──> per-component charge sub-token hover (parallels shipped CLYR sub-hover work)
    └──depends on──> v1.1 multi-fragment q/p highlight fix (EXISTS — verify on new presets)

"Why is the metal gone?" callout
    └──requires──> disconnection detection heuristic (metal element as standalone component w/ empty /c slot)
    └──enhances──> Metal-disconnection explanation

Disconnection diff visualization (absent bonds)
    └──requires──> mapping drawn bonds NOT in /c  ──RISKY──> reliable AuxInfo mapping for disconnected metals

/r reconnected layer  ──CONFLICTS WITH──> ketcher.getInchi() (no options param)  [ANTI-FEATURE]
```

### Dependency Notes

- **Per-component `/q` reading requires a parser change, but a small one:** `q.text` is already captured as a layer; it just needs `.split(';')` and alignment to the formula's dot-separated components. The multi-fragment expansion machinery already exists in `readingFor` for `c`/`h`/`t` — follow that exact pattern. (HIGH)
- **`/q`/`/p` highlighting partly exists:** v1.1 fixed multi-fragment `q`/`p` highlighting (CuSO₄). v1.5's new work is *per-token* precision (hovering one component's `+1`), analogous to the CLYR-01..05 sub-token refinement shipped in v1.4. (HIGH)
- **Disconnection diff visualization conflicts with mapping reliability:** AuxInfo (`/rC:` coordinate matching, per v1.1) maps canonical→Ketcher atoms; whether it reliably maps a disconnected metal's drawn-but-dropped bonds is unverified. Gate this differentiator behind a live AuxInfo check on ferrocene/permanganate. (LOW confidence on feasibility — flag for STACK.)
- **All presets depend on Ketcher round-tripping the SMILES:** embedded SMILES → `setMolecule` → live InChI. Some inorganic SMILES (especially with explicit charges or unusual valences) may not parse cleanly in Ketcher standalone. Each proposed preset's SMILES must be live-verified before commit. (MEDIUM — flag for verification.)

---

## Inorganic Preset Shortlist (concrete, Ketcher-drawable, demonstrates the new layers)

Ordered simplest → most complex. SMILES are written for in-browser `setMolecule` loading. **Verify each round-trips in Ketcher standalone before shipping** (the ones marked ⚠ are most likely to need a fallback). Exact InChI shown where verified against a primary source; others are predicted from the documented disconnection rules (MEDIUM).

| # | Molecule | SMILES | Demonstrates | Expected Standard-InChI feature | Confidence |
|---|----------|--------|--------------|----------------------------------|-----------|
| 1 | **Sodium chloride** (NaCl) | `[Na+].[Cl-]` | Simplest salt; `/q` per-component + `/p` | `InChI=1S/ClH.Na/h1H;/q;+1/p-1` — empty `;` slot = neutral chloride, `+1` = sodium, `/p-1` = deprotonated | **HIGH (verified)** |
| 2 | **Potassium chloride** (KCl) | `[K+].[Cl-]` | Second simple salt; reinforces `/q;+1/p-1` with a different metal | `InChI=1S/ClH.K/h1H;/q;+1/p-1` (predicted, parallel to NaCl) | MEDIUM |
| 3 | **Sodium acetate** | `CC(=O)[O-].[Na+]` | Organic anion + metal cation; `/q` with a *carbon-containing* charged component | Acetate (−1) + Na (+1); `/q-1;+1` style | MEDIUM |
| 4 | **Ammonium chloride** | `[NH4+].[Cl-]` | Salt with **no metal at all** — shows `/q`/`/p` are about charge, not metals | Two-component `/q`; teaches disconnection ≠ metals-only | MEDIUM |
| 5 | **Sodium bicarbonate** | `OC([O-])=O.[Na+]` | Real-world salt; bicarbonate anion charge localization | Multi-component `/q`; `/p` proton balance | MEDIUM |
| 6 | **Magnesium chloride** (MgCl₂) | `[Mg+2].[Cl-].[Cl-]` | **Multi-charge + duplicated anion** → `N*` duplication in layers (ties into shipped CLYR-05) | `2Cl.Mg` style; `/q` with `+2` and duplicated chloride | MEDIUM |
| 7 | **Copper(II) sulfate** (CuSO₄) | `[Cu+2].[O-]S(=O)(=O)[O-]` | Already exercised in v1.1; confirms multi-fragment `/q` highlighting on a classic inorganic salt | Cu²⁺ + sulfate²⁻; `/q` per component | MEDIUM (v1.1 used it) |
| 8 | **Potassium permanganate** (KMnO₄) | `[K+].[O-][Mn](=O)(=O)=O` | High-charge metal-oxo; disconnects into K⁺ and permanganate; vivid `/q` | Permanganate anion + K⁺; metal-oxo disconnection | MEDIUM ⚠ (Mn valence/charge may need live check) |
| 9 | **Ferrocene** | `[cH-]1cccc1.[cH-]1cccc1.[Fe+2]` (fallback: `C1=CC=C[CH]1.C1=CC=C[CH]1.[Fe]`) | **The anchor organometallic** — metal fully disconnected; `2C5H5.Fe`; empty `/c...;` slot for Fe; `N*` duplication of the two rings | `InChI=1S/2C5H5.Fe/c2*1-2-4-5-3-1;/h2*1-5H;` — note **no `/q`** (rings written neutral) and the trailing `;` = Fe has no connectivity | **HIGH (verified)** ⚠ (SMILES must round-trip; iron sandwich is the hardest to draw) |
| 10 | **Hexaamminecobalt(III) chloride** | `[Co+3].N.N.N.N.N.N.[Cl-].[Cl-].[Cl-]` | Classic coordination complex; massive disconnection into Co³⁺ + 6 NH₃ + 3 Cl⁻; extreme multi-component `/q` | Many components; `/q` with `+3` and duplicated neutrals/anions | LOW ⚠ (large component count; likely needs Ketcher live check / may be too complex — keep as stretch) |
| 11 | **Silver nitrate** (AgNO₃) | `[Ag+].[O-][N+](=O)[O-]` | Metal cation + polyatomic oxo-anion; nitrate's internal `+/−` charges plus the component net charge — good `/q` vs internal-charge teaching | Ag⁺ + nitrate; `/q` per component | MEDIUM |
| 12 | **Calcium carbonate** (CaCO₃) | `[Ca+2].[O-]C([O-])=O` | Common, recognizable; divalent cation + divalent anion | Ca²⁺ + carbonate²⁻; `/q` two-component | MEDIUM |

**Recommended shipping core (start here, all high-value, lower-risk):** #1 NaCl, #2 KCl, #6 MgCl₂, #7 CuSO₄, #9 ferrocene, #11 AgNO₃, #4 NH₄Cl. These cover: simplest salt, multi-charge + duplication, classic inorganic salt, the organometallic anchor, polyatomic oxo-anion, and the "charge isn't only about metals" case. Add #8 KMnO₄ and #10 hexaamminecobalt only after confirming they round-trip in Ketcher standalone.

**Rationale anchors:**
- **Ferrocene (#9)** is the headline demo: it shows disconnection + `N*` ring duplication + the empty connectivity slot for Fe, all in one verified string, and it is the molecule chemists most associate with "weird InChI."
- **NaCl (#1)** is the headline `/q`+`/p` demo: the verified `/q;+1/p-1` is the cleanest possible illustration of "empty slot = neutral component" and "proton offset."
- **MgCl₂ (#6)** connects v1.5 to the already-shipped `N*` duplicate-fragment highlighting (CLYR-05) — a duplicated chloride.
- **NH₄Cl (#4)** prevents the misconception that disconnection/`/q` is a metals-only phenomenon.

---

## MVP Definition

### Launch With (v1.5 core)

- [ ] **Corrected `/q` semantics: per-component charge reading + corrected blurb** — the shipped blurb is wrong for salts; smallest, highest-value fix. (table stakes)
- [ ] **Metal-disconnection explanation prose** in the formula/connectivity reading — explain the dot-separated metal component and the empty `/c` slot. (table stakes)
- [ ] **`/q` / `/p` per-component hover highlighting verified + made token-precise** on the new presets. (table stakes)
- [ ] **Inorganic preset core set** (NaCl, KCl, MgCl₂, CuSO₄, ferrocene, AgNO₃, NH₄Cl) — each live-verified to round-trip. (table stakes)
- [ ] **`/p` salt prose** (proton offset framed via HCl→Cl⁻). (low cost, pairs with `/q`)

### Add After Validation (v1.5.x / fast-follow)

- [ ] **"Why is the metal gone?" proactive callout** on detected disconnection. (differentiator)
- [ ] **Salt component breakdown panel** (per-ion formula · charge · proton offset). (differentiator)
- [ ] **KMnO₄ and hexaamminecobalt presets** once Ketcher round-trip confirmed. (preset depth)

### Future Consideration (v2+)

- [ ] **Disconnection diff visualization** (highlight bonds InChI dropped) — gated on AuxInfo reliability for disconnected metals; research-heavy. (differentiator)
- [ ] **`/r` reconnected layer** — only if the stack ever moves off `getInchi()` to an options-capable InChI invocation. Currently an anti-feature. (blocked)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Corrected `/q` per-component reading + blurb | HIGH | LOW–MEDIUM | P1 |
| Metal-disconnection explanation prose | HIGH | MEDIUM | P1 |
| `/q`/`/p` per-component hover highlight (verify + token-precise) | HIGH | MEDIUM | P1 |
| Inorganic preset core set | HIGH | LOW (data) + verify | P1 |
| `/p` salt proton-balance prose | MEDIUM | LOW | P1 |
| "Why is the metal gone?" callout | HIGH | MEDIUM | P2 |
| Salt component breakdown panel | MEDIUM | MEDIUM | P2 |
| KMnO₄ / hexaamminecobalt presets | MEDIUM | LOW + verify | P2 |
| Disconnection diff visualization | HIGH | HIGH | P3 |
| `/r` reconnected layer | (would be HIGH) | BLOCKED | — (anti-feature) |

---

## Competitor / prior-art note

The relevant "competitor" is the official InChI documentation and PubChem's own InChI display — neither explains disconnection *interactively* or links charge tokens to atoms on a canvas. The differentiator for this tool is exactly the core value: making the disconnection rule and per-component charge **hoverable, explained, and tied to the drawing**. No competitor analysis changes the recommendations above.

---

## Sources

- InChI Technical FAQ — metal disconnection, reconnected `/r` layer, RecMet/FixedH being non-standard, per-component `;` semantics: <https://www.inchi-trust.org/technical-faq/>
- InChI, the IUPAC International Chemical Identifier (J. Cheminformatics) — disconnection of metal bonds, reconnected layer definition: <https://jcheminf.biomedcentral.com/articles/10.1186/s13321-015-0068-4>
- Indigo InChI options (RecMet listed; default = standard): <https://lifescience.opensource.epam.com/indigo/options/inchi.html>
- Ketcher README / API (`getInchi(withAuxInfo?: boolean)` — single boolean, no options param): <https://github.com/epam/ketcher/blob/master/README.md>
- Ferrocene Standard InChI (`InChI=1S/2C5H5.Fe/c2*1-2-4-5-3-1;/h2*1-5H;`) — PubChem CID 10219726 / NIST WebBook: <https://pubchem.ncbi.nlm.nih.gov/compound/Ferrocene>
- Sodium chloride Standard InChI (`InChI=1S/ClH.Na/h1H;/q;+1/p-1`) — NIST WebBook: <https://webbook.nist.gov/cgi/cbook.cgi?ID=C7647145>
- "Making InChI FAIR and Sustainable for Inorganic Chemistry" (v1.07 decision-tree behavior; FeCl₂ disconnection example): <https://hunterheidenreich.com/notes/chemistry/molecular-representations/notations/inchi-2025/>

---
*Feature research for: inorganic/organometallic/salt capabilities in an InChI explainer*
*Researched: 2026-06-22*
