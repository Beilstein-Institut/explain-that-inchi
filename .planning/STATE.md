---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Reset control & c-layer hover precision
status: executing
stopped_at: v1.4 roadmap created — Phases 14 (Reset) and 15 (C-layer precision)
last_updated: "2026-06-19T11:53:42.080Z"
last_activity: 2026-06-19 -- Phase 14 execution started
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 1
  completed_plans: 0
  percent: 0
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.4 — Reset control & c-layer hover precision (roadmap drafted; Phases 14–15)
**Status:** Executing Phase 14

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-19)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phase 14 — reset-control

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

## Key Decisions (carry-forward)

- **v1.4 invariants:** Reset and c-layer work must honor the established no-remount invariant — never conditionally render `<Editor>`, never recreate `StandaloneStructServiceProvider`. Reset = Ketcher built-in clear + Zustand store reset (leaf-sibling control, like the feedback dialog). C-layer precision = offset/highlight-logic changes only in `buildHighlightSpecs`/`buildSubHoverSpecs` → `useKetcherHighlights`; never re-render or re-join the verbatim InChI string; fragment correctness rides on the AuxInfo canonical→Ketcher pool-ID map.
- InChIKey source is `ketcher.getInChIKey()` (typed public method on ketcher-core 3.12.0, same WASM worker) — never hash/derive in JS; verbatim passthrough (offsets-only parser, renderer slices the stored string). Key segments never call `setHover`/`setSubHover` — no canvas highlight by design (v1.3)
- Use `@vitejs/plugin-react` (esbuild), NOT the SWC variant — SWC crashes on Ketcher packages (issue #5565)
- All three Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) pinned to exactly 3.12.0
- `StandaloneStructServiceProvider` must be created at module level, never inside a component
- Ketcher `<Editor>` must never be conditionally rendered — WASM re-initializes on remount
- CSS Modules + CSS custom properties for styling — preserves the oklch token system from design handoff
- `vite-plugin-static-copy` required to copy WASM/worker assets; `assetsInlineLimit: 0` to prevent base64 inlining
- Separate `vitest.config.ts` for Vite 8 + Vitest 3 — Plugin type conflict if merged
- `getInchi(true)` returns concatenated string — split on `AuxInfo=`, not destructuring
- Stale closures in `editor.subscribe` — read state through `useRef` in handler

## Milestone Archive

- v1.3: see `.planning/MILESTONES.md` (Phases 11–13, shipped 2026-06-19, tag `v1.3`); roadmap `.planning/milestones/v1.3-ROADMAP.md`, requirements `.planning/milestones/v1.3-REQUIREMENTS.md`
- v1.2: see `.planning/MILESTONES.md` (Phases 9–10, shipped 2026-06-18, tag `v1.2`); roadmap `.planning/milestones/v1.2-ROADMAP.md`
- v1.1 (patch): `.planning/MILESTONES.md` — 70 commits since v1.0, tag `v1.1`
- v1.0: `.planning/milestones/v1.0-ROADMAP.md` / `v1.0-REQUIREMENTS.md`, tag `v1.0`

## Blockers

None

## Current Position

Phase: 14 (reset-control) — EXECUTING
Plan: 1 of 1
Status: Executing Phase 14
Last activity: 2026-06-19 -- Phase 14 execution started

## Operator Next Steps

- Plan the first phase with /gsd-plan-phase 14

## Session Continuity

Last session: 2026-06-19T06:53:59.137Z
Stopped at: v1.4 roadmap created — Phases 14 (Reset) and 15 (C-layer precision)
Resume file: .planning/ROADMAP.md
