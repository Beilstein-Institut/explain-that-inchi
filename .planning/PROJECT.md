# Explain that InChI

## What This Is

A single-page public web tool for chemists and chemistry students to understand the structure of an InChI (IUPAC International Chemical Identifier) string. Users draw a molecule in an embedded Ketcher editor; the InChI is computed live and displayed below with each layer colour-coded and interactive. Hovering over a layer highlights the corresponding atoms or bonds in the molecule canvas and surfaces a per-layer explanation card.

Shipped as a static build to GitHub Pages (no server, no backend). All InChI computation runs in-browser via Ketcher's built-in WASM library.

## Core Value

Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.

## Current State

**Version:** v1.3 — SHIPPED 2026-06-19 (live InChIKey display & per-segment explanation), tagged `v1.3`. Next milestone being planned.

- v1.0: 8 phases, 25 plans; v1.1: 70-commit maintenance/polish patch; v1.2: 2 phases (9–10), 6 plans; v1.3: 3 phases (11–13), 6 plans
- Tech stack: Vite 8 + React 18 + TypeScript + Ketcher 3.12.0 (WASM) + Zustand 5 + CSS Modules
- 301 unit/integration tests passing; TypeScript clean; production build clean
- Deployed to GitHub Pages via GitHub Actions CD

## Next Milestone Goals

To be defined via `/gsd:new-milestone`. Candidate directions in **Active (v2 candidates)** below: shareable URL (MAP-03), accessibility (ACCS-01/02), content expansion (CONT-01/02), appearance (APPR-01/02), plus v1.3 deferrals INKEY-F1/F2/F3.

## Requirements

### Validated

- ✓ EDIT-01: Embedded Ketcher standalone editor, no backend — v1.0
- ✓ EDIT-02: Preset molecule sidebar loads molecule into canvas on click — v1.0
- ✓ EDIT-03: Canvas overlay: molecule name, formula, heavy-atom count — v1.0
- ✓ INCHI-01: Live InChI generation, debounced ≤150ms, WASM-based — v1.0
- ✓ INCHI-02: Color-coded layer chunks with sub-spans per design tokens — v1.0
- ✓ INCHI-03: Layer hover highlights matching atoms/bonds in Ketcher canvas — v1.0
- ✓ INCHI-04: Sub-token hover overrides layer highlight with targeted highlight — v1.0
- ✓ INCHI-05: Hovering H sub-token highlights explicit hydrogen atoms — v1.0
- ✓ INCHI-06: Multi-fragment molecules highlight correct atoms/bonds per fragment — v1.0
- ✓ INCHI-07: Hovering p-layer highlights protonation-site atoms — v1.0
- ✓ INCHI-08: Per-group h-layer sub-tokens with implicit H badge, explicit H bond highlight, mobile-H highlight — v1.0
- ✓ EXPL-01: Left explanation card: prose + reading-code on hover — v1.0
- ✓ EXPL-02: Right legend card: 11 layer types, color swatches, tooltips — v1.0
- ✓ EXPL-03: Idle state shows default explanation card content — v1.0
- ✓ MAP-01: Mapping strip: Ketcher index → canonical index; identity dimmed, divergent green — v1.0
- ✓ MAP-02: Footnote strip: InChI definition + keyboard hint legend — v1.0
- ✓ PLSH-01: Empty/invalid structure shows placeholder, not error — v1.0
- ✓ PLSH-02: WASM initialisation loading state shown until Ketcher is ready — v1.0
- ✓ PLSH-03: Typography, color tokens, spacing, hover transitions match handoff — v1.0
- ✓ PLSH-04: Copy-to-clipboard button copies verbatim InChI string with visual confirmation — v1.0
- ✓ FEED-01: "Send feedback" control opens an on-brand dialog without remounting the Ketcher canvas — v1.2
- ✓ FEED-02: User selects a feedback category (Bug · Explanation · Highlighting · Suggestion · General) — v1.2
- ✓ FEED-03: User types a free-text feedback message — v1.2
- ✓ FEED-04: Submit opens a prefilled GitHub `issues/new` page in a new tab (category title-prefix + redundant `labels=`) — v1.2
- ✓ FEED-05: Issue body auto-includes fenced context (InChI, SMILES + preset, user-agent + version/commit) with `@` neutralized — v1.2
- ✓ FEED-06: Pre-submit context preview + clear "public GitHub issue, account required" copy — v1.2
- ✓ FEED-07: ~7.5 KB byte-budget truncation of context (never the message) with clipboard fallback — v1.2
- ✓ FEED-08: Empty-canvas feedback degrades cleanly ("no structure loaded") — v1.2
- ✓ FEED-09: Build injects app version/commit (Vite `define`, `git describe`/`GITHUB_SHA` fallback) surfaced in context — v1.2
- ✓ INKEY-01: Live InChIKey below the InChI strip, computed from the same WASM source (`ketcher.getInChIKey()`), in sync with the molecule — v1.3
- ✓ INKEY-02: Displayed/copied key is the verbatim library output — never reconstructed from parsed segments — v1.3
- ✓ INKEY-03: Color-coded key segments (skeleton / remaining-layers / flag+version / protonation) with dimmed hyphens — v1.3
- ✓ INKEY-04: Hovering a segment surfaces a per-segment explanation card (no canvas highlight) — v1.3
- ✓ INKEY-05: Copy-to-clipboard for the verbatim key with visual confirmation (PLSH-04 parity) — v1.3
- ✓ INKEY-06: Empty/invalid structure shows placeholder, no key, no error (PLSH-01 parity) — v1.3
- ✓ INKEY-07: Explanation describes the block structure (14-char skeleton / 8-char remaining-layers / flag+version / protonation) — v1.3
- ✓ INKEY-08: Explanation describes purpose — a fixed 27-char, search-friendly hashed form of the InChI — v1.3
- ✓ INKEY-09: Explanation states the key is a one-way hash — not reversible, not atom-mappable; segments deliberately do NOT highlight atoms — v1.3
- ✓ INKEY-10: Explanation includes the collision caveat (improbable but possible; for lookup, not proof of identity) — v1.3
- ✓ INKEY-11: Skeleton-hash card notes same-connectivity molecules share the first block (basis for lookup) — v1.3
- ✓ INKEY-12: Flag/version card distinguishes standard (`S`) vs non-standard (`N`) and version char (`A`) — v1.3

### Active (v2 candidates)

- [ ] MAP-03: Current molecule state encoded in URL (hash or query param) for bookmarking/sharing — deferred from v1 during Phase 6 planning
- [ ] ACCS-01: Full keyboard navigation of the InChI layer display (Tab through layers, Enter to activate hover)
- [ ] ACCS-02: Screen reader labels on all layer color swatches and legend rows
- [ ] CONT-01: Additional preset molecules beyond the 10 in v1 (e.g. amino acids, common drugs)
- [ ] CONT-02: Molecule search by name or InChI string
- [ ] APPR-01: Dark mode toggle with adapted design tokens
- [ ] APPR-02: Print styles for the explanation panel
- [ ] INKEY-F1: "Search this InChIKey on the web / PubChem" outbound link — deferred from v1.3
- [ ] INKEY-F2: A charged-species preset to live-demo the protonation character (ties into CONT-01) — deferred from v1.3
- [ ] INKEY-F3: First-block partial-match interactive / "how the hash is built" deep dive — deferred from v1.3

### Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / Indigo server | ketcher-standalone runs entirely in-browser via WASM |
| User accounts / persistence | Stateless educational tool; URL sharing covers the core use case |
| 3D structure viewer | InChI is a 2D notation; 3D adds scope without illuminating InChI |
| Database / substructure search | Shifts product identity away from the explainer tool |
| Mobile-native app | Web-first; Ketcher canvas is not well-suited to touch input |
| Language localisation | English-only for v1; deferred |

## Context

- Design reference: `./design_handoff_explain_that_inchi/` (styles.css, molecules.js, layers-info.js, app.jsx, canvas.jsx)
- Deployed: GitHub Pages (`gh-pages` branch), GitHub Actions workflow at `.github/workflows/deploy.yml`
- All parsers ported from design handoff JS and TypeScript-ified with tests
- Highlight system: `buildHighlightSpecs` / `buildSubHoverSpecs` → `useKetcherHighlights` hook → `highlights.create` Ketcher API
- Atom mapping: `getInchi(true)` returns InChI + AuxInfo; AuxInfo parsed to canonical→Ketcher pool-ID map

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite + React 18 + TypeScript | Specified in design handoff; required by ketcher-react | ✓ Good — no issues |
| ketcher-standalone (no Indigo backend) | Browser-only deployment requirement | ✓ Good — works perfectly |
| Port parsers from molecules.js verbatim | Parsers are final, tested, and domain-correct | ✓ Good — saved significant time |
| Aux-info getInchi(true) for atom mapping | Only source of canonical→Ketcher mapping | ✓ Good — canonical approach confirmed |
| @vitejs/plugin-react v6 (esbuild, not SWC) | SWC crashes on Ketcher packages (issue #5565) | ✓ Good — esbuild works cleanly |
| All Ketcher packages pinned to 3.12.0 | Avoid version skew between ketcher-react/standalone/core | ✓ Good — no version conflicts |
| StandaloneStructServiceProvider at module level | WASM re-initializes if created inside component | ✓ Good — critical architectural choice |
| Separate vitest.config.ts from vite.config.ts | Vitest 3 bundles Vite 6 internally; Plugin type conflict if merged | ✓ Good — clean separation |
| vite-plugin-static-copy v4 + assetsInlineLimit:0 | WASM assets must be served as files, not base64-inlined | ✓ Good — no WASM 404s |
| CSS Modules + CSS custom properties | Preserves oklch token system; Tailwind 3.x doesn't support oklch | ✓ Good — zero token conflicts |
| MAP-03 (shareable URL) deferred to v2 | Scope management during Phase 6 | — Pending (v2 Active) |
| getInchi(true) split on AuxInfo= prefix | Concatenated string, not destructurable | ✓ Good — robust parsing |
| useRef for editor.subscribe handler | Avoids stale closures in event subscription | ✓ Good — prevents subtle bugs |
| Feedback via prefilled GitHub issues/new URL | No backend; reuses GitHub auth/storage/moderation | ✓ Good (v1.2) — zero new deps |
| Pure DOM-free buildFeedbackUrl() built/tested first | Isolates all hard logic (encoding, byte budget, truncation) behind a unit-tested seam | ✓ Good (v1.2) — 38 tests |
| Category as title prefix (labels passed redundantly) | GitHub silently drops labels for non-collaborators | ✓ Good (v1.2) |
| Real `<a target="_blank" rel="noopener">` click, no await before open | Avoids popup-blocker on the user gesture | ✓ Good (v1.2) |
| Feedback is ephemeral UI state, dialog is a leaf sibling | Never add store fields / remount KetcherPanel | ✓ Good (v1.2) — canvas never remounts |
| Preview SMILES via getSmiles() + flushSync on open | Async SMILES must render before showModal to avoid stale flash | ✓ Good (v1.2 gap-closure) |
| InChIKey via `ketcher.getInChIKey()` (no JS hashing) | Typed public method on ketcher-core 3.12.0, same WASM worker as getInchi | ✓ Good (v1.3) — zero new deps |
| Concurrent fetch via Promise.allSettled in same debounce tick | Both WASM calls share the 150ms debounce + one generationRef guard; asymmetric rejection (failed key blanks only the key) | ✓ Good (v1.3) — no second subscription/timer |
| parseInchiKey returns offsets only; renderer slices verbatim | Verbatim passthrough invariant — displayed === copied === raw output | ✓ Good (v1.3) — applies the InChI `.`-drop lesson |
| Key hover uses a store field that never reaches useKetcherHighlights | No canvas highlight from key segments — the absence IS the teaching point (INKEY-09) | ✓ Good (v1.3) — verified by grep |
| InchiKeySection is a leaf sibling after InchiSection | Canvas/WASM must never remount (D-13) | ✓ Good (v1.3) — canvas never remounts |
| inchiKeyInfo.ts prose module (parallel to layerInfo.ts) | Static copy extracted for testability; SC-1 test pins zone labels + offsets | ✓ Good (v1.3) |

## Constraints

- **Tech stack**: Vite + React 18 + TypeScript — matches what `ketcher-react` expects
- **No backend**: `ketcher-standalone` provides WASM InChI; everything runs in-browser
- **Styling**: CSS modules + CSS custom properties — preserves the oklch token system from `styles.css`
- **Deployment**: static build (GitHub Pages); no server-side rendering
- **Fidelity**: high — colour palette, typography, spacing, and hover behaviour are final from the handoff

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-06-19 after v1.3 milestone (InChIKey display & explanation) — shipped and tagged*
