# Design: c-layer Connection Cards (single atom / hyphen / parenthesis)

**Date:** 2026-06-29
**Status:** Approved (design); pending implementation plan

## Summary

The connection (c-) layer already supports precise hover highlighting (Phase 15): hovering a
single atom number highlights that atom, a hyphen highlights the bond between its two neighbours,
and a parenthesis highlights the bonds the branch encodes. But `subTokenInfo()` returns `null` for
the `'atom' | 'bond' | 'branch'` kinds, so all three currently fall through to the generic
whole-layer **Connection layer** card.

This adds three sub-token-specific cards that explain **connectivity**, expressed purely in
canonical atom indices:

- **Single atom** → which atoms it is bonded to.
- **Hyphen** → the two atoms it joins.
- **Parenthesis / branch** → the bonds the branch encodes.

The cards are notation-first with a light structural clause. They reuse the existing card surface,
the connection-green accent, and the `atomList()` helper. No store changes; the InChI-passthrough
and no-remount invariants are untouched.

---

## Goals

- Give each c-layer hover target (`atom`, `bond`, `branch`) its own explanation card.
- State connectivity in canonical indices that **match the numbers printed in the string**
  (per-component in multi-fragment molecules, exactly like the GAP-2 h-layer fix).
- List **all** neighbours/bonds however many — accuracy over brevity (same principle as the GAP-1
  H-count fix; a truncated list is a false claim).
- Preserve the existing canvas highlight: `SubHover` payloads keep **global** canonical indices
  (the auxMap key); per-component numbers are a display-only transform.

## Non-goals

- No bond-order, hydrogen, or geometry claims — the c-layer encodes only which heavy atoms are
  bonded. Cards explicitly say so.
- No element naming (e.g. "carbon") — the cards speak in atom numbers only, per the agreed scope.
- No new highlight behaviour — highlighting is already correct from Phase 15.
- No store fields, no `<Editor>`/provider changes.

---

## Card copy

All three use **generic fixed titles** (specifics live in the body), harmonising with the
whole-layer "Connection layer" title. All numbers shown are per-component (de-offset) for display;
`(component N)` is appended only in multi-component molecules (1-based N).

### 1. Single atom — kind `'atom'`

**Title:** `Atom`

**Body (≥1 neighbour):**
> "Atom 28 is bonded to atoms 1, 9 and 27 in the heavy-atom skeleton. The connection layer lists
> which canonical atom numbers are joined — it records connectivity only, not bond order,
> hydrogens, or 3-D shape."

- One neighbour: *"Atom 4 is bonded to atom 3 …"*
- Zero neighbours (defensive; e.g. a single-atom component): *"Atom 4 has no bonds recorded in the
  connection layer."*

### 2. Hyphen — kind `'bond'`

**Title:** `Bond`

**Body:**
> "Atoms 1 and 28 are bonded — this hyphen joins the canonical numbers on either side of it. It
> records that the two atoms are connected, not the bond order."

(N\* multi-fragment: one canonical bond repeated across identical fragments — describe the single
canonical pair; the highlight already lights every instance.)

### 3. Parenthesis / branch — kind `'branch'`

**Title:** `Branch`

**Body:**
> "These parentheses are a branch hanging off atom 3, adding the bonds 3–24 and 24–11. InChI writes
> side-chains in parentheses so a branched skeleton fits on one line; after the `)` the main chain
> continues from atom 3."

The branch-point atom is the left endpoint shared by the branch's incident bonds (already computed
for the highlight). Bond pairs are rendered as `a–b` (en-dash) joined in a grammatical list.

---

## Multi-component numbering

In salts/co-crystals the c-layer numbering resets after each `;`. The `SubHover` endpoint/bond
pairs are stored as **global** canonicals (offset applied) so the canvas highlight works. For
display the card subtracts the component's `fragmentOffset` so the numbers match the string, and
appends `(component N)`.

Example — hover a hyphen in component 2 of a co-crystal whose string shows `…;1-2-6…`:
> "Atoms 2 and 6 (component 2) are bonded …"

while the highlight still resolves the correct global atoms on the canvas. Single-component
molecules have `fragmentOffset = 0`, so their cards are unchanged.

---

## Edge cases

- **High-degree atom:** list every neighbour (e.g. "bonded to atoms 2, 5, 9 and 14"). No cap.
- **Ring closures:** an atom's ring-closure partner is just another neighbour via adjacency — no
  special handling.
- **Single-atom branch** `(4)`: one incident bond; body reads "adding the bond 3–4".
- **Isolated/standalone number** (no adjacency): defensive "no bonds recorded in the connection
  layer." Not expected in practice but cheap to guard.
- **`atomList([])`** must not render "atoms  and undefined" — the empty case returns the
  no-bonds wording (also closes review finding WR-04 for this surface).

---

## Implementation touchpoints

- **`src/lib/parseInchi.ts`** — the `'atom'` `SubHover` carries its incident bond pairs (so
  neighbours are derivable, reusing the branch's incident-bond machinery); add `fragmentOffset` and
  `componentIndex` to the `'atom'`, `'bond'`, and `'branch'` kinds (currently only h-layer kinds
  carry them).
- **`src/components/LayerText.tsx`** (`ConnectionText`) — when building the atom/bond/branch
  `SubHover`s, attach the incident pairs + `fragmentOffset` + `componentIndex` at the construction
  sites where `cumOffset` is already in scope (the same sites GAP-2 used). `SubHover.atoms`/pairs
  stay GLOBAL.
- **`src/lib/subTokenInfo.ts`** — replace the `'atom' | 'bond' | 'branch'` `null` fall-through with
  three cases; reuse `atomList()` for de-offset + comma grammar; add a small bond-pair list helper
  (`a–b, c–d and e–f`) that de-offsets each endpoint for display.

## Invariants preserved

- **Highlight correctness:** payloads keep global canonicals; de-offset is display-only — proven by
  a guard test that the c-layer highlight still resolves via global indices (mirrors the GAP-2
  `buildSubHoverSpecs` guard).
- **Verbatim passthrough & no-remount:** display-only string assembly in a pure module; no canvas/
  provider/store changes.
- **No bond-order/H/geometry claims:** enforced by copy review and a test asserting the cards never
  contain "single", "double", "order", or element words.

## Testing

Real `getInchi()` fixtures only (project rule — no fabricated InChI):

- **Single-component** (e.g. caffeine or alanine): hover an atom → neighbour list correct; hover a
  hyphen → the two endpoints; hover a branch → the branch bonds; numbers match the string.
- **Multi-component** (a real salt/co-crystal): a component-2 hover shows per-component numbers +
  `(component 2)`, and a `buildSubHoverSpecs` guard proves the highlight still resolves via the
  global canonicals.
- A copy-safety test: no card body contains bond-order or element terms.
