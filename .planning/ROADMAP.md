# Roadmap: Explain that InChI

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 (shipped 2026-06-05)
- ✅ **v1.1 Post-ship correctness & polish** — patch, no roadmap phases (shipped 2026-06-17)
- ✅ **v1.2 In-app feedback via prefilled GitHub issues** — Phases 9–10 (shipped 2026-06-18)
- ✅ **v1.3 InChIKey display & explanation** — Phases 11–13 (shipped 2026-06-19)
- ✅ **v1.4 Reset control & c-layer hover precision** — Phases 14–15 (shipped 2026-06-22)
- ✅ **v1.5 Sub-token-specific explanations** — Phases 17–18 (shipped 2026-06-29)
- ✅ **v1.6 Connection-layer cards** — Phase 19 (shipped 2026-06-30)

> Phase 16 (Pin-to-freeze highlights + Help tour) shipped between v1.4 and v1.5; it is not part of a numbered milestone.

### Post-v1.6 — unmilestoned

No milestone has been open since v1.6 shipped (2026-06-30). Everything since has
run as quick tasks, recorded in STATE.md's "Quick Tasks Completed" table rather
than as phases. That is a deliberate mode, not drift — the work has been
maintenance, legal/deployment hardening and UI refinement, none of it large
enough to roadmap. It is listed here so the roadmap does not read as if the
project stopped on 2026-06-30.

Themes since v1.6: Docker/nginx deployment and the cheminfo URL; legal pages and
the on-leave data purge; Jmol element colours; the isotope-layer highlight fix;
`LIMITATIONS.md` and the in-app Limitations dialog; the preset picker rebuilt as
a map of the notation (layer chips, 33 → 20 presets); and an `/impeccable audit`
pass with its fixes.

### Candidates for the next milestone

Carried, in rough priority. None is scoped or committed — `/gsd-new-milestone`
would be the place to decide.

1. **First-load payload.** 21 MB raw / 7.3 MB gzip in one chunk before anything
   is drawable. The fix is moving the lazy boundary from `App` down to
   `KetcherPanel` so the shell and explanation render while the editor streams
   in. Deferred deliberately: it changes the mount path of a canvas PRODUCT.md
   calls load-bearing, and an undiagnosed mount failure is still open (below).
2. **The undiagnosed browser mount failure** — `createRoot` twice on `#root`,
   `RulerArea` throwing on `SVGLength`. Reported 2026-08-13, never reproduced or
   explained; two hypotheses were tested and falsified. Blocks item 1 honestly.
3. **Accessibility position.** PRODUCT.md records keyboard/colour equivalents as
   undecided, but `lib/keyboardProps.ts` already implements roving keyboard
   access. The record understates the code; adopting a standard (or explicitly
   declining one) would settle it.
4. **Repository visibility.** Private today, so the in-app Limitations link and
   the Send feedback button both 404 for the public. Operator action, not code.
5. **Dark mode.** Never committed; the oklch token system, where lightness is
   already a solved axis, makes it unusually cheap. Explicitly declined once in
   the 2026-08-13 audit.

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

<details>
<summary>Phase 16: Pin-to-freeze highlights and guided Help tour — SHIPPED 2026-06-25 (between v1.4 and v1.5)</summary>

- [x] Phase 16 (2/2 plans) — completed 2026-06-25. Click-to-pin (freeze) highlights + zero-dep stepped spotlight Help tour. Spec: `docs/superpowers/specs/2026-06-22-pin-freeze-and-help-tour-design.md`

</details>

<details>
<summary>✅ v1.5 Sub-token-specific explanations (Phases 17–18) — SHIPPED 2026-06-29</summary>

- [x] Phase 17: Sub-token copy core — element table + pure module + tests (2/2 plans) — completed 2026-06-26; SUBEX-03/04/05/06/08/10
- [x] Phase 18: Explanation-card wiring + live chemist gate (2/2 plans) — completed 2026-06-29; SUBEX-01/02/07/09

Full phase details: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 Connection-layer cards (Phase 19) — SHIPPED 2026-06-30</summary>

- [x] Phase 19: c-layer connection cards (2/2 plans) — completed 2026-06-30; CONN-01..04

Full phase details: `.planning/milestones/v1.6-ROADMAP.md`

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
| 14. Reset control | v1.4 | 1/1 | Complete | 2026-06-19 |
| 15. C-layer hover precision | v1.4 | 2/2 | Complete | 2026-06-22 |
| 16. Pin-to-freeze highlights and guided Help tour | — | 2/2 | Complete | 2026-06-25 |
| 17. Sub-token copy core (element table + pure module + tests) | v1.5 | 2/2 | Complete | 2026-06-26 |
| 18. Explanation-card wiring + live chemist gate | v1.5 | 2/2 | Complete | 2026-06-29 |
| 19. c-layer connection cards | v1.6 | 2/2 | Complete | 2026-06-30 |

---
*Roadmap created: 2026-05-18*
*Updated: 2026-06-22 — v1.4 SHIPPED (Phases 14–15)*
*Updated: 2026-06-25 — Phase 16 complete (between v1.4 and v1.5)*
*Updated: 2026-06-29 — v1.5 (Phases 17–18) complete*
*Updated: 2026-06-30 — v1.5 SHIPPED (tag v1.5) and v1.6 SHIPPED (Phase 19, tag v1.6); phase details archived to milestones/.*
*Updated: 2026-08-13 — added the Post-v1.6 section. No milestone has been open since v1.6; work has run as quick tasks, and the roadmap said nothing about it. Candidates for a next milestone recorded, led by the 7.3 MB first-load payload and the undiagnosed mount failure that blocks fixing it.*
