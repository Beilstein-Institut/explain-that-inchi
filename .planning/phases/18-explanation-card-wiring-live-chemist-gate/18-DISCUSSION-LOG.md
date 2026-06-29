# Phase 18: Explanation-card wiring + live chemist gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 18-explanation-card-wiring-live-chemist-gate
**Areas discussed:** Card accent color, Visual distinction, Chemist gate logistics, Atom-label specificity

---

## Card accent color

| Option | Description | Selected |
|--------|-------------|----------|
| Inherit parent layer | Formula-element → formula color, h sub-token → h color, t stereo → stereo color; reuses `swatchVar`. Parent from `effIdx`/`pinned.idx`. | ✓ |
| One fixed sub-token color | All sub-token cards share a single distinct accent. | |
| Neutral grey | Use `--ink-faint` like the idle card. | |

**User's choice:** Inherit parent layer
**Notes:** Card feels like the same card "zooming in" on a piece — keeps it consistent with the layer card chrome.

---

## Visual distinction

| Option | Description | Selected |
|--------|-------------|----------|
| Identical structure | Title + body only, same as the key-segment card; no new CSS. Title already signals specificity. | ✓ |
| Add parent breadcrumb | Small 'Formula › element' label above the title; new element + CSS. | |

**User's choice:** Identical structure
**Notes:** No breadcrumb; minimal diff.

---

## Chemist gate logistics

| Option | Description | Selected |
|--------|-------------|----------|
| You review via verify-work | Claude picks a real-molecule set covering all 4 cases; user hovers live and confirms; recorded as UAT items. | ✓ |
| External chemist sign-off | Hand off to a separate chemist colleague. | |
| You decide the molecule set | User names the specific molecules. | |

**User's choice:** You review via verify-work
**Notes:** User is the domain expert (Beilstein-Institut). Closes Phase 17's deferred SUBEX-10 prose gate, folded into Phase 18 per the Phase-17 HANDOFF. Real `getInchi()` molecules only — no fabricated InChI.

---

## Atom-label specificity

| Option | Description | Selected |
|--------|-------------|----------|
| Keep bare 'atom N' | Phase-17 D-08-safest; zero churn to `subTokenInfo.ts`/tests. | ✓ |
| Element-prefixed 'atom N (C)' | Use `atomElements`; more informative but reopens Phase-17 module + tests. | |

**User's choice:** Keep bare 'atom N'
**Notes:** Phase 18 only wires existing module output into the card — `subTokenInfo.ts` is not reopened.

---

## Claude's Discretion

- Exact JSX placement/formatting of the new branch (must sit between `keyHoverKind` and `layer`).
- The specific real molecules chosen for the chemist gate (subject to covering all 4 cases with real InChI).

## Deferred Ideas

- Element-prefixed atom labels via `atomElements` — considered and declined for this milestone; param stays available for a future phase.
