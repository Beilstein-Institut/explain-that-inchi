# Milestones: Explain that InChI

## v1.4 Reset control & c-layer hover precision (Shipped: 2026-06-22)

**Phases completed:** 2 phases, 3 plans, 7 tasks

**Delivered:** A one-click Reset control and pinpoint connectivity-layer hovering — every c-layer atom number, hyphen, and parenthesis maps to a precise, minimal canvas highlight.

**Key accomplishments:**

- **Reset control (RESET-01..05):** "Reset" pill left of "Send feedback" clears the Ketcher canvas and returns all app state (InChI, InChIKey, explanation, mapping, highlights, active preset) to idle — without remounting the canvas or re-initializing WASM (leaf-sibling, no-remount invariant). Safe no-op on an already-empty canvas. Live-verified.
- **C-layer atom hover (CLYR-01):** highlights only that single canonical atom — incident bonds removed.
- **C-layer hyphen hover (CLYR-02):** highlights only the single bond joining the two flanking atoms.
- **C-layer parenthesis hover (CLYR-03):** highlights the bonds incident to the branch-point atom (chain-in + branch + chain-out, typically 3); open/close symmetric. Corrected after live review from an initial whole-substituent reading.
- **Multi-fragment & N* (CLYR-04/05):** highlights stay within the correct `;`-fragment; a single token in `N*` notation lights up every duplicate instance simultaneously.
- **Domain-correct foundation:** c-layer bonds derived by atom adjacency (the real InChI encoding), reusing the proven `parseConnectionBonds`; tests rebuilt on real InChI fixtures (alanine, ciprofloxacin) after fabricated fixtures masked a shipped bug.

**Known deferred items at close:** 8 v1.0-era quick-task registry stubs (functionally completed in v1.0/v1.1; see STATE.md Deferred Items).

---

## v1.3 InChIKey display & explanation (Shipped: 2026-06-19)

**Phases completed:** 3 phases (11–13), 6 plans
**Timeline:** 2026-06-18 → 2026-06-19 · 63 commits since `v1.2` (15 src files, +865/−126)
**Tests:** 301 passing · `tsc -b` clean · production build clean

**Delivered:** The molecule's InChIKey now renders live below the InChI strip — its four zones (14-char skeleton hash, 8-char remaining-layers hash, standard-flag + version char, protonation char) color-coded, hoverable with per-segment explanation cards, and copy-to-clipboard — purely client-side via `ketcher.getInChIKey()` with zero new dependencies. The teaching twist: unlike InChI layers, key segments deliberately do **not** highlight canvas atoms — the absence of highlighting is the lesson that a one-way hash cannot point back to structure.

**Key accomplishments:**

- **Single concurrent pipeline (Phase 11):** `Promise.allSettled([getInchi(true), getInChIKey()])` fetches both WASM results in the same 150ms debounced `handleChange` tick; the existing `generationRef` stale-result guard and empty-canvas guard extended to cover the key atomically, with asymmetric rejection handling (a failed key blanks only the key). No second subscription, timer, or generation counter.
- **Verbatim passthrough invariant:** pure `parseInchiKey.ts` returns offset ranges (`{kind,start,end}`) only — never `.slice()` in the parser body; the renderer slices the stored verbatim string. Displayed key === copied key === raw `getInChIKey()` output (direct application of the InChI `.`-drop passthrough lesson).
- **Leaf-sibling render (Phase 12):** `InchiKeySection` mounts after `InchiSection` so the Ketcher canvas never remounts; color-coded segments by slicing the verbatim string, dimmed hyphens, 27-char format gate, StrictMode-safe `mountedRef` copy button (PLSH-04 parity). Key hover uses a store field that never reaches `useKetcherHighlights` (verified by grep) — no canvas highlighting by construction.
- **Explanation cards (Phase 12 + 13):** `inchiKeyInfo.ts` `KEY_ZONE_COPY` prose (parallel to `layerInfo.ts`) drives four per-zone cards via D-04a precedence (`keyHoverKind` → `hoverIdx` → idle); content covers block structure, purpose, one-way-hash / not-reversible / not-atom-mapped, collision caveat, same-connectivity→same-first-block, and standard (`S`) vs non-standard (`N`) flag + version (`A`). SC-1 unit test pins zone labels and segment offsets.
- **Verification:** Phase 12 code review (3 WR fixes landed) + UAT 6/6, 0 issues; Phase 13 UAT 4 passed, 1 issue fixed. 12/12 INKEY requirements satisfied.
- Known deferred items at close: 8 (same completed v1.0-era quick-task registry stubs deferred at v1.2 close; see STATE.md Deferred Items). Deferred to v2: INKEY-F1 (web/PubChem search link), INKEY-F2 (charged-species preset), INKEY-F3 (hash-build deep dive).

---

## v1.2 In-app feedback via prefilled GitHub issues (Shipped: 2026-06-18)

**Phases completed:** 2 phases, 6 plans

**Delivered:** Any visitor can send feedback through a "Send feedback" control that opens a prefilled GitHub `issues/new` page in a new tab — auto-including the current InChI, molecule (SMILES + preset name), and environment (user-agent + app version) — purely client-side, with zero new npm dependencies.

**Key accomplishments:**

- Build-time version/commit injection via a single Vite `define` (`__APP_VERSION__` / `__APP_COMMIT__`), surfaced in the feedback context.
- Pure, DOM-free `buildFeedbackUrl()`: single-pass `URLSearchParams` encoding, `TextEncoder` ~7.5 KB byte-budget guard, deterministic SMILES-drop → InChI-trim truncation, category title-prefix + redundant `labels=`, `@`-neutralization — 38 requirement-grouped vitest tests.
- `FeedbackDialog` component: native `<dialog>` modal with category selector, message field, live context preview, submit flow, and clipboard fallback on truncation (9 tests).
- App wiring: a "Send feedback" pill on the section-label row mounting the dialog as a leaf sibling (Ketcher canvas/store/InChI never remount), with `handleFeedbackSubmit` assembling live `FeedbackContext` from Ketcher WASM, the Zustand store, and `navigator` at submit time.
- Context-preview SMILES gap closed (Phase 10 gap-closure): preview now shows the molecule's SMILES on dialog open via `getSmiles()` + `flushSync`, with no stale-value flash on reopen.
- Known deferred items at close: 8 (completed v1.0-era quick tasks; see STATE.md Deferred Items).

---

## v1.1 — Post-ship correctness & polish (patch)

**Shipped:** 2026-06-17
**Type:** Maintenance/patch release (no new milestone scope — fixes + small additions on top of v1.0)
**Timeline:** 2026-06-05 → 2026-06-17
**Commits:** 70 since `v1.0` (27 src files, +1448/−566)
**Tests:** 206 passing, `tsc -b` clean

### Delivered

Correctness and polish pass on the shipped v1.0, driven by a code review and live UAT (`/gsd-verify-work 8`). Hardened multi-fragment/multi-component handling end-to-end, fixed the H-hover system, and cleared deploy-time and cosmetic gaps. No backend/architecture changes.

### Key Accomplishments

1. **Multi-component correctness** — canonical→Ketcher pool-ID remap via AuxInfo `/rC:` coordinate matching (fixed ~25/31 atoms highlighting the wrong fragment); multi-fragment-aware `readingFor` explanation text; `/q` and `/p` layer highlighting fixed for multi-fragment salts (e.g. CuSO₄).
2. **Hydrogen-hover overhaul** — unified explicit-H (atom+bond via traversal) vs implicit-H (badge-only) hover, fragment-scoped via `canonRange`, mobile-H `(H,5,6)` "H?" badges, undefined `?` stereocenters supported end-to-end.
3. **Stereo palette fix** — undefined `?` parity given a distinct lime hue (was identical to `+` red) — surfaced and fixed during live UAT.
4. **Preset & UX** — 20 drug molecules added to the preset picker; presets load from embedded SMILES (dropped runtime PubChem fetch); "Copied!" confirmation timing fix under StrictMode.
5. **Deploy/cosmetic** — fixed `coi-serviceworker.js` path (`%BASE_URL%` → relative, was 404 / would break COOP-COEP on GitHub Pages); added project favicon.
6. **Verification** — all multi-fragment/H/stereo fixes confirmed against live Ketcher WASM (UAT: 6/7 pass, 1 issue found & fixed). Closes the v1.0 "not browser-verified" carry-forward items.

### Notes

- Removed dead components (`Footnote`, `MappingStrip`) that were built/tested but never mounted.
- Not run as a formal GSD milestone (no separate ROADMAP/REQUIREMENTS) — all work routed through `/gsd-quick`/`/gsd-fast`; see STATE.md "Quick Tasks Completed".
- Still deferred to v2: MAP-03 shareable URL; `App.tsx` Ketcher `as any` adapter refactor.

---

## v1.0 MVP

**Shipped:** 2026-06-05
**Phases:** 1–8 (8 phases, 25 plans)
**Timeline:** 18 days (2026-05-18 → 2026-06-05)
**Commits:** 186
**LOC:** ~4,773 TypeScript

### Delivered

Full browser-based InChI explainer: Ketcher WASM editor with live InChI generation, color-coded interactive layer strip, explanation cards, legend, atom-mapping strip, 10 preset molecules, multi-layer canvas highlighting, and GitHub Pages deployment — all running without a backend.

### Key Accomplishments

1. Vite + React 18 + TypeScript + Ketcher WASM scaffold with design tokens, deployed to GitHub Pages via GitHub Actions CD
2. Live InChI pipeline: debounced generation, layer parsing, AuxInfo atom mapping (canonical→Ketcher index)
3. Color-coded interactive InChI strip with explanation cards, per-layer legend, and idle/hover state management
4. Full highlight integration: layer hover + sub-token hover drives Ketcher canvas atom/bond highlights (TDD throughout, 135+ tests)
5. Multi-fragment molecule support with correct per-fragment canonical offset fix in parseAuxMapping and enrichLayers
6. Per-group h-layer sub-tokens with SVG hydrogen badges for implicit H, explicit H atom+bond highlights, mobile-H group highlights

### Requirements

20/20 v1 requirements shipped. MAP-03 (shareable URL) deferred to v2.

### Known Deferred Items at Close

- MAP-03: Shareable URL encoding — deferred to v2
- Phase 8 badge positioning: tweaked but not fully browser-verified before context exhaustion
- b-layer highlighting + legend hover trigger: landed in last commit before milestone close — not browser-verified

### Archive

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — requirements with outcomes
