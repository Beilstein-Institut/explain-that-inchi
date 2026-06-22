# Project Research Summary

**Project:** Explain that InChI — v1.5 inorganic / organometallic / salt capabilities
**Domain:** Extending a shipped in-browser InChI explainer to handle metals, salts, and coordination species
**Researched:** 2026-06-22
**Confidence:** HIGH

## Executive Summary

This milestone is **not** what its original framing assumed. All four researchers independently converge on one make-or-break fact: **the non-standard `/r` reconnected layer is unreachable with this stack.** Ketcher 3.12.0's only InChI entry point is `getInchi(withAuxInfo?: boolean)` — a single boolean, no options/flavor parameter — so the app can only ever receive **Standard InChI** (`InChI=1S/…`), which by definition never contains `/r`. Standard InChI *always* disconnects metal–ligand bonds into separate dot-components; the metal becomes its own bondless component with an empty `/c` slot. The `/r` layer requires the non-standard `/RecMet` switch that the React-level API does not expose. **A `/r` parser would be dead code for output the app cannot produce.** v1.5 is therefore a milestone about *explaining metal disconnection*, not about reconnecting anything.

The second consensus finding is that **the shipped pipeline already handles almost all inorganic InChI mechanics.** Inorganic Standard InChI is just an aggressively multi-fragment, charged molecule — and dot-components, `N*` multipliers, `/q` + `/p`, and multi-component AuxInfo coordinate-remapping were all already shipped (v1.0/v1.1, CuSO₄-verified). The verified anchor strings line up exactly with the existing machinery: ferrocene `1S/2C5H5.Fe/c2*1-2-4-5-3-1;/h2*1-5H;`, NaCl `1S/ClH.Na/h1H;/q;+1/p-1`, ferrocyanide `1S/6CN.Fe/c6*1-2;/q;;;;;;-4`. v1.5 is largely **additive: content prose + a per-component charge *reading* fix + presets + one live highlighting-verification gate. ZERO new dependencies.**

The highest-value, lowest-cost fix is correcting a genuine factual error: the `/q` *explanation reading* is wrong for salts (`readingFor` case `'q'` returns the flat broken string "net charge: ;+1"; the blurb says "overall formal charge of the molecule"). The `/q` *highlight* path is already per-component and correct — only the prose is wrong. The single real technical unknown — and thus the milestone's blocking first step — is verifying that `remapAuxToPoolIds` coordinate-matches a lone bondless metal atom (ferrocene Fe, ferrocyanide Fe) instead of silently falling back to iteration order and highlighting the wrong atom. The overriding risk is the **"honesty trap"**: the Ketcher canvas still draws metal–ligand bonds that Standard InChI drops, so the disconnection itself must be the lesson ("the absence is the teaching point", mirroring v1.3 InChIKey) — the tool must **never** highlight a drawn metal bond, because no InChI token denotes it.

## Key Findings

### Recommended Stack

**Unchanged — that is the finding.** Zero new dependencies. All new behavior lands in existing in-repo modules (`layerInfo.ts`, `parseInchi.ts`, `highlightUtils.ts`, `LayerText.tsx`, `molecules.ts`). No RDKit, no OpenBabel, no second WASM engine, no `/RecMet` plumbing, no `indigo-ketcher` direct import (CLAUDE.md forbids it). Adding a reconnect engine would create a second source of truth that can disagree with Ketcher and would violate the verbatim-passthrough invariant. Ketcher/Indigo packages stay pinned at 3.12.0.

**Core technologies:**
- ketcher-react / -standalone / -core 3.12.0: editor + WASM Standard InChI v1.06 — already shipped; emits `1S` with automatic, unavoidable metal disconnection.
- In-repo pure-TS parsers (`parseInchi.ts`, `parseAuxMapping.ts`, `highlightUtils.ts`, `layerInfo.ts`): already multi-fragment + `/q`/`/p` aware — extend prose and fixtures only.
- Vitest: add **REAL** inorganic fixtures (ferrocene, NaCl, ferrocyanide, Prussian blue) — never fabricated or predicted strings.

### Expected Features

**Must have (table stakes):**
- Corrected `/q` per-component reading + corrected blurb — the shipped reading is *factually wrong* for salts; smallest, highest-value fix.
- Metal-disconnection explanation prose in the formula/`/c`/`/h` readings — explain the dot-separated metal component and the empty `/c` slot.
- `/q` / `/p` per-component hover highlighting verified (and made token-precise) on the new presets.
- Inorganic preset core set — each **live round-trip verified** before shipping.
- `/p` salt proton-balance prose (HCl → Cl⁻ framing), paired with the `/q` fix.

**Should have (competitive differentiators):**
- "Why is the metal gone?" proactive callout on detected disconnection (structural signal: single-metal component + empty `/c` slot).
- Salt component breakdown panel (per-ion formula · charge · proton offset, derived view only).

**Defer (v2+):**
- Disconnection diff visualization (dimming the dropped metal bonds) — gated on AuxInfo reliability; research-heavy.
- `/r` reconnected layer — **anti-feature / blocked** unless the stack ever moves off `getInchi()` to an options-capable invocation.
- KMnO₄ / hexaamminecobalt presets — ship only after live round-trip confirmation (high risk).
- 3D coordination geometry, crystallographic/lattice views, auto charge-balancing — out of scope / violate verbatim passthrough.

### Architecture Approach

v1.5 is an **additive content + verification milestone, not a structural one.** The existing pipeline (parse → enrich → render hoverable spans → store hover → highlight hook → Ketcher) already handles every *structural* property an inorganic Standard InChI presents. The two governing invariants from v1.0–v1.4 must hold throughout: **no-remount** (never conditionally render `<Editor>`, never recreate `StandaloneStructServiceProvider`) and **verbatim passthrough** (displayed/copied string === raw Ketcher output; parsers return offsets, renderers slice verbatim).

**Major components touched:**
1. `layerInfo.ts` (`readingFor` q/p + `LAYER_INFO` blurbs) — **primary content surface.** Rewrite q/p readings per-component by mirroring the existing `;`-split + `cumOffset` pattern from the `c`/`h`/`t` cases; correct the blurbs; add disconnection prose to `formula`/`c`; extend `ELEMENT_NAMES`/metal-color policy for `Fe`/`Na`/`Mn` etc.
2. `parseAuxMapping.ts` (`remapAuxToPoolIds`) — **unchanged unless the verification gate fails.** Lone-metal coordinate match is the only plausible new edge case.
3. `LayerText.tsx` (+ optional new `ChargeText`) / `highlightUtils.ts` (`buildSubHoverSpecs` `case 'charge'`) / `parseInchi.ts` (`SubHover` `kind:'charge'`) — **optional Phase E** token-precise charge hover; `buildHighlightSpecs case 'q'` is already correct and unchanged. `molecules.ts` — pure preset data additions.

### Critical Pitfalls

1. **The `/q` blurb/reading is actively wrong for salts** — renders "net charge: ;+1" and frames it as whole-molecule charge. Fix by splitting on `;`, aligning each slot to a formula component, emitting per-component prose ("Cl: neutral · Na: +1"); same treatment for `/p`. Inorganic chemists are the target user and will trust the wrong text.
2. **Per-component `/q` off-by-one** — never `.filter(Boolean)` the slot array (empty slot = "this component is neutral" = data); expand `N*` (`6CN` = 7 components, not 2); assert `text.split(';').length === formulaFragmentCounts(formula).length`. Note `/q` can itself carry `N*` (Prussian blue `3*-4;4*+3`) and the `q` handler does **not** currently run through `expandLayerText`.
3. **The honesty trap** — the canvas draws metal–ligand bonds Standard InChI drops. Make the disconnection itself the lesson; hovering `.Fe` highlights only the lone iron atom; **never** highlight a drawn Fe–ring bond for any token (mirror v1.3 INKEY-09 "absence is the lesson").
4. **Lone-metal AuxInfo mapping silently highlights the wrong atom** — `remapAuxToPoolIds` may fall back to iteration order if the metal's `/rC:` coordinate is missing/`NaN`. Resolve via a **blocking live gate** (log match-vs-fallback) before any content work.
5. **Presets that don't round-trip through `setMolecule` teach silently wrong** — every preset's expected InChI must be the **REAL string captured from the running app**, never predicted/hand-written (the v1.4 lesson: 333 unit tests passed while the feature was broken on fabricated fixtures). Ship the verified core before the ⚠ high-risk presets.

## Implications for Roadmap

Based on research, suggested phase structure (consensus order from Architecture + Pitfalls):

### Phase A: Live highlighting / AuxInfo verification gate (BLOCKING — do first)
**Rationale:** The only real technical unknown. One check de-risks the entire milestone and isolates the only plausible new code (lone-metal remap). Must be a blocking human-verify, not a unit test (v1.4 lesson).
**Delivers:** Confirmation that loading ferrocene (and ferrocyanide, AgNO₃) yields the verbatim `1S` string, that `remapAuxToPoolIds` resolves the metal pool ID **not via fallback** (logged), and that hovering `.Fe` highlights only the iron atom on canvas.
**Avoids:** Pitfall 4 (silent wrong-atom highlight). If it fails, fix `remapAuxToPoolIds` epsilon/fallback here before proceeding.

### Phase B: Per-component `/q` + `/p` reading fix + corrected blurbs
**Rationale:** Highest-value table-stakes fix; corrects a genuine factual error; independent of presets (test with fixtures).
**Delivers:** Rewritten `readingFor` q/p (mirror `case 't'`), corrected `LAYER_INFO.q`/`.p` salt-aware copy, REAL fixtures (NaCl `/q;+1/p-1`, ferrocyanide `/q;;;;;;-4`, Prussian blue `3*-4;4*+3`, CuSO₄).
**Addresses:** "Corrected `/q` per-component reading + blurb" and "`/p` salt prose."
**Avoids:** Pitfalls 1, 2 (wrong blurb, off-by-one slot alignment, `/p` combined story).

### Phase C: Metal-disconnection explanation prose + honest-limitation callout
**Rationale:** Copy-only; parallel-safe with B; delivers the milestone's headline "aha."
**Delivers:** `formula`/`c` blurb + reading note (disconnected metal, empty `/c` slot); fold the "canvas shows bonds the InChI omits" sentence into the card (content only, derived boolean — no store field, no remount). Extend `ELEMENT_NAMES`/metal colors.
**Avoids:** Pitfall 3 (honesty trap); no store field/remount for the callout.

### Phase D: Inorganic presets (behind a live round-trip human-verify gate)
**Rationale:** Depends only on the round-trip method confirmed in A; makes B and C demonstrable end-to-end.
**Delivers:** `molecules.ts` core set — NaCl, KCl, NH₄Cl, MgCl₂, CuSO₄, AgNO₃, ferrocene — each with its **REAL captured InChI**. KMnO₄ / hexaamminecobalt deferred until round-trip confirmed.
**Avoids:** Pitfall 5 (silent non-round-trip); blocking human-verify, no auto-green from unit tests.

### Phase E (optional / fast-follow): Token-precise `/q` charge hover
**Rationale:** Additive sugar gated behind B; the only phase that touches the parser/highlight data model.
**Delivers:** `SubHover` `kind:'charge'` + `canonRange`; new `ChargeText` sub-renderer (mirror `ParityText`); `buildSubHoverSpecs case 'charge'`.

### Phase Ordering Rationale
- **A first** because it is the sole technical unknown and gates correctness of everything downstream; the v1.4 retrospective (fabricated fixtures masked a broken feature) makes a live canvas gate non-negotiable.
- **B before/parallel to C** because B is the highest-value table-stakes fix and is preset-independent (fixtures suffice); C is copy-only and parallel-safe.
- **D after A/B/C** because presets exist to demonstrate B and C end-to-end and depend only on the round-trip method.
- **E last** because it is optional precision sugar gated behind B and is the only data-model change.
- Every phase honors no-remount and verbatim passthrough.

### Research Flags

Phases likely needing deeper research / live verification during planning:
- **Phase A:** the make-or-break feasibility check — lone-metal coordinate matching for ferrocene/ferrocyanide is unverified; needs live-canvas verification and match-vs-fallback logging.
- **Phase D:** SMILES round-trip fidelity in Ketcher standalone is per-preset uncertain (especially ⚠ KMnO₄ Mn(VII), hexaamminecobalt 10 components, ferrocene sandwich); each preset's real InChI must be captured live.

Phases with standard patterns (skip research-phase):
- **Phase B:** well-understood `;`-split + `cumOffset` pattern already exists in `c`/`h`/`t` cases — copy it.
- **Phase C:** copy-only content edits in an established prose module.
- **Phase E:** mirrors the shipped `ParityText` / CLYR sub-hover pattern exactly.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No-`/r` reframe and zero-new-deps verified against ketcher README API signature, Indigo options page, InChI Trust FAQ. |
| Features | HIGH | InChI behavior + Ketcher API verified against primary sources; anchor preset InChI strings NIST/PubChem-verified. |
| Architecture | HIGH | Existing pipeline read directly from source; `case 'q'` per-component highlight and flat `readingFor q` bug both confirmed in-code. |
| Pitfalls | HIGH | Charge-alignment pitfalls traced against actual code + verified inorganic strings; MEDIUM only on preset round-trip and lone-metal AuxInfo (the point of the gate). |

**Overall confidence:** HIGH

### Gaps to Address
- **Lone-metal AuxInfo coordinate match (ferrocene/ferrocyanide):** unverified that `remapAuxToPoolIds` resolves a bondless metal without fallback — resolve in the blocking Phase A gate before content work.
- **Preset SMILES round-trip fidelity:** several candidate SMILES (esp. KMnO₄, hexaamminecobalt, ferrocene's two forms) may parse to a different structure or fail; capture each preset's REAL live InChI in Phase D, ship verified core only.
- **Bundled InChI version detail:** v1.07's "keep some metal bonds" behavior is NOT in Ketcher 3.12.0; build for full disconnection (MEDIUM).

## Sources

### Primary (HIGH confidence)
- Ketcher README — `getInchi(withAuxInfo?: boolean)` / `getInChIKey()` signatures (single boolean, no options param): https://github.com/epam/ketcher/blob/master/README.md
- Indigo InChI options page — `/RecMet` listed; default = standard: https://lifescience.opensource.epam.com/indigo/options/inchi.html
- InChI Trust Technical FAQ — automatic metal disconnection; `/r`/RecMet non-standard; per-component `;` semantics: https://www.inchi-trust.org/technical-faq/
- Existing codebase, read directly: `src/lib/parseInchi.ts`, `highlightUtils.ts`, `layerInfo.ts`, `parseAuxMapping.ts`, `src/components/LayerText.tsx`, `Explanation.tsx`, `InchiSection.tsx`, `src/data/molecules.ts`
- `.planning/PROJECT.md` — no-remount (D-13) + verbatim-passthrough invariants; v1.1 multi-fragment remap; v1.4 fabricated-fixture lesson
- Verified anchor strings — ferrocene (PubChem CID 10219726), NaCl (NIST WebBook C7647145), ferrocyanide, Prussian blue

### Secondary (MEDIUM confidence)
- Metallome blog — verbatim ferrocene/ferrocyanide/Prussian blue `1S` and `/r` worked examples: http://metallome.blogspot.com/2025/05/inchi-metal-reconnected-layer.html
- Ketcher help.md — dative/coordinate bond palette, periodic table, charge tools: https://github.com/epam/ketcher/blob/master/documentation/help.md
- "Making InChI FAIR for Inorganic Chemistry": https://hunterheidenreich.com/notes/chemistry/molecular-representations/notations/inchi-2025/

---
*Research completed: 2026-06-22*
*Ready for roadmap: yes*
