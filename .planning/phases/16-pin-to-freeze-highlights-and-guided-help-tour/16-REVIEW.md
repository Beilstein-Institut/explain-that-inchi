---
phase: 16-pin-to-freeze-highlights-and-guided-help-tour
reviewed: 2026-06-23T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/App.tsx
  - src/__tests__/store.test.ts
  - src/components/Explanation.tsx
  - src/components/HelpTour.module.css
  - src/components/HelpTour.tsx
  - src/components/InchiKeySection.tsx
  - src/components/InchiSection.module.css
  - src/components/InchiSection.tsx
  - src/components/KetcherPanel.tsx
  - src/components/LayerText.tsx
  - src/components/Legend.tsx
  - src/components/__tests__/HelpTour.test.tsx
  - src/hooks/__tests__/useKetcherHighlights.test.ts
  - src/hooks/useKetcherHighlights.ts
  - src/store.ts
  - src/styles.css
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-06-23
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 16 added click-to-pin highlights and the guided Help tour. The overall architecture is sound: the Zustand gate that freezes `setHover`/`setSubHover` while `pinned` is non-null is a clean single-enforcement point, the `useKetcherHighlights` hook correctly derives `effIdx`/`effSub` from `pinned`, and the HelpTour component is properly isolated with no runtime dependencies.

Four warnings are raised: a stale pin surviving molecule loads (UX breakage), a non-functional `mountedRef` guard in HelpTour, a one-frame flash of the wrong step on tour re-open, and incomplete `beforeEach` state reset in the store tests. Three informational items cover missing `type="button"` on copy buttons, an unconventional accessibility role arrangement in HelpTour, and dead CSS in `styles.css`.

## Warnings

### WR-01: Pin not cleared on molecule load — stale pin persists across preset changes

**File:** `src/store.ts:81`

**Issue:** `setInchiData` resets `keyHoverKind` but does NOT clear `pinned`. When a user has a layer pinned and then loads a different preset molecule (via the examples list), the 150ms debounce fires `setInchiData` with the new molecule's layers. The old `pinned.idx` survives. If the new molecule has a matching layer count the wrong layer stays highlighted and frozen; if the new molecule has fewer layers `layers[pinned.idx]` is `undefined`, the "Pinned — click anywhere or press Esc to release." hint stays on screen but no highlight is shown. The canvas appears broken until the user manually presses Esc or clicks away.

**Fix:**
```typescript
// src/store.ts — add pinned: null to setInchiData
setInchiData: (inchi, layers, auxMap, atomElements, hAtomPoolIds = [], inchiKey = '') =>
  set({ inchi, layers, auxMap, atomElements, hAtomPoolIds, inchiKey, keyHoverKind: null, pinned: null }),
```

---

### WR-02: HelpTour `mountedRef` guard is non-functional — never sets `false` on unmount

**File:** `src/components/HelpTour.tsx:119-121`

**Issue:** The `mountedRef` guard is intended to prevent `setTargetRect` from being called after the component unmounts. However, `mountedRef.current = true` is set unconditionally at render time (outside any `useEffect`), and there is no `useEffect` with a cleanup that sets it to `false`. The guard `if (mountedRef.current) setTargetRect(rect)` therefore never blocks the call. Compare the correct pattern used in `InchiKeySection` and `InchiSection`:

```typescript
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);
```

In practice, HelpTour returns `null` when `open` is `false`, so the component is unmounted. Any in-flight async operation holding a closure over `setTargetRect` can call it on an unmounted instance. The guard as written provides no protection.

**Fix:**
```typescript
// src/components/HelpTour.tsx — replace the bare assignment with a useEffect
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);
// Remove the line: mountedRef.current = true; (line 121)
```

---

### WR-03: HelpTour step index flashes previous step on re-open

**File:** `src/components/HelpTour.tsx:162-166`

**Issue:** The step reset is handled in a `useEffect`:
```typescript
useEffect(() => {
  if (open) {
    setStepIndex(0);
  }
}, [open]);
```
`useEffect` runs after the browser has painted. When `open` transitions from `false` to `true`, React first renders the component with the current `stepIndex` value (which may be e.g. 5 from the previous session), paints that frame, then the effect fires and `setStepIndex(0)` triggers a second render. The user briefly sees step 6 content before step 1 appears. `useLayoutEffect` fires synchronously after DOM mutation but before paint, eliminating the flash.

**Fix:**
```typescript
// src/components/HelpTour.tsx — replace useEffect with useLayoutEffect
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';

// ...
useLayoutEffect(() => {
  if (open) {
    setStepIndex(0);
  }
}, [open]);
```

---

### WR-04: Store test `beforeEach` does not reset all Phase 16 fields — potential test pollution

**File:** `src/__tests__/store.test.ts:8-19`

**Issue:** The top-level `beforeEach` resets seven fields but omits the three fields added in Phase 16 and prior phases: `pinned`, `hAtomPoolIds`, and `legendHover` (and also `keyHoverKind`). Zustand is a module-level singleton; state persists between tests unless explicitly reset. If the `pinned state machine` nested describe runs first (or Vitest shuffles order), tests that check "initial state" after the outer `beforeEach` may see `pinned` as non-null.

```typescript
// Current (incomplete):
useInchiStore.setState({
  inchi: '', layers: [], auxMap: {}, atomElements: {}, inchiKey: '',
  hoverIdx: null, subHover: null,
});
```

**Fix:**
```typescript
// Add all missing fields to the top-level beforeEach
useInchiStore.setState({
  inchi: '', layers: [], auxMap: {}, atomElements: {}, hAtomPoolIds: [],
  inchiKey: '', hoverIdx: null, subHover: null,
  pinned: null, keyHoverKind: null, legendHover: null,
});
```

---

## Info

### IN-01: Copy buttons in `InchiSection` and `InchiKeySection` are missing `type="button"`

**File:** `src/components/InchiSection.tsx:146`, `src/components/InchiKeySection.tsx:118`

**Issue:** Both copy-to-clipboard `<button>` elements lack an explicit `type` attribute. HTML buttons default to `type="submit"` when inside a `<form>` element. While neither section is currently rendered inside a form, the defensive convention (consistent with all other buttons in the codebase — see KetcherPanel, HelpTour where `type="button"` is present) is to always set `type="button"` on non-submit buttons.

**Fix:**
```tsx
<button
  type="button"  // add this
  className={styles.copyBtn}
  onClick={handleCopy}
  aria-label="Copy InChI to clipboard"
>
```

---

### IN-02: HelpTour uses an unconventional ARIA role arrangement

**File:** `src/components/HelpTour.tsx:215-228`

**Issue:** `role="dialog"` is placed on the full-viewport dimmer `<div>`, while `role="document"` is placed on the inner callout card. Per ARIA practices, `role="dialog"` should enclose only the interactive dialog surface (the callout), not the backdrop. The backing `aria-modal="true"` tells assistive technologies the dialog traps focus, but there is no focus trap implementation — Tab will cycle through the entire document. Keyboard users opening the tour will not have focus moved to the dialog buttons automatically.

This is a usability concern for screen reader and keyboard users; it does not affect sighted users. A full fix would require a focus trap and moving `role="dialog"` to the callout element.

**Fix (minimal):** Move `role="dialog"` and `aria-modal` to the callout, add `autoFocus` on the first button, and remove `role="document"`:
```tsx
// dimmer — remove role/aria-modal/aria-label:
<div className={styles.dimmer} onClick={handleBackdropClick}>

// callout — add role, aria-modal, aria-label:
<div
  className={styles.callout}
  style={{ ...calloutStyle, position: 'fixed' }}
  onClick={e => e.stopPropagation()}
  role="dialog"
  aria-modal="true"
  aria-label="Guided Help Tour"
>
  <div className={styles.calloutHeader}>
    <span ...>
    <button ... autoFocus>×</button>  // moves focus into dialog on open
```

---

### IN-03: Dead CSS in `styles.css` — `.legend-tip` and `.legend-row:hover .legend-tip` are unreachable

**File:** `src/styles.css:613-665`

**Issue:** The floating tooltip was removed in UAT-13 (as noted in `Explanation.tsx` and `Legend.tsx`). The `.legend-tip`, `.legend-tip::after`, `.tip-label`, `.tip-eg`, and `.legend-row:hover .legend-tip` rules remain in `styles.css` at lines 613–665. These selectors have no matching DOM elements and are dead code.

**Fix:** Remove the `.legend-tip` block (lines 613–665 in `styles.css`). If the removal is deferred, add a `/* DEAD — tooltip removed in UAT-13; kept for reference */` comment.

---

_Reviewed: 2026-06-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
