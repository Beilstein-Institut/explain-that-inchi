---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Connection-layer cards
current_phase: 19
status: milestone_shipped
stopped_at: Shipped v1.5 + v1.6 (Phases 17–19 tagged)
last_updated: "2026-08-10T13:12:47.082Z"
last_activity: 2026-08-11
last_activity_desc: "Completed quick task 260811-mxg: LIMITATIONS.md + in-app Limitations dialog"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 11
  completed_plans: 11
current_phase_name: null
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.6 — Connection-layer cards (SHIPPED 2026-06-30, tag `v1.6`). v1.5 also shipped (tag `v1.5`).
**Status:** Milestone shipped — no active milestone; run `/gsd-new-milestone` to scope the next.

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Planning next milestone (sub-token + connection-layer cards complete across all layers)

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

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260630-mpc | Docker support (multi-stage Dockerfile + nginx COOP/COEP + docker-compose, zero-config deploy) | 2026-06-30 | f9dd176 | [260630-mpc-add-docker-support-multi-stage-dockerfil](./quick/260630-mpc-add-docker-support-multi-stage-dockerfil/) |
| 260713-mob | Fix mobile layout — full-width canvas at ≤900px, lighter .app padding, wrapping section-label actions, and example molecules as a chip strip below the editor (CSS-only) | 2026-07-13 | bc8dfe7 | — |
| 3 | Drop §3(3) GitHub Pages Service Worker paragraph from legal content | 2026-08-10 | 872b1ff | — |
| 4 | Point canonical/og/docs URLs at cheminfo.beilstein.org | 2026-08-10 | 6fa9b03 | — |
| 5 | nginx gzip_static + immutable cache headers | 2026-08-10 | 67f065d | — |
| 6 | Remove footer Licenses link; add Beilstein logo to legal pages | 2026-08-10 | 4a53e0c | — |
| 7 | Consistent title rule across legal pages | 2026-08-10 | fc79994 | — |
| 8 | Apply DPO review to privacy policy | 2026-08-10 | 9415e96 | — |
| 260811-b69 | Client-side data removal on leave: widened on-leave wipe (localStorage/sessionStorage/IndexedDB/CacheStorage/SW, `clearEditorStorage.ts` → `leaveWipe.ts`), nginx `__leave` Clear-Site-Data endpoint fired unconditionally on `pagehide`, privacy § 3 (3)/(4). Shipped first with an opt-in footer toggle; removed in 7866ad1 — the purge is not switchable | 2026-08-11 | 7866ad1 | [260811-b69-client-side-data-removal-on-leave-harden](./quick/260811-b69-client-side-data-removal-on-leave-harden/) |
| 260811-f1u | Legal-content gaps: declare vendored coi-serviceworker v0.1.7 (MIT) in `TERMS_HTML` + `THIRD-PARTY-NOTICES.md`; privacy § 3 (4) now states `Clear-Site-Data` is origin-scoped (covers all of cheminfo.beilstein.org, not just this app) | 2026-08-11 | ed89385 | [260811-f1u-add-coi-serviceworker-to-third-party-not](./quick/260811-f1u-add-coi-serviceworker-to-third-party-not/) |
| 260811-jar | Persistent site footer: `SiteFooter` moved from `App` into `Root` so it renders on the legal hash routes too; `LegalPage` masthead dropped (would be the same logo twice); `.site-footer` given its own max-width/inset reproducing the old `.app`-nested geometry at both breakpoints | 2026-08-11 | 5d9639d | [260811-jar-make-site-footer-persistent-across-all-p](./quick/260811-jar-make-site-footer-persistent-across-all-p/) |
| 260811-kvl | Layer-coverage presets: fumaric/maleic acid (`b`, differing in one character), choline (`q`), acetate (`p`), chloroform-d (`i`), sodium acetate (`q`+`p`, first multi-component preset), prostaglandin E₂ (`b`/`t`/`m`/`s`) — picker now reaches all 11 layer types, was 7. InChI measured through indigo WASM; live Ketcher round-trip NOT yet driven (see SUMMARY) | 2026-08-11 | 8633a20 | [260811-kvl-add-seven-presets-covering-the-q-p-b-i-l](./quick/260811-kvl-add-seven-presets-covering-the-q-p-b-i-l/) |
| 260811-mxg | Limitations: new `LIMITATIONS.md` (grouped by the layer imposing each limit — InChI coverage, standard/non-standard split, Ketcher, auxMap, InChIKey hash, browser-only) + in-app Limitations dialog with the 5 strongest entries (`limitationsContent.ts`, source-tagged) + trigger button left of Send feedback. Dialog CSS composes FeedbackDialog's surface | 2026-08-11 | d49ef9e | [260811-mxg-limitations-md-plus-an-in-app-limitation](./quick/260811-mxg-limitations-md-plus-an-in-app-limitation/) |
| 260811-b69 | Harden client-side data removal on leave — full localStorage/sessionStorage wipe, guarded IndexedDB/Cache sweeps, COI-gated SW unregister, opt-in Clear-Site-Data leave endpoint + footer toggle, honest privacy §3(3)(4) | 2026-08-11 | e097453 | [260811-b69-client-side-data-removal-on-leave-harden](./quick/260811-b69-client-side-data-removal-on-leave-harden/) |

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

- Phase 19 P02: awaiting live chemist accuracy gate (checkpoint:human-verify, blocking). Wiring committed 21b793b; tsc+440 tests green; highlight unchanged. Resume via /gsd-verify-work or 'approved'.

## Current Position

Phase: 19
Plan: Not started
Status: Ready to execute
Last activity: 2026-08-11 — Completed quick task 260811-mxg: LIMITATIONS.md + Limitations dialog

## Operator Next Steps

- Plan Phase 17 with /gsd-plan-phase 17 (or /gsd-discuss-phase 17 first). Phase 17 is the pure copy core; Phase 18 (card wiring) depends on it and carries the live chemist verify gate.

## Session Continuity

Last session: 2026-08-11
Stopped at: Quick task 260811-b69 complete — on-leave wipe widened, opt-in Clear-Site-Data leave endpoint live-verified (204 + all three headers), privacy §3 rewritten. 546 tests green. NOT pushed; both remotes still awaiting the operator.

Stopped at: Session resumed — no active milestone. Work landed outside GSD since 2026-07-13: Jmol CPK element colors (map + hex passthrough + white-atom ring + dead --c-el-* cleanup), in-app Imprint/Privacy/Terms pages, refined connection/hydrogen layer explanations (PR #3). HEAD f413a96, both remotes synced, tree clean. Stale HANDOFF.json + .continue-here.md consumed and deleted. Awaiting next milestone scope.
Stopped at: Session resumed 2026-08-11 — HANDOFF.json read; no active milestone, no incomplete plans. Blocking item: rebuild + redeploy the container, then curl `__leave` through the proxy.
Resume file: .planning/.continue-here.md (from the 260811-b69 session)

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 17 P01 | 2min | 2 tasks | 2 files |
| Phase 17 P02 | 30 min | 2 tasks | 2 files |
| Phase 18 P01 | ~4 min | 3 tasks | 2 files |
| Phase 18 P02 | 27m | 3 tasks | 6 files |
| Phase 19 P01 | ~3min | 3 tasks | 5 files |

## Decisions

- [Phase 17]: subTokenInfo: bare 'atom N' phrasing (D-08-safest); atomElements param retained but unused for Phase 18
- [Phase ?]: Phase 18: sub-token card branch is read-only, guarded on subCopy (c-layer falls through); effSub/subAccent locals, no new store field.
- [Phase ?]: [Phase 19]: c-layer cards — branchPoint explicit SubHover field (research A1); atom caveat drops 'hydrogens' word to pass CONN-04 element-word guard; de-offset display-only (GAP-2)
