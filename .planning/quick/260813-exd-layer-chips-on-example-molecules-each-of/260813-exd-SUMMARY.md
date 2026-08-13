---
id: 260813-exd
status: complete
date: 2026-08-13
commits: [bef41cd, 31f8f97, 5b394e2]
---

# Quick Task 260813-exd — Layer chips on the example molecules

Every preset in the picker may now carry one chip naming the InChI layer it is
the example of. Across the list each layer type is claimed **at most once** and
all 11 are claimed, so the chips are a map of the legend: click every chipped
preset and you have walked the whole notation.

## What changed

| Commit | Change |
|--------|--------|
| `bef41cd` | `LAYER_KEY` in `layerInfo.ts` — the short name of each layer (`1S`, `Hill`, `c`, `h`, `q`, `p`, `b`, `t`, `m`, `s`, `i`). `Legend.tsx` derives its key column from it instead of hardcoding the same eleven strings, keeping the `…` suffix, which is presentation and true only in that column. |
| `31f8f97` | `layer?: LayerType` on `MoleculePreset` + the 11 assignments; chip rendered in `KetcherPanel.tsx` tinted `--c-{swatch}` on `--c-{swatch}-bg` via `swatchVar`; `.mol-meta` / `.mol-layer` in `styles.css`. |
| `5b394e2` | Six new measured fixtures + three assertions in `presetLayerCoverage.test.ts`. |

## Assignments

`methane` 1S · `caffeine` Hill · `benzene` c · `ethanol` h · `choline` q ·
`acetate` p · `fumaric` b · `alanine` t · `nicotine` m · `pge2` s ·
`chloroformD` i

Each was chosen for what its InChI actually contains, not by association:

- **methane → version.** `InChI=1S/CH4/h1H4` has no connection layer at all —
  one heavy atom, no bonds. Version is the only thing it can be the example of,
  and it is the shortest InChI in the list, which is what makes it readable.
- **caffeine → formula.** `C8H10N4O2` is verbatim the legend's own formula
  example, so the row and the chip point at the same string.
- **pge2 → s.** It carries b, t and m too, but those are claimed by fumaric,
  alanine and nicotine. The chip names the one layer nothing else in the picker
  shows.
- **fumaric → b, maleic → nothing.** The two differ in one character of their
  InChI and only mean something as a pair, but a second `b` chip would break the
  one-per-layer rule that makes the chips a map. The chip points into the pair.

## Verification

- `npx tsc --noEmit` clean; `npx vitest run` **590 passed** (37 files), up 6.
- `npm run build` clean.
- Every chip pinned against an InChI **measured through indigo-ketcher WASM**
  from the SMILES in `molecules.ts` — the six new fixtures were produced the same
  way as the seven from 260811-kvl, never written from memory. The `t`/`m`
  assignments in particular came out of the measurement: alanine and nicotine
  both produce `/t…/m0/s1`, so which one advertises which is an editorial split
  of a shared set, not a property of either molecule alone.
- **Not visually verified in a browser.** The DOM is 8 lines of JSX and the data
  is pinned, but the chip's placement in the sidebar row and in the mobile pill
  strip has only been reasoned about, not seen.

## Decisions

- **Chip label = the Legend key**, not the full layer name (too wide for the
  sidebar, pushes the formula around) and not the slash form `/c` (breaks for
  version and formula, which have no prefix).
- **`LAYER_KEY` extracted rather than duplicated.** Eleven short strings is a
  small duplication, but a chip and its legend row naming the same layer
  differently is exactly the kind of drift nobody notices.
- **Chip is decoration on the button, not its own control.** It carries a
  `title` and no click handler — clicking anywhere on the preset already loads
  the molecule, which is what the chip is advertising.
