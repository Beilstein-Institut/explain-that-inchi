---
quick_id: 260902-i2t
status: complete
date: 2026-09-02
commits:
  - 6292eee Grey out the legend while the canvas is empty
tests: 731 passed
---

# Quick Task 260902-i2t — Summary

- `Legend.tsx`: card gets `data-empty="true"` while `layers.length === 0`; rows get `tabIndex -1`
  in that state (0 otherwise). Explanation card untouched by design.
- `Explanation.module.css`: `.legendCard[data-empty="true"]` mirrors `.inchiDisplay[data-empty="true"]`
  (opacity 0.45, `--line-soft` border, `pointer-events: none`).
- `src/testing/cssProbe.ts`: `rule()` now escapes all regex metacharacters and accepts a rule preceded by
  a comment (`*/`) as well as by `}`. Without this, attribute selectors could not be probed at all.
- Tests (+3): render test for the attribute and tab order in both states; CSS probe pinning the legend's
  empty rule to the InChI box's on all three properties.
- Mutation: removing the attribute fails the render test; changing opacity to 0.6 fails the probe.

Verified: `npx tsc -b` clean, lint clean, `npm test -- --run` 731/731.

Human check still open: on a real screen, confirm the ring swatches remain discernible under the
card-level 0.45 on top of the rows' own muted styling.
