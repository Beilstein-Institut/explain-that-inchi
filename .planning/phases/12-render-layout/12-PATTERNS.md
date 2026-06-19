# Phase 12: Render & Layout - Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 5 (2 new, 3 modified)
**Analogs found:** 5 / 5 (all surfaces have an in-repo analog)

> Phase 12 mirrors the existing InChI strip exactly (D-12), introduces zero new tokens (D-01), zero new dependencies, and is a pure leaf sibling (D-13 / Invariant #3). The dominant strategy is **duplicate-inline-and-adapt** (D-11), not refactor. Existing `InchiSection` + its tests must stay green (SC-5).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/InchiKeySection.tsx` (NEW) | component | request-response (store-read + local copy) | `src/components/InchiSection.tsx` | exact (same role + data flow; the strip this mirrors) |
| `src/components/InchiKeySection.module.css` (NEW) | config (CSS Module) | n/a (style tokens) | `src/components/InchiSection.module.css` | exact (verbatim values to copy per D-12) |
| `src/store.ts` (MODIFY) | store | event-driven (Zustand set/select) | `src/store.ts` itself (`hoverIdx` field + `setHover` setter) | exact (extend in place) |
| `src/components/Explanation.tsx` (MODIFY) | component | request-response (store-read) | `src/components/Explanation.tsx` itself (`hoverIdx`/`layers` read + idle/active branch) | exact (extend in place) |
| `src/App.tsx` (MODIFY) | component (composition root) | n/a | `src/App.tsx` lines 237-238 (existing `<InchiSection />`/`<Explanation />` JSX) | exact (single-line insert) |

**Data sources already wired (do NOT touch):** `store.inchiKey` (Phase 11), `parseInchiKey()` (Phase 11, tested). `InchiKeySection` reads `inchiKey`, slices verbatim by `parseInchiKey()` offsets.

---

## Pattern Assignments

### `src/components/InchiKeySection.tsx` (component, request-response) — NEW

**Analog:** `src/components/InchiSection.tsx` (entire file; copy structure, adapt hover wiring + slicing).

**Key adaptations from the analog (do NOT copy 1:1):**
- Read `inchiKey` instead of `inchi`/`layers`/`hoverIdx`. Compute segments via `parseInchiKey(inchiKey)`.
- Empty gate: `const segments = parseInchiKey(inchiKey); const isEmpty = segments.length === 0;` (replaces `layers.length === 0`). This is the 27-char gate (D-10 / SC-4) — `parseInchiKey` returns `[]` for anything not a valid 27-char key.
- **Hover MUST NOT call `setHover`/`setSubHover`.** Instead call a NEW dedicated setter (`setKeyHoverKind`, name Claude's discretion) that is NOT wired to `useKetcherHighlights` (D-04 / Invariant #2). This is the single most important divergence.
- Slice verbatim: render each colored span as `inchiKey.slice(seg.start, seg.end)` — never reconstruct (Invariant #1).
- 5 colored spans (D-02) but only 4 hover zones (D-07): `skeleton`, `hash`, `flag+version` (combined), `protonation`. The flag and version spans stay individually colored but share one `onMouseEnter` zone → one `keyHoverKind` value (e.g. `'flagVersion'`).
- Render dimmed hyphens at the segment boundaries (between skeleton/hash and between version/protonation) using a hyphen analog to `.inchiSlash` (which renders `/`). Hyphens are NOT hoverable, NOT colored.
- Dimmed inline `InChIKey` prefix (D-09), mirroring `.inchiPrefix` `InChI=`.
- Copy button copies verbatim `inchiKey` (not `inchi`); aria-label `Copy InChIKey`.

**Imports pattern** (analog lines 8-13) — mirror, swapping parser/token helpers:
```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useInchiStore } from '../store';
import { parseInchiKey } from '../lib/parseInchiKey';   // replaces parseInchi import
import styles from './InchiKeySection.module.css';
// NOTE: no LayerText import (no sub-tokens); token color comes from a local
// kind→token map (see Segment→token mapping), not swatchVar() (that takes a LayerType).
```

**Copy-button pattern — copy VERBATIM** (analog lines 23-44; D-11 / WR-02 / PLSH-04). The `mountedRef` StrictMode guard is the load-bearing detail:
```typescript
const [copied, setCopied] = useState(false);

// Guard against calling setCopied on an unmounted component (WR-02).
// Reset to true on (re)mount so StrictMode's dev double-invoke (mount → cleanup →
// mount) doesn't leave the ref stuck false, which would block setCopied(false).
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(inchiKey);   // verbatim stored key (Invariant #1)
    setCopied(true);
    setTimeout(() => { if (mountedRef.current) setCopied(false); }, 3000);
  } catch {
    // Silent failure — clipboard API may be unavailable in some contexts
  }
}
```

**Core render pattern** (analog lines 46-104) — mirror structure, swap hover wiring + slicing:
```typescript
return (
  <section className={styles.inchiKeySection}>
    <div
      className={styles.inchiKeyDisplay}
      data-empty={isEmpty ? 'true' : undefined}
      onMouseLeave={isEmpty ? undefined : () => {
        useInchiStore.getState().setKeyHoverKind(null);   // NOT setHover/setSubHover (D-04)
      }}
    >
      {isEmpty ? (
        <span className={styles.emptyHint}>Draw a molecule above to see its InChIKey.</span>
      ) : (
        <>
          <span className={styles.inchiPrefix}>InChIKey</span>
          {/* map segments → colored spans, inserting dimmed hyphens at boundaries,
              setting keyHoverKind onMouseEnter (flag+version share one zone, D-07).
              color via inline style: { color: 'var(--c-<token>)', ...(active ? { background: 'var(--c-<token>-bg)' } : {}) } */}
          <button className={styles.copyBtn} onClick={handleCopy} aria-label="Copy InChIKey">
            {/* inline SVG copy icon — copy verbatim from analog lines 96-99 (16×16 rect+path) */}
          </button>
          {copied && <span className={styles.copiedFeedback}>Copied!</span>}
        </>
      )}
    </div>
  </section>
);
```

**Active/dim class pattern** (analog lines 61-79) — mirror exactly: active span gets `styles.active` + inline `background`; sibling spans get `styles.dim` when a different zone is hovered. Drive `isActive`/`isDim` off the hovered **zone** (4 zones), so the flag and version spans both light up / both dim together.

---

### `src/components/InchiKeySection.module.css` (config) — NEW

**Analog:** `src/components/InchiSection.module.css` — copy the relevant rules VERBATIM (D-12), rename class roots (`.inchiSection`→`.inchiKeySection`, `.inchiDisplay`→`.inchiKeyDisplay`). **Do NOT copy** the sub-token / formula-element / parity / hydro / `.sectionLabel` / `.hint` rules (no sub-tokens or section label in this strip — D-06).

**Rules to copy verbatim** (with renamed roots):
```css
.inchiKeySection { margin-top: 12px; }                    /* from .inchiSection L8-10 */

.inchiKeyDisplay {                                        /* from .inchiDisplay L33-47 */
  background: var(--bg-canvas);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 14px;
  padding-right: 40px;
  font-family: var(--font-mono);
  font-size: 19px;
  line-height: 1.6;
  letter-spacing: -0.005em;
  word-break: break-all;
  cursor: default;
  min-height: calc(1.6em + 16px);
  position: relative;
}

.inchiPrefix { color: var(--ink-faint); }                /* L50-52 */
.inchiSlash  { color: var(--ink-faint); margin: 0 1px; } /* L55-58 — reuse for the dimmed hyphens */

.inchiLayer {                                             /* L61-67 — segment chip */
  display: inline;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}
.active { /* background applied via inline style */ }     /* L69-71 */
.dim { opacity: 0.35; transition: opacity 160ms ease; }   /* L73-76 — D-12 dim value */

.inchiKeyDisplay[data-empty="true"] {                     /* L129-134 */
  opacity: 0.45;
  border-color: var(--line-soft);
  cursor: default;
  pointer-events: none;
}
.emptyHint {                                              /* L136-143 */
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 14px;
  display: block;
  text-align: center;
  padding: 4px 0;
}

/* copy button + copied feedback — copy verbatim L146-188 */
.copyBtn { /* ...absolute right:10px, top:50%, translateY(-50%), color var(--ink-faint)... */ }
.copyBtn:hover { color: var(--c-formula); }
.copyBtn:focus-visible { outline: 2px solid var(--c-formula); outline-offset: 2px; color: var(--c-formula); }
.copyBtn svg { width: 16px; height: 16px; display: block; }
.copiedFeedback { /* ...absolute right:36px, font-size 11px, color var(--c-formula)... */ }
```
**Note on dim value mismatch:** `.dim` segment opacity is **0.35** (D-12, mirror the strip). The empty-box opacity is **0.45**. Both are correct — they are different states.

---

### `src/store.ts` (store, event-driven) — MODIFY

**Analog:** the existing `hoverIdx` field + `setHover` setter in the same file.

**Existing pattern to mirror** (lines 16-22, 39-43):
```typescript
// in InchiState interface:
hoverIdx: number | null;
// ...
setHover: (idx: number | null) => void;

// in the create() initialiser:
hoverIdx: null,
setHover: (idx) => set({ hoverIdx: idx }),
```

**Add (parallel to hoverIdx, but a string-union value, NOT wired to highlights — D-04):**
```typescript
// import the hover-zone type — reuse parser kinds + the combined zone:
import type { InchiKeySegmentKind } from './lib/parseInchiKey';
// hover-zone union (4 zones per D-07): skeleton | hash | flagVersion | protonation
// (Claude's discretion: a dedicated KeyHoverZone type, or reuse InchiKeySegmentKind
//  collapsing flag+version. Recommended: a new union since 'flagVersion' is not a parser kind.)

// in InchiState:
keyHoverKind: KeyHoverZone | null;
setKeyHoverKind: (kind: KeyHoverZone | null) => void;

// in initialiser:
keyHoverKind: null,
setKeyHoverKind: (kind) => set({ keyHoverKind: kind }),
```

**GUARDRAIL:** `setKeyHoverKind` must NEVER be called from `useKetcherHighlights`, and `useKetcherHighlights` must keep reading only `hoverIdx`/`subHover` (Invariant #2). Do not add `keyHoverKind` to `setInchiData` or any highlight path.

---

### `src/components/Explanation.tsx` (component, request-response) — MODIFY

**Analog:** the existing idle/active branch in the same file (lines 19-68).

**Existing read + precedence pattern** (lines 15-24):
```typescript
const layers = useInchiStore(state => state.layers);
const hoverIdx = useInchiStore(state => state.hoverIdx);
const atomElements = useInchiStore(state => state.atomElements);

const layer = hoverIdx !== null ? layers[hoverIdx] : null;
const info = layer ? LAYER_INFO[layer.type] : null;
const accentVar = layer ? `var(--c-${swatchVar(layer.type)})` : 'var(--ink-faint)';
```

**Add a `keyHoverKind` read + the D-04a precedence branch:**
```typescript
const keyHoverKind = useInchiStore(state => state.keyHoverKind);
// Precedence (D-04a): key-hover wins → InChI-layer → idle.
// if (keyHoverKind) render key-segment card (Phase 13 fills prose; Phase 12 = scaffolding only)
// else if (layer)    render existing InChI-layer card (UNCHANGED)
// else               render existing idle card (UNCHANGED)
```
**Scaffolding only (Phase 12):** the key-segment branch reuses the SAME card markup as the active layer branch — `styles.card` + `styles.active`, `--accent` set to the segment's token (per the Segment→token map below), `.layerTag` / `.layerTitle` / `.layerBody`. Phase 12 may use placeholder/minimal copy; **Phase 13 supplies the real prose**. Reuse the existing card CSS classes (`styles.layerTag`, `styles.swatch`, `styles.layerTitle`, `styles.layerBody`) — do NOT add new card styles.

**TEST-SAFETY GUARDRAIL:** `src/__tests__/InchiSection.test.tsx` mocks `../store` with an object that does NOT include `keyHoverKind`. Any new `useInchiStore(state => state.keyHoverKind)` selector in `Explanation` will receive `undefined` from such a mock. Treat `undefined` the same as `null` (`if (keyHoverKind)` is already falsy-safe). When adding/extending tests, update the store mock to include `keyHoverKind` + `setKeyHoverKind` so existing-strip tests stay green (SC-5).

---

### `src/App.tsx` (composition root) — MODIFY

**Analog:** existing JSX at lines 237-238.

**Current (lines 237-238):**
```tsx
<InchiSection />
<Explanation />
```
**Target (D-05 order `KetcherPanel → InchiSection → InchiKeySection → Explanation`):**
```tsx
<InchiSection />
<InchiKeySection />   {/* inserted as a pure leaf sibling — no props, reads store directly */}
<Explanation />
```
Add the import alongside the existing `InchiSection` import. **Do NOT touch** `<KetcherPanel>` or the module-level `structServiceProvider` (D-13 / Invariant #3 — canvas never remounts).

---

## Shared Patterns

### Segment → color token mapping (D-01 / UI-SPEC) — replaces `swatchVar()` for the key strip
**Source pattern:** `swatchVar()` in `src/lib/layerInfo.ts` lines 248-256 (maps a kind → `--c-*` token suffix). `swatchVar` takes a `LayerType`, NOT an InChIKey kind — so do NOT call it; use a small local map instead.
**Apply to:** `InchiKeySection.tsx` (span color) and the `Explanation` key-segment branch (`--accent`).
All tokens confirmed present in `src/styles.css` (both base and `-bg` variants exist):
```
skeleton    → var(--c-conn)      / bg var(--c-conn-bg)       (styles.css L14 / L63)
hash        → var(--c-stereo)    / bg var(--c-stereo-bg)     (styles.css L18 / L67)
flag        → var(--c-version)   / bg var(--c-version-bg)    (styles.css L12 / L61)
version     → var(--c-version)   / bg var(--c-version-bg)    (styles.css L12 / L61)
protonation → var(--c-proton)    / bg var(--c-proton-bg)     (styles.css L17 / L66)
```
Apply via inline `style={{ color: 'var(--c-...)' , ...(isActive ? { background: 'var(--c-...-bg)' } : {}) }}` — exactly the `InchiSection.tsx` lines 64-79 pattern, but values come from this fixed kind→token map (not `swatchVar`).

### Copy button (StrictMode-safe)
**Source:** `src/components/InchiSection.tsx` lines 28-44 (`mountedRef` + 3s reset).
**Apply to:** `InchiKeySection.tsx`. Duplicate inline (D-11) — do NOT extract a shared hook. Copies verbatim `inchiKey`.

### Empty-state placeholder (don't unmount)
**Source:** `src/components/InchiSection.tsx` lines 48-58 + `InchiSection.module.css` lines 129-143.
**Apply to:** `InchiKeySection.tsx`. Always render the box; toggle `data-empty="true"`; gate = `parseInchiKey(inchiKey).length === 0` (D-10 / SC-4).

### Hover-clear on leave
**Source:** `src/components/InchiSection.tsx` lines 51-54.
**Apply to:** `InchiKeySection.tsx` `onMouseLeave` → `setKeyHoverKind(null)` (NOT `setHover`/`setSubHover`).

### Store field + setter (Zustand 5)
**Source:** `src/store.ts` lines 16-22, 39-43 (`hoverIdx` / `setHover`).
**Apply to:** the new `keyHoverKind` / `setKeyHoverKind` — same shape, string-union value, NOT in any highlight path.

---

## No Analog Found

None. Every surface has a direct in-repo analog (the entire phase is a mirror of the existing InChI strip).

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All 5 files map to existing analogs. |

---

## Metadata

**Analog search scope:** `src/components/`, `src/lib/`, `src/store.ts`, `src/styles.css`, `src/App.tsx`, `src/__tests__/`.
**Files scanned:** 8 (InchiSection.tsx, InchiSection.module.css, Explanation.tsx, store.ts, parseInchiKey.ts, layerInfo.ts, App.tsx, InchiSection.test.tsx) + styles.css token grep.
**Pattern extraction date:** 2026-06-18
```
