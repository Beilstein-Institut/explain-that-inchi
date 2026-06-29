---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Sub-token-specific explanations
current_phase: 18
current_phase_name: explanation-card-wiring-live-chemist-gate
status: verifying
stopped_at: Completed 18-01-PLAN.md
last_updated: "2026-06-29T06:11:27.084Z"
last_activity: 2026-06-29
last_activity_desc: Phase 18 execution started
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.5 — Sub-token-specific explanations (roadmapped; Phases 17–18)
**Status:** Phase complete — ready for verification

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-26)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phase 18 — explanation-card-wiring-live-chemist-gate

## v1.5 Roadmap (Phases 17–18)

- **Phase 17 — Sub-token copy core (element table + pure module + tests):** SUBEX-03/04/05/06/08/10. Extend `ELEMENT_NAMES` to the full periodic table in `src/lib/layerInfo.ts`; author the NEW pure `src/lib/subTokenInfo.ts` (`{title, body, reading?} | null`, null for c-layer kinds); unit-test against real `getInchi()` fixtures, pinning the "+/− parity is NOT R/S" caveat. No React touched.
- **Phase 18 — Explanation-card wiring + live chemist gate:** SUBEX-01/02/07/09. Add `subHover` selector + `effSub = pinned ? pinned.sub : subHover` + one precedence branch in `src/components/Explanation.tsx`, between the `keyHoverKind` branch and the `layer` branch. Verify verbatim-passthrough + no-remount; human chemist reviews the live card strings before verify.

**Internal build order (research, HIGH confidence — do not reshuffle):** element table → pure module + tests → card wiring. Chemical-accuracy gate is the load-bearing control.

## Key Decisions (carry-forward)

- **v1.5 invariants (hard):** verbatim-passthrough — `subTokenInfo` consumes ONLY already-offset parsed `SubHover` numeric fields (`el`, `count`, `atoms`, `atom`, `sign`, `canonRange`) + `atomElements`; never reads/re-joins `layer.text`, never emits an InChI fragment as the source string. No-remount — the new tier lives entirely inside `Explanation.tsx` (leaf sibling); ZERO store changes (`subHover`/`pinned.sub` already exist and are written by `LayerText`); never conditionally render `<Editor>` or recreate `StandaloneStructServiceProvider`. Card tier is read-only — never calls `setHover`/`setSubHover`/highlight APIs; the sub-token canvas highlight comes from the separate, pre-existing `subHover → useKetcherHighlights` path and is untouched.
- **v1.5 precedence:** insert the sub-token branch BETWEEN `keyHoverKind` and the `layer` branch (above the layer branch, or the sub copy never shows; below `keyHoverKind`, or it would steal the InChIKey surface). Guard on `subCopy` (not `effSub`) so c-layer kinds → `null` → graceful fall-through to the layer branch.
- **v1.5 chemical correctness (pinned by PITFALLS):** never map +/− to R/S (parity from canonical numbering + geometry, not CIP; note /m + /s); never name a functional group from H-count ("atom N bears n H", "methyl" only as an element-conditioned example); mobile-H `(H,X,Y)` is a shared/tautomeric proton over the set, never "bond between" / "each"; element count is per-fragment for multi-component formulas; `ELEMENT_NAMES` stays case-exact (`Co` ≠ `CO`) — never `.toUpperCase()`. `parseMobileHydrogens` drops the `Hn` count — parse separately only if the card states a count.
- **v1.5 process gate (v1.4 repeat-offense risk):** every test fixture is real `getInchi()` output (no fabricated InChI — 333 green tests once masked a broken feature); the human chemical-accuracy verify gate on the live card strings must NOT be bypassed.
- InChIKey source is `ketcher.getInChIKey()` (typed public method on ketcher-core 3.12.0, same WASM worker) — never hash/derive in JS; verbatim passthrough (offsets-only parser, renderer slices the stored string). Key segments never call `setHover`/`setSubHover` — no canvas highlight by design (v1.3).
- Use `@vitejs/plugin-react` (esbuild), NOT the SWC variant — SWC crashes on Ketcher packages (issue #5565).
- All three Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) pinned to exactly 3.12.0.
- `StandaloneStructServiceProvider` must be created at module level, never inside a component.
- Ketcher `<Editor>` must never be conditionally rendered — WASM re-initializes on remount.
- CSS Modules + CSS custom properties for styling — preserves the oklch token system from design handoff.
- `vite-plugin-static-copy` required to copy WASM/worker assets; `assetsInlineLimit: 0` to prevent base64 inlining.
- Separate `vitest.config.ts` for Vite 8 + Vitest 3 — Plugin type conflict if merged.
- `getInchi(true)` returns concatenated string — split on `AuxInfo=`, not destructuring.
- Stale closures in `editor.subscribe` — read state through `useRef` in handler.

## Deferred Items

Items acknowledged and deferred at v1.3 milestone close on 2026-06-19 (same v1.0-era quick-task registry stubs carried from the v1.2 close — files cleaned up, registry entries remain; functionally completed in v1.0/v1.1):

| Category | Item | Status |
|----------|------|--------|
| quick_task | 260610-cho-fix-preset-highlight-guard-timing-and-st | missing |
| quick_task | 260610-csa-decouple-layertext-rawtext-from-position | missing |
| quick_task | 260610-d2r-fix-mixed-n-star-semicolon-hover-highlig | missing |
| quick_task | 260610-eci-fix-canonical-to-pool-id-remap-for-multi | missing |
| quick_task | 260610-eoi-fix-readingfor-multi-fragment-text-and-t | missing |
| quick_task | 260610-fn1-scope-formula-layer-h-hover-to-the-hover | missing |
| quick_task | 260610-ist-unify-h-hover-formula-h-count-and-h-laye | missing |
| quick_task | 260610-jyj-replace-preset-cid-with-hardcoded-smiles | missing |

## Milestone Archive

- v1.4: see `.planning/MILESTONES.md` (Phases 14–15, shipped 2026-06-22, tag `v1.4`); roadmap `.planning/milestones/v1.4-ROADMAP.md`
- v1.3: see `.planning/MILESTONES.md` (Phases 11–13, shipped 2026-06-19, tag `v1.3`); roadmap `.planning/milestones/v1.3-ROADMAP.md`, requirements `.planning/milestones/v1.3-REQUIREMENTS.md`
- v1.2: see `.planning/MILESTONES.md` (Phases 9–10, shipped 2026-06-18, tag `v1.2`); roadmap `.planning/milestones/v1.2-ROADMAP.md`
- v1.1 (patch): `.planning/MILESTONES.md` — 70 commits since v1.0, tag `v1.1`
- v1.0: `.planning/milestones/v1.0-ROADMAP.md` / `v1.0-REQUIREMENTS.md`, tag `v1.0`

## Roadmap Evolution

- Phase 16 added & completed (2/2 plans, 13/13 UAT): Pin-to-freeze highlights and guided Help tour (2026-06-25).
- v1.5 roadmapped 2026-06-26: Phases 17–18, SUBEX-01..10 mapped 100% (no orphans). Tight 2-phase split — pure value core (17) vs card wiring + live gate (18) — per HIGH-confidence research that this is a copy + one-render-branch milestone with a strict element-table → pure-module → wiring order.

## Blockers

None

## Current Position

Phase: 18 (explanation-card-wiring-live-chemist-gate) — EXECUTING
Plan: 1 of 1
Status: Phase complete — ready for verification
Last activity: 2026-06-29 — Phase 18 execution started

## Operator Next Steps

- Plan Phase 17 with /gsd-plan-phase 17 (or /gsd-discuss-phase 17 first). Phase 17 is the pure copy core; Phase 18 (card wiring) depends on it and carries the live chemist verify gate.

## Session Continuity

Last session: 2026-06-29T06:11:23.179Z
Stopped at: Completed 18-01-PLAN.md
Resume file: None

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 17 P01 | 2min | 2 tasks | 2 files |
| Phase 17 P02 | 30 min | 2 tasks | 2 files |
| Phase 18 P01 | ~4 min | 3 tasks | 2 files |

## Decisions

- [Phase 17]: subTokenInfo: bare 'atom N' phrasing (D-08-safest); atomElements param retained but unused for Phase 18
- [Phase ?]: Phase 18: sub-token card branch is read-only, guarded on subCopy (c-layer falls through); effSub/subAccent locals, no new store field.
