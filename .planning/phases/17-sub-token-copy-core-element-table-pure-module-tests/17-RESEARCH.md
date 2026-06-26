# Phase 17: Sub-token copy core (element table + pure module + tests) - Research

**Researched:** 2026-06-26
**Domain:** Pure TypeScript prose module + element-name table + vitest unit tests (no React, no new deps)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Extend `ELEMENT_NAMES` in place to **118 IUPAC elements (H–Og)** + **`D` (deuterium)** + **`T` (tritium)** = **120 entries**. No element ever shows a bare symbol.
- **D-02:** **IUPAC 2005 spelling** — `sulfur`, `aluminium`, `caesium`, etc.
- **D-03:** Lookup stays **case-exact** — `Co` = cobalt, never `C`+`O`. **Never `.toUpperCase()`** (hard invariant).
- **D-04:** Sub-token cards may run **up to 4–5 sentences**. Chemist register, same family as `LAYER_INFO` / `inchiKeyInfo`.
- **D-05:** **Chemical-accuracy caveats always win over length.** Trim prose, never the caveat.
- **D-06:** Student-friendly where it doesn't cost accuracy; default register still terse chemist.
- **D-07:** **Omit `reading?` for all four kinds** — body only. Field stays in the type for future use.
- **D-08:** **H-count card never names a functional group** — "atom N bears n hydrogen(s)", never "methyl". Hard invariant. (The `1H3` in alanine is the explicit trap.)
- **D-09:** Grouped/range H tokens use **collective phrasing** — "atoms 1–6 each bear one hydrogen", from `SubHover.atoms` + `count`. Not per-atom listing.
- **D-10:** **Mobile-H card states no count** — "a mobile/tautomeric proton is shared across [atoms]", never "bond between" / "each". `parseMobileHydrogens` reused **unchanged** (no new count parsing this phase).
- **D-11:** Stereo card explains **fixed 3-D handedness at an sp³ centre** AND states `+`/`−` is a **parity of canonical neighbour order, NOT R/S**. Test asserts copy contains "parity" and matches `/not.*R\/S/i`. Hard invariant.
- **D-12:** **State the hovered sign** (`SubHover.sign`, `+`/`−`) while hammering `+`≠R, `−`≠S.
- **D-13:** **One-line pointer** to /m and /s: "the /m and /s layers fix which absolute enantiomer this parity corresponds to." Don't fully explain /m or /s.
- **D-15:** **One-line primer** on what a stereocenter is (an atom whose four different substituents give a non-superimposable mirror image).
- **D-14:** When `canonRange` scopes an element hover to one component of a multi-component formula, body says count is **"in this component"**. Single-fragment: no scope clause. Include Hill-order note per D-17.
- **D-16:** **Descriptive + symbol** titles: element `"Carbon (C)"`; hAtoms `"Hydrogen count"`; mobileH `"Mobile hydrogen"`; stereo `"Tetrahedral stereocenter"`.
- **D-17:** Hill-order note **only on carbon and hydrogen** element cards. Other elements skip it.
- **D-18:** **Fixtures are real `getInchi()` output**, never fabricated. Anchor set: L-alanine, a multi-fragment salt (confirm exact molecule at planning), ciprofloxacin.
- **D-19:** Element-table test pins **all of**: case-exactness (`Co`=cobalt≠`C`+`O`), a non-organic sample (`K`=potassium), `D` and `T` present, **total entry count == 120**. Existing `layerInfo` tests stay green.

### Claude's Discretion
- Exact salt molecule for the multi-fragment fixture (methylamine hydrochloride recommended).
- `subTokenInfo()` signature / how `atomElements` is threaded for element naming — constrained only by verbatim-passthrough (consume offset `SubHover` fields, never re-join `layer.text`).
- Precise wording of each card body within the rules above — verified at the Phase 18 human chemical-accuracy gate.

### Deferred Ideas (OUT OF SCOPE)
- Per-element role/trivia (atomic number, group, mass, electron config).
- Mobile-H proton count (`Hn` count parsing).
- `reading?` lines for sub-tokens (field retained, unused this milestone).
- CIP R/S descriptors per stereocenter (InChI does not compute CIP).
- Sub-token cards for c-layer kinds (atom/bond/branch) → return `null`, graceful fall-through.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUBEX-03 | Hovering `H`/`H2`/`H3`/range updates card: named atom(s) bear that many H, no functional group claim | `SubHover{kind:'hAtoms', atoms, count}` carries exactly the fields needed; D-08/D-09 wording rules; alanine `1H3` is the test trap |
| SUBEX-04 | Mobile `(H,X,Y)` → shared/tautomeric proton, not a fixed bond | `SubHover{kind:'mobileH', atoms}` (no count); `parseMobileHydrogens` reused unchanged; alanine `(H,5,6)` carboxyl proton is the fixture |
| SUBEX-05 | t-layer stereocenter → fixed 3-D handedness at sp³ centre; `+`/`−` is parity of canonical neighbour order | `SubHover{kind:'stereo', atom, sign}`; alanine `/t2-/m0/s1` exercises real /t/m/s |
| SUBEX-06 | Stereocenter card states `+`/`−` is **not** R/S; notes /m & /s qualify enantiomer | D-11/D-12/D-13; test asserts "parity" present + `/not.*R\/S/i`; copy must NOT compute CIP |
| SUBEX-08 | Full periodic-table symbol→name table extended in place from 10-entry `ELEMENT_NAMES`; case-exact | `ELEMENT_NAMES` is `Record<string,string>`; importers are `formulaSegmentReading` + `layerInfo.test`; extend in place keeps both green |
| SUBEX-10 | Pure unit-tested module; real `getInchi()` fixtures; pin "parity ≠ R/S"; human gate | Co-located `src/lib/__tests__/subTokenInfo.test.ts`; real fixtures verified below |
</phase_requirements>

## Summary

Phase 17 is a **pure-logic, zero-dependency** phase: one new file (`src/lib/subTokenInfo.ts`), one in-place table extension (`ELEMENT_NAMES` in `src/lib/layerInfo.ts`), and one new test file. No React, no store, no parser changes. Every input the new module needs already exists on the `SubHover` discriminated union and in `atomElements` — the verbatim-passthrough invariant is satisfied by consuming those offset fields and never re-reading `layer.text`.

The structural precedent is `src/lib/inchiKeyInfo.ts`: a pure exported prose constant/function with a "never reconstruct the string" invariant and a co-located test that pins the load-bearing chemical caveats by assertion. Mirror its shape (`{title, body}`) and its test layout exactly. The new return type is `{ title: string; body: string; reading?: string } | null` — `null` for the three c-layer kinds (`atom`/`bond`/`branch`), so the Phase 18 caller falls through to the layer card.

The load-bearing control is **SUBEX-10**: real `getInchi()` fixtures only. The codebase already contains a verified L-alanine fixture (`InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1`) and a verified ciprofloxacin SMILES; both can be reused. The multi-fragment salt is the only fixture not yet present and must be generated from the live tool (cannot be derived statically — InChI generation is WASM-only).

**Primary recommendation:** Extend `ELEMENT_NAMES` to 120 entries in place (no signature change), write `subTokenInfo(sub, atomElements)` as a `switch (sub.kind)` returning the four card shapes + `null`, and pin every D-named invariant with a string-content assertion against the real alanine fixture. Generate the salt fixture in the running app before writing the multi-fragment element test.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Element symbol → name lookup | Pure lib (`layerInfo.ts`) | — | Static table; no DOM, no state |
| Sub-token → card prose | Pure lib (`subTokenInfo.ts`) | — | DOM-free, unit-testable; the whole point of the phase boundary |
| Consuming `SubHover` offset fields | Pure lib | — | Fields already offset by `LayerText`/parser; module is a pure transform |
| Threading `atomElements` for element naming | Pure lib (function arg) | Store (Phase 18 reads it) | `atomElements` is built by `buildAtomElements`; passed in, not imported from store |
| Rendering the card | React (`Explanation.tsx`) | — | **Phase 18, not this phase** |
| Writing `subHover`/`pinned.sub` | React (`LayerText.tsx`) | Store | Already exists; untouched |

## Standard Stack

No new packages. Phase uses only what is installed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^3.0.0 | Unit test runner | Already the project test runner; `environment: 'node'` for `src/lib/**` |
| typescript | ~5.7.2 | Types for the new module + table | Already the project language |

### Supporting
None. `subTokenInfo.ts` imports `ELEMENT_NAMES` and `subscript` from `./layerInfo` and the `SubHover` type from `./parseInchi`. That is the entire dependency surface.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-typed 120-entry `ELEMENT_NAMES` | A periodic-table npm package | Rejected — adds a dependency for static data; D-01 wants 118+2 specific entries with IUPAC-2005 spelling and the `D`/`T` pseudo-symbols a generic package won't include. A literal object is smaller and auditable. (Ponytail rung 5: never add a dep for a static table.) |
| `switch (sub.kind)` returning `{title,body}` | A `Record<kind, fn>` dispatch table | Either works; `switch` matches the existing `buildSubHoverSpecs` style in `highlightUtils.ts` and TypeScript narrows discriminated unions inside `switch` cleanly. |

**Installation:** None required.

## Package Legitimacy Audit

Not applicable — this phase installs **no external packages**. All imports are intra-repo (`./layerInfo`, `./parseInchi`) or the already-installed `vitest`/`typescript`.

## Architecture Patterns

### System Architecture Diagram

```
                         Phase 17 boundary (pure, no React)
                         ┌──────────────────────────────────────────────┐
  hovered/pinned         │                                              │
  sub-token  ──────────► │  SubHover {kind, el?, count?, atoms?,        │
  (from LayerText,       │            atom?, sign?, canonRange?, ...}    │
   Phase 18 wiring)      │                    │                          │
                         │                    ▼                          │
  atomElements ────────► │   subTokenInfo(sub, atomElements)             │
  (buildAtomElements,    │                    │                          │
   passed by caller)     │      switch (sub.kind)                        │
                         │      ├─ 'element' → {title:"Carbon (C)", body}│──► uses ELEMENT_NAMES[el]
                         │      ├─ 'hAtoms'  → {title:"Hydrogen count",..}│──► atoms+count, NO group name
                         │      ├─ 'mobileH' → {title:"Mobile hydrogen",.}│──► atoms, NO count
                         │      ├─ 'stereo'  → {title:"Tetrahedral...", } │──► sign, parity≠R/S caveat
                         │      └─ atom/bond/branch → null                │──► graceful fall-through
                         └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          Phase 18: Explanation.tsx renders {title, body}
                          (between keyHoverKind branch and layer branch)
```

### Component Responsibilities

| File | Responsibility (this phase) |
|------|------------------------------|
| `src/lib/layerInfo.ts` | Extend `ELEMENT_NAMES` 10→120 in place. No other change. `formulaSegmentReading` and `elementColor` keep working (both only *read* the table). |
| `src/lib/subTokenInfo.ts` | **NEW.** `export function subTokenInfo(sub: SubHover, atomElements: Record<number,string>): { title: string; body: string; reading?: string } \| null`. |
| `src/lib/__tests__/subTokenInfo.test.ts` | **NEW.** Real-fixture tests; pin all D-08/D-10/D-11/D-19 invariants by assertion. |
| `src/lib/__tests__/layerInfo.test.ts` | Add the count==120 / case-exact / D&T / `K`=potassium assertions (D-19). Keep existing green. |

### Pattern 1: Pure prose module mirroring `inchiKeyInfo.ts`
**What:** Export a pure function/constant returning `{title, body}`; no browser globals; co-located vitest test pins the caveats.
**When to use:** This is the established pattern for every copy module in this repo (`inchiKeyInfo.ts`, `layerInfo.ts`).
**Example:**
```typescript
// Source: src/lib/inchiKeyInfo.ts (existing repo precedent)
export const KEY_ZONE_COPY: Record<KeyHoverZone, { label: string; title: string; body: string }> = {
  skeleton: { label: 'skeleton hash', title: 'Skeleton hash', body: '...' + SHARED_TAGLINE },
  // ...
};
```
Mirror as:
```typescript
// src/lib/subTokenInfo.ts
import type { SubHover } from './parseInchi';
import { ELEMENT_NAMES, subscript } from './layerInfo';

export type SubTokenCopy = { title: string; body: string; reading?: string };

export function subTokenInfo(
  sub: SubHover,
  atomElements: Record<number, string>,
): SubTokenCopy | null {
  switch (sub.kind) {
    case 'element': { /* uses sub.el, sub.canonRange (D-14), ELEMENT_NAMES, D-16/D-17 */ }
    case 'hAtoms':  { /* uses sub.atoms, sub.count; D-08 no group name, D-09 collective */ }
    case 'mobileH': { /* uses sub.atoms ONLY; D-10 no count, "shared/tautomeric" */ }
    case 'stereo':  { /* uses sub.atom, sub.sign; D-11/D-12/D-13/D-15 */ }
    default: return null; // 'atom' | 'bond' | 'branch' → c-layer, fall through
  }
}
```

### Pattern 2: Collective H-count phrasing from `atoms` + `count` (D-09)
**What:** Group an `atoms[]` array into "atom N bears n hydrogen(s)" or "atoms A–B each bear n hydrogen(s)".
**When:** `hAtoms` kind. `atoms` is the offset canonical list; `count` is the H multiplier (1 for bare `H`).
**Note:** `atomLabel`-style element prefixing is **optional** — `atomElements` is available if you want "C₁ bears 3 hydrogens", but D-08's hard rule is only "never name a functional group". Plain "atom 1" is acceptable; element-prefixed is richer. Decide at planning.

### Pattern 3: Element title from looked-up name (D-16)
```typescript
const name = ELEMENT_NAMES[sub.el!] ?? sub.el!;      // case-exact; D-03
const title = `${name[0].toUpperCase()}${name.slice(1)} (${sub.el})`; // "Carbon (C)"
```
The Hill-order note (D-17) is appended to the body **only when `sub.el === 'C' || sub.el === 'H'`**.

### Anti-Patterns to Avoid
- **Re-joining `layer.text` to recover counts/atoms** — violates verbatim-passthrough. Everything comes from `SubHover` numeric fields.
- **`.toUpperCase()` on element symbols** — breaks case-exact lookup (`Co` vs `CO`). Hard invariant D-03.
- **Naming a functional group from H-count** — `1H3` is NOT "methyl". D-08.
- **Stating a count on mobile-H** — `(H,5,6)` is a shared proton, not "two H" or "each". D-10.
- **Computing or asserting R/S** — InChI parity ≠ CIP. The card must say so explicitly. D-11.
- **Fabricating an InChI fixture** — v1.4 repeat-offense; 333 green tests masked a broken feature. D-18.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile-H atom extraction | A new `(H,X,Y)` parser | Reuse `SubHover.atoms` (already built by `parseMobileHydrogens` in `LayerText`) | D-10; the offset atoms are already on the union |
| Element symbol → name | A periodic-table dependency | Hand-typed `ELEMENT_NAMES` literal (118+D+T) | Static data, IUPAC-2005 spelling, auditable; no dep |
| Subscript digits | Unicode-by-hand | `subscript()` already in `layerInfo.ts` | Existing helper |
| Building `atomElements` | New canonical→element map | `buildAtomElements(layers)` in `parseAuxMapping.ts` | Already exists; Phase 18 passes its result in |

**Key insight:** This phase is almost entirely *consumption* of existing parsed data. The only genuinely new artifact is prose (and its tests) plus 110 table rows.

## Common Pitfalls

### Pitfall 1: Re-deriving data instead of consuming `SubHover`
**What goes wrong:** Tempting to re-parse `layer.text` for the H count or stereo sign.
**Why it happens:** The string is right there.
**How to avoid:** `subTokenInfo` takes `SubHover` (+ `atomElements`) and nothing else. No `Layer`, no raw text in the signature.
**Warning signs:** The module imports `parseHydrogenAtoms`/`parseStereoParities` or accepts a string arg.

### Pitfall 2: Fragment-2+ offset confusion in element scoping
**What goes wrong:** For multi-fragment formulas, `canonRange` is `[lo, hi]` over the *globally offset* canonical IDs. Misreading it as per-fragment-local breaks the "in this component" clause.
**Why it happens:** The `el` and `canonRange` fields are already offset by `LayerText` (`{kind:'element', el, canonRange}` at LayerText.tsx:149).
**How to avoid:** The body for D-14 only needs the *presence* of `canonRange` to switch on the "in this component" clause — it does not need to compute counts. The count for the element comes from the formula, which is out of scope for the copy module (count display is Phase 18's element-card behaviour, SUBEX-07). The copy module states *that* the count is per-component, not the number.
**Warning signs:** The module tries to count atoms or read `formulaFragmentCounts`.

### Pitfall 3: `mobileH` has no `count` field — don't read `sub.count`
**What goes wrong:** Copy/paste from the `hAtoms` branch leaves a `sub.count` reference in `mobileH`.
**Why it happens:** Both are hydrogen kinds. But `{kind:'mobileH', atoms}` carries **only** `atoms` (LayerText.tsx:388) — `count` is undefined by design (D-10).
**How to avoid:** `mobileH` body reads `sub.atoms` only, says "shared/mobile/tautomeric", never a number.

### Pitfall 4: Element-name capitalization
**What goes wrong:** `ELEMENT_NAMES` values are lowercase (`'carbon'`, matching the existing `formulaReading` usage). The card title D-16 wants `"Carbon (C)"`.
**How to avoid:** Capitalize the first letter at the title site, not in the table (keeps `formulaReading` byte-identical — it lowercases inline).

## Runtime State Inventory

Not a rename/refactor/migration phase — greenfield logic addition. Section omitted per protocol. (The one in-place edit to `ELEMENT_NAMES` is an additive table extension, audited under SUBEX-08 non-regression, not runtime state.)

## Code Examples

### SubHover field-per-kind contract (the ONLY input surface)
Confirmed from the real construction sites in `src/components/LayerText.tsx` and consumption in `src/lib/highlightUtils.ts`:

```typescript
// Source: src/lib/parseInchi.ts lines 32–56 + construction in LayerText.tsx
interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH' | 'bond' | 'branch';
  el?: string;            // 'element' kind
  canonRange?: [number, number]; // 'element' kind, multi-fragment scoping (D-14)
  canonical?: number;     // 'atom' kind (single fragment)
  canonicals?: number[];  // 'atom' kind (2* identical fragments)
  atom?: number;          // 'stereo' kind — the stereocenter canonical
  sign?: string;          // 'stereo' kind — '+' | '-' | '?'
  atoms?: number[];       // 'hAtoms' AND 'mobileH' kinds — offset canonicals
  count?: number;         // 'hAtoms' kind ONLY (mobileH has none)
  endpointPairs?: [number, number][]; // 'bond' kind → null in subTokenInfo
  bondPairs?: [number, number][];     // 'branch' kind → null in subTokenInfo
}
```

| `kind` | Fields populated at construction | subTokenInfo uses | Returns |
|--------|----------------------------------|-------------------|---------|
| `element` | `el`, optional `canonRange` | `el` → `ELEMENT_NAMES`; `canonRange` presence (D-14) | `{title, body}` |
| `hAtoms` | `atoms`, `count` | `atoms`, `count` (D-08/D-09) | `{title, body}` |
| `mobileH` | `atoms` only | `atoms` only (D-10) | `{title, body}` |
| `stereo` | `atom`, `sign` | `sign` (D-12); `atom` optional in prose | `{title, body}` |
| `atom` / `bond` / `branch` | (c-layer fields) | — | `null` |

### Test layout to mirror (inchiKeyInfo.test.ts)
```typescript
// Source: src/lib/__tests__/inchiKeyInfo.test.ts
import { describe, it, expect } from 'vitest';
import { subTokenInfo } from '../subTokenInfo';
import { ELEMENT_NAMES } from '../layerInfo';

// Real fixture — verified present in repo (HelpTour.test.tsx, useKetcherHighlights.test.ts)
const ALANINE = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';

describe('subTokenInfo — stereo (SUBEX-05/06, D-11)', () => {
  const card = subTokenInfo({ kind: 'stereo', atom: 2, sign: '-' }, {})!;
  it('mentions parity', () => expect(card.body).toMatch(/parity/i));
  it('states parity is NOT R/S', () => expect(card.body).toMatch(/not.*R\/S/i));
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ELEMENT_NAMES` = 10 organic elements | 120 entries (118 IUPAC + D + T) | This phase | No element shows a bare symbol; `elementColor` unchanged (still 10-element whitelist) |
| Sulphur (British) | `sulfur` (IUPAC 2005) | Existing repo already uses `sulfur` | Stay consistent: `aluminium`, `caesium` (British -ium/-ae spellings IUPAC keeps), but `sulfur`/`phosphorus`/`cesium→caesium` |

**Deprecated/outdated:** None relevant. IUPAC element 118 (oganesson) and 113–117 names are final (2016 ratification), confirmed current.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Methylamine hydrochloride is the salt fixture | D-18 / Validation | LOW — any real multi-fragment salt works; must be generated from the live tool regardless. Confirm before writing the multi-fragment test. |
| A2 | `ELEMENT_NAMES` values are lowercase and only read (never compared case-sensitively to a capitalized form) by `formulaSegmentReading` | SUBEX-08 non-regression | LOW — verified: `formulaSegmentReading` does `ELEMENT_NAMES[el] \|\| el` then appends `s`; capitalization happens nowhere. Adding rows cannot break it. |
| A3 | The CONTEXT alanine string is the canonical real fixture | D-18 | NONE — verified byte-identical to the fixture already committed in `HelpTour.test.tsx:11`. |

**Note on element-name spelling:** D & T are pseudo-symbols (deuterium/tritium); their *names* are `deuterium`/`tritium`. All 118 IUPAC names with IUPAC-2005/2016 spelling were confirmed against the IUPAC element list (see Sources). `aluminium`, `caesium`, `sulfur`, `phosphorus` confirmed. This is `[CITED]`, not `[VERIFIED]`, because the table is hand-typed — the count==120 + spot-check tests (D-19) are the verification gate.

## Open Questions

1. **Element-card body element-prefixing for H-count**
   - What we know: D-09 wants "atoms 1–6 each bear one hydrogen". `atomElements` is available to write "C₁".
   - What's unclear: Whether bare "atom 1" or element-prefixed "atom C₁" reads better for students.
   - Recommendation: Bare "atom N" is safest against D-08 (no functional-group inference risk) and matches the terse register. Let the executor draft; chemist gate (Phase 18) decides.

2. **Should `subTokenInfo` accept `atomElements` at all for non-element kinds?**
   - What we know: Only `element` (title) and optionally `hAtoms` (prefix) need it.
   - Recommendation: Keep it in the signature for uniformity and future use; ignore it in `mobileH`/`stereo`. Cheap, no harm.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| vitest | All tests | ✓ | ^3.0.0 | — |
| node env (vitest) | `src/lib/**` tests | ✓ | configured in `vitest.config.ts` | — |
| Live Ketcher tool | Generating the salt fixture (D-18) | ✓ (dev server) | 3.12.0 | None — InChI gen is WASM-only; cannot derive a real InChI statically |

**Missing dependencies with no fallback:** None for the code/tests. The one *manual* step is generating the salt InChI from the running app (`npm run dev`, draw or paste the salt, copy the displayed InChI). This is a planning checkpoint, not a code dependency.

**Missing dependencies with fallback:** None.

## Validation Architecture

> SUBEX-10 is the load-bearing gate for this phase. Real fixtures only — fabricated InChI is the documented v1.4 repeat-offense.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | `vitest.config.ts` (`environment: 'node'` for `src/lib/**`) |
| Quick run command | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts` |
| Full suite command | `npx vitest run` |

### Real Fixtures Needed (D-18)
| Fixture | InChI | Status | How obtained |
|---------|-------|--------|--------------|
| L-alanine | `InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1` | ✅ Already in repo (`HelpTour.test.tsx:11`) — verified real | Reuse verbatim |
| Ciprofloxacin | `C17H18FN3O3`, SMILES `C1CC1N2C=C(C(=O)C3=CC(=C(C=C32)N4CCNCC4)F)C(=O)O` (`molecules.ts:41`) | ⚠️ SMILES in repo; **InChI must be generated** from live tool | `npm run dev`, select ciprofloxacin preset, copy displayed InChI |
| Multi-fragment salt | e.g. methylamine hydrochloride (A1, unconfirmed) | ❌ **Generate before writing the test** | `npm run dev`, draw/paste salt, copy InChI; paste verbatim into test |

Alanine alone covers stereo (`/t2-/m0/s1`), amine `H2` (`4H2`), the methyl trap (`1H3`), and the carboxyl mobile-H (`(H,5,6)`) — it is the workhorse. The salt is needed only for multi-element + `canonRange` element scoping (D-14).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUBEX-08 | `ELEMENT_NAMES` has exactly 120 entries | unit | `npx vitest run src/lib/__tests__/layerInfo.test.ts -t "120"` | ❌ Wave 0 |
| SUBEX-08 | Case-exact: `Co`→cobalt, `K`→potassium, `D`/`T` present | unit | same file | ❌ Wave 0 |
| SUBEX-08 | Existing `layerInfo`/`formulaReading` tests stay green | unit | `npx vitest run src/lib/__tests__/layerInfo.test.ts` | ✅ exists |
| SUBEX-03 | `hAtoms` body: atom(s) bear n H; NO "methyl"/group name | unit | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts -t "hAtoms"` | ❌ Wave 0 |
| SUBEX-04 | `mobileH` body: shared/tautomeric; NO count, NO "bond between"/"each" | unit | same file `-t "mobileH"` | ❌ Wave 0 |
| SUBEX-05 | `stereo` body: sp³ handedness + "parity" + hovered sign | unit | same file `-t "stereo"` | ❌ Wave 0 |
| SUBEX-06 | `stereo` body matches `/not.*R\/S/i` + notes /m, /s | unit | same file | ❌ Wave 0 |
| SUBEX-10 | All fixtures match `/^InChI=1S\//`; c-layer kinds → `null` | unit | same file | ❌ Wave 0 |

### Invariants Pinned by Assertion (the gate)
- `Object.keys(ELEMENT_NAMES).length === 120` (D-19)
- `ELEMENT_NAMES['Co'] === 'cobalt'` and `ELEMENT_NAMES['C'] === 'carbon'`, `ELEMENT_NAMES['O'] === 'oxygen'` (case-exact, `Co`≠`C`+`O`, D-03/D-19)
- `ELEMENT_NAMES['K'] === 'potassium'` (non-organic sample, D-19)
- `ELEMENT_NAMES['D']` and `ELEMENT_NAMES['T']` defined (D-19)
- `subTokenInfo({kind:'hAtoms',...}).body` does **not** match `/methyl|amine|carboxyl|functional group/i` (D-08)
- `subTokenInfo({kind:'mobileH',...}).body` matches `/shared|mobile|tautomer/i` and does **not** match `/bond between|each|\bcount\b/i` (D-10)
- `subTokenInfo({kind:'stereo',...}).body` matches `/parity/i` AND `/not.*R\/S/i` (D-11 — the mandatory caveat)
- `subTokenInfo({kind:'stereo', sign:'-'}).body` mentions the `−` sign (D-12)
- `subTokenInfo({kind:'atom'|'bond'|'branch'}) === null` (graceful fall-through)
- Every test fixture string matches `/^InChI=1S\//` (D-18 anti-fabrication sanity, same pattern as `HelpTour.test.tsx:14`)

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/lib/__tests__/layerInfo.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`. Note: the *human chemical-accuracy* gate on live card strings is **Phase 18**, not here — Phase 17's gate is the assertion pins above. Do not claim chemical-accuracy sign-off in Phase 17.

### Wave 0 Gaps
- [ ] `src/lib/subTokenInfo.ts` — the module (must exist before its test)
- [ ] `src/lib/__tests__/subTokenInfo.test.ts` — new test file
- [ ] Salt fixture InChI generated from live tool (A1) — manual checkpoint before the multi-fragment element test
- [ ] Ciprofloxacin InChI generated from live tool (only if a ciprofloxacin element test is written; alanine + salt may suffice)
- [ ] No framework install needed (vitest present)

## Security Domain

`security_enforcement` is not configured to `false`, so this section is included. However, this phase has **no trust boundary**: inputs are `SubHover` objects produced from WASM-parsed InChI (not user free-text), and outputs are plain prose strings rendered as React text children in Phase 18 (`Explanation.tsx` renders `body` as `<p>{body}</p>`, not `dangerouslySetInnerHTML`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Public static tool |
| V5 Input Validation | minimal | `SubHover` fields are WASM-derived numerics/symbols, not user text; element lookup falls back to the raw symbol if unknown |
| V6 Cryptography | no | No crypto |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via card body | Tampering | **Phase 18 concern**: body must be rendered as a React text child, NOT `dangerouslySetInnerHTML`. `subTokenInfo` returns plain strings with no markup — keep it that way (the `reading?` field's `<b>` HTML pattern from `readingFor` is **omitted** per D-07, so no HTML escapes the module). |

**Phase-17-specific note:** Because D-07 omits `reading?`, the module emits **no HTML** — unlike `readingFor`/`formulaReading` which emit `<b>`/`<span>`. Keep `title`/`body` HTML-free so Phase 18 can render them as safe text children with zero escaping risk.

## Sources

### Primary (HIGH confidence — verified in this session)
- `src/lib/parseInchi.ts` (lines 32–56) — `SubHover` union shape, read directly
- `src/components/LayerText.tsx` (lines 111–509) — `SubHover` construction sites confirming field-per-kind
- `src/lib/highlightUtils.ts` (lines 373–524) — `buildSubHoverSpecs` confirming field consumption per kind
- `src/lib/layerInfo.ts` — `ELEMENT_NAMES` shape, `formulaSegmentReading`/`elementColor` importers, `subscript`
- `src/lib/inchiKeyInfo.ts` + `src/lib/__tests__/inchiKeyInfo.test.ts` — parallel pure-prose module + test layout
- `src/lib/parseAuxMapping.ts` — `buildAtomElements` (canonical→element source)
- `src/components/__tests__/HelpTour.test.tsx` (line 11) — verified real alanine fixture
- `vitest.config.ts`, `package.json` — test framework + zero-new-dep confirmation

### Secondary (MEDIUM confidence)
- IUPAC element list (Wikipedia, List of chemical elements) — element 110–118 spellings + `aluminium`/`caesium`/`sulfur`/`phosphorus` confirmation. https://en.wikipedia.org/wiki/List_of_chemical_elements

### Tertiary (LOW confidence)
- Salt-fixture molecule choice (methylamine hydrochloride) — recommendation only; must be generated from the live tool (A1).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all imports verified present
- Architecture: HIGH — input/output contract read directly from source; mirrors existing `inchiKeyInfo.ts`
- Pitfalls: HIGH — derived from real construction/consumption sites and locked CONTEXT decisions
- Element table: MEDIUM — hand-typed 120 rows; spelling cited, count/spot-check pinned by test (the gate)
- Fixtures: HIGH for alanine (in repo), MEDIUM for salt/ciprofloxacin (must be generated live)

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable — pure logic, no fast-moving dependency; IUPAC element names are final)
