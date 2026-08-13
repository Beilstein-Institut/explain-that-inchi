---
id: 260813-exd
status: in-progress
date: 2026-08-13
---

# Quick Task 260813-exd — Layer chips on the example molecules

Each preset in the picker may carry one chip naming an InChI layer it
demonstrates. Across the whole list every layer type appears **at most once**, so
the 11 chips together cover all 11 layers — the picker becomes a map of the
Legend rather than an unordered list.

## Decisions (locked)

- **Chip label = the Legend key**: `1S`, `Hill`, `c`, `h`, `q`, `p`, `b`, `t`,
  `m`, `s`, `i`. Tinted with that layer's swatch colour (`--c-{swatch}` on
  `--c-{swatch}-bg`), same vocabulary the Legend already uses. Chosen over full
  layer names (too wide) and slash form (`/c`) which breaks for version/formula.
- **One chip per layer, one layer per preset.** A preset whose InChI carries
  several layers (PGE2 has b/t/m/s) advertises only the one still unclaimed.
- `LAYER_KEY` lives in `layerInfo.ts` as the single source; `Legend.tsx` derives
  its `key` column from it rather than the two lists drifting apart.

## Assignments (each InChI measured through indigo-ketcher WASM, not written by hand)

| Preset | Chip | Measured InChI |
|--------|------|----------------|
| `methane` | `1S` | `InChI=1S/CH4/h1H4` — no c layer at all, so version is all it can claim |
| `caffeine` | `Hill` | `InChI=1S/C8H10N4O2/…` — exactly the Legend's formula example |
| `benzene` | `c` | `InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H` |
| `ethanol` | `h` | `InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3` — 1H/2H/3H in one layer |
| `choline` | `q` | `…/q+1` |
| `acetate` | `p` | `…/p-1` |
| `fumaric` | `b` | `…/b2-1+` (maleic stays unchipped — the pair is the lesson, the chip is the pointer) |
| `alanine` | `t` | `…/t2-/m0/s1` |
| `nicotine` | `m` | `…/t10-/m0/s1` |
| `pge2` | `s` | `…/b7-4-,13-12+/t15-,16-,17-,19+/m1/s1` |
| `chloroformD` | `i` | `…/i1D` |

## Tasks

1. `LAYER_KEY` in `layerInfo.ts`; `Legend.tsx` derives its key column from it.
2. `layer?: LayerType` on `MoleculePreset` + the 11 assignments in
   `molecules.ts`; chip rendered in `KetcherPanel.tsx`; `.mol-meta` / `.mol-layer`
   in `styles.css` (desktop column + mobile pill).
3. Tests: every chipped preset's layer is present in its **measured** InChI
   (`presetLayerCoverage.test.ts`), and no layer is claimed twice, all 11 covered
   (`PresetMolecules.test.tsx`).

## must_haves

- All 11 layer types appear as a chip exactly once across `MOLECULES`.
- No chip claims a layer its own InChI does not contain — pinned by fixtures
  measured through the WASM, not asserted from memory.
- Chip colour comes from `swatchVar`, so it matches the Legend row and the
  string above it.
