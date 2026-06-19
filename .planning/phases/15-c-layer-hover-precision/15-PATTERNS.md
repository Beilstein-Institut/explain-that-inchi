# Phase 15: C-layer hover precision - Pattern Map

**Mapped:** 2026-06-19
**Files analyzed:** 5 (3 modified, 2 created)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/parseInchi.ts` | library / type definition | transform | `src/lib/parseInchi.ts` itself — extend in-place | exact (in-place extension) |
| `src/lib/highlightUtils.ts` | library / spec builder | transform | `src/lib/highlightUtils.ts` itself — extend in-place | exact (in-place extension) |
| `src/components/LayerText.tsx` | component | request-response | `src/components/LayerText.tsx` itself — refactor `ConnectionText` | exact (in-place refactor) |
| `src/lib/__tests__/clyr.test.ts` | test | — | `src/lib/__tests__/highlightUtils.test.ts` + `trace_benzene.test.ts` | role-match |
| `src/__tests__/LayerText.clyr.test.tsx` | test | — | `src/__tests__/LayerText.mixedFragment.test.tsx` | exact |

---

## Pattern Assignments

### `src/lib/parseInchi.ts` — extend `SubHover` type + export `tokenizeCLayerSeg`

**Role:** library / type definition
**Analog:** `src/lib/parseInchi.ts` lines 32–47 (existing `SubHover` interface) and lines 58–90 (`parseConnectionBonds` stack machine)

**Existing `SubHover` interface** (lines 32–47):
```typescript
export interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH';
  el?: string;
  canonRange?: [number, number];
  canonical?: number;
  canonicals?: number[];
  atom?: number;
  sign?: string;
  atoms?: number[];
  count?: number;
}
```

**Required change — extend `kind` union and add new optional fields:**
```typescript
export interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH' | 'bond' | 'branch';
  // ... all existing fields unchanged ...

  /** 'bond' kind: each pair is [leftCanonical, rightCanonical] with fragment offset applied.
   *  Single fragment: one pair. N* multi-fragment: one pair per fragment instance. */
  endpointPairs?: [number, number][];

  /** 'branch' kind: all [leftCanonical, rightCanonical] pairs for every hyphen inside the
   *  branch's brackets. Includes nested sub-branches. Fragment offset already applied.
   *  N* multi-fragment: pairs from all fragment instances combined. */
  bondPairs?: [number, number][];
}
```

**`parseConnectionBonds` stack machine pattern to mirror** (lines 58–90) — the new `tokenizeCLayerSeg` replicates this exact single-pass approach with a stack, extending it to emit typed tokens instead of bond tuples:
```typescript
export function parseConnectionBonds(text: string): [number, number][] {
  const bonds: [number, number][] = [];
  const stack: (number | null)[] = [];
  let i = 0;
  let last: number | null = null;
  while (i < text.length) {
    const c = text[i];
    if (c === '(') {
      stack.push(last);
      i++;
    } else if (c === ')') {
      last = stack.pop() ?? null;
      i++;
    } else if (c === '-') {
      i++;
    } else if (c === ',') {
      if (stack.length) last = stack[stack.length - 1] as number | null;
      i++;
    } else if (/\d/.test(c)) {
      let j = i;
      while (j < text.length && /\d/.test(text[j])) j++;
      const n = parseInt(text.slice(i, j), 10);
      if (last != null) bonds.push([last, n]);
      last = n;
      i = j;
    } else {
      i++;
    }
  }
  return bonds;
}
```

**New `CLayerToken` types and `tokenizeCLayerSeg` export** — place after `parseConnectionBonds`, before `parseHydrogenAtoms`. The full algorithm is specified in RESEARCH.md lines 381–422. Key structural conventions to follow: exported pure function, no browser globals, Node-compatible (matches file header comment on line 1).

---

### `src/lib/highlightUtils.ts` — fix `atom` case; add `bond` and `branch` cases

**Role:** library / spec builder
**Analog:** `src/lib/highlightUtils.ts` lines 432–494 (existing `buildSubHoverSpecs` switch cases)

**Imports pattern** (lines 1–14) — no new imports needed for this phase:
```typescript
import type { Layer, SubHover, AuxMap } from './parseInchi';
import {
  parseHydrogenAtoms,
  parseMobileHydrogens,
  parseStereoAtoms,
  formulaFragmentCounts,
  expandLayerText,
} from './parseInchi';
```

**`StructLike` interface used by all cases** (lines 31–35):
```typescript
export interface StructLike {
  findBondId(begin: number, end: number): number | null;
  bonds: { forEach(cb: (bond: { begin: number; end: number }, id: number) => void): void };
  atoms: { forEach(cb: (atom: { charge?: number | null }, id: number) => void): void };
}
```

**CLYR-01 — `atom` case change** (lines 432–444): delete the `struct.bonds.forEach` incident-bond scan; return `bonds: []`. This is a 3-line deletion + 1-line change:
```typescript
// BEFORE (lines 432–443):
case 'atom': {
  const canonIds = subHover.canonicals ?? (subHover.canonical != null ? [subHover.canonical] : []);
  const kAtomIds = canonIds.map(c => auxMap[c]).filter((id): id is number => id !== undefined);
  if (kAtomIds.length === 0) return [];
  const incidentBonds: number[] = [];
  struct.bonds.forEach((bond, bid) => {          // DELETE these 3 lines
    if (kAtomIds.includes(bond.begin) || kAtomIds.includes(bond.end)) incidentBonds.push(bid);
  });
  const color = resolveVarFn('--c-conn');
  return [{ atoms: kAtomIds, bonds: incidentBonds, rgroupAttachmentPoints: [], color }];
}

// AFTER (CLYR-01):
case 'atom': {
  const canonIds = subHover.canonicals ?? (subHover.canonical != null ? [subHover.canonical] : []);
  const kAtomIds = canonIds.map(c => auxMap[c]).filter((id): id is number => id !== undefined);
  if (kAtomIds.length === 0) return [];
  const color = resolveVarFn('--c-conn');
  return [{ atoms: kAtomIds, bonds: [], rgroupAttachmentPoints: [], color }];
}
```

**Bond resolution pattern used by all existing cases** (lines 119–124) — reuse `struct.findBondId` exactly this way:
```typescript
const kA = auxMap[a];  // canonical → Ketcher pool ID (0-based)
const kB = auxMap[b];
const bid = struct.findBondId(kA, kB);  // null if not found; symmetric
```

**`HighlightSpec` return shape all cases must produce** (lines 23–28):
```typescript
export type HighlightSpec = {
  atoms: number[];
  bonds: number[];
  rgroupAttachmentPoints: number[];
  color: string;
};
```

**CLYR-02 — new `bond` case** — insert after the `atom` case, before `stereo`:
```typescript
case 'bond': {
  const bonds: number[] = [];
  for (const [a, b] of subHover.endpointPairs ?? []) {
    const kA = auxMap[a];
    const kB = auxMap[b];
    if (kA === undefined || kB === undefined) continue;
    const bid = struct.findBondId(kA, kB);
    if (bid !== null) bonds.push(bid);
  }
  if (bonds.length === 0) return [];
  return [{ atoms: [], bonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-conn') }];
}
```

**CLYR-03 — new `branch` case** — insert after `bond`:
```typescript
case 'branch': {
  const bonds: number[] = [];
  for (const [a, b] of subHover.bondPairs ?? []) {
    const kA = auxMap[a];
    const kB = auxMap[b];
    if (kA === undefined || kB === undefined) continue;
    const bid = struct.findBondId(kA, kB);
    if (bid !== null && !bonds.includes(bid)) bonds.push(bid);
  }
  if (bonds.length === 0) return [];
  return [{ atoms: [], bonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-conn') }];
}
```

**`default` case pattern** (line 491–493) — must remain last:
```typescript
default:
  return [];
```

---

### `src/components/LayerText.tsx` — refactor `ConnectionText.renderSegment`

**Role:** component
**Analog:** `src/components/LayerText.tsx` lines 123–190 (the existing `ConnectionText` function and its `renderSegment` inner function)

**Imports** (lines 1–10) — no new imports needed:
```typescript
import React from 'react';
import { useInchiStore } from '../store';
import type { Layer, SubHover } from '../lib/parseInchi';
import { formulaFragmentCounts } from '../lib/parseInchi';
import styles from './InchiSection.module.css';
```

**`subHoverProps` factory** (lines 22–27) — all new hover spans use this exact pattern; do not inline:
```typescript
function subHoverProps(hit: SubHover) {
  return {
    onMouseEnter: () => useInchiStore.getState().setSubHover(hit),
    onMouseLeave: () => useInchiStore.getState().setSubHover(null),
  };
}
```

**CSS class for interactive tokens** — `styles.inchiSubtoken` — applied to all hoverable spans (existing atom spans at line 139, new `-`/`(`/`)` spans must use the same class).

**Existing `renderSegment` that is the REFACTOR TARGET** (lines 127–148):
```typescript
const renderSegment = (seg: string, offset: number, canonicalFn?: (n: number) => { canonical: number; canonicals?: number[] }) => {
  let i = 0, buf = '';
  const flush = () => { if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; } };
  while (i < seg.length) {
    const c = seg[i];
    if (/\d/.test(c)) {
      flush();
      let j = i;
      while (j < seg.length && /\d/.test(seg[j])) j++;
      const n = parseInt(seg.slice(i, j), 10);
      const hover = canonicalFn ? canonicalFn(n) : { canonical: n + offset };
      parts.push(
        <span key={key++} className={styles.inchiSubtoken} {...subHoverProps({ kind: 'atom', ...hover })}>
          {seg.slice(i, j)}
        </span>
      );
      i = j; continue;
    }
    buf += c; i++;
  }
  flush();
};
```

**Fragment offset machinery to preserve** (lines 150–189) — the `multMatch`/N* branch and the `;`-split `segments.forEach` loop must continue to work. The refactor replaces only `renderSegment`'s internal character scan with a two-pass approach (call `tokenizeCLayerSeg`, then render tokens), but the outer `ConnectionText` structure (`multMatch` guard, `cumOffset` accumulation, per-segment `segMult` handling) is unchanged.

**Key structural rules for the refactored `renderSegment`:**
- Still signature: `(seg: string, offset: number, canonicalFn?) => void` — callers at lines 158, 177, 184 do not change.
- Strip any `N*` prefix BEFORE passing to `tokenizeCLayerSeg` (the tokenizer receives the bare segment text only).
- Offset/canonicalFn is applied AFTER tokenization, during the render-tokens loop.
- `parts` and `key` remain outer variables mutated by `renderSegment` — same pattern as today.

**Atom span emit pattern** (line 138–141) — all new span emissions must follow this key pattern:
```typescript
parts.push(
  <span key={key++} className={styles.inchiSubtoken} {...subHoverProps({ kind: 'atom', ...hover })}>
    {seg.slice(i, j)}
  </span>
);
```

**New hyphen span pattern** — same `inchiSubtoken` class, different `subHoverProps` kind:
```typescript
parts.push(
  <span key={key++} className={styles.inchiSubtoken}
    {...subHoverProps({ kind: 'bond', endpointPairs })}>
    {'-'}
  </span>
);
```

**New paren span pattern** — conditionally interactive (suppress affordance if `bondPairs.length === 0`):
```typescript
// bondPairs.length > 0: interactive
parts.push(
  <span key={key++} className={styles.inchiSubtoken}
    {...subHoverProps({ kind: 'branch', bondPairs })}>
    {'('}
  </span>
);
// bondPairs.length === 0: plain (comma-only branch edge case)
parts.push(<span key={key++}>{'('}</span>);
```

---

### `src/lib/__tests__/clyr.test.ts` — unit tests for `tokenizeCLayerSeg` and new `buildSubHoverSpecs` cases

**Role:** test (node environment — no `happy-dom` needed)
**Analog:** `src/lib/__tests__/highlightUtils.test.ts` (primary) + `src/lib/__tests__/trace_benzene.test.ts` (secondary)

**Vitest environment:** `node` (default per `vitest.config.ts` line 6; no `environmentMatchGlobs` entry for `src/lib/__tests__/**`). No browser globals needed — pure function tests.

**File header and import pattern** (from `highlightUtils.test.ts` lines 1–7):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildSubHoverSpecs } from '../highlightUtils';
import type { StructLike } from '../highlightUtils';
import type { Layer, AuxMap } from '../parseInchi';
```
For `clyr.test.ts`, also import the new exports:
```typescript
import { tokenizeCLayerSeg } from '../parseInchi';
// (CLayerToken types imported as needed)
```

**`resolveVarFn` identity mock** (highlightUtils.test.ts line 10) — standard pattern for all `buildSubHoverSpecs` tests:
```typescript
const resolveVarFn = (name: string): string => name;
```

**`makeMockStruct` pattern** (highlightUtils.test.ts lines 19–34) — the fixture for Fixture A (linear + branch) needs a struct that has specific bond pairs. Use the same `vi.fn()` shape:
```typescript
function makeMockStruct(bonds: Array<[number, number]>): StructLike {
  return {
    findBondId: vi.fn((a: number, b: number) => {
      const idx = bonds.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
      return idx >= 0 ? idx : null;
    }),
    bonds: {
      forEach: vi.fn((cb) => {
        bonds.forEach(([begin, end], id) => cb({ begin, end }, id));
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}
```

**`makeLayer` helper pattern** (highlightUtils.test.ts lines 116–125):
```typescript
function makeLayer(overrides: Partial<Layer>): Layer {
  return {
    type: 'formula',
    prefix: '',
    text: '',
    atoms: [],
    bonds: [],
    ...overrides,
  };
}
```

**Test fixture A structure** (from RESEARCH.md Fixture A):
```typescript
// c-layer segment: "1-2-3(-4-5)-6"
// auxMap: {1:0, 2:1, 3:2, 4:3, 5:4, 6:5}
// bonds: 0-1, 1-2, 2-3, 3-4, 2-5 (pool IDs 0-4 respectively)
const auxMapA: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const bondsA: Array<[number, number]> = [[0,1],[1,2],[2,3],[3,4],[2,5]];
```

**`buildSubHoverSpecs` call pattern** (highlightUtils.test.ts): note the full signature including `atomElements`, `hAtomPoolIds`, `layer`, `struct`, `resolveVarFn`:
```typescript
buildSubHoverSpecs(subHover, auxMap, atomElements, [], layer, struct, resolveVarFn)
```

**`describe`/`it` naming convention** (trace_benzene.test.ts lines 29–59):
```typescript
describe('buildSubHoverSpecs — CLYR-01 atom hover drops incident bonds', () => {
  it('atom 3 hover: spec.atoms=[2], spec.bonds=[]', () => { ... });
});
describe('tokenizeCLayerSeg — "1-2-3(-4-5)-6"', () => {
  it('emits 13 tokens with correct types', () => { ... });
  it('hyphen tokens have correct leftLocal / rightLocal', () => { ... });
  it('open token closeTokenIdx points to matching close token', () => { ... });
});
```

---

### `src/__tests__/LayerText.clyr.test.tsx` — component tests for hoverable `-`/`(`/`)` spans

**Role:** test (happy-dom environment)
**Analog:** `src/__tests__/LayerText.mixedFragment.test.tsx` — exact structural match

**Vitest environment:** `happy-dom` — the file is in `src/__tests__/**/*.test.tsx`, matched by `vitest.config.ts` line 9: `['src/__tests__/**/*.test.tsx', 'happy-dom']`.

**File header and imports** (mixedFragment.test.tsx lines 1–13):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LayerText } from '../components/LayerText';
import type { Layer, SubHover } from '../lib/parseInchi';
```

**Store mock pattern** (mixedFragment.test.tsx lines 14–27) — copy exactly:
```typescript
const mockSetSubHover = vi.fn();

vi.mock('../store', () => {
  const storeState = () => ({
    setSubHover: mockSetSubHover,
  });
  const useInchiStore = vi.fn() as ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof storeState> };
  useInchiStore.getState = () => storeState();
  return { useInchiStore };
});

beforeEach(() => {
  vi.clearAllMocks();
});
```

**Minimal `Layer` object pattern** (mixedFragment.test.tsx lines 29–31):
```typescript
const cLayer: Layer = { type: 'c', prefix: 'c', text: '', atoms: [], bonds: [] };
```

**`lastHit()` helper pattern** (mixedFragment.test.tsx lines 33–37) — reuse verbatim:
```typescript
function lastHit(): SubHover | undefined {
  const calls = mockSetSubHover.mock.calls.filter((c) => c[0] != null);
  return calls.length ? (calls[calls.length - 1][0] as SubHover) : undefined;
}
```

**Span query + `fireEvent.mouseEnter` pattern** (mixedFragment.test.tsx lines 43–58):
```typescript
const { container } = render(
  <LayerText layer={cLayer} rawText="1-2-3(-4-5)-6" fragCounts={[6]} />
);
// Find hyphen spans by text content
const hyphens = Array.from(container.querySelectorAll('span')).filter(s => s.textContent === '-');
fireEvent.mouseEnter(hyphens[0]);
const hit = lastHit();
expect(hit).toBeDefined();
expect(hit!.kind).toBe('bond');
expect(hit!.endpointPairs).toBeDefined();
```

**Test describe/it naming convention** (from mixedFragment.test.tsx line 39):
```typescript
describe('LayerText ConnectionText — c-layer hyphen/paren hover spans (Phase 15)', () => {
  it('single-fragment: hyphen span emits kind="bond" with correct endpointPairs', () => { ... });
  it('single-fragment: open-paren span emits kind="branch" with bondPairs covering branch bonds', () => { ... });
  it('single-fragment: close-paren span emits same bondPairs as matching open-paren', () => { ... });
  it('multi-fragment: hyphen in fragment 2 has offset-applied endpointPairs', () => { ... });
  it('N*: hyphen endpointPairs covers both fragment instances', () => { ... });
});
```

---

## Shared Patterns

### CSS class for interactive tokens
**Source:** `src/components/LayerText.tsx` line 139
**Apply to:** All new hoverable span emissions in `ConnectionText` (hyphen, open-paren, close-paren)
```typescript
className={styles.inchiSubtoken}
```
The `inchiSubtoken` class provides the `cursor: crosshair` hover affordance. All three new token types must use it when they carry a non-empty hover payload.

### `resolveVarFn('--c-conn')` — connection layer color
**Source:** `src/lib/highlightUtils.ts` line 442
**Apply to:** All three new/modified cases in `buildSubHoverSpecs` (`atom`, `bond`, `branch`)
```typescript
color: resolveVarFn('--c-conn')
```
Per CONTEXT.md "Claude's Discretion": reuse `--c-conn` for all c-layer hover highlights; no new color tokens.

### `HighlightSpec` return shape
**Source:** `src/lib/highlightUtils.ts` lines 23–28
**Apply to:** All new `buildSubHoverSpecs` cases
```typescript
return [{ atoms: [], bonds, rgroupAttachmentPoints: [], color }];
```
The `rgroupAttachmentPoints: []` field is always required (not optional) — match all existing cases.

### `struct.findBondId` bond lookup
**Source:** `src/lib/highlightUtils.ts` lines 119–124 (used in `buildHighlightSpecs` c case)
**Apply to:** New `bond` and `branch` cases in `buildSubHoverSpecs`
```typescript
const kA = auxMap[a];
const kB = auxMap[b];
if (kA === undefined || kB === undefined) continue;
const bid = struct.findBondId(kA, kB);
if (bid !== null) bonds.push(bid);
```
`findBondId` is symmetric (RESEARCH.md Assumption A1, VERIFIED). No need to try both orderings.

### Guard: `buildHighlightSpecs` `'c'` case is NOT modified
**Source:** `src/lib/highlightUtils.ts` lines 111–131
**Apply to:** CLYR-01 change — the incident-bond removal applies ONLY to `buildSubHoverSpecs` `atom` case (line 432), not to `buildHighlightSpecs` (the whole-layer hover). See RESEARCH.md Pitfall 4.

---

## No Analog Found

All five files have analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/components/`, `src/lib/__tests__/`, `src/__tests__/`
**Files read for pattern extraction:**
- `/home/bsmue/code/explain-that-inchi/src/lib/parseInchi.ts` (lines 1–100)
- `/home/bsmue/code/explain-that-inchi/src/lib/highlightUtils.ts` (lines 1–60, 370–498)
- `/home/bsmue/code/explain-that-inchi/src/components/LayerText.tsx` (lines 1–100, 120–220)
- `/home/bsmue/code/explain-that-inchi/src/lib/__tests__/highlightUtils.test.ts` (lines 1–160)
- `/home/bsmue/code/explain-that-inchi/src/lib/__tests__/trace_benzene.test.ts` (lines 1–59)
- `/home/bsmue/code/explain-that-inchi/src/__tests__/LayerText.mixedFragment.test.tsx` (lines 1–100)
- `/home/bsmue/code/explain-that-inchi/vitest.config.ts` (full)
**Pattern extraction date:** 2026-06-19
