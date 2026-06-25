# Roadmap: Explain that InChI

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 (shipped 2026-06-05)
- ✅ **v1.1 Post-ship correctness & polish** — patch, no roadmap phases (shipped 2026-06-17)
- ✅ **v1.2 In-app feedback via prefilled GitHub issues** — Phases 9–10 (shipped 2026-06-18)
- ✅ **v1.3 InChIKey display & explanation** — Phases 11–13 (shipped 2026-06-19)
- ✅ **v1.4 Reset control & c-layer hover precision** — Phases 14–15 (shipped 2026-06-22)

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

<details>
<summary>✅ v1.4 Reset control & c-layer hover precision (Phases 14–15) — SHIPPED 2026-06-22</summary>

- [x] Phase 14: Reset control (1/1 plan) — completed 2026-06-19; RESET-01..05
- [x] Phase 15: C-layer hover precision (2/2 plans) — completed 2026-06-22; CLYR-01..05

Full phase details: `.planning/milestones/v1.4-ROADMAP.md`

</details>

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
| 14. Reset control | v1.4 | 1/1 | Complete   | 2026-06-19 |
| 15. C-layer hover precision | v1.4 | 2/2 | Complete    | 2026-06-22 |
| 16. Pin-to-freeze highlights and guided Help tour | — | 2/2 | Complete | 2026-06-25 |

### Phase 16: Pin-to-freeze highlights and guided Help tour

**Goal:** Let users click an InChI chunk (layer or sub-token) to freeze its highlight + explanation for inspection, and add a Help button (next to Reset) that launches a stepped, spotlight-style guided tour of the app.
**Spec:** docs/superpowers/specs/2026-06-22-pin-freeze-and-help-tour-design.md
**Requirements**: Feature 1 — Click-to-Pin (Freeze) Highlights; Feature 2 — Guided Help Tour (spec-defined; no ROADMAP requirement IDs mapped)
**Depends on:** Phase 15
**Plans:** 2 plans

Plans:
- [x] 16-01-PLAN.md — Click-to-pin (freeze) highlights: store pin state machine + gate, layer/sub-token click wiring, pinned precedence in highlight hook + explanation, locked-state ring + release hint
- [x] 16-02-PLAN.md — Guided Help tour: Help button, custom zero-dep stepped spotlight overlay (8 steps), App tour state with empty-canvas Caffeine auto-load

---
*Roadmap created: 2026-05-18*
*Updated: 2026-06-19 — v1.4 milestone (Reset control & c-layer hover precision) roadmapped; Phases 14–15 added*
*Updated: 2026-06-19 — Phase 14 planned: 1 plan (14-01)*
*Updated: 2026-06-19 — Phase 15 planned: 2 plans (15-01, 15-02)*
*Updated: 2026-06-22 — v1.4 SHIPPED (Phases 14–15); archived to milestones/v1.4-ROADMAP.md*
*Updated: 2026-06-22 — Phase 16 planned: 2 plans (16-01, 16-02)*
*Updated: 2026-06-25 — Phase 16 complete (2/2 plans, 13/13 UAT passed)*
