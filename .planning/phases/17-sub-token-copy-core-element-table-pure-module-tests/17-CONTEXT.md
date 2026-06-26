# Phase 17: Sub-token copy core (element table + pure module + tests) - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A pure, DOM-free `src/lib/subTokenInfo.ts` module that turns a hovered/pinned
sub-token (`element` / `hAtoms` / `mobileH` / `stereo`) into chemically-accurate
card copy `{title, body, reading?} | null`, backed by a full periodic-table
element-name table extended in place in `src/lib/layerInfo.ts`. Fully unit-tested
against **real `getInchi()` fixtures**, with the "+/− parity is NOT R/S" caveat
pinned by test. **No React is touched** — card wiring is Phase 18.

Returns `null` for c-layer kinds (`atom` / `bond` / `branch`) so the Phase 18
caller falls through to the layer card gracefully.

</domain>

<decisions>
## Implementation Decisions

### Element table (SUBEX-08)
- **D-01:** Extend `ELEMENT_NAMES` in place to the **full 118 IUPAC elements (H–Og)**, plus **deuterium (`D`) and tritium (`T`)** pseudo-symbols (the i-layer/formula can carry them) — total **120 entries**. No element ever shows a bare symbol.
- **D-02:** **IUPAC 2005 spelling** (consistent with the existing `sulfur` entry): `sulfur`, `aluminium`, `caesium`, etc.
- **D-03:** Lookup stays **case-exact** — `Co` = cobalt, never confused with `C`+`O`. **Never `.toUpperCase()`** (hard invariant carried from STATE).

### Card voice & length
- **D-04:** Sub-token cards may run **richer than layer cards — up to 4–5 sentences** (they are the new teaching surface; stereo/mobile-H need careful caveats). Still chemist register, same family as `LAYER_INFO` / `inchiKeyInfo`.
- **D-05:** **Chemical-accuracy caveats always win over length.** When a required caveat (parity≠R/S, mobile-H is tautomeric/shared, H-count≠functional-group) would push a card long, trim explanatory prose, never the caveat.
- **D-06:** Audience leans student-friendly where it doesn't cost accuracy (see D-15 stereo primer) — but the default register is still terse chemist, not encyclopaedic.

### `reading?` field
- **D-07:** **Omit `reading?` for all four kinds** — body only. The optional field stays in the type for future use; the richer 4–5 sentence body already carries the explanation. Less surface to chemically verify at the Phase 18 gate.

### Hydrogen sub-tokens (SUBEX-03 / SUBEX-04)
- **D-08:** **H-count card never names a functional group** — "atom N bears n hydrogen(s)", never "methyl" (the 1H3 in the alanine fixture is the explicit trap). Hard invariant.
- **D-09:** Grouped/range H tokens use **collective phrasing** — e.g. "atoms 1–6 each bear one hydrogen", derived from `SubHover.atoms` + `count`. Not per-atom listing.
- **D-10:** **Mobile-H card states no count** — "a mobile/tautomeric proton is shared across [atoms]", never "bond between" / "each". `parseMobileHydrogens` is reused **unchanged** (the `Hn` count stays dropped); no new count parsing in this phase (honors STATE: "only add count parsing if a card states a count").

### Tetrahedral stereo (SUBEX-05 / SUBEX-06)
- **D-11:** Card explains a **fixed 3-D handedness at an sp³ centre** AND states `+`/`−` is a **parity of the canonical neighbour order, NOT R/S**. Unit test asserts the copy contains "parity" and matches `/not.*R\/S/i`. Hard invariant.
- **D-12:** **State the hovered sign** (`SubHover.sign`, `+`/`−`) — concrete to the token the user points at — while hammering that `+`≠R and `−`≠S.
- **D-13:** **One-line pointer** to /m and /s: the parity≠R/S statement plus a single sentence that "the /m and /s layers fix which absolute enantiomer this parity corresponds to." Do not fully explain /m or /s here.
- **D-15:** **One-line primer** on what a stereocenter is (an atom whose four different substituents give a non-superimposable mirror image) — students are part of the audience; fits the 4–5 sentence budget.

### Molecular formula elements (SUBEX-07 copy authored here; behaviour lands Phase 18)
- **D-14:** When `canonRange` scopes an element hover to one component of a multi-component formula, the body says the count is **"in this component"** — makes the highlight↔text link explicit. Single-fragment: no scope clause. Include the brief Hill-order note per D-17.

### Card titles
- **D-16:** **Descriptive + symbol** style: element `"Carbon (C)"` (uses the looked-up name); hAtoms `"Hydrogen count"`; mobileH `"Mobile hydrogen"`; stereo `"Tetrahedral stereocenter"`.

### Hill-order note
- **D-17:** Include the brief Hill-order note **only on carbon and hydrogen** element cards (the elements whose leading position Hill order actually explains). Other elements skip it — no repetitive irrelevant clause.

### Testing (SUBEX-10 — load-bearing gate)
- **D-18:** **Fixtures are real `getInchi()` output**, obtained from the live tool/Ketcher and pasted verbatim — **never fabricated** (v1.4 repeat-offense: 333 green tests once masked a broken feature). Anchor set: **L-alanine** (`InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1` — covers /t/m/s stereo, NH2 amine `H2`, the `1H3` methyl-trap, and the carboxyl mobile-H in one), a **multi-fragment salt** (suggested: methylamine hydrochloride or ethanol·water) for multi-element + `canonRange` element scoping, and **ciprofloxacin** (`C17H18FN3O3`, complex real-world multi-element formula incl. fluorine; already used in v1.4). Confirm exact salt during planning.
- **D-19:** Element-table test pins **all of**: case-exactness (`Co` = cobalt ≠ `C`+`O`), a non-organic sample (`K` = potassium), `D` and `T` present, and **total entry count == 120**. Existing `layerInfo` tests stay green.

### Claude's Discretion
- Exact salt molecule for the multi-fragment fixture (methylamine hydrochloride recommended) — confirm at planning by generating its real `getInchi()` string.
- The `subTokenInfo()` function signature / how `atomElements` (or equivalent) is threaded for element naming — implementation detail for the planner, constrained only by the verbatim-passthrough invariant (consume offset `SubHover` fields, never re-join `layer.text`).
- Precise wording of each card body within the rules above — drafted by executor, verified at the Phase 18 human chemical-accuracy gate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 17" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` § "v1.5 Requirements" — SUBEX-03, -04, -05, -06, -08, -10 (the IDs mapped to this phase)
- `.planning/STATE.md` § "Key Decisions (carry-forward)" — v1.5 hard invariants (verbatim-passthrough, no-remount, read-only card tier, chemical-correctness pitfalls)

### Existing code this phase extends / parallels
- `src/lib/layerInfo.ts` — `ELEMENT_NAMES` (extended in place), `subscript`, `formulaReading`, `elementColor`, `parseStereoParities` (parity helpers), `readingFor`
- `src/lib/parseInchi.ts` § `SubHover` interface (lines 32–56) — the ONLY input contract; consume `el`, `count`, `atoms`, `atom`, `sign`, `canonRange`, `canonical(s)`; never `layer.text`
- `src/lib/inchiKeyInfo.ts` — the parallel pure prose module to mirror (shape `{label?, title, body}`, terse-register voice, "no string reconstruction" invariant)
- `src/lib/parseInchi.ts` § `parseMobileHydrogens` — reused unchanged (D-10)

### Research backing this milestone
- `.planning/research/SUMMARY.md` (+ STACK / FEATURES / ARCHITECTURE / PITFALLS, 2026-06-26) — confirms copy + one-render-branch milestone; PITFALLS pins the chemical-correctness rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ELEMENT_NAMES` (`src/lib/layerInfo.ts`): existing 10-entry organic subset, extended in place to 120 — same export, no signature change, so existing importers and `formulaReading`/`elementColor` keep working.
- `inchiKeyInfo.ts`: direct structural precedent for a pure, exported, unit-tested copy module with a "never reconstruct the string" invariant — mirror its shape and voice.
- `SubHover` union (`parseInchi.ts`): already carries every numeric field the cards need (`el`, `count`, `atoms`, `atom`, `sign`, `canonRange`, `canonical(s)`) — no parser changes required.
- `parseStereoParities` / `parityColor` (`layerInfo.ts`): existing stereo parity helpers if the stereo card needs them.

### Established Patterns
- Pure DOM-free `src/lib/*.ts` modules with co-located `__tests__/` (vitest) — `subTokenInfo.ts` follows this exactly.
- Verbatim-passthrough invariant (D-08 lineage, InChIKey D-08): offsets/parsed fields only, never re-join or emit an InChI fragment as the source string.

### Integration Points
- `subTokenInfo()` is consumed only in Phase 18 inside `Explanation.tsx` (precedence: keyHoverKind → sub-token → layer → legend → idle), guarding on the returned copy (not `effSub`) so `null` falls through. **Not wired this phase.**

</code_context>

<specifics>
## Specific Ideas

- Alanine is deliberately chosen as the workhorse fixture because one real InChI exercises stereo (/t/m/s), an amine `H2`, the `1H3` "don't call it methyl" trap, and a carboxyl mobile-H simultaneously.
- Audience is chemists **and** chemistry students — hence the richer body (D-04) and the one-line stereocenter primer (D-15), without crossing into encyclopaedia trivia (out of scope: atomic number/group/mass/CIP R/S).

</specifics>

<deferred>
## Deferred Ideas

- **Per-element role/trivia** (atomic number, group, mass, electron config) — explicitly out of scope (REQUIREMENTS "Out of Scope"); would dilute the terse card.
- **Mobile-H proton count** — `Hn` count parsing deferred unless a future card states a count (D-10).
- **`reading?` lines for sub-tokens** — field retained in the type but unused this milestone (D-07); revisit if a literal-gloss line proves useful later.
- **CIP R/S descriptors per stereocenter** — out of scope; InChI does not compute CIP.

None of the above are scope creep into this phase — all are noted for future consideration only.

</deferred>

---

*Phase: 17-sub-token-copy-core-element-table-pure-module-tests*
*Context gathered: 2026-06-26*
