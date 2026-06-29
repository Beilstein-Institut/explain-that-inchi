---
phase: 18-explanation-card-wiring-live-chemist-gate
reviewed: 2026-06-29T13:40:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/components/Explanation.tsx
  - src/components/__tests__/Explanation.test.tsx
  - src/lib/subTokenInfo.ts
  - src/lib/parseInchi.ts
  - src/components/LayerText.tsx
  - src/lib/__tests__/subTokenInfo.test.ts
  - src/__tests__/LayerText.fragmentOffset.test.tsx
  - src/lib/__tests__/highlightUtils.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-06-29T13:40:00Z (gap-closure 18-02 pass)
**Depth:** standard
**Files Reviewed:** 8 (2 from 18-01, 6 from 18-02)
**Status:** issues_found

This file contains two review passes for Phase 18:
- **Pass 2 (18-02 gap-closure)** — the GAP-1/GAP-2 H-count card fix. Findings `CR-`/`WR-`/`IN-` prefixed below.
- **Pass 1 (18-01 wiring)** — the original `Explanation.tsx` review, preserved verbatim further down.

---

# Pass 2 — Gap-closure 18-02 (subTokenInfo / LayerText)

## Summary

Reviewed the gap-closure diff for plan 18-02 (commits `82718b8`, `9c0173b`):
GAP-1 replaced `atomPhrase`'s min–max range with `atomList` discrete-set
enumeration; GAP-2 added per-component display de-offsetting plus a
`componentMarker`. The core logic is correct: the `hAtoms` card enumerates
`{3,4,7,8,15}` as `"atoms 3, 4, 7, 8 and 15"`, atoms stay global on the SubHover
payload (canvas-highlight key unaffected), and de-offset is display-only. All
421 tests pass, including the new GAP-1/GAP-2 fixtures, no regression.

The findings are correctness-adjacent quality defects, not crashes. The central
one is a **root-cause incompleteness**: the same diff that fixed the `hAtoms`
grammar/de-offset left its sibling `mobileH` case half-fixed in the identical
function — `mobileH` got the de-offset but kept the broken `join(' and ')`
phrasing that GAP-1 was created to remove.

No security issues — these are pure string-builders emitting HTML-free text
children (D-07). No injection/secret/XSS surface.

## Warnings (Pass 2)

### WR-03: `mobileH` left using broken `join(' and ')` grammar while sibling `hAtoms` got the `atomList` fix in the same diff

**File:** `src/lib/subTokenInfo.ts:79-83`
**Issue:** GAP-1 introduced `atomList()` to stop rendering atom sets as a
degenerate phrase and rewired `hAtoms` to use it. The `mobileH` case sits in the
same function and **was edited by this very diff** (the de-offset block on lines
80-83 was added here) — but it still builds its phrase with `local.join(' and ')`
instead of `atomList`. For any mobile-H group with 3+ atoms this is grammatically
broken. Real, not hypothetical: a CuSO4-style group `(H2,1,2,3,4)` renders:

> "A mobile, tautomeric proton is shared across **atoms 1 and 2 and 3 and 4** rather than fixed to one of them."

The root-cause fix is to route `mobileH` through the helper the diff already
added (net-negative lines — deletes the bespoke `off`/`local`/`where` block):
**Fix:**
```ts
case 'mobileH': {
  const atoms = sub.atoms ?? [];
  const where = atomList(atoms, sub.fragmentOffset ?? 0);
  const body =
    `A mobile, tautomeric proton is shared across ${where}${componentMarker(sub)} rather than fixed to one of them. ` +
    `InChI records one identifier per tautomer, so this proton is written as shared between these positions instead of drawn as a single fixed bond.`;
  return { title: 'Mobile hydrogen', body };
}
```

### WR-04: `atomList([])` emits `"atoms  and undefined"` on an empty atom set

**File:** `src/lib/subTokenInfo.ts:36-41`
**Issue:** `atomList` has no empty-array guard. With `atoms = []`:
`local.length === 1` is false, `head = [].slice(0,-1).join(', ')` is `''`, and
`local[local.length-1]` is `local[-1]` → `undefined`, producing the literal
string `"atoms  and undefined"`. Reachable: `LayerText.tsx:389` sets `atoms = []`
for a parenthesised h-layer group that is **not** a `(H…)` mobile group, yet
still emits a `mobileH` SubHover. Hovering it surfaces a malformed card instead
of no card. The `mobileH` branch (line 82-83) has the same length-based shape and
degrades to `"atoms "`.
**Fix:** Guard the empty set in `atomList`, or — better — at the call site so a
non-`(H…)` parenthesis group renders as plain text rather than an interactive
`mobileH` span:
```ts
function atomList(atoms: number[], fragmentOffset = 0): string {
  if (atoms.length === 0) return '';
  const local = fragmentOffset ? atoms.map((a) => a - fragmentOffset) : atoms;
  if (local.length === 1) return `atom ${local[0]}`;
  const head = local.slice(0, -1).join(', ');
  return `atoms ${head} and ${local[local.length - 1]}`;
}
```

## Info (Pass 2)

### IN-03: Pure `N*` h-token shows a global canonical mixed with a per-component number, contradicting its own comment

**File:** `src/components/LayerText.tsx:441-442, 454-456`
**Issue:** For an identical-fragment h-token like `2*1H3` the code expands atoms
across all `n` copies (`[1, 1+atomsPerFrag]`, e.g. `[1, 7]`) but sets
`fragmentOffset: 0, componentIndex: 0` (line-456 comment: "card shows
component-local numbers, component 0"). Because the offset is 0, `atomList` does
not de-offset, so the card prints **"atoms 1 and 7 each bear 3 hydrogens"** —
per-component-local `1` next to global canonical `7`, with no component marker,
directly contradicting the comment. Not a regression (the pre-diff form was the
equally-confusing `atoms 1–7`), but GAP-2's stated purpose is per-component
display accuracy and this sibling display path was left uncovered.
**Fix:** For pure-`N*` identical fragments, pass only the first fragment's atoms
to the card prose (the highlight payload can keep all copies). Out of scope for
v1 if multi-identical-fragment molecules are not a target fixture.

---

# Pass 1 — Wiring 18-01 (Explanation.tsx) [preserved]

**Reviewed:** 2026-06-29T08:25:00Z
**Files Reviewed:** 2 (`Explanation.tsx`, `Explanation.test.tsx`)

## Summary

Phase 18-01 added one precedence branch to `Explanation.tsx` that renders the
Phase-17 `subTokenInfo()` copy for a hovered/pinned sub-token, falling through to
the existing whole-layer card when `subTokenInfo()` returns null (c-layer kinds).
The branch was checked against all four hard invariants from the phase context and
the project's verbatim-passthrough memory rule:

- **Read-only (Invariant):** PASS. The new branch contains no `setHover`/
  `setSubHover`/`setKeyHoverKind`/`setLegendHover`/`setPinned`/highlight calls.
  Confirmed both by reading the diff and by Test "renders the sub-token card
  without calling any store mutator" (spies assert zero mutator calls).
- **`dangerouslySetInnerHTML` count stays 1:** PASS. `grep` finds exactly one
  occurrence (line 143, the pre-existing layer-branch `readingFor` block). The new
  sub-token branch renders `subCopy.title`/`subCopy.body` as React text children.
- **No new store field:** PASS. `effSub` is a local `const` derived from the
  existing `pinned`/`subHover` selectors; `subHover` was already a store field
  (parseInchi store line 39), only newly *read* here. `SUB_KIND_LAYER` is a local
  const map, not store state.
- **Prose only from `subTokenInfo()`:** PASS. The card reads `subCopy.title`/
  `subCopy.body` exclusively; it never touches `layer.text` and never reconstructs
  an InChI fragment. The verbatim-passthrough test asserts the rendered body string
  is byte-identical to `subTokenInfo()` output.

All 10 tests pass. The four hard invariants hold. The findings below are quality
and robustness concerns, none of them blockers.

## Warnings (Pass 1)

### WR-01: `SUB_KIND_LAYER` map and `subAccent` fallback are dead/defensive code that ships unused branches

**File:** `src/components/Explanation.tsx:72-85`
**Issue:** The `subAccent` ternary has three arms: `layer ? accentVar : effSub ? <map lookup> : ink-faint`. By the time the sub-token branch renders (`subCopy` truthy ⇒ `effSub` truthy), the first arm (`layer ? accentVar`) is the only one ever taken in practice. Tracing the wiring: a live sub-token hover fires `setSubHover(hit)` on a span that is a DOM child of the layer span, whose `onMouseEnter` already called `setHover(i)` (InchiSection.tsx:117) — so `hoverIdx` (and thus `layer`) is always set during a live sub-hover. A pinned sub-token sets `pinned.idx`, so `effIdx = pinned.idx` and `layer` is again set. There is no reachable state where `subCopy` is truthy but `layer` is null. The entire `SUB_KIND_LAYER` record (8 entries) plus the `effSub ? ... : ink-faint` arms exist only to service a state the wiring prevents. Test G exercises the `layer ? accentVar` arm (h-layer hovered ⇒ `var(--c-hydro)`); no test exercises the map-lookup arm, confirming it is unreached.
**Fix:** Either drop the defensive arms and assert the invariant, or keep them with a `// ponytail:` note naming the ceiling. Lazy version:
```ts
// subAccent: sub-token card inherits the parent layer swatch. effIdx is always
// resolvable when subCopy is truthy (the sub-span's parent layer set hoverIdx, or
// pinned.idx is set), so `layer` is non-null here. ink-faint is an unreachable guard.
const subAccent = layer ? accentVar : 'var(--ink-faint)';
```
If the `SUB_KIND_LAYER` mapping is retained for a future state where sub-hover can
exist without a layer hover, mark it: `// ponytail: defensive — unreachable today; needed if sub-hover decouples from layer hover`. As written it reads as load-bearing logic that a maintainer must trace the whole hover-wiring graph to discover is dead.

### WR-02: Tests F and verbatim-passthrough derive their expectation from the function under test (partial tautology)

**File:** `src/components/__tests__/Explanation.test.tsx:175-178, 211-212`
**Issue:** Both tests compute the expected body with `subTokenInfo(mock.subHover, mock.atomElements)!.body` and then assert that exact string renders. If `subTokenInfo` produced wrong-but-stable prose, these assertions would still pass — they verify the component faithfully renders whatever the module returns (the SUBEX-09 verbatim-passthrough invariant) but cannot catch incorrect copy. Test F partially mitigates this with the literal `toContain('this component')` / `toContain('Hill order')` assertions, but the verbatim test (line 211) has no literal anchor at all. The risk is that a regression in `subTokenInfo`'s `mobileH` copy would not be caught by this file.
**Fix:** This is acceptable for proving passthrough, but add one literal-string assertion to the verbatim test so it also pins content, not just identity:
```ts
const body = subTokenInfo(mock.subHover, mock.atomElements)!.body;
expect(body).toContain('mobile'); // content anchor — guards against silent copy regressions
expect(screen.getByText(body)).toBeInTheDocument();
```
Copy-correctness itself belongs in `subTokenInfo`'s own unit tests (out of scope for these two files); note only that this file should not be relied on to catch it.

## Info (Pass 1)

### IN-01: No test covers the pinned c-layer fall-through path

**File:** `src/components/__tests__/Explanation.test.tsx:137-143`
**Issue:** Test B verifies the *live-hover* c-layer fall-through (`subHover` bond kind ⇒ `subTokenInfo` null ⇒ layer card). The symmetric *pinned* path (`pinned.sub` is a bond/branch/atom kind ⇒ `effSub` truthy ⇒ `subCopy` null ⇒ layer card) is not tested. Since `effSub = pinned ? pinned.sub : subHover` routes both through the same `subCopy` guard, the live test gives reasonable confidence, but the pinned branch of the `effSub` ternary is only covered for the stereo case (Test D), not the null-`subCopy` fall-through.
**Fix:** Add a sibling to Test B with `mock.pinned = { idx: C_IDX, sub: { kind: 'bond', endpointPairs: [[1, 2]] } }` asserting `screen.getByText('Connection layer')`.

### IN-02: `keyHoverKind` mock type widened to `string` loses the `KeyHoverZone` discriminant

**File:** `src/components/__tests__/Explanation.test.tsx:46, 87`
**Issue:** The mock declares `keyHoverKind: string | null` whereas the store types it `KeyHoverZone | null` (a union of four literals). Test E passes `'skeleton'` as a bare string. This compiles only because the mock loosens the type; a typo like `'skeletton'` would not be caught at compile time and would silently render no key card (the `KEY_ZONE_ACCENT[keyHoverKind]` / `KEY_ZONE_COPY[keyHoverKind]` lookups would be `undefined`, throwing at render). Minor — test inputs are controlled — but the widening removes a guardrail the production type provides.
**Fix:** Import `KeyHoverZone` and type the mock field as `KeyHoverZone | null` so invalid zone literals fail at compile time.

---

_Reviewed: 2026-06-29T13:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
