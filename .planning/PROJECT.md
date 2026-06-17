# Explain that InChI

## What This Is

A single-page public web tool for chemists and chemistry students to understand the structure of an InChI (IUPAC International Chemical Identifier) string. Users draw a molecule in an embedded Ketcher editor; the InChI is computed live and displayed below with each layer colour-coded and interactive. Hovering over a layer highlights the corresponding atoms or bonds in the molecule canvas and surfaces a per-layer explanation card.

Shipped as a static build to GitHub Pages (no server, no backend). All InChI computation runs in-browser via Ketcher's built-in WASM library.

## Core Value

Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.

## Current State

**Version:** v1.1 — shipped 2026-06-17 (post-ship correctness & polish on the v1.0 MVP, shipped 2026-06-05)

- 8 phases, 25 plans (v1.0); v1.1 = 70-commit maintenance/polish patch
- Tech stack: Vite 8 + React 18 + TypeScript + Ketcher 3.12.0 (WASM) + Zustand 5 + CSS Modules
- 206 unit/integration tests passing; TypeScript clean
- Deployed to GitHub Pages via GitHub Actions CD

## Current Milestone: v1.2 In-app feedback via prefilled GitHub issues

**Goal:** Let any visitor send feedback through a "Send feedback" control that opens a prefilled GitHub new-issue page, auto-including the current InChI, molecule, and environment context — with no backend.

**Target features:**
- A "Send feedback" entry point in the UI, on-brand with the design tokens
- Opens `github.com/cm-beilstein/explain-that-inchi/issues/new` with prefilled title + body
- Auto-captured context: current InChI string, molecule (SMILES + preset name if any), browser/user-agent + app version/commit
- Feedback type/category (bug / suggestion / "explanation unclear") mapped to issue labels or title prefix
- Graceful behavior when the canvas is empty / no InChI yet
- Privacy-aware: only includes what's already on the page; clear that it opens a PUBLIC GitHub issue

**Key constraints:**
- No backend — pure client-side URL construction (`encodeURIComponent`; mind GitHub's ~8KB URL length limit for long InChI/SMILES)
- Requires a GitHub account to actually submit (accepted tradeoff)
- Must preserve the oklch token system / high visual fidelity

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

### Active (v2 candidates)

- [ ] MAP-03: Current molecule state encoded in URL (hash or query param) for bookmarking/sharing — deferred from v1 during Phase 6 planning
- [ ] ACCS-01: Full keyboard navigation of the InChI layer display (Tab through layers, Enter to activate hover)
- [ ] ACCS-02: Screen reader labels on all layer color swatches and legend rows
- [ ] CONT-01: Additional preset molecules beyond the 10 in v1 (e.g. amino acids, common drugs)
- [ ] CONT-02: Molecule search by name or InChI string
- [ ] APPR-01: Dark mode toggle with adapted design tokens
- [ ] APPR-02: Print styles for the explanation panel

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

## Constraints

- **Tech stack**: Vite + React 18 + TypeScript — matches what `ketcher-react` expects
- **No backend**: `ketcher-standalone` provides WASM InChI; everything runs in-browser
- **Styling**: CSS modules + CSS custom properties — preserves the oklch token system from `styles.css`
- **Deployment**: static build (GitHub Pages); no server-side rendering
- **Fidelity**: high — colour palette, typography, spacing, and hover behaviour are final from the handoff

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-06-17 — v1.2 milestone (in-app feedback) started; v1.1 shipped*
