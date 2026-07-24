# Jmol element colors — design

**Date:** 2026-07-24
**Status:** Approved

## Goal

Replace the app's hand-tuned oklch element palette (10 elements: C, H, N, O, S,
P, F, Cl, Br, I) with the official Jmol CPK colors for the full element set
(~110), pulled from <https://jmol.sourceforge.net/jscolors/> and stored in the
repo. Both the canvas atom-highlight color and the InChI formula text (letter
color + pinned-chip tint) use the Jmol color.

## Decisions

- **Scope:** all Jmol elements (~110), not just the current 10.
- **Storage:** a flat TS hex map (`src/lib/jmolColors.ts`), not CSS variables.
- **Which colors:** canvas highlight **and** InChI text letter / background tint.
- **Dark mode:** apply Jmol hex verbatim in all themes (no contrast clamp).
- **Carbon:** grey per Jmol (`#909090`), no custom override.
- **Hydrogen — formula text:** rendered **black** (Jmol white would be
  invisible), i.e. no per-element Jmol style — inherits the default letter color.
- **Hydrogen — canvas highlight:** Jmol white fill is invisible on the white
  Ketcher canvas, so white-highlighted atoms get a **dark outline ring** drawn
  around the halo. Canvas-only; does not affect the formula text.

## Data

`src/lib/jmolColors.ts`:

```ts
// Jmol CPK element colors, pulled verbatim from
// https://jmol.sourceforge.net/jscolors/  (see header comment for date pulled)
export const JMOL_COLORS: Record<string, string> = {
  H: '#ffffff', He: '#d9ffff', /* ... full element set ... */ C: '#909090',
  N: '#3050f8', O: '#ff0d0d', /* ... */
};
```

Lowercase 6-digit `#rrggbb`. Symbols match `ELEMENT_NAMES` keys in `layerInfo.ts`.

## Lookup

`src/lib/layerInfo.ts` — `elementColor` returns the hex directly:

```ts
export function elementColor(el: string): string {
  return JMOL_COLORS[el] ?? 'var(--c-formula)';
}
```

Fallback `var(--c-formula)` is only reached for non-element pseudo-symbols
(D, T, R-groups) now that all real elements are in the map.

## Canvas highlight path

`highlightUtils.ts` resolves element colors via
`resolveVarFn(stripVar(elementColor(el)))` to convert oklch → rgb for the
Raphaël SVG renderer. A hex needs no conversion. Add a one-line passthrough at
the top of the production `resolveVar`:

```ts
if (name.startsWith('#')) return name;
```

Call sites are unchanged. `stripVar('#abcdef')` is a harmless no-op. The
`var(--c-formula)` fallback continues to resolve through the existing path.

## InChI formula text + chip tints

`LayerText.tsx` currently maps 10 symbols to static CSS-module classes
(`EL_CLASS`), each class defined in `InchiSection.module.css` as
`.elC { color: var(--c-el-C); --el-color: ...; --el-bg-color: ... }`. The
pinned/active chip CSS reads `--el-color` (ring) and `--el-bg-color`
(background).

Replace the static class with an inline style computed per element from the
Jmol hex, applied to **every** element present in `JMOL_COLORS` — **except
hydrogen**, which renders black (see below):

```tsx
const hex = JMOL_COLORS[el];
// when hex present AND el !== 'H':
style={{
  color: hex,
  ['--el-color' as string]: hex,
  ['--el-bg-color' as string]: `oklch(from ${hex} 0.95 0.04 h)`,
}}
```

`oklch(from <hex> ...)` relative color syntax derives the pale chip tint from
the element color — no JS color math, no per-element bg constant.

**Hydrogen** (`el === 'H'`): apply no per-element style, so the `H` letter
inherits the default (black) formula text color and the pinned chip falls back
to the generic `currentColor` ring. Jmol white would be invisible on the page.

Elements not in the map (should be none for real elements) render with no
per-element style, matching today's fallback behavior. The generic
`.inchiSubtoken` / `.pinned` chip rules are unchanged.

## Hydrogen ring on canvas

`elementColor('H')` returns Jmol white (`#ffffff`); the highlight halo Ketcher
draws is then invisible on the white canvas. After
`applyKetcherHighlights` + `whiteAtomLabels`, add a post-process step —
mirroring the existing `renderHBadges` / `cleanHBadges` SVG-injection pattern —
that draws a dark outline ring around each white-highlighted atom:

- New `outlineWhiteHalos(svgRoot, specs)` in `useKetcherHighlights.ts`.
  For each spec whose `color` is white (`#ffffff` / `rgb(255,255,255)`), for
  each atom id, read the atom center from its SVG group `getBBox()` (same
  technique as `renderHBadges`) and append an
  `<circle data-h-ring="true">` with `fill="white"`, a dark
  `stroke` (e.g. `var(--ink)` resolved, fallback `#333`), and
  `pointer-events="none"`.
- `whiteAtomLabels`: skip whitening the label when the atom's spec color is
  white, so the `H` glyph stays dark and legible on the white disc.
- Cleanup: extend `cleanHBadges` (or add `cleanHRings`) to also remove
  `[data-h-ring]`, and call it on every clear path already handled for badges.
- Wire the new step into the effect right after the `whiteAtomLabels(...)` call
  (only when `specs.length > 0`).

Keyed on the highlight color being white rather than on the symbol `'H'`, so
any other near-white Jmol element (e.g. He `#d9ffff` is *not* pure white and is
unaffected; only pure-white halos are ringed) is handled by the same rule. This
is canvas-only and independent of the formula-text treatment.

The exact ring radius / stroke width are visual and must be confirmed in the
running app (see Tests step 5).

## Cleanup (dead after the above)

- `InchiSection.module.css`: remove the 10 `.elC … .elI` rules.
- `styles.css`: remove the 10 `.el-C … .el-I` formula rules and the ~44
  `--c-el-*` / `--c-el-*-bg` variable definitions.
- `LayerText.tsx`: remove the `EL_CLASS` map.
- `FeedbackDialog.tsx`: the single `var(--c-el-O)` becomes the Jmol O hex
  literal (`#ff0d0d`).

## Tests

TDD order:

1. `jmolColors.ts` + `elementColor` returns Jmol hex (new test in
   `layerInfo.test.ts`): `elementColor('C') === '#909090'`,
   `elementColor('Fe')` is defined, `elementColor('R') === 'var(--c-formula)'`.
2. `resolveVar` hex passthrough (unit): `resolveVar` given `#909090` returns it
   unchanged. (May be covered indirectly; add if not.)
3. Update ~8 assertions in `highlightUtils.test.ts` that expect `--c-el-C`,
   `--c-el-N`, `--c-el-H` to the corresponding Jmol hex (identity `resolveVarFn`
   + hex passthrough → the hex flows through unchanged). Note H is now
   `#ffffff`.
4. `outlineWhiteHalos` unit test (JSDOM, in `useKetcherHighlights.test.ts`):
   given a spec with `color: '#ffffff'` and a stubbed SVG group exposing
   `getBBox`, asserts one `<circle data-h-ring>` with a non-white stroke is
   appended; a non-white spec appends none. `cleanHBadges`/`cleanHRings`
   removes injected rings.
5. Full `npm test` green; manual smoke in the running app: draw a molecule with
   an off-list element (e.g. Fe, Si) and confirm both the atom highlight and the
   formula letter show the Jmol color; hover the formula and confirm explicit-H
   atoms show a white disc with a dark ring, and the formula `H` letter is
   black. Tune ring radius/stroke here.

## Non-goals

- No contrast clamping / theme adaptation of Jmol colors.
- No change to non-element layer colors (conn, hydro, stereo, proton).
- No new dependency for color math.
