# Roadmap: Explain that InChI

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 (shipped 2026-06-05)
- ✅ **v1.1 Post-ship correctness & polish** — patch, no roadmap phases (shipped 2026-06-17)
- ✅ **v1.2 In-app feedback via prefilled GitHub issues** — Phases 9–10 (shipped 2026-06-18)
- ✅ **v1.3 InChIKey display & explanation** — Phases 11–13 (shipped 2026-06-19)
- 🚧 **v1.4 Reset control & c-layer hover precision** — Phases 14–15 (planning)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–8) — SHIPPED 2026-06-05</summary>

- [x] Phase 1: Scaffold and Ketcher Mount (2/2 plans) — completed 2026-05-19
- [x] Phase 2: Data Pipeline (3/3 plans) — completed 2026-05-20
- [x] Phase 3: InChI Display and Explanation UI (5/5 plans) — completed 2026-05-21
- [x] Phase 4: Hover-to-Highlight Integration (3/3 plans) — completed 2026-05-22
- [x] Phase 5: Mapping Strip and Preset Molecules (3/3 plans) — completed 2026-05-22
- [x] Phase 6: Hydrogen Highlight, Polish, and Deploy (4/4 plans) — completed 2026-06-01
- [x] Phase 7: Multi-Fragment Highlighting, p-Layer, and Copy (3/3 plans) — completed 2026-06-01
- [x] Phase 8: Hydrogen Implicit & Explicit Highlight (2/2 plans) — completed 2026-06-05

Full phase details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 In-app feedback via prefilled GitHub issues (Phases 9–10) — SHIPPED 2026-06-18</summary>

- [x] Phase 9: Feedback URL builder, config & version injection (2/2 plans) — completed 2026-06-17
- [x] Phase 10: Feedback dialog, context capture & entry point (4/4 plans) — completed 2026-06-18

Full phase details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 InChIKey display & explanation (Phases 11–13) — SHIPPED 2026-06-19</summary>

- [x] Phase 11: Source & Wiring (3/3 plans) — completed 2026-06-18
- [x] Phase 12: Render & Layout (2/2 plans) — completed 2026-06-18
- [x] Phase 13: Content & Explanation (1/1 plan) — completed 2026-06-19

Full phase details: `.planning/milestones/v1.3-ROADMAP.md`

</details>

### 🚧 v1.4 Reset control & c-layer hover precision (Phases 14–15)

- [ ] **Phase 14: Reset control** — A Reset control clears the canvas and returns all app state to its empty/idle placeholder, without remounting the canvas/WASM.
- [ ] **Phase 15: C-layer hover precision** — C-layer atom numbers, hyphens, and parentheses each highlight the exact atom/bond(s) they denote, correct across multi-fragment and duplicated-fragment molecules.

## Phase Details

### Phase 14: Reset control
**Goal**: A user can clear their current exploration and return the entire tool to its fresh, empty starting state in one click.
**Depends on**: Nothing within v1.4 (builds on the existing v1.3 app shell)
**Requirements**: RESET-01, RESET-02, RESET-03, RESET-04, RESET-05
**Success Criteria** (what must be TRUE):
  1. A "Reset" control is visible immediately to the left of the "Send feedback" control.
  2. Clicking Reset clears the molecule from the Ketcher canvas (equivalent to Ketcher's own clear action).
  3. After Reset, the InChI strip, InChIKey, explanation card, legend, mapping, and any active hover/highlight all return to the placeholder/idle state shown before any molecule is drawn.
  4. The Ketcher canvas and WASM are not remounted or re-initialized by Reset (canvas stays alive, no loading flash).
  5. Clicking Reset on an already-empty canvas is a safe no-op — no error, idle state preserved.
**Plans**: TBD
**Notes**: Reset is a clear-to-empty action only (no undo/redo history, no confirmation dialog, no preset reload — see Out of Scope). Honor the leaf-sibling, no-remount invariant: trigger Ketcher's built-in clear and reset Zustand store fields; never conditionally render `<Editor>` or recreate the StructServiceProvider.
**UI hint**: yes

### Phase 15: C-layer hover precision
**Goal**: When a user hovers any token of the connectivity (c) layer, the canvas highlights exactly the atom or bond(s) that token denotes — never more — and stays correct for multi-fragment and duplicated-fragment molecules.
**Depends on**: Nothing within v1.4 (independent of Phase 14; both build on the existing highlight pipeline)
**Requirements**: CLYR-01, CLYR-02, CLYR-03, CLYR-04, CLYR-05
**Success Criteria** (what must be TRUE):
  1. Hovering a canonical atom number in the c-layer highlights only that single atom (no bonds).
  2. Hovering a hyphen (`-`) highlights the single bond connecting the two atoms it joins.
  3. Hovering an opening or closing parenthesis (`(` / `)`) highlights all bonds involved in that branch.
  4. For multi-fragment molecules, every c-layer atom/hyphen/parenthesis hover resolves within its own fragment (correct atoms/bonds, no cross-fragment bleed).
  5. For duplicated/repeated fragments (multiplied component prefixes), c-layer hovers highlight the intended fragment instance(s).
**Plans**: TBD
**Notes**: This is the heavier, riskier area. Changes live in the existing `buildHighlightSpecs` / `buildSubHoverSpecs` → `useKetcherHighlights` pipeline (offset/highlight logic only — never re-render or re-join the verbatim InChI string). Fragment correctness rides on the canonical→Ketcher pool-ID mapping from AuxInfo. Highlight-precision changes only; existing c-layer explanation prose is unchanged unless found inaccurate.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Scaffold and Ketcher Mount | v1.0 | 2/2 | Complete | 2026-05-19 |
| 2. Data Pipeline | v1.0 | 3/3 | Complete | 2026-05-20 |
| 3. InChI Display and Explanation UI | v1.0 | 5/5 | Complete | 2026-05-21 |
| 4. Hover-to-Highlight Integration | v1.0 | 3/3 | Complete | 2026-05-22 |
| 5. Mapping Strip and Preset Molecules | v1.0 | 3/3 | Complete | 2026-05-22 |
| 6. Hydrogen Highlight, Polish, and Deploy | v1.0 | 4/4 | Complete | 2026-06-01 |
| 7. Multi-Fragment Highlighting, p-Layer, and Copy | v1.0 | 3/3 | Complete | 2026-06-01 |
| 8. Hydrogen Implicit & Explicit Highlight | v1.0 | 2/2 | Complete | 2026-06-05 |
| 9. Feedback URL builder, config & version injection | v1.2 | 2/2 | Complete | 2026-06-17 |
| 10. Feedback dialog, context capture & entry point | v1.2 | 4/4 | Complete | 2026-06-18 |
| 11. Source & Wiring | v1.3 | 3/3 | Complete | 2026-06-18 |
| 12. Render & Layout | v1.3 | 2/2 | Complete | 2026-06-18 |
| 13. Content & Explanation | v1.3 | 1/1 | Complete | 2026-06-19 |
| 14. Reset control | v1.4 | 0/? | Not started | - |
| 15. C-layer hover precision | v1.4 | 0/? | Not started | - |

---
*Roadmap created: 2026-05-18*
*Updated: 2026-06-19 — v1.4 milestone (Reset control & c-layer hover precision) roadmapped; Phases 14–15 added*
