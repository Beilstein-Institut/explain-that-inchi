# Phase 19: c-layer connection cards - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning
**Source:** Brainstorming session (2026-06-29) → design spec `docs/superpowers/specs/2026-06-29-c-layer-connection-cards-design.md`

<domain>
## Phase Boundary

Add explanation-card **copy** for the three connection-layer hover targets that Phase 15
already highlights precisely but Phase 17/18 left without a sub-token card (`subTokenInfo`
returns `null` for `'atom' | 'bond' | 'branch'`, falling through to the whole-layer card).

In scope: the `subTokenInfo` cases for atom/bond/branch, the `SubHover` field wiring needed to
carry connectivity + per-component display context, and real-fixture tests.

Out of scope: any change to the canvas highlight (Phase 15 owns it and is correct), bond-order /
hydrogen / geometry inference, element naming in cards, store/provider changes.
</domain>

<decisions>
## Implementation Decisions (locked in brainstorm)

### Card intent
- **Notation-first with a light connectivity clause** — explain the c-layer grammar, tied to the
  molecule via *which atoms connect*. Not chemistry-first; no element naming.

### What each card shows
- **Single atom** (`'atom'`): lists the canonical atoms it is bonded to (its full adjacency
  neighbour set); one-neighbour and zero-neighbour ("no bonds recorded") forms handled.
- **Hyphen** (`'bond'`): names the two canonical atoms it joins as bonded.
- **Parenthesis** (`'branch'`): describes the branch off its branch-point atom and lists the
  canonical bond pairs it encodes.

### Numbering (multi-component)
- Card numbers are shown **per-component, matching the printed string** (reset after each `;`,
  with a `(component N)` marker) — the GAP-2 precedent. `SubHover` payloads keep **global**
  canonicals so the existing highlight is unchanged (display-only de-offset, never on the
  auxMap lookup).

### Neighbour listing
- List **all** neighbours/bonds however many — accuracy over brevity (GAP-1 precedent). No
  min–max range, no truncation. Empty atom list must not render "atoms  and undefined" (also
  closes review finding WR-04 for this surface).

### Titles
- **Generic fixed titles** (`Atom`, `Bond`, `Branch`) — specifics live in the body. Harmonises
  with the whole-layer "Connection layer" title.

### Guards
- No card claims bond order, hydrogen count, or geometry.
- A hyphen is a separator between adjacent canonical numbers — bonds come from adjacency
  (`parseConnectionBonds`), not the hyphen glyph.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design
- `docs/superpowers/specs/2026-06-29-c-layer-connection-cards-design.md` — the full design: card
  copy templates, multi-component behaviour, edge cases, implementation touchpoints, test plan.

### Code (analogs & invariants)
- `src/lib/subTokenInfo.ts` — the pure module; `'atom'|'bond'|'branch'` currently return `null`;
  reuse the `atomList()` helper (de-offset + comma grammar) and the GAP-2 `componentMarker()`.
- `src/lib/parseInchi.ts` — `SubHover` type (`endpointPairs` for `'bond'`, `bondPairs` for
  `'branch'`, `fragmentOffset`/`componentIndex` for h-layer kinds); `parseConnectionBonds`,
  `tokenizeCLayerSeg`, `segmentBonds`, branch-incident-bond logic.
- `src/components/LayerText.tsx` — `ConnectionText`: builds the atom/bond/branch `SubHover`s; the
  construction sites where `cumOffset` is in scope (the GAP-2 wiring sites).
- `src/lib/__tests__/highlightUtils.test.ts` — the GAP-2 `buildSubHoverSpecs` guard pattern to
  mirror (highlight resolves via global canonicals).
</canonical_refs>

<specifics>
## Specific Ideas

- Reuse `atomList(atoms, fragmentOffset)` for both the neighbour list and the de-offset; add a
  small bond-pair list helper (`a–b, c–d and e–f`) that de-offsets each endpoint for display.
- The `'atom'` SubHover should carry its incident bond pairs (so neighbours are derivable),
  reusing the branch's incident-bond machinery.
- Test fixtures: one single-component (e.g. caffeine/alanine) and one real salt/co-crystal;
  plus a `buildSubHoverSpecs` highlight guard and an empty-atom-list guard.
</specifics>

<deferred>
## Deferred Ideas

None — the design spec covers phase scope. (WR-04, an adjacent review finding, is folded in via
the empty-atom-list guard.)
</deferred>

---

*Phase: 19-c-layer-connection-cards*
*Context gathered: 2026-06-29 via brainstorming → design spec*
