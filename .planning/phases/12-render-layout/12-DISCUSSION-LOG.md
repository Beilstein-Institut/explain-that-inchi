# Phase 12: Render & Layout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 12-Render & Layout
**Areas discussed:** Segment colors, Explanation card location, Placement & label, Single-char hover zones, Distinguishing affordance, Empty-state text, Copy button extraction, Hover transitions/dimming

---

## Segment colors — color source

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse InChI tokens | Map each segment to an existing layer token (skeleton→conn, hash→stereo, flag/version→version, protonation→proton); zero new tokens | ✓ |
| New dedicated palette | Add new `--c-key-*` tokens to signal "this is a hash, not the InChI" | |
| You decide | Claude picks the most consistent mapping | |

**User's choice:** Reuse InChI tokens
**Notes:** Reinforces the conceptual link between key blocks and InChI layers.

## Segment colors — 1-char segment look

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct color each | flag/version/protonation each get their own color; all 5 segments granular | ✓ |
| Muted / shared tone | Vivid hash blocks, quieter shared tone for the three 1-char chars | |
| You decide | Pick during planning for legibility | |

**User's choice:** Distinct color each

---

## Explanation card location

| Option | Description | Selected |
|--------|-------------|----------|
| Self-contained in section | Local card inside InchiKeySection, decoupled from the Zustand panel | |
| Extend shared panel | Reuse the existing Explanation panel to also show key-segment cards | ✓ |
| You decide | Favor decoupling and the no-canvas-highlight invariant | |

**User's choice:** Extend shared panel
**Notes:** Surfaced the Invariant #2 subtlety — the panel reads Zustand, but key hover must not touch `setHover`/`setSubHover`. Resolved via follow-up below.

### Follow-up — hover wiring (raised because "extend shared panel" touches Invariant #2)

| Option | Description | Selected |
|--------|-------------|----------|
| New separate Zustand field | Dedicated `keyHoverKind` field NOT wired to `useKetcherHighlights`; panel reads it; never `setHover`/`setSubHover` | ✓ |
| Reconsider — self-contained card | Render the key card locally from useState instead | |
| You decide | Both must preserve "no setHover/setSubHover from key segments" | |

**User's choice:** New separate Zustand field
**Notes:** This is the only safe way to extend the shared panel while keeping Invariant #2 (key segments never highlight atoms) intact.

---

## Placement & label — placement

| Option | Description | Selected |
|--------|-------------|----------|
| Between InChI & Explanation | KetcherPanel → InchiSection → InchiKeySection → Explanation | ✓ |
| After Explanation | Key strip at the very bottom, below the explaining panel | |
| You decide | Pick during planning | |

**User's choice:** Between InChI & Explanation

## Placement & label — label row

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, labeled | Add an 'INCHIKEY' section-label row (the unused `.sectionLabel` style) | |
| No label | Match the current InChI strip (no label row) | ✓ |
| You decide | Keep the two strips consistent | |

**User's choice:** No label
**Notes:** Strip identified instead by a dimmed inline prefix + distinct colors + the card (see Distinguishing affordance).

---

## Single-char hover zones

| Option | Description | Selected |
|--------|-------------|----------|
| Group flag+version | flag+version share one hover zone/card; protonation separate → 4 zones | ✓ |
| One zone per char | All 5 segments independent hover targets (three fiddly 1-char targets) | |
| You decide | Balance ergonomics vs Phase 13 per-segment teaching | |

**User's choice:** Group flag+version
**Notes:** Parser data stays 5-segment granular; only hover targeting groups flag+version. Combined card covers both flag (S/N) and version (A) — satisfies INKEY-12 in one card.

---

## Distinguishing affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Dimmed inline prefix | Render a dimmed ink-faint 'InChIKey' prefix, mirroring the InChI strip's 'InChI=' | ✓ |
| Color + card only | No prefix; rely on segment colors + the explanation card | |
| You decide | Keep consistent with the InChI strip's prefix | |

**User's choice:** Dimmed inline prefix

---

## Empty-state text

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror InChI empty strip | Always render the box dimmed (`data-empty`) with a parallel hint | ✓ |
| Hide entirely when empty | Render nothing until a valid 27-char key exists | |
| You decide | SC-4 requires same placeholder treatment as empty InChI strip | |

**User's choice:** Mirror InChI empty strip
**Notes:** Hint: "Draw a molecule above to see its InChIKey." Aligns directly with SC-4.

---

## Copy button extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Extract shared hook | Pull copied-state + mountedRef + 3s-reset into a shared useCopyButton hook | |
| Duplicate inline | Copy the proven InchiSection pattern into InchiKeySection verbatim | ✓ |
| You decide | Weigh DRY vs not disturbing the green InchiSection | |

**User's choice:** Duplicate inline
**Notes:** Zero risk to the existing green InchiSection; "leaf sibling, don't touch what works" (SC-5).

---

## Hover transitions / dimming

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror exactly | Same 160ms transition, 0.35 sibling opacity, same chip padding/radius | ✓ |
| You decide | Match InChI strip by default; adjust only if a value reads poorly | |

**User's choice:** Mirror exactly

---

## Claude's Discretion

- Exact `keyHoverKind` field name and value encoding (per-kind vs per-hover-zone).
- Exact token-per-segment-kind mapping within the existing palette (legibility refinement).
- Exact prefix text/punctuation (`InChIKey` vs `InChIKey:`).
- Shared-panel precedence rule between `keyHoverKind` and `hoverIdx`.
- Whether the combined flag+version card and protonation card share rendering scaffolding.

## Deferred Ideas

None — discussion stayed within phase scope.
