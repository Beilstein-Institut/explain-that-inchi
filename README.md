# Explain that InChI

> Draw a molecule — get an interactive, plain-English breakdown of its InChI string.

**[Live demo →](https://cm-beilstein.github.io/explain-that-inchi/)**

---

## What it does

[InChI](https://iupac.org/what-we-do/databases-and-nomenclature/inchi/) (IUPAC International Chemical Identifier) strings look like noise to most chemists. This tool makes them readable.

Draw or load a molecule in the embedded Ketcher editor. The InChI is computed live — entirely in-browser via WebAssembly, no server involved. Each layer of the string is colour-coded and interactive:

- **Hover a layer chunk** → the corresponding atoms or bonds light up in the canvas, and an explanation card appears in plain English.
- **Hover a specific sub-token** (an element in the formula, an H-count, a mobile-H group, a stereo descriptor) → the same card narrows to that exact piece — e.g. *"Hydrogen count: 2 — atoms 6, 7 and 9 each bear 2 hydrogens"* — with per-component atom numbering matching the string.
- **Click a chunk to pin it** → the highlight freezes so you can read the explanation without holding the mouse still. Press Esc or click elsewhere to release.
- **InChIKey** is displayed below the InChI string, with per-segment explanations (skeleton hash, remaining-layers hash, flag+version, protonation).
- **Guided tour** — click **Help** in the toolbar for an 8-step walkthrough of the whole interface.

---

## Running locally

Requires Node.js 20+ and a modern browser with WebAssembly support.

```bash
npm install
npm run dev
```

Open [http://localhost:5173/explain-that-inchi/](http://localhost:5173/explain-that-inchi/).

---

## Building

```bash
npm run build
```

Output goes to `dist/`. The build copies the Ketcher WASM library and `coi-serviceworker.js`, which polyfills the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers required for SharedArrayBuffer on GitHub Pages.

### Tests

```bash
npm test
```

375 unit and integration tests covering the InChI parsers, highlight specs, store logic, and UI components.

---

## Deployment

The app is deployed to GitHub Pages from the `gh-pages` branch via GitHub Actions (`.github/workflows/deploy.yml`). Any push to `master` triggers a production build and deploy.

For other static hosts (Netlify, Vercel, etc.) no special configuration is needed — the COEP/COOP headers required by Ketcher's WASM worker can be set at the host level instead of via the service worker.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Build | Vite 8 |
| UI | React 18 + TypeScript |
| Molecule editor | [Ketcher](https://github.com/epam/ketcher) 3.12.0 (standalone WASM — no Indigo backend) |
| State | Zustand 5 |
| Styling | CSS Modules + CSS custom properties (oklch colour space) |
| Tests | Vitest 3 |

---

## Project

Built at the [Beilstein Institut](https://www.beilstein-institut.de/en/) as an educational companion to InChI-based cheminformatics tools.
