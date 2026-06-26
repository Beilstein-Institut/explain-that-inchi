# Feature Research — Sub-token explanation content (milestone v1.5)

**Domain:** Chemistry education / InChI notation explainer copy
**Researched:** 2026-06-26
**Confidence:** HIGH (chemistry verified against InChI Technical Manual + JCheminf InChI paper + Hill 1900 convention)

> Supersedes the 2026-06-22 FEATURES.md, which scoped a different v1.5 direction (inorganic/organometallic/salt presets). Current PROJECT.md scope is **sub-token-specific explanations**.

This is a **content/pedagogy** research file, not a tech-stack file. The deliverable is chemically-correct, ready-to-adapt card copy for three sub-token families, classified table-stakes / nice-to-have / anti-feature. Voice target = the existing cards: terse chemist-register, 1–3 sentences, plain but precise (`layerInfo.ts` `LAYER_INFO`, `inchiKeyInfo.ts` `KEY_ZONE_COPY`).

**Audience:** chemistry-literate, InChI-naive. They know what CH₃, a stereocenter, and a molecular formula are. They do NOT know what an InChI parity sign means or what a `(H,...)` group is. Do not re-teach chemistry; teach the *notation*.

---

## Audience truth (the through-line)

A reader already understands the **chemistry**. What they lack is the mapping from **InChI syntax → chemistry they already know**, plus the places where InChI's bookkeeping is *not* the chemistry concept it superficially resembles (H-count ≠ functional group; parity ≠ R/S). Every card should do one of two jobs: (a) translate a token into something they recognise, or (b) warn them off a false friend. The most valuable cards in this milestone are the false-friend warnings — that is exactly what the domain-expert user flagged.

---

## Feature Landscape

### Table Stakes (must include to be correct/useful)

| Sub-token | Card must say | Complexity | Notes |
|-----------|---------------|------------|-------|
| `H` (1 H on atom N) | "Atom N carries **one** hydrogen." | LOW | Existing `readingFor` already emits "bears 1H". Card just needs the why. |
| `H2` group | "Each named atom carries **two** hydrogens." | LOW | |
| `H3` group | "Each named atom carries **three** hydrogens." | LOW | **Anti-feature trap: do NOT say "methyl".** See below. |
| Range `1-6H` | "Every atom in the range 1–6 carries one H." | LOW | Already handled in `readingFor`. |
| Mobile `(H,X,Y)` | "A **mobile (tautomeric) hydrogen** shared across atoms X and Y — InChI records the *group*, not a fixed position." | MEDIUM | The single highest-value H card. Most chemists have never seen this notation. |
| t-layer `atomN+` / `atomN-` | "A tetrahedral (sp³) **stereocenter** at atom N. The sign is a **parity** of the canonical neighbour order — **not** R/S." | MEDIUM | The headline card of the milestone. Caveat is mandatory. |
| Formula element `C7`, `O`, … | Element **name** + "count of that element's atoms in the molecule" + Hill-order note. | LOW | Needs a **full** element table — current `ELEMENT_NAMES` has only 10. |

#### Ready-to-adapt phrasings — Hydrogen layer

These match the `{ label, title, body }` shape used by `KEY_ZONE_COPY` and the card voice.

- **`H` (one hydrogen):**
  > "Atom N carries **one** hydrogen. The h-layer records *how many* hydrogens sit on each heavy atom — the count InChI factors out of the connection layer, not where any single H is bonded in a drawing."

- **`H2`:**
  > "Each atom named here carries **two** hydrogens (a –CH₂– / –NH₂-type count, depending on the element). The number after H is the per-atom hydrogen count."

- **`H3`:**
  > "Each atom named here carries **three** hydrogens. On carbon that's a CH₃ *count* — but the h-layer states a hydrogen tally, not that the group is a methyl; the connection layer is what makes it terminal."

  *(The conditional clause is the correctness guard. See anti-features.)*

- **Mobile / tautomeric `(H,4,5)` or `(H,X,Y)`:**
  > "A **mobile hydrogen**: InChI can't pin this H to one atom because the molecule tautomerises, so it records the H as **shared across the listed atoms** (here 4 and 5). A leading number gives the count — `(2H,...)` means two mobile H. This is how InChI gives every tautomer one identifier."

  Correctness anchors (InChI Technical Manual; EPAM "InChI tautomers"; JCheminf 2015):
  - Mobile-H groups are the mechanism by which **tautomers collapse to one standard InChI** — say this, it is the "aha".
  - Format is `(nH, atom, atom, …)` where leading `n` (omitted when 1) is the **count of mobile H**, followed by the **skeletal atoms** that share them.
  - InChI perceives 1,3- (and limited 1,4-/1,5-) H transfer; for v1.5 it is correct and sufficient to explain it as "mobile hydrogen(s) shared by these atoms." Do not over-specify the migration paths or charge cases.

#### Ready-to-adapt phrasings — Tetrahedral stereo (t-layer)

This is the card the user singled out ("most people don't understand what the tetrahedral stereo layer means"). Decision already made: plain-language 3D handedness + explicit parity≠R/S caveat.

- **`atomN+` / `atomN-` (per stereocenter):**
  > "A tetrahedral **stereocenter** at atom N — an sp³ atom whose four different substituents have a fixed 3-D handedness (a left- vs right-handed arrangement in space). The **+ / −** is a **parity**: whether the canonical atom numbers of the neighbours run clockwise (+) or anticlockwise (−) when viewed from the lowest-numbered neighbour. It's InChI's own bookkeeping sign — **not R/S.** A '+' does not mean R, and the same centre can flip sign purely because the canonical numbering changed."

  Correctness anchors (verified):
  - Parity is **+** when neighbour canonical numbers **increase clockwise** viewed from the H or the lowest-canonical-numbered neighbour (InChI Technical Manual; confirmed). Phrase as "viewed from the lowest-numbered neighbour" — accurate and accessible.
  - "These marks have **no relation to R,S** … InChI does not use CIP rules and deduces parities from its own canonical numbers" (JCheminf 2015, direct). The caveat is not hedging — it is the documented fact.
  - **m-layer / s-layer (mention, do not deep-dive):** add one sentence only when the centre also implicates them, e.g.:
    > "Enantiomers share the same t-layer parities and differ only in the **/m** flag (0 vs 1 = take the mirror image); the **/s** flag says whether the configuration is absolute, relative, or racemic."
  This is already correctly stated in `LAYER_INFO.m` / `LAYER_INFO.s` and `readingFor` — reuse, don't re-author.

#### Ready-to-adapt phrasings — Formula elements

- **Per element on hover (e.g. `C7`):**
  > "**Carbon** — there are **7** carbon atoms in the molecule. The formula lists *what* and *how many* of each heavy-atom element (plus the total hydrogen count) in **Hill order**: carbon first, hydrogen next, then every other element alphabetically by symbol."

- **Element with implicit count of 1 (e.g. `O`):**
  > "**Oxygen** — **one** oxygen atom (no number means a count of one)."

- **The `H` total in the formula (distinct from the h-layer!):**
  > "**Hydrogen** — the **total** hydrogen count for the whole molecule. (Where each H sits is in the separate h-layer.)"

  *This distinction is a correctness must: the formula-H is a sum; the h-layer is per-atom. A reader hovering "H10" in the formula and "1H3" in the h-layer must not think they contradict.*

### Differentiators / nice-to-have enrichment

| Enrichment | Value | Complexity | Verdict |
|------------|-------|------------|---------|
| Full periodic-table symbol→name table (all 118) | Lets *any* drawn molecule's formula explain every element, not just the 10 organic-chem staples | LOW (static map) | **Recommended** — the milestone explicitly asks for it. See table below. |
| Hill-order note on formula hover | Explains *why* C and H come first then alphabetical — the "what's in it before structure" framing already in `LAYER_INFO.formula` | LOW | **Recommended**, reuse existing blurb wording. |
| "no-carbon ⇒ all alphabetical" Hill nuance | Correct for inorganic/no-C fragments | LOW | Nice-to-have; only surfaces on carbon-free fragments. One clause. |
| H-group: relate H2/H3 to familiar CH₂/CH₃ *counts* | Anchors notation to known chemistry | LOW | Nice-to-have, **only with the "count not group" guard**. |
| Mobile-H: name a concrete example (carboxylate, imidazole, amide) | Makes tautomer abstraction concrete | LOW | Nice-to-have; risky to hardcode per-molecule, keep generic. |
| t-layer: "viewed from lowest-numbered neighbour" geometric detail | Precise; some chemists want the exact rule | LOW | Nice-to-have; include since it's short and correct. |
| Element trivia (atomic number, group, mass) | — | LOW | **Skip.** Not about the InChI. See anti-features. |

#### Full element symbol→name table (for the formula layer)

The current `ELEMENT_NAMES` in `layerInfo.ts` has 10 entries. A drawn molecule can legitimately contain any element Ketcher supports. Recommend extending to the full table (IUPAC standard names):

```
H hydrogen   He helium    Li lithium    Be beryllium  B boron      C carbon
N nitrogen   O oxygen     F fluorine    Ne neon       Na sodium    Mg magnesium
Al aluminium Si silicon   P phosphorus  S sulfur      Cl chlorine  Ar argon
K potassium  Ca calcium   Sc scandium   Ti titanium   V vanadium   Cr chromium
Mn manganese Fe iron      Co cobalt     Ni nickel     Cu copper    Zn zinc
Ga gallium   Ge germanium As arsenic    Se selenium   Br bromine   Kr krypton
Rb rubidium  Sr strontium Y yttrium     Zr zirconium  Nb niobium   Mo molybdenum
Tc technetium Ru ruthenium Rh rhodium   Pd palladium  Ag silver    Cd cadmium
In indium    Sn tin       Sb antimony   Te tellurium  I iodine     Xe xenon
Cs caesium   Ba barium    La lanthanum  Ce cerium     Pr praseodymium Nd neodymium
Pm promethium Sm samarium Eu europium   Gd gadolinium Tb terbium   Dy dysprosium
Ho holmium   Er erbium    Tm thulium    Yb ytterbium  Lu lutetium  Hf hafnium
Ta tantalum  W tungsten   Re rhenium    Os osmium     Ir iridium   Pt platinum
Au gold      Hg mercury   Tl thallium   Pb lead       Bi bismuth   Po polonium
At astatine  Rn radon     Fr francium   Ra radium     Ac actinium  Th thorium
Pa protactinium U uranium  Np neptunium  Pu plutonium  Am americium Cm curium
Bk berkelium Cf californium Es einsteinium Fm fermium  Md mendelevium No nobelium
Lr lawrencium Rf rutherfordium Db dubnium Sg seaborgium Bh bohrium  Hs hassium
Mt meitnerium Ds darmstadtium Rg roentgenium Cn copernicium Nh nihonium Fl flerovium
Mc moscovium Lv livermorium Ts tennessine Og oganesson
```

**Spelling note:** the existing table uses "sulfur" (IUPAC-accepted). Keep "sulfur" and "aluminium" and stay consistent with one English variant. The fallback in `formulaSegmentReading` already degrades to the bare symbol when a name is missing, so an incomplete table is *safe* — extending it is strictly enrichment, not a correctness blocker.

### Anti-Features (WRONG or over-claiming — do NOT include)

| Anti-feature | Why it's tempting | Why it's wrong | Do instead |
|--------------|-------------------|----------------|------------|
| **H3 → "this is a methyl group"** | CH₃ looks like methyl | The h-layer states a **hydrogen count**, not a functional group. Whether atom-with-3H is methyl depends on the **connection layer** (it must also be terminal). N with 3H is not methyl. | Say "carries three hydrogens"; mention CH₃ only as a *count* with the "the c-layer makes it terminal" guard. |
| **Parity + → "R", − → "S"** (any fixed mapping) | + / − and R / S both label chirality | **Explicitly false.** InChI parity is from canonical numbering, not CIP. There is *no* consistent +↔R mapping; the same centre's sign can flip with renumbering (JCheminf 2015, verbatim). | State the caveat as a fact, in the headline card. |
| **"This stereocenter is (R)" / naming CIP descriptors** | Chemists want R/S | InChI does not compute CIP. Asserting R/S would fabricate data the tool does not have. | Stop at "handedness fixed; sign is parity, not R/S." |
| **Mobile-H → "this proton moves / is delocalised right now"** | Tautomer intuition | InChI's mobile-H is a **normalisation bookkeeping device** for one identifier across tautomers — not a claim about physical delocalisation in a given drawn form. | "InChI records the H as shared across these atoms so all tautomers get one identifier." |
| **Formula H-count = h-layer claim** | Both mention H | Formula H is the **molecular total**; h-layer is **per heavy atom**. Conflating them is a factual error. | Distinguish explicitly on the formula-`H` card (see phrasing above). |
| **Element trivia: atomic number, group, mass, electron config** | "More is better" | None of it is about reading the InChI; it's encyclopaedia bloat that dilutes the tool's job and the terse card voice. | Name + count + Hill-order. Stop. |
| **Re-deriving / re-rendering the H or stereo from parsed parts** | — | Violates the project's #1 invariant (verbatim Ketcher output; never reconstruct — memory `feedback_inchi_passthrough`). | Card explains the *verbatim* token; never rebuilds the string. |
| **Per-stereocenter "left/right-handed" as if absolute** | Plain-language goal | "Handedness" is fine as intuition, but don't imply the sign alone tells you *which* hand — that needs the m-layer. | "a fixed 3-D handedness" + one-line m-layer mention. |

---

## Feature Dependencies

```
Sub-token card content (this milestone)
    └──requires──> subHover / pinned-sub precedence tier in Explanation.tsx
                       (PROJECT.md: card currently reads only hoverIdx/pinned)

Formula-element card
    └──requires──> full ELEMENT_NAMES table (extend existing 10-entry map)

H-group cards ──reuse──> readingFor() h-branch (already emits "bears kH")
Mobile-H card ──reuse──> parseMobileHydrogens() (already parses the group)
t-layer card  ──reuse──> parseStereoParities() (already emits {atom: sign})
                ──mentions──> LAYER_INFO.m / LAYER_INFO.s (already authored, reuse verbatim)
```

### Dependency notes

- **All three families already have working parsers and highlight infra** (PROJECT.md INCHI-04/05/08, CLYR-*). This milestone is *copy*, not new parsing. The risk is chemical correctness, not code.
- **The card-precedence tier is the only structural change** and is already scoped in PROJECT.md. Content slots into it.
- **m/s-layer content already exists** in `layerInfo.ts` — the t-layer card should *reference* it, not duplicate it.

---

## MVP Definition

### Launch with (v1.5)

- [ ] H sub-token cards: `H` / `H2` / `H3` / range — **count semantics, no functional-group claim**
- [ ] Mobile-H `(H,X,Y)` card — shared/tautomeric explanation + "one identifier for all tautomers" hook
- [ ] t-layer per-stereocenter card — handedness + **parity≠R/S caveat (mandatory)**
- [ ] Formula per-element card — name + count + Hill-order note; formula-H ≠ h-layer guard
- [ ] Full element name table

### Add after validation (later)

- [ ] Mobile-H concrete example naming (carboxylate / amide / imidazole) — only if users ask
- [ ] No-carbon Hill nuance clause — only surfaces on inorganic fragments
- [ ] b-layer (double-bond E/Z) sub-token cards — same parity-≠-E/Z pattern as t-layer; natural next milestone, out of scope here

### Future / defer

- [ ] Interactive "why did this sign flip when I renumbered" demo — illustrates parity≠R/S but is a whole feature, not copy

## Feature Prioritization Matrix

| Content piece | User value | Authoring cost | Priority |
|---------------|------------|----------------|----------|
| t-layer parity≠R/S caveat | HIGH (user-requested headline) | LOW | P1 |
| Mobile-H explanation | HIGH (notation nobody knows) | LOW | P1 |
| H/H2/H3 count cards | HIGH | LOW | P1 |
| Per-element name + count | HIGH | LOW | P1 |
| Full element table | MEDIUM | LOW | P1 |
| Hill-order note | MEDIUM | LOW | P2 |
| m/s one-line mention on t-card | MEDIUM | LOW (reuse) | P2 |
| Mobile-H concrete examples | LOW | LOW | P3 |

## Competitor / prior-art reference

| Aspect | PubChem / typical viewer | This tool's approach |
|--------|--------------------------|----------------------|
| Stereo display | Shows InChI raw, or CIP R/S separately — never explains the parity sign | Explain the *parity itself* and that it isn't R/S — the gap nobody fills |
| Mobile-H | Shown raw in the string; unexplained | Plain-language tautomer-normalisation card |
| Formula | Static formula | Per-element hover with Hill rationale |

The differentiator is consistent with PROJECT.md Core Value: *every chunk is hoverable and explained*. No competing tool explains the **sub-token semantics**; that is the whole product.

## Sources

- [InChI Technical Manual (InChI Trust PDF)](https://www.inchi-trust.org/download/104/InChI_TechMan.pdf) — parity definition, mobile-H group format — HIGH
- [InChI, the IUPAC International Chemical Identifier — J. Cheminformatics 2015](https://jcheminf.biomedcentral.com/articles/10.1186/s13321-015-0068-4) — "no relation to R,S … InChI does not use CIP rules"; mobile-H normalisation; m-layer enantiomer role — HIGH
- [EPAM "InChI tautomers" PDF](https://lifescience.opensource.epam.com/_downloads/52fcb4ab88eb6e0c6fd6f7cda2a7187d/Inchi%20tautomers.pdf) — mobile-H / tautomer perception (1,3/1,4/1,5-H transfer) — HIGH
- [InChI Technical FAQ](https://www.inchi-trust.org/technical-faq/) — parity sign and canonical-number basis — HIGH
- [Hill system — Chemical formula, Wikipedia (Hill 1900)](https://en.wikipedia.org/wiki/Chemical_formula) — C first, H next, rest alphabetical; no-C ⇒ all alphabetical — HIGH
- IUPAC standard element names (periodic table) — symbol→name table — HIGH
- Existing project code: `src/lib/layerInfo.ts`, `src/lib/inchiKeyInfo.ts` — voice/shape model — HIGH

---
*Feature research for: InChI sub-token explanation copy (v1.5)*
*Researched: 2026-06-26*
