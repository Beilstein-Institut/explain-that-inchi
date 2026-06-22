# Phase 16: Pin-to-freeze highlights and guided Help tour - Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 10 (9 modified, 1 new) + 2 new module-CSS files
**Analogs found:** 10 / 10 (every modified file is its own best analog; the one NEW file maps to FeedbackDialog)

> Single-codebase reality check: every file in scope already exists and is being *extended*,
> so each file's own current code is the primary "analog to copy from." The one genuinely
> new file (`HelpTour.tsx`) has no overlay-component twin except `FeedbackDialog`, which is
> the structural template. There are **no new dependencies** (D-01) and the **InChI string is
> never re-joined/re-rendered** (passthrough invariant) — pin state is overlay-only.

---

## File Classification

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/store.ts` | modify | store | event-driven (state machine) | self — `hoverIdx`/`subHover`/`resetAll` (store.ts:36-92) | exact |
| `src/components/InchiSection.tsx` | modify | component | event-driven | self — `onMouseEnter`/`onMouseLeave` block (InchiSection.tsx:48-94) | exact |
| `src/components/LayerText.tsx` | modify | component | event-driven | self — `subHoverProps` factory (LayerText.tsx:22-27) | exact |
| `src/hooks/useKetcherHighlights.ts` | modify | hook | transform / request-response | self — store-read → spec-build → Ketcher (useKetcherHighlights.ts:291-360) | exact |
| `src/components/Explanation.tsx` | modify | component | request-response (read) | self — precedence chain (Explanation.tsx:27-130) | exact |
| `src/components/KetcherPanel.tsx` | modify | component | request-response (UI) | self — `.reset-trigger` button + `onResetClick` prop (KetcherPanel.tsx:13-44) | exact |
| `src/components/HelpTour.tsx` | **NEW** | component (overlay) | event-driven (stepped UI) | `src/components/FeedbackDialog.tsx` | role-match (overlay) |
| `src/components/HelpTour.module.css` | **NEW** | config (CSS module) | — | `src/components/FeedbackDialog.module.css` | role-match |
| `src/App.tsx` | modify | provider (state owner) | event-driven | self — `handleReset`/`onResetClick` + preset path (App.tsx:59-110, 235-257) | exact |
| `src/styles.css` | modify | config (global CSS) | — | self — `.reset-trigger`/`.feedback-trigger` block (styles.css:127-198) | exact |
| `src/data/molecules.ts` | **read-only ref** | data | — | `caffeine` entry (molecules.ts:24) | n/a |

---

## Pattern Assignments

### `src/store.ts` (store, event-driven state machine)

**Analog:** self — the `hoverIdx` / `subHover` field + action + `resetAll` shapes are the exact template the new `pinned` field/actions/clear must mirror.

**Type to add** (place near `SubHover` import at store.ts:3; spec §State):
```typescript
import type { Layer, AuxMap, SubHover, LayerType } from './lib/parseInchi';
// new pin shape (CONTEXT D / spec line 41):
// pinned: { idx: number; sub: SubHover | null } | null;  // null = nothing frozen
```

**Field declaration pattern** (mirror store.ts:38-39 inside `interface InchiState`):
```typescript
hoverIdx: number | null;
subHover: SubHover | null;
// add:
pinned: { idx: number; sub: SubHover | null } | null;
```

**Action signatures** (mirror store.ts:46-50 in the interface):
```typescript
setHover: (idx: number | null) => void;
setSubHover: (sub: SubHover | null) => void;
// add:
setPinned: (p: { idx: number; sub: SubHover | null } | null) => void;
clearPinned: () => void;
```

**Initial value + actions** (mirror the initialiser at store.ts:60-78). CRITICAL — the gate goes
here (spec line 48: while `pinned` non-null, `setHover`/`setSubHover` are no-ops). Use `get` —
the current initialiser only destructures `set`, so widen to `(set, get)`:
```typescript
devtools(
  (set, get) => ({         // <-- was (set) => ; add get for the gate
    // ...existing fields...
    hoverIdx: null,
    subHover: null,
    pinned: null,          // <-- add
    // gate: no-op while pinned (single enforcement point, spec line 48)
    setHover: (idx) => { if (get().pinned) return; set({ hoverIdx: idx }); },
    setSubHover: (sub) => { if (get().pinned) return; set({ subHover: sub }); },
    setPinned: (p) => set({ pinned: p }),
    clearPinned: () => set({ pinned: null }),
```

**resetAll atomic-reset pattern** (store.ts:81-92) — add `pinned: null` to the single `set()`.
Do NOT call `clearPinned()` from inside `resetAll` (Zustand-5 anti-pattern, called out in-file
at store.ts:80 and CONTEXT.md:146-148):
```typescript
resetAll: () => set({
  inchi: '', layers: [], auxMap: {}, atomElements: {},
  hAtomPoolIds: [], inchiKey: '',
  hoverIdx: null, subHover: null,
  keyHoverKind: null, legendHover: null,
  pinned: null,           // <-- add to the same atomic set()
}),
```

---

### `src/components/InchiSection.tsx` (component, event-driven — layer-level pin)

**Analog:** self — the layer `<span>` already wires `onMouseEnter` at InchiSection.tsx:80-87.
Add `onClick` alongside it; read `pinned` via a selector next to `hoverIdx` (line 18).

**Store read pattern** (mirror InchiSection.tsx:16-18):
```typescript
const hoverIdx = useInchiStore(state => state.hoverIdx);
const pinned   = useInchiStore(state => state.pinned);   // <-- add
```

**Dispatch-without-subscribe pattern** (the established idiom — `getState().action()`, used
throughout this file at lines 52-53, 81-86). The layer `onClick` follows the spec's "any click
while pinned only releases; never re-pins on the same gesture" rule (spec lines 23, 54):
```typescript
onClick={() => {
  // any click while pinned only releases (spec line 23) — never re-pin same gesture
  if (useInchiStore.getState().pinned) { useInchiStore.getState().clearPinned(); return; }
  useInchiStore.getState().setPinned({ idx: i, sub: null });   // layer-level (spec line 53)
}}
```

**Active/dim derivation must also honor pinned** (mirror InchiSection.tsx:62-63 — when pinned,
the pinned `idx` drives active/dim instead of `hoverIdx`):
```typescript
const effectiveIdx = pinned ? pinned.idx : hoverIdx;
const isActive = effectiveIdx === i;
const isDim = effectiveIdx !== null && effectiveIdx !== i;
```

**Pinned-class hook** (mirror the className array at InchiSection.tsx:70-74) — add the pin ring
class from the module when this layer is pinned with no sub-token:
```typescript
className={[styles.inchiLayer, isActive ? styles.active : '', isDim ? styles.dim : '',
  (pinned && pinned.idx === i && !pinned.sub) ? styles.pinned : ''].filter(Boolean).join(' ')}
```

> NOTE (passthrough invariant, CONTEXT.md:128, spec line 148): keep `<LayerText layer={l}
> rawText={l.text} .../>` exactly as-is — never reconstruct the string from parsed fields.

---

### `src/components/LayerText.tsx` (component, event-driven — sub-token pin)

**Analog:** self — the `subHoverProps` factory at LayerText.tsx:22-27 is the precise template.
Every sub-token span spreads `{...subHoverProps(hit)}`. The new click handler attaches the same
way. Add a sibling factory (do NOT rewrite the dozens of call sites' shapes — they already pass
the correct `SubHover` payload):

**Existing factory to mirror** (LayerText.tsx:22-27):
```typescript
function subHoverProps(hit: SubHover) {
  return {
    onMouseEnter: () => useInchiStore.getState().setSubHover(hit),
    onMouseLeave: () => useInchiStore.getState().setSubHover(null),
  };
}
```

**New: extend it (or add a paired `onClick`)** so each sub-token both hovers and pins. Sub-token
pin needs the owning layer index. The simplest mirror keeps `subHoverProps` per-hit and threads
the layer `idx` down; sub-token pin uses `setPinned({ idx, sub: hit })` (spec line 53). Pattern:
```typescript
function subHoverProps(hit: SubHover) {
  return {
    onMouseEnter: () => useInchiStore.getState().setSubHover(hit),
    onMouseLeave: () => useInchiStore.getState().setSubHover(null),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();   // don't also trigger the layer-level onClick in InchiSection
      const s = useInchiStore.getState();
      if (s.pinned) { s.clearPinned(); return; }      // any click while pinned releases
      s.setPinned({ idx: /* layer idx */, sub: hit }); // precise sub-token pin (spec line 53)
    },
  };
}
```

> Layer `idx` must reach `LayerText`: today `LayerText({ layer, rawText, fragCounts })` takes no
> index. Thread `layerIdx` through the `LayerText` prop (InchiSection.tsx:90 call site) and into
> `subHoverProps`. Keep all existing `subHoverProps({...})` call sites' hit payloads unchanged —
> they already carry the exact `SubHover` (`kind:'atom'|'bond'|'branch'|...`) the pin needs.

---

### `src/hooks/useKetcherHighlights.ts` (hook, transform — pinned precedence)

**Analog:** self — lines 291-360 read hover state via selectors and drive highlights. The pin
override is a single source-swap at the top of the hook: when `pinned` is set, derive `hoverIdx`
and `subHover` from `pinned` instead of the live store fields, then the rest of the effect is
unchanged.

**Selector reads to extend** (mirror useKetcherHighlights.ts:296-301):
```typescript
const hoverIdx = useInchiStore(s => s.hoverIdx);
const subHover = useInchiStore(s => s.subHover);
const pinned   = useInchiStore(s => s.pinned);          // <-- add

// derive effective targets (spec line 55: pinned wins when set, else live hover)
const effIdx = pinned ? pinned.idx : hoverIdx;
const effSub = pinned ? pinned.sub : subHover;
```

**Then use `effIdx`/`effSub`** everywhere the effect currently uses `hoverIdx`/`subHover`
(the `if (hoverIdx === null)` guard at line 318, `layers[hoverIdx]` at 324, `buildHighlightSpecs(
layer, subHover, ...)` at 339, and the badge branches at 349-354). **Add `pinned` to the deps
array at line 359** so the effect re-runs on pin/unpin:
```typescript
}, [hoverIdx, subHover, pinned, layers, auxMap, atomElements, hAtomPoolIds, isReady]);
```

> The pure helpers (`applyKetcherHighlights`, `buildHighlightSpecs`, `renderHBadges`) are
> unchanged — they already take a layer + `SubHover`. Pin reuses them verbatim. This is also why
> the spec's "single enforcement point" (store gate) keeps this file simple: the gate stops live
> hover from mutating the store while pinned, so `effIdx`/`effSub` would already equal the pinned
> target even without the override — the override is belt-and-suspenders + makes intent explicit.

---

### `src/components/Explanation.tsx` (component, request-response — read pinned)

**Analog:** self — the precedence chain at Explanation.tsx:41-50, 64-130. Today the card reads
`keyHoverKind → hoverIdx → legendHover → idle`. Pin slots in by making the `hoverIdx`-derived
`layer` resolve from `pinned` when set (mirror lines 41-42):
```typescript
const hoverIdx = useInchiStore(state => state.hoverIdx);
const pinned   = useInchiStore(state => state.pinned);     // <-- add
const effIdx   = pinned ? pinned.idx : hoverIdx;           // pinned wins (spec line 56)
const layer    = effIdx !== null ? layers[effIdx] : null;  // was: hoverIdx !== null ? ...
```

Everything downstream (`info`, `accentVar` at line 50, `reading` at line 60, the `layer ?`
branch at line 78) already keys off `layer` — no further change. Because the store gate freezes
`hoverIdx` while pinned, the existing `keyHoverKind`/`legendHover` precedence is preserved
(those are independent zones; a pin should not be masked by a stale key/legend hover — confirm
the gate or guard accordingly per spec's single-enforcement-point intent).

---

### `src/components/KetcherPanel.tsx` (component, request-response — Help button)

**Analog:** self — the `.reset-trigger` button + `onResetClick` prop is the EXACT precedent
(spec line 75, CONTEXT.md:116-117). Copy it verbatim for `.help-trigger` + `onHelpClick`.

**Prop interface pattern** (mirror KetcherPanel.tsx:13-16):
```typescript
/** Clears the canvas and resets all app state to idle. */
onResetClick?: () => void;
/** Opens the guided Help tour. Rendered next to Reset on the section-label row. */
onHelpClick?: () => void;        // <-- add
```

**Destructure** (mirror KetcherPanel.tsx:26-27): add `onHelpClick` to the params list.

**Button in `section-label-actions`** (mirror KetcherPanel.tsx:33-44 — sits next to Reset):
```tsx
<div className="section-label-actions">
  {onHelpClick && (
    <button type="button" className="help-trigger" onClick={onHelpClick}>
      Help
    </button>
  )}
  {onResetClick && (
    <button type="button" className="reset-trigger" onClick={onResetClick}>Reset</button>
  )}
  {onFeedbackClick && (
    <button type="button" className="feedback-trigger" onClick={onFeedbackClick}>Send feedback</button>
  )}
</div>
```

> Help-button styling lives in **global `styles.css`** (these triggers use global classes, not a
> CSS module — see styles.css:130-177), NOT in `KetcherPanel.module.css`.

---

### `src/components/HelpTour.tsx` (**NEW** component, event-driven stepped overlay)

**No direct analog.** Structural template = `src/components/FeedbackDialog.tsx` (the only
overlay component) + its `FeedbackDialog.module.css`. Differences: HelpTour is a custom
full-viewport overlay (NOT a native `<dialog>`), owns step index state, and anchors a spotlight
to live DOM via `getBoundingClientRect()`.

**Patterns to copy from FeedbackDialog.tsx:**
- **Self-contained presentational component, props from App** (FeedbackDialog.tsx:10-24): typed
  props interface, no Ketcher ref, reads no store. HelpTour takes `{ open, onClose, steps? }`
  (or step config) and the `App`-owned open state.
- **Local UI state via `useState`** (FeedbackDialog.tsx:25-29): step index, computed rect.
- **`mountedRef` unmount guard** (FeedbackDialog.tsx:31-37, originally from InchiSection.tsx:28)
  — reuse for any async (e.g. the empty-canvas preset await) before `setState`.

**Patterns NOT in FeedbackDialog — derive from spec §Anchoring (lines 88-93) + CONTEXT D-01:**
- Full-viewport dimmer + spotlight cutout from target `getBoundingClientRect()`.
- Recompute on step change, window `resize`, and `scroll` (add/remove listeners in `useEffect`,
  cleanup on close — mirror the listener add/remove discipline in App.tsx:227-232).
- Callout card side-selection (above/below/beside) from available space.
- Controls: Back / Next / Close + "N of 8" counter (8 steps, spec lines 94-104).
- Close paths: Close button, Esc, advance past last step, backdrop click (spec line 113).
- **Esc + click-anywhere listeners active ONLY while open** — same add-only-while-active / remove
  discipline the pin feature uses (spec risk note line 146; CONTEXT.md:80-81).

**Anchor targets** — add `data-tour-id` attributes (spec line 89) to the real regions:
editor (`KetcherPanel` canvas-wrap), presets (`mol-list`), InChI strip (`InchiSection`),
InChIKey (`InchiKeySection`), legend (`Legend`), Reset/Help buttons. Tour reads their
`getBoundingClientRect()` — no reach into Ketcher internals (spec line 147).

---

### `src/components/HelpTour.module.css` (**NEW** CSS module)

**Analog:** `src/components/FeedbackDialog.module.css` — pattern: every class references
`var(--token)` from `styles.css`; only the scrim uses an approved raw oklch literal
(FeedbackDialog.module.css:29-32):
```css
dialog.feedbackDialog::backdrop { background: oklch(0.2 0.015 255 / 0.32); }
```
Reuse this exact scrim color for the HelpTour dimmer. Callout card surface mirrors the dialog
surface tokens (FeedbackDialog.module.css:8-16): `var(--bg-canvas)`, `1px solid var(--line)`,
`border-radius: 8px`, `var(--font-serif)` title / `var(--font-sans)` body. Spotlight ring should
reuse a layer/accent token or `var(--c-formula)` to stay in the oklch palette (CLAUDE.md fidelity
constraint — no off-token colors).

---

### `src/App.tsx` (provider, event-driven — tour state owner + empty-canvas preset)

**Analog:** self — `handleReset` (App.tsx:105-110) + `onResetClick` wiring (App.tsx:251) is the
exact callback-ownership precedent (spec line 76, CONTEXT.md:119-122). The preset-load path is
`handleMolSelect` (App.tsx:59-68) → `handleMolSelectLogic` (which calls `setMolecule`).

**Tour open state** (mirror the `useState` declarations at App.tsx:24-29):
```typescript
const [tourOpen, setTourOpen] = useState(false);
```

**`onHelpClick` callback** (mirror `handleReset` at App.tsx:105-110 for the App-owned async
callback shape; mirror empty-canvas detection from App.tsx — store `inchi`/`layers` empty means
empty canvas, same condition style as `getState().inchi` reads at App.tsx:75/118):
```typescript
const handleHelpClick = async () => {
  // empty-canvas → auto-load Caffeine so every step has real content (D-02, spec line 107)
  const isEmpty = useInchiStore.getState().layers.length === 0;
  if (isEmpty && ketcherRef.current) {
    await handleMolSelect('caffeine');   // reuse existing preset-load path; sample STAYS (D-02)
  }
  setTourOpen(true);
};
```

> The Caffeine sample MUST remain after the tour closes (D-02, spec line 108) — so `onClose`
> just does `setTourOpen(false)`; do NOT call `setMolecule('')`/`resetAll()` on close. Reuse
> `handleMolSelect('caffeine')` rather than re-implementing `setMolecule` — it already sets the
> `isSettingMoleculeRef` guard so the debounced `handleChange` doesn't wipe `selectedMolId`
> (App.tsx:36-38, handleMolSelectLogic.ts:42).

**Wiring** (mirror the `KetcherPanel` props at App.tsx:243-252 and the sibling-component render
at App.tsx:253-255): pass `onHelpClick={handleHelpClick}` to `KetcherPanel`, and render
`<HelpTour open={tourOpen} onClose={() => setTourOpen(false)} />` as a sibling (like
`FeedbackDialog` at App.tsx:238-242).

---

### `src/styles.css` (config, global CSS — pin styles + hint + help-trigger)

**Analog:** self — the `.reset-trigger` block (styles.css:155-177) is the exact template for
`.help-trigger`; the `.feedback-trigger` block (styles.css:130-152) shows the brand-accent
variant. Pin chunk styling layers onto the InChI-strip `.inchiLayer`/`.inchiSubtoken` rules
(those live in `InchiSection.module.css`, so the pin RING is best added there to compose with
the existing `:hover` rule at InchiSection.module.css:97-101).

**`.help-trigger`** (copy `.reset-trigger` verbatim, styles.css:155-177; subdued secondary pill,
sits next to Reset). Use the `oklch(from var(--...) ...)` hover idiom already in the file:
```css
.help-trigger {
  height: 28px; padding: 0 14px; border: none; border-radius: 999px;
  background: var(--line); color: var(--ink-soft);
  font-family: var(--font-sans); font-size: 12.5px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: background 120ms;
}
.help-trigger:hover { background: oklch(from var(--line) calc(l - 0.04) c h); }
.help-trigger:focus-visible { outline: 2px solid var(--ink-soft); outline-offset: 2px; }
```

**Pinned chunk style (D-03)** — retained hover fill + persistent ring. The existing hover ring
idiom is `box-shadow: inset 0 0 0 1.5px var(--el-color, currentColor)` (InchiSection.module.css:99).
Add a `.pinned` class (in `InchiSection.module.css`) that keeps the bg fill AND adds an OUTER
ring so it reads as "locked" not "hovering" (D-03, CONTEXT.md:57-63). Derive the ring color from
the layer token in the same oklch style:
```css
/* pinned: locked state — retained fill + outer ring (D-03) */
.inchiLayer.pinned { box-shadow: 0 0 0 2px var(--c-formula); border-radius: 3px; }
.inchiSubtoken.pinned { box-shadow: 0 0 0 2px var(--el-color, currentColor); }
```
(Use the per-layer accent var that `InchiSection` already sets inline via `swatchVar(l.type)`,
InchiSection.tsx:64 — pass it through as a CSS custom prop so the ring matches the layer color.)

**While-pinned release hint (D-04)** — shown ONLY while pinned, inline near the strip ("Pinned —
click anywhere or press Esc to release."). Mirror the `.emptyHint`/`.copiedFeedback` inline-note
style (InchiSection.module.css:136-143, 178-188): `var(--font-mono)`, `var(--ink-faint)`,
small size, `pointer-events: none`.

> cursor:pointer affordance (D-04) — `.inchiLayer` already has `cursor: pointer`
> (InchiSection.module.css:65); `.inchiSubtoken` has `cursor: crosshair` (line 88). Both already
> signal clickability — no change strictly required, but confirm sub-tokens read as clickable.

---

## Shared Patterns

### Dispatch-without-subscribe (store writes from components)
**Source:** the established idiom `useInchiStore.getState().action()` (InchiSection.tsx:52-53,
81-86; App.tsx:108, 118, 169). **Apply to:** all pin click handlers in `InchiSection` and
`LayerText`. Reads use selectors `useInchiStore(s => s.field)` (InchiSection.tsx:16-18); writes
use `getState()` to avoid adding the caller as a subscriber.

### Selector-based read, narrow slice
**Source:** every component (InchiSection.tsx:16-18, Explanation.tsx:27-39,
useKetcherHighlights.ts:296-301). **Apply to:** every new `pinned` read — one selector per field
so re-renders stay scoped.

### Listener add-only-while-active + cleanup
**Source:** App.tsx:227-232 (subscribe/unsubscribe with stored subscription object) and the
unmount-guard `mountedRef` (InchiSection.tsx:28-32, FeedbackDialog.tsx:31-37). **Apply to:**
(1) the pin "click-anywhere / Esc unfreezes" window listeners — add on pin, remove on unpin
(spec risk line 146; CONTEXT.md:80-81); (2) the HelpTour resize/scroll/Esc listeners — add on
open, remove on close.

### oklch CSS-variable token system (fidelity invariant)
**Source:** styles.css token system; `oklch(from var(--x) calc(l ± n) c h)` hover idiom
(styles.css:147,172); raw scrim literal `oklch(0.2 0.015 255 / 0.32)`
(FeedbackDialog.module.css:31). **Apply to:** `.help-trigger`, `.pinned` ring, HelpTour overlay
+ callout. NO off-token colors (CLAUDE.md "fidelity: high", "CSS Modules + CSS custom properties").

### InChI passthrough (data invariant — MEMORY `feedback_inchi_passthrough`)
**Source:** LayerText.tsx:31 ("never reconstruct it"), CONTEXT.md:128, spec line 148.
**Apply to:** InchiSection + LayerText pin wiring — pin/click must NOT alter or re-render the
displayed string; `rawText={l.text}` stays verbatim. Pin is overlay/highlight-only.

### Test mirroring
**Source:** `src/__tests__/store.test.ts` (store state machine),
`src/hooks/__tests__/useKetcherHighlights.test.ts` (highlight precedence),
`src/components/__tests__/FeedbackDialog.test.tsx` (overlay component). **Apply to:** pin
state-machine tests (pin layer/sub-token, gate no-ops, any-click-clears, releasing-click-does-
not-re-pin, Esc clears, resetAll clears — spec line 139), `useKetcherHighlights` pinned-vs-hover
precedence (spec line 140), HelpTour step/close/empty-canvas-preset tests (spec line 141).
**Use REAL InChI fixtures** (MEMORY `feedback_real_domain_fixtures_and_gates`; CONTEXT.md:138) —
e.g. real Caffeine InChI, not fabricated layer text.

---

## No Analog Found

None. Every modified file is its own best template; `HelpTour.tsx`/`.module.css` map to
`FeedbackDialog.tsx`/`.module.css` as the overlay structural template (role-match), with the
spotlight-anchoring mechanics specified fully in the design spec §Anchoring (no codebase
precedent needed — `getBoundingClientRect()` + custom overlay, zero new deps per D-01).

## Metadata

**Analog search scope:** `src/store.ts`, `src/components/`, `src/hooks/`, `src/lib/`,
`src/data/`, `src/styles.css`, `src/__tests__/`
**Files scanned:** ~14 (all in-scope files + FeedbackDialog overlay analog + SubHover type +
handleMolSelectLogic + test dirs)
**Pattern extraction date:** 2026-06-22
</content>
</invoke>
