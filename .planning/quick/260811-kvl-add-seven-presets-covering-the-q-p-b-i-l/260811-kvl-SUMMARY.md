---
id: 260811-kvl
type: quick
description: Add seven presets so the picker covers all 11 InChI layers
completed: 2026-08-11
status: complete
commits:
  - bf7c682
  - 8633a20
---

# Quick Task 260811-kvl — Presets for the q/p/b/i layers

## What changed

Seven presets appended to `MOLECULES` as a commented "Layer coverage" group.
The picker now reaches all 11 layer types; before it reached 7, and the `q`,
`p`, `b` and `i` legend rows were greyed out no matter what a user clicked.

| id | name | wins | InChI (measured) |
|---|---|---|---|
| `fumaric` | Fumaric acid | b | `InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+` |
| `maleic` | Maleic acid | b | `InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1-` |
| `choline` | Choline | q | `InChI=1S/C5H14NO/c1-6(2,3)4-5-7/h7H,4-5H2,1-3H3/q+1` |
| `acetate` | Acetate | p | `InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)/p-1` |
| `chloroformD` | Chloroform-d | i | `InChI=1S/CHCl3/c2-1(3)4/h1H/i1D` |
| `sodiumAcetate` | Sodium acetate | q+p | `InChI=1S/C2H4O2.Na/c1-2(3)4;/h1H3,(H,3,4);/q;+1/p-1` |
| `pge2` | Prostaglandin E₂ | b,t,m,s | `InChI=1S/C20H32O5/…/b7-4-,13-12+/t15-,16-,17-,19+/m1/s1` |

## How the InChIs were obtained

A throwaway Node script (not committed) loaded `indigo-ketcher` — the same WASM
`ketcher-standalone` wraps — and ran `indigo.convert(smiles, 'inchi')` over all
30 existing presets to establish the gap, then over 24 candidates to close it.
The seven were re-measured a second time from the SMILES **as escaped in the
TypeScript source**, because `OC(=O)\C=C/C(=O)O` and `…/C=C\CCCC(=O)O` both
carry a backslash that a bad escape would silently turn into a different
stereoisomer — a mistake no test in this repo could have caught.

## Tests

`PresetMolecules.test.tsx`: pins the seven SMILES exactly, and pins fumaric and
maleic adjacent in the strip (the pair only teaches the b layer side by side).

`src/lib/__tests__/presetLayerCoverage.test.ts` (new, 11 tests): parses all
seven real InChIs through `parseInchi`. Asserts the union of layer types is all
11, that the q/p distinction holds in both directions (choline has q and no p,
acetate has p and no q), and — for the multi-component sodium acetate — that q
is fragment-separated (`;+1` → `['', '+1']`) while p is a whole-structure count,
that the sodium is canonical 5 after the acetate's four heavy atoms, and that
the c layer's trailing `;` survives. Every assertion passed on the first run:
the parser needed no changes for the new layers.

561 tests green, `tsc --noEmit` clean.

## Not verified

**The live app was not driven.** Plan task 3 wanted each preset loaded in the
running app to watch its layer light up. `puppeteer` is not installed here (only
a bare Chrome binary in `~/.cache/puppeteer`, and no WebSocket library to speak
CDP with), so the check was replaced by the parser-level test above.

What that leaves unproven is the SMILES → Ketcher → `getInchi()` hop: whether
Ketcher's editor accepts a disconnected SMILES (`CC(=O)[O-].[Na+]`), an explicit
isotope (`[2H]`) and a charged nitrogen from `setMolecule`, and returns the InChI
measured here. The InChI engine is the same one, so the strings are right; what
is untested is Ketcher's own round-trip in front of it. Worth one manual pass
over the seven chips before this ships — sodium acetate and chloroform-d first,
as the two least like anything already in the list.
