# Architecture Research

**Domain:** Integrating inorganic / organometallic / salt capabilities into a shipped in-browser InChI explainer (v1.5)
**Researched:** 2026-06-22
**Confidence:** HIGH (existing architecture read directly from source; multi-fragment patterns confirmed in-code; reframe confirmed by parallel Stack+Features research)

---

## TL;DR for the Roadmap

v1.5 is an **additive content + verification milestone**, not a structural one. The existing pipeline (parse → enrich → render hoverable spans → store hover → highlight hook → Ketcher) already handles every *structural* property an inorganic Standard InChI throws at it (dot-separated components, `N*` multipliers, `/q`, `/p`, multi-fragment AuxInfo remap). The work is:

1. **Make `/q` (and `/p`) read PER-COMPONENT** — a small change in two functions (`readingFor` in `layerInfo.ts` for the explanation card; a new `q`/`p` case in `LayerText.tsx` for sub-token hover). The highlight builder (`highlightUtils.ts` `case 'q'`) **already splits `/q` on `;` per component** — confirmed in source.
2. **Add metal-disconnection explanation prose** — copy-only changes in `layerInfo.ts` (`LAYER_INFO` blurbs + `readingFor` q/p readings), optionally one honest-limitation callout surfaced through the existing `Explanation.tsx` card (no new surface).
3. **Add inorganic presets** — pure data additions to `molecules.ts`; no loader changes expected.
4. **Verify highlighting end-to-end** on a disconnected lone-metal component — the **single live-verification gate** (ferrocene → hover `.Fe` formula component / `/q` → iron lights up on canvas).

The two governing invariants from v1.0–v1.4 must hold throughout: **no-remount** (never conditionally render `<Editor>`, never recreate `StandaloneStructServiceProvider`) and **verbatim passthrough** (displayed/copied string === raw Ketcher output; parsers return offsets, renderers slice verbatim).

---

## Standard Architecture (existing — fixed for v1.5)

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Ketcher (WASM, module-level StructServiceProvider — NEVER remount)    │
│      getInchi(true) → "InChI=1S/…\nAuxInfo=1/0/N:…/rC:…"                │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  parseAuxMapping.ts :: parseInchiWithAux(raw)                          │
│    ├ split on "\nAuxInfo="                                             │
│    ├ parseInchi(inchiStr)            → enriched Layer[]  (offsets-only) │
│    ├ parseAuxMapping(auxBody, formula) → AuxMap canonical→molfile-rank  │
│    ├ buildAtomElements(layers)      → Record<canon, element>           │
│    └ parseRcField(auxBody)          → molfileCoords[]                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼  (in hook: remapAuxToPoolIds → canon→poolId)
┌──────────────────────────────────────────────────────────────────────┐
│  Zustand store (src/store.ts): layers, auxMap, atomElements, hoverIdx, │
│                                 subHover, keyHover, …                   │
└──────────────┬─────────────────────────────────────┬──────────────────┘
               ▼ (read)                               ▼ (read)
┌──────────────────────────────┐   ┌───────────────────────────────────┐
│ InchiSection.tsx              │   │ Explanation.tsx                    │
│   per-layer pill +            │   │   readingFor(layer, atomElements,  │
│   <LayerText> hoverable spans │   │            fragCounts) → card prose│
│   → setSubHover / setHover    │   │   LAYER_INFO[type].blurb            │
└──────────────┬───────────────┘   └───────────────────────────────────┘
               ▼ (store.subHover / hoverIdx)
┌──────────────────────────────────────────────────────────────────────┐
│  useKetcherHighlights.ts  →  buildHighlightSpecs / buildSubHoverSpecs  │
│       (highlightUtils.ts) → struct.findBondId → highlights.create      │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (and what v1.5 touches)

| Component | Responsibility | v1.5 change |
|-----------|----------------|-------------|
| `src/lib/parseInchi.ts` | Layer split + enrichment; pure parsers; `formulaFragmentCounts`, `expandLayerText` | **None expected.** `/q`/`/p` already land in `enrichLayers` default branch (atoms:[], bonds:[]). Add inorganic test fixtures only. Possibly extend `SubHover` union with a `charge` kind (see Q1, Phase E). |
| `src/lib/parseAuxMapping.ts` | AuxInfo → `AuxMap`, element map, molfile coords, coordinate-matching `remapAuxToPoolIds` | **None.** Lone-metal component is just another coordinate to match. Verify (not change). |
| `src/lib/highlightUtils.ts` | `buildHighlightSpecs` / `buildSubHoverSpecs` → `HighlightSpec[]` | `case 'q'` **already per-component** (splits on `;`, offsets via `formulaFragmentCounts`). Add a `case 'charge'` to `buildSubHoverSpecs` only if per-token charge hover (Q1/Phase E) is in scope. |
| `src/lib/layerInfo.ts` | `LAYER_INFO` prose, `readingFor`, color/legend helpers | **PRIMARY content change.** Rewrite `readingFor` `q`/`p` cases to per-component; correct `LAYER_INFO.q`/`.p` blurbs; add metal-disconnection note to `formula`/`c` readings. |
| `src/components/LayerText.tsx` | Per-layer hoverable sub-token spans | **Add a `q`/`p` sub-renderer** (currently they hit the `default: <>{rawText}</>` branch → no per-token hover). Mirror `ParityText`'s `;`-split + `cumOffset` loop. |
| `src/components/Explanation.tsx` | Left card (idle / hover / key-hover precedence) | Optional honest-limitation callout (reuse existing card; content only). |
| `src/data/molecules.ts` | Preset SMILES list | **Data additions** (NaCl, KCl, MgCl₂, CuSO₄, ferrocene, AgNO₃, NH₄Cl). |

---

## Question-by-Question Integration

### Q1 — Per-component `/q` (and `/p`)

**Current state, verified in source:**

- **Highlighting is ALREADY per-component.** `highlightUtils.ts` `case 'q'` (lines ~262–305) does exactly the requested split: `const qFragments = layer.text.split(';')`, then a `cumulativeOffsetQ` loop using `formulaFragmentCounts(formulaLayer.text)` to map each non-empty/non-`0` charge slot to that component's canonical range, then `auxMap[...]` → pool IDs (with a precise "formally-charged atom" preference and a whole-fragment fallback). **No change needed for whole-component `/q` highlight.** This is the same v1.1 machinery that fixed CuSO₄. The ferrocyanide example `/q;;;;;;-4` (7 slots) lines up with `formulaFragmentCounts("6CN.Fe")` → 7 components, so the existing loop resolves it. `/p` (`case 'p'`) highlights mobile-H/heteroatoms rather than per-component charge — acceptable, since `/p` is a proton offset, not a per-component charge vector.
- **Explanation reading is WRONG for salts (the real bug).** `layerInfo.ts` `readingFor` `case 'q'` returns the flat string `'net charge: <b>' + layer.text + '</b>'` (lines 363–364) — so `/q;+1` literally reads "net charge: `;+1`". `case 'p'` is the same flat shape (lines 365–366). **This is the smallest, highest-value fix.**
- **Sub-token hover does not exist for `q`/`p`.** In `LayerText.tsx`, `q` and `p` are not in the dispatch `switch` (lines 35–42) → they fall to `default: return <>{rawText}</>`, a single inert text node. Hovering an individual `+1` is impossible today; the whole-pill hover (via `InchiSection.tsx` `hoverIdx`) triggers the per-component highlight builder, but you cannot target one component's charge.

**Cleanest change — reuse the existing `;`-split / `cumOffset` / per-fragment pattern that already lives in several places:**

1. **`readingFor` (`layerInfo.ts`) — per-component prose.** Rewrite `case 'q'` (and `case 'p'`) to mirror the **existing `case 't'`** in the same function (lines 339–350): split `layer.text` on `;`, walk with `cumulativeOffset += fragCounts[fi] ?? 0`, and for each slot emit component-aware prose. Empty slot → "component _i_ (formula): neutral"; signed slot → "component _i_: **+1**". `fragCounts` is **already passed in** — `readingFor(layer, atomElements, fragCounts)` is called from `Explanation.tsx:60` with `fragCounts` already computed via `formulaFragmentCounts` (`Explanation.tsx:55`). Use `atomElements` + the component's canonical range to name the ion. Pure prose change; no data-model change.

2. **`LayerText.tsx` — new `q`/`p` sub-renderer** (only if per-token hover/highlight, FEATURES P1 "token-precise", is in scope). Add `case 'q': case 'p': return <ChargeText text={rawText} fragCounts={fragCounts} />;` to the dispatch (lines 35–42). Model `ChargeText` directly on **`ParityText`** (lines 265–301): split on `;`, `let cumOffset = 0`, push a `;` separator between segments, wrap each non-empty signed slot in a `styles.inchiSubtoken` span carrying a new `SubHover` of kind `'charge'` with the component's `canonRange = [cumOffset+1, cumOffset+fragCounts[fi]]`. That `canonRange` computation is the exact pattern `FormulaText` already uses (lines 91–96).

3. **`highlightUtils.ts` `buildSubHoverSpecs` — new `case 'charge'`** (paired with #2). Given `subHover.canonRange = [lo, hi]`, filter `Object.entries(auxMap)` (or the struct's formally-charged pool IDs, mirroring the precise/fallback logic already in `case 'q'`) to that range, colour `--c-charge`. Reuses the precise-vs-delocalized fallback already written in `case 'q'`.

**Functions that change:** `layerInfo.ts::readingFor` (q, p cases) + `LAYER_INFO.q`/`.p` copy (**always**); `LayerText.tsx::LayerText` dispatch + new `ChargeText` (**if token-precise hover**); `highlightUtils.ts::buildSubHoverSpecs` new `case 'charge'` + `SubHover` type extension in `parseInchi.ts` (**if token-precise hover**). **No change to `highlightUtils.ts::buildHighlightSpecs case 'q'` — it is already correct.**

**Patterns to cite for the implementer:**
- `;`-split + `cumOffset` per-fragment loop: `readingFor case 't'` (`layerInfo.ts:339`), `ParityText` (`LayerText.tsx:293`), `enrichLayers case 'c'/'h'/'t'` (`parseInchi.ts:388-426`), `buildHighlightSpecs case 'q'` (`highlightUtils.ts:288`).
- `canonRange` fragment scoping: `FormulaText` multi-dot branch (`LayerText.tsx:80-116`) → consumed by `buildSubHoverSpecs case 'element'` (`highlightUtils.ts:419-422`).

### Q2 — Metal-disconnection explanation

**Where the prose lives:** `src/lib/layerInfo.ts`.
- **`LAYER_INFO.formula.blurb`** and/or **`LAYER_INFO.c.blurb`**: extend to note that Standard InChI **disconnects metal–ligand bonds**, splitting the species into dot-separated components, and that a metal can appear as its own single-atom component with an **empty `/c` slot** (the trailing `;` with nothing after it). Verbatim copy editing — match the existing second-person, one-worked-example tone.
- **`readingFor` `case 'formula'` / `case 'c'`**: per-component readings already exist (`formulaReading` splits on `.` and renders `N×` multipliers — `layerInfo.ts:156-174`; `readingFor case 'c'` already returns "no heavy-atom bonds" for a bondless fragment — line 293). Small enhancement: when a component is a single metal atom with an empty connection segment, surface "iron: not bonded in this layer (disconnected metal)".

**UI affordance (honest-limitation callout):** Keep it a **content change, not a structural one.** `Explanation.tsx` already has three precedence states (key-hover → layer-hover → idle/legend) all rendering the same card. Two low-risk options, both reusing that card:
- **Cheapest:** fold the "the canvas shows metal–ligand bonds the InChI omits" sentence into the `formula`/`c` blurb so it appears whenever the user hovers those layers on a disconnected species. Zero new component, zero new store field.
- **Differentiator (P2, defer):** a proactive "Why is the metal gone?" callout that detects disconnection (a dot-component that is a single metal element with an empty `/c` slot — maintain a small metal-element `Set`) and renders an extra sentence in the idle card. Needs at most a derived boolean computed from `layers` inside `Explanation.tsx` — **no store field, no remount.** Treat as fast-follow.

**Do NOT** build a "diff visualization" that highlights the dropped bonds in v1.5 (FEATURES P3) — it depends on mapping drawn-but-absent bonds and is gated on the same AuxInfo reliability the verification gate checks.

### Q3 — Inorganic presets

**Pure data additions to `src/data/molecules.ts`.** Each entry is `{ id, name, formula, smiles }`; presets load via the existing `setMolecule(smiles)` path (`handleMolSelectLogic`). Recommended core set (from FEATURES, simplest→hardest): NaCl `[Na+].[Cl-]`, KCl `[K+].[Cl-]`, NH₄Cl `[NH4+].[Cl-]`, MgCl₂ `[Mg+2].[Cl-].[Cl-]`, CuSO₄ `[Cu+2].[O-]S(=O)(=O)[O-]`, AgNO₃ `[Ag+].[O-][N+](=O)[O-]`, ferrocene `[cH-]1cccc1.[cH-]1cccc1.[Fe+2]`.

**Preset-loading guard changes:** none expected. `setMolecule` accepts any SMILES Ketcher can parse; a single-atom metal component (`[Na+]`, `[Fe+2]`) is a valid molfile atom. The only risk is **SMILES round-trip fidelity in Ketcher standalone** (charged/unusual-valence atoms) — a per-preset **live-verification** item, not a code guard. The empty-canvas / invalid-structure guard in `App.tsx` (D-13: `parseInchi('InChI=1S//')` → 1 layer) already degrades cleanly if a preset fails to produce an InChI. Ship presets only after confirming each round-trips (KMnO₄, hexaamminecobalt flagged ⚠ — defer).

### Q4 — Highlighting verification (the single gate)

**Confirmed: no structural change is needed for a disconnected lone-metal component.** The full path already handles it:
- `parseAuxMapping` builds `auxMap` for every canonical atom including the metal's (the metal is one entry in the `N:` list).
- `parseRcField` yields the metal atom's `/rC:` coordinate; `remapAuxToPoolIds` matches it to the live editor atom by `|dx| + |−y−y| < 0.05` — **order-free coordinate matching, exactly what v1.1 added for interleaved multi-component pool IDs** (`parseAuxMapping.ts:180-213`). A bondless atom still has coordinates, so it maps.
- `buildHighlightSpecs case 'formula'` highlights it by element colour; `case 'q'` highlights its component when the `/q` slot is non-empty. Both iterate `layer.atoms` / per-component ranges through `auxMap`.

**The one live gate (do FIRST in the milestone):** Load/draw **ferrocene**, call `getInchi(true)`, confirm in the running app:
1. string is `1S` of the form `2C5H5.Fe/c2*1-2-4-5-3-1;/h2*1-5H;` (verbatim passthrough intact),
2. `remapAuxToPoolIds` resolves the **Fe** atom's pool ID (not dropped to a bad fallback),
3. **hovering the `.Fe` formula component (and the `/q` charge if present) highlights the iron atom on canvas.**

If (2)/(3) hold, the entire highlighting feature is green and the rest of v1.5 is content + presets. If they fail, the lone-metal coordinate match is the **only** new mapping edge case to fix (likely `remapAuxToPoolIds` epsilon / fallback). This gate must be a **blocking human-verify** — the v1.4 retrospective lesson (fabricated fixtures passed 333 tests while the feature was broken) applies directly: do not let unit tests substitute for the live canvas check.

### Q5 — Suggested build order

```
Phase A — Live-verification gate (BLOCKING, do first)
  └ ferrocene/NaCl in running app: verbatim 1S string, Fe/Na pool-ID remap,
    formula+/q hover highlights the metal. Gate the rest of the milestone on this.
        ↓ (unblocks everything; if it fails, fix remapAuxToPoolIds here)
Phase B — Per-component /q + /p reading & corrected copy   [depends on: A confirms data shape]
  ├ layerInfo.ts: rewrite readingFor q/p (mirror case 't' ;-split + cumOffset)
  ├ layerInfo.ts: correct LAYER_INFO.q / .p blurbs (per-component, salt-aware)
  └ tests: NaCl /q;+1/p-1, ferrocyanide /q;;;;;;-4, CuSO4 (REAL fixtures, not fabricated)
        ↓
Phase C — Metal-disconnection explanation prose            [depends on: A; parallel-safe with B]
  ├ layerInfo.ts: formula/c blurb + reading note (disconnected metal, empty /c slot)
  └ Explanation.tsx (optional): fold honest-limitation sentence into the card (content only)
        ↓
Phase D — Inorganic presets                                 [depends on: A for round-trip method]
  ├ molecules.ts: NaCl, KCl, NH4Cl, MgCl2, CuSO4, AgNO3, ferrocene (each live round-trip verified)
  └ makes B and C demonstrable end-to-end
        ↓
Phase E (optional / fast-follow) — token-precise /q hover   [depends on: B]
  ├ parseInchi.ts: extend SubHover with kind:'charge' + canonRange
  ├ LayerText.tsx: ChargeText sub-renderer (mirror ParityText)
  └ highlightUtils.ts: buildSubHoverSpecs case 'charge'
P2/P3 deferred: "Why is the metal gone?" proactive callout; salt breakdown panel;
                disconnection diff visualization; KMnO4 / hexaamminecobalt presets.
```

**Ordering rationale:** A is first because one check de-risks the whole milestone and isolates the only plausible new code (lone-metal remap). B is the highest-value table-stakes fix and is independent of presets (test with fixtures). C is copy-only and can run parallel to B. D depends on nothing but the round-trip method confirmed in A and makes B/C vivid. E is additive sugar gated behind B. Every phase honors **no-remount** (no `<Editor>` conditionals, no new StructServiceProvider) and **verbatim passthrough** (parsers stay offset-only; renderers slice raw text).

---

## Architectural Patterns (reused, not invented)

### Pattern 1: `;`-split + cumulative-offset per-fragment loop

**What:** Split a multi-component layer text on `;`, walk components left-to-right adding `fragCounts[fi]` to a running `cumulativeOffset` so each component's local atom numbers become global canonical IDs.
**When to use:** Any per-component reading/highlight/render of `/q`, `/p`, `/c`, `/h`, `/t`, `/b`.
**Trade-offs:** Requires `formulaFragmentCounts(formula.text)` (available everywhere). Robust to `N*` multipliers via `expandLayerText`.
**Example (the canonical instance to copy):**
```typescript
// layerInfo.ts readingFor case 't' / highlightUtils.ts case 'q'
const segments = layer.text.split(';');
let cumOffset = 0;
segments.forEach((seg, fi) => {
  // ...use seg with atoms offset by cumOffset...
  cumOffset += fragCounts[fi] ?? 0;
});
```

### Pattern 2: `canonRange` fragment scoping for sub-hover

**What:** A `SubHover` carries `canonRange: [lo, hi]`; the highlight builder filters `auxMap`/`layer.atoms` to that inclusive canonical range so a hover lights up only the hovered component.
**When to use:** Per-token charge hover (Q1/Phase E); already used for per-fragment element hover.
**Example:** `FormulaText` multi-dot branch (`LayerText.tsx:91-107`) → `buildSubHoverSpecs case 'element'` (`highlightUtils.ts:419-422`).

### Pattern 3: Offsets-only parser, verbatim-slicing renderer

**What:** Parsers return canonical indices / token offsets; the displayed string is always `raw.slice(...)`, never reconstructed.
**When to use:** Always. The project's load-bearing invariant (MEMORY: "never reconstruct InChI").
**Trade-offs:** Slightly more plumbing (rawText passed alongside parsed Layer) but guarantees displayed === copied === WASM output.

---

## Data Flow Changes (v1.5)

```
Hover a /q component token (Phase E)
    ↓
LayerText ChargeText span → setSubHover({kind:'charge', canonRange:[lo,hi]})
    ↓
store.subHover → useKetcherHighlights → buildSubHoverSpecs case 'charge'
    ↓
filter auxMap to [lo,hi] (or struct formally-charged) → highlights.create(--c-charge)
```
Everything else (formula/`/q` whole-pill hover, metal highlight) flows through the **unchanged** existing path. The only new edge in the graph is the `kind:'charge'` sub-hover, and it is optional (Phase E).

---

## Anti-Patterns (domain-specific, v1.5)

### Anti-Pattern 1: Building a `/r` reconnected-layer parser
**What people do:** Assume Standard InChI emits a `/r` reconnected layer and write a parser for it.
**Why it's wrong:** ketcher 3.12.0's `getInchi(withAuxInfo?: boolean)` has no options string; it emits **Standard InChI only** (`1S/…`), which by definition never contains `/r`. The parser would be dead code.
**Do this instead:** Explain *why the metal is disconnected* (Q2). Treat `/r` as an anti-feature.

### Anti-Pattern 2: Reconstructing the metal's bonds / charge-balancing the drawing
**What people do:** Re-derive coordination bonds or "fix" an under-specified ion before display.
**Why it's wrong:** Violates verbatim passthrough (MEMORY). The tool explains exactly what the WASM made of the user's drawing.
**Do this instead:** Show the disconnected `1S` output verbatim; the absent bond IS the lesson.

### Anti-Pattern 3: Adding a store field or remounting for the disconnection callout
**What people do:** Introduce a new Zustand field / conditionally render around `<Editor>` to show the callout.
**Why it's wrong:** Breaks the no-remount invariant (re-initializes WASM, flashes the loading overlay).
**Do this instead:** Derive the callout boolean from `layers` inside `Explanation.tsx`; render it in the existing card.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Ketcher WASM (Indigo) | `ketcher.getInchi(true)` / `getInChIKey()` | Single boolean param — no `/RecMet`, no options. Standard InChI only. Unchanged. |

### Internal Boundaries

| Boundary | Communication | v1.5 notes |
|----------|---------------|-----------|
| `parseInchi.ts` ↔ `highlightUtils.ts` | shared `Layer`/`SubHover`/`AuxMap` types | Extend `SubHover` with `kind:'charge'` only if Phase E. |
| `LayerText.tsx` → store → `useKetcherHighlights` | `setSubHover` / `setHover` | New `'charge'` sub-hover is the only new message (optional). |
| `layerInfo.ts` → `Explanation.tsx` | `readingFor` / `LAYER_INFO` | Primary content change surface; both already receive `fragCounts`. |
| `molecules.ts` → `setMolecule` | SMILES string | Data-only; per-preset live round-trip required. |

---

## New-vs-Modified Summary (for the roadmapper)

| File | New or Modified | Scope | Phase |
|------|-----------------|-------|-------|
| `layerInfo.ts` `readingFor` q/p | Modified | per-component reading (mirror case 't') | B |
| `layerInfo.ts` `LAYER_INFO.q`/`.p` | Modified | corrected salt-aware copy | B |
| `layerInfo.ts` `LAYER_INFO.formula`/`.c` + readings | Modified | disconnection prose | C |
| `Explanation.tsx` | Modified (optional) | honest-limitation callout (content, derived boolean) | C |
| `molecules.ts` | Modified | preset data additions | D |
| `parseInchi.ts` `SubHover` | Modified (optional) | add `kind:'charge'` + canonRange | E |
| `LayerText.tsx` `ChargeText` | New (optional) | q/p sub-renderer (mirror `ParityText`) | E |
| `highlightUtils.ts` `buildSubHoverSpecs case 'charge'` | New (optional) | per-token charge highlight | E |
| `highlightUtils.ts` `buildHighlightSpecs case 'q'` | **Unchanged** | already per-component | — |
| `parseAuxMapping.ts` `remapAuxToPoolIds` | **Unchanged unless gate fails** | lone-metal coord match | A (verify) |

---

## Sources

- Existing source (read directly, HIGH): `src/lib/parseInchi.ts`, `highlightUtils.ts`, `layerInfo.ts`, `parseAuxMapping.ts`, `src/components/LayerText.tsx`, `Explanation.tsx`, `InchiSection.tsx`, `src/data/molecules.ts`
- `.planning/research/STACK.md` — no-`/r` reframe, AuxInfo-describes-disconnected-structure, zero-new-deps (HIGH)
- `.planning/research/FEATURES.md` — per-component `/q` semantics, preset shortlist, anti-features (HIGH)
- `.planning/PROJECT.md` — shipped invariants (no-remount D-13, verbatim passthrough), v1.1 multi-fragment remap, v1.4 c-layer/retrospective lesson (HIGH)
- MEMORY: "never reconstruct InChI" (HIGH)

---
*Architecture research for: inorganic capabilities integration into the InChI explainer (v1.5)*
*Researched: 2026-06-22*
