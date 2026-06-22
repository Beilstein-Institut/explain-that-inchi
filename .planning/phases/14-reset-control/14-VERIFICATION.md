---
phase: 14-reset-control
verified: 2026-06-19T00:00:00Z
status: verified
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Visual placement — Reset pill appears immediately to the LEFT of Send feedback in the KetcherPanel header row, styled as a subdued grey pill vs the brand-accent blue Send feedback pill"
    expected: "Both buttons visible in section-label-actions div, Reset on the left, Send feedback on the right; Reset uses var(--line) background, Send feedback uses var(--c-formula) blue"
    why_human: "CSS rendering and relative visual placement cannot be verified by grep; correct DOM order was confirmed in code but actual pixel rendering requires a browser"
  - test: "Reset with a drawn molecule clears canvas and all panels return to idle (RESET-02, RESET-03)"
    expected: "Ketcher canvas blank; InChI strip shows empty-hint; InChIKey strip shows empty-hint; Explanation card shows default idle card; no canvas halos; no active example highlighted in Examples list"
    why_human: "Requires Ketcher WASM to actually process setMolecule(''), fire a change event, and have the debounced handleChange pipeline call setInchiData — end-to-end behavior across async WASM boundary cannot be verified statically"
  - test: "No remount during Reset — canvas stays live, no loading overlay reappears (RESET-04)"
    expected: "After clicking Reset, the editor toolbar remains fully interactive; no 'Loading editor...' overlay reappears; canvas accepts new drawing immediately"
    why_human: "WASM remount is a runtime phenomenon; code analysis confirms no conditional rendering of <Editor> was introduced, but actual absence of flash requires a live browser"
  - test: "Empty-canvas no-op — Reset on already-empty canvas produces no error, idle state preserved (RESET-05)"
    expected: "No browser console error; placeholders unchanged; no loading flash; second Reset click is indistinguishable from a no-op"
    why_human: "Depends on Ketcher WASM behaviour when setMolecule('') is called on an already-empty canvas — confirmed safe by design documentation but only verifiable in a live browser run"
  - test: "Load preset then Reset deselects the active example (RESET-01, RESET-03)"
    expected: "After clicking a preset (e.g. Caffeine), then clicking Reset: canvas clears, no example highlighted in the list, all panels return to idle"
    why_human: "Requires the setSelectedMolId(null) call in handleReset to actually cause the mol-list button to lose its 'active' CSS class — requires visual inspection"
re_verification: "2026-06-22 live-canvas (Playwright/Chromium): loaded Caffeine then clicked Reset — c-layer/InChI cleared to empty-hint, Examples deselected (no .active), canvas blanked (17->2 svg labels), NO loading overlay (no remount, RESET-04), 0 console errors; second Reset is a safe no-op (RESET-05). All RESET-01..05 confirmed."
---

# Phase 14: Reset Control — Verification Report

**Phase Goal:** A user can clear their current exploration and return the entire tool to its fresh, empty starting state in one click.
**Verified:** 2026-06-19
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A Reset button is visible immediately to the left of the Send feedback button in the KetcherPanel section-label row | VERIFIED (code) / needs human (visual) | `KetcherPanel.tsx` lines 33–44: `<div className="section-label-actions">` contains Reset button before feedback button in DOM order; `styles.css` lines 194–198: `.section-label-actions { display: flex; align-items: center; gap: 8px; }` groups them as flex siblings |
| 2 | Clicking Reset on a drawn molecule empties the Ketcher canvas and all store fields return to idle | VERIFIED (code) / needs human (runtime) | `App.tsx` lines 105–110: `handleReset` calls `ketcherRef.current.setMolecule('')`, `useInchiStore.getState().resetAll()`, `setSelectedMolId(null)`; `store.ts` lines 81–92: `resetAll` atomically zeroes all 9 fields via single `set()` call |
| 3 | After Reset, InchiSection, InchiKeySection, Explanation, Legend, and hover highlights all return to placeholder/idle state | VERIFIED (code) / needs human (runtime) | `resetAll` in `store.ts` clears `inchi`, `layers`, `auxMap`, `atomElements`, `hAtomPoolIds`, `inchiKey`, `hoverIdx`, `subHover`, `keyHoverKind`, `legendHover` — all fields that drive the downstream UI components |
| 4 | The Ketcher Editor component is never unmounted or conditionally rendered; the StandaloneStructServiceProvider is never recreated | VERIFIED | `KetcherPanel.tsx` line 51: `<Editor>` is unconditional (no wrapping `{condition &&}`); comment on line 49 explicitly documents "Editor is ALWAYS rendered — never conditional"; `structServiceProvider` is module-level in `App.tsx` line 21 |
| 5 | Clicking Reset on an already-empty canvas is a safe no-op — no error thrown and idle state preserved | VERIFIED (store level) / needs human (WASM) | `store.test.ts` lines 132–147: dedicated test confirms `resetAll()` on idle store does not throw and all fields remain at idle values; WASM no-op behaviour documented in `App.tsx` comment line 104 |

**Score:** 5/5 truths verified at code level; 5 items deferred to human verification for runtime/visual confirmation (already approved by user per context — "it works").

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store.ts` | `resetAll` action declared in `InchiState` interface and implemented | VERIFIED | Line 50: `resetAll: () => void` in interface; lines 81–92: implementation using single `set()` call covering all 9 fields |
| `src/components/KetcherPanel.tsx` | Reset button rendered to the left of Send feedback inside `.section-label-actions` | VERIFIED | Lines 16–17: `onResetClick?: () => void` prop added; lines 33–44: button rendered with `className="reset-trigger"`, DOM order places it before feedback button |
| `src/styles.css` | `.reset-trigger` pill rule and `.section-label-actions` flex rule | VERIFIED | Lines 155–176: `.reset-trigger` with `height:28px`, `border-radius:999px`, `background:var(--line)`, `color:var(--ink-soft)`, hover and focus-visible states; lines 194–198: `.section-label-actions` with `display:flex`, `align-items:center`, `gap:8px` |
| `src/App.tsx` | `handleReset` callback calling `setMolecule('')`, `resetAll()`, `setSelectedMolId(null)`; `onResetClick={handleReset}` passed to `<KetcherPanel>` | VERIFIED | Lines 105–110: `handleReset` async function with guard, all three calls in order; line 251: `onResetClick={handleReset}` in JSX |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `App.tsx handleReset` | `ketcher.setMolecule` | `ketcherRef.current.setMolecule('')` | VERIFIED | `App.tsx` line 107: `await ketcherRef.current.setMolecule('');` — exact pattern from plan |
| `App.tsx handleReset` | `useInchiStore.getState().resetAll` | direct store call | VERIFIED | `App.tsx` line 108: `useInchiStore.getState().resetAll();` |
| `KetcherPanel.tsx` | `onResetClick prop` | button onClick | VERIFIED | `KetcherPanel.tsx` line 35: `onClick={onResetClick}` on the `reset-trigger` button |
| `App.tsx` | `KetcherPanel onResetClick` | JSX prop | VERIFIED | `App.tsx` line 251: `onResetClick={handleReset}` |

### Data-Flow Trace (Level 4)

Not applicable — Reset is a write-to-empty operation, not a component that renders dynamic data from an upstream source. The relevant data flow is outbound (clearing state), not inbound (rendering fetched data).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `resetAll` clears all 9 fields | `npx vitest run src/__tests__/store.test.ts` (per SUMMARY) | 12/12 pass (304 total suite) | PASS — documented in SUMMARY.md; commits f5b7dd3 (RED) and 8ed893f (GREEN) confirmed in git log |
| TypeScript compiles without errors | `npx tsc --noEmit` (per SUMMARY) | 0 errors | PASS — documented in SUMMARY.md; commit e62942f confirmed |

Step 7b: Runtime behavioral checks (browser interaction with Ketcher WASM) are routed to human verification per Step 8 — cannot be tested without a running dev server.

### Probe Execution

No probe scripts declared in plan or found at conventional paths for this phase. Step 7c: SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RESET-01 | 14-01 | Reset control visible immediately to the left of Send feedback | VERIFIED | `KetcherPanel.tsx` DOM order + `.section-label-actions` flex layout |
| RESET-02 | 14-01 | Clicking Reset clears the molecule from the Ketcher canvas | VERIFIED (code) | `handleReset` calls `setMolecule('')` |
| RESET-03 | 14-01 | After Reset, all UI panels return to placeholder/idle state | VERIFIED (code) | `resetAll` clears all 9 store fields; downstream components react to empty state |
| RESET-04 | 14-01 | Ketcher canvas and WASM are not remounted or re-initialized | VERIFIED | `<Editor>` is unconditional; `structServiceProvider` is module-level constant |
| RESET-05 | 14-01 | Reset on already-empty canvas is a safe no-op | VERIFIED (store) | Store test confirms no-throw + idle-state preservation; WASM behaviour needs human |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No debt markers (TBD/FIXME/XXX), no placeholder returns, no stub handlers found in any file modified by this phase |

Scanned files: `src/store.ts`, `src/components/KetcherPanel.tsx`, `src/App.tsx`, `src/styles.css`, `src/__tests__/store.test.ts`.

### Human Verification Required

Per plan Task 3 (`checkpoint:human-verify`) and per the objective context, the user confirmed "it works" in a live browser session. The items below are the formal record for the UAT trail. They are listed here as the structured human-verification section because the GSD verifier cannot re-run a browser session independently.

#### 1. Visual Placement (RESET-01)

**Test:** Open the app in a browser; inspect the section-label row above the Ketcher canvas.
**Expected:** "Reset" pill appears immediately to the LEFT of "Send feedback"; Reset is styled subdued grey, Send feedback is brand-accent blue.
**Why human:** CSS rendering and relative visual placement require a live browser.

#### 2. Reset with Drawn Molecule (RESET-02, RESET-03)

**Test:** Draw any molecule, hover a layer to activate highlights, then click Reset.
**Expected:** Canvas blank; InChI strip shows empty-hint; InChIKey shows empty-hint; Explanation shows idle card; canvas halos gone; no active example highlighted.
**Why human:** End-to-end async WASM pipeline — `setMolecule('')` fires a Ketcher change event, debounced 150ms, then `handleChange` calls `setInchiData` — cannot be traced statically.

#### 3. No Remount (RESET-04)

**Test:** Click Reset; observe the Ketcher editor toolbar during and after the action.
**Expected:** Toolbar remains visible and interactive; no "Loading editor..." overlay reappears; canvas accepts new drawing immediately.
**Why human:** WASM remount is a runtime phenomenon not detectable by static analysis.

#### 4. Empty-Canvas No-Op (RESET-05)

**Test:** Click Reset on an already-empty canvas (e.g. immediately after a previous Reset).
**Expected:** No browser console error; placeholders unchanged; no loading flash.
**Why human:** Depends on Ketcher WASM `setMolecule('')` behaviour when canvas is already empty.

#### 5. Preset Then Reset (RESET-01, RESET-03)

**Test:** Click an example preset (e.g. Caffeine), then click Reset.
**Expected:** Canvas clears; no example highlighted in Examples list; all panels return to idle.
**Why human:** Requires visual confirmation that `setSelectedMolId(null)` removes the `.active` CSS class from the mol-list button.

**Human approval status:** Confirmed passing by the user ("it works") per the phase checkpoint described in objective context.

### Gaps Summary

No blocking gaps. All five requirements (RESET-01..05) are implemented correctly in the codebase. The human verification items are runtime/visual checks that the user has already confirmed passing in a live browser session. No SUMMARY.md claims were found to contradict the actual code; every implementation detail described in the SUMMARY was verified directly in the source files.

---

_Verified: 2026-06-19T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
