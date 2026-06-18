# Feature Research — v1.3 InChIKey Display & Explanation

**Domain:** Educational chemistry web tool — adding a color-coded, hoverable, explained InChIKey strip below the existing InChI strip in "Explain that InChI"
**Researched:** 2026-06-18
**Confidence:** HIGH (InChIKey segment structure cross-verified across the IUPAC InChI paper, Wikipedia, and the InChI Trust Technical FAQ)

> Supersedes the v1.2 feedback research previously in this file (preserved in the v1.2 milestone archive). This file is scoped to the v1.3 InChIKey feature.

---

## Part 1 — The InChIKey Structure (Authoritative Reference)

This is the citable, segment-by-segment ground truth the explanation-content authors must encode. **All character counts are confirmed across three authoritative sources.**

### Canonical format

```
AAAAAAAAAAAAAA - BBBBBBBB F V - P
└────14─────┘  ╵ └──8──┘ │ │ ╵ └1┘
  block 1     hyphen  block2 │ │ hyphen  protonation
                            flag version
```

Worked example — **L-alanine: `QNAYBMKLOCPYGJ-REOHCLBHSA-N`**

| Segment | Chars | This example | Meaning |
|---------|-------|--------------|---------|
| First block | 14 | `QNAYBMKLOCPYGJ` | skeleton / connectivity hash |
| (hyphen) | 1 | `-` | separator |
| Second block | 8 | `REOHCLBH` | hash of remaining ("minor") layers: stereo, isotope, etc. |
| Flag char | 1 | `S` | standard (`S`) vs non-standard (`N`) InChI |
| Version char | 1 | `A` | InChI algorithm version (`A` = version 1) |
| (hyphen) | 1 | `-` | separator |
| Protonation char | 1 | `N` | net proton change (`N` = neutral) |

**Total: 14 + 1 + 8 + 1 + 1 + 1 + 1 = 27 characters, always.** Letters only (A–Z), no digits, no lowercase, fully ASCII — deliberately chosen to be URL- and database-search-friendly.

> **CRITICAL FORMATTING NOTE for content authors:** The flag (`F`) and version (`V`) characters are **appended directly onto the end of the 8-char second block with NO internal hyphen** — they are positions 24 and 25 of the string. The full string has exactly **two hyphens** (after char 14, and after char 25). Do NOT render `...-S-A-N`; it is `...REOHCLBHSA-N`. The visible middle segment between the two hyphens is therefore **10 characters**: 8 hash chars + `S`/`N` flag + `A` version. (Confidence: HIGH — verified against the L-alanine reference example.)

### Segment 1 — First block (14 chars): skeleton / connectivity hash

- A **truncated SHA-256 (SHA-2, 256-bit) hash**, base-26 encoded (A–Z) for readability. (HIGH)
- Encodes the **molecular skeleton / connectivity** — the InChI main layer: chemical formula, atom connections (`/c`), the hydrogen layer (`/h`), and the charge `/q` sublayer. It captures the constitution of the molecule **without** stereochemistry or isotope detail. (HIGH)
- Teach this consequence: **two molecules sharing the first 14 chars are constitutional matches** (same skeleton) — which is why first-block / partial-key search is a common database technique. Stereoisomers and isotopologues of one compound share block 1 but differ in block 2.
- No natural sub-token boundary inside block 1 — it is one opaque hash. Color as a single unit.

### Segment 2 — Second block (8 chars): remaining-layers hash

- Also a **truncated SHA-256 hash**, base-26 encoded. (HIGH)
- Encodes the **"minor" layers**: stereochemistry, isotopic substitution, and (for non-standard InChI) the exact position of mobile/tautomeric hydrogens and metal-ligation data. (HIGH)
- Teach this: a molecule with **no stereo/isotope info still has a non-empty second block** — the hash of "no minor layers" is itself a fixed string; it is never blank. Different stereoisomers differ here while sharing block 1.
- No natural sub-token boundary inside the 8 hash chars. Color as a single unit.

### Segment 3 — Flag character (1 char, position 24): standard vs non-standard

- `S` = **Standard InChIKey** (generated from a Standard InChI — the default, overwhelmingly common case). (HIGH)
- `N` = **Non-standard InChIKey** (generated from a non-default InChI). (HIGH)
- This tool uses Ketcher/WASM standard InChI, so this char will essentially always be `S`. The card should still teach what `N` means.

### Segment 4 — Version character (1 char, position 25): InChI algorithm version

- `A` = **version 1** of the InChI algorithm (the only version in production use). `B` is reserved for a future version 2. (HIGH)
- Always `A` in practice today. Teach as "which generation of the InChI software produced this key."

> The flag (`S`/`N`) and version (`A`) are two distinct 1-char fields sitting adjacent with no separator. Combining them into one "version/flag" hover region is the recommended simplification (see Part 3).

### Segment 5 — Protonation character (1 char, position 27): net protonation

- Encodes the **net protonation / deprotonation of the core parent structure**, corresponding to the InChI `/p` charge sublayer. Protonation is deliberately **NOT hashed** — it is carried as this separate trailing flag so protonation variants of one compound differ only in the last character. (HIGH)
- Full mapping (HIGH — confirmed in the IUPAC paper + InChI Trust FAQ):

  | Char | Net protons | | Char | Net protons |
  |------|-------------|-|------|-------------|
  | `N`  | 0 (neutral) | | | |
  | `O`  | +1 | | `M` | −1 |
  | `P`  | +2 | | `L` | −2 |
  | `Q`  | +3 | | `K` | −3 |
  | `R`  | +4 | | `J` | −4 |
  | ...  | up the alphabet adds protons | | ... | down the alphabet removes protons |

  Mnemonic: `N` is the neutral center; walk **up** the alphabet (`O, P, Q…`) to **add** protons, **down** (`M, L, K…`) to **remove** them.
- Edge case to footnote (not foreground): if the net change exceeds ±12 protons the flag saturates to `A` and can no longer distinguish further. Extremely rare. (MEDIUM)

### Properties to teach (already scoped IN — confirmed correct)

- **Fixed 27-character length** regardless of molecule size — a 6-atom molecule and a 600-atom protein both yield a 27-char key. This is the headline "why it's useful" point. (HIGH)
- **Derived hash, web/DB-search friendly:** letters-only, fixed length, no problematic characters → ideal as a Google search token, a database key, or a URL fragment. This is the *primary real-world use* of an InChIKey. (HIGH)
- **One-way / not reversible:** being a truncated cryptographic hash, **the InChI (and thus the molecule) cannot be reconstructed from the InChIKey.** A structure is only recoverable via a resolver/lookup service that already has the key→structure mapping indexed (PubChem, the NCI/CADD resolver). (HIGH)
- **No atom mapping:** unlike the InChI layers in this tool, InChIKey segments are hashes — **they do NOT map to specific atoms/bonds.** The explanation must say this explicitly so users don't expect canvas highlighting on hover. This is the central UX contrast with the InChI strip (see Dependencies). (HIGH)
- **Collision caveat:** collisions are *theoretically* possible (it is a lossy hash) but vanishingly rare. Citable framings: ~1 duplication per 75 databases of 1 billion unique structures each (Wikipedia); resistance on the order of ~2.2×10¹⁵ structures; an experimental study of ~77 million real+generated structures found effectively no real-world collisions (a couple of contrived/computer-generated stereoisomer edge cases are documented). **Teaching framing: the InChIKey is for lookup and indexing, not a cryptographic proof of identity — always confirm a hit against the full InChI.** (HIGH)

---

## Part 2 — Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| InChIKey displayed live below the InChI strip | The milestone's whole point; mirrors the existing InChI display | LOW | Computed from same WASM source as the InChI (open question: ketcher API to obtain the key) |
| Correct 27-char segmentation rendered | Educational accuracy is the product; wrong counts = broken tool | LOW | Use the exact boundaries in Part 1; remember only TWO hyphens |
| Per-segment color-coding | The InChI strip sets this expectation; visual parity required | LOW | Reuse the oklch token system; tokens per Part 3 |
| Per-segment hover explanation card | Core value ("every chunk hoverable, explained") | MEDIUM | Reuse the existing left explanation-card component + reading-code pattern |
| Copy-to-clipboard button (verbatim key) | InChI already has PLSH-04; asymmetry would feel broken | LOW | Clone PLSH-04; copy the exact key string with visual confirmation |
| Explain block structure + purpose + one-way-hash + collision caveat | Explicitly scoped in; this IS the educational payload | MEDIUM | Content from Part 1; the work is concise, correct prose |
| Empty/invalid structure → placeholder, not error | Matches PLSH-01 behavior of the InChI strip | LOW | Reuse the existing placeholder pattern; the key is absent when the canvas is empty |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Explicit "this is a hash → no atoms highlight" teaching moment | Turns the *absence* of canvas highlighting into a lesson, pre-empting confusion | LOW | A short note in the idle/hover card; cheap, high pedagogical value |
| "First block = same skeleton" insight | Teaches the practical DB-search technique (first-block / partial match) | LOW | One sentence in the block-1 card |
| Protonation-char live demo via a charged preset | If a preset is charged/protonated, the last char visibly changes — memorable | MEDIUM | Depends on a charged species being among presets; else a static explanation |
| "Search this key on the web / PubChem" affordance | The killer real-world use is pasting the key into Google/PubChem | LOW–MED | A small outbound link; just an external link, consistent with the no-backend/static ethos |
| Standard-vs-nonstandard (`S`/`A`) explained even though always `S`/`A` here | Completeness; rewards curious users without cluttering the common path | LOW | Keep inside the flag/version card, not the main strip prose |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Highlight canvas atoms on InChIKey-segment hover | The InChI strip does it, so symmetry is assumed | **Impossible & misleading** — segments are one-way hashes with no atom correspondence; faking it teaches a falsehood | Explicitly explain *why no highlight*; this is the core hash lesson |
| Reconstruct / "decode" the molecule from a pasted InChIKey | Looks like the natural inverse feature | One-way hash — impossible locally; would need a resolver backend, violating the no-backend constraint | Link out to an external resolver (PubChem / NCI) as documentation, not a built-in feature |
| Show the raw SHA-256 hex / base-26 math | "Show your work" appeal | Adds noise, implies the hash is reversible/inspectable, distracts from the lesson | One sentence: "truncated SHA-256, base-26 encoded"; link to the spec for the curious |
| InChIKey-based substructure/database search in-app | Feels like a natural companion | Out of scope per PROJECT.md; shifts product identity, needs data/backend | External "search the web for this key" link only |
| Editable / paste-in InChIKey field | Users may want to look up an arbitrary key | Cannot derive a structure from it (one-way); produces nothing locally | Keep input via the Ketcher canvas only; output-only key display |
| Animating/decomposing the hash | Visual flair | Misrepresents hashing as a stepwise reversible transform | Static color-coded segments with explanations |

---

## Part 3 — Color-Coding & Sub-Token Boundaries

InChIKey segments are **hashes, not semantic layers** — so unlike the InChI strip there are NO meaningful sub-tokens inside the two hash blocks. The natural color boundaries are exactly the structural segments:

| Segment | Suggested treatment | Sub-tokens? |
|---------|---------------------|-------------|
| First block (14) | One solid color — ideally echoing the InChI main/`c` (connectivity) layer color to reinforce the link | None — single opaque hash |
| Second block (8) | One solid color — echo the InChI stereo/isotope (`b`/`t`/`i`) color family | None — single opaque hash |
| Flag char `S/N` (1) | Distinct "metadata" accent | Optional: flag + version as two adjacent 1-char sub-tokens in one metadata region |
| Version char `A` (1) | Same metadata accent as flag (or a paired shade) | See above |
| Protonation char (1) | Distinct color — ideally **echoing the InChI `/p` charge-layer color** already in the palette | None |

**Recommendations:**
- Reuse the existing oklch token palette. Where an InChIKey segment corresponds to an InChI layer the tool already colors (connectivity → main/`c`; stereo/iso → `b`/`t`/`i`; protonation → `p`), **reuse that layer's color.** This reinforces "block 1 = the connectivity you saw above; block 2 = the stereo/isotope you saw above" — a strong, cheap pedagogical win.
- The hyphens are structural punctuation — render them dimmed/neutral (matching how the InChI strip treats `/` separators), not as a colored segment.
- For the flag (`S`) + version (`A`) pair: simplest is one combined "version/flag" segment with a single hover card covering both. Recommend **one combined segment** to avoid over-fragmenting a part users rarely care about.

Net: **5 colored segments** (block 1, block 2, flag+version, protonation) + dimmed hyphens — fewer, simpler regions than the InChI strip, which suits the "it's just a hash" message.

---

## Feature Dependencies

```
InChIKey display (new)
    └──requires──> live InChIKey value from ketcher-standalone WASM   [OPEN QUESTION]
    └──reuses────> left explanation-card component (EXPL-01)
    └──reuses────> copy-to-clipboard component (PLSH-04)
    └──reuses────> oklch CSS token palette / segment-span rendering (INCHI-02)
    └──reuses────> empty/placeholder behavior (PLSH-01)

InChIKey segment hover  ──explicitly DOES NOT──> canvas atom highlight (INCHI-03/04)
    (this intentional contrast is what teaches the one-way-hash concept)
```

### Dependency Notes

- **InChIKey display requires the live key value:** PROJECT.md flags this as the one open technical question — how to obtain the InChIKey from ketcher-standalone's public API. Candidates to investigate in a requirements/spike: a `getInChIKey()`-style method, deriving the key from the `getInchi()` output via the InChI library's key generator, or the `indigo-ketcher` WASM exposing key generation. **This is the critical-path unknown and must be resolved before display work.** The tool already calls `getInchi(true)`.
- **Reuses explanation-card + copy + token system:** the UI scaffolding exists from v1.0; the new work is mostly content + a parallel segment strip, not new infrastructure → complexity LOW–MEDIUM.
- **Deliberately NO canvas highlight on hover:** the one place the InChIKey strip must *diverge* from the InChI strip. The divergence is itself the lesson. Ensure the key strip's hover wiring does **not** call `highlights.create`.

---

## MVP Definition

### Launch With (v1.3)

- [ ] Live InChIKey shown below the InChI strip — the milestone goal
- [ ] Correct 5-segment rendering with the exact char counts/boundaries from Part 1 (two hyphens only)
- [ ] Per-segment color-coding reusing oklch tokens (echo corresponding InChI layer colors)
- [ ] Per-segment hover explanation cards with the Part 1 content (block 1 = skeleton/connectivity; block 2 = stereo/isotope; flag = standard S/N; version = A; protonation = N/O…/M… mapping)
- [ ] Explanatory content: 27-char fixed length & purpose; one-way hash (not reversible, no atom mapping); collision caveat (lookup not identity proof)
- [ ] Explicit "segments don't highlight atoms because it's a hash" note
- [ ] Copy-to-clipboard button (PLSH-04 parity), copies verbatim key
- [ ] Empty/invalid structure → placeholder (PLSH-01 parity)

### Add After Validation (v1.x)

- [ ] "Search this InChIKey on the web / PubChem" outbound link — trigger: users ask how to look it up
- [ ] Protonation-char live demo preset (a charged species among presets) — trigger: presets expanded (ties into CONT-01)

### Future Consideration (v2+)

- [ ] First-block partial-match teaching interactive — defer until core validated
- [ ] Deep-dive "how the hash is built" optional disclosure — only if users request the math

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Live InChIKey display + correct segmentation | HIGH | LOW (once API resolved) | P1 |
| Resolve ketcher API for obtaining the key | HIGH | MEDIUM (unknown) | P1 (critical path) |
| Per-segment hover explanation cards | HIGH | MEDIUM | P1 |
| Color-coding (reuse tokens) | MEDIUM | LOW | P1 |
| Copy-to-clipboard parity | MEDIUM | LOW | P1 |
| "It's a hash, no atom highlight" teaching note | HIGH | LOW | P1 |
| Collision/one-way explanatory content | HIGH | LOW (content) | P1 |
| "Search on web/PubChem" outbound link | MEDIUM | LOW | P2 |
| Charged-species preset for protonation demo | LOW | MEDIUM | P3 |

## Competitor Feature Analysis

| Feature | PubChem / typical DB pages | NCI/CADD resolver | Our Approach |
|---------|----------------------------|-------------------|--------------|
| Show InChIKey | Yes — static, plain text | Yes — as input field | Live, color-coded, segment-explained |
| Explain the segments | No | No | **Yes — the differentiator** |
| Resolve key → structure | N/A | Yes (server-side) | No (no backend); explain *why* and link out |
| Copy button | Sometimes | No | Yes (parity with InChI) |

No existing tool teaches the *anatomy* of an InChIKey interactively — that gap is exactly this milestone's value.

## Sources

- IUPAC InChI paper (Heller et al., *J. Cheminformatics* 2015) — authoritative segment definitions & protonation mapping: https://jcheminf.biomedcentral.com/articles/10.1186/s13321-015-0068-4 (also https://pmc.ncbi.nlm.nih.gov/articles/PMC4486400/) — HIGH
- Wikipedia, *International Chemical Identifier* (InChIKey section) — format string, block contents, collision estimate, one-way property: https://en.wikipedia.org/wiki/International_Chemical_Identifier — HIGH (matches the IUPAC paper)
- InChI Trust Technical FAQ — char counts, S/N flag, version A, protonation incl. ±12 saturation, SHA-2/truncation/one-way, collision testing: https://www.inchi-trust.org/technical-faq/ — HIGH
- InChIKey collision resistance experimental study, *J. Cheminformatics* 2012: https://jcheminf.biomedcentral.com/articles/10.1186/1758-2946-4-39 — HIGH
- InChI Technical Manual (PDF): https://www.inchi-trust.org/download/104/InChI_TechMan.pdf — HIGH
- NCI/CADD InChIKey resolver blog (real-world lookup use): https://cactus.nci.nih.gov/blog/?tag=inchikey-resolver — MEDIUM

---
*Feature research for: InChIKey display & explanation panel (v1.3)*
*Researched: 2026-06-18*
