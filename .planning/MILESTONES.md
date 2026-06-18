# Milestones: Explain that InChI

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
