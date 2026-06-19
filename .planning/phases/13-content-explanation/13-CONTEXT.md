# Phase 13: Content & Explanation - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Author the actual InChIKey explanation **prose** — replacing the Phase 12 placeholder text (`KEY_ZONE_COPY` in `src/components/Explanation.tsx`) with accurate, pedagogically correct content for the 4 hover zones (skeleton / hash / flagVersion / protonation). A chemist hovering any InChIKey segment must understand what that block encodes, why the key exists, and the mental-model corrections: it is a **one-way hash** — not reversible, not atom-mapped, not collision-proof — and its segments deliberately do NOT highlight atoms.

This is a **content-only** phase: the rendered card surface, hover wiring, 4-zone targeting, segment colors, copy button, and 27-char gate were all built in Phase 12. Phase 13 fills the cards with words. No new UI surface, no new store fields, no canvas behavior.

**Requirements:** INKEY-07, INKEY-08, INKEY-09, INKEY-10, INKEY-11, INKEY-12.

</domain>

<decisions>
## Implementation Decisions

### Standing affordance — none (hover-only)
- **D-01:** **No new always-visible surface.** Do NOT add a standing caption under the strip, and do NOT add a key-idle card to the shared panel. The explanation content appears only inside the per-segment hover cards that Phase 12 already built. Zero new UI; stays exactly within the existing scaffolding. *Consequence captured in D-02:* because there is no standing surface, the central one-way-hash lesson must be reachable from any hover.

### Caveat placement — core caveat everywhere, specifics anchored
- **D-02:** **Every key card carries a short shared one-way-hash tagline** (the gist of INKEY-09: a one-way hash — can't be decoded back to the structure or mapped to atoms, which is why these segments don't highlight). This guarantees the milestone's central lesson lands on *any* segment hover, not just one.
- **D-03:** **Block-specific points are anchored to their natural card:**
  - **skeleton** card — block structure (14-char connectivity/skeleton hash, INKEY-07) + the purpose statement (fixed 27-char, web/database-search-friendly hashed form of the InChI, INKEY-08) + same-connectivity→same-first-block as the basis for InChIKey lookup (INKEY-11).
  - **hash** card — block structure (8-char remaining-layers hash: stereo/isotope/proton, INKEY-07) + the collision caveat (improbable but theoretically possible; for lookup/indexing, not proof of identity, INKEY-10). *(Exact home of the collision caveat — skeleton vs hash card — is Claude's discretion; hash is the suggested anchor.)*
  - **flagVersion** card — distinguishes standard (`S`) vs non-standard (`N`) flag AND the version character (`A` = InChIKey v1), beyond merely labelling the segment (INKEY-12, INKEY-07).
  - **protonation** card — the single protonation char (INKEY-07) + the shared tagline.
- **D-04:** **One-key-per-assembly** (a multi-component/salt structure yields a single key for the whole drawn assembly — no per-fragment keys) is stated where it reads naturally — suggested on the skeleton card alongside the purpose/lookup framing. Exact card is Claude's discretion.

### Voice & depth — match existing layer cards
- **D-05:** **Match `LAYER_INFO` terseness:** 1–3 tight chemist-voice sentences per card plus the shared tagline (D-02). Visually consistent with the InChI layer cards in the same panel slot; fits the fixed card size. The mental-model corrections are stated plainly, not expanded into paragraphs. No richer/longer "correction card" treatment.

### Example / "Reads as" line — omit
- **D-06:** **Key cards show title + blurb only — no "Reads as"/decode line.** An InChIKey segment is a hash with no canonical decode, so there is nothing to read it as; the *absence* of the line quietly reinforces the one-way-hash lesson. Phase 12 already renders the key-segment card branch WITHOUT the example block (`src/components/Explanation.tsx` key branch has no `layerEg`), so this requires no scaffolding change. Do NOT echo the live slice value and do NOT add a skeleton-only illustration line.

### Hard content constraints (carry from milestone invariants)
- **D-07:** **No prose may imply reversibility, atom-mapping, or guaranteed uniqueness** (INKEY-09/10, SC-5). Every phrasing choice must respect this — the key is for lookup/indexing, never proof of identity, and never a route back to the structure.
- **D-08:** **Verbatim/no-reconstruction is unaffected** — this phase touches prose only; it must not introduce any code that re-joins or reconstructs the key from segments (Invariant #1).

### Claude's Discretion
- Exact wording of every card blurb and the shared tagline (within D-05 terseness and D-07 constraints).
- Whether the shared tagline is a literal repeated string constant or composed per card (as long as the gist appears on each).
- Exact card for the collision caveat (D-03: hash suggested) and the one-key-per-assembly note (D-04: skeleton suggested).
- Whether to keep the prose inline in `Explanation.tsx`'s `KEY_ZONE_COPY` or extract a dedicated `src/lib/inchiKeyInfo.ts` module (parallel to `layerInfo.ts`) — a structural choice for the planner. Either is acceptable; extraction is cleaner and testable in isolation but not required.
- The slice-boundary + label unit test that pins offsets/labels (SC-1) — its exact shape is the planner's call; offsets already live in `parseInchiKey.ts`.

### Verification notes for the planner
- A unit test should pin each zone's label/title against the segment offsets so prose can't silently drift from the block it describes (SC-1).
- The standard/neutral preset keys (flag `S`, version `A`, protonation `N`) are the live reference for examples in copy review.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope & contract
- `.planning/ROADMAP.md` § "Phase 13: Content & Explanation" — goal + 5 success criteria (SC-1 per-segment block structure + slice-boundary/label test, SC-2 purpose, SC-3 one-way-hash + no-atom-highlight + collision caveat, SC-4 skeleton→lookup + flag/version detail, SC-5 one-key-per-assembly + no reversibility/mapping/uniqueness prose).
- `.planning/ROADMAP.md` § "Cross-Cutting Invariants" — #1 verbatim passthrough (this phase must not introduce reconstruction), #2 no canvas highlighting from key segments (the *content* must teach that the absence is intentional, INKEY-09).
- `.planning/REQUIREMENTS.md` § "v1.3 Requirements" — INKEY-07 (block structure), INKEY-08 (purpose), INKEY-09 (one-way hash / not reversible / not atom-mappable / no highlight), INKEY-10 (collision caveat), INKEY-11 (skeleton→lookup), INKEY-12 (S/N flag + version A). Also the Out-of-Scope rows (no canvas highlight on key hover; no decode/reconstruct from a pasted key) — these are the rationale behind D-07.

### Project decisions
- `.planning/PROJECT.md` § "Key Decisions" + § "Current Milestone" — milestone framing ("the key is a one-way hash; its segments do NOT highlight canvas atoms").
- `.planning/STATE.md` § "v1.3 Key Decisions" — verbatim passthrough, no-canvas-highlight rationale, segment layout/offsets, multi-component one-key.

### Phase 12 contract (direct upstream — the surface being filled)
- `.planning/phases/12-render-layout/12-CONTEXT.md` — D-03/D-04 (shared `Explanation` panel renders key cards via `keyHoverKind`, NOT a standalone surface), D-07/D-08 (4 hover zones; flag+version combined into one card covering both `S/N` and version `A` → satisfies INKEY-12 in one card).

### Existing code (the content surface + the authoring model to mirror)
- `src/components/Explanation.tsx` — `KEY_ZONE_COPY` (lines ~27–32): the placeholder `{ label, title, body }` records for the 4 zones (`skeleton`, `hash`, `flagVersion`, `protonation`) that Phase 13 replaces. The key branch renders `label`/`title`/`body` as **React text children** (no `dangerouslySetInnerHTML`) — keep prose as plain text, no HTML markup. `KEY_ZONE_ACCENT` (color per zone) stays as-is.
- `src/lib/layerInfo.ts` — `LAYER_INFO` is the voice/length model to match (D-05): terse `title` + 1–3-sentence `blurb`. If a dedicated `inchiKeyInfo.ts` is extracted, mirror this shape.
- `src/lib/parseInchiKey.ts` — segment offsets/kinds the prose describes (skeleton 0–14, hash 15–23, flag 23–24, version 24–25, protonation 26–27); source of truth for the slice-boundary/label test (SC-1).
- `src/components/InchiKeySection.tsx` — `SEGMENT_ZONE` mapping (flag+version → one `flagVersion` zone) confirms the 4-card structure the prose must fill.

No external specs/ADRs — all requirements captured in the `.planning/` docs and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`KEY_ZONE_COPY` in `Explanation.tsx`** — the exact 4-zone `{ label, title, body }` structure to fill; placeholder text already wired and rendering. Phase 13 may edit it in place or relocate it to a new `inchiKeyInfo.ts` (Claude's discretion, D-decisions).
- **`LAYER_INFO` in `layerInfo.ts`** — the canonical voice/length reference; reuse its register and terseness for the key prose.

### Established Patterns
- Explanation content is data (records of strings), consumed by the `Explanation` component — Phase 13 is editing data, not behavior.
- Key-segment card prose is rendered as plain React text children (no HTML/`dangerouslySetInnerHTML`) — write prose accordingly; no markup tricks.
- Layer content has a companion unit test (`src/lib/__tests__/layerInfo.test.ts`) — the analog for pinning key labels/offsets (SC-1).

### Integration Points
- `src/components/Explanation.tsx` — the only render site; key cards already appear when `keyHoverKind` is set (4 zones). No wiring changes needed for content.
- If extracted: new `src/lib/inchiKeyInfo.ts` + `src/lib/__tests__/inchiKeyInfo.test.ts`, imported by `Explanation.tsx`.

### Guardrails (do not violate)
- **Content-only** — do NOT add store fields, UI surfaces, canvas behavior, or highlight wiring. The key segments must remain non-highlighting (Invariant #2); the prose must *explain* that absence, never undo it.
- **No reconstruction** — no code that re-joins/derives the key from segments (Invariant #1, D-08).
- **No misleading prose** — never imply the key is reversible, atom-mappable, or guaranteed unique (D-07, SC-5).
- Existing InChI layer cards and their tests stay green — the key branch is additive.

</code_context>

<specifics>
## Specific Ideas

- **Shared tagline gist** (on every card, D-02): "A one-way hash — it can't be decoded back to the structure or mapped to atoms, which is why these segments don't highlight." (Exact wording Claude's discretion; this is the target meaning.)
- **Purpose statement** (skeleton card, INKEY-08): a fixed 27-character, web/database-search-friendly hashed form of the InChI.
- **Skeleton lookup point** (INKEY-11): molecules sharing the same connectivity share this first 14-char block — the basis for InChIKey database/web search.
- **Collision caveat** (INKEY-10): collisions are improbable but theoretically possible, so the key is for lookup/indexing, not proof of identity.
- **Flag/version** (INKEY-12): `S` = standard InChI, `N` = non-standard; `A` = InChIKey version 1.
- **One-key-per-assembly**: a salt / multi-component structure yields one key for the whole drawn assembly — no per-fragment keys.
- Reference key for examples (standard neutral preset): `…-…SA-N` (flag `S`, version `A`, protonation `N`).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Web/PubChem search link, charged-species preset, hash-build deep dive remain v2 per INKEY-F1/F2/F3.)

</deferred>

---

*Phase: 13-Content & Explanation*
*Context gathered: 2026-06-19*
