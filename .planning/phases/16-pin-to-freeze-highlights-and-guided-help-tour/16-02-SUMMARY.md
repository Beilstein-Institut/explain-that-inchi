---
phase: 16-pin-to-freeze-highlights-and-guided-help-tour
plan: "02"
subsystem: help-tour-ui
tags: [ui, overlay, help-tour, guided-tour, caffeine-auto-load]
dependency_graph:
  requires: []
  provides: [HelpTour overlay component, Help button in KetcherPanel, tour data-tour-id anchors, empty-canvas Caffeine auto-load]
  affects: [src/App.tsx, src/components/KetcherPanel.tsx, src/components/HelpTour.tsx, src/styles.css]
tech_stack:
  added: []
  patterns: [custom stepped overlay (getBoundingClientRect + box-shadow hole), useEffect listener cleanup gate, callout side-selection algorithm]
key_files:
  created:
    - src/components/HelpTour.tsx
    - src/components/HelpTour.module.css
    - src/components/__tests__/HelpTour.test.tsx
  modified:
    - src/components/KetcherPanel.tsx
    - src/styles.css
    - src/App.tsx
    - src/components/InchiSection.tsx
    - src/components/InchiKeySection.tsx
    - src/components/Legend.tsx
decisions:
  - "Spotlight via box-shadow halo on a positioned div (not clip-path) — single-element technique, no z-index stacking complexity"
  - "Callout side-selection uses viewport space geometry (above/below/left/right) with MARGIN and CALLOUT_HEIGHT/WIDTH constants"
  - "Esc/resize/scroll listeners registered in a single useEffect gated on open=true, removed in cleanup — T-16-04 mitigation"
  - "data-tour-id anchors placed on component root elements; mol-list and section-label-actions use existing global classes"
  - "Empty-canvas auto-load reuses handleMolSelect('caffeine') — preserves isSettingMoleculeRef guard, no setMolecule re-implementation"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-22"
  tasks_completed: 3
  tasks_total: 4
  files_changed: 9
---

# Phase 16 Plan 02: Guided Help Tour — Summary

**One-liner:** Custom zero-dependency stepped spotlight overlay (8 steps, getBoundingClientRect anchoring) with a Help button next to Reset and empty-canvas Caffeine auto-load that persists after close.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Add Help button (.help-trigger) to KetcherPanel + styling | c5288a5 | Done |
| 2 | Build HelpTour overlay component + module CSS | b461008 | Done |
| 3 | Wire tour state into App with empty-canvas Caffeine auto-load + tests | d1024a2 | Done |
| 4 | Checkpoint: Human-verify the Help tour + pin interaction | — | **DEFERRED** |

## Human-verify Checkpoint (Task 4) DEFERRED

Task 4 is a `checkpoint:human-verify` with `gate="blocking"`. It is **explicitly deferred to the orchestrator post-merge** per the plan's cross-plan gating: verification step 6 exercises the pin feature from plan 16-01 which does not exist in this isolated worktree. The orchestrator will run the human-verify checkpoint after merging both wave-1 plans (16-01 + 16-02).

## What Was Built

### Task 1: Help Button + Styling
- Added `onHelpClick?: () => void` prop to `KetcherPanel` with JSDoc
- Rendered `<button className="help-trigger">Help</button>` in `section-label-actions`, gated by `onHelpClick &&`, placed before Reset
- Added `data-tour-id="editor"` to the canvas-wrap container
- Added `.help-trigger` CSS rule to `styles.css` mirroring `.reset-trigger` exactly (28px height, `999px` border-radius, `var(--line)` bg, `var(--ink-soft)` text, `oklch(from var(--line) calc(l - 0.04) c h)` hover)

### Task 2: HelpTour Component
- Created `src/components/HelpTour.tsx` exporting `HelpTour({ open, onClose })`
- 8 steps with spec-exact titles and `data-tour-id` selectors
- Spotlight technique: positioned div with large `box-shadow` spreading outward as a dimmer hole
- Callout side-selection: picks above/below/right/left based on available viewport space
- Controls: Back (disabled on step 0), Next/Finish, Close (×), step counter "N of 8"
- All 4 close paths: Close button, Esc, backdrop click, advance past last step
- `useEffect` gated on `open`: registers resize/scroll (recompute rect) + Esc keydown listeners; removes all in cleanup (T-16-04 mitigation)
- `HelpTour.module.css`: oklch/var tokens only; serif title, sans body, mono counter; `var(--c-formula)` accent for primary nav button

### Task 3: App Wiring + Tests
- Added `tourOpen` state, `handleHelpClick` (empty-canvas detection + `handleMolSelect('caffeine')` auto-load), `<HelpTour>` sibling render, `onHelpClick` prop to `KetcherPanel`
- `onClose` is `() => setTourOpen(false)` — never calls `setMolecule('')` or `resetAll()`, Caffeine stays (D-02)
- Added `data-tour-id` anchors: `inchi-string` on InchiSection, `inchikey` on InchiKeySection, `legend` on Legend
- `mol-list` and `section-label-actions` use existing global classes (no change needed)
- Wrote 17 tests in `HelpTour.test.tsx`: all 8 step titles, Back/Next/counter, Back disabled on step 0, Finish on last step, all 4 close paths, Esc listener removed after close, empty-canvas loads caffeine, populated-canvas loads nothing, onClose contract (no setMolecule/resetAll)

## Test Results

- 360 tests pass (343 existing + 17 new HelpTour tests)
- `npx tsc --noEmit` exits 0
- No regressions in existing test suite

## Deviations from Plan

None — plan executed as written for the three auto tasks.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. HelpTour is a purely client-side DOM overlay. T-16-04 (listener lifecycle) mitigated per plan. T-16-05 (XSS) not applicable — all step copy is static string literals. T-16-06 (string integrity) maintained — `handleMolSelect('caffeine')` reuses the existing preset path.

## Known Stubs

None — the HelpTour overlay renders real DOM content from `STEPS` const; all 8 `data-tour-id` / class selectors are present in the DOM after wiring.

## Self-Check: PASSED

All created files exist on disk. All three task commits found in git log:
- c5288a5 — Task 1: Help button + styling
- b461008 — Task 2: HelpTour component + module CSS
- d1024a2 — Task 3: App wiring + tests
