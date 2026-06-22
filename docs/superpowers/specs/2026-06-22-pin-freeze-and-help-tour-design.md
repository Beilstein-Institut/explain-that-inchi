# Design: Pin-to-Freeze Highlights + Guided Help Tour

**Date:** 2026-06-22
**Status:** Approved (design); pending implementation plan

## Summary

Two user-facing additions to *Explain that InChI*:

1. **Click-to-pin (freeze):** clicking an InChI chunk freezes its highlight and explanation so the user can inspect the molecule canvas without the highlight vanishing. Today, highlights are purely transient (appear on `mouseenter`, vanish on `mouseleave`).
2. **Guided Help tour:** a new **Help** button (next to **Reset**) launches a stepped, spotlight-style overlay tour that points at each real region of the UI and explains what it does and how to use it — including how to use the new pin feature.

Both features are self-contained and additive; neither changes the InChI-passthrough rules or the existing hover→highlight pipeline beyond gating it.

---

## Feature 1 — Click-to-Pin (Freeze) Highlights

### Interaction model (exact)

- **Not pinned:** hover works transiently exactly as today — `mouseenter` on a layer or sub-token highlights the matching atoms/bonds and drives the explanation card; `mouseleave` clears it.
- **Click a layer or sub-token (while not pinned):** freezes that target. The highlight + explanation are held; the view is **locked**.
- **Any click while pinned:** unfreezes — *anywhere on the page*, including on a different layer or sub-token. A click while frozen only ever **releases**; it never immediately re-pins. After release the app is back in transient-hover mode.
- **Re-freezing:** because the releasing click does not re-pin, the user clicks a layer/sub-token a *second* time (now unpinned) to freeze it.
- **Esc:** also releases the pin.

This means: pinned on layer A, click layer B → unfreezes only (pin does **not** jump to B). Click layer B once more → B is now pinned.

### Granularity

Both levels are pinnable, mirroring exactly what hover already highlights:
- **Layer level** — clicking a layer chunk pins the whole layer (same target as `setHover(idx)`).
- **Sub-token level** — clicking an atom/element/bond sub-token pins that precise target (same payload as `setSubHover(hit)`).

### State (Zustand `src/store.ts`)

Add one field and two actions:

```typescript
// pinned target; null = nothing frozen
pinned: { idx: number; sub: SubHover | null } | null;

setPinned: (p: { idx: number; sub: SubHover | null } | null) => void;
clearPinned: () => void;
```

- `resetAll()` clears `pinned` along with the other hover fields.
- While `pinned` is non-null, `setHover` and `setSubHover` become **no-ops** (the lock). This is the single enforcement point for "hovering does nothing while frozen."

### Wiring

- **`InchiSection.tsx` / `LayerText.tsx`:** add `onClick` handlers.
  - When **not** pinned: a click on a layer calls `setPinned({ idx, sub: null })`; a click on a sub-token calls `setPinned({ idx, sub: hit })`.
  - When pinned: *any* click calls `clearPinned()` and does nothing else (does not re-pin on the same gesture). A document/window-level click listener (active only while pinned) is the simplest way to guarantee "click anywhere unfreezes"; chunk-level `onClick` while pinned must not re-pin.
- **`useKetcherHighlights.ts`:** when `pinned` is set, derive highlight specs from `pinned` (its `idx` + `sub`) instead of the live hover state. When `pinned` is null, behave as today.
- **`Explanation.tsx`:** when `pinned` is set, render the card from the pinned target using the same precedence logic it already applies to hover state.
- **Esc:** a `keydown` listener (window-level, active only while pinned) calls `clearPinned()`.

### Visual cue

- The pinned chunk gets a persistent "pinned" style, visually distinct from the transient hover style (e.g. a ring/outline or solid underline) so it is unmistakable that the view is frozen.
- A small inline hint near the InChI strip communicates the release affordance, e.g. *"Pinned — click anywhere or press Esc to release."* shown only while pinned.

### Out of scope

- No multi-pin / compare mode (only one target frozen at a time).
- No persistence of pin across reset or molecule change (a structure change clears via the normal recompute path).

---

## Feature 2 — Guided Help Tour

### Trigger

- A **Help** button in the `section-label-actions` container in `KetcherPanel.tsx`, sitting next to **Reset**, styled with a new `.help-trigger` class consistent with `.reset-trigger`.
- `App.tsx` owns the tour open/close state and passes an `onHelpClick` callback into `KetcherPanel` (same prop pattern as `onResetClick` / `onFeedbackClick`).

### Mechanism

A stepped, spotlight-style overlay (a guided tour), **not** a centered modal:

- A full-viewport overlay dims the page.
- One real UI region is **spotlighted** (highlighted/cut-out) at a time.
- A **callout card** (title + explanatory text) is positioned near the spotlighted region.
- Controls: **Back / Next / Close** plus a step counter (e.g. *"2 of 8"*).

### Anchoring

- Each target region exposes a `ref` or a `data-tour-id` attribute.
- The overlay reads the target's `getBoundingClientRect()` to position the spotlight cutout and the callout card.
- Positions recompute on: step change, window `resize`, and `scroll`.
- The callout card chooses a side (above/below/beside) based on available space so it never covers its own target or runs off-screen.

### Steps (8, in order)

1. **The molecule editor** — draw or edit a structure here; the InChI updates live.
2. **Presets list** — click an example molecule to load it.
3. **The InChI string** — colour-coded by layer; each colour is a different kind of information.
4. **Hovering** — hover any chunk to highlight the matching atoms/bonds in the drawing.
5. **Pinning (click to freeze)** — click a chunk to lock the highlight so you can inspect the drawing; click anywhere or press Esc to release. (Doubles as discovery for Feature 1.)
6. **The InChIKey** — the hashed fixed-length identifier below.
7. **The legend** — what each colour/layer means.
8. **Reset / Help buttons** — clear the canvas, or reopen this tour.

### Empty-canvas handling

- If the canvas is **empty** when Help opens, the tour first **auto-loads a simple preset molecule** so every step points at real content (InChI string, InChIKey, legend, etc. are all populated).
- The auto-loaded sample **stays** on the canvas after the tour closes, so the user can immediately try hovering and pinning what they just learned. (It does not revert to empty.)
- If a molecule is already present, Help uses it as-is and loads nothing.

### Close

The tour closes via: the **Close** button, **Esc**, advancing **past the last step**, or a **backdrop click**.

### Out of scope

- No persistence of "tour already seen" / no auto-open on first visit (Help is user-initiated; this can be a later enhancement).
- No animated transitions beyond simple repositioning (nice-to-have, not required).

---

## Components & Files Touched

| Area | File | Change |
|------|------|--------|
| Store | `src/store.ts` | Add `pinned` field + `setPinned`/`clearPinned`; gate `setHover`/`setSubHover`; clear in `resetAll` |
| InChI hover/click | `src/components/InchiSection.tsx` | Add layer-level `onClick` → pin/unpin |
| InChI hover/click | `src/components/LayerText.tsx` | Add sub-token `onClick` → pin/unpin |
| Highlight bridge | `src/hooks/useKetcherHighlights.ts` | Prefer `pinned` over hover when set |
| Explanation card | `src/components/Explanation.tsx` | Read `pinned` with existing precedence |
| Pinned styling + hint | `src/styles.css` (+ relevant module) | Pinned chunk style; inline hint |
| Help button | `src/components/KetcherPanel.tsx` | New `.help-trigger` button + `onHelpClick` prop |
| Help button style | `src/styles.css` | `.help-trigger` styling |
| Tour overlay | `src/components/HelpTour.tsx` (new) + module CSS | Stepped spotlight overlay, anchoring, controls |
| Tour wiring + empty-canvas preset load | `src/App.tsx` | Tour open state, `onHelpClick`, auto-load preset when empty |

## Testing

- **Pin state machine:** unit-test the store — pin a layer, pin a sub-token, verify `setHover`/`setSubHover` are no-ops while pinned, verify any click clears, verify a releasing click does not re-pin, verify Esc clears, verify `resetAll` clears.
- **Highlight precedence:** `useKetcherHighlights` derives from `pinned` when set, from hover otherwise.
- **Tour:** renders all 8 steps in order; Back/Next/counter behave; Close/Esc/backdrop/past-last-step all close; empty canvas triggers a preset load and the sample remains after close; populated canvas loads nothing.
- Use real InChI fixtures (not fabricated layer text) per project convention.

## Risks / Notes

- The "click anywhere unfreezes" rule needs a window/document click listener; ensure the listener is added only while pinned and removed on unpin to avoid eating unrelated clicks.
- Tour anchoring against the Ketcher editor region only needs its bounding box; no reach into Ketcher internals.
- Keep the InChI string verbatim — pinning/clicking must not alter or re-render the displayed string text (passthrough rule).
