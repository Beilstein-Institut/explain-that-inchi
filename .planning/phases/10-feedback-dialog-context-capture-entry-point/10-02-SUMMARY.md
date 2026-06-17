---
phase: "10"
plan: "02"
subsystem: feedback-dialog
tags: [feedback, dialog, component, css-modules, testing, d-03, d-04, d-05, d-06, d-08, d-09, d-10, d-11, d-15]
dependency_graph:
  requires: [BuildFeedbackUrlResult.fullBody (Plan 01)]
  provides: [FeedbackDialog component, FeedbackDialog CSS module, FeedbackDialog tests]
  affects: [src/App.tsx (Plan 03 — wiring)]
tech_stack:
  added: []
  patterns:
    - native <dialog> modal with showModal/close
    - popup-safe anchor click via anchorRef.current.click() synchronously after await
    - mountedRef guard for transient state (3s auto-hide)
    - contextPreview prop passthrough (no store reads in dialog component)
key_files:
  created:
    - src/components/FeedbackDialog.tsx
    - src/components/FeedbackDialog.module.css
    - src/components/__tests__/FeedbackDialog.test.tsx
  modified:
    - vitest.config.ts
decisions:
  - "Used plain createRef + post-render vi.spyOn for dialog.close() assertions — React overwrites ref.current with the real DOM element, making a mock plain-object ref ineffective"
  - "Added src/components/__tests__ glob to vitest.config.ts environmentMatchGlobs for happy-dom environment (existing config only covered src/__tests__)"
  - "mountedRef.current = true set directly in render body (not useEffect) since FeedbackDialog is never unmounted/remounted in practice — matches plan spec"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-17"
  tasks_completed: 2
  files_modified: 4
---

# Phase 10 Plan 02: FeedbackDialog Component Summary

**One-liner:** Native `<dialog>` modal with five-category radio, popup-safe anchor submit, clipboard fallback, and 9 behavioral tests covering D-03..D-11 and D-15.

## What Was Built

### FeedbackDialog.tsx (named export)

A self-contained React component accepting `dialogRef`, `onSubmit`, and `contextPreview` props. It owns no Ketcher refs and reads nothing from the Zustand store.

Key behaviors implemented:

- **Category radio group (D-03):** Five `<label><input type="radio">` rows inside a `<fieldset>`, defaulting to `General`. `accent-color: var(--c-formula)` on inputs for native radio styling.
- **Message textarea (D-04):** Full-width `<textarea>` with placeholder and resize-vertical.
- **Context preview (D-05, D-15):** Read-only `<pre>` block rendering InChI / SMILES / Preset / Version / UA from the `contextPreview` prop, with Phase 9 placeholders `(no structure loaded)` / `(none)` / `(custom molecule)` when fields are empty.
- **Inline public-issue note (D-06):** `<p>` with "public" bolded in `var(--c-el-O)`.
- **Popup-safe submit (D-08):** `anchorRef.current.href = result.url; anchorRef.current.click()` synchronously in the same microtask tick after `await onSubmit(...)`.
- **Non-truncated submit (D-09):** Calls `dialogRef.current?.close()`, resets category to `General`, clears message, clears `lastResult`.
- **Truncated submit (D-10):** Keeps dialog open, sets `lastResult`, reveals truncation section with "Copy full issue body" button.
- **Clipboard copy (D-11):** `navigator.clipboard.writeText(lastResult.fullBody)` with 3s auto-hide `copied` state and `clipboardFailed` fallback revealing selectable `<pre>`.
- **Hidden anchor:** `<a ref={anchorRef} target="_blank" rel="noopener noreferrer" style={{ display: 'none' }} aria-hidden="true" />` — T-10-02-01 mitigated.

### FeedbackDialog.module.css

CSS module with all classes using `var(--token)` references from `src/styles.css`. Only `dialog.feedbackDialog::backdrop` uses the approved raw literal `oklch(0.2 0.015 255 / 0.32)` (no token exists for this value per UI-SPEC Token Additions). Classes: `feedbackDialog`, `dialogTitle`, `dialogIntro`, `fieldset`, `fieldLabel`, `radioRow`, `textarea`, `contextPreview`, `previewSubNote`, `publicNote`, `submitBtn`, `cancelBtn`, `copyBodyBtn`, `copiedFeedback`, `truncationSection`, `truncationNote`, `truncationActions`, `fallbackBody`, `actionRow`.

### FeedbackDialog.test.tsx (9 tests)

All 9 behavioral cases pass:

1. Renders all five category options
2. Defaults selected category to General
3. Renders textarea with correct placeholder
4. Context preview shows supplied context values
5. Context preview shows Phase 9 placeholders for empty context (D-15)
6. Non-truncated submit closes dialog and resets form (D-09)
7. Truncated submit keeps dialog open and shows truncation UI (D-10)
8. Copy full issue body calls clipboard with `fullBody` (D-11)
9. Clipboard success shows transient copied message, hides after 3s

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build FeedbackDialog component + CSS module | 6ac1c23 | src/components/FeedbackDialog.tsx, src/components/FeedbackDialog.module.css |
| 2 | Write FeedbackDialog component tests | 381d581 | src/components/__tests__/FeedbackDialog.test.tsx, vitest.config.ts |

## Verification Results

- `tsc -b --noEmit`: exits 0 (clean)
- `vitest run`: 255 tests pass (246 pre-existing + 9 new FeedbackDialog tests)
- `grep -n 'rel=' FeedbackDialog.tsx`: line 180 — `rel="noopener noreferrer"` present
- `grep -c 'useInchiStore\|from.*store' FeedbackDialog.tsx`: 0 (store-free)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest environmentMatchGlobs missing `src/components/__tests__` glob**
- **Found during:** Task 2 — vitest reported "No test files found" because the config excluded `.claude/worktrees/**` when run from the main repo, and had no `happy-dom` mapping for `src/components/__tests__/`.
- **Fix:** Added `['src/components/__tests__/**/*.test.tsx', 'happy-dom']` entry to `environmentMatchGlobs` in `vitest.config.ts` and ran tests from inside the worktree (which has its own config, not excluded).
- **Files modified:** `vitest.config.ts`
- **Commit:** 381d581

**2. [Rule 1 - Bug] dialogRef.current.close() not spyable via plain mock object**
- **Found during:** Task 2 test run — React overwrites `ref.current` with the real DOM `HTMLDialogElement` when rendering `<dialog ref={dialogRef}>`, replacing any plain-object mock with a native DOM element.
- **Fix:** Changed to `createRef<HTMLDialogElement>()` and added `spyOnDialogClose()` helper that calls `vi.spyOn(dialogRef.current, 'close')` after render. This spies on the real DOM element's native close method, which vitest can assert on.
- **Files modified:** `src/components/__tests__/FeedbackDialog.test.tsx`
- **Commit:** 381d581

## Known Stubs

None. The component receives all data via props (`contextPreview`, `onSubmit`); no placeholder data flows to the UI from within the component itself. The Phase 9 placeholder strings (`(no structure loaded)` etc.) are intentional fallbacks for empty context — these are design requirements, not stubs.

## Threat Flags

No new trust surface beyond the threat model:
- `rel="noopener noreferrer"` present on hidden anchor (T-10-02-01 mitigated)
- Clipboard writes `fullBody` sourced from builder (T-10-02-02 accepted — user's own data)
- `clipboardFailed` fallback renders selectable `<pre>` (T-10-02-04 mitigated)

## Self-Check: PASSED

- [x] `src/components/FeedbackDialog.tsx` created — named export, no store imports
- [x] `src/components/FeedbackDialog.module.css` created — all var(--token) except ::backdrop
- [x] `src/components/__tests__/FeedbackDialog.test.tsx` created — 9 tests
- [x] Commit 6ac1c23 exists (feat: implement FeedbackDialog component and CSS module)
- [x] Commit 381d581 exists (test: add 9 behavioral tests for FeedbackDialog)
- [x] `rel="noopener noreferrer"` present on hidden anchor (line 180)
- [x] Zero store imports in FeedbackDialog.tsx
- [x] 255 tests pass, 0 regressions
