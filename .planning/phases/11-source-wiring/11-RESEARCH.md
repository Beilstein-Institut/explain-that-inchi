# Phase 11: Source & Wiring — Research

**Researched:** 2026-06-18
**Domain:** Ketcher WASM API extension · Zustand store surgery · pure TypeScript parser
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Fetch `getInchi(true)` and `getInChIKey()` concurrently in the existing debounced `handleChange` tick, riding the existing `generationRef` stale-result guard.
- **D-02 / D-02a:** Use `Promise.allSettled`, NOT `Promise.all`. A key-only failure must never blank a valid InChI. The ROADMAP text says `Promise.all` — this is a deliberate, intentional refinement. Do NOT treat `allSettled` as contradicting the roadmap.
- **D-03:** Extend existing `setInchiData` with a trailing `inchiKey: string` arg; add `inchiKey: string` (initial `''`) to `InchiState`. One atomic `set()`. Mirrors Phase 6 `hAtomPoolIds` append pattern.
- **D-04:** No separate `setInchiKey` action, no second `set()` call.
- **D-05:** Wherever InChI is blanked (empty-canvas `layers.length < 2` branch AND `catch` path), write `inchiKey: ''` in the same `setInchiData` call.
- **D-06:** No 27-char format validation inside the wiring/store path; format gating is a Phase 12 concern.
- **D-07:** `parseInchiKey.ts` at `src/lib/`. Returns `{ kind, start, end }[]` offset ranges only — never returns reassembled/sliced text.
- **D-08:** Any string that is NOT a well-formed 27-char key → return `[]` (never throws).
- **D-09:** Five segment kinds — `'skeleton'` (0–14), `'hash'` (15–23), `'flag'` (23–24), `'version'` (24–25), `'protonation'` (26–27). Hyphens at indices 14 and 25 are NOT segments.
- **D-10:** Hyphens are presentation, not data.
- **D-11:** `kind` is an exported string-literal union type; exact names are Claude's discretion (suggested: `InchiKeySegmentKind` / `InchiKeySegment`).

### Claude's Discretion

- Exact exported type names in `parseInchiKey.ts` (D-11).
- Internal structure of `allSettled` result destructuring.
- Whether the empty-canvas guard reads the key result before or after the `layers.length < 2` check (atomic write must hold).
- Test fixtures for `parseInchiKey` (MUST include: valid neutral 27-char key, charged/protonated key, `N` flag, empty string, short/malformed key → `[]`, assertion that no segment value equals reassembled text).
- The store test asserting verbatim equality (`stored inchiKey === raw getInChIKey()` output).

### Deferred Ideas (OUT OF SCOPE)

No deferred ideas from discussion within this phase. (Rendering → Phase 12; explanation → Phase 13; web/PubChem link, charged-species preset, hash deep-dive → v2 INKEY-F1/F2/F3.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INKEY-01 | A live InChIKey appears below the InChI strip, computed from the same in-browser WASM source as the InChI (`ketcher.getInChIKey()`), updating in sync with the molecule. | `ketcher.getInChIKey(): Promise<string>` is a typed public method on `ketcher-core@3.12.0` — confirmed by installed package types. Wiring via `Promise.allSettled` inside the existing `handleChange` debounce delivers sync-with-molecule. |
| INKEY-02 | The displayed and copied InChIKey is the verbatim library output string — never reconstructed or re-joined from parsed segments. | Store holds raw string; parser returns `{kind,start,end}[]` only; no text field in parser output. Enforced by Invariant #1 (verbatim passthrough). |
| INKEY-06 | An empty or invalid structure shows a placeholder (no key, no error), matching the InChI strip's empty state (PLSH-01 parity). | Existing empty guard (`layers.length < 2`) and `catch` path are extended to write `inchiKey: ''` atomically. `parseInchiKey('')` returns `[]` for Phase 12's format gate. |
</phase_requirements>

---

## Summary

Phase 11 is a pure wiring and parser phase with zero new npm dependencies. All integration surfaces are well-understood from reading the existing code: the `handleChange` debounce in `App.tsx`, the Zustand store in `store.ts`, and the `parseInchi.ts` pattern in `src/lib/`.

The work has three parallel tracks: (1) extend `setInchiData` in the store, (2) add a `Promise.allSettled` concurrent fetch in `handleChange`, and (3) implement and unit-test `parseInchiKey.ts`. These three tasks have no ordering constraint between them — the store change can even be made as a first step since it is backward-compatible (the trailing arg has a default of `''`).

The only non-trivial design judgment is the `Promise.allSettled` destructuring: the planner must write the result-reading code such that a rejected InChIKey call still produces a valid `inchiKey: ''` for the atomic write, while a rejected InChI call preserves the store unchanged after the `generationRef` check. This is standard `allSettled` idiom but must be spelled out in task actions so no implementer falls back to `Promise.all`.

**Primary recommendation:** Implement store extension first (backward-compatible), then the `allSettled` wiring (one tick, one atomic write, no second subscription), then `parseInchiKey.ts` with full unit test coverage — all in a single plan or two tightly-coupled plans.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| InChIKey computation | WASM (Ketcher standalone) | — | `ketcher.getInChIKey()` routes through the same WASM worker as `getInchi()`; no JS hashing |
| Concurrent fetch orchestration | App component (`App.tsx` `handleChange`) | — | Existing debounced tick owns the pipeline; no parallel subscription permitted (Invariant #4) |
| Stale-result guarding | App component (`generationRef`) | — | Shared counter already incremented before each tick; `thisGen` check after `allSettled` resolution |
| Atomic state write | Zustand store (`setInchiData`) | — | One `set()` call; key and InChI always co-written (Invariant #4) |
| Empty / error reset | App component (`handleChange` empty-guard + catch) | — | Same two paths that blank InChI also blank key |
| Key offset segmentation | `src/lib/parseInchiKey.ts` | — | Pure function, no browser globals, Node-compatible; consumed by Phase 12 renderer |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ketcher-core` | 3.12.0 (pinned) | TypeScript types for `Ketcher`, `getInChIKey()` return type | Pinned with `ketcher-react`/`ketcher-standalone`; already installed |
| `zustand` | ^5.0.13 (installed) | Atomic store write for `inchiKey` field | Already the project store; extend `setInchiData`, don't add new middleware |
| `vitest` | ^3.0.0 (installed) | Unit tests for `parseInchiKey.ts` | Already configured in `vitest.config.ts`; `environment: 'node'` fits pure parser |

No new packages are installed in this phase. [VERIFIED: codebase grep]

### Supporting
None beyond the installed stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Promise.allSettled` | `Promise.all` | `Promise.all` fails atomically — one rejection voids both results; `allSettled` lets the InChI win even if the key call rejects (D-02) |
| Extending `setInchiData` | New `setInchiKey` action | Separate action permits two `set()` calls and a window where key ≠ InChI in the store (D-04 forbids this) |
| Offset-range parser | Text-slice parser | Text-slice parser violates Invariant #1 by storing reassembled text in the data layer |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. This section is not applicable.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
editor 'change' event
        │
        ▼
handleChange (debounced 150ms)
        │
        ├── ++generationRef.current → thisGen
        │
        ▼
Promise.allSettled([
  ketcher.getInchi(true),      ─── WASM worker ─── InChI + AuxInfo string
  ketcher.getInChIKey()        ─── WASM worker ─── 27-char key string
])
        │
        ├── thisGen !== generationRef.current? → discard (stale)
        │
        ├── [0].status === 'fulfilled'? → parseInchiWithAux → layers, auxMap, ...
        │       layers.length < 2? → setInchiData('', [], {}, {}, [], '')  ← EMPTY
        │
        ├── [0].status === 'rejected'? → caught in catch block
        │       setInchiData('', [], {}, {}, [], '')                       ← EMPTY
        │
        └── both results available:
              inchiKey = [1].status === 'fulfilled' ? [1].value : ''
              setInchiData(inchi, layers, auxMap, elements, hAtomIds, inchiKey) ← ATOMIC
```

The `catch` wraps the entire try block; `allSettled` itself never rejects, so the catch is only reached if `parseInchiWithAux` or the pool-ID enumeration throws. The `generationRef` check must happen after the `await`, before any store write.

### Recommended Project Structure

```
src/
├── App.tsx              # handleChange extended — Promise.allSettled + inchiKey write
├── store.ts             # InchiState.inchiKey field + setInchiData trailing arg
└── lib/
    ├── parseInchi.ts    # unchanged
    ├── parseInchiKey.ts # NEW — pure offset parser
    └── __tests__/
        ├── parseInchi.test.ts       # unchanged
        └── parseInchiKey.test.ts    # NEW — unit tests
```

### Pattern 1: `Promise.allSettled` concurrent fetch in existing tick

**What:** Two WASM calls dispatched concurrently via `Promise.allSettled`; `generationRef` checked once after both settle; one `setInchiData` call.

**When to use:** Any time two WASM calls must be concurrent but must not fail atomically.

**Example:**
```typescript
// Source: CONTEXT.md D-01, D-02, D-02a
const thisGen = ++generationRef.current;
try {
  const [inchiResult, keyResult] = await Promise.allSettled([
    ketcher.getInchi(true),
    ketcher.getInChIKey(),
  ]);
  if (thisGen !== generationRef.current) return;

  if (inchiResult.status === 'rejected') {
    useInchiStore.getState().setInchiData('', [], {}, {}, [], '');
    return;
  }

  const raw = inchiResult.value;
  const result = parseInchiWithAux(raw);
  if (result.layers.length < 2) {
    useInchiStore.getState().setInchiData('', [], {}, {}, [], '');
    return;
  }

  const inchiKey = keyResult.status === 'fulfilled' ? keyResult.value : '';

  // ... pool ID enumeration (unchanged) ...

  useInchiStore.getState().setInchiData(
    result.inchi,
    result.layers,
    actualAuxMap,
    result.atomElements,
    hAtomPoolIds,
    inchiKey,         // trailing arg per D-03
  );
} catch {
  if (thisGen !== generationRef.current) return;
  useInchiStore.getState().setInchiData('', [], {}, {}, [], '');
}
```

**Key implementation note:** The existing `await ketcher.getInchi(true)` line is replaced wholesale by the `await Promise.allSettled([...])` call. Nothing else in the `useEffect` changes.

### Pattern 2: Backward-compatible `setInchiData` extension

**What:** Add `inchiKey = ''` as a trailing optional parameter. All existing callers continue to compile without modification; the empty-reset calls just gain an explicit `''` argument.

**When to use:** Store shape extension where old callers must not break (mirrors Phase 6 `hAtomPoolIds` append).

**Example:**
```typescript
// Source: store.ts existing pattern + CONTEXT.md D-03
interface InchiState {
  // ...existing fields...
  inchiKey: string;           // NEW
  setInchiData: (
    inchi: string,
    layers: Layer[],
    auxMap: AuxMap,
    atomElements: Record<number, string>,
    hAtomPoolIds?: number[],
    inchiKey?: string,        // trailing, optional, default ''
  ) => void;
}

// In the create() initialiser:
inchiKey: '',
setInchiData: (inchi, layers, auxMap, atomElements, hAtomPoolIds = [], inchiKey = '') =>
  set({ inchi, layers, auxMap, atomElements, hAtomPoolIds, inchiKey }),
```

All three existing `setInchiData('', [], {}, {}, [])` calls in `App.tsx` remain valid (trailing arg defaults to `''`). The one success-path call gains an explicit `inchiKey` argument.

### Pattern 3: `parseInchiKey.ts` pure offset parser

**What:** Validates 27-char format, emits 5 `{kind, start, end}` objects, returns `[]` for malformed input.

**When to use:** Any caller that needs to iterate or visually style the segments of a stored key string.

**InChIKey anatomy (verified against InChI Trust documentation):**

```
Position:  0         1         2
           0123456789012345678901234567
Example:   UHOVQNZJYSORNB-UHFFFAOYSA-N
           |←  skeleton →|←  hash →||V||P|
           0            13 15     22 23 24 25 26
```

Precise offsets (0-based, exclusive end):

| Segment kind | start | end | Length | Example chars |
|-------------|-------|-----|--------|---------------|
| `'skeleton'` | 0 | 14 | 14 | `UHOVQNZJYSORNB` |
| `'hash'` | 15 | 23 | 8 | `UHFFFAOY` |
| `'flag'` | 23 | 24 | 1 | `S` (standard) or `N` (non-standard) |
| `'version'` | 24 | 25 | 1 | `A` |
| `'protonation'` | 26 | 27 | 1 | `N` (neutral) |

Hyphens are at fixed positions 14 and 25 — NOT included in any segment.

**Note on total length:** A well-formed key is exactly 27 characters. The guard is `s.length !== 27`. [ASSUMED — training knowledge; validate against a live `ketcher.getInChIKey()` call during implementation to confirm.]

**Example:**
```typescript
// Source: CONTEXT.md D-07..D-11

export type InchiKeySegmentKind =
  | 'skeleton'
  | 'hash'
  | 'flag'
  | 'version'
  | 'protonation';

export interface InchiKeySegment {
  kind: InchiKeySegmentKind;
  start: number;   // inclusive
  end: number;     // exclusive — use s.slice(start, end) at callsite
}

export function parseInchiKey(key: string): InchiKeySegment[] {
  if (key.length !== 27 || key[14] !== '-' || key[25] !== '-') return [];
  return [
    { kind: 'skeleton',    start: 0,  end: 14 },
    { kind: 'hash',        start: 15, end: 23 },
    { kind: 'flag',        start: 23, end: 24 },
    { kind: 'version',     start: 24, end: 25 },
    { kind: 'protonation', start: 26, end: 27 },
  ];
}
```

The function never slices the key itself — offsets are the return value; slicing happens at the callsite (Phase 12 renderer). This is what "returns offsets only" means.

### Anti-Patterns to Avoid

- **Fetching `getInChIKey()` in `handleMolSelectLogic`:** `setMolecule()` triggers a `'change'` event which fires `handleChange`. Fetching the key in `handleMolSelectLogic` creates a race against `handleChange` — the wrong path wins non-deterministically. [VERIFIED: codebase — `handleMolSelectLogic.ts` explicitly does NOT call `getInchi()`; same rule extends to `getInChIKey()`.]
- **Adding a second `editor.subscribe('change', ...)` for the key:** Invariant #4 explicitly forbids parallel subscriptions. Every `subscribe` call is a separate listener — they do not merge.
- **Returning `{ kind, value }` from the parser:** Storing a sliced `value` string in the segment object violates Invariant #1 (verbatim passthrough). The renderer must slice the stored key string using the offsets.
- **Using `Promise.all` instead of `Promise.allSettled`:** `Promise.all` rejects immediately on the first failure, blanking the InChI if the key call rejects (D-02 forbids this).
- **Two separate `set()` calls for InChI and key:** Creates a window where the store has a new InChI but the old stale key (D-04 forbids this).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| InChIKey computation | Custom SHA-256 + Base26 hashing | `ketcher.getInChIKey()` | The key algorithm is proprietary to InChI Trust; JS re-implementations will diverge on edge cases |
| Stale-result protection | A second `generationRef` for the key | Reuse `generationRef.current` (already incremented once per tick) | One counter per tick is the correct model; two counters drift independently |
| Empty-state detection | Parsing the raw key string for `''` or length < 27 | The existing `layers.length < 2` guard (store write path) | The InChI pipeline already defines "empty"; the key follows the InChI's truth |

**Key insight:** This phase adds no new algorithms. Every hard problem (stale results, empty detection, atomic writes) already has a solved implementation in `App.tsx` and `store.ts`. The task is extension, not invention.

---

## Runtime State Inventory

Not applicable — this is a greenfield-within-existing-app feature addition, not a rename/refactor/migration phase. No stored data, live service configs, OS registrations, secrets, or build artifacts carry InChIKey strings that need migration.

---

## Common Pitfalls

### Pitfall 1: Forgetting the `generationRef` check after `allSettled`

**What goes wrong:** The `await Promise.allSettled(...)` completes for an old generation while a newer tick has already written fresher data. The old result overwrites the store with a stale key.

**Why it happens:** `allSettled` always resolves (never rejects), so developers may not think to guard against stale results.

**How to avoid:** The `if (thisGen !== generationRef.current) return;` check must appear immediately after the `await`, before any call to `setInchiData`. The existing guard already does this for `getInchi(true)` — the change is mechanical.

**Warning signs:** Rapidly loading two different presets and seeing the first preset's key appear after the second preset's InChI.

### Pitfall 2: Treating `allSettled` rejection of the key as a hard error

**What goes wrong:** Implementer writes `if (keyResult.status === 'rejected') { throw ... }` or blanks the entire store, violating D-02.

**Why it happens:** Symmetric treatment of both results feels clean but is wrong for this domain.

**How to avoid:** `keyResult.status === 'rejected'` → use `''` as the key value; the InChI result is unaffected. The explicit coding of this asymmetry is the entire point of D-02.

**Warning signs:** Any code path where a key failure causes the InChI strip to go blank.

### Pitfall 3: The `setInchiData` call-sites that already pass empty arrays

**What goes wrong:** The three existing `setInchiData('', [], {}, {}, [])` calls in `App.tsx` are not updated to include an explicit `inchiKey: ''` argument. A stale key lingers after clearing or an error.

**Why it happens:** TypeScript accepts the call because `inchiKey` defaults to `''` — no compile error, silent bug.

**How to avoid:** Make the trailing argument explicit (`''`) on ALL three existing calls in `App.tsx` (the two empty-guard returns and the catch block), not only on the success path. This is Belt-and-suspenders insurance; the default is correct, but the explicit argument makes the intent visible.

**Warning signs:** Clearing the canvas leaves the previous molecule's key visible in the store while InChI is `''`.

### Pitfall 4: Parsing the key inside the store action

**What goes wrong:** `setInchiData` calls `parseInchiKey(key)` and stores the parsed segments, not the raw string.

**Why it happens:** Convenient to co-locate, but couples the store to the parser and hides the verbatim string.

**How to avoid:** Store ONLY the raw `inchiKey: string`. Parsing is done at render time in Phase 12 (same pattern as InChI layers being parsed in `App.tsx`, not inside the store write).

### Pitfall 5: InChIKey segment offset confusion (flag vs version vs protonation)

**What goes wrong:** The `flag` and `version` characters are adjacent (positions 23 and 24 within the second block), and the `protonation` character is after the second hyphen (position 26). Different secondary sources describe these differently. An off-by-one makes INKEY-12 explanations in Phase 13 incorrect.

**Why it happens:** Multiple documentation sources (InChI Trust FAQ, Wikipedia, chemistry papers) use 1-based or block-relative offsets inconsistently.

**How to avoid:** Pin the offsets against a concrete fixture: `UHOVQNZJYSORNB-UHFFFAOYSA-N` (benzene). `s[23] === 'S'` (flag), `s[24] === 'A'` (version), `s[25] === '-'` (hyphen, not a segment), `s[26] === 'N'` (protonation). The unit tests must assert slice-boundary correctness against this concrete string, not just structural shapes.

**Warning signs:** A test that checks `segment.start` and `segment.end` numerically but never checks `key.slice(segment.start, segment.end)` against an expected string — such a test misses offset bugs entirely.

---

## Code Examples

### `handleChange` before and after (diff-style)

```typescript
// BEFORE (existing)
const raw = await ketcher.getInchi(true);
if (thisGen !== generationRef.current) return;
// ...pool ID work...
useInchiStore.getState().setInchiData(result.inchi, result.layers, actualAuxMap, result.atomElements, hAtomPoolIds);

// AFTER
const [inchiResult, keyResult] = await Promise.allSettled([
  ketcher.getInchi(true),
  ketcher.getInChIKey(),
]);
if (thisGen !== generationRef.current) return;

if (inchiResult.status === 'rejected') {
  useInchiStore.getState().setInchiData('', [], {}, {}, [], '');
  return;
}

const raw = inchiResult.value;
const result = parseInchiWithAux(raw);
if (result.layers.length < 2) {
  useInchiStore.getState().setInchiData('', [], {}, {}, [], '');
  return;
}

const inchiKey = keyResult.status === 'fulfilled' ? keyResult.value : '';
// ...pool ID work (unchanged)...
useInchiStore.getState().setInchiData(result.inchi, result.layers, actualAuxMap, result.atomElements, hAtomPoolIds, inchiKey);
```

### `store.ts` diff

```typescript
// ADD to InchiState interface:
inchiKey: string;

// EXTEND setInchiData signature:
setInchiData: (
  inchi: string,
  layers: Layer[],
  auxMap: AuxMap,
  atomElements: Record<number, string>,
  hAtomPoolIds?: number[],
  inchiKey?: string,    // NEW trailing optional
) => void;

// EXTEND initialiser:
inchiKey: '',
setInchiData: (inchi, layers, auxMap, atomElements, hAtomPoolIds = [], inchiKey = '') =>
  set({ inchi, layers, auxMap, atomElements, hAtomPoolIds, inchiKey }),
```

### `parseInchiKey.ts` complete reference implementation

```typescript
// src/lib/parseInchiKey.ts

export type InchiKeySegmentKind =
  | 'skeleton'
  | 'hash'
  | 'flag'
  | 'version'
  | 'protonation';

export interface InchiKeySegment {
  kind: InchiKeySegmentKind;
  start: number;
  end: number;
}

/**
 * Segments a 27-char InChIKey string into offset ranges.
 * Returns [] for any string that is not exactly 27 chars with hyphens at positions 14 and 25.
 * Never throws. Never returns reassembled text — callers slice the original string.
 *
 * InChIKey anatomy: AAAAAAAAAAAAAA-BBBBBBBBFV-P (27 chars)
 *   0-13  skeleton hash (14 chars)
 *   14    hyphen (not a segment)
 *   15-22 remaining-layers hash (8 chars)
 *   23    flag: S (standard) | N (non-standard)
 *   24    version: A
 *   25    hyphen (not a segment)
 *   26    protonation char
 */
export function parseInchiKey(key: string): InchiKeySegment[] {
  if (key.length !== 27 || key[14] !== '-' || key[25] !== '-') return [];
  return [
    { kind: 'skeleton',    start: 0,  end: 14 },
    { kind: 'hash',        start: 15, end: 23 },
    { kind: 'flag',        start: 23, end: 24 },
    { kind: 'version',     start: 24, end: 25 },
    { kind: 'protonation', start: 26, end: 27 },
  ];
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `getInchi(true)` await | `Promise.allSettled([getInchi(true), getInChIKey()])` | Phase 11 | Concurrent WASM calls in one debounced tick |
| 5-arg `setInchiData` | 6-arg `setInchiData` (trailing `inchiKey?`) | Phase 11 | Backward-compatible atomic key+InChI write |

**No deprecated patterns introduced.** All existing callers continue to work.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A well-formed InChIKey is exactly 27 characters; hyphens are at fixed positions 14 and 25. | Code Examples / parseInchiKey | If the format is wrong, the guard `key.length !== 27` rejects valid keys → Phase 12 shows placeholder for valid molecules. **Mitigation:** Pin against a live `ketcher.getInChIKey()` call on benzene during Wave 0 and hard-code the validated fixture in the test. |
| A2 | `ketcher.getInChIKey()` returns the bare key string (27 chars, no prefix), same as `getInchi(true)` returns the InChI string directly. | Standard Stack | If it returns a prefixed string (e.g. `InChIKey=...`), the 27-char guard fires incorrectly. **Mitigation:** Log `ketcher.getInChIKey()` output on benzene in a manual smoke test during Wave 0. |
| A3 | The `flag` character is at index 23 (= position 9 within the second block `BBBBBBBBFV`), and `version` is at index 24. | Code Examples / Pitfall 5 | If the block layout differs from the InChI Trust FAQ, INKEY-12 explanation content in Phase 13 will be wrong. **Mitigation:** Fixture test on benzene: `key.slice(23,24) === 'S'` and `key.slice(24,25) === 'A'`. |

**If all three assumptions hold** (which is highly likely given they are documented InChI Trust spec), no user confirmation is needed before execution. The mitigation in every case is a Wave 0 fixture test against a known molecule's live WASM output.

---

## Open Questions

1. **`getInChIKey()` return format**
   - What we know: TypeScript type is `Promise<string>`; CONTEXT.md says it "routes through the same WASM worker as `getInchi()`".
   - What's unclear: Whether the string is the bare 27-char key or has a prefix (e.g., `InChIKey=`).
   - Recommendation: Add a single manual smoke-test step in Wave 0: draw benzene, call `ketcher.getInChIKey()`, log and assert the raw value. If prefixed, adjust the 27-char guard to strip the prefix first. [ASSUMED: bare string based on `getInchi(true)` returning the bare InChI.]

2. **`allSettled` on empty canvas**
   - What we know: `getInchi(true)` throws on empty or disconnected canvas (existing catch path).
   - What's unclear: Whether `getInChIKey()` also throws on empty canvas, or returns a dummy/empty string.
   - Recommendation: The `catch` path already handles this: `allSettled` always resolves, so a throw from `getInchi(true)` inside the worker is caught by the outer `try/catch`. The key call settling (fulfilled or rejected) is irrelevant when the `catch` fires. No action required.

---

## Environment Availability

Step 2.6: SKIPPED — this phase installs no new tools or external services. All dependencies (Node.js, npm, vitest, ketcher-core) were already confirmed present by the successful 256-test passing baseline (`vitest ^3.0.0`, node environment for lib tests).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `vitest` | `parseInchiKey.test.ts` | ✓ | ^3.0.0 | — |
| `ketcher-core` types | `store.ts`, `App.tsx` | ✓ | 3.12.0 | — |

---

## Validation Architecture

`nyquist_validation` is enabled (absent = enabled; `.planning/config.json` confirms `true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (separate from `vite.config.ts`) |
| Quick run command | `vitest run src/lib/__tests__/parseInchiKey.test.ts` |
| Full suite command | `vitest run` |

### Behavior Classification

| Behavior | Test Type | Rationale |
|----------|-----------|-----------|
| `parseInchiKey` offset math | Unit (automated) | Pure function, no browser globals, deterministic |
| `parseInchiKey` returns `[]` for malformed input | Unit (automated) | Pure function |
| No segment `end - start` value equals a reassembled substring | Unit (automated) | Structural invariant on the return type |
| `setInchiData` stores verbatim key (no transformation) | Unit (automated) | Store reducer is pure — mock `set()` and assert called value equals input |
| `generationRef` stale-guard discards slow results | Integration/Manual | Requires live WASM timing; not reproducible in Vitest node env without complex mocking |
| Concurrent fetch doesn't overwrite newer result | Integration/Manual | Same — debounce timing is browser-runtime-dependent |
| Empty canvas → `inchiKey: ''` in store | Manual smoke | `getInChIKey()` on empty canvas requires live Ketcher WASM |
| Preset load → InChIKey updates in one tick | Manual smoke | Requires live editor `'change'` event + debounce |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INKEY-01 | InChIKey appears in store after molecule drawn | Manual smoke | — | — |
| INKEY-02 | Stored key === raw `getInChIKey()` output (no reconstruction) | Unit | `vitest run src/lib/__tests__/parseInchiKey.test.ts` (no-reassembly assertion) | ❌ Wave 0 |
| INKEY-06 | Empty canvas → `inchiKey: ''` | Manual smoke + Unit (store) | `vitest run src/lib/__tests__/parseInchiKey.test.ts` (empty string → `[]`) | ❌ Wave 0 |

### Required Test Fixtures for `parseInchiKey.test.ts`

The following fixtures are REQUIRED by CONTEXT.md Claude's Discretion clause and the validation focus:

```typescript
// Fixture 1 — valid neutral key (benzene)
const BENZENE_KEY = 'UHOVQNZJYSORNB-UHFFFAOYSA-N';
// Assertions: returns 5 segments; segment[0] = {kind:'skeleton', start:0, end:14}
//             key.slice(0,14) === 'UHOVQNZJYSORNB'
//             key.slice(15,23) === 'UHFFFAOY'   (hash, not flag-inclusive)
//             key.slice(23,24) === 'S'          (standard flag)
//             key.slice(24,25) === 'A'          (version)
//             key.slice(26,27) === 'N'          (protonation)

// Fixture 2 — charged / protonation char differs (e.g. protonated species)
// e.g., key ending in 'L' or any char != 'N'
// Assertions: still returns 5 segments; protonation segment correctly bounded

// Fixture 3 — non-standard flag ('N' at position 23)
// e.g., 'UHOVQNZJYSORNB-UHFFFAOYNU-N' (artificial; flag is 'N')
// Assertions: flag segment.start=23, segment.end=24; key.slice(23,24) === 'N'

// Fixture 4 — empty string
// Assertion: returns []

// Fixture 5 — short/malformed key (< 27 chars, or hyphen in wrong position)
// e.g., 'UHOVQNZJYSORNB', 'not-a-key', 'X'.repeat(27) without hyphens
// Assertion: each returns []

// Fixture 6 — no-reassembly invariant
// Assert that NO segment in parseInchiKey(BENZENE_KEY) has a property
// that equals key.slice(segment.start, segment.end) — i.e., there is no
// 'text', 'value', or 'chars' field in InchiKeySegment; only {kind,start,end}.
// This is a TypeScript-enforced structural check: Object.keys(seg) deep-equals ['kind','start','end'].
```

**Note on Fixture 6:** The "no reassembly" test is structural — it tests the shape of the returned objects, not their values. The TypeScript type `InchiKeySegment` with only `kind`, `start`, `end` fields enforces this at compile time. The test adds runtime defense.

### Sampling Rate

- **Per task commit:** `vitest run src/lib/__tests__/parseInchiKey.test.ts` (parser tests only, < 5s)
- **Per wave merge:** `vitest run` (full 256+ test suite)
- **Phase gate:** Full suite green + manual smoke test (benzene InChIKey appears in store, canvas clear resets key) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/parseInchiKey.test.ts` — covers INKEY-02, INKEY-06 (parser path)
- [ ] Store unit test: mock `set()` in Zustand `setInchiData`, assert `inchiKey` arg passes through verbatim — covers INKEY-02 store path

*(No new test framework config needed — existing `vitest.config.ts` with `environment: 'node'` covers `src/lib/__tests__/` files.)*

---

## Security Domain

This phase makes no network requests, handles no user-supplied strings beyond what Ketcher already processes, adds no new parsing of external data, and introduces no cryptographic operations. The InChIKey is computed entirely within the existing Ketcher WASM sandbox.

ASVS categories V2/V3/V4/V5/V6 do not apply to this phase. `security_enforcement` is not set to `false` in config — but there are no applicable controls for a pure in-browser WASM call extension with no I/O surface.

---

## Sources

### Primary (HIGH confidence — codebase read)
- `src/App.tsx` lines 122–207 — existing `handleChange`, `generationRef`, empty-canvas guard, catch path [VERIFIED: codebase]
- `src/store.ts` — `InchiState` interface, `setInchiData`, `hAtomPoolIds` append pattern [VERIFIED: codebase]
- `src/lib/parseInchi.ts` — `LayerType` union, `Layer` interface, pure-function convention [VERIFIED: codebase]
- `src/lib/__tests__/parseInchi.test.ts` — test structure, fixture patterns, describe/it/expect style [VERIFIED: codebase]
- `vitest.config.ts` — node environment for lib tests, no happy-dom needed for parser [VERIFIED: codebase]
- `.planning/phases/11-source-wiring/11-CONTEXT.md` — all locked decisions D-01..D-11 [VERIFIED: codebase]
- `.planning/REQUIREMENTS.md` — INKEY-01, INKEY-02, INKEY-06 text [VERIFIED: codebase]
- `.planning/ROADMAP.md` — Phase 11 success criteria, Cross-Cutting Invariants [VERIFIED: codebase]
- `.planning/PROJECT.md` — key decisions table (D-05 stale guard, D-12 empty reset, D-13 module-level provider) [VERIFIED: codebase]
- `src/lib/handleMolSelectLogic.ts` — confirms getInchi() NOT called there; same must hold for getInChIKey() [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- InChI Trust InChIKey specification (training knowledge): 27-char format, block layout, `S`/`N` flag, `A` version character. [ASSUMED — verify with live WASM output in Wave 0]

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries already installed and version-pinned
- Architecture: HIGH — integration surfaces fully read from codebase; patterns are well-established
- Pitfalls: HIGH — identified from direct code reading, not inference
- Parser offset correctness: MEDIUM — format spec from training data; mitigated by required fixture test against live WASM output

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (stable stack; no external dependencies that could change)
