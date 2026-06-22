---
phase: 16-pin-to-freeze-highlights-and-guided-help-tour
plan: "01"
subsystem: hover-pin-state
tags: [pin, freeze, store-gate, highlight-precedence, real-fixtures]
dependency_graph:
  requires: []
  provides: [store.pinned, store.setPinned, store.clearPinned, hover-gate, pinned-precedence, locked-ring-css]
  affects: [src/store.ts, src/components/InchiSection.tsx, src/components/LayerText.tsx, src/hooks/useKetcherHighlights.ts, src/components/Explanation.tsx, src/components/InchiSection.module.css]
tech_stack:
  added: []
  patterns: [zustand-getter-gate, capture-phase-listener, useEffect-keyed-cleanup, real-inchi-fixtures]
key_files:
  created: []
  modified:
    - src/store.ts
    - src/components/InchiSection.tsx
    - src/components/LayerText.tsx
    - src/hooks/useKetcherHighlights.ts
    - src/components/Explanation.tsx
    - src/components/InchiSection.module.css
    - src/__tests__/store.test.ts
    - src/hooks/__tests__/useKetcherHighlights.test.ts
decisions:
  - "pinned typed exactly { idx: number; sub: SubHover | null } | null; null = nothing frozen"
  - "Single enforcement point: setHover/setSubHover early-return when get().pinned is non-null (initialiser widened to (set, get))"
  - "resetAll clears pinned via the atomic set() call — does NOT invoke clearPinned() (Zustand-5 anti-pattern avoided)"
  - "Click-anywhere unfreeze uses a capture-phase document click listener so it fires before the layer span's bubble-phase onClick — guarantees no same-gesture re-pin"
  - "Listeners (document click + window keydown Esc) added ONLY while pinned via useEffect keyed on [pinned], removed in cleanup (T-16-01 mitigation)"
  - "Highlight hook + Explanation derive effIdx/effSub = pinned ? pinned.* : live; pinned added to hook effect deps"
  - "Locked ring uses box-shadow with --layer-accent (layers) / --el-color (sub-tokens) CSS custom property tokens — no off-token colours"
  - "Hook precedence tests use real InChI fixtures (4 InChI=1S/ literals), never fabricated layer text"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-22"
  tasks_completed: 3
  files_changed: 8
---

# Phase 16 Plan 01: Click-to-Pin (Freeze) Highlights — Summary

One-liner: A `pinned` store state machine with a single hover-gate enforcement point, layer + sub-token click wiring, pinned-over-live precedence in the highlight hook and explanation card, a locked-state ring + release hint, and real-fixture tests.

## What Was Built

### Task 1 — Pinned state machine + hover gate (store)
- Added `pinned: { idx: number; sub: SubHover | null } | null` to `InchiState` next to `subHover`, plus `setPinned`/`clearPinned` action signatures; reused the existing `SubHover` import (not redefined).
- Widened the initialiser from `(set)` to `(set, get)`; initialised `pinned: null`.
- Gated `setHover` and `setSubHover` to early-return when `get().pinned` is non-null — the spec's single enforcement point.
- `setPinned: (p) => set({ pinned: p })`, `clearPinned: () => set({ pinned: null })`.
- Added `pinned: null` to the existing atomic `resetAll` set() call (no `clearPinned()` call from inside `resetAll`).

### Task 2 — Layer + sub-token click-to-pin (InchiSection + LayerText)
- InchiSection: added a `pinned` selector; layer span `onClick` releases (`clearPinned()`) when already pinned else `setPinned({ idx: i, sub: null })`; derived `effectiveIdx = pinned ? pinned.idx : hoverIdx` driving active/dim; `.pinned` class applied to the pinned layer; `--layer-accent` passed for the ring colour; `layerIdx` threaded into `<LayerText>`; `rawText={l.text}` kept verbatim.
- A `useEffect` keyed on `[pinned]` registers a **capture-phase** `document` click listener and a `window` keydown (Esc) listener — both call `clearPinned()` and are removed in cleanup, added only while pinned. Capture phase ensures the release fires before the span's bubble-phase onClick, so a click while pinned only releases (never re-pins on the same gesture).
- LayerText: converted the module-scope `subHoverProps(hit)` factory to `subHoverProps(hit, layerIdx)`; added `layerIdx` to `LayerText` props and forwarded it through all four sub-renderers (FormulaText, ConnectionText, ParityText, HLayerText) so every `subHoverProps({...})` call passes the owning layer index. The returned `onClick` calls `e.stopPropagation()` then releases-if-pinned else `setPinned({ idx: layerIdx, sub: hit })`. Sub-token `.pinned` class applied when the rendered hit matches the pinned sub.

### Task 3 — Pinned precedence in hook + explanation, locked-state CSS
- `useKetcherHighlights`: added `s.pinned` selector; `effIdx = pinned ? pinned.idx : hoverIdx`, `effSub = pinned ? pinned.sub : subHover`; replaced internal `hoverIdx`/`subHover` uses (null guard, `layers[effIdx]`, `buildHighlightSpecs(layer, effSub, …)`, badge branches) with the effective values; added `pinned` to the effect deps array. Pure helpers unchanged.
- `Explanation`: added `state.pinned` selector and `effIdx` derivation; resolves the displayed layer from `effIdx`.
- `InchiSection.module.css`: `.inchiLayer.pinned` / `.inchiSubtoken.pinned` add an outer ring `box-shadow: 0 0 0 2px var(--layer-accent / --el-color, currentColor)` on top of the existing hover fill; `.pinnedHint` uses `var(--font-mono)` + `var(--ink-faint)` + `pointer-events: none`, rendered only while pinned.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 1b8313b | feat(16-01): add pinned state machine + hover gate to store |
| 2 | 2ccf04c | feat(16-01): wire layer + sub-token click-to-pin in InchiSection and LayerText |
| 3 | 6fcced2 | feat(16-01): pinned precedence in highlight hook + explanation, locked-state CSS |

## Deviations from Plan

**1. [Orchestrator recovery] Task 3 verified + committed by the orchestrator after a mid-execution Bash permission revocation.**
- **Found during:** Task 3 — the executor agent's Bash permissions were revoked before it could run the verification commands and commit. The Task 3 code edits were already written in the worktree.
- **Resolution:** The orchestrator ran the plan's Task 3 gates in the worktree (`vitest` hook test: 31/31 green; `tsc --noEmit`: exit 0; full suite: 358/358 green), then committed Task 3 (6fcced2) and this SUMMARY. No code logic was changed by the orchestrator — only verification + commit.
- **Files modified:** none beyond the executor's existing Task 3 edits.

## Test Results

| Check | Result |
|-------|--------|
| `vitest run src/hooks/__tests__/useKetcherHighlights.test.ts` | 31/31 GREEN |
| `tsc --noEmit` | exit 0 |
| Full suite (16-01 worktree) | 358/358 GREEN |

## Known Stubs

None.

## Threat Flags

None new. T-16-01 (self-inflicted UI lock) mitigated: click/Esc listeners added only while pinned and removed in useEffect cleanup. T-16-02 (string integrity): `rawText={l.text}` passthrough verified verbatim. All other STRIDE entries accepted per PLAN.md.

## Self-Check: PASSED

- `src/store.ts` — `pinned:` field, `setPinned`, `clearPinned`, `(set, get)`, `resetAll` sets `pinned: null` (grep-verified)
- `src/components/InchiSection.tsx` — `getState().setPinned(`, `effectiveIdx`, capture-phase listeners in `useEffect([pinned])`, `rawText={l.text}` (grep-verified)
- `src/components/LayerText.tsx` — `subHoverProps(hit, layerIdx)` threaded through all four sub-renderers, `setPinned({ idx: layerIdx, sub: hit })` (grep-verified)
- `src/hooks/useKetcherHighlights.ts` — `s.pinned`, `effIdx`/`effSub`, `pinned` in deps array (grep-verified)
- `src/components/Explanation.tsx` — `state.pinned` + `effIdx` layer resolution (grep-verified)
- `src/components/InchiSection.module.css` — `.pinned` ring box-shadow via `var(--…)` token, `.pinnedHint` mono/faint/pointer-events-none (grep-verified)
- Hook precedence tests use real `InChI=1S/` fixtures (4 literals)
- Commits 1b8313b, 2ccf04c, 6fcced2 verified in git log
