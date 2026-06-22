# Phase 16: Pin-to-freeze highlights and guided Help tour - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 16-pin-to-freeze-highlights-and-guided-help-tour
**Areas discussed:** Tour implementation approach, Empty-canvas preset choice, Pinned visual treatment, Pin discoverability

> An approved design spec (`docs/superpowers/specs/2026-06-22-pin-freeze-and-help-tour-design.md`)
> already locked the interaction model, store shape, wiring, 8 tour steps, and close behavior.
> This discussion resolved only the four choices the spec intentionally left open.

---

## Tour implementation approach

| Option | Description | Selected |
|--------|-------------|----------|
| Custom HelpTour.tsx | In-house: full-viewport dimmer, spotlight cutout via getBoundingClientRect, callout card with side-selection, Back/Next/Close + counter. Zero new deps, full styling control. | ✓ |
| Use a tour library | react-joyride / driver.js / shepherd. Faster to wire, but a new runtime dep (against lean-deps stance) and styling friction with the oklch token system. | |

**User's choice:** Custom HelpTour.tsx (Recommended)
**Notes:** Honors the project's strict minimal-dependency philosophy (only ketcher + react + zustand) and the spec's implied custom build.

---

## Empty-canvas preset choice

| Option | Description | Selected |
|--------|-------------|----------|
| L-Alanine | C₃H₇NO₂. Small but rich: c-, h-, AND a stereo layer — shows multiple colours. | |
| Ethanol | C₂H₆O. Simplest molecule with a real connectivity layer; fewer colours. | |
| Vanillin | C₈H₈O₃. Ring + substituents; more c/h-layer content, no stereo. | |
| Caffeine (free text) | C₈H₁₀N₄O₂, SMILES CN1C=NC2=C1C(=O)N(C(=O)N2C)C. Iconic fused-ring molecule; rich c/h layers, no stereo. | ✓ |

**User's choice:** Caffeine (typed via "Other")
**Notes:** User prioritized a recognizable, iconic molecule over the richer-stereo Alanine. Accepted trade-off: no stereo (t/m) layer colour appears, but c/h layers populate the "each colour is different information" step. Caffeine stays on the canvas after the tour closes.

---

## Pinned visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Ring/outline + keep hover fill | Pinned chunk keeps hover background tint AND gains a persistent outline/ring in the layer colour. Layers on existing hover styling. | ✓ |
| Solid underline | Bottom border/underline in layer colour. Subtler, easier to miss on dense strips. | |
| Inverted/filled swatch | Solid filled background with contrasting text. Boldest, but heavy and clashes with colour-coded reading. | |

**User's choice:** Ring/outline + keep hover fill (Recommended)
**Notes:** Must read as "locked," not "hovering." Ring is the deliberate differentiator on top of the retained hover fill.

---

## Pin discoverability

| Option | Description | Selected |
|--------|-------------|----------|
| Cursor affordance + while-pinned hint | cursor:pointer on chunks + spec's release hint only while pinned + tour step. No persistent clutter. | ✓ |
| Always-visible micro-hint | Persistent "click a chunk to freeze it" near the strip. More discoverable, adds permanent text. | |
| Rely on tour only | No extra affordance; discovery via the Help tour's pinning step only. Cleanest strip, easiest to miss. | |

**User's choice:** Cursor affordance + while-pinned hint (Recommended)
**Notes:** Keeps the colour-coded strip uncluttered when nothing is pinned; tour step 5 teaches pinning explicitly.

---

## Claude's Discretion

- Exact ring/outline geometry, colour-derivation, and CSS mechanism for the pinned style.
- Exact copy and DOM placement of the while-pinned release hint; per-step tour callout copy (spec provides baseline titles/intents).
- Spotlight cutout technique and callout side-selection geometry.
- Add/remove mechanics for the "click anywhere unfreezes" document/window listener (active only while pinned).
- Typing for the `pinned` shape — follow spec's `{ idx; sub: SubHover | null } | null`.

## Deferred Ideas

- Multi-pin / compare mode — out of scope per spec.
- Pin persistence across reset or molecule change — out of scope per spec.
- "Tour already seen" persistence / auto-open on first visit — out of scope per spec; possible later enhancement.
- Animated tour transitions beyond simple repositioning — nice-to-have.
- Always-visible "click to freeze" micro-hint — considered and rejected (D-04); could revisit if pinning proves under-discovered.
