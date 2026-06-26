# Project Research Summary

**Project:** Explain that InChI
**Domain:** Chemistry-education content + thin React rendering tier (in-browser SPA)
**Milestone:** v1.5 — Sub-token-specific explanations
**Researched:** 2026-06-26
**Confidence:** HIGH

> Supersedes the abandoned 2026-06-22 "inorganic/organometallic" v1.5 framing entirely. This summary derives only from the four current research files (STACK / FEATURES / ARCHITECTURE / PITFALLS), all dated 2026-06-26.

## Executive Summary

v1.5 is a **copy-and-one-render-branch milestone, not an engineering milestone**. The hard parts — sub-token detection, the `SubHover` discriminated union, canvas highlighting, and pinning — already shipped in v1.0–v1.4 + Phase 16. The store already carries `subHover`/`pinned.sub`; `LayerText` already writes them; the canvas already highlights from them. The *only* structural gap is that `Explanation.tsx` never **reads** `subHover`/`pinned.sub` to render a more specific card. The feature is: author chemically-correct copy for four sub-token families (H-counts, mobile-H, tetrahedral stereo, formula elements), put it in a new pure module `subTokenInfo.ts`, and wire one new precedence branch into the existing card.

The recommended approach is **zero new dependencies** (verified against repo source and four shipped zero-dep milestones), reusing every established pattern: a DOM-free prose module beside the renderer (mirrors `inchiKeyInfo.ts`), the `effX = pinned ? pinned.X : hoverX` derivation (mirrors `effIdx`), and a card-only tier that never touches the canvas. The element-name table (`ELEMENT_NAMES`, today only 10 entries) is extended in place to the full periodic table, which improves existing formula readings for free.

The real risk surface is **not code, it is correctness** — chemical and process. Two classes dominate: (1) the copy teaching falsehoods (parity = R/S, H3 = methyl, mobile-H = "bond between", whole-molecule count for a multi-fragment element), and (2) the v1.4 repeat-offense of testing on fabricated InChI and bypassing the human-verify gate. Mitigation is built into the build order: every fixture traces to real `getInchi()` output, a unit test pins the mandatory "not R/S" caveat, and a chemist reviews the live card strings before verify. Recovery cost for wrong copy is low (it's static prose) but reputationally high for a teaching tool — so prevention via the human gate is the load-bearing control.

## Key Findings

### Recommended Stack

**Zero new dependencies.** The validated stack (Vite ^8, React ^18.3, TS ~5.7, ketcher 3.12.0, Zustand 5, CSS Modules, vitest ^3) is in place and untouched. A ~118-entry `symbol → name` map is a static `Record`, not a dependency — every npm periodic-table package bundles unused atomic weights/configs/categories and would break the verbatim/hand-authored-data convention. React renders the branch, CSS Modules style it, TS holds the data; nothing is missing.

**Core artifacts (all reused/extended, none new-tech):**
- `ELEMENT_NAMES` (layerInfo.ts) — extend 10 → full periodic table, in place; `formulaReading` benefits for free.
- `inchiKeyInfo.ts` `KEY_ZONE_COPY` — the exact template for the new pure prose module.
- `SubHover` union + `LayerText` emission + `subHover`/`pinned.sub` store fields — already present and populated; only the card doesn't read them.

### Expected Features

This is a content/pedagogy milestone. Audience is chemistry-literate but InChI-naive: teach the *notation*, not the chemistry. The highest-value cards are the **false-friend warnings**.

**Must have (table stakes):**
- t-layer per-stereocenter card — plain-language handedness **+ mandatory "+/− is canonical-ordering parity, NOT R/S" caveat** (the user-requested headline).
- Mobile-H `(H,X,Y)` card — "shared/tautomeric proton over these atoms; one identifier for all tautomers" (notation almost nobody knows).
- H / H2 / H3 / range cards — count semantics, **never** a functional-group claim.
- Formula per-element card — name + count + Hill-order note + the formula-H ≠ h-layer guard.
- Full element name table (graceful: missing entries fall back to bare symbol).

**Should have (P2):** Hill-order rationale blurb (reuse existing wording); one-line m/s mention on the t-card (reuse `LAYER_INFO.m`/`.s` verbatim).

**Defer (v2+):** mobile-H concrete examples (carboxylate/amide/imidazole); no-carbon Hill nuance; b-layer (E/Z) sub-token cards (natural next milestone, same parity≠descriptor pattern); a "why did the sign flip on renumber" interactive demo.

### Architecture Approach

One new pure module, one new render branch, **zero store changes**. The new sub-token tier slots into `Explanation.tsx`'s precedence chain **between `keyHoverKind` and the layer branch** (it must override the generic layer blurb but never the InChIKey surface). Pinning is honored by deriving `effSub = pinned ? pinned.sub : subHover`, exactly parallel to the existing `effIdx`. Copy is derived solely from already-parsed, already-offset `SubHover` numeric fields — never by reconstructing the InChI string.

**Major components:**
1. `src/lib/subTokenInfo.ts` (**NEW**) — pure `subTokenInfo(sub, layerType, atomElements) → {title, body, reading?} | null`; null for c-layer kinds → graceful fall-through. The testing seam.
2. `src/components/Explanation.tsx` (**modified**) — add `subHover` selector + `effSub`/`subCopy` derivation + one branch above the layer branch.
3. `src/lib/layerInfo.ts` (**modified**) — extend `ELEMENT_NAMES` to full periodic table; optionally `export atomLabel`.
4. `store.ts` / `LayerText.tsx` / `parseInchi.ts` — **unchanged**.

### Critical Pitfalls

1. **Parity ≠ R/S (A1)** — never map +/− to R/S; the sign is from canonical numbering, not CIP, and flips with renumbering. The caveat is a hard requirement, pinned by unit test + chemist review.
2. **H-count ≠ functional group (A2)** — "1H3" is a hydrogen tally, not "methyl"; wrong on heteroatoms. Say "atom N bears n H"; CH₃ only as an element-conditioned example.
3. **Mobile-H mis-explained (A3)** — `(H,X,Y)` is *one+ proton shared* over the set, not "a bond between" or "each carries one." Note: `parseMobileHydrogens` drops the `Hn` count — parse separately if the copy states a count.
4. **Multi-fragment errors (A4/B4)** — element count is per-fragment ("6 carbons in this component"), and atom naming must use the already-offset `SubHover` fields (don't re-parse `layer.text`), or copy/highlight will disagree.
5. **Fabricated fixtures + bypassed gate (B5, repeat-offense)** — every fixture must trace to real `getInchi()` output; do not bypass the human-verify gate. Plus the structural guards: verbatim-passthrough (B1), no-remount (B2), and correct precedence/`pinned.sub` (B3).

## Implications for Roadmap

Strict dependency order, each step compiles and is independently testable. The natural phasing tracks the research's own build order (data → pure module → wiring) but the *content phases* are the risk-bearing ones.

### Phase 1: Full element-name table
**Rationale:** Smallest change, no behavior risk to existing callers, unblocks element copy.
**Delivers:** `ELEMENT_NAMES` extended to full periodic table in `layerInfo.ts`; `atomLabel` exported if reused.
**Addresses:** full element table (FEATURES P1).
**Avoids:** A5 (case collisions — keep case-exact keys, never normalize; round-trip + Co≠CO test).

### Phase 2: `subTokenInfo.ts` pure module + copy (the value core)
**Rationale:** Fully testable in isolation before any React touches; this is the testing seam and where all chemical correctness lives.
**Delivers:** pure `subTokenInfo` covering element / hAtoms / mobileH / stereo (null for c-layer), with the authored copy; new `__tests__/subTokenInfo.test.ts`.
**Uses:** `ELEMENT_NAMES`, `subscript`, `readingFor`/`atomLabel` (reuse — don't duplicate).
**Implements:** Pattern-1 pure prose module.
**Avoids:** A1 (parity≠R/S caveat + substring test), A2 (no "methyl" definition), A3 (no "bond between"), A4 (per-fragment count), B4 (offset-correct fields).

### Phase 3: `Explanation.tsx` wiring
**Rationale:** Thin wiring gated on Phase 2; the only component change.
**Delivers:** `subHover` selector + `effSub`/`subCopy` + new branch between `keyHoverKind` and `layer`.
**Avoids:** B1 (verbatim passthrough), B2 (no remount — leaf render only), B3 (precedence + `pinned.sub` honored).

> The three phases could equally be planned as a single phase given the small surface; if so, keep the internal ordering (table → pure module+tests → wiring) intact.

### Phase Ordering Rationale
- Element table first: zero consumer risk, unblocks the element card.
- Pure module before component: enforces the project's "pure-first, tested-first" seam (buildFeedbackUrl / parseInchiKey precedent) and isolates all chemical-correctness testing.
- Wiring last: a thin diff that can't break the canvas (no store field, no `<Editor>` touch).

### Research Flags

Phases needing deeper attention during planning:
- **Phase 2 (copy):** the only genuinely uncertain work — chemical wording. Plan must name the **real** source molecules for fixtures (stereocenter w/ /t/m/s e.g. alanine or a sugar; heteroatom-H amine; tautomer e.g. imidazole/adenine; multi-element/metal or halide) and schedule a **human chemist verify gate on the live card strings**. Do not bypass.

Phases with standard patterns (skip research-phase):
- **Phase 1 & 3:** fully codebase-grounded; every integration point confirmed by source read. No external research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against repo source + package.json + 4 zero-dep precedents. Zero new deps. |
| Features | HIGH | Chemistry cross-checked vs InChI Technical Manual + JCheminf 2015 + Hill convention. |
| Architecture | HIGH | Every integration point (store lines, Explanation precedence, LayerText emission) read directly. |
| Pitfalls | HIGH | Chemical facts cross-checked; integration facts read from source; informed by two recorded project scars. |

**Overall confidence:** HIGH

### Gaps to Address
- **Exact copy wording** (element-role granularity, the stereo caveat phrasing, mobile-H example choice) — content decisions owned by the Phase 2 authoring/verify gate, not by tooling.
- **`Hn` count in mobile-H** — `parseMobileHydrogens` drops the count; if the card states "two protons," parse it separately and add a real fixture that exercises it before writing the parser.
- **Element-table coverage scope** — decide full periodic table vs. only Ketcher-emittable; fallback degrades safely either way, so this is enrichment, not a blocker.

## Sources

### Primary (HIGH confidence)
- Repo source — `src/lib/layerInfo.ts`, `src/components/Explanation.tsx`, `src/components/LayerText.tsx`, `src/lib/inchiKeyInfo.ts`, `src/lib/parseInchi.ts`, `src/store.ts`, `package.json` (read 2026-06-26).
- `.planning/PROJECT.md` — milestone goal, precedence/no-remount/verbatim invariants, zero-dep precedent.
- InChI Technical Manual — https://www.inchi-trust.org/download/104/InChI_TechMan.pdf — parity definition, mobile-H format, /m & /s flags.
- "InChI, the IUPAC International Chemical Identifier", J. Cheminformatics 7:23 (2015) — "no relation to R,S; InChI does not use CIP rules"; mobile-H normalisation; /m enantiomer role.
- InChI Technical FAQ — https://www.inchi-trust.org/technical-faq/.
- Hill system — https://en.wikipedia.org/wiki/Chemical_formula.
- Project memory: `feedback_inchi_passthrough`, `feedback_real_domain_fixtures_and_gates`, `reference_inchi_clayer_adjacency`.

### Secondary (MEDIUM confidence)
- EPAM "InChI tautomers" PDF — mobile-H / tautomer perception (1,3/1,4/1,5-H transfer).

---
*Research completed: 2026-06-26*
*Ready for roadmap: yes*
