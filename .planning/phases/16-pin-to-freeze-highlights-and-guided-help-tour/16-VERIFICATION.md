---
phase: 16-pin-to-freeze-highlights-and-guided-help-tour
verified: 2026-06-25T12:30:00Z
status: passed
score: 18/18 must-haves verified
overrides_applied: 0
---

# Phase 16: Pin-to-Freeze Highlights and Guided Help Tour — Verification Report

**Phase Goal:** Let users click an InChI chunk (layer or sub-token) to freeze its highlight + explanation for inspection, and add a Help button (next to Reset) that launches a stepped, spotlight-style guided tour of the app.
**Verified:** 2026-06-25T12:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking a layer chunk (while unpinned) freezes that layer's highlight + explanation | VERIFIED | `InchiSection.tsx:129-130` — `setPinned({ idx: i, sub: null })` fires on onClick; store gate holds hoverIdx/subHover frozen; UAT test 1 passed |
| 2 | Clicking an atom/element/bond sub-token freezes that precise sub-token | VERIFIED | `LayerText.tsx:36` — `setPinned({ idx: layerIdx, sub: hit })` in subHoverProps onClick; layerIdx threaded through all 4 sub-renderers (13 call sites); UAT test 6 passed |
| 3 | While pinned, hovering does nothing (highlight + explanation stay frozen) | VERIFIED | `store.ts:83-84` — `setHover`/`setSubHover` early-return when `get().pinned` is non-null; `useKetcherHighlights` derives effIdx/effSub from pinned; UAT tests 2 passed |
| 4 | Any click while pinned releases the pin and never re-pins on the same gesture | VERIFIED | `InchiSection.tsx:38-60` — capture-phase `document` click listener fires clearPinned before bubble-phase onClick; layer onClick guard `if (getState().pinned) return`; UAT tests 4 and 5 passed |
| 5 | Pressing Esc while pinned releases the pin | VERIFIED | `InchiSection.tsx:44-48` — window keydown listener for Escape calls clearPinned, active only while pinned; UAT test 3 passed |
| 6 | resetAll() clears the pinned state | VERIFIED | `store.ts:100` — `pinned: null` in the atomic resetAll set(); store test confirms this (line 162-168 in store.test.ts) |
| 7 | A pinned chunk shows a persistent ring (locked cue) on top of its hover fill | VERIFIED | `InchiSection.module.css:192-201` — `.inchiLayer.pinned { box-shadow: 0 0 0 2px var(--layer-accent, currentColor) }` and `.inchiSubtoken.pinned { box-shadow: 0 0 0 2px var(--el-color, currentColor) }`; UAT test 1 confirmed visually |
| 8 | An inline release hint is shown only while pinned | VERIFIED | `InchiSection.tsx:157-159` — `{pinned && <span className={styles.pinnedHint}>Pinned — click anywhere or press Esc to release.</span>}`; `.pinnedHint` in module.css uses var(--font-mono), var(--ink-faint), pointer-events: none |
| 9 | The verbatim InChI string text is never altered or re-rendered by pinning/clicking | VERIFIED | `InchiSection.tsx:137` — `rawText={l.text}` passthrough confirmed; grep returns 2 occurrences (prop + comment); LayerText preserves layer.text verbatim through all sub-renderers |
| 10 | A Help button appears next to Reset in the section-label-actions row | VERIFIED | `KetcherPanel.tsx:37-41` — `<button type="button" className="help-trigger" onClick={onHelpClick}>Help</button>` gated by `onHelpClick &&`; UAT test 7 passed |
| 11 | Clicking Help opens a stepped, spotlight-style overlay tour (not a centered modal) | VERIFIED | `HelpTour.tsx:115` — exported HelpTour with full-viewport dimmer + positioned spotlight div using box-shadow halo; App.tsx:256 wires `<HelpTour open={tourOpen} onClose={...} />`; UAT test 8 passed |
| 12 | The tour shows all 8 steps in order with a Back/Next/Close control + step counter | VERIFIED | `HelpTour.tsx:22-63` — const STEPS array with exactly 8 entries; Back (disabled on step 0), Next/Finish toggle at TOTAL-1, close button, counter `{stepIndex + 1} of {TOTAL}`; UAT test 9 confirmed all 8 steps |
| 13 | Each step spotlights a real UI region positioned from getBoundingClientRect() | VERIFIED | `HelpTour.tsx:128-137` — computeRect uses `document.querySelector(step.selector).getBoundingClientRect()`; all 8 selectors map to real DOM elements (data-tour-id="editor", .mol-list, data-tour-id="inchi-string" ×3, data-tour-id="inchikey", data-tour-id="legend", .section-label-actions); UAT test 9 passed |
| 14 | The tour closes via Close button, Esc, backdrop click, or advancing past the last step | VERIFIED | `HelpTour.tsx:173-188` — four close paths implemented; Esc via keydown listener in useEffect gated on open; UAT test 10 confirmed all 4 paths |
| 15 | On an empty canvas, opening Help auto-loads Caffeine so every step has real content | VERIFIED | `App.tsx:117-123` — `handleHelpClick` checks `layers.length === 0` and calls `handleMolSelect('caffeine')` before `setTourOpen(true)`; HelpTour.test.tsx asserts this behavior; UAT test 11 passed |
| 16 | The auto-loaded Caffeine stays on the canvas after the tour closes (no revert to empty) | VERIFIED | `App.tsx:256` — onClose is `() => setTourOpen(false)` only; no setMolecule/resetAll call on close; test asserts onClose contract; UAT test 11 confirmed persistence |
| 17 | If a molecule is already present, Help loads nothing and uses it as-is | VERIFIED | `App.tsx:118` — `isEmpty` guard prevents handleMolSelect call when layers.length > 0; HelpTour.test.tsx "populated-canvas" test confirms no preset load; UAT test 12 passed |
| 18 | The tour adds zero new runtime dependencies | VERIFIED | package.json dependencies unchanged: only ketcher-*, react, react-dom, zustand; HelpTour is pure React + CSS Modules |

**Score:** 18/18 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store.ts` | pinned field + setPinned/clearPinned + hover gate + resetAll clear | VERIFIED | pinned field at line 42; setPinned/clearPinned at lines 85-86; gate at lines 83-84; resetAll includes pinned:null at line 100; setInchiData also clears pinned (WR-01 fix applied) |
| `src/components/InchiSection.tsx` | layer-level onClick pin/unpin + pinned-aware active/dim + .pinned class | VERIFIED | effectiveIdx at line 75; capture-phase listener useEffect at lines 38-60; setPinned call at line 130; .pinned class applied at line 107; rawText={l.text} verbatim |
| `src/components/LayerText.tsx` | sub-token onClick pin/unpin with stopPropagation, threaded layerIdx | VERIFIED | subHoverProps(hit, layerIdx) at line 25; layerIdx forwarded through FormulaText, ConnectionText, ParityText, HLayerText (28 occurrences); stopPropagation at line 33 |
| `src/hooks/useKetcherHighlights.ts` | pinned precedence over live hover (effIdx/effSub) | VERIFIED | s.pinned selector at line 298; effIdx/effSub derivation at lines 308-309; pinned in deps array at line 367 |
| `src/components/Explanation.tsx` | card reads pinned target with existing precedence | VERIFIED | pinned selector at line 32; effIdx = pinned ? pinned.idx : hoverIdx at line 46; layer resolved from effIdx |
| `src/components/InchiSection.module.css` | pinned ring style + while-pinned release hint style | VERIFIED | .inchiLayer.pinned ring at line 192-195; .inchiSubtoken.pinned ring at lines 198-201; .pinnedHint with var(--font-mono)/var(--ink-faint)/pointer-events:none at lines 205-214 |
| `src/components/HelpTour.tsx` | Custom stepped spotlight overlay: 8 steps, anchoring, controls, close paths | VERIFIED | 268 lines; exports HelpTour; 8 STEPS const; getBoundingClientRect anchoring; Back/Next/Finish/Close controls; useLayoutEffect step reset (WR-03 fix applied); mountedRef useEffect (WR-02 fix applied) |
| `src/components/HelpTour.module.css` | Dimmer, spotlight cutout, callout card styling (oklch tokens) | VERIFIED | oklch appears in callout box-shadow and navBtnPrimary hover; all other properties use var(--...) tokens; no raw hex/rgb colors |
| `src/components/KetcherPanel.tsx` | .help-trigger button + onHelpClick prop | VERIFIED | onHelpClick prop at line 18; help-trigger button at lines 37-41; data-tour-id="editor" at line 56 |
| `src/styles.css` | .help-trigger styling mirroring .reset-trigger | VERIFIED | .help-trigger at line 180 with 28px height, 999px border-radius, var(--line) bg, oklch hover idiom |
| `src/App.tsx` | tourOpen state, handleHelpClick (empty-canvas Caffeine auto-load), HelpTour render | VERIFIED | tourOpen useState at line 28; handleHelpClick at lines 117-123; HelpTour render at line 256; onHelpClick={handleHelpClick} at line 266 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `InchiSection.tsx` | `store.ts setPinned/clearPinned` | onClick + useEffect capture listener | WIRED | getState().setPinned at line 130; getState().clearPinned in capture listener and belt-and-suspenders guard |
| `LayerText.tsx` | `store.ts setPinned` | subHoverProps onClick | WIRED | s.setPinned({ idx: layerIdx, sub: hit }) at line 36; layerIdx correctly threaded |
| `useKetcherHighlights.ts` | `store.pinned` | selector + effIdx/effSub derivation | WIRED | useInchiStore(s => s.pinned) at line 298; used in effIdx/effSub + deps array |
| `Explanation.tsx` | `store.pinned` | selector + effIdx layer resolution | WIRED | useInchiStore(state => state.pinned) at line 32; effIdx resolves layer |
| `KetcherPanel.tsx` | `App onHelpClick` | onClick prop on .help-trigger | WIRED | onHelpClick prop threaded; button onClick={onHelpClick}; App passes onHelpClick={handleHelpClick} |
| `App.tsx` | `handleMolSelect('caffeine')` | empty-canvas auto-load in handleHelpClick | WIRED | `await handleMolSelect('caffeine')` at line 120 inside isEmpty guard |
| `App.tsx` | `HelpTour` | render `<HelpTour open={tourOpen} onClose=...>` | WIRED | Line 256 — `<HelpTour open={tourOpen} onClose={() => setTourOpen(false)} />` |

---

## Data-Flow Trace (Level 4)

Data-flow trace is not applicable here — the phase delivers interaction state (pin/tour) managed via Zustand, not components that fetch and render server data. Relevant data flow: Ketcher WASM emits InChI verbatim → store via setInchiData → displayed unchanged through rawText={l.text}. The pin overlay sits entirely within client state; no rendering of fetched data through newly wired paths.

---

## Behavioral Spot-Checks

Step 7b: Behavioral spot-checks beyond the test suite are not automatable without a running browser (Ketcher requires WASM + DOM). The 375/375 test suite, 13/13 UAT pass, and TypeScript clean build collectively serve as the behavioral gate. The UAT document (16-UAT.md) records human-verified spot-checks across all 13 scenarios.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| Feature 1 — Click-to-Pin (Freeze) Highlights | 16-01-PLAN.md | Store pin state machine, click wiring, pinned precedence, visual cue, release hint | SATISFIED | All store.ts/InchiSection/LayerText/useKetcherHighlights/Explanation/CSS artifacts verified; 375/375 tests green |
| Feature 2 — Guided Help Tour | 16-02-PLAN.md | Help button, 8-step spotlight overlay, empty-canvas Caffeine auto-load, zero new deps | SATISFIED | KetcherPanel/HelpTour/App artifacts verified; 17 HelpTour tests green; 13/13 UAT passed |

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `src/components/InchiSection.tsx:149` | `<button>` without `type="button"` on copy button | Info (IN-01 from code review) | Not a blocker — button is not inside a form; acknowledged in review as defensive convention gap only |

No blockers found. No TODO/FIXME/placeholder patterns in any Phase 16 source files. No stub implementations detected. No hardcoded empty returns in API or data paths.

---

## Code Review Fixes Applied

All four code review findings (WR-01..WR-04) from 16-REVIEW.md were applied in commit `961776f`:

- **WR-01 applied:** `setInchiData` now includes `pinned: null` in its set() call (`store.ts:81`) — stale pin no longer survives molecule loads
- **WR-02 applied:** `mountedRef` in HelpTour.tsx uses a proper useEffect with cleanup (`lines 121-124`) — guard now functions correctly
- **WR-03 applied:** Step reset uses `useLayoutEffect` instead of `useEffect` (`HelpTour.tsx:165`) — no one-frame flash of stale step on re-open
- **WR-04 applied:** Store `beforeEach` includes `pinned: null`, `hAtomPoolIds: []`, `keyHoverKind: null`, `legendHover: null` (`store.test.ts:8-21`) — no test pollution from Phase 16 fields

---

## Human Verification Required

None — the 13/13 UAT pass (recorded in 16-UAT.md, completed 2026-06-25) covers all items that require human judgment: spotlight positioning correctness, callout side-selection, on-token styling fidelity, listener lifecycle (no eaten clicks after unpin), Caffeine persistence after close, and full pin/unpin/Esc interaction including verbatim string passthrough. The UAT was conducted against the merged, post-code-review codebase (after commit `961776f` applied WR-01..WR-04).

---

## Summary

Phase 16 goal is fully achieved. Both features — click-to-pin freeze and the guided Help tour — are implemented, wired, tested (375/375 automated tests pass, tsc clean), and human-verified (13/13 UAT pass with 0 issues). All four code review warnings (WR-01..WR-04) were resolved before UAT. No gaps were found; no deferred items remain from this phase's scope.

The implementation correctly applies the design contract: single enforcement point in the store gate, capture-phase listener for same-gesture no-re-pin guarantee, zero new runtime dependencies, verbatim InChI string passthrough, and oklch/CSS-variable-only styling throughout.

---

_Verified: 2026-06-25T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
