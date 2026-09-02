---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: unmilestoned
current_phase: 19
status: milestone_shipped
stopped_at: Session paused 2026-08-26 — 8 commits on dev, HEAD 6914965, both remotes synced, tree clean, 712 tests green. Nothing live; browser verification of the new wasm load path is the blocking human action
last_updated: "2026-08-31T07:28:25.981Z"
last_activity: 2026-09-02
last_activity_desc: Quick task 260902-gxx — b-layer sub-token modelled as a double bond; setInchiData clears hover state. HEAD 4c53ba7
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 11
  completed_plans: 11
  percent: 100
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
| 260813-exd | Layer chips on the example molecules + picker cull + Limitations rewrite: `layer?: LayerType` on `MoleculePreset`, one chip per preset tinted with the layer swatch, each of the 11 layer types claimed exactly once and the chipped presets moved to the head of the list in legend order (version→formula→c→h→q→p→b→t→m→s→i). Presets cut 33→20 over five rounds (none chipped, so coverage held). Limitations dialog trimmed to 4 entries, plainer copy, `LIMITATIONS.md` now a real link. `LAYER_KEY` extracted to `layerInfo.ts`. Render test added for the chips. 596 tests. NOTE: browser mount failure (createRoot twice / RulerArea) reported during this task is STILL UNDIAGNOSED; chips were reverted (4b5f9dc) and restored (338d797) for a bisect that never ran | 2026-08-13 | 6461386 | [260813-exd-layer-chips-on-example-molecules-each-of](./quick/260813-exd-layer-chips-on-example-molecules-each-of/) |
| 260813-aud | `/impeccable audit` + fixes: real `<label htmlFor>` for the feedback textarea (was a styled `<p>`, announced unlabelled); touch targets — legend rows to 28px min-height, preset and action pills to 44px on ≤900px; `.canvas-wrap` dot grid derived from `--line` (last literal colour outside `:root`); HelpTour callout centring reads one `effectiveWidth()`. Detector 0 findings. Deferred: the 7.3MB gzip first-load split | 2026-08-13 | 26acdb2 | — |
| 260813-tour | Help tour repairs, from two user reports. (1) The description card rendered off-screen: `CALLOUT_HEIGHT = 180` was a guess, the card is ~214px, and `calloutPosition` anchored by `bottom` so the real height decided the top edge — replayed at -26px off the top and 826px in an 800px viewport. Now measured after paint and always anchored top/left. (2) No tour step for the explanation card, and no `data-tour-id` on it at all — added to all five render branches; step 7 of 9, between InChIKey and legend. `STEPS` exported so tests derive the count | 2026-08-13 | 17b0f35 | — |
| 260811-b69 | Harden client-side data removal on leave — full localStorage/sessionStorage wipe, guarded IndexedDB/Cache sweeps, COI-gated SW unregister, opt-in Clear-Site-Data leave endpoint + footer toggle, honest privacy §3(3)(4) | 2026-08-11 | e097453 | [260811-b69-client-side-data-removal-on-leave-harden](./quick/260811-b69-client-side-data-removal-on-leave-harden/) |
| 18 | Typeset: real Plex Mono italic for mobile-H; drop italic on not-present note | 2026-08-31 | 6d212f9 | — |
| 260902-gxx | b-layer sub-token modelled as a double bond (new `bondStereo` SubHover kind, `BLayerText`, canvas spec lights both ends + bond, canonical-parity card; `?` bonds neutral) + `setInchiData` clears `hoverIdx`/`subHover` (REVIEW W-01). 726 tests | 2026-09-02 | 09dc51a | [260902-gxx-fix-the-b-layer-sub-token-model-and-rese](./quick/260902-gxx-fix-the-b-layer-sub-token-model-and-rese/) |
| 260902-hrp | Lint to 0 warnings; `.nvmrc`/`engines` pin Node 22 and `npm test` passes `--no-experimental-webstorage` (suite green on Node 25 without env fiddling); `npm audit fix` → 0 vulnerabilities (browserslist, nanoid, dev-only) | 2026-09-02 | 73359c3 | [260902-hrp-pin-node-22-clear-lint-warnings-audit-fi](./quick/260902-hrp-pin-node-22-clear-lint-warnings-audit-fi/) |
| 260902-hzh | Legend inert while the canvas is empty: hover/focus/tap on a legend row no longer swaps the "draw a molecule" card for static layer info when there are no layers (user report). 728 tests | 2026-09-02 | 4c53ba7 | [260902-hzh-keep-the-legend-inert-while-the-canvas-i](./quick/260902-hzh-keep-the-legend-inert-while-the-canvas-i/) |

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

- **Undiagnosed browser mount failure.** Reported 2026-08-13: `createRoot()` called
  twice on `#root` (main.tsx:31), `removeChild`/`insertBefore` NotFoundError at
  container level, ketcher's `initKetcher` then finding no container, `RulerArea`
  throwing `SVGLength: Could not resolve relative length`. Two hypotheses tested
  and **falsified** — stale HMR session (survived a fresh navigation) and
  coi-serviceworker (the dev server does send COOP/COEP, so it never registers).
  The chips were reverted (4b5f9dc) and restored (338d797) for a bisect that was
  never run. Pre-chip tree for bisecting is `4b5f9dc`. Blocks the first-load split
  honestly: that change touches the same mount path.

- Resolved 2026-09-02: the repository is public (`gh repo view` → PUBLIC), so the
  in-app Limitations link and Send feedback button no longer 404.
- Local dev environment: Node v25 shadows happy-dom's `localStorage`. Handled in
  260902-hrp: `.nvmrc`/`engines` say 22 and `npm test` passes the flag; a bare
  `npx vitest run` on Node 25 still needs `NODE_OPTIONS=--no-experimental-webstorage`.
- Deployment drift: live assets are dated 2026-08-13; the 8 commits of 2026-08-26,
  the 2026-08-31 italic fix, and quick tasks 260902-gxx/-hrp/-hzh are NOT live.

## Current Position

Phase: 19
Plan: Not started
Status: Ready to execute
Last activity: 2026-09-02 — Quick tasks 260902-gxx (b-layer double-bond model), -hrp (Node pin/lint/audit), -hzh (legend inert on empty canvas). HEAD 4c53ba7

## Operator Next Steps

1. ~~Make the repository public~~ — DONE (verified PUBLIC via `gh repo view` 2026-09-02);
   the Limitations and Send-feedback links now resolve.

2. **Reload and confirm the Help tour**: the description card should appear, and
   step 7 of 9 should stop on the explanation card. Both fixes are unverified in a
   browser — there is none in this environment.

3. **Diagnose the mount failure** (see Blockers) before anyone attempts the
   first-load split.

4. **Rebuild and redeploy the container.** Carried since 2026-08-11 and still
   true: the published privacy policy describes an on-leave purge production does
   not perform, and none of today's work is live either.

5. `/gsd-new-milestone` if the candidates in ROADMAP.md's Post-v1.6 section are
   worth scoping as v1.7.

## Session Continuity

Last session: 2026-08-11
Stopped at: Quick task 260811-b69 complete — on-leave wipe widened, opt-in Clear-Site-Data leave endpoint live-verified (204 + all three headers), privacy §3 rewritten. 546 tests green. NOT pushed; both remotes still awaiting the operator.

Stopped at: Session resumed — no active milestone. Work landed outside GSD since 2026-07-13: Jmol CPK element colors (map + hex passthrough + white-atom ring + dead --c-el-* cleanup), in-app Imprint/Privacy/Terms pages, refined connection/hydrogen layer explanations (PR #3). HEAD f413a96, both remotes synced, tree clean. Stale HANDOFF.json + .continue-here.md consumed and deleted. Awaiting next milestone scope.
Stopped at: Session resumed 2026-08-11 — HANDOFF.json read; no active milestone, no incomplete plans. Blocking item: rebuild + redeploy the container, then curl `__leave` through the proxy.
Stopped at: Session 2026-08-26 — no active milestone. Conversational Q&A plus /impeccable audit -> optimize -> harden -> adapt -> polish, and one direct design request. Eight commits on dev (fe11d0d..6914965), pushed to BOTH remotes, tree clean, 712 tests green, tsc clean, detector 0 findings. master still at 2b7720d. Open correctness defect diagnosed but not fixed: the b-layer is modelled as if it were the t-layer (see .continue-here.md).
Resume file: .planning/.continue-here.md (2026-08-26)

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
