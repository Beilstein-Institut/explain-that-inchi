---
phase: 19
plan: 02
subsystem: sub-token-cards
tags: [c-layer, h-layer, LayerText, connection-cards, n-star, chemist-gate, gap-closure]
status: complete
requires:
  - "subTokenInfo 'atom'/'bond'/'branch' cards + SubHover.incidentPairs/branchPoint (plan 01)"
  - "exported segmentBonds (plan 01)"
  - "ConnectionText/HydrogenText SubHover construction + buildSubHoverSpecs global highlight (Phase 15)"
provides:
  - "Live c-layer connection cards: ConnectionText attaches incidentPairs (global), fragmentOffset, componentIndex, branchPoint (both parens)"
  - "Per-component LOCAL display numbering for the c-layer cards (de-offset; highlight stays global)"
  - "SubHover.fragMult — N* duplicated-fragment multiplicity; card collapses to one representative fragment + states multiplicity (GAP-19)"
  - "c-layer card titles prefixed 'Connection layer - Atom/Bond/Branch'"
affects:
  - "src/components/LayerText.tsx (ConnectionText + HydrogenText N* sites)"
  - "src/lib/subTokenInfo.ts (N* card branches + multiplicityClause/firstFragment helpers + titles)"
  - "src/lib/parseInchi.ts (SubHover.fragMult)"
---

# 19-02: Wire live c-layer connection cards (+ N* gap closure)

## What was built

Wired the `ConnectionText` construction sites in `LayerText.tsx` so a hovered/pinned
c-layer atom/hyphen/parenthesis carries the display context the plan-01 card consumers
need: `incidentPairs` (global, via the exported `segmentBonds`), `fragmentOffset`,
`componentIndex`, and `branchPoint` (on BOTH the open and close paren, so either shows
the identical Branch card). Single-component and pure-`N*` paths pass offset/component 0.

**Commit `21b793b`** — initial wiring (atom/bond/branch SubHovers + per-component threading).

## Gap closure (UAT test 2 — `N*` duplicated fragments)

Live chemist UAT found the `N*` duplicated-fragment notation (`2*1-2-4-6-5-3-1`,
`2*1-6H`) produced wrong CARD text in both layers: global numbers + neighbours fanned
across every copy (c-layer), and merged copies "1–12 (component 3)" (h-layer). The
canvas highlight was correct (CLYR-05).

**Commit `2e881d9`** — root-cause fix (TDD, real fixture caffeine+toluene+2·benzene):
- `SubHover.fragMult` added; when >1 the pure `subTokenInfo` card collapses to ONE
  representative fragment in per-component LOCAL numbering and appends
  "in each of the N identical components (components X and Y)".
- c-layer `incidentPairs` made single-fragment (uses `.canonical`, not fanned
  `.canonicals`); N* segment passes real `fragmentOffset`/`componentIndex` + `fragMult`;
  branch `bondPairs` grouped by fragment so the card slice reads one branch.
- h-layer N* hits carry `fragMult` so the card slices `atoms` to one fragment.
- Highlight fields untouched → GAP-2 highlight-invariance guards still pass (CLYR-05).
- Also applied the deferred "Connection layer - " prefix to the three c-layer titles.

## Verification

- `npx vitest run` → **446 passed** (incl. 6 new N* card tests + updated title contract).
- `npx tsc --noEmit` clean; `npm run build` clean.
- **Chemist accuracy gate (blocking) PASSED** — live re-verification on the real
  caffeine+toluene+2·benzene structure: single-fragment local numbering, multiplicity
  note, correct titles, highlight unchanged. (19-UAT.md test 2 → pass.)

## Self-Check: PASSED
