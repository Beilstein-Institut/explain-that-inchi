# Roadmap: Explain that InChI

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 (shipped 2026-06-05)
- ✅ **v1.1 Post-ship correctness & polish** — patch, no roadmap phases (shipped 2026-06-17)
- ✅ **v1.2 In-app feedback via prefilled GitHub issues** — Phases 9–10 (shipped 2026-06-18)
- ✅ **v1.3 InChIKey display & explanation** — Phases 11–13 (shipped 2026-06-19)
- ✅ **v1.4 Reset control & c-layer hover precision** — Phases 14–15 (shipped 2026-06-22)
- 🔵 **v1.5 Sub-token-specific explanations** — Phases 17–18 (in progress)

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

<details open>
<summary>🔵 v1.5 Sub-token-specific explanations (Phases 17–18) — IN PROGRESS</summary>

- [ ] **Phase 17: Sub-token copy core (element table + pure module + tests)** - Full periodic-table element names and the chemically-verified, unit-tested pure module that turns a hovered/pinned sub-token into card copy
- [x] **Phase 18: Explanation-card wiring + live chemist gate** - Wire one precedence branch into the existing card so hover/pin updates it, honoring all invariants, then verify the live card strings against real molecules (completed 2026-06-29)

</details>

## Phase Details

> Phase 16 (Pin-to-freeze highlights + Help tour) shipped between the v1.4 milestone and v1.5; its detail block is retained below for reference. v1.5 continues phase numbering from there, starting at Phase 17.

### Phase 17: Sub-token copy core (element table + pure module + tests)

**Goal**: A pure, DOM-free `subTokenInfo()` module turns any hovered/pinned sub-token (element / H-count / mobile-H / tetrahedral stereo) into chemically-accurate card copy, backed by a full periodic-table element-name table — fully unit-tested against real `getInchi()` fixtures, with the mandatory "+/− parity is NOT R/S" caveat pinned by test, before any React is touched.
**Depends on**: Nothing new (builds on shipped v1.0–Phase 16 infra; the `SubHover` union, store fields, and canvas highlighting already exist)
**Requirements**: SUBEX-03, SUBEX-04, SUBEX-05, SUBEX-06, SUBEX-08, SUBEX-10
**Success Criteria** (what must be TRUE):

  1. `ELEMENT_NAMES` in `src/lib/layerInfo.ts` is extended in place to the full periodic table; a non-organic symbol (e.g. `K` → "potassium") resolves to a name, and lookup stays case-exact (`Co` → "cobalt", never confused with `C`+`O`) — existing `layerInfo` tests stay green.
  2. A new pure module `src/lib/subTokenInfo.ts` returns `{title, body, reading?}` for an `element` / `hAtoms` / `mobileH` / `stereo` sub-token and returns `null` for c-layer kinds (atom/bond/branch) so the caller can fall through gracefully.
  3. The H-count card states "atom N bears n hydrogen(s)" and never names a functional group (no "methyl"); the mobile-H card says the proton is "shared / mobile / tautomeric" across the listed atoms and never says "bond between" or "each".
  4. The tetrahedral-stereo card explains fixed 3-D handedness at an sp³ centre AND explicitly states the `+`/`−` sign is a parity of the canonical neighbour order, **not** R/S — a unit test asserts the copy contains "parity" and matches `/not.*R\/S/i`.
  5. All test fixtures are real `getInchi()` output (a stereocenter molecule with /t/m/s, a heteroatom-H amine, a tautomer, a multi-element/multi-fragment formula); copy for a fragment-2+ element/atom is derived from the already-offset `SubHover` fields, never by re-parsing `layer.text`.

**Plans**: TBD
**UI hint**: no

### Phase 18: Explanation-card wiring + live chemist gate

**Goal**: The existing explanation card becomes sub-token-aware: hovering or pinning a sub-token updates that same card with the Phase-17 copy, reverting to the whole-layer explanation when only the layer is hovered — all via one new precedence branch and zero store changes, then verified on the live canvas against real molecules by a human chemist before the milestone closes.
**Depends on**: Phase 17
**Requirements**: SUBEX-01, SUBEX-02, SUBEX-07, SUBEX-09
**Success Criteria** (what must be TRUE):

  1. Hovering a sub-token in the InChI string updates the *existing* explanation card (no new card/surface) with that sub-token's specific copy, and the card reverts to the whole-layer explanation when only the layer — not a sub-token — is hovered.
  2. A pinned sub-token shows its sub-token-specific card (via `effSub = pinned ? pinned.sub : subHover`); precedence is keyHoverKind → sub-token → layer → legend → idle, and an InChIKey-segment hover still wins over a sub-token.
  3. Hovering a specific element in the formula updates the card with the element's name and "this is the count of that element's atoms," scoped to the hovered fragment in multi-component formulas (the named element matches the highlighted atoms), with a brief Hill-order note.
  4. The displayed/copied InChI string is byte-identical with a sub-token card open vs. closed (verbatim-passthrough holds), and no loading overlay/WASM re-init occurs on sub-token hover or pin (no-remount holds) — the diff touches no canvas/provider files.
  5. A human chemist reviews the live card strings for the tetrahedral-stereo, mobile-H, H-count, and multi-fragment-element cases on real molecules and confirms chemical accuracy — this gate is not bypassed before the phase is marked verified.

**Plans**: 2 plans (1 + 1 gap-closure)

Plans:

- [x] 18-01-PLAN.md — Wire the sub-token precedence branch (effSub/subCopy) into Explanation.tsx with parent-layer accent; new component test; capture the live chemist accuracy gate (SC#5) for verify-work
- [x] 18-02-PLAN.md — Gap closure (chemist gate): atomPhrase enumerates the discrete H-count atom set (GAP-1) and de-offsets multi-component h-tokens to per-component numbering via a display-only fragmentOffset on SubHover (GAP-2); highlight keeps global canonicals

**UI hint**: yes

---

<details>
<summary>Phase 16: Pin-to-freeze highlights and guided Help tour — SHIPPED 2026-06-25 (between v1.4 and v1.5)</summary>

- [x] Phase 16: Pin-to-freeze highlights and guided Help tour (2/2 plans) — completed 2026-06-25

**Goal:** Let users click an InChI chunk (layer or sub-token) to freeze its highlight + explanation for inspection, and add a Help button (next to Reset) that launches a stepped, spotlight-style guided tour of the app.
**Spec:** docs/superpowers/specs/2026-06-22-pin-freeze-and-help-tour-design.md
**Requirements**: Feature 1 — Click-to-Pin (Freeze) Highlights; Feature 2 — Guided Help Tour (spec-defined; no ROADMAP requirement IDs mapped)
**Depends on:** Phase 15

Plans:

- [x] 16-01-PLAN.md — Click-to-pin (freeze) highlights: store pin state machine + gate, layer/sub-token click wiring, pinned precedence in highlight hook + explanation, locked-state ring + release hint
- [x] 16-02-PLAN.md — Guided Help tour: Help button, custom zero-dep stepped spotlight overlay (8 steps), App tour state with empty-canvas Caffeine auto-load

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
| 17. Sub-token copy core (element table + pure module + tests) | v1.5 | 2/2 | Complete   | 2026-06-26 |
| 18. Explanation-card wiring + live chemist gate | v1.5 | 2/2 | Complete    | 2026-06-29 |

---
*Roadmap created: 2026-05-18*
*Updated: 2026-06-19 — v1.4 milestone roadmapped; Phases 14–15 added*
*Updated: 2026-06-22 — v1.4 SHIPPED (Phases 14–15); archived to milestones/v1.4-ROADMAP.md*
*Updated: 2026-06-22 — Phase 16 planned: 2 plans (16-01, 16-02)*
*Updated: 2026-06-25 — Phase 16 complete (2/2 plans, 13/13 UAT passed)*
*Updated: 2026-06-26 — v1.5 milestone (Sub-token-specific explanations) roadmapped; Phases 17–18 added, SUBEX-01..10 mapped 100%*
