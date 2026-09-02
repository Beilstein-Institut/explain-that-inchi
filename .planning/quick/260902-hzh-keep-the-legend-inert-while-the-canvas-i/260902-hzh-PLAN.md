---
quick_id: 260902-hzh
type: quick
description: Keep the legend inert while the canvas is empty
date: 2026-09-02
files_modified:
  - src/components/Legend.tsx
  - src/components/__tests__/Legend.touch.test.tsx
---

# Quick Task 260902-hzh: Keep the legend inert while the canvas is empty

## Problem
User report 2026-09-02: with no molecule drawn, hovering a legend row still swaps the explanation
card (EMPTY_INFO, "draw a molecule") for that layer's static UAT-13 info. With nothing drawn every
row is "absent", so the card reacts to a molecule that does not exist.

## Fix
`src/components/Legend.tsx` — in the shared `show` handler (hover/focus/tap), return early when
`layers.length === 0` before any store write. The leave/blur handlers stay as they are (writing
`null` is harmless). Gating at the source means no store writes at all, and the card's own
precedence logic is untouched. Rows stay focusable so the tab order does not change with state.

## Test
`Legend.touch.test.tsx`: with `mockLayers = []`, hover/focus/click on rows call none of
`setLegendHover` / `setHover` / `setSubHover`; with benzene loaded, hover still calls
`setLegendHover`. Mutation-test by removing the guard.

## Verify
`npx tsc -b` clean; `npm test -- --run` green (727+). Browser: empty canvas, hover the legend — the
card keeps saying to draw a molecule; load a preset and the legend explains layers again.
