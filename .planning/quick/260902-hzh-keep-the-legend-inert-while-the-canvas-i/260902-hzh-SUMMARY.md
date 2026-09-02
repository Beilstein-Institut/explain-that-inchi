---
quick_id: 260902-hzh
status: complete
date: 2026-09-02
commits:
  - 4c53ba7 Keep the legend inert while the canvas is empty
tests: 728 passed
---

# Quick Task 260902-hzh — Summary

User report: with no molecule drawn, hovering a legend row still changed the explanation card.

**Fix (4c53ba7):** the shared `show` handler in `src/components/Legend.tsx` returns early when
`layers.length === 0`, before any store write (`setSubHover`/`setLegendHover`/`setHover`). Leave
and blur handlers are unchanged. Rows remain focusable. The card's precedence logic is untouched, so
once a molecule exists the legend explains present and absent layers exactly as before (UAT-13).

**Tests (+2 in `Legend.touch.test.tsx`):** with an empty layer list, hover/focus/click on rows write
nothing to the store; with benzene loaded, hover still calls `setLegendHover`. Mutation: removing the
guard fails the first test.

Verified: `npx tsc -b` clean, lint clean, `npm test -- --run` 728/728.
