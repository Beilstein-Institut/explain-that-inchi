---
phase: 12-render-layout
reviewed: 2026-06-18T13:51:14Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/App.tsx
  - src/components/Explanation.tsx
  - src/components/InchiKeySection.module.css
  - src/components/InchiKeySection.tsx
  - src/lib/__tests__/parseInchiKey.test.ts
  - src/store.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-06-18T13:51:14Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 12 adds the `InchiKeySection` display strip and wires per-segment key-hover
explanation cards into the shared `Explanation` panel via a new `keyHoverKind` store
field. The three stated invariants are mostly upheld:

- **Invariant #1 (verbatim passthrough):** Held. `InchiKeySection` slices the stored
  `inchiKey` with `parseInchiKey()` offsets and copies the raw `inchiKey` string — never
  re-joins parsed segments. The test suite explicitly asserts segment objects carry no
  `text`/`value`/`chars` keys.
- **Invariant #2 (no canvas highlight on key hover):** Held. `InchiKeySection` only calls
  `setKeyHoverKind`; the `Explanation` key branch is render-only. No `setHover`/`setSubHover`.
- **Invariant #3 (canvas never remounts):** Not affected by this phase — `KetcherPanel`
  mounting is unchanged.

However, there is one BLOCKER: `keyHoverKind` is **never reset** when the InChIKey
empties or changes, leaving a stale key-segment card displayed over an empty strip and
masking the idle/InChI-layer panel states. Several warnings around state-precedence
coupling and the unconditional `dangerouslySetInnerHTML` path also apply.

## Critical Issues

### CR-01: Stale `keyHoverKind` survives InChIKey clear — stale card masks panel indefinitely

**File:** `src/components/InchiKeySection.tsx:62-70`, `src/components/Explanation.tsx:61`, `src/store.ts:54`
**Issue:**
`keyHoverKind` is set on segment `onMouseEnter` and cleared only by the display box's
`onMouseLeave`. When the InChIKey transitions to empty (user clears the canvas or draws a
disconnected/empty structure), `App.tsx`'s debounced `handleChange` calls
`setInchiData('', [], {}, {}, [], '')`, which sets `inchiKey = ''` but leaves
`keyHoverKind` untouched (the store action never resets it).

On the resulting re-render `InchiKeySection` takes the `isEmpty` branch and **unmounts the
segment spans**. React does not fire `onMouseLeave` on unmount, and the empty box has
`onMouseLeave={undefined}` plus `pointer-events: none` (CSS `[data-empty="true"]`), so the
clear handler can never run. `keyHoverKind` is now permanently stuck (e.g. `'skeleton'`).

`Explanation.tsx:61` checks `keyHoverKind` **first** in its precedence chain, so the
explanation panel keeps showing the stale "Skeleton hash" card over an empty InChIKey
strip — and it masks the idle state and any InChI-layer hover the user performs in
`InchiSection` below. The only escape is re-drawing a molecule and hovering a new key
segment. This is a visible, persistent incorrect-state bug.

A second manifestation: hovering one molecule's key, then loading a different preset
(non-empty new key) without the pointer leaving the box, also leaves the prior
`keyHoverKind` active against the new key until the next mouse movement.

**Fix:** Reset `keyHoverKind` whenever the key data is replaced. Cleanest is to clear it in
the store action that owns the data transition:

```ts
// src/store.ts
setInchiData: (inchi, layers, auxMap, atomElements, hAtomPoolIds = [], inchiKey = '') =>
  set({ inchi, layers, auxMap, atomElements, hAtomPoolIds, inchiKey, keyHoverKind: null }),
```

Or, defensively, also derive an effective value in `Explanation` so an empty key can never
show a key card:

```tsx
const inchiKey = useInchiStore(state => state.inchiKey);
const effectiveKeyHover = inchiKey ? keyHoverKind : null;
// ...use effectiveKeyHover in the precedence check
```

Resetting in `setInchiData` is preferred because it fixes both the empty-clear and
preset-swap cases. (Consider whether resetting on *every* `setInchiData` is acceptable when
only `inchi` changes but the key is identical — it is, since `setInchiData` only fires after
a debounced structure change, at which point dropping a hover is correct.)

## Warnings

### WR-01: `Explanation` precedence makes key-hover unconditionally win over InChI-layer hover

**File:** `src/components/Explanation.tsx:61-76`
**Issue:**
The panel checks `keyHoverKind` before `hoverIdx`. Because key-hover and InChI-layer hover
are tracked in two independent store fields that are never mutually cleared, any lingering
`keyHoverKind` (see CR-01) suppresses InChI-layer cards even when the user is actively
hovering the InChI strip. Even without the empty-clear bug, this coupling is fragile: the
two hover sources can both be non-null simultaneously, and the resolution is implicit
ordering rather than an explicit "most recent wins" rule.
**Fix:** Make the hover sources mutually exclusive. When `InchiSection` sets a layer hover,
clear `keyHoverKind`; when `InchiKeySection` sets a key hover, clear `hoverIdx`/`subHover`.
For example in `InchiSection`'s `onMouseEnter`, add
`useInchiStore.getState().setKeyHoverKind(null);`, and in `InchiKeySection`'s segment
`onMouseEnter`, also call `setHover(null)`/`setSubHover(null)` (these are state writes only,
not canvas highlight calls, so Invariant #2 is preserved — but add a comment to prevent a
future reviewer from "fixing" them away).

### WR-02: `dangerouslySetInnerHTML` fallback can render unsanitized `layer.text`

**File:** `src/components/Explanation.tsx:103`
**Issue:**
`dangerouslySetInnerHTML={{ __html: reading || info!.eg || layer.text }}` falls back to
`layer.text` when both `reading` and `info.eg` are empty. While `layer.text` originates from
WASM-parsed InChI (not free user text), it is injected as raw HTML. The header comment
asserts "no user-controlled free text," but `layer.text` is not the same guaranteed-safe
output as `readingFor()` (which only emits `<b>`/`<span style>`). If a layer's text ever
contains characters like `<` (unlikely for InChI but not impossible for malformed/edge
parses), they are interpreted as markup. The reviewed phase didn't introduce this line, but
the precedence refactor moved it into a now-conditional branch without re-validating the
fallback's safety.
**Fix:** Render the raw-text fallback as a plain text child rather than HTML:

```tsx
{reading || info!.eg
  ? <span dangerouslySetInnerHTML={{ __html: reading || info!.eg }} />
  : <span>{layer.text}</span>}
```

### WR-03: `parseInchiKey` accepts structurally-malformed keys (hyphen/format only validated at 2 positions)

**File:** `src/lib/parseInchiKey.ts:50-62`
**Issue:**
Validation checks only `length === 27`, `key[14] === '-'`, and `key[25] === '-'`. A string
like `"--------------X--------XX-X"` (27 chars, hyphens at 14 and 25) passes and yields 5
segments whose sliced text is meaningless. The flag/version/protonation positions are not
validated to be alphabetic. Since the only producer is `ketcher.getInChIKey()` this is
unlikely in practice, but the parser is described as the trust boundary ("Never throws for
any string input") and `InchiKeySection` renders whatever it returns. A malformed key would
render colored garbage segments and enable hover cards for nonsense.
**Fix:** Tighten the guard to require alphabetic blocks, e.g.:

```ts
if (!/^[A-Z]{14}-[A-Z]{8}[A-Z]{2}-[A-Z]$/.test(key)) return [];
```

This keeps the no-throw contract while rejecting non-conforming inputs. Add a test fixture
for a hyphen-positioned-but-non-alpha string.

## Info

### IN-01: Hyphen-insertion logic is positionally implicit and duplicates parser knowledge

**File:** `src/components/InchiKeySection.tsx:84-92`
**Issue:**
`needsHyphenBefore = seg.kind === 'hash' || seg.kind === 'protonation'` re-encodes the
InChIKey separator layout that `parseInchiKey` already knows (hyphens at index 14 and 25).
If the parser's segment model ever changes, this string-literal coupling silently breaks.
**Fix:** Derive separators from segment offsets (e.g. render a hyphen when
`seg.start > prevSeg.end`), or expose a `precededBySeparator` flag from the parser so the
view does not hard-code segment kinds.

### IN-02: `InchiKeySection` duplicates `InchiSection`'s copy/clipboard/mounted-ref logic verbatim

**File:** `src/components/InchiKeySection.tsx:41-60`
**Issue:**
The `copied` state, `mountedRef` mount/cleanup effect, and `handleCopy` body are copied
character-for-character from `InchiSection.tsx:23-44`. This is acknowledged ("Mirror of
InchiSection.tsx") but the duplication means future fixes (e.g. clipboard error reporting)
must be applied in two places. Not a correctness issue.
**Fix:** Extract a small `useCopyToClipboard(text)` hook returning `{ copied, copy }` and
reuse it in both strips.

---

_Reviewed: 2026-06-18T13:51:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
