---
phase: 17-sub-token-copy-core-element-table-pure-module-tests
reviewed: 2026-06-26T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/lib/subTokenInfo.ts
  - src/lib/__tests__/subTokenInfo.test.ts
  - src/lib/layerInfo.ts
  - src/lib/__tests__/layerInfo.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-06-26
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 17 pure value core: `subTokenInfo.ts` (sub-token card copy)
and the `layerInfo.ts` port, plus their tests. Both project-specific invariants
hold:

- **Verbatim-passthrough (Invariant #1):** `subTokenInfo.ts` consumes only
  `SubHover` fields + `ELEMENT_NAMES`. It never re-joins `layer.text`, never
  calls a parser, never accepts a string/Layer arg. Clean.
- **Real-fixture (Invariant #2):** Both test files use real `getInchi()`
  strings (`/^InChI=1S\//`) — ALANINE, SALT, and the three-component REPRO are
  all provenance-real, and a dedicated anti-fabrication test asserts the prefix.
  Clean.

No security or data-loss defects. The findings below are correctness-of-output
edge cases and robustness gaps. The most actionable is WR-01: `atomPhrase([])`
emits literal "atoms Infinity–-Infinity", and the code deliberately admits the
empty-array path via `?? []` without guarding it.

## Warnings

### WR-01: `atomPhrase([])` / empty `hAtoms` atoms produce "Infinity–-Infinity" prose

**File:** `src/lib/subTokenInfo.ts:28-33, 58-66`
**Issue:** `atomPhrase` does `Math.min(...atoms)` / `Math.max(...atoms)`. On an
empty array these return `Infinity` and `-Infinity`, so the body renders
literally: `Atoms Infinity–-Infinity each bear one hydrogen.` The empty path is
reachable: the `hAtoms` case opens with `const atoms = sub.atoms ?? []`, so the
code explicitly contemplates a missing/empty array — but then feeds it straight
into `atomPhrase`/`capitalise` with no guard. A `SubHover` of `kind:'hAtoms'`
with `atoms` undefined or `[]` yields chemist-facing garbage rather than null or
a sane fallback. Same latent issue if `mobileH` arrives with empty atoms:
`atoms.join(' and ')` gives an empty `where` → "shared across  rather than…".
**Fix:** Guard the empty case before phrasing — return `null` (matching the
"falls through to layer card" contract) or short-circuit:
```ts
case 'hAtoms': {
  const atoms = sub.atoms ?? [];
  if (atoms.length === 0) return null;
  // …
}
```
Apply the same `if (atoms.length === 0) return null;` to the `mobileH` case.

### WR-02: `element` case crashes / prints "undefined" when `sub.el` is absent

**File:** `src/lib/subTokenInfo.ts:22-24, 42-56`
**Issue:** The `element` case does `const el = sub.el!` (non-null assertion) but
`SubHover.el` is typed `el?: string` — optional. If a `kind:'element'` SubHover
is built without `el`, two things break: (1) the body interpolates
`ELEMENT_NAMES[undefined] ?? undefined` → the string "undefined"; (2)
`elementTitle(undefined)` resolves `name = undefined ?? undefined = undefined`,
then `name[0].toUpperCase()` throws `TypeError: Cannot read properties of
undefined`. The `!` silences the compiler but does not protect the runtime.
**Fix:** Validate before use:
```ts
case 'element': {
  if (!sub.el) return null;
  const el = sub.el;
  // …
}
```
Then `elementTitle(el)` is safe and the `!` can be dropped.

### WR-03: `readingFor` interpolates raw `layer.text` into a `dangerouslySetInnerHTML` string

**File:** `src/lib/layerInfo.ts:397-406` (cases `b`, `q`, `p`, `i`, `default`)
**Issue:** These branches build HTML by string concatenation —
`'net charge: <b>' + layer.text + '</b>'` etc. — and the result is rendered via
`dangerouslySetInnerHTML` in `Explanation.tsx:101`. `layer.text` is unescaped.
For valid `getInchi()` output the q/p/i/b alphabet is numeric + sign, so a `<`
cannot appear and there is no practical XSS — but the safety rests entirely on
upstream input never carrying markup, with no escaping at the render boundary.
This is the one spot in the module where untrusted-shaped data reaches an HTML
sink without sanitisation. (Note: `subTokenInfo.ts` itself correctly emits
plain HTML-free strings per D-07 — this finding is the `layerInfo.ts` reading
path only.)
**Fix:** Escape `layer.text` before interpolation, or render these layers'
values as React text children (as `Explanation.tsx` already does for the
`layer.text` fallback at line 102). Minimal:
```ts
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
case 'q': return 'net charge: <b>' + esc(layer.text) + '</b>';
```

### WR-04: h-layer regex relies on the empty-string skip to absorb a captured leading comma

**File:** `src/lib/layerInfo.ts:345-359`
**Issue:** The pattern `/([\d,\-]+)H(\d*)(?=,|$)/g` includes `,` in the
character class, so on input like `2H,4H2,1H3` the successive matches capture
`m[1]` = `"2"`, then `",4"`, then `",1"` — i.e. the leading comma is swallowed
into the *next* token's atom group. It only produces correct output because
`m[1].split(',')` then yields `["", "4"]` and the `if (!range) continue` guard
discards the empty first element. The logic is correct today but fragile: the
correctness depends on a coincidental interaction between the greedy class and
the empty-skip guard, which is easy to break in a later edit.
**Fix:** Drop the comma from the leading class so each H-group is captured
cleanly, anchoring on a boundary:
```ts
const re = /(?:^|,)([\d\-]+)H(\d*)(?=,|$)/g;
```
This makes `m[1]` exactly the digit/range group with no leading comma, removing
the reliance on the downstream skip.

## Info

### IN-01: `_atomElements` parameter is required but unused

**File:** `src/lib/subTokenInfo.ts:39`
**Issue:** `_atomElements` is documented as reserved for Phase 18 and is
intentionally unconsumed. It is a required positional arg, so every caller and
every test must pass `{}` (the tests do, repeatedly). This is a deliberate
forward-looking parameter — acceptable — but it forces noise (`, {}`) at all 11
call sites in the test file with no current behaviour.
**Fix:** Optional; if Phase 18 is not imminent, make it optional
(`_atomElements?: Record<number, string>`) to drop the `{}` boilerplate, or
leave as-is if the contract is about to be consumed.

### IN-02: c-layer / h-layer `+ N more` truncation uses inline `style=` HTML

**File:** `src/lib/layerInfo.ts:336, 372`
**Issue:** The "+ N more" affordance hardcodes
`<span style="color:var(--ink-faint)">`. Inline style strings in HTML built for
`dangerouslySetInnerHTML` are a maintenance smell (mixes presentation into the
data layer; harder to theme than a class). Verbatim from the legacy port, so
low priority.
**Fix:** Prefer a CSS class (`<span class="muted">`) over an inline style, if/when
the reading-code styling is consolidated.

### IN-03: magic truncation limits `MAX = 10` (c) and `MAX = 8` (h)

**File:** `src/lib/layerInfo.ts:330, 369`
**Issue:** Two different bare numeric truncation caps with no named constant or
comment explaining the difference (why 10 bonds but 8 hydrogen entries). Minor
readability nit.
**Fix:** Name them (`const MAX_BONDS = 10`, `const MAX_H_ENTRIES = 8`) or add a
one-line rationale.

---

_Reviewed: 2026-06-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
