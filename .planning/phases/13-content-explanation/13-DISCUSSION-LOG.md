# Phase 13: Content & Explanation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 13-Content & Explanation
**Areas discussed:** Standing affordance, Caveat placement, Voice & depth, Example line

---

## Standing affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Standing caption under strip | Always-visible muted line beneath the strip carrying purpose + one-way-hash gist; hover cards focus on per-block detail. | |
| Key-idle card in panel | Idle key-overview card in the shared panel; competes with the InChI idle card for the same slot. | |
| Hover-only | No standing surface; caveats live inside the segment hover cards. Zero new UI; stays within Phase 12 scaffolding. | ✓ |

**User's choice:** Hover-only.
**Notes:** Determines that all non-segment-specific caveats must be reachable from inside the hover cards (drives the next decision).

---

## Caveat placement

| Option | Description | Selected |
|--------|-------------|----------|
| Core caveat on every card + specifics anchored | Shared one-way-hash tagline on all 4 cards; block-specific points (purpose/lookup, collision, S/N+version) anchored to their natural card. | ✓ |
| Distribute once, no repetition | Each teaching point on exactly one card; less repetition but the central lesson only shows on its one card. | |

**User's choice:** Core caveat on every card + specifics anchored.
**Notes:** Guarantees the central one-way-hash lesson lands on any hover given the hover-only decision.

---

## Voice & depth

| Option | Description | Selected |
|--------|-------------|----------|
| Match LAYER_INFO terseness | 1–3 tight chemist-voice sentences per card + shared tagline; consistent with the InChI layer cards in the same panel. | ✓ |
| Slightly richer on correction cards | 3–5 sentences on the conceptual-correction cards; bulkier, less uniform. | |

**User's choice:** Match LAYER_INFO terseness.
**Notes:** Questions in this pair were re-explained at the user's request before answering (no change to options).

---

## Example line ("Reads as")

| Option | Description | Selected |
|--------|-------------|----------|
| Omit it entirely | Title + blurb only, no decode line; absence reinforces the one-way-hash lesson; Phase 12 already renders without it. | ✓ |
| Show the live slice value | Echo the segment's actual chars; just repeats the highlighted strip, risks implying decodability. | |
| Skeleton-only illustration | Only the skeleton card gets an illustration line; inconsistent per-card pattern. | |

**User's choice:** Omit it entirely.

---

## Claude's Discretion

- Exact wording of every card blurb and the shared tagline (within terseness + no-misleading-prose constraints).
- Exact card for the collision caveat (hash suggested) and one-key-per-assembly note (skeleton suggested).
- Whether to keep prose inline in `KEY_ZONE_COPY` or extract a dedicated `inchiKeyInfo.ts` module.
- Exact shape of the slice-boundary + label unit test (SC-1).

## Deferred Ideas

None — discussion stayed within phase scope. (Web/PubChem search link, charged-species preset, hash-build deep dive remain v2 per INKEY-F1/F2/F3.)
