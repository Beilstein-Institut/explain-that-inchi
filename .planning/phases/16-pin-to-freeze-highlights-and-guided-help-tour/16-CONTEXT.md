# Phase 16: Pin-to-freeze highlights and guided Help tour - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Two self-contained, additive user-facing features for *Explain that InChI*:

1. **Click-to-pin (freeze) highlights** — clicking an InChI chunk (layer OR sub-token)
   freezes its highlight + explanation so the user can inspect the molecule canvas
   without the highlight vanishing. Today highlights are purely transient (appear on
   `mouseenter`, vanish on `mouseleave`).
2. **Guided Help tour** — a new **Help** button next to **Reset** launches a stepped,
   spotlight-style overlay tour that points at each real region of the UI and explains
   what it does, including the new pin feature.

The complete, approved design (interaction model, store shape, wiring, 8 tour steps,
close behavior, out-of-scope items) is locked by the design spec — see
`<canonical_refs>`. This discussion only resolves the four choices that spec left open.

**In scope:** pin state + gating + visual cue + release hint; custom Help tour overlay
with spotlight anchoring, 8 steps, empty-canvas preset auto-load.
**Out of scope (from spec):** multi-pin / compare mode; pin persistence across reset or
molecule change; "tour already seen" persistence / auto-open on first visit; animated
tour transitions beyond simple repositioning. **The verbatim InChI string is never
re-rendered or re-joined — pinning/clicking must not alter the displayed string text.**

</domain>

<decisions>
## Implementation Decisions

### Tour implementation approach (PIN-TOUR)
- **D-01:** Build the tour as a **custom `src/components/HelpTour.tsx`** (+ module CSS) with
  **zero new runtime dependencies**. No third-party tour library (react-joyride / driver.js /
  shepherd). Rationale: the project's dependency tree is deliberately minimal (only
  `ketcher-*`, `react`, `zustand`), the design spec already specifies a custom build, and a
  library would have to be re-styled to match the oklch CSS-variable token system. Use a
  full-viewport dimmer, a spotlight cutout positioned from the target's
  `getBoundingClientRect()`, a callout card that picks a side (above/below/beside) based on
  available space, and Back / Next / Close controls + a step counter — all per spec.

### Empty-canvas auto-load preset (TOUR-PRESET)
- **D-02:** When Help opens on an **empty canvas**, auto-load **Caffeine**
  (`id: 'caffeine'`, SMILES `CN1C=NC2=C1C(=O)N(C(=O)N2C)C`) so every tour step points at
  real content (multi-layer InChI string, InChIKey, legend all populated). The auto-loaded
  Caffeine **stays** on the canvas after the tour closes (does not revert to empty) so the
  user can immediately try hovering and pinning. If a molecule is already present, Help uses
  it as-is and loads nothing.
- **Note:** Caffeine has no stereocenters, so the stereo (`t`/`m`) layer colour will not
  appear; its connectivity (`c`) and hydrogen (`h`) layers give the "each colour is a
  different kind of information" step (step 3) ample content. This was an accepted trade-off
  for using an iconic, recognizable molecule.

### Pinned visual treatment (PIN-STYLE)
- **D-03:** A pinned (frozen) chunk **keeps its transient hover background fill AND gains a
  persistent outline/ring** (e.g. a `box-shadow` ring in the layer's colour) so it is
  unmistakably "locked" versus a passing hover. Layered on top of existing hover styling —
  visually distinct from both idle and transient-hover states. (Rejected: solid-underline
  only — too easy to miss on densely-coloured strips; inverted/filled swatch — too heavy,
  clashes with the colour-coded reading of the string.)

### Pin discoverability (PIN-DISCOVER)
- **D-04:** Discoverability outside the tour = **cursor:pointer affordance on clickable
  chunks** (alongside the existing hover affordance) signalling clickability, PLUS the
  spec's **inline release hint shown only while pinned** ("Pinned — click anywhere or press
  Esc to release."), PLUS the **tour's pinning step (step 5)** teaching it explicitly. **No
  always-visible micro-hint** is added — the colour-coded strip stays uncluttered when
  nothing is pinned.

### Claude's Discretion
- Exact ring/outline geometry, colour-derivation, and CSS mechanism for the pinned style
  (D-03) — within "outline/ring + retained hover fill".
- Exact copy and DOM placement of the while-pinned release hint, and the callout copy for
  each tour step (spec provides the 8 step titles/intents as the baseline).
- The spotlight cutout technique (CSS clip-path / box-shadow halo / overlay-with-hole) and
  callout side-selection geometry — implementation detail per spec's anchoring section.
- How the "click anywhere unfreezes" document/window listener is added/removed (must be
  active ONLY while pinned, removed on unpin, per spec risk note).
- New `SubHover`-adjacent typing for the `pinned` shape — follow spec's
  `{ idx: number; sub: SubHover | null } | null`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (locked — MUST read first)
- `docs/superpowers/specs/2026-06-22-pin-freeze-and-help-tour-design.md` — the approved,
  comprehensive design: exact pin interaction model, granularity (layer + sub-token),
  store shape (`pinned` field + `setPinned`/`clearPinned`, gate `setHover`/`setSubHover`,
  clear in `resetAll`), wiring per file, visual cue, the 8 tour steps in order, anchoring
  via `getBoundingClientRect()`, empty-canvas preset handling, close mechanisms, out-of-scope
  list, testing notes, and risks. **This is the contract — these CONTEXT decisions only
  fill its four intentionally-open choices.**

### Requirements / roadmap
- `.planning/ROADMAP.md` §"Phase 16: Pin-to-freeze highlights and guided Help tour" — goal,
  `Depends on: Phase 15`. (Phase requirements are TBD/unmapped in ROADMAP.)

### Files to be touched (from spec's Components & Files table)
- `src/store.ts` — add `pinned` + `setPinned`/`clearPinned`; gate `setHover`/`setSubHover`;
  clear `pinned` in `resetAll`. (Current store has `hoverIdx`, `subHover`, `resetAll`
  atomic-reset pattern — see lines 75–92.)
- `src/components/InchiSection.tsx` — layer-level `onClick` → pin/unpin.
- `src/components/LayerText.tsx` — sub-token `onClick` → pin/unpin (mirrors existing
  `subHoverProps` factory at LayerText.tsx:22).
- `src/hooks/useKetcherHighlights.ts` — prefer `pinned` over live hover when set.
- `src/components/Explanation.tsx` — read `pinned` with existing precedence logic.
- `src/styles.css` (+ relevant module) — pinned chunk style (D-03); while-pinned hint (D-04).
- `src/components/KetcherPanel.tsx` — new `.help-trigger` button + `onHelpClick` prop,
  in `section-label-actions` next to `.reset-trigger` (existing pattern at
  KetcherPanel.tsx:33–44; `onResetClick`/`onFeedbackClick` are the prop precedent).
- `src/components/HelpTour.tsx` (**new**) + module CSS — the custom stepped spotlight overlay.
- `src/App.tsx` — owns tour open/close state; `onHelpClick` callback (same pattern as
  `onResetClick` at App.tsx:251 / `handleReset` at ~107); auto-load Caffeine preset when
  canvas empty (reuse the existing `setMolecule` / preset-load path in
  `handleMolSelectLogic`).

### Project invariants
- `CLAUDE.md` — tech stack, no-backend, lean-deps ("What NOT to Use"), fidelity constraints
  (oklch token system, IBM Plex typography). D-01 (no tour library) honors the lean-deps stance.
- Memory `feedback_inchi_passthrough`: NEVER reconstruct/re-join the InChI string — display
  Ketcher's verbatim output. Pinning/clicking must not re-render or alter the displayed string.

### Data
- `src/data/molecules.ts` — `MOLECULES` preset list; `caffeine` entry (line 24) is the
  D-02 auto-load target.

### Tests to mirror
- Per spec's Testing section: store-level pin state-machine tests; `useKetcherHighlights`
  precedence (pinned vs hover); HelpTour step/close/empty-canvas-preset tests.
- Use **real InChI fixtures** (not fabricated layer text) per project convention
  (memory `feedback_real_domain_fixtures_and_gates`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resetAll()` in `src/store.ts` (lines 81–92): atomic single-`set()` reset of all fields —
  extend to also clear `pinned`. Do NOT call other actions from it (Zustand 5 anti-pattern,
  already noted in-file).
- `subHoverProps` factory (LayerText.tsx:22) and the layer/sub-token hover wiring: the
  click handlers attach alongside these.
- KetcherPanel `.reset-trigger` / `.feedback-trigger` buttons + `onResetClick`/`onFeedbackClick`
  props (KetcherPanel.tsx): exact precedent for the new `.help-trigger` + `onHelpClick`.
- `handleReset` / `setMolecule('')` / preset-load path in `App.tsx`: precedent for App-owned
  callbacks and for programmatic preset loading (the empty-canvas Caffeine auto-load).

### Established Patterns
- Store reads via selectors (`useInchiStore(s => s.field)`); dispatch without subscribing via
  `useInchiStore.getState().action()` (used in App.tsx). Pin reads/writes follow this.
- App owns cross-component UI state (reset, feedback dialog) and passes callbacks down —
  tour open/close state follows the same ownership model.
- Highlights flow: hover/sub-hover state → `useKetcherHighlights` → spec-building → Ketcher
  API. The pin gate sits at the store (`setHover`/`setSubHover` no-op while pinned) — single
  enforcement point per spec.

### Integration Points
- Pin: `InchiSection`/`LayerText` onClick → store `setPinned`/`clearPinned` → store gates
  hover → `useKetcherHighlights` derives from `pinned` → Ketcher; `Explanation` reads `pinned`.
- Tour: `KetcherPanel` Help button → `App` tour state → `HelpTour` overlay anchors to real
  regions via refs / `data-tour-id` + `getBoundingClientRect()`; empty canvas → App loads
  Caffeine via existing preset path.

</code_context>

<specifics>
## Specific Ideas

- Auto-load molecule is **Caffeine** specifically (user's explicit pick over the
  richer-stereo Alanine option) — recognizability prioritized over showing every layer colour.
- Consistent with the project's strict minimal-dependency philosophy: the tour adds **no**
  new package; it is built from the existing React + CSS-variable token system.
- Pin cue must read as "locked," not "hovering" — outline/ring is the deliberate
  differentiator on top of the retained hover fill.

</specifics>

<deferred>
## Deferred Ideas

- Multi-pin / compare mode (freeze more than one target at once) — out of scope per spec.
- Pin persistence across reset or molecule change — out of scope per spec.
- "Tour already seen" persistence / auto-open the tour on first visit — out of scope per
  spec; a possible later enhancement.
- Animated tour transitions beyond simple repositioning — nice-to-have, not required.
- Always-visible "click to freeze" micro-hint on the strip — considered for discoverability
  (D-04) and rejected to keep the strip uncluttered; could revisit if usage shows pinning is
  under-discovered.

</deferred>

---

*Phase: 16-pin-to-freeze-highlights-and-guided-help-tour*
*Context gathered: 2026-06-22*
