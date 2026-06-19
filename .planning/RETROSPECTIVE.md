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

## Milestone: v1.3 — InChIKey display & explanation

**Shipped:** 2026-06-19
**Phases:** 3 (11–13) | **Plans:** 6 | **Commits since v1.2:** 63

### What Was Built

A live InChIKey rendered below the InChI strip: four color-coded zones (14-char skeleton hash, 8-char remaining-layers hash, standard-flag + version char, protonation char), per-segment hover explanation cards, and a verbatim copy-to-clipboard button — all client-side via `ketcher.getInChIKey()` with zero new deps. Phase 11 wired a single concurrent pipeline (`Promise.allSettled([getInchi(true), getInChIKey()])` in the existing debounce, extended `generationRef`/empty guards, pure offsets-only `parseInchiKey.ts`). Phase 12 rendered the `InchiKeySection` leaf sibling and extended the shared Explanation panel with key-zone cards. Phase 13 authored the `inchiKeyInfo.ts` prose (one-way-hash / collision / standard-flag teaching) pinned by an SC-1 offset test.

### What Worked

- **The passthrough invariant paid off twice.** The "offsets-only parser, renderer slices the verbatim string" rule — carried as a project memory from the InChI `.`-drop bug — was applied from the first plan, so the displayed/copied key was never at risk of reconstruction drift.
- **Reusing the established seams.** No new architecture: rode the existing 150ms debounce, the existing `generationRef` stale guard, the leaf-sibling render pattern (D-13), and the StrictMode `mountedRef` copy pattern (PLSH-04). Each phase was small and low-risk because the patterns were already proven.
- **"No highlight" as a verified invariant.** Confirming by grep that `keyHoverKind` never reaches `useKetcherHighlights` turned the central teaching point (a one-way hash can't point back to atoms) into a code-level guarantee, not just prose.
- **Single-source WASM.** `ketcher.getInChIKey()` existing as a typed public method meant the milestone's one open research question was resolved at zero dependency cost.

### What Was Inefficient

- **Requirement checkboxes (again).** INKEY-03/04/05 stayed `[ ]` in REQUIREMENTS.md and the traceability table through close despite Phase 12 passing code-review + UAT — the same sync-debt lesson from v1.0 and v1.2, now three milestones running. The flip should happen at phase verification, not milestone archival.
- **Stale STATE.md operator note.** STATE.md's "Operator Next Steps" still described a Phase 12 BLOCKER and an interrupted review-fix long after the fixes landed and UAT passed, while the frontmatter said `milestone_complete` — an internal contradiction that cost verification time at close to disprove.
- **Phase 12 code review caught 3 real issues post-merge** (WR-01/02/03, incl. raw-HTML-vs-escaped-text and full-structure validation) — again surfaced by the review gate, not the executor self-check.

### Patterns Established

- Concurrent dual-WASM fetch via `Promise.allSettled` in one debounce tick, with asymmetric rejection handling (a failed key blanks only the key, not the InChI).
- Offsets-only parser + verbatim-slice renderer as the standard shape for any "segment a library string" feature.
- A hover-state store field deliberately *not* wired to the highlight hook, when the absence of highlighting is itself the intended behavior.
- Static prose modules (`inchiKeyInfo.ts` parallel to `layerInfo.ts`) extracted for unit-testability and pinned by a label/offset test.

### Key Lessons

1. Flip requirement checkboxes at phase verification — three milestones in a row have paid the reconciliation tax at close.
2. Keep STATE.md's narrative sections (Operator Next Steps, Current Position) in sync with its frontmatter; a stale operator note that contradicts `status` forces re-verification of already-done work.
3. When a feature segments a library-produced string, never reconstruct — parse to offsets and slice the stored verbatim value (now a cross-feature invariant: InChI and InChIKey both).
4. The post-merge code-review gate continues to earn its keep (3 real Phase 12 fixes); keep it required.
