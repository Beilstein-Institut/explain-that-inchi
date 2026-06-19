# Phase 15: C-layer hover precision - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 15-c-layer-hover-precision
**Areas discussed:** Atom hover, Hyphen, Paren scope, Paren pair

---

## Atom hover (CLYR-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Atom only, no bonds | Matches CLYR-01 exactly; drops current incident-bond highlight | ✓ |
| Atom + a subtle bond hint | Strong atom highlight + faint incident bonds | |
| Keep atom + incident bonds | Current behavior; would contradict CLYR-01 | |

**User's choice:** Atom only, no bonds
**Notes:** Confirms the deliberate behavior change from the current `buildSubHoverSpecs` atom case (atom + incident bonds → atom only).

---

## Hyphen (CLYR-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Bond only | Strict reading; highlight just the joining bond | ✓ |
| Bond + its two endpoint atoms | Bond plus light fill on both atoms | |

**User's choice:** Bond only
**Notes:** Endpoint atoms remain reachable via their own number tokens.

---

## Paren scope (CLYR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Whole branch incl. nested + stem bond | All bonds in the branch, nested sub-branches, plus the bond linking branch to attachment point | ✓ |
| Branch interior only, no stem bond | Bonds strictly between interior atoms; exclude stem | |
| Immediate branch only, exclude nested | Top-level branch bonds only; nested groups separate | |

**User's choice:** Whole branch incl. nested + stem bond
**Notes:** Mental model "this whole substituent."

---

## Paren pair (CLYR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Both highlight the same branch | Hovering either `(` or `)` highlights identical bond set | ✓ |
| Only `(` is interactive | Opening paren only; `)` stays plain text | |

**User's choice:** Both highlight the same branch
**Notes:** Symmetric and predictable; both parens are hover targets.

---

## Claude's Discretion

- Reuse `--c-conn` color for all c-layer hover highlights (no new tokens).
- Token affordance/styling for hyphens & parens (match `inchiSubtoken`).
- Parse approach for branch nesting and hyphen-endpoint resolution (must use `auxMap`, never re-parse the rendered string).
- Whether to add new `SubHover` kinds vs extend the `atom` case.

## Deferred Ideas

None — discussion stayed within phase scope.
