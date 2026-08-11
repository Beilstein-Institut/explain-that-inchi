---
id: 260811-kvl
type: quick
description: Add seven presets so the picker covers all 11 InChI layers
created: 2026-08-11
status: planned
---

# Quick Task 260811-kvl — Presets for the q/p/b/i layers

## Problem

The 30 existing presets produce only 7 of the 11 layer types: `version`,
`formula`, `c`, `h`, `t`, `m`, `s`. Nothing a user can click from the picker
produces `q` (charge), `p` (proton balance), `b` (double-bond stereo) or `i`
(isotope) — four legend rows stay permanently greyed out, and four of the
explanation cards the app was built to show are unreachable without drawing a
structure by hand.

Verified by computing real InChI for all 30 presets through the same indigo WASM
`ketcher-standalone` wraps (throwaway script, not committed).

## The seven, with their measured InChI

| id | name | layer it wins | InChI |
|---|---|---|---|
| `fumaric` | Fumaric acid | **b** (`+`) | `InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+` |
| `maleic` | Maleic acid | **b** (`-`) | `InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1-` |
| `choline` | Choline | **q** | `InChI=1S/C5H14NO/c1-6(2,3)4-5-7/h7H,4-5H2,1-3H3/q+1` |
| `acetate` | Acetate | **p** | `InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)/p-1` |
| `chloroformD` | Chloroform-d | **i** | `InChI=1S/CHCl3/c2-1(3)4/h1H/i1D` |
| `sodiumAcetate` | Sodium acetate | **q + p**, multi-component | `InChI=1S/C2H4O2.Na/c1-2(3)4;/h1H3,(H,3,4);/q;+1/p-1` |
| `pge2` | Prostaglandin E₂ | **b + t + m + s** | `InChI=1S/C20H32O5/…/b7-4-,13-12+/t15-,16-,17-,19+/m1/s1` |

Fumaric and maleic acid are byte-identical apart from the final character —
the pair is the only thing in the list that demonstrates *why* the `b` layer
exists. Sodium acetate is the only preset with `.`/`;` fragment separators, so
it is the first to exercise the multi-fragment paths (`fragmentOffset`,
`expandLayerText`) from the picker rather than only from unit tests.

## Approach

Append a `// Layer coverage` group to `MOLECULES` in `src/data/molecules.ts`,
with a header comment stating what the group is for so it does not get pruned as
"odd molecules" later.

`formula` is display-only metadata — `PresetMolecules.test.tsx` pins that the
canvas overlay reads the live `layers[0].text` instead (`C6H6`, not `C₆H₆`). So
the chips carry the conventional species formula with its charge
(`C₂H₃O₂⁻`), which is deliberately *not* the InChI's normalized `C2H4O2`; that
difference is exactly what the `p` layer explains.

## Tasks

1. **Add the seven presets** to `src/data/molecules.ts`.
2. **Pin the coverage** — a test that walks `MOLECULES` and asserts each of the
   seven ids is present with its exact SMILES, in the style of the existing
   stereo-sensitive-SMILES test. The InChI itself cannot be asserted in Vitest
   (no WASM in jsdom), so the test guards the input that produces it and the
   PLAN/SUMMARY record the measured output.
3. **Verify in the running app** — load each of the seven, confirm the expected
   layer appears and its legend row lights up.

## Verification

- `npx vitest run` green, `npx tsc --noEmit` clean
- Manual: all 11 legend rows reachable across the preset set
