# Phase 17: Sub-token copy core (element table + pure module + tests) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 17-sub-token-copy-core-element-table-pure-module-tests
**Areas discussed:** Element table scope, Card voice & length, reading? line, Stereo /m /s depth, Test fixture molecules, Mobile-H count phrasing, Element card fragment scoping, H-count range phrasing, Card titles, Hill-order note, Element-table test guard, Stereocenter framing

---

## Element table scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full 118 + D/T | All 118 IUPAC elements plus deuterium/tritium pseudo-symbols | ✓ |
| Full 118, no D/T | All 118, skip isotope pseudo-symbols | |
| Common ~40 | Organic + bioinorganic subset only | |

**User's choice:** Full 118 + D/T (120 entries total)

## Spelling convention

| Option | Description | Selected |
|--------|-------------|----------|
| IUPAC 2005 | sulfur / aluminium / caesium (matches existing 'sulfur') | ✓ |
| US English | sulfur / aluminum / cesium | |

**User's choice:** IUPAC 2005

---

## Card voice & length

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing terse register | 1–3 sentences, layer-card voice | |
| Slightly richer (4–5 sentences) | More room for the new teaching surface | ✓ |

**User's choice:** Slightly richer (4–5 sentences)

## Caveat vs length

| Option | Description | Selected |
|--------|-------------|----------|
| Caveat always wins | Trim prose, never the caveat | ✓ |
| Hard 3-sentence cap | Compress caveats to fit | |

**User's choice:** Caveat always wins

---

## reading? line

| Option | Description | Selected |
|--------|-------------|----------|
| Omit for now (body only) | reading undefined; field kept in type | ✓ |
| Emit where it adds value | reading on element/hAtoms cases | |
| Emit for all four kinds | reading on every kind | |

**User's choice:** Omit for now (body only)

---

## Stereo /m /s depth

| Option | Description | Selected |
|--------|-------------|----------|
| One-line pointer | parity≠R/S + one sentence on /m /s | ✓ |
| Brief gloss of each | Short clause for /m and /s each | |
| Pointer + note these are separate layers | Pointer + "their own future cards" | |

**User's choice:** One-line pointer

## Stereo sign

| Option | Description | Selected |
|--------|-------------|----------|
| State the hovered sign | Use SubHover.sign concretely | ✓ |
| Sign-agnostic | Explain +/- in general | |

**User's choice:** State the hovered sign (while hammering parity≠R/S)

---

## Test fixture molecules

| Option | Description | Selected |
|--------|-------------|----------|
| Alanine + a salt | Alanine workhorse + one multi-fragment salt | |
| Alanine + salt + ciprofloxacin | Adds complex multi-element formula + F | ✓ |
| I'll name the molecules | User-specified | |

**User's choice:** Alanine + salt + ciprofloxacin
**Notes:** All fixtures must be real getInchi() output (v1.4 fabricated-fixture lesson). Exact salt confirmed at planning.

---

## Mobile-H count phrasing

| Option | Description | Selected |
|--------|-------------|----------|
| No count — 'a proton is shared' | Reuse parser unchanged | ✓ |
| State the count | New Hn parse required | |

**User's choice:** No count — "a proton is shared"

---

## Element card fragment scoping

| Option | Description | Selected |
|--------|-------------|----------|
| Note 'in this component' | Explicit fragment framing when canonRange present | ✓ |
| Name + count only | No fragment framing | |

**User's choice:** Note "in this component"

---

## H-count range phrasing

| Option | Description | Selected |
|--------|-------------|----------|
| Collective phrasing | "atoms 1–6 each bear one hydrogen" | ✓ |
| Per-atom listing | Each atom listed individually | |

**User's choice:** Collective phrasing

---

## Card titles

| Option | Description | Selected |
|--------|-------------|----------|
| Descriptive + symbol | "Carbon (C)" / "Tetrahedral stereocenter" | ✓ |
| Terse label | "Element: C" / "Stereocenter" | |

**User's choice:** Descriptive + symbol

---

## Hill-order note

| Option | Description | Selected |
|--------|-------------|----------|
| Only on C and H | Note only where Hill order is relevant | ✓ |
| Every element card | Uniform but repetitive | |

**User's choice:** Only on C and H

---

## Element-table test guard

| Option | Description | Selected |
|--------|-------------|----------|
| All of these | case-exact + K=potassium + D/T present + count==120 | ✓ |
| Spot-checks only | A few representative assertions | |

**User's choice:** All of these

---

## Stereocenter framing

| Option | Description | Selected |
|--------|-------------|----------|
| Assume chemist reader | No intro to what a stereocenter is | |
| One-line primer | Short clause for students | ✓ |

**User's choice:** One-line primer

---

## Claude's Discretion

- Exact salt molecule for the multi-fragment fixture (methylamine hydrochloride recommended).
- `subTokenInfo()` function signature / how element symbols are threaded.
- Precise per-card wording within the locked rules (verified at Phase 18 human chemical-accuracy gate).

## Deferred Ideas

- Per-element trivia (atomic number, group, mass) — out of scope.
- Mobile-H proton count parsing — deferred unless a card states a count.
- reading? lines for sub-tokens — field retained, unused this milestone.
- CIP R/S descriptors — out of scope (InChI does not compute CIP).
