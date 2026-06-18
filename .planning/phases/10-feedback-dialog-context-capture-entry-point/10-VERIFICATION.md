---
phase: 10-feedback-dialog-context-capture-entry-point
verified: 2026-06-18T10:05:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Send feedback trigger placement and dialog open"
    expected: "The 'Send feedback' trigger appears right-aligned on the 'Draw a molecule…' section-label row (inside KetcherPanel). Clicking it opens a centered native dialog modal with dimmed backdrop, rendered above the Ketcher canvas with no canvas flicker or remount."
    why_human: "jsdom cannot exercise Ketcher WASM canvas mount; visual placement and backdrop rendering require a live browser."
  - test: "Context preview shows current molecule SMILES on dialog open"
    expected: "With a preset molecule loaded (e.g. Benzene), clicking 'Send feedback' shows that molecule's SMILES in the 'What gets attached' preview panel — not '(none)'. With an empty canvas the preview still shows '(none)' gracefully."
    why_human: "ketcherRef.current.getSmiles() requires the live Ketcher WASM instance. The regression test (gap-10-UAT-T3) verifies the component renders what it receives, but the App.tsx→getSmiles()→previewSmiles→contextPreview wire requires live browser verification."
  - test: "Submit opens prefilled GitHub issue in a new tab"
    expected: "Clicking 'Open GitHub issue' opens a new tab to https://github.com/cm-beilstein/explain-that-inchi/issues/new with prefilled title ([Category] message excerpt) and body containing InChI, SMILES, preset, version, UA. Dialog closes and form resets afterward."
    why_human: "Opening a new tab via anchor.click() cannot be reliably verified in jsdom; popup-blocker behavior is browser-only."
  - test: "Ketcher canvas, InChI display, and preset list work normally after repeated dialog open/close"
    expected: "The Ketcher canvas remains fully interactive, InChI sections update correctly, and preset selection works after opening and closing the feedback dialog multiple times. No console errors."
    why_human: "Requires live browser interaction with Ketcher WASM; cannot be tested in jsdom."
---

# Phase 10: Feedback Dialog — Context Capture & Entry Point Verification Report

**Phase Goal:** A visitor can discover a "Send feedback" control, fill in a category and message in an on-brand modal, see exactly what context will be attached, and click through to a prefilled GitHub issue in a new tab — without ever disturbing the Ketcher canvas.

**Verified:** 2026-06-18T10:05:00Z
**Status:** human_needed (5/5 automated truths verified; 4 live-browser checks required)
**Re-verification:** No — initial verification (gap-closure run 10-04 included)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Visible on-brand "Send feedback" control opens a native `<dialog>` as a leaf sibling; Ketcher canvas, Zustand store, and InChI never remount or re-run getInchi (SC-1) | ✓ VERIFIED (automated) / ? HUMAN for browser | `FeedbackDialog` mounted as leaf sibling between `<Header/>` and `<KetcherPanel/>` in App.tsx (lines 212–227). `KetcherPanel`, `InchiSection`, `Explanation` elements are unconditionally rendered in unchanged positions. `onFeedbackClick={handleFeedbackOpen}` wires the trigger inside `KetcherPanel`. No wrapper conditions added. Live canvas remount behavior is human-only. |
| 2 | User can pick a feedback category and type a free-text message (SC-2) | ✓ VERIFIED | `FeedbackDialog.tsx` renders all 5 category radio inputs defaulting to `'General'` (lines 16–22, 25, 101–113) and a controlled `<textarea>` with correct placeholder (lines 118–124). All 10 FeedbackDialog tests pass (256/256 suite). Tests 1, 2, 3 explicitly cover this. |
| 3 | Context preview shows InChI verbatim from store, SMILES via getSmiles() on open (previewSmiles state, flushSync'd), preset name, trimmed UA, app version; clear public-issue note (SC-3) | ✓ VERIFIED (automated) / ? HUMAN for SMILES live path | `App.tsx` `handleFeedbackOpen` (lines 86–95): calls `getSmiles()` in try/catch, stores result in `previewSmiles` state via `flushSync(() => setPreviewSmiles(smiles))` before `showModal()`. `contextPreview.smiles: previewSmiles` (line 75). `FeedbackDialog.tsx` renders placeholders `(no structure loaded)` / `(none)` / `(custom molecule)` for empty context (lines 81–85). Public note with bold "public" in CSS `--c-el-O` color present (lines 134–138). Gap-closure regression test `gap-10-UAT-T3` passes — component renders `CC(=O)O` when supplied and shows no `(none)` on the SMILES line. |
| 4 | On submit, prefilled GitHub issues/new page opens in a new tab via synchronous anchor click without popup-block; clipboard fallback on truncation (SC-4) | ✓ VERIFIED (automated) / ? HUMAN for new-tab behavior | `FeedbackDialog.tsx` `handleSubmit` (lines 39–57): awaits `onSubmit`, then synchronously sets `anchorRef.current.href = result.url` and calls `anchorRef.current.click()` — no additional await between them. Hidden anchor has `target="_blank" rel="noopener noreferrer"` (lines 178–181). `buildFeedbackUrl` returns `fullBody: initialBody` (line 263). Clipboard path calls `navigator.clipboard.writeText(lastResult.fullBody)` (line 63). Tests 6, 7, 8, 9 cover non-truncated close, truncated reveal, clipboard write, and transient copy message. |
| 5 | Empty canvas / no InChI: dialog works and body degrades cleanly with no broken submission (SC-5) | ✓ VERIFIED | `buildFeedbackUrl` `buildBody()` uses stable placeholders: `'(no structure loaded)'`, `'(none)'`, `'(custom molecule)'` (lines 149–153) — these are returned in the URL regardless of missing context. `FeedbackDialog.tsx` applies same placeholders in preview (lines 81–85). Test 5 ("Phase 9 placeholders for empty context") renders with `contextPreview={}` and asserts all three placeholder strings present. `handleFeedbackSubmit` in App.tsx passes `undefined` for inchi/smiles when store/WASM return nothing — builder handles this without throwing. |

**Score:** 5/5 truths verified (automated evidence confirms all truths; live-browser checks below are required for Ketcher WASM behavior)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/buildFeedbackUrl.ts` | `BuildFeedbackUrlResult.fullBody` field + `return { url, truncated, fullBody: initialBody }` | ✓ VERIFIED | Interface at lines 42–52; return at line 263. |
| `src/lib/__tests__/buildFeedbackUrl.test.ts` | D-11 test coverage (fullBody present, untruncated InChI on truncation) | ✓ VERIFIED | `describe('D-11: fullBody field')` block present; 2 tests pass in 256/256 suite. |
| `src/components/FeedbackDialog.tsx` | Named export `FeedbackDialog` with `dialogRef / onSubmit / contextPreview` props | ✓ VERIFIED | `export function FeedbackDialog(...)` line 24; props interface lines 10–14. No store imports (grep returns 0). |
| `src/components/FeedbackDialog.module.css` | CSS module with oklch token classes | ✓ VERIFIED | 23 classes present including `feedbackDialog`, `submitBtn`, `cancelBtn`, `contextPreview`, `copyBodyBtn`, `copiedFeedback`, `truncationSection`, `actionRow`. |
| `src/components/__tests__/FeedbackDialog.test.tsx` | 10 behavioral tests (9 original + 1 gap-closure regression) | ✓ VERIFIED | 10 tests pass; `gap-10-UAT-T3` test at line 224 covers SMILES preview regression. |
| `src/App.tsx` | `dialogRef`, `previewSmiles` state, `handleFeedbackOpen` (async, flushSync'd), `handleFeedbackSubmit`, `FeedbackDialog` as leaf sibling | ✓ VERIFIED | All present at expected lines. `contextPreview.smiles: previewSmiles` wired. No hook subscription for inchi — `getState().inchi` used throughout. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `buildFeedbackUrl.ts` | `BuildFeedbackUrlResult.fullBody` | `fullBody: initialBody` in return | ✓ WIRED | Line 263 of buildFeedbackUrl.ts |
| `FeedbackDialog.tsx` | `buildFeedbackUrl.ts` | `import type BuildFeedbackUrlResult, FeedbackCategory, FeedbackContext` | ✓ WIRED | Line 7 of FeedbackDialog.tsx |
| `FeedbackDialog.tsx` | `navigator.clipboard.writeText` | `handleCopyFullBody` — `clipboard.writeText(lastResult.fullBody)` | ✓ WIRED | Line 63; test 8 verifies the call. |
| `App.tsx handleFeedbackOpen` | `ketcherRef.current.getSmiles()` | async call with flushSync before showModal() | ✓ WIRED | Lines 86–95 of App.tsx |
| `App.tsx contextPreview` | `FeedbackDialog contextPreview prop` | `smiles: previewSmiles` | ✓ WIRED | Line 75 of App.tsx; line 215 of App.tsx JSX |
| `App.tsx handleFeedbackSubmit` | `buildFeedbackUrl` | `return buildFeedbackUrl({ message, category, context })` | ✓ WIRED | Line 118 of App.tsx |
| `App.tsx handleFeedbackSubmit` | `useInchiStore.getState().inchi` | verbatim store read at submit time | ✓ WIRED | Line 103 of App.tsx; no hook subscription |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `FeedbackDialog.tsx` context preview `<pre>` | `contextPreview.smiles` | `App.tsx` `previewSmiles` state ← `handleFeedbackOpen` → `ketcherRef.current.getSmiles()` | ✓ Real data from WASM (or `undefined` on empty canvas → `(none)` placeholder) | ✓ FLOWING (verified: `previewSmiles` state wired to `contextPreview.smiles`; gap-closure test confirms component renders non-`(none)` when value supplied) |
| `FeedbackDialog.tsx` context preview `<pre>` | `contextPreview.inchi` | `App.tsx` `useInchiStore.getState().inchi` (synchronous read at render time) | ✓ Real InChI from store | ✓ FLOWING |
| `buildFeedbackUrl` return | `fullBody` | `initialBody = buildBody(category, message, context)` — pure function of full context | ✓ Untruncated body before truncation loop | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| tsc exits 0 | `npx tsc --noEmit` | exit 0, no output | ✓ PASS |
| Full test suite passes | `npx vitest run` | 256/256 tests, 15 files | ✓ PASS |
| `fullBody` present in `BuildFeedbackUrlResult` | `grep -n 'fullBody' src/lib/buildFeedbackUrl.ts` | Interface field (line 51) + return (line 263) | ✓ PASS |
| `rel="noopener noreferrer"` on hidden anchor | `grep -n 'rel=' src/components/FeedbackDialog.tsx` | `rel="noopener noreferrer"` at line 180 | ✓ PASS |
| No store imports in FeedbackDialog | `grep -c 'useInchiStore\|from.*store' FeedbackDialog.tsx` | 0 | ✓ PASS |
| `FeedbackDialog` is a leaf sibling (not wrapping KetcherPanel) | JSX order in App.tsx | `FeedbackDialog` at line 212, `KetcherPanel` at line 217, `InchiSection` at 226, `Explanation` at 227 — all siblings | ✓ PASS |
| `getState().inchi` used (not hook subscription) | `grep -n 'useInchiStore' App.tsx` | All 5 occurrences use `.getState()` — no `useInchiStore(selector)` hook for feedback | ✓ PASS |
| `flushSync` called before `showModal()` | App.tsx lines 93–94 | `flushSync(() => setPreviewSmiles(smiles))` then `dialogRef.current?.showModal()` | ✓ PASS |
| Gap-closure regression test passes | `vitest run FeedbackDialog.test.tsx` | 10/10, including `gap-10-UAT-T3` | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FEED-01 | 10-03 | User can open a feedback dialog from a visible, on-brand "Send feedback" control (does not disturb Ketcher canvas) | ✓ SATISFIED | `KetcherPanel.tsx` renders trigger button with `onFeedbackClick`; `handleFeedbackOpen` in App.tsx calls `showModal()` on the `dialogRef`. FeedbackDialog is a leaf sibling — no KetcherPanel wrapping. |
| FEED-02 | 10-02 | User can select a feedback category | ✓ SATISFIED | 5-radio fieldset in `FeedbackDialog.tsx` lines 100–113; default `'General'`; test 1 and 2 confirm all 5 options rendered, General pre-selected. |
| FEED-03 | 10-02, 10-04 | User can type a free-text message | ✓ SATISFIED | Controlled `<textarea>` in `FeedbackDialog.tsx` lines 118–124; test 3 verifies placeholder text. |
| FEED-06 | 10-02 | User sees auto-captured context before submitting; dialog states issue is public and requires GitHub account | ✓ SATISFIED | Always-visible `<pre className={styles.contextPreview}>` renders InChI/SMILES/preset/version/UA (lines 129–131); public note with bold "public" present (lines 134–138). |
| FEED-08 | 10-01, 10-02, 10-03 | Feedback works gracefully with empty canvas / no InChI | ✓ SATISFIED | `buildBody()` uses `'(no structure loaded)'`/`'(none)'`/`'(custom molecule)'` placeholders; `FeedbackDialog` applies same placeholders in preview; test 5 asserts this. `handleFeedbackSubmit` passes `undefined` for empty store/WASM — builder handles without throwing. |

**Orphaned requirements check:** FEED-04 (Phase 9), FEED-05 (Phase 9), FEED-07 (Phase 9), FEED-09 (Phase 9) — all assigned to Phase 9 in REQUIREMENTS.md traceability table. Not claimed by any Phase 10 plan. Not orphaned — correctly in Phase 9.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found |

No `TBD`, `FIXME`, `XXX` markers. No stub returns (`return null`, `return {}`, `return []`) in implementation files. "placeholder" occurrences are domain vocabulary (D-15 context placeholders for empty context), not stub code.

---

### Human Verification Required

#### 1. Send feedback trigger placement and dialog open behavior

**Test:** Run `npm run dev`, open http://localhost:5173. Confirm the "Send feedback" button appears right-aligned on the "Draw a molecule…" section-label row inside the Ketcher panel header area. Click it.
**Expected:** A centered native `<dialog>` modal opens with a dimmed backdrop, rendered above the Ketcher canvas. The canvas does not flicker, remount, or lose state. The toolbar row should not create a visible empty band — the trigger sits inline with the section label.
**Why human:** jsdom cannot exercise the Ketcher WASM canvas lifecycle. Visual placement and backdrop rendering are browser-only.

#### 2. Context preview shows current molecule SMILES on dialog open

**Test:** Load a preset molecule (e.g. Benzene). Click "Send feedback". Inspect the "What gets attached" preview panel.
**Expected:** The SMILES string for the loaded molecule appears in the preview (not `(none)`). The InChI also appears correctly. Then close the dialog, clear the canvas, reopen — the preview should show `(no structure loaded)` for InChI and `(none)` for SMILES.
**Why human:** `ketcherRef.current.getSmiles()` requires the live Ketcher WASM instance. The gap-closure regression test (`gap-10-UAT-T3`) confirms the component renders whatever value is supplied, but the App.tsx `handleFeedbackOpen → getSmiles() → flushSync → showModal()` data path requires a live browser to exercise. This was the original UAT Test-3 failure point; confirming the fix is in effect requires re-running that exact test flow.

#### 3. Submit opens prefilled GitHub issue in a new tab

**Test:** With Benzene loaded, type "Test verification" in the message textarea, select "Bug", click "Open GitHub issue".
**Expected:** A new browser tab opens to `https://github.com/cm-beilstein/explain-that-inchi/issues/new` with the title `[Bug] Test verification` pre-filled and the body containing the InChI, SMILES, preset name, app version, and user-agent in fenced code blocks. Back in the app, the dialog closes and the form resets (message cleared, category back to General).
**Why human:** Opening a new tab via `anchorRef.current.click()` cannot be reliably verified in jsdom. Popup-blocker bypass behavior is browser-only.

#### 4. Ketcher canvas integrity after dialog open/close cycles

**Test:** Open and close the feedback dialog 3–4 times (via button and Escape). Draw a molecule, load a preset, then open/close the dialog. Verify the canvas, InChI display, and preset list continue to work normally. Check browser console for errors.
**Expected:** No remount, no stale state, no console errors. Molecule drawing and InChI generation continue unaffected.
**Why human:** Ketcher WASM remount detection requires live browser — jsdom cannot detect canvas lifecycle events.

---

### Gaps Summary

No automated gaps found. All 5 success criteria are verified against the codebase. The 4 human verification items above are Ketcher WASM / browser-only behaviors that cannot be exercised in jsdom. UAT Test-3 (SMILES in preview) was already confirmed passing in the UAT log (`10-UAT.md` shows `total: 6, passed: 6` with the gap marked `resolved_by: 10-04`). The human checks here are a re-confirmation gate per the verifier protocol.

---

_Verified: 2026-06-18T10:05:00Z_
_Verifier: Claude (gsd-verifier)_
