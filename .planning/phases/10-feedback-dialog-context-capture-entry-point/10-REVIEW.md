---
phase: 10-04
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/App.tsx
  - src/components/__tests__/FeedbackDialog.test.tsx
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: resolved
resolution: "WR-01 + WR-02 fixed in d9f7cea (flushSync previewSmiles before showModal). IN-01 (Info, test-only fragility) accepted as-is."
---

# Phase 10-04: Code Review Report

**Reviewed:** 2026-06-18
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the two-commit diff for gap-closure plan 10-04. The change is small and correctly structured: a `previewSmiles` React state variable is added, `handleFeedbackOpen` is an async handler that calls `getSmiles()` with a silent catch before `showModal()`, and `handleFeedbackSubmit` is verifiably byte-for-byte unchanged. The passthrough principle is respected — the SMILES value from `getSmiles()` is stored and rendered verbatim with no reconstruction.

Two quality-level issues were found: a stale-state flash on repeated opens (the previous molecule's SMILES is visible briefly before the new fetch completes), and a React state-update timing gap (the dialog opens before the state from `setPreviewSmiles` has propagated to a re-render). Neither causes a crash or data loss. One info-level note on the test assertion.

---

## Warnings

### WR-01: Stale SMILES from previous open is visible on repeated dialog opens

**File:** `src/App.tsx:82-90`

**Issue:** `previewSmiles` is never reset when the dialog closes. On the second (and later) open of the feedback dialog, `handleFeedbackOpen` fires `setPreviewSmiles(smiles ?? undefined)` only after `await ketcherRef.current?.getSmiles()` resolves. During that async gap — which can be tens to hundreds of milliseconds for a large WASM structure — `previewSmiles` still holds the value from the *previous* open. The dialog opens (via `showModal()`) immediately after `setPreviewSmiles` is called, but before React has re-rendered with the new value. The net effect is that the user sees last session's SMILES string for a visible instant before the update lands.

The scenario that makes this user-visible: user loads molecule A, opens the dialog (SMILES = "CCO"), closes it, loads molecule B, opens the dialog again — the preview flashes "CCO" before settling on molecule B's SMILES.

**Fix:** Reset `previewSmiles` to `undefined` synchronously at the start of `handleFeedbackOpen`, before the async call. This ensures the dialog always opens showing `(none)` as the placeholder while the fetch is in flight, then updates to the real value once the WASM call completes.

```tsx
const handleFeedbackOpen = async () => {
  setPreviewSmiles(undefined);          // clear stale value first
  try {
    const smiles = await ketcherRef.current?.getSmiles();
    setPreviewSmiles(smiles ?? undefined);
  } catch {
    setPreviewSmiles(undefined);
  }
  dialogRef.current?.showModal();
};
```

Note: this also means the user will briefly see `(none)` even on the first open with a molecule loaded, but that is the honest state while the async fetch is in flight and is strictly less misleading than showing a stale molecule's SMILES.

---

### WR-02: `setPreviewSmiles` state update does not propagate before `showModal()` opens the dialog

**File:** `src/App.tsx:85-89`

**Issue:** After `await ketcherRef.current?.getSmiles()` resolves, the code calls `setPreviewSmiles(smiles ?? undefined)` and then immediately calls `dialogRef.current?.showModal()` on the very next line. React 18 automatic batching means the state update from `setPreviewSmiles` is scheduled — it has not yet caused a re-render when `showModal()` executes. The dialog therefore opens and renders with the value of `previewSmiles` from the *previous* render (either `undefined` on first open, or the stale prior value on repeat opens).

In practice the re-render fires in the same event-loop microtask batch shortly after `showModal()`, so the dialog appears open and then flickers to show the correct SMILES. On fast hardware this may be imperceptible, but on slow machines or under DevTools throttling it is a visible flash.

**Fix:** There is no trivial way to guarantee state has propagated before `showModal()` while keeping the current architecture. The most pragmatic fix is to call `showModal()` inside a `useEffect` that watches `previewSmiles` together with a boolean "pending open" flag — or to use a `useLayoutEffect` / `flushSync` around the state setter. The simplest correct approach that avoids the structural change:

```tsx
import { flushSync } from 'react-dom';

const handleFeedbackOpen = async () => {
  let smiles: string | undefined;
  try {
    smiles = await ketcherRef.current?.getSmiles() ?? undefined;
  } catch {
    smiles = undefined;
  }
  // flushSync forces the state update to complete synchronously before showModal()
  flushSync(() => {
    setPreviewSmiles(smiles);
  });
  dialogRef.current?.showModal();
};
```

`flushSync` is the canonical React escape hatch for "I need the DOM to reflect this state update before I do something with the DOM." It is already available from `react-dom`. This eliminates both WR-01 and WR-02 in one change.

---

## Info

### IN-01: Test assertion uses `document.querySelector('pre')` instead of a scoped query

**File:** `src/components/__tests__/FeedbackDialog.test.tsx:230`

**Issue:** The new test queries `document.querySelector('pre')` (global DOM) rather than `screen.getByRole(...)` or a scoped query on the rendered container. If another test leaks DOM state or if a second `<pre>` element is ever added to `FeedbackDialog`, this assertion will silently query the wrong element. The `not.toMatch` assertion on line 232 is also a regex applied to `textContent` — if `(none)` appears anywhere in the `<pre>` for a different field (e.g. the InChI placeholder line), the assertion would pass for the wrong reason.

**Fix:** Use `screen.getByRole` or a `within(container)` query to scope the assertion, and assert the specific SMILES line rather than the entire pre block:

```tsx
const pre = screen.getByRole('...') // or use getByText / within(container)
// assert the full text does not contain the pattern "(none)" on the SMILES line
expect(pre.textContent).toContain('SMILES: CC(=O)O');
expect(pre.textContent).not.toContain('SMILES: (none)');
```

The current test is not incorrect for the current component structure, but it is fragile against future `<pre>` additions.

---

_Reviewed: 2026-06-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
