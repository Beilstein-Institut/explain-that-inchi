# Phase 11: Source & Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 11-Source & Wiring
**Areas discussed:** Independent failure, Segment granularity, Store field shape, Empty/invalid threshold, Malformed-key return, Hyphen representation

---

## Independent failure (key vs InChI call disagreement)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep InChI, drop key | `Promise.allSettled`: InChI renders, key strip shows placeholder; InChI never regresses from a key-only failure. | ✓ |
| Blank both together | `Promise.all` (roadmap's literal wording): either rejection blanks both via the catch path. | |

**User's choice:** Keep InChI, drop key (allSettled)
**Notes:** Intentional refinement of ROADMAP Success Criterion #3 / Invariant #4 wording ("Promise.all"). Same concurrent single-tick fetch + generationRef guard; only the degradation behavior changes. Flagged as D-02a so the planner/checker don't read it as a contradiction.

---

## Segment granularity (parseInchiKey second-block tail)

| Option | Description | Selected |
|--------|-------------|----------|
| Split flag & version | Distinct kinds: skeleton / hash / flag / version / protonation. | ✓ |
| Combine flag+version | One `flagVersion` segment; Phase 13 sub-slices within the card. | |

**User's choice:** Split flag & version
**Notes:** INKEY-12 must teach `S` vs `N` flag and version `A` distinctly in Phase 13; separate offsets make that a clean slice. Phase 12 may still visually group them.

---

## Store field shape (atomic write)

| Option | Description | Selected |
|--------|-------------|----------|
| Extend setInchiData | Trailing `inchiKey` arg + `inchiKey` field; single `set()`. Mirrors Phase 6 `hAtomPoolIds`. | ✓ |
| Separate field + action | New `setInchiKey` action called in the same tick; second `set()`. | |

**User's choice:** Extend setInchiData
**Notes:** Guarantees key and InChI can never be out of sync (Invariant #4).

---

## Empty/invalid threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse InChI empty guard | `layers.length < 2` / catch path blanks the key in the same write. | ✓ |
| Independent 27-char gate in parser | Store whatever is returned; let parser/Phase 12 judge validity. | |

**User's choice:** Reuse InChI empty guard
**Notes:** One source of truth for "empty"; no lingering stale key. Format-gating of the rendered strip remains a Phase 12 concern.

---

## Malformed-key return contract

| Option | Description | Selected |
|--------|-------------|----------|
| Empty array | Non-conforming (not 27-char) → `[]`; maps cleanly to Phase 12 placeholder. | ✓ |
| Best-effort partial segments | Return whatever can be sliced from a partial key. | |

**User's choice:** Empty array
**Notes:** Never throws (Success Criterion #5). Single validity rule, no half-rendered keys.

---

## Hyphen representation

| Option | Description | Selected |
|--------|-------------|----------|
| Content segments only | 5 content segments; Phase 12 styles fixed hyphen positions (14, 25). | ✓ |
| Emit hyphen segments too | Include `kind:'hyphen'` entries for uniform iteration. | |

**User's choice:** Content segments only
**Notes:** Hyphens are presentation (INKEY-03), not data. Parser contract stays minimal.

---

## Claude's Discretion

- Exact exported type names in `parseInchiKey.ts` (suggested `InchiKeySegmentKind` / `InchiKeySegment`).
- `allSettled` result destructuring details and ordering of the empty-canvas check, provided the single atomic write holds.
- `parseInchiKey` test fixtures (must cover valid neutral, charged/protonated, non-standard `N` flag, empty, malformed→`[]`, and a no-reassembled-text assertion).
- The store verbatim-equality test (Success Criterion #2).

## Deferred Ideas

None — discussion stayed within phase scope.
