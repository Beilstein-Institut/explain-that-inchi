# Phase 17: Sub-token copy core (element table + pure module + tests) - Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 4 (1 new module, 1 in-place table edit, 1 new test, 1 test extension)
**Analogs found:** 4 / 4 (all exact, intra-repo)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/subTokenInfo.ts` (NEW) | utility (pure prose module) | transform | `src/lib/inchiKeyInfo.ts` | exact |
| `src/lib/layerInfo.ts` (MODIFY `ELEMENT_NAMES` 10→120) | utility (static table) | transform | itself (additive, in-place) | exact |
| `src/lib/__tests__/subTokenInfo.test.ts` (NEW) | test | request-response | `src/lib/__tests__/inchiKeyInfo.test.ts` + `layerInfo.test.ts` | exact |
| `src/lib/__tests__/layerInfo.test.ts` (MODIFY, add D-19 pins) | test | request-response | itself | exact |

Input contract (read-only, NOT modified): `src/lib/parseInchi.ts` `SubHover` union (lines 32–56).

---

## Pattern Assignments

### `src/lib/subTokenInfo.ts` (NEW — utility, transform)

**Analog:** `src/lib/inchiKeyInfo.ts`

**Module header + import pattern** — mirror the `inchiKeyInfo.ts` top-of-file invariant banner and intra-repo type imports. `inchiKeyInfo.ts` lines 1–5:
```typescript
// InChIKey zone prose — Phase 13: Content & Explanation.
// Exports KEY_ZONE_COPY (all 4 hover-zone cards) and SHARED_TAGLINE.
// No code reconstructs or re-joins the key from segments (Invariant #1 / D-08).

import type { KeyHoverZone } from '../store';
```
Mirror as (research Pattern 1, the dependency surface is exactly these two):
```typescript
// Sub-token card prose — Phase 17.
// Pure transform: SubHover → {title, body} card copy. No React, no string reconstruction.
// Consumes SubHover offset fields only; never re-joins layer.text (verbatim-passthrough).
import type { SubHover } from './parseInchi';
import { ELEMENT_NAMES, subscript } from './layerInfo';
```

**Export shape / return type** — `inchiKeyInfo.ts` lines 22 uses a `Record<…, { label; title; body }>` constant. The new module is a *function* (input varies per hover) not a constant, but the card object shape is the same family. Per D-07 `reading?` stays in the type but is omitted from every branch:
```typescript
export type SubTokenCopy = { title: string; body: string; reading?: string };

export function subTokenInfo(
  sub: SubHover,
  atomElements: Record<number, string>,
): SubTokenCopy | null {
  switch (sub.kind) {
    case 'element': { /* sub.el → ELEMENT_NAMES; sub.canonRange presence → D-14; D-16/D-17 */ }
    case 'hAtoms':  { /* sub.atoms + sub.count; D-08 no group name, D-09 collective phrasing */ }
    case 'mobileH': { /* sub.atoms ONLY; D-10 no count, "shared/tautomeric" */ }
    case 'stereo':  { /* sub.sign; D-11 parity≠R/S, D-12 sign, D-13 /m,/s, D-15 primer */ }
    default: return null; // 'atom' | 'bond' | 'branch' → c-layer fall-through
  }
}
```

**Voice / body-prose pattern** (from `inchiKeyInfo.ts` lines 28–33) — multi-sentence string built by `+` concatenation, terse chemist register, caveat carried as a shared/fixed clause:
```typescript
body:
  'This 14-character block is a hash of the connectivity (skeleton) layer of the InChI — ' +
  'the InChIKey as a whole is the fixed 27-character ... hashed form of the full InChI. ' +
  ...
  SHARED_TAGLINE,
```
Apply the same `+`-concatenated multi-sentence style for the 4–5 sentence sub-token bodies (D-04). Plain text only — NO `<b>`/HTML (D-07; unlike `formulaReading` which emits `<b>`). Keep `title`/`body` HTML-free so Phase 18 renders them as safe React text children.

**Element title pattern (D-16/D-03)** — capitalize at the title site, NOT in the table (keeps `formulaSegmentReading` byte-identical, which lowercases inline; research Pitfall 4). Case-exact lookup, never `.toUpperCase()` (D-03 hard invariant):
```typescript
const name = ELEMENT_NAMES[sub.el!] ?? sub.el!;            // case-exact
const title = `${name[0].toUpperCase()}${name.slice(1)} (${sub.el})`; // "Carbon (C)"
```
Hill-order note appended to body only when `sub.el === 'C' || sub.el === 'H'` (D-17).

**Subscript helper** — reuse `subscript()` from `layerInfo.ts` (lines 116–122) if writing element-prefixed atom labels ("C₁"); do NOT hand-roll Unicode subscripts. `atomLabel` (layerInfo.ts lines 128–132) shows the existing `el + subscript(canon)` composition — but note D-08 forbids any functional-group inference, so bare "atom N" is the safest H-count phrasing (research Open Question 1).

---

### `src/lib/layerInfo.ts` — `ELEMENT_NAMES` extension (MODIFY — static table, in place)

**Analog:** itself (additive extension, no signature change).

**Current literal** (lines 180–183) — extend in place to 120 entries (118 IUPAC H–Og + `D` + `T`), IUPAC-2005 spelling, lowercase values:
```typescript
export const ELEMENT_NAMES: Record<string, string> = {
  H: 'hydrogen', C: 'carbon', N: 'nitrogen', O: 'oxygen', S: 'sulfur',
  P: 'phosphorus', F: 'fluorine', Cl: 'chlorine', Br: 'bromine', I: 'iodine',
};
```
Keep `S: 'sulfur'`, `P: 'phosphorus'` spellings; add `aluminium`, `caesium` (British -ium/-ae IUPAC keeps). `D: 'deuterium'`, `T: 'tritium'` as pseudo-symbols.

**In-file consumer 1 — `formulaSegmentReading`** (line 150). Read-only access with raw-symbol fallback; capitalization happens nowhere here (research A2). Adding rows cannot break it:
```typescript
const name = ELEMENT_NAMES[el] || el;
out.push(`<b>${n}</b> ${name}${n === 1 ? '' : 's'}`);
```

**In-file consumer 2 — `elementColor`** (lines 189–192). Does NOT read `ELEMENT_NAMES` — it has its own independent 10-element whitelist for the colour-token map. Leave it unchanged (it must stay a 10-element whitelist; extending the name table does not and must not widen the colour palette):
```typescript
export function elementColor(el: string): string {
  const known = ['C', 'H', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I'];
  return known.includes(el) ? `var(--c-el-${el})` : 'var(--c-formula)';
}
```

**Repo-wide consumers:** `grep -rn ELEMENT_NAMES src/` → only `layerInfo.ts` itself (lines 150, 180). No external importer today. `subTokenInfo.ts` becomes the first cross-file importer. Extension is therefore non-breaking by construction.

---

### `src/lib/parseInchi.ts` — `SubHover` union (INPUT CONTRACT — read-only, do NOT modify)

**Exact discriminated-union shape** (lines 32–56), the ONLY input surface for `subTokenInfo`:
```typescript
export interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH' | 'bond' | 'branch';
  el?: string;                          // 'element'
  canonRange?: [number, number];        // 'element' — multi-fragment scoping (D-14)
  canonical?: number;                   // 'atom' (single fragment)
  canonicals?: number[];                // 'atom' (N* identical fragments)
  atom?: number;                        // 'stereo' — the stereocenter canonical
  sign?: string;                        // 'stereo' — '+' | '-' | '?'
  atoms?: number[];                     // 'hAtoms' AND 'mobileH' — offset canonicals
  count?: number;                       // 'hAtoms' ONLY (mobileH has none)
  endpointPairs?: [number, number][];   // 'bond'   → null in subTokenInfo
  bondPairs?: [number, number][];       // 'branch' → null in subTokenInfo
}
```

**Field-per-kind table** (which fields each handled `kind` reads):

| `kind` | Fields populated | `subTokenInfo` reads | Returns |
|--------|------------------|----------------------|---------|
| `element` | `el`, optional `canonRange` | `el` → `ELEMENT_NAMES`; `canonRange` *presence* (D-14) | `{title, body}` |
| `hAtoms` | `atoms`, `count` | `atoms`, `count` (D-08/D-09) | `{title, body}` |
| `mobileH` | `atoms` ONLY | `atoms` ONLY (D-10 — never `sub.count`, it's undefined here) | `{title, body}` |
| `stereo` | `atom`, `sign` | `sign` (D-12); `atom` optional in prose | `{title, body}` |
| `atom` / `bond` / `branch` | c-layer fields | — | `null` |

Critical: `mobileH` carries no `count` — copy/paste from the `hAtoms` branch must not leave a `sub.count` reference (research Pitfall 3). `canonRange` is *globally offset*; D-14 needs only its presence, never a count computation (research Pitfall 2).

---

### `src/lib/__tests__/subTokenInfo.test.ts` (NEW — test)

**Analogs:** `src/lib/__tests__/inchiKeyInfo.test.ts` (caveat-pinning style) + `src/lib/__tests__/layerInfo.test.ts` (real-fixture style).

**Imports + vitest harness** (from `inchiKeyInfo.test.ts` lines 1–3):
```typescript
import { describe, it, expect } from 'vitest';
import { subTokenInfo } from '../subTokenInfo';
import { ELEMENT_NAMES } from '../layerInfo';
```

**Caveat-pinned-by-assertion pattern** — `inchiKeyInfo.test.ts` lines 137–151 pins negative chemical claims by `.not.toMatch`/`.not.toContain`. This is the exact model for D-08/D-10/D-11:
```typescript
describe('D-07 — no reversibility/identity claims', () => {
  it('no zone body contains "reverse"', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY[key].body).not.toContain('reverse');
    }
  });
  it('no zone body matches /unique identifier/i', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY[key].body).not.toMatch(/unique identifier/i);
    }
  });
});
```
Mirror for the load-bearing invariants:
- `expect(card.body).toMatch(/parity/i)` AND `expect(card.body).toMatch(/not.*R\/S/i)` (D-11)
- `expect(hAtomsCard.body).not.toMatch(/methyl|amine|carboxyl|functional group/i)` (D-08)
- `expect(mobileHCard.body).toMatch(/shared|mobile|tautomer/i)` and `.not.toMatch(/bond between|each|\bcount\b/i)` (D-10)
- `expect(subTokenInfo({kind:'bond',...}, {})).toBeNull()` for atom/bond/branch.

**Real-fixture pattern** — fixtures are real `getInchi()` output pasted verbatim (D-18, never fabricated). The alanine workhorse is already committed at `HelpTour.test.tsx:11`; reuse it byte-identical:
```typescript
// HelpTour.test.tsx line 11 (verified real fixture — reuse verbatim):
const REAL_INCHI_ALANINE = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';
```
**Anti-fabrication sanity pin** — copy the exact assertion from `HelpTour.test.tsx:14`:
```typescript
it('real InChI fixture sanity: alanine starts with InChI=1S/', () => {
  expect(REAL_INCHI_ALANINE).toMatch(/^InChI=1S\//);
});
```
Apply `/^InChI=1S\//` to every fixture string (alanine, the salt, ciprofloxacin). The salt + ciprofloxacin InChI strings must be GENERATED from the live tool (`npm run dev`) before the multi-fragment test is written — they are NOT yet in the repo (only ciprofloxacin SMILES is, at `molecules.ts:41`).

**Multi-fragment fixture style** — `layerInfo.test.ts:19` shows how a real dot-separated multi-component InChI is stored inline as a `const REPRO = '…'`. The Phase 17 salt fixture follows the same inline-const form, and is the vehicle for D-14 `canonRange` element-scoping.

---

### `src/lib/__tests__/layerInfo.test.ts` (MODIFY — add D-19 pins)

**Analog:** itself (existing structure, lines 1–40). Existing tests must stay green.

Add a `describe` block pinning all of D-19 against the extended table:
- `expect(Object.keys(ELEMENT_NAMES).length).toBe(120)`
- `expect(ELEMENT_NAMES['Co']).toBe('cobalt')`, `expect(ELEMENT_NAMES['C']).toBe('carbon')`, `expect(ELEMENT_NAMES['O']).toBe('oxygen')` (case-exact, `Co`≠`C`+`O`)
- `expect(ELEMENT_NAMES['K']).toBe('potassium')` (non-organic sample)
- `expect(ELEMENT_NAMES['D']).toBeDefined()`, `expect(ELEMENT_NAMES['T']).toBeDefined()`

Existing `formulaReading`/`subscript`/`parseStereoParities` tests are untouched and must keep passing (additive table extension cannot break them — research A2).

---

## Shared Patterns

### Verbatim-passthrough invariant (hard, cross-cutting)
**Source:** `inchiKeyInfo.ts` line 3 banner; project MEMORY "never reconstruct the string".
**Apply to:** `subTokenInfo.ts` (all branches).
Consume `SubHover` numeric/symbol fields ONLY. Never import `parseHydrogenAtoms`/`parseStereoParities` into the module, never accept a raw-text/`Layer` arg, never re-join `layer.text` to recover a count or atom list. Warning sign: the module signature grows a `string` or `Layer` parameter.

### Case-exact element lookup (D-03 hard invariant)
**Source:** existing `formulaSegmentReading` (layerInfo.ts:150) — `ELEMENT_NAMES[el] || el`, no case transform.
**Apply to:** `subTokenInfo.ts` element branch.
`ELEMENT_NAMES[sub.el] ?? sub.el` with raw-symbol fallback. Never `.toUpperCase()` (`Co` cobalt ≠ `C`+`O`).

### HTML-free output (D-07 / security)
**Source:** D-07 omits the `<b>`-emitting `reading?` line that `formulaReading`/`readingFor` produce.
**Apply to:** `subTokenInfo.ts` `title` and `body`.
Plain strings only — Phase 18 renders as React text children (no `dangerouslySetInnerHTML`). Do NOT copy the `<b>${n}</b>` pattern from `formulaSegmentReading` (line 151) into card bodies.

### Real-fixture-only testing (D-18 / SUBEX-10 — the load-bearing gate)
**Source:** `HelpTour.test.tsx:11,14`; `layerInfo.test.ts:19`.
**Apply to:** `subTokenInfo.test.ts`.
Every fixture is real `getInchi()` output, pasted verbatim, sanity-pinned with `/^InChI=1S\//`. Fabricated InChI is the documented v1.4 repeat-offense. Salt + ciprofloxacin InChI must be generated live before their tests are written.

---

## No Analog Found

None. Every file in this phase has a direct intra-repo analog. The only genuinely new artifacts are prose (and its assertions) plus ~110 static table rows — both modelled exactly on `inchiKeyInfo.ts` and the existing `ELEMENT_NAMES` literal.

---

## Threading note: `atomElements`

`subTokenInfo(sub, atomElements)` second arg is `Record<number, string>`, produced by `buildAtomElements(layers: Layer[])` in `src/lib/parseAuxMapping.ts:13` (already called in `parseInchi.ts:227,237`). Phase 18 passes its result in — `subTokenInfo` does NOT import the store. Keep the arg in the signature for all kinds (uniformity); only the `element` title and the optional `hAtoms` prefix actually read it (research Open Question 2).

---

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/__tests__/`, `src/components/__tests__/`
**Files scanned:** `inchiKeyInfo.ts`, `inchiKeyInfo.test.ts`, `parseInchi.ts` (lines 1–70), `layerInfo.ts` (lines 113–222), `layerInfo.test.ts` (head), `HelpTour.test.tsx` (fixture lines), `parseAuxMapping.ts` (signature)
**Pattern extraction date:** 2026-06-26
