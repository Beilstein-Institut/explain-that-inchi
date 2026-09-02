---
quick_id: 260902-gxx
type: quick
description: Fix the b-layer sub-token model and reset hover state on setInchiData
date: 2026-09-02
files_modified:
  - src/lib/parseInchi.ts
  - src/lib/layerInfo.ts
  - src/lib/highlightUtils.ts
  - src/lib/subTokenInfo.ts
  - src/components/LayerText.tsx
  - src/components/Explanation.tsx
  - src/store.ts
  - src/__tests__/LayerText.blayer.test.tsx
  - src/lib/__tests__/highlightUtils.test.ts
  - src/lib/__tests__/subTokenInfo.test.ts
  - src/__tests__/store.test.ts
---

# Quick Task 260902-gxx: Fix the b-layer sub-token model and reset hover state on setInchiData

## Problem

`src/components/LayerText.tsx:106-107` routes BOTH `t` and `b` layers to `ParityText`, whose regex
`/(\d+)([-+?])/g` matches "a number followed by a sign". In the b-layer token `2-1+` (fumaric acid)
that matches `1+` and emits `{kind:'stereo', atom:1, sign:'+'}` — a tetrahedral-stereocentre hover on
atom 1 — and leaves the `2` as inert text. The b-layer token names a **double bond between atoms 2 and
1** with E/Z parity. The layer-wide canvas highlight (`buildHighlightSpecs` case `'b'`) is already
correct because it uses `parseBondStereoEntries`; only the sub-token path is wrong.

Separately (REVIEW.md W-01): `setInchiData` in `src/store.ts:83` resets `keyHoverKind`, `pinned`,
`inchiError` but not `hoverIdx`/`subHover`. A stale `hoverIdx` past the new layer count dims every
layer until the mouse moves.

## Environment note

Local Node is v25, whose built-in `localStorage` global shadows happy-dom's. Run every test command as
`NODE_OPTIONS=--no-experimental-webstorage npx vitest run` — without it `leaveWipe.test.ts` fails 14
tests that are unrelated to this task. Baseline: 712 tests green with that flag; `npx tsc -b` clean.

## Hard constraints (project invariants — do not break)

- Verbatim passthrough: renderers slice the stored string; `subTokenInfo` consumes ONLY already-offset
  numeric fields of `SubHover` and never re-reads layer text.
- Chemical accuracy: never present the b-layer sign as E/Z directly. It is the parity of the
  substituents under InChI's canonical neighbour numbering; for fumaric/maleic it coincides with
  E(+)/Z(−), but the card must say the sign is a canonical parity, not the E/Z descriptor itself.
- No store shape changes beyond what is listed. Never conditionally render `<Editor>`.
- Every test fixture is REAL `getInchi()` output. Fixtures for this task:
  - fumaric acid  `InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+`
  - maleic acid   `InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1-`
- Mutation-test every new guard: revert the fix (or the new branch), watch the specific test FAIL,
  restore. A test that passes for the wrong reason has bitten this project before.
- Follow `.continue-here.md` constraints: never `git checkout <file>` over uncommitted work; verify
  each commit in isolation (`git stash -u` the remainder, run `tsc -b` + the suite).

## Tasks

### Task 1 — New `bondStereo` SubHover kind, renderer, highlight, and card

**Files:** `src/lib/parseInchi.ts`, `src/lib/layerInfo.ts`, `src/lib/highlightUtils.ts`,
`src/lib/subTokenInfo.ts`, `src/components/LayerText.tsx`, `src/components/Explanation.tsx`,
`src/__tests__/LayerText.blayer.test.tsx` (new), `src/lib/__tests__/highlightUtils.test.ts`,
`src/lib/__tests__/subTokenInfo.test.ts`

**Action:**

1. `src/lib/parseInchi.ts` — add `'bondStereo'` to the `SubHover.kind` union and a documented field
   `stereoBond?: [number, number]` (GLOBAL canonicals, fragment offset already applied, in the order
   written in the InChI). Reuse the existing `sign?: string`, `fragmentOffset?`, `componentIndex?`.
2. `src/lib/layerInfo.ts` — widen `parseBondStereoEntries` regex to `/(\d+)-(\d+)([+-?])/g` so an
   unspecified (`?`) double bond is a token too. In `buildHighlightSpecs` case `'b'`
   (`src/lib/highlightUtils.ts:344`) route a non-`+`/non-`-` sign to a neutral `--c-stereo` spec
   instead of falling into the minus bucket. Keep `+` → plus, `-` → minus unchanged.
3. `src/components/LayerText.tsx` — add `BLayerText({ text, fragCounts, layerIdx, pinnedSub })`
   mirroring `ParityText`'s shape exactly: split on `;`, per-segment `renderSegment(seg, offset)`,
   cumulative `fragCounts` offset, inert text between tokens pushed as plain spans. For each
   `parseBondStereoEntries(seg)` entry emit ONE span wrapping the whole `a1-a2sign` token
   (use `matchAll` indices to slice the verbatim substring) with `className` =
   `[signClass, styles.inchiSubtoken, pinned ? styles.pinned : '']` (reuse `styles.parityPlus` /
   `styles.parityMinus`, none for `?`) and `subHoverProps(hit, layerIdx)` where
   `hit = { kind: 'bondStereo', stereoBond: [a1+offset, a2+offset], sign, fragmentOffset: offset, componentIndex: fi }`
   (omit `fragmentOffset`/`componentIndex` when there is a single fragment, matching the other
   renderers' convention). Dispatch `case 'b': return <BLayerText …/>` and leave `case 't'` on
   `ParityText`. Extend `isSubPinned` with a `bondStereo` branch comparing
   `JSON.stringify(stereoBond)`.
4. `src/lib/highlightUtils.ts` `buildSubHoverSpecs` — add `case 'bondStereo'`: map both canonicals
   through `auxMap` (return `[]` if either is missing), `struct.findBondId(kA1, kA2)`, colour
   `resolveVarFn(stripVar(parityColor(sign)))`, spec `{ atoms: [kA1, kA2], bonds: bid !== null ? [bid] : [], … }`.
   While here, replace the `!` assertions in `case 'stereo'` with explicit null guards (REVIEW W-03).
5. `src/lib/subTokenInfo.ts` — add `case 'bondStereo'` returning
   `{ title: 'Double-bond stereo', body }`. Body must state: atoms `a-off` and `b-off`
   (with `componentMarker(sub)`) are the two ends of a stereogenic double bond whose geometry is
   fixed; the sign is the parity of the substituents under InChI's canonical neighbour numbering and
   is NOT the E/Z descriptor itself (for many simple alkenes + coincides with E and − with Z, but
   that is not guaranteed); `?` means the geometry is unspecified or unknown. Keep the terse
   chemist register of the neighbouring cases; plain strings only, no HTML.
6. `src/components/Explanation.tsx` — add `bondStereo: 'b'` to `SUB_KIND_LAYER` (TypeScript will
   demand it). Confirm `swatchVar('b')` already resolves.

**Tests (write first, watch them fail, then implement):**

- `src/__tests__/LayerText.blayer.test.tsx` (copy the store mock + `lastHit()` scaffolding from
  `LayerText.clyr.test.tsx`):
  - fumaric `rawText="2-1+"`, `fragCounts=[8]`: exactly one `.inchiSubtoken` span, its text is
    `2-1+`, mouseEnter emits `{kind:'bondStereo', stereoBond:[2,1], sign:'+'}`; the digit `2` is
    inside the hoverable span (regression: it was inert). No `kind:'stereo'` hit is ever emitted.
  - maleic `rawText="2-1-"`: sign `'-'`, class `parityMinus`.
  - two-component offset: `rawText="2-1+;2-1-"`, `fragCounts=[4,4]` → second hit
    `stereoBond:[6,5]`, `fragmentOffset:4`, `componentIndex:1`.
  - pinnedSub with matching `stereoBond` adds `styles.pinned`.
- `src/lib/__tests__/highlightUtils.test.ts`: `buildSubHoverSpecs` for `bondStereo` returns both
  atoms and the bond id with the plus colour for `+`, minus for `-`; returns `[]` when an atom is
  missing from `auxMap`. Also assert `parseBondStereoEntries('2-1?')` yields sign `'?'`.
- `src/lib/__tests__/subTokenInfo.test.ts`: `bondStereo` card names both atoms, mentions the
  canonical parity, and does NOT contain the bare phrase "is E" / "is Z" as a claim; with
  `fragmentOffset` the atom numbers are de-offset for display.

**Verify:** `npx tsc -b` clean; `NODE_OPTIONS=--no-experimental-webstorage npx vitest run` green
with the new tests added. Mutation test: restore `case 'b'` to `ParityText` → the blayer test fails;
put it back.

**Done:** hovering `2-1+` in fumaric acid's `/b` layer emits a `bondStereo` sub-hover covering the
whole token, the canvas spec lights atoms 2 and 1 plus their bond in the parity colour, and the card
describes a double bond with a canonical-parity caveat.

### Task 2 — `setInchiData` resets hover state (REVIEW W-01)

**Files:** `src/store.ts`, `src/__tests__/store.test.ts`

**Action:** In `src/store.ts:83` add `hoverIdx: null, subHover: null` to the `set({...})` in
`setInchiData`. Update the comment above it to say every transient hover field is dropped on a data
transition, and why (a stale index past the new layer count dims the whole strip).

**Test:** in `store.test.ts` add "setInchiData clears a stale hoverIdx and subHover": set
`hoverIdx: 5, subHover: {kind:'element', el:'C'}` via `setState`, call `setInchiData` with a two-layer
fixture, expect both null. Mutation-test by removing the two fields and watching it fail.

**Verify:** `npx tsc -b` clean; full suite green.

**Done:** switching molecules can no longer leave the InChI strip fully dimmed.

## Commits

Two atomic commits, one per task, in the repo's imperative style (see `git log`), e.g.
`Model the b-layer token as a double bond, not a stereocentre` and
`Reset hover state when the InChI data changes`. Code only — do not commit `.planning/` files; the
orchestrator commits PLAN/SUMMARY/STATE afterwards.

## Summary requirements

Write `.planning/quick/260902-gxx-fix-the-b-layer-sub-token-model-and-rese/260902-gxx-SUMMARY.md`
with frontmatter `status: complete`, the two commit hashes, final test count, and the mutation-test
evidence (which test failed on revert).
