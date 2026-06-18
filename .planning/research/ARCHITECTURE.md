# Architecture Research — v1.3 InChIKey display & explanation

**Domain:** InChIKey display & explanation strip — integration into the existing "Explain that InChI" single-page tool
**Researched:** 2026-06-18
**Confidence:** HIGH (read against the real codebase; InChIKey API verified in the bundled `ketcher-core` 3.12.0 source)

## Executive Summary

The InChIKey feature is a **clean additive strip** that sits below the existing InChI strip and mirrors its hover treatment (color-coded segments + per-segment explanation card + copy button) **but does NOT touch the canvas-highlight pipeline**. The InChIKey is a one-way hash; its segments are positional substrings of a fixed-format 27-character string, not atom-mapped. This is the key architectural simplification: everything downstream of `buildHighlightSpecs` / `useKetcherHighlights` is irrelevant to the InChIKey.

Three findings drive the design:

1. **Source is already in the public API.** `ketcher.getInChIKey(): Promise<string>` exists on the `Ketcher` class in `ketcher-core@3.12.0` (verified in `node_modules/ketcher-core/dist/index.modern.js` line 59582; it delegates to `structService.getInChIKey(struct)` in the standalone WASM provider). **This resolves the STACK research's open question — no new dependency, no separate library, no reconstruction.** It fits the existing debounced `getInchi(true)` call site exactly.

2. **The no-reconstruct rule is honored by construction.** The verbatim key string is stored as-is. The parser is a tiny *pure offset computer* that returns `{kind, start, end}` index ranges; the renderer slices the **stored verbatim string** (`key.slice(start, end)`) — never re-joining segment text. This mirrors how `InchiSection` sources `rawText` from `l.text` rather than rebuilding.

3. **Reuse the visual/CSS pattern, NOT the LayerText/highlight machinery.** `LayerText` exists purely to emit `subHover` specs that drive canvas highlights — the InChIKey has none, so reusing it would carry irrelevant complexity. Build a small parallel `InchiKeySection` + `InchiKeyExplanation` pair that reuse the existing CSS module classes (`.inchiLayer`, `.copyBtn`, `.copiedFeedback`, etc.) and the explanation-card markup, but with a far simpler hover model (one local `useState` index — no Zustand `subHover`, no `useKetcherHighlights`).

## Standard Architecture

### System Overview — where InChIKey slots in

```
┌──────────────────────────────────────────────────────────────────────┐
│ App.tsx — pipeline owner                                               │
│  editor 'change' → debounce 150ms → getInchi(true)  ──┐                 │
│                                   → getInChIKey()  ────┤ NEW            │
│                                                        ▼                │
│                              parseInchiWithAux + remapAuxToPoolIds      │
│                                                        ▼                │
│                              store.setInchiData(... , inchiKey) NEW arg │
└──────────────────────────────────────────────────────────────────────┘
                                   │ (Zustand store)
        ┌──────────────────────────┼──────────────────────────────┐
        ▼                          ▼                               ▼
┌───────────────┐         ┌────────────────────┐      ┌────────────────────┐
│ InchiSection  │         │ InchiKeySection NEW │      │ Explanation         │
│ (InChI strip) │         │ (InChIKey strip)    │      │ (InChI layer card   │
│  LayerText →  │         │  pure slice render  │      │  + Legend)          │
│  subHover →   │         │  local hover index  │      │                     │
│  canvas hl    │         │  NO canvas hl       │      │ InchiKeyExplanation │
└───────┬───────┘         └─────────┬──────────┘      │   NEW (card only)   │
        │                           │                 └────────────────────┘
        ▼                           ▼ (no arrow to canvas — hash isn't mapped)
┌──────────────────────────────────────────┐
│ useKetcherHighlights → Ketcher canvas      │  ← InChIKey does NOT participate
└──────────────────────────────────────────┘
```

### Component Responsibilities

| Component | New/Modified | Responsibility |
|-----------|--------------|----------------|
| `App.tsx` | **Modified** | Add `getInChIKey()` alongside `getInchi(true)` in the debounced handler; pass key into `setInchiData`. |
| `store.ts` | **Modified** | Add `inchiKey: string` field + extend `setInchiData` signature. Verbatim only. |
| `lib/parseInchiKey.ts` | **New (pure)** | `parseInchiKeySegments(key): InchiKeySegment[]` — returns `{kind,start,end}` index ranges. Display-metadata only; never returns reassembled text. Unit-testable, no DOM. |
| `lib/inchiKeyInfo.ts` | **New** | `INCHIKEY_SEGMENT_INFO` map (title/blurb/swatch per segment kind) + `INCHIKEY_DEFAULT_INFO`. Mirrors `layerInfo.ts` shape. |
| `components/InchiKeySection.tsx` | **New** | Renders verbatim key, slices by segment ranges, color-codes spans, copy button, local hover index. |
| `components/InchiKeyExplanation.tsx` | **New** | Per-segment explanation card; reuses `Explanation.module.css` card markup. |
| `components/InchiKeySection.module.css` | **New (thin)** | Reuses InchiSection tokens/classes where possible. |

## Recommended Project Structure

```
src/
├── App.tsx                              # MOD: getInChIKey() in pipeline
├── store.ts                             # MOD: + inchiKey field
├── lib/
│   ├── parseInchiKey.ts                 # NEW: pure offset parser (no DOM, no reconstruct)
│   ├── inchiKeyInfo.ts                  # NEW: segment titles/blurbs/swatches
│   └── __tests__/parseInchiKey.test.ts  # NEW: offset correctness, malformed-key guards
└── components/
    ├── InchiKeySection.tsx              # NEW: the strip (parallel to InchiSection)
    ├── InchiKeySection.module.css       # NEW: thin, reuses InchiSection tokens
    └── InchiKeyExplanation.tsx          # NEW: the card (parallel to Explanation)
```

### Structure Rationale

- **Parser in `lib/` (pure, tested first).** Follows the proven v1.2 pattern ("Pure DOM-free `buildFeedbackUrl()` built/tested first" — isolated all hard logic behind a unit-tested seam). The only "hard" logic here is offset computation and malformed-key tolerance; isolate and test it before any rendering.
- **Parallel components, not extensions.** `InchiSection`/`LayerText` carry multi-fragment canonical-offset machinery (~370 lines) whose entire purpose is canvas highlighting. The InChIKey has zero canvas semantics, so a parallel ~80-line component is cleaner than threading a "no-highlight" mode through the existing one.
- **Reuse CSS, not TSX.** The visual contract (mono font, color-coded chunks, copy button, hover dim/active) is identical. The CSS module classes are the right reuse seam; the rendering logic is not.

## Architectural Patterns

### Pattern 1: Parse-for-offsets, render-from-verbatim (the no-reconstruct seam)

**What:** The parser returns only positional metadata. The component renders `key.slice(seg.start, seg.end)` from the **stored verbatim string**. Concatenating all rendered slices (plus the dashes, also sliced from the verbatim string) reproduces the original byte-for-byte by construction — there is no code path that joins segment fields.

**When to use:** Always, for the InChIKey. This is the literal enforcement of the project-memory rule "never reconstruct — display the verbatim library output."

**Trade-offs:** None meaningful. Slightly more index bookkeeping than returning substrings, but it makes the no-reconstruct invariant a structural guarantee rather than a discipline.

```typescript
// lib/parseInchiKey.ts — pure, no DOM
export type InchiKeySegmentKind = 'skeleton' | 'rest' | 'flags' | 'protonation';

export interface InchiKeySegment {
  kind: InchiKeySegmentKind;
  start: number;   // index into the verbatim key
  end: number;     // exclusive
}

// Standard InChIKey: 14-char skeleton "-" 8-char rest + version(1) + flag(1) "-" protonation(1)
//   e.g. UHOVQNZJYSORNB-UHFFFAOYSA-N
//        [0,14) skeleton  -  [15,23) rest  [23] version  [24] flag  -  [26] protonation
export function parseInchiKeySegments(key: string): InchiKeySegment[] {
  if (!key) return [];
  const segs: InchiKeySegment[] = [];
  const dash1 = key.indexOf('-');
  if (dash1 < 0) return [{ kind: 'skeleton', start: 0, end: key.length }]; // tolerate malformed
  segs.push({ kind: 'skeleton', start: 0, end: dash1 });            // heavy-atom connectivity hash
  const dash2 = key.indexOf('-', dash1 + 1);
  const block2End = dash2 < 0 ? key.length : dash2;
  const flagsStart = Math.max(dash1 + 1, block2End - 2);
  segs.push({ kind: 'rest', start: dash1 + 1, end: flagsStart });   // remaining-layers hash
  segs.push({ kind: 'flags', start: flagsStart, end: block2End });  // version char + stereo/layer flag
  if (dash2 >= 0 && dash2 + 1 < key.length) {
    segs.push({ kind: 'protonation', start: dash2 + 1, end: key.length }); // protonation indicator
  }
  return segs;
}
```

```tsx
// InchiKeySection.tsx — render strictly from the verbatim string by slice
{segments.map((seg, i) => (
  <span key={i}
        className={[styles.inchiLayer, hover === i ? styles.active : '', hover !== null && hover !== i ? styles.dim : ''].filter(Boolean).join(' ')}
        style={{ color: `var(--c-${swatch(seg.kind)})` }}
        onMouseEnter={() => setHover(i)}>
    {inchiKey.slice(seg.start, seg.end)}   {/* verbatim — never reassembled */}
  </span>
))}
{/* dashes also rendered from the verbatim string, e.g. inchiKey.slice(seg.end, nextSeg.start) */}
```

### Pattern 2: Local hover state, not the Zustand `subHover` bus

**What:** InChIKey hover is purely cosmetic (color the card + dim siblings). Use a component-local `const [hover, setHover] = useState<number|null>(null)` instead of writing to the shared store.

**When to use:** Whenever the hover does not need to drive the canvas or be observed across a global boundary. The InChIKey card can live inside `InchiKeySection` (or read a local prop), so no global state is needed.

**Trade-offs:** If a future requirement wants the InChIKey card rendered in the same physical `Explanation` panel as the InChI card, lift the hover index to the store. For v1.3 as scoped (self-contained strip + its own card), local state is correct and avoids polluting the InChI store's `hoverIdx`/`subHover`. **Do not reuse `setHover`/`setSubHover`** — those are wired to `useKetcherHighlights` and would fire spurious canvas highlights for hash characters and collide with the InChI strip's own `hoverIdx`.

### Pattern 3: Copy button reuse (PLSH-04 parity)

**What:** Copy the verbatim `inchiKey` via the exact `handleCopy` pattern already in `InchiSection` (lines 28–44): `navigator.clipboard.writeText(inchiKey)`, `mountedRef` guard, 3s "Copied!" reset, silent catch. Reuse `.copyBtn` / `.copiedFeedback` CSS classes and the same SVG.

**When to use:** Directly. Cleanest reuse seam is a small `useCopyToClipboard(value)` hook (the logic is identical, including the StrictMode-safe mountedRef dance); extract it once and use it from both strips. If the roadmap prefers minimal touch, copy the helper verbatim into the new component instead.

**Trade-offs:** Extracting the hook touches `InchiSection` too (one extra modified file) but removes duplication. Recommended.

## Data Flow

### InChIKey generation flow (added to existing pipeline)

```
editor 'change' event
   ↓ (isHighlightingRef guard, 150ms debounce — UNCHANGED)
thisGen = ++generationRef.current
   ↓
const [raw, key] = await Promise.all([ketcher.getInchi(true), ketcher.getInChIKey()])  // NEW sibling await
   ↓ (stale-result guard: if thisGen !== generationRef.current return)  — UNCHANGED, now guards key too
parseInchiWithAux(raw) + remapAuxToPoolIds(...)   // existing
   ↓
store.setInchiData(inchi, layers, auxMap, atomElements, hAtomPoolIds, key)   // key appended
   ↓ empty/invalid path: setInchiData('', [], {}, {}, [], '')                // key cleared too
```

**Sequencing note:** `Promise.all` of the two independent WASM round-trips minimizes latency; check `thisGen` once after both resolve. (A sequential pair of awaits with one post-check is equally correct, just marginally slower.) Either way the existing stale-generation guard must run after the key resolves so a slow prior result cannot overwrite newer state.

**Empty/invalid guard:** Reuse the existing `result.layers.length < 2` empty-canvas guard — set `inchiKey` to `''` there. `getInChIKey()` may throw on an empty/disconnected canvas exactly like `getInchi()`; the existing `try/catch` already covers this, just clear the key in the catch path too.

### Render flow

```
store.inchiKey (verbatim string)
   ↓ (selector)
InchiKeySection
   ├─ parseInchiKeySegments(inchiKey) → segment offsets   (recompute on render; cheap, pure)
   ├─ render spans via inchiKey.slice(start,end)           (verbatim)
   ├─ local hover index → dim/active + card content
   └─ InchiKeyExplanation(hoveredKind) → INCHIKEY_SEGMENT_INFO[kind]  (title + blurb)
```

`parseInchiKeySegments` is cheap and pure — recompute inline on render (like `formulaFragmentCounts` is in `InchiSection`); no need to store segments. Store only the verbatim string.

### Store change (minimal)

```typescript
interface InchiState {
  // ...existing...
  inchiKey: string;               // NEW — verbatim getInChIKey() output, '' when empty
  setInchiData: (inchi, layers, auxMap, atomElements, hAtomPoolIds?, inchiKey?) => void;  // append param
}
// initial: inchiKey: ''
// setInchiData: (..., inchiKey = '') => set({ ..., inchiKey })
```

Prefer appending an optional `inchiKey` arg to `setInchiData` (keeps the single atomic store write per generation, matching the existing pattern) over a separate `setInchiKey` (which would split one logical update into two and risk a transient mismatch between the InChI and its key).

## Build Order

Ordered to put the API-dependent piece first (it gates everything) and the tested-pure-seam second:

1. **Verify + wire the source (gates everything).** Confirm `ketcher.getInChIKey()` returns the expected `AAAAAAAAAAAAAA-BBBBBBBBFV-P` string in the running app (present in `ketcher-core@3.12.0` — see Sources). Add the call to the debounced handler and the `inchiKey` store field. Smoke-test that the verbatim key reaches the store. **This is the only step with external-dependency risk; do it first so a surprise here reshapes nothing downstream.**
2. **Pure parser + tests (`parseInchiKey.ts`).** Cases: standard key, charged species (protonation char ≠ `N`), non-standard flag char, and **malformed/short strings** (tolerate gracefully — never throw, never drop characters). Assert the invariant: concatenating all `key.slice(start,end)` + the rendered dashes equals the original key exactly.
3. **Explanation content (`inchiKeyInfo.ts`).** Author the skeleton-hash / rest-hash / version+flag / protonation blurbs, plus the cross-cutting "one-way hash, not reversible, no atom mapping, collision caveat" copy required by the milestone.
4. **`InchiKeySection` strip.** Verbatim-slice rendering, color-coded spans, dashes, local hover, copy button. Reuse `InchiSection.module.css` classes.
5. **`InchiKeyExplanation` card + mount in `App.tsx`.** Place below `<InchiSection />`. Decide card placement (inside the strip vs. its own panel row) per design handoff.
6. **Empty/invalid + copy parity polish.** Empty-canvas placeholder, "Copied!" confirmation, token-fidelity pass.

**Dependency on STACK research:** Step 1 *is* the answer to STACK's open question — the InChIKey source is `ketcher.getInChIKey()` (no new package). If a future Ketcher upgrade ever removed it, the fallback is the standalone `structService.getInChIKey(struct)` it wraps; no third-party JS InChIKey library is needed.

## Anti-Patterns

### Anti-Pattern 1: Reusing `LayerText` for the InChIKey

**What people do:** Render InChIKey segments through the existing `LayerText` dispatcher "for consistency."
**Why it's wrong:** `LayerText`'s entire job is emitting `subHover` specs (`{kind:'atom'|'element'|'stereo'|...}`) that `buildSubHoverSpecs` turns into canvas highlights via per-fragment canonical offsets. None applies to a hash. You'd carry ~370 lines of irrelevant offset logic and fight to suppress highlight side-effects.
**Do this instead:** A flat `inchiKey.slice()` render in a small parallel component.

### Anti-Pattern 2: Writing InChIKey hover into `store.hoverIdx` / `store.subHover`

**What people do:** Reuse the existing `setHover`/`setSubHover` actions.
**Why it's wrong:** Those fields are observed by `useKetcherHighlights`, which would attempt to highlight canvas atoms from hash-character hovers (nonsensical) and would collide with the InChI strip's shared `hoverIdx`.
**Do this instead:** Local `useState` for the InChIKey hover index; keep it out of the InChI store's hover fields.

### Anti-Pattern 3: Reconstructing the key from segment labels

**What people do:** Have the parser return `{label:'...text...'}` and render `seg.label`, or join segments to "build" the displayed key.
**Why it's wrong:** Violates the project-memory invariant; risks normalization/order drift exactly like the InChI passthrough bug the memory warns about.
**Do this instead:** Parser returns offsets only; component slices the stored verbatim string. The invariant becomes structural.

### Anti-Pattern 4: Storing parsed segments in Zustand

**What people do:** Add `inchiKeySegments: InchiKeySegment[]` to the store beside the string.
**Why it's wrong:** Redundant derived state to keep in sync; the parse is pure and trivially cheap to recompute on render (like `formulaFragmentCounts`).
**Do this instead:** Store only the verbatim string; derive segments in the component.

## Integration Points

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `App.tsx` ↔ WASM (Ketcher) | `await ketcher.getInChIKey()` | Sibling to existing `getInchi(true)`; same debounce, same stale-gen guard. Verified public API in 3.12.0. |
| `App.tsx` ↔ store | `setInchiData(..., inchiKey)` | Single atomic write per generation; append optional arg. |
| store ↔ `InchiKeySection` | `useInchiStore(s => s.inchiKey)` selector | Read verbatim string only. |
| `InchiKeySection` ↔ `InchiKeyExplanation` | local hover index (prop or local state) | NOT the global store; no canvas coupling. |
| `InchiKeySection` ↔ canvas | **none** | Deliberate: hash is not atom-mapped. The absence of this edge is the defining property of the feature. |

## Scaling Considerations

Not applicable in the traditional sense — single-page, single-molecule, client-only. The only "scale" axis is per-keystroke recompute cost: `getInChIKey()` is one extra WASM round-trip per debounced change (150ms), negligible relative to `getInchi(true)` + AuxInfo parsing already running. `parseInchiKeySegments` is O(27 chars). No concerns.

## Sources

- Existing pipeline & store (read directly): `src/App.tsx` (lines 125–207 debounced handler), `src/store.ts`, `src/components/InchiSection.tsx`, `src/components/LayerText.tsx`, `src/components/Explanation.tsx`, `src/lib/parseInchi.ts`, `src/lib/layerInfo.ts`, `src/hooks/useKetcherHighlights.ts` — HIGH
- `ketcher.getInChIKey()` public API: `node_modules/ketcher-core/dist/index.modern.js` line 59582 (`key: "getInChIKey"` → `this.structService.getInChIKey(struct)`); standalone impl present in `node_modules/ketcher-standalone/dist/main.js` — **HIGH (read from installed 3.12.0 source)**
- InChIKey format (27 chars: 14 skeleton `-` 8 rest + version + flag `-` protonation): IUPAC InChI Technical Manual / standard definition — HIGH (stable, long-established spec)
- v1.2 "pure helper tested first" precedent: PROJECT.md Key Decisions — HIGH

---
*Architecture research for: InChIKey strip integration*
*Researched: 2026-06-18*
