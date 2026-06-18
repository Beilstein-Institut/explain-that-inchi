# Retrospective: Explain that InChI

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-06-05
**Phases:** 8 | **Plans:** 25 | **Commits:** 186

### What Was Built

1. Vite + React 18 + TypeScript + Ketcher WASM scaffold with design tokens, deployed to GitHub Pages via GitHub Actions CD
2. Live InChI pipeline: debounced generation, layer parsing, AuxInfo atom mapping (canonical→Ketcher index)
3. Color-coded interactive InChI strip with explanation cards, per-layer legend, and idle/hover state management
4. Full highlight integration: layer hover + sub-token hover drives Ketcher canvas atom/bond highlights (135+ tests, TDD throughout)
5. Multi-fragment molecule support with correct per-fragment canonical offset fix in parseAuxMapping/enrichLayers
6. Per-group h-layer sub-tokens with SVG hydrogen badges for implicit H, explicit H atom+bond highlights, mobile-H group highlights

### What Worked

- **Design handoff as executable spec**: The parsers and layer content in `molecules.js` and `layers-info.js` were final and transferred directly to TypeScript with minimal rework — porting verbatim saved significant design-cycle time.
- **TDD Wave 0 pattern**: Starting each phase with RED test stubs that defined the interface contract made GREEN implementation phases focused and verifiable. 135+ tests give real confidence.
- **Separate vitest.config.ts**: Immediately catching the Plugin type conflict between Vite 8 and Vitest 3's bundled Vite 6 prevented hours of mysterious build failures.
- **Module-level StandaloneStructServiceProvider**: Establishing this rule early (Phase 1) prevented WASM re-init bugs that would have been hard to diagnose later.
- **Zustand flat store**: Simple, no middleware, easy to evolve across 8 phases. Right choice for this scope.

### What Was Inefficient

- **REQUIREMENTS.md never updated**: 5 requirements (INCHI-05–08, PLSH-04) added to ROADMAP during development were never backfilled. Required manual reconciliation at milestone close.
- **Browser verification paused at context exhaustion**: Phase 8 badge positioning and the final b-layer commit were not browser-verified before the milestone closed. Leaves two unconfirmed changes.
- **Multi-fragment bug (Phase 7)**: The fragment offset bug in parseAuxMapping required a deeper fix than anticipated — enrichLayers also needed per-fragment parsing. Unit tests on real InChI strings would have caught this earlier.

### Patterns Established

- Wave 0 TDD: always open a phase with failing test stubs defining the interface contract
- Module-level WASM provider: never inside a component
- `getInchi(true)` → split on `AuxInfo=` → parse AuxInfo block for canonical→Ketcher mapping
- `useRef` in `editor.subscribe` handler to avoid stale closures
- `vite-plugin-static-copy` v4 + `assetsInlineLimit: 0` for WASM serving

### Key Lessons

1. Pin all Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) to the same exact version — any skew causes subtle type/runtime mismatches.
2. For multi-fragment InChI, canonical indices restart at 1 per fragment — the cumulative offset must be tracked in `parseAuxMapping` and propagated through `enrichLayers`.
3. Separate `vitest.config.ts` is non-negotiable with Vite 8 + Vitest 3.
4. Keep REQUIREMENTS.md in sync with ROADMAP as requirements are added mid-milestone — otherwise milestone close requires manual archaeology.
5. Browser-verify after every badge/DOM-injection feature before closing context.

## Milestone: v1.2 — In-app feedback via prefilled GitHub issues

**Shipped:** 2026-06-18
**Phases:** 2 (9–10) | **Plans:** 6 | **Commits since v1.1:** 56

### What Was Built

A "Send feedback" control that opens a prefilled GitHub `issues/new` page in a new tab, auto-including the current InChI, molecule (SMILES + preset name), and environment (user-agent + app version/commit) — purely client-side, zero new npm dependencies. Phase 9 built the pure DOM-free `buildFeedbackUrl()` (single-pass `URLSearchParams` encoding, ~7.5 KB `TextEncoder` byte-budget guard, deterministic SMILES-drop→InChI-trim truncation, `@`-neutralization, category title-prefix) plus build-time version injection. Phase 10 built the `FeedbackDialog` modal, the entry-point pill, and the submit-time context collector wired into App.

### What Worked

- **Pure-builder-first seam.** Isolating all the hard logic (encoding, byte budget, truncation) into a DOM-free `buildFeedbackUrl()` built and unit-tested (38 tests) before any UI meant the dialog layer was thin and low-risk.
- **Leaf-sibling dialog.** Mounting the native `<dialog>` as a sibling that never wraps/remounts KetcherPanel kept the WASM canvas stable — a known fragility from v1.0.
- **Gap-closure loop.** The UAT-3 SMILES-preview gap was caught, planned (`gap_closure: true`), executed via `--gaps-only`, and verified — the loop worked end to end.

### What Was Inefficient

- **Requirement checkboxes not flipped at phase close.** FEED-04/05/07/09 (Phase 9) stayed `[ ]` in REQUIREMENTS.md through milestone close and had to be reconciled during archival — same lesson as v1.0 (keep REQUIREMENTS.md in sync).
- **SMILES preview deferred too far.** The original design deferred SMILES to submit-time only; the preview showing "(none)" surfaced as a UAT gap that needed a follow-up plan. Showing async-derived context in a preview should have been scoped into the dialog plan up front.
- **Code review found a real bug post-merge.** The stale-SMILES flash (state not flushed before `showModal`) slipped through the executor's self-check and was only caught by the post-execution code-review gate — reinforcing that the gate earns its keep.

### Patterns Established

- Build-time version via a single Vite `define` (`__APP_VERSION__`/`__APP_COMMIT__`), consumed as plain globals.
- Feedback is ephemeral UI state — no Zustand fields; dialog is a leaf sibling controlled via `dialogRef`.
- Open external links via a real `<a target="_blank" rel="noopener">` click on the user gesture, with no `await` before opening (popup-blocker).
- `flushSync` async-derived state before a synchronous `showModal()` so the dialog renders correct content on open.

### Key Lessons

1. For URL-budget-constrained features, measure bytes with `TextEncoder` against the worst-case (multi-fragment) molecule, not short presets.
2. Any context shown in a preview must be sourced the same way it is at submit time — if it's async (`getSmiles()`), fetch-and-flush it on open rather than leaving the preview to guess.
3. Category-as-title-prefix beats labels for GitHub issues opened by non-collaborators (labels silently drop).
4. The post-merge code-review gate catches self-check blind spots (the stale-SMILES flash) — keep it required even for small gap-closure diffs.
