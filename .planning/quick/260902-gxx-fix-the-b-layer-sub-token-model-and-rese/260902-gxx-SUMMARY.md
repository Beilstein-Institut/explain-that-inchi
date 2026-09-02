---
quick_id: 260902-gxx
status: complete
date: 2026-09-02
commits:
  - 27663f9 Model the b-layer token as a double bond, not a stereocentre
  - 09dc51a Reset hover state when the InChI data changes
tests: 726 passed (was 712)
---

# Quick Task 260902-gxx — Summary

## What changed

**Task 1 — b-layer sub-token model (27663f9).** `case 'b'` in `LayerText` no longer shares
`ParityText` with the t-layer. A new `BLayerText` renders each `a1-a2sign` token as ONE hover target
carrying both bond ends via a new `SubHover` kind `'bondStereo'` (`stereoBond: [a1, a2]` global
canonicals + `sign`). `buildSubHoverSpecs` lights both atoms and the bond in the parity colour;
`subTokenInfo` gets a "Double-bond stereo" card that calls the sign a canonical parity and explicitly
NOT the E/Z descriptor. `parseBondStereoEntries` now accepts `?`, and the layer-wide `'b'` highlight
puts `?` bonds in the neutral stereo colour instead of the minus bucket. The `'stereo'` spec case lost
its `!` assertions (REVIEW W-03). `Explanation.SUB_KIND_LAYER` maps `bondStereo → 'b'`.

**Task 2 — hover reset (09dc51a).** `setInchiData` now also clears `hoverIdx` and `subHover`
(REVIEW W-01), so a molecule swap can no longer leave the InChI strip fully dimmed.

## Tests

- New `src/__tests__/LayerText.blayer.test.tsx` (6): fumaric `2-1+` is one hoverable span whose hit is
  `{kind:'bondStereo', stereoBond:[2,1], sign:'+'}`; no `'stereo'` hit is ever emitted; maleic `-`;
  `?` neutral; two-component offset (`2-1+;2-1-`, fragCounts `[4,4]` → `[6,5]`, offset 4, component 1);
  pinned class.
- `highlightUtils.test.ts` (+4): atoms + bond + colour for `+`/`-`; missing auxMap end → `[]`;
  layer-wide `?` neutral.
- `subTokenInfo.test.ts` (+3): names both atoms, "canonical", "NOT the E/Z descriptor", never "+ is E";
  `?` copy; de-offset display for component 2.
- `store.test.ts` (+1): stale `hoverIdx: 5` / `subHover` cleared by `setInchiData`.

Fixtures are real `getInchi()` output: fumaric `InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+`
and maleic (`/b2-1-`).

## Mutation evidence

- Routing `case 'b'` back to `ParityText` → all 6 blayer tests fail; restored → 6 pass.
- Removing `hoverIdx: null, subHover: null` from `setInchiData` → the new store test fails (1/21);
  restored → 21/21.

Both commits verified: `npx tsc -b` clean, `NODE_OPTIONS=--no-experimental-webstorage npx vitest run`
726/726, lint unchanged (0 errors, the same 2 pre-existing warnings).

## Deviations

- `BLayerText` tokenises with its own `matchAll` (it needs match indices to slice the verbatim
  substring) rather than calling `parseBondStereoEntries`, which returns entries without positions.
  The regex is identical to the widened one in `layerInfo.ts`.
- The gsd-executor agent was spawned but terminated on an API usage limit before touching any file;
  the orchestrator executed the plan inline.

## Environment note

Local Node v25 shadows happy-dom's `localStorage`; run the suite with
`NODE_OPTIONS=--no-experimental-webstorage` or `leaveWipe.test.ts` fails 14 tests unrelated to any code.
The Dockerfile builds on Node 22 and is unaffected.
