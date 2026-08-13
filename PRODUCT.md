# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **chemistry students** meeting InChI for the first time — typically at a
desktop browser, with a structure in front of them (a lecture slide, a paper, a
database record) and an InChI string they can read character by character but not
interpret. Their job is to learn what each part of the string means and how it maps
back to the molecule.

Close second: **practicing chemists and cheminformaticians** who encounter an InChI
in a database or publication and need to decode a specific layer quickly. They are
not the tie-breaker audience, but the chemistry must stay correct enough for them —
teaching clarity may never be bought with a chemically wrong simplification.

## Product Purpose

Draw or load a molecule; the InChI is computed live in-browser and displayed with
every layer colour-coded and interactive. Hovering a layer chunk highlights the
corresponding atoms or bonds in the canvas and opens a plain-English explanation
card; hovering a sub-token (a formula element, an H-count, a mobile-H group, a
stereo descriptor, a c-layer atom/bond/branch) narrows the card to that exact piece.
Clicking pins the highlight so the explanation can be read without holding the mouse
still. The InChIKey is shown below with per-segment explanations.

Success is a user who can look at an unfamiliar InChI afterwards and say what each
layer is doing — a notation most chemists treat as opaque becomes readable.

## Positioning

Other tools *produce* InChI strings. This one explains an InChI back to the atoms
that generated it: the bidirectional link between string position and canvas
geometry, at sub-token granularity, is the mechanism. It runs entirely in the
browser via Ketcher's WASM InChI — no backend, no upload of the user's structure.

## Operating Context

- Single page, no account, no persistence.
- **Desktop-first; mobile is best-effort.** A ≤900px breakpoint reflows the picker
  from a sidebar into a horizontal chip strip so the tool does not break on a phone,
  but drawing a structure on a small screen is not a scenario design work optimizes
  for. The breakpoint is a courtesy, not a commitment.
- Embedded Ketcher editor as the drawing surface; a preset picker loads real
  molecules for users who do not want to draw.
- An 8-step guided tour ("Help") walks the whole interface; on an empty canvas the
  tour auto-loads Caffeine.
- A "Limitations" dialog states what the tool cannot do and why, attributing each
  limit to the layer that imposes it (InChI / RInChI / MInChI / Ketcher) rather
  than to this tool, and links to the fuller `LIMITATIONS.md` in the repository.
- Also runs from a Docker/nginx image serving the app under the
  `/explain-that-inchi/` subpath.

## Capabilities and Constraints

- **Verbatim passthrough is an invariant**: the displayed InChI string is Ketcher's
  raw output, sliced by offsets — never re-joined from parsed layer fields. Displayed
  === copied === raw.
- **The canvas must never remount.** New UI mounts as a leaf sibling of the editor;
  a remount reinitializes the WASM worker.
- InChI and InChIKey both come from `ketcher-core` public methods
  (`getInchi`, `getInChIKey`) in one debounced (≤150 ms) tick — no JS hashing.
- Canonical atom numbering is per-component, including `N*` duplicated fragments.
  c-layer bonds are derived from atom adjacency, not from hyphen characters.
- **The preset picker is a map of the notation.** Every one of the 11 InChI layer
  types has exactly one preset that is its worked example, chipped with that
  layer's key and colour, and those presets lead the list in the order the layers
  appear in a string. Clicking down the head of the picker walks the whole
  notation. Neither half is decoration: a layer with no example leaves an
  unreachable explanation card, and a second example for a claimed layer breaks
  the one-to-one map. Both are asserted in `presetLayerCoverage.test.ts` against
  InChIs measured through the WASM.
- **Limitations are attributed, not apologised for.** Each entry names the standard
  or library that imposes the limit. The point is that these are the capability
  envelope of what the tool sits on, not defects in it.
- Stack (fixed): Vite 8 + React 18 + TypeScript, Zustand 5, CSS Modules over a
  ~60-token `oklch()` custom-property system in `src/styles.css`. No Tailwind — it
  would duplicate the token system. React 18, not 19.
- Static build only; no backend, no SSR. Served by nginx in Docker at
  cheminfo.beilstein.org; nginx sets the COOP/COEP headers SharedArrayBuffer needs,
  so the bundled `coi-serviceworker.js` fallback never registers.
- 596 unit/integration tests; fixtures must be **real** InChI strings — fabricated
  fixtures once kept 333 tests green over a broken feature. Data-shape assertions
  are not enough on their own either: a full suite of them once passed while the
  question on the table was whether the UI rendered at all.

## Brand Commitments

Built at the Beilstein Institut, credited in the footer, README, and legal pages —
**attribution only**. No corporate palette, logo, or typography rules bind design
work. The tool's own identity is the incumbent `styles.css` token system
(IBM Plex Sans / Serif / Mono, oklch palette), which is the visual authority until
deliberately replaced.

Voice: plain English, chemically precise, explanatory rather than promotional.

## Evidence on Hand

- Live deployment: https://cheminfo.beilstein.org/explain-that-inchi/
- 20 real preset molecules in `src/data/molecules.ts` — 11 of them the chipped
  layer examples, 9 ordinary molecules to draw and explore.
- `LIMITATIONS.md` at the repo root: the full limitation list, grouped by the layer
  imposing each limit. The in-app dialog is a four-entry subset of it.
- The repository is **private at the time of writing**, which makes the in-app
  "Send feedback" link and the Limitations dialog's `LIMITATIONS.md` link 404 for
  the public. Both are written against
  `github.com/Beilstein-Institut/explain-that-inchi` and the intent is for that
  repo to become public; until it does, the app has no working outward link.
- Legal/imprint/privacy copy in `src/data/legalContent.ts`; `THIRD-PARTY-NOTICES.md`;
  MIT licence.
- Assets: `public/favicon.svg` only. No logo, no photography, no illustration set.
- No testimonials, usage numbers, customers, case studies, or press exist. Future
  work must not invent them.

## Product Principles

1. **The string is the subject.** Every design decision serves the mapping between
   a character in the InChI and an atom on the canvas.
2. **Teach without lying.** Simplify the language, never the chemistry; a wrong
   explanation is worse than an intimidating one.
3. **Verbatim over reconstructed.** What the user sees and copies is exactly what
   the InChI generator produced.
4. **No backend, no upload.** The user's structure never leaves the browser; that
   is a product property, not just an implementation detail.
5. **The canvas is load-bearing.** Nothing that risks remounting or slowing the
   editor is worth the feature it buys.

## Accessibility & Inclusion

No formal standard has been adopted for this project. Ordinary good practice
applies; nothing contractual is recorded. Note as an open product fact: the core
interaction is hover-driven, so keyboard and colour-independent equivalents are
undecided rather than deliberately excluded.
