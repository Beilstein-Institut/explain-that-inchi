# Phase 15: C-layer hover precision — Research

**Researched:** 2026-06-19
**Domain:** InChI c-layer token grammar; React span tokenization; Ketcher highlight pipeline
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Hovering a c-layer atom number highlights **only that single atom — no bonds**.
  (Changes the current `buildSubHoverSpecs` `atom` case, which adds all incident bonds.)
- **D-02:** Hovering a hyphen `-` highlights **only the bond** connecting its two endpoint
  atoms. Endpoint atoms are NOT filled.
- **D-03:** Hovering `(` or `)` highlights the **whole branch's bonds, including nested
  sub-branches AND the stem bond** from the attachment point to the first atom inside.
- **D-04:** A matching `(` / `)` pair is **symmetric** — hovering either highlights the
  identical bond set for that branch.
- **D-05:** All three token kinds must resolve within the correct fragment for `;`-separated
  and `N*`-prefixed multi-fragment c-layers. Reuse the existing `cumOffset` / `canonicals`
  machinery — do not invent a parallel scheme.

### Claude's Discretion

- Color: reuse `--c-conn` for all c-layer hover highlights (atoms, bonds, branch bonds).
- Token affordance: hyphens and parentheses get the same `inchiSubtoken` CSS class and
  `cursor: crosshair` as atom numbers.
- Parse approach for branch detection and bond resolution is the planner's call —
  must work off canonical→pool-ID `auxMap`, never by re-parsing the rendered string.
- New `SubHover` kinds: the current union is `'element' | 'atom' | 'stereo' | 'hAtoms' |
  'mobileH'`. Adding `'bond'` and `'branch'` kinds (or extending the `atom` case) is the
  planner's call.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLYR-01 | Hovering a canonical atom number in the c-layer highlights only that single atom (no bonds) | Drop `incidentBonds` from `buildSubHoverSpecs` `atom` case (line 439–441, highlightUtils.ts) |
| CLYR-02 | Hovering a hyphen `-` highlights the bond connecting the two atoms it joins | New `SubHover` kind `'bond'` with `endpointPairs`; new case in `buildSubHoverSpecs` |
| CLYR-03 | Hovering `(` or `)` highlights all bonds in that branch (incl. nested + stem bond) | New `SubHover` kind `'branch'` with `bondPairs`; new case in `buildSubHoverSpecs` |
| CLYR-04 | All c-layer hovers correct for `;`-separated multi-fragment molecules | Extend the existing `cumOffset` pattern in `ConnectionText` to hyphen/paren tokens |
| CLYR-05 | All c-layer hovers correct for `N*`-prefixed duplicated/repeated fragments | Use the existing `canonicals` array pattern; produce `endpointPairs` / `bondPairs` covering all instances |

</phase_requirements>

---

## Summary

Phase 15 makes every c-layer token interactive with pinpoint canvas highlighting. The work is
purely in the highlight-spec pipeline; no InChI string reconstruction, no changes to other layers.

The c-layer grammar is a parenthesized chain notation where atoms are positive integers, `-`
separates adjacent bonded atoms, `(` opens a branch from the preceding atom, and `)` closes it.
The existing `parseConnectionBonds` function (parseInchi.ts:58–90) encodes this grammar precisely
with a stack machine — the same algorithm is the authoritative reference for what each token
**denotes**. [VERIFIED: direct code analysis of parseInchi.ts]

Three files need changes: `parseInchi.ts` (extend `SubHover` type), `highlightUtils.ts` (fix
`atom` case and add `bond`/`branch` cases), and `LayerText.tsx` (refactor `ConnectionText`'s
`renderSegment` to pre-tokenize and emit hover targets for `-`, `(`, `)`).

**Primary recommendation:** Pre-tokenize the c-layer segment into a typed `CLayerToken[]` array
in a single forward scan, then apply offset/canonicalFn, collect branch bond sets, and render
React spans. This two-pass approach is the only clean way to know branch bond sets at `(` render
time without mutable deferred objects.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| C-layer token grammar (what each char denotes) | Library (`parseInchi.ts`) | — | Pure parsing, no browser needed; testable in Vitest node env |
| SubHover type shape | Library (`parseInchi.ts`) | — | Shared interface consumed by store, LayerText, highlightUtils |
| Token emission (atom, hyphen, paren → SubHover) | Component (`LayerText.tsx` `ConnectionText`) | — | React rendering; controls what hover payloads each span carries |
| Highlight spec resolution (canonical → pool ID → bond ID) | Library (`highlightUtils.ts` `buildSubHoverSpecs`) | — | Pure; reads auxMap + struct; no React dependency |
| Canvas update (Ketcher highlight API) | Hook (`useKetcherHighlights.ts`) | — | No changes needed this phase; consumes specs unchanged |

---

## Standard Stack

This phase adds **no new npm packages**. All needed tools are already in the project.

### Core (existing, unchanged)
| Library | Version | Purpose |
|---------|---------|---------|
| React 18 + TypeScript | 18.2 / 5.x | Span rendering in `ConnectionText` |
| Vitest 3 | 3.x | Unit tests (node + happy-dom environments) |
| @testing-library/react | existing | DOM interaction tests for `LayerText` |

### Package Legitimacy Audit

No new packages are installed in this phase.

**Packages removed due to slopcheck:** none — no new packages.

---

## Architecture Patterns

### System Architecture Diagram

```
User hovers c-layer token span
         |
         v
ConnectionText.renderSegment (LayerText.tsx)
  pre-tokenizes segment -> CLayerToken[]
  applies offset / canonicalFn
  emits React spans with subHoverProps({kind:'atom'|'bond'|'branch', ...})
         |
         v
useInchiStore.setSubHover(SubHover)
         |
         v
useKetcherHighlights (useEffect)
  calls buildSubHoverSpecs(subHover, ...)
         |
         v
buildSubHoverSpecs (highlightUtils.ts)
  'atom'   -> {atoms:[kId], bonds:[]} (D-01: no incident bonds)
  'bond'   -> {atoms:[], bonds:[bondId]}
  'branch' -> {atoms:[], bonds:[all branch bond ids]}
         |
         v
applyKetcherHighlights -> Ketcher highlights.clear/create
```

### Recommended Project Structure (no new files/folders needed)

```
src/
├── lib/
│   ├── parseInchi.ts        # extend SubHover type + add tokenizeCLayerSeg()
│   └── highlightUtils.ts    # fix 'atom' case, add 'bond' and 'branch' cases
├── components/
│   └── LayerText.tsx        # refactor ConnectionText.renderSegment
└── lib/__tests__/
    └── clyr.test.ts         # new test file: tokenizeCLayerSeg + buildSubHoverSpecs new cases
```

---

## C-Layer Grammar Reference (Research Question 1)

The InChI `/c` connection layer encodes a spanning tree of the heavy-atom graph using a
parenthesized chain notation. The authoritative grammar is implied by `parseConnectionBonds`
(parseInchi.ts:58–90) — a stack machine verified by direct code tracing. [VERIFIED: parseInchi.ts:58–90]

### Token Semantics

| Token | Denotes | Hover target? | What to highlight |
|-------|---------|--------------|-------------------|
| Atom number `N` | Atom N | YES | That single atom |
| `-` (hyphen) | Bond between prev atom and next atom | YES | That single bond |
| `(` | Branch opening from prev atom | YES | All bonds in the branch (incl. nested, incl. stem) |
| `)` | Branch closing (mirror of matching `(`) | YES | Same bond set as the matching `(` |
| `;` | Fragment separator | NO | Non-interactive |
| `,` | Comma inside branch (rare) | NO | Non-interactive |

### Grammar Walkthrough

Given segment `1-2-3(-4-5)-6`:

```
pos  char  action                              bonds formed so far
0    1     first atom; last=1
1    -     hyphen; leftAtom=1, rightAtom=?
2    2     atom 2; rightAtom of prev hyphen=2  {1→2}; last=2
3    -     hyphen; leftAtom=2, rightAtom=?
4    3     atom 3; rightAtom of prev hyphen=3  {1→2, 2→3}; last=3
5    (     push last=3 onto stack; attachPoint=3
6    -     hyphen; leftAtom=3, rightAtom=?
7    4     atom 4; rightAtom=4                {1→2,2→3,3→4}; last=4
8    -     hyphen; leftAtom=4, rightAtom=?
9    5     atom 5; rightAtom=5                {1→2,2→3,3→4,4→5}; last=5
10   )     pop stack -> last=3
11   -     hyphen; leftAtom=3, rightAtom=?
12   6     atom 6; rightAtom=6                {1→2,2→3,3→4,4→5,3→6}; last=6

Branch at ( pos 5, ) pos 10:
  All hyphens within [5..10] = {3→4, 4→5}
  This IS the branch bond set (stem bond 3→4 is included automatically)
```

### Ring Closure Bonds

Benzene c-layer `1-2-4-6-5-3-1`: the final `-1` is the ring-closure bond. The hyphen between
atom 3 and the repeated `1` is a valid hover target for bond 3→1. The second `1` span renders
as a normal atom hover span (hovering it highlights atom 1 — harmless duplicate). [VERIFIED: node trace]

### Comma Inside Branch

`19(18,23)`: bonds 19→18 and 19→23 are formed, but there are **no hyphen characters** in the
text. No hyphen hover spans are emitted. The comma is buffered into plain text. This is correct:
"no token, no hover." [VERIFIED: node trace]

---

## Bond Resolution Pattern (Research Question 2)

Given two canonical atom numbers `a` and `b` (globally offset), the Ketcher bond ID is
resolved via: [VERIFIED: highlightUtils.ts:119–124]

```typescript
const kA = auxMap[a];  // canonical → Ketcher pool ID (0-based)
const kB = auxMap[b];
const bid = struct.findBondId(kA, kB);  // null if not found
```

`struct.findBondId` is symmetric — it finds the bond regardless of which endpoint is `begin`
or `end` in the Ketcher struct. [VERIFIED: StructLike interface at highlightUtils.ts:32–35]

The existing bond-finding code in `buildHighlightSpecs` c-layer case (lines 117–124) and
in `buildSubHoverSpecs` `atom` case (lines 439–441) is directly reusable for the new cases.

---

## CLYR-01: Atom Case Change (Research Question 3)

**Current behavior** (highlightUtils.ts:432–443): [VERIFIED: highlightUtils.ts:432–443]

```typescript
case 'atom': {
  const canonIds = subHover.canonicals ?? (subHover.canonical != null ? [subHover.canonical] : []);
  const kAtomIds = canonIds.map(c => auxMap[c]).filter((id): id is number => id !== undefined);
  if (kAtomIds.length === 0) return [];
  const incidentBonds: number[] = [];
  struct.bonds.forEach((bond, bid) => {          // <- DELETE THESE 3 LINES
    if (kAtomIds.includes(bond.begin) || kAtomIds.includes(bond.end)) incidentBonds.push(bid);
  });
  const color = resolveVarFn('--c-conn');
  return [{ atoms: kAtomIds, bonds: incidentBonds, ... }];  // <- bonds: [] instead
}
```

**Required change** (D-01): remove the `struct.bonds.forEach` incident-bond collection and
return `bonds: []`. This is a 3-line deletion + 1-line change.

---

## SubHover Type Extension (Research Question 3 continued)

Recommended: add **two new `kind` values** rather than extending the `atom` case. This keeps
each kind's semantics clean and makes `buildSubHoverSpecs` easy to read.

### Proposed SubHover shape (parseInchi.ts:32–47)

```typescript
export interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH' | 'bond' | 'branch';

  // --- existing fields (unchanged) ---
  el?: string;
  canonRange?: [number, number];
  canonical?: number;
  canonicals?: number[];
  atom?: number;
  sign?: string;
  atoms?: number[];
  count?: number;

  // --- new fields ---
  /** 'bond' kind: each pair is [leftCanonical, rightCanonical] with fragment offset applied.
   *  Single fragment: one pair. N* multi-fragment: one pair per fragment instance. */
  endpointPairs?: [number, number][];

  /** 'branch' kind: all [leftCanonical, rightCanonical] pairs for every hyphen inside the
   *  branch's brackets. Includes nested sub-branches. Fragment offset already applied.
   *  N* multi-fragment: pairs from all fragment instances combined. */
  bondPairs?: [number, number][];
}
```

### New `buildSubHoverSpecs` cases

```typescript
case 'bond': {
  const bonds: number[] = [];
  for (const [a, b] of subHover.endpointPairs ?? []) {
    const kA = auxMap[a]; const kB = auxMap[b];
    if (kA === undefined || kB === undefined) continue;
    const bid = struct.findBondId(kA, kB);
    if (bid !== null) bonds.push(bid);
  }
  if (bonds.length === 0) return [];
  return [{ atoms: [], bonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-conn') }];
}

case 'branch': {
  const bonds: number[] = [];
  for (const [a, b] of subHover.bondPairs ?? []) {
    const kA = auxMap[a]; const kB = auxMap[b];
    if (kA === undefined || kB === undefined) continue;
    const bid = struct.findBondId(kA, kB);
    if (bid !== null && !bonds.includes(bid)) bonds.push(bid);
  }
  if (bonds.length === 0) return [];
  return [{ atoms: [], bonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-conn') }];
}
```

---

## CLYR-04/05: Fragment Offset Machinery (Research Question 4)

### Current machinery (ConnectionText, LayerText.tsx:123–189) [VERIFIED: LayerText.tsx:123–189]

The existing `renderSegment(seg, offset, canonicalFn?)` loop:
- For `;`-separated fragments: iterates `segments = text.split(';')`, tracks `cumOffset` (the
  cumulative heavy-atom count of all preceding fragments), passes `cumOffset` as `offset` to
  `renderSegment`. Atom `n` in fragment `i` becomes canonical `n + cumOffset`.
- For `N*` (top-level or per-segment): uses a `canonicalFn` closure that maps local `n` to
  `{canonical: n + cumOffset, canonicals: [n+off_f1, n+off_f2, ...]}`.

### Failure modes if naively applied without extension

**CLYR-04 (`;`-fragment hyphen):** If a hyphen is emitted with `leftAtom=last` (tracked from the
PREVIOUS atom in the stream), and `last` is the raw local integer rather than the offset-applied
canonical, the bond resolves in the wrong fragment. Fix: track `lastLocal` (raw integer from the
segment), apply `offset` at emit time when building `endpointPairs`.

**CLYR-04 (`;`-fragment paren):** The branch bond set is computed from hyphens in the token
range — all with their local integers. The offset must be applied consistently when building
`bondPairs`. Fix: apply `offset` to every `localLeft`/`localRight` in the bond-pair list.

**CLYR-05 (N* hyphen):** For `N*` multi-fragment, each canonical expands to multiple global
IDs. A hyphen between local atoms `a` and `b` denotes a bond in EVERY fragment instance.
`endpointPairs` must contain one pair per fragment instance: `zip(canonicalFn(a).canonicals, canonicalFn(b).canonicals)`.

**CLYR-05 (N* paren):** Similarly, branch bond sets must include all fragment instances.
For `N*` with `n` copies: `bondPairs = allHyphensInRange.flatMap(h => zip(canonicalFn(h.leftLocal).canonicals, canonicalFn(h.rightLocal).canonicals))`.

### Correct extension: pre-tokenize before applying offset

```
tokenizeCLayerSeg(seg) -> CLayerToken[]  (all local integers, no offset)
    |
    v  apply offset or canonicalFn
    v
resolveTokenCanonicals(tokens, offset, canonicalFn) -> ResolvedToken[]
    |
    v  collect branch bonds by scanning token ranges
    v
buildBranchBondPairs(tokens, openIdx, closeIdx) -> [number,number][]
    |
    v
renderTokensToSpans(tokens) -> React.ReactNode[]
```

---

## Tokenization Implementation (Research Question 5)

### `tokenizeCLayerSeg` — pure function for parseInchi.ts

Input: a single c-layer segment string (no `;` separators — those are split before calling).
Output: `CLayerToken[]` where each token records its character positions and local (pre-offset) values.

```typescript
type CLayerToken =
  | { type: 'atom';   start: number; end: number; localN: number }
  | { type: 'hyphen'; pos: number; leftLocal: number | null; rightLocal: number | null }
  | { type: 'open';   pos: number; attachLocal: number | null; closeTokenIdx: number }
  | { type: 'close';  pos: number; openTokenIdx: number }
  | { type: 'other';  slice: string };  // comma, or any unknown char

// Algorithm (single forward scan, O(n)):
function tokenizeCLayerSeg(seg: string): CLayerToken[] {
  const tokens: CLayerToken[] = [];
  const stack: number[] = [];  // indices into tokens[] of pending 'open' tokens
  let lastLocal: number | null = null;
  let i = 0;
  while (i < seg.length) {
    const c = seg[i];
    if (/\d/.test(c)) {
      let j = i;
      while (j < seg.length && /\d/.test(seg[j])) j++;
      const localN = parseInt(seg.slice(i, j), 10);
      // Fill rightLocal of preceding hyphen
      if (tokens.length > 0 && tokens[tokens.length - 1].type === 'hyphen') {
        (tokens[tokens.length - 1] as HyphenToken).rightLocal = localN;
      }
      tokens.push({ type: 'atom', start: i, end: j, localN });
      lastLocal = localN;
      i = j;
    } else if (c === '-') {
      tokens.push({ type: 'hyphen', pos: i, leftLocal: lastLocal, rightLocal: null });
      i++;
    } else if (c === '(') {
      const openIdx = tokens.length;
      tokens.push({ type: 'open', pos: i, attachLocal: lastLocal, closeTokenIdx: -1 });
      stack.push(openIdx);
      i++;
    } else if (c === ')') {
      const openIdx = stack.pop() ?? -1;
      const closeIdx = tokens.length;
      tokens.push({ type: 'close', pos: i, openTokenIdx: openIdx });
      if (openIdx >= 0) (tokens[openIdx] as OpenToken).closeTokenIdx = closeIdx;
      // Restore lastLocal to the attachLocal of the closing branch
      if (openIdx >= 0) lastLocal = (tokens[openIdx] as OpenToken).attachLocal;
      i++;
    } else {
      // comma, semicolon (shouldn't appear — segments are pre-split), etc.
      tokens.push({ type: 'other', slice: c });
      i++;
    }
  }
  return tokens;
}
```

### Branch bond collection

After tokenization, for an `'open'` token at index `oi` with `closeTokenIdx = ci`:

```typescript
function collectBranchHyphens(tokens: CLayerToken[], oi: number, ci: number): HyphenToken[] {
  // All 'hyphen' tokens strictly between oi and ci (exclusive) — automatically includes nested.
  return tokens.slice(oi + 1, ci).filter(t => t.type === 'hyphen') as HyphenToken[];
}
```

This is O(n) in the branch size. Since branches are small in practice (InChI c-layers for
drug-like molecules are typically under 100 chars), this is acceptable.

### Offset application

```typescript
// Single-fragment with offset:
function applyOffset(localN: number, offset: number): { canonical: number; canonicals?: undefined } {
  return { canonical: localN + offset };
}

// N* multi-fragment:
function applyCanonicalFn(localN: number, fn: (n: number) => { canonical: number; canonicals?: number[] }) {
  return fn(localN);
}
```

For hyphen `endpointPairs` in N* context:
```typescript
const leftR  = canonicalFn(h.leftLocal!);
const rightR = canonicalFn(h.rightLocal!);
// zip: one pair per fragment instance
const pairs: [number,number][] = (leftR.canonicals ?? [leftR.canonical])
  .map((lc, i) => [lc, (rightR.canonicals ?? [rightR.canonical])[i]] as [number, number]);
```

---

## Edge Cases (Research Question 6)

### Ring-closure bond
- Segment `1-2-4-6-5-3-1` (benzene): the final `-1` is a hyphen at pos 11 with
  `leftLocal=3`, `rightLocal=1`. Hovering it resolves bond 3→1 (the ring closure).
- The second `1` atom span is rendered and hoverable — it highlights atom 1, same as the
  first `1` span. This is harmless and correct.
- **Test fixture:** auxMap `{1:0,2:1,3:2,4:3,5:4,6:5}`, struct with benzene bonds.
  Hyphen at pos 11 → `endpointPairs=[[3,1]]` → `struct.findBondId(2,0)` → ring-closure bond ID.

### Single-atom branch
- Segment `1-2-3(-4)-5`: branch is just atom 4.
  Tokens: atom(1), hyphen(1→2), atom(2), hyphen(2→3), atom(3), open(attach=3), hyphen(3→4), atom(4), close, hyphen(3→5), atom(5).
  `collectBranchHyphens` in [open..close]: one hyphen `{3→4}`.
  Branch hover: `bondPairs=[[3,4]]` → one bond highlighted.
  **This is correct** — the stem bond IS the only bond in this branch.

### Deeply nested branches
- Segment `1-2-3(-4(-5-6)-7)-8`:
  - Inner branch (attach=4): hyphens `{4→5, 5→6}` → `bondPairs=[[4,5],[5,6]]`
  - Outer branch (attach=3): hyphens in [outer..close] = `{3→4, 4→5, 5→6, 4→7}` → all 4 bonds.
  - Hovering outer `(` highlights all 4 bonds.
  - **Test fixture:** verify that `collectBranchHyphens` collects all hyphens including those inside nested brackets.

### Multi-fragment with a branch
- Text `1-2-3(-4)-5;1-2-3`, fragCounts `[5,3]`:
  - Fragment 1 (offset=0): `( at local attach=3 )` → branch bond `3→4` → `endpointPairs=[[3,4]]`
  - Fragment 2 (offset=5): atoms 6,7,8 — no parens, hyphen between local 1 and 2 → `endpointPairs=[[6,7]]`
  - **Test fixture:** after `;` split, segment 2's tokens get offset=5 applied.

### N* duplicated fragment with a branch
- Text `2*1-2(-3)-4`, fragCounts `[4,4]`:
  - Local branch: hyphen `{2→3}` inside the paren.
  - Fragment 1 offset=0: bond pair `[2,3]`
  - Fragment 2 offset=4: bond pair `[6,7]`
  - Branch hover `bondPairs=[[2,3],[6,7]]` — both fragment instances highlighted.
  - **Test fixture:** `canonicalFn(2).canonicals=[2,6]`, `canonicalFn(3).canonicals=[3,7]`.

### Comma inside branch (no hyphen hover)
- Text `19(18,23)` (rare in real InChI but spec-valid):
  - After atom 19: `(` → open token.
  - Then atom 18 (no preceding `-`): no hyphen token emitted before it.
  - Then atom 23 (no preceding `-`): no hyphen token emitted before it.
  - Close `)`.
  - `collectBranchHyphens` in [open..close]: **zero hyphens**.
  - Branch hover: `bondPairs=[]` → empty spec → `buildSubHoverSpecs` returns `[]`.
  - No canvas highlight for this paren — the paren spans are still rendered but produce no highlight.
  - **Decision for planner:** Either suppress the `subHoverProps` for parens with zero bond pairs
    (no hover affordance), or emit the span but return `[]` from `buildSubHoverSpecs` (hover
    triggers nothing visible). Suppression is cleaner UX but adds complexity. Returning `[]` is
    simpler and safe (the `inchiSubtoken` CSS ring still shows on hover — minimal visual confusion
    for a rare edge case).

---

## Common Pitfalls

### Pitfall 1: Pre-computing branch bond sets for the `(` render before `)` is seen
**What goes wrong:** If you try to emit the `(` span immediately while walking the segment
left-to-right, you don't yet know which hyphens are inside the branch.
**Why it happens:** The branch closes at `)` — you can't collect its bonds until you reach `)`.
**How to avoid:** Two-pass approach: tokenize first (one forward scan), then collect branch bonds
from token ranges, then render spans. Do NOT try to emit `(` spans in a single left-to-right pass
while accumulating bonds into a mutable reference.
**Warning signs:** Temptation to use `React.useRef` or `React.createRef` to mutate the span's
hover payload after it is pushed to `parts[]`. Don't do this.

### Pitfall 2: Tracking `lastLocal` through `(` and `)` in the tokenizer
**What goes wrong:** `lastLocal` (the "current atom" for the hyphen's left endpoint) must be
restored to the branch's attachment point when `)` is encountered — exactly as `parseConnectionBonds`
does with `last = stack.pop()`. Forgetting this produces wrong left endpoints for hyphens that
follow a `)`.
**How to avoid:** In `tokenizeCLayerSeg`, when processing `)`, restore `lastLocal =
(tokens[openIdx] as OpenToken).attachLocal`.

### Pitfall 3: Applying offset inside the tokenizer instead of after
**What goes wrong:** If the tokenizer applies `offset`, the same tokenizer cannot be reused for
N* multi-fragment where `canonicalFn` is needed instead of a scalar offset.
**How to avoid:** `tokenizeCLayerSeg` stores **local** (pre-offset) integers only. The caller
applies offset or `canonicalFn` after tokenization.

### Pitfall 4: Forgetting that `incidentBonds` removal (CLYR-01) affects the whole-layer hover too
**What goes wrong:** `buildHighlightSpecs` case `'c'` (line 111–131) still highlights ALL atoms
and ALL bonds for the whole-layer hover. This is **correct and intentional** — the whole-layer
hover unchanged. Only the `buildSubHoverSpecs` `atom` case (line 432) needs the incident-bonds
removal.
**Warning signs:** Accidentally editing `buildHighlightSpecs` case `'c'` instead of
`buildSubHoverSpecs` case `'atom'`.

### Pitfall 5: N* segment with `;` — must NOT match the top-level `multMatch` guard
**What goes wrong:** The existing `ConnectionText` guard `!text.includes(';') ? text.match(/^(\d+)\*.../)  : null` (LayerText.tsx:153) correctly prevents a mixed `2*...;2*...` text from hitting the single-segment N* branch. The new tokenization code inside the `;` loop branches must observe the same guard: each segment may have its own `N*` prefix, but the outer loop handles it.
**How to avoid:** Keep the existing `segMult` pattern for `;`-loop segments, apply the new tokenizer
to the segment AFTER stripping the `N*` prefix.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bond ID lookup | Custom bond adjacency map | `struct.findBondId(kA, kB)` (StructLike) | Already symmetric; already used in 3 places |
| Fragment offset | New offset calculation | Existing `cumOffset` / `fragCounts[fragIdx]` pattern | Proven correct across `h`, `t`, `b`, `q` layers |
| N* canonical expansion | New multi-instance logic | Existing `canonicalFn(n).canonicals` pattern | Proven in `ConnectionText` atom case |

---

## Runtime State Inventory

Not applicable — greenfield token additions, no rename/migration.

---

## Code Examples

### Example 1: CLYR-01 fix — atom case drops incident bonds

```typescript
// highlightUtils.ts — buildSubHoverSpecs, 'atom' case
// BEFORE (line 432-443):
case 'atom': {
  const canonIds = subHover.canonicals ?? (subHover.canonical != null ? [subHover.canonical] : []);
  const kAtomIds = canonIds.map(c => auxMap[c]).filter((id): id is number => id !== undefined);
  if (kAtomIds.length === 0) return [];
  const incidentBonds: number[] = [];
  struct.bonds.forEach((bond, bid) => {
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

### Example 2: CLYR-02 — bond case

```typescript
// highlightUtils.ts — buildSubHoverSpecs, new 'bond' case
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

### Example 3: CLYR-03 — branch case

```typescript
// highlightUtils.ts — buildSubHoverSpecs, new 'branch' case
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

### Example 4: Hyphen emission in ConnectionText (single-fragment, offset mode)

```typescript
// In the render-tokens loop after pre-tokenization:
case 'hyphen': {
  const t = token as HyphenToken;
  if (t.leftLocal == null || t.rightLocal == null) {
    // Malformed — emit as plain text
    parts.push(<span key={key++}>-</span>);
    break;
  }
  const endpointPairs: [number, number][] = canonicalFn
    ? (() => {
        const lc = canonicalFn(t.leftLocal);
        const rc = canonicalFn(t.rightLocal);
        const ls = lc.canonicals ?? [lc.canonical];
        const rs = rc.canonicals ?? [rc.canonical];
        return ls.map((l, i) => [l, rs[i]] as [number, number]);
      })()
    : [[t.leftLocal + offset, t.rightLocal + offset]];
  parts.push(
    <span key={key++} className={styles.inchiSubtoken}
      {...subHoverProps({ kind: 'bond', endpointPairs })}>
      {'-'}
    </span>
  );
  break;
}
```

### Example 5: Open-paren emission in ConnectionText

```typescript
case 'open': {
  const t = token as OpenToken;
  const hyphensInBranch = collectBranchHyphens(tokens, tokenIdx, t.closeTokenIdx);
  const bondPairs: [number, number][] = hyphensInBranch.flatMap(h => {
    if (h.leftLocal == null || h.rightLocal == null) return [];
    if (canonicalFn) {
      const lc = canonicalFn(h.leftLocal);
      const rc = canonicalFn(h.rightLocal);
      const ls = lc.canonicals ?? [lc.canonical];
      const rs = rc.canonicals ?? [rc.canonical];
      return ls.map((l, i) => [l, rs[i]] as [number, number]);
    }
    return [[h.leftLocal + offset, h.rightLocal + offset] as [number, number]];
  });
  if (bondPairs.length === 0) {
    // No bonds in branch (comma-only branch) — render plain non-interactive span
    parts.push(<span key={key++}>{'('}</span>);
  } else {
    parts.push(
      <span key={key++} className={styles.inchiSubtoken}
        {...subHoverProps({ kind: 'branch', bondPairs })}>
        {'('}
      </span>
    );
  }
  break;
}
// Close paren: same bondPairs as its matching open (look up tokens[openTokenIdx].bondPairs)
```

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. All changes are TypeScript source files and tests.
The Vitest + @testing-library/react toolchain is confirmed working (304 tests pass).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/__tests__/clyr.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| CLYR-01 | atom subHover → spec.bonds is empty | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "atom hover"` | Wave 0 gap |
| CLYR-01 | existing atom tests still pass | regression | `npx vitest run src/lib/__tests__/highlightUtils.test.ts` | Exists |
| CLYR-02 | hyphen subHover → spec.atoms=[], spec.bonds=[bond] | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "hyphen hover"` | Wave 0 gap |
| CLYR-02 | ring-closure hyphen → correct bond ID | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "ring closure"` | Wave 0 gap |
| CLYR-03 | open-paren → all branch bonds (incl. nested) | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "branch open"` | Wave 0 gap |
| CLYR-03 | close-paren → same bond set as matching open-paren | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "branch close"` | Wave 0 gap |
| CLYR-03 | single-atom branch → only stem bond | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "single atom branch"` | Wave 0 gap |
| CLYR-04 | fragment-2 hyphen resolves with correct offset (canonical = local + cumOffset) | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "multi fragment hyphen"` | Wave 0 gap |
| CLYR-04 | fragment-2 branch resolves with correct offset | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "multi fragment branch"` | Wave 0 gap |
| CLYR-05 | N* hyphen → endpointPairs covers both fragment instances | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "N-star hyphen"` | Wave 0 gap |
| CLYR-05 | N* branch → bondPairs covers both fragment instances | unit | `npx vitest run src/lib/__tests__/clyr.test.ts -t "N-star branch"` | Wave 0 gap |
| CLYR-01-05 | LayerText ConnectionText renders hoverable `-`/`(`/`)` spans | component | `npx vitest run src/__tests__/LayerText.clyr.test.tsx` | Wave 0 gap |
| CLYR-01-05 | no regression on existing 304-test suite | regression | `npx vitest run` | All pass |

### Test Fixtures

#### Fixture A: Linear + branch (CLYR-01, CLYR-02, CLYR-03)
- c-layer segment: `"1-2-3(-4-5)-6"`
- auxMap: `{1:0, 2:1, 3:2, 4:3, 5:4, 6:5}`
- mockStruct bonds: 0-1, 1-2, 2-3, 3-4, 2-5 (pool IDs)
- atom 3 hover → `spec.atoms=[2], spec.bonds=[]`
- hyphen `-` (pos 8, between 4 and 5) → `spec.atoms=[], spec.bonds=[bondId(3,4)]`
- `(` at pos 5 → `spec.atoms=[], spec.bonds=[bondId(2,3), bondId(3,4)]` (bonds 3→4 and 4→5 in canonical)
- `)` at pos 10 → same spec as `(`

#### Fixture B: Benzene ring closure (CLYR-02)
- c-layer segment: `"1-2-4-6-5-3-1"`
- auxMap: `{1:0,2:1,3:2,4:3,5:4,6:5}`
- mockStruct: benzene ring bonds (pool IDs 0–5)
- last hyphen (pos 11, 3→1) → `spec.bonds=[ringClosureBondId]`

#### Fixture C: Multi-fragment with branch (CLYR-04)
- c-layer text: `"1-2-3(-4)-5;1-2-3"`, fragCounts `[5,3]`
- Fragment 1 (offset=0): `(` → `bondPairs=[[3,4]]`
- Fragment 2 (offset=5): hyphen 1→2 → `endpointPairs=[[6,7]]`, hyphen 2→3 → `endpointPairs=[[7,8]]`

#### Fixture D: N* duplicated fragment with branch (CLYR-05)
- c-layer text: `"2*1-2(-3)-4"`, fragCounts `[4,4]`
- hyphen 1→2: `endpointPairs=[[1,2],[5,6]]`
- `(` branch (bonds in branch = hyphen 2→3): `bondPairs=[[2,3],[6,7]]`

#### Fixture E: tokenizeCLayerSeg unit tests (pure function)
- Input `"1-2-3(-4-5)-6"`: assert 13 tokens of correct types, correct localN / leftLocal / rightLocal / openIdx / closeTokenIdx
- Input `"1-2-4-6-5-3-1"`: assert 13 tokens, no open/close, all hyphens have non-null leftLocal+rightLocal
- Input `"1-2-3(-4(-5)-6)-7"`: assert nested open/close indices are mutually consistent

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/clyr.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/clyr.test.ts` — covers CLYR-01 through CLYR-05 at unit level
  (tokenizeCLayerSeg, buildSubHoverSpecs atom/bond/branch cases, multi-fragment offsets)
- [ ] `src/__tests__/LayerText.clyr.test.tsx` — component-level: renders hoverable `-`/`(`/`)` spans;
  checks that `setSubHover` is called with correct `kind`, `endpointPairs`, `bondPairs`

---

## Security Domain

No security-relevant changes. This phase is pure client-side highlight logic with no network
calls, no auth, no data persistence, and no input from untrusted sources. ASVS categories
V2–V6 do not apply to canvas highlight spec computation.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Atom number hover = atom + incident bonds | Atom number hover = atom only | Phase 15 (D-01) | Cleaner "token = exactly what it denotes" model |
| Hyphens/parens = inert text | Hyphens/parens = interactive hover targets | Phase 15 (D-02/D-03) | Full c-layer token interactivity |

**Deprecated/outdated in this phase:**
- `struct.bonds.forEach` incident-bond scan in `buildSubHoverSpecs` `atom` case (lines 439–441): removed by CLYR-01.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `struct.findBondId` is symmetric (finds bond regardless of begin/end order) | Bond Resolution Pattern | New bond cases would fail for bonds where we pass endpoints in reverse order — fixable by also trying `findBondId(kB, kA)` |
| A2 | Comma-inside-branch notation (e.g., `19(18,23)`) does not appear in real InChI strings for drug-like molecules | Edge Cases | If common, users would see parens with no visual highlight feedback — discoverable and fixable post-phase |

**If this table is empty:** All claims verified. — (Not empty; two low-risk assumptions listed.)

---

## Open Questions (RESOLVED)

1. **Comma-inside-branch UX** — RESOLVED: suppress the `inchiSubtoken` class (no hover affordance) for paren spans with `bondPairs.length === 0`. Adopted in plan 15-02 Task 1 (case 'open' emits a plain span when bondPairs is empty).
   - What we know: the notation is spec-valid but rare; produces no hyphen tokens; the branch span would highlight nothing.
   - Resolution: render-time condition — no hover ring when there are no bonds to highlight.

2. **Close-paren bond set access** — RESOLVED: store `bondPairs` on the open token; the close renderer looks it up by `openTokenIdx` (`tokens[closeToken.openTokenIdx]`). Adopted in plan 15-02 Task 1 (case 'close'). Avoids duplicating the bond set across both tokens.
   - What we know: the `)` token needs the same `bondPairs` as its matching `(`.
   - Resolution: single source of truth on the open token; symmetric highlight per D-04.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/parseInchi.ts` lines 58–90 — `parseConnectionBonds` stack machine (authoritative c-layer grammar); lines 32–47 `SubHover` interface [VERIFIED: direct code read]
- `src/lib/highlightUtils.ts` lines 373–494 — `buildSubHoverSpecs` implementation; lines 432–443 `atom` case [VERIFIED: direct code read]
- `src/components/LayerText.tsx` lines 123–189 — `ConnectionText` tokenization and fragment offset machinery [VERIFIED: direct code read]
- Node.js trace scripts — c-layer grammar walkthrough, tokenizer logic, branch bond collection [VERIFIED: executed and verified output]

### Secondary (MEDIUM confidence)
- InChI Syntax overview at depth-first.com — confirms `/c` layer uses `-` for edges and `()` for branches [CITED: depth-first.com/articles/2021/04/21/inchi-syntax/]
- metamolecular/inchi-grammar GitHub — confirms grammar uses W3C EBNF; `connections ::= "/c" graph? (";" graph?)*` [CITED: github.com/metamolecular/inchi-grammar]

### Tertiary (LOW confidence)
- InChI Technical Manual PDF (inchi-trust.org/download/104/InChI_TechMan.pdf) — fetched but could not be rendered as text; not used for specific claims.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all tools confirmed working
- C-layer grammar: HIGH — verified by executing the existing `parseConnectionBonds` algorithm on traced inputs
- Architecture: HIGH — all code paths verified by reading the actual source files
- Pitfalls: HIGH — derived directly from code structure and the two-pass tokenization constraint
- Test fixtures: HIGH — derived from canonical algorithm traces

**Research date:** 2026-06-19
**Valid until:** 90 days (stable pure-logic domain; no external API or library changes)
