<!-- GSD:project-start source:PROJECT.md -->
## Project

**Explain that InChI**

A single-page public web tool for chemists and chemistry students to understand the structure of an InChI (IUPAC International Chemical Identifier) string. Users draw a molecule in an embedded Ketcher editor; the InChI is computed live and displayed below with each layer colour-coded and interactive. Hovering over a layer highlights the corresponding atoms or bonds in the molecule canvas and surfaces a per-layer explanation card.

**Core Value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.

### Constraints

- **Tech stack**: Vite + React 18 + TypeScript — matches what `ketcher-react` expects
- **No backend**: `ketcher-standalone` provides WASM InChI; everything runs in-browser
- **Styling**: vanilla CSS modules or Tailwind — must preserve the CSS variable token system from `styles.css`
- **Deployment**: static build (GitHub Pages or Netlify); no server-side rendering
- **Fidelity**: high — colour palette, typography, spacing, and hover behaviour are final from the handoff
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core
| Layer | Choice | Version | Confidence |
|-------|--------|---------|-----------|
| Build tool | Vite | ^8.0 (latest) | HIGH |
| UI framework | React | ^18.2 | HIGH |
| Language | TypeScript | ^5.x | HIGH |
| Molecule editor | ketcher-react | 3.17.1 | HIGH |
| Standalone WASM provider | ketcher-standalone | 3.17.1 (keep in sync) | HIGH |
| Type definitions | ketcher-core | 3.17.1 (keep in sync) | HIGH |
| State management | Zustand | ^5.0.13 | HIGH |
| Styling | CSS Modules + CSS custom properties | (built into Vite) | HIGH |
| Deployment | Netlify (primary) / GitHub Pages (fallback) | — | MEDIUM |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-static-copy | ^2.x | Copy Ketcher WASM/worker assets from node_modules to dist/public | Required — WASM files must be served at a known URL |
| @vitejs/plugin-react | ^4.x | React fast-refresh, JSX transform | Required — use standard esbuild plugin (not SWC variant) |
| coi-serviceworker | latest (copy from repo) | Polyfill COOP/COEP headers via Service Worker | Required only for GitHub Pages; not needed on Netlify |
## Rationale
### Vite 8 + react-ts template
### React 18, not React 19
### ketcher-react + ketcher-standalone + ketcher-core — all at 3.17.1
- `ketcher-react` — exports the `Editor` React component and `ButtonsConfig` type
- `ketcher-standalone` — exports `StandaloneStructServiceProvider` (WASM-backed, no server needed)
- `ketcher-core` — exports `Ketcher` type (used for typing the `onInit` callback result)
- `getInchi(withAuxInfo?: boolean): Promise<string>` — the `true` overload returns InChI + AuxInfo block containing the canonical→Ketcher atom mapping the project needs
- `setMolecule(mol: string): Promise<void>` — used for preset loading
- Structure change events: subscribe via `ketcher.editor.subscribe('change', handler)` — no `onChange` prop on `<Editor>`; the editor event bus is the mechanism
- `onInit` callback: `<Editor onInit={(ketcher: Ketcher) => void}>`
- `staticResourcesUrl` prop: must point to where `help.md`, `library.sdf`, and WASM asset files are served. In Vite, set to `''` or `'/'` — the files must be physically present at that URL via the `vite-plugin-static-copy` step below
### Zustand 5 for state management
### CSS Modules — do NOT use Tailwind
- `oklch()` color space (Tailwind 3.x doesn't support oklch natively; Tailwind 4 does but adds migration cost)
- ~60+ CSS custom properties as a structured token system
- Precise typographic tokens (IBM Plex Sans/Serif/Mono via `@font-face` or Google Fonts)
## Build and Deploy Considerations
### Vite config skeleton
### WASM + SharedArrayBuffer: what we actually know
### GitHub Pages deployment
- Include `coi-serviceworker.js` as a standalone file in `public/` (must not be bundled)
- Add `<script src="/coi-serviceworker.js"></script>` as the first script in `index.html`
- The service worker intercepts all requests and injects the missing headers, causing a single page reload on first visit
# netlify.toml
### TypeScript tsconfig notes
## What NOT to Use
| Rejected Choice | Why |
|----------------|-----|
| `@vitejs/plugin-react-swc` | Confirmed SWC panic crash when processing ketcher packages (issue #5565). Use standard `@vitejs/plugin-react` (esbuild) |
| React 19 | Not required. 3.17.1 peerDeps allow `^18.2.0 \|\| ^19.0.0`, so React 18 stays supported and the upgrade buys nothing here |
| Tailwind CSS | Would require duplicating all oklch token definitions from the canonical `styles.css`; CSS Modules work with CSS variables natively without duplication |
| Redux Toolkit | Massive overkill for a store with 6-7 fields; no async side effects requiring middleware |
| Styled-components / Emotion | Runtime CSS-in-JS is unnecessary here; the token system is CSS variables which CSS Modules handle natively |
| `indigo-ketcher` direct import | This is a transitive dependency of `ketcher-standalone`; do not import it directly — only the ketcher packages' public API (`StandaloneStructServiceProvider`) should be used |
| Server-side rendering (Next.js) | The project constraint is a static build; Next.js adds SSR complexity and breaks Ketcher's browser-only WASM initialization |
| RC releases of ketcher (3.18.x-rc) | Not stable releases. NOTE: 3.13-3.17 went stable 2026-07-13/16; the app moved 3.12.0 -> 3.17.1 on 2026-07-27 to clear 7 high advisories (draft-js and replace are gone from the dep tree) |
## Open Questions
## Sources
- ketcher-react npm (version data): https://security.snyk.io/package/npm/ketcher-react/versions
- Ketcher GitHub releases: https://github.com/epam/ketcher/releases
- ketcher-react React 19 bump issue: https://github.com/epam/ketcher/issues/6657
- ketcher Vite SWC build error: https://github.com/epam/ketcher/issues/5565
- Ketcher example App.tsx: https://github.com/epam/ketcher/blob/master/demo/src/App.tsx
- ketcher-standalone README: https://github.com/epam/ketcher/tree/master/packages/ketcher-standalone
- Ketcher JS API (getInchi): https://github.com/epam/ketcher/blob/master/README.md
- COOP/COEP on GitHub Pages: https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/
- coi-serviceworker: https://github.com/gzuidhof/coi-serviceworker
- Netlify custom headers: https://docs.netlify.com/manage/routing/headers/
- Vite Getting Started (v8): https://vite.dev/guide/
- vite-plugin-wasm: https://github.com/Menci/vite-plugin-wasm
- Zustand v5 announcement: https://pmnd.rs/blog/announcing-zustand-v5/
- Zustand npm: https://www.npmjs.com/package/zustand
- CSS Modules vs Tailwind 2025: https://dev.to/_d7eb1c1703182e3ce1782/css-in-js-vs-tailwind-css-vs-css-modules-which-to-choose-in-2025-cbi
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
