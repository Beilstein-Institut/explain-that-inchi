# Architecture Research — v1.5 Sub-token-specific explanations

**Domain:** Single-page InChI explainer (React 18 + Zustand 5 + Ketcher WASM, in-browser, static)
**Researched:** 2026-06-26
**Confidence:** HIGH (entirely codebase-grounded; all integration points confirmed by reading the actual files)

> NOTE: This file replaces an earlier draft scoped to an abandoned "inorganic/salt" framing of v1.5. The active milestone (PROJECT.md, dated 2026-06-26) is **Sub-token-specific explanations**: make the existing explanation card read `subHover`/`pinned.sub`.

---

## Executive answer

This is a **copy-only** milestone. The hard parts — sub-token detection, the `SubHover` union, canvas highlighting, and pinning — already shipped in v1.0–v1.4 + Phase 16. The card just doesn't *read* `subHover`/`pinned.sub` yet. The clean integration is:

1. One new pure module `src/lib/subTokenInfo.ts` (mirrors `inchiKeyInfo.ts`) returning `{title, body, reading?}` from a `SubHover`.
2. One new precedence branch in `Explanation.tsx`, inserted **between** `keyHoverKind` and the layer-level branch.
3. **Zero** store changes. `subHover` and `pinned.sub` already exist and are already written.

Invariants hold for free: copy is derived from the existing parsed `SubHover` (never reconstructs the InChI string), and no new store field means no canvas remount.

---

## System Overview — where the new tier sits

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Zustand store (store.ts)                       │
│   subHover ─┐   pinned{idx,sub} ─┐   hoverIdx ─┐  keyHoverKind ─┐      │
│             │                    │             │  legendHover ─┐│      │
└─────────────┼────────────────────┼─────────────┼──────────────┼┼──────┘
              │ (already written    │             │              ││
              │  by LayerText)      │             │              ││
              ▼                     ▼             ▼              ▼▼
   ┌──────────────────┐   ┌────────────────────────────────────────┐
   │ useKetcherHigh-  │   │            Explanation.tsx               │
   │ lights (canvas)  │   │  precedence (NEW tier marked ★):         │
   │  — UNCHANGED     │   │   keyHoverKind                           │
   └──────────────────┘   │   ★ effSub  ◄── NEW                      │
                          │   layer (effIdx = pinned.idx ?? hoverIdx)│
                          │   legendHover                            │
                          │   idle                                   │
                          │           │ reads copy from              │
                          │           ▼                              │
                          │   ┌──────────────────────────┐           │
                          │   │  subTokenInfo.ts  (NEW)   │           │
                          │   │  subTokenInfo(sub,        │           │
                          │   │    layerType, atomElements)│          │
                          │   │  → {title, body, reading?}│           │
                          │   └──────────────────────────┘           │
                          └────────────────────────────────────────┘
```

The split of `useKetcherHighlights` (canvas) and `Explanation` (card) is the load-bearing fact: sub-token hover **already** flows to the canvas via `buildSubHoverSpecs`. This milestone adds the parallel, independent feed into the card — exactly mirroring the existing `keyHoverKind` split (card-only, deliberately no canvas, Invariant #2).

---

## Component Responsibilities

| Component | Responsibility | Change in v1.5 |
|-----------|----------------|----------------|
| `src/lib/subTokenInfo.ts` (**NEW**) | Pure: `SubHover` + `layerType` + `atomElements` → `{title, body, reading?}` | New file |
| `src/components/Explanation.tsx` | Render the left card by precedence | Add one branch + 1 selector + 1 derived var |
| `src/store.ts` | Hold `subHover`, `pinned.sub` | **None** (confirmed) |
| `src/components/LayerText.tsx` | Emit `SubHover` on hover/pin | **None** |
| `src/lib/layerInfo.ts` | `readingFor`, `ELEMENT_NAMES`, `subscript`, `atomLabel` | Reused; extend `ELEMENT_NAMES` to full periodic table; possibly `export` `atomLabel` |
| `src/lib/parseInchi.ts` | `SubHover` type | **None** |

---

## Q1 — The precedence chain

Current chain in `Explanation.tsx` (lines 71–136):

```
keyHoverKind → layer (effIdx = pinned?.idx ?? hoverIdx) → legendHover → idle
```

New chain — the sub-token tier sits **below `keyHoverKind`, above the layer-level branch**:

```
keyHoverKind → ★ effSub → layer → legendHover → idle
```

Why this slot:
- **Below `keyHoverKind`:** a key-segment hover is a different surface (the InChIKey strip) and must keep winning; unchanged.
- **Above the layer branch:** the whole point of v1.5 is that a sub-token *overrides* the generic layer blurb. Hovering element `C` in the formula must say "Carbon …", not the generic "Molecular formula" blurb. The layer branch fires whenever any layer is hovered, so the sub tier MUST precede it or it never shows.

**`pinned.sub` handling — mirror the existing `effIdx` derivation.** The store already gates `setSubHover` to a no-op while pinned (store.ts line 84), so `subHover` freezes. For explicit intent (identical to `effIdx` on line 46), add:

```ts
const effSub = pinned ? pinned.sub : subHover;
```

This is the precise parallel of the existing `const effIdx = pinned ? pinned.idx : hoverIdx;`. Four cases, all fall out naturally:

| Pinned state | `effIdx` | `effSub` | Card shows |
|---|---|---|---|
| layer pinned (`pinned.sub === null`) | `pinned.idx` | `null` | layer branch (sub tier skipped) ✓ |
| sub-token pinned (`pinned.sub !== null`) | `pinned.idx` | `pinned.sub` | sub tier ✓ |
| nothing pinned, hovering sub | `hoverIdx` | `subHover` | sub tier ✓ |
| nothing pinned, hovering layer body | `hoverIdx` | `null` | layer branch ✓ |

Branch guard becomes: `keyHoverKind ? … : effSub ? (★) : layer ? … : legendHover ? … : idle`.

Because the layer branch already uses `effIdx`, the owning `layer` for the sub-token (needed by `subTokenInfo` for context — e.g. the t-layer caveat) is the SAME `layer` already computed on line 47. Pass `layer.type` into `subTokenInfo`. No extra lookup.

**Accent color:** reuse the layer's accent (`accentVar`, already computed line 56) — a sub-token belongs to its layer's color family. No new CSS tokens (mirrors the `KEY_ZONE_ACCENT` discipline).

**Graceful fallback:** if `subTokenInfo` returns `null` for a kind with no copy (c-layer `atom`/`bond`/`branch`), the branch should fall through to the layer branch, not render a blank. Implement as: compute `const subCopy = effSub ? subTokenInfo(effSub, layer?.type, atomElements) : null;` then guard the branch on `subCopy` rather than `effSub`.

---

## Q2 — The pure module

New file `src/lib/subTokenInfo.ts`, parallel to `inchiKeyInfo.ts`. Signature:

```ts
import type { SubHover, LayerType } from './parseInchi';
import { ELEMENT_NAMES, subscript } from './layerInfo'; // reuse — do not duplicate

export interface SubTokenCopy {
  title: string;
  body: string;
  reading?: string;   // optional innerHTML-safe reading line (<b>/<span style=color> only)
}

/**
 * Pure: given a hovered/pinned sub-token, its owning layer type, and the
 * canonical→element map, returns the card copy. No InChI reconstruction; reads
 * only the already-parsed SubHover fields + atomElements. DOM-free, Node-testable.
 *
 * Returns null for sub-token kinds with no dedicated copy yet (caller falls
 * through to the layer-level branch — graceful degradation, never a blank card).
 */
export function subTokenInfo(
  sub: SubHover,
  layerType: LayerType | undefined,
  atomElements: Record<number, string>,
): SubTokenCopy | null;
```

Dispatch by `sub.kind`. v1.5 target coverage (from PROJECT.md milestone goal — H sub-tokens, tetrahedral stereo, formula elements):

| `sub.kind` | Layer | Copy produced |
|---|---|---|
| `element` | formula | `ELEMENT_NAMES[sub.el]` name + role; backed by a **full periodic-table name table** (today `ELEMENT_NAMES` has only 10 elements) |
| `hAtoms` | h | "`H`/`H2`/`H3`: atom X bears N hydrogen(s)" from `sub.count` + `sub.atoms` |
| `mobileH` | h | "mobile / tautomeric proton shared between atoms …" from `sub.atoms` |
| `stereo` | t (and b) | sp³ handedness in plain language **+ the mandated caveat that +/- is canonical-ordering parity, NOT R/S** |
| `atom` / `bond` / `branch` | c | **return `null`** → fall through to existing c-layer blurb (v1.5 goal lists only H/stereo/element; don't invent c-layer sub-copy) |

`reading?` is optional: for `element`/`stereo` a short reading line (e.g. `<b>C₅</b> carbon`) reuses the `dangerouslySetInnerHTML` path already in the layer branch. Where prose suffices, omit it and render title+body only (like the `keyHoverKind` branch, which has no reading line).

**Two reuse decisions (ponytail ladder):**
- **Element names:** extend `ELEMENT_NAMES` in `layerInfo.ts` to the full periodic table **in one place** (so `formulaReading` benefits too) rather than a second table in `subTokenInfo.ts`. `subscript()` is already exported and reused.
- **`atomLabel`** is currently private in `layerInfo.ts`. If `subTokenInfo` wants `C₅`-style labels, add `export` (one-line change) rather than reimplementing.

---

## Q3 — Invariants preserved

**Verbatim-passthrough (Invariant #1 / memory `feedback_inchi_passthrough`):**
`subTokenInfo` consumes **only** already-parsed `SubHover` numeric fields (`el`, `count`, `atoms`, `atom`, `sign`) + `atomElements`. It never reads `layer.text`, never re-joins, never emits an InChI fragment as if it were the source string. The displayed InChI string in `InchiSection` is untouched. Structurally identical to `readingFor` and `KEY_ZONE_COPY` — both derive prose from parsed data, neither reconstructs the string.

**No-remount (D-13, repeated across decisions):**
No new store field → no new subscription on `KetcherPanel` → the canvas/WASM never remounts. `Explanation` adds ONE read-only selector (`subHover`; it already reads `pinned`); a leaf read in an already-mounted sibling. Adding a render branch is not a remount trigger. `useKetcherHighlights` / `buildSubHoverSpecs` are not touched.

**Read-only card tier (mirrors Invariant #2 guardrail):**
Like the `keyHoverKind` branch, the new branch is render-only — it must never call `setHover`/`setSubHover`/highlight APIs. Pure read → render.

---

## Q4 — Store changes: NONE (confirmed)

Read of `store.ts`:
- `subHover: SubHover | null` — exists (line 39), written by `setSubHover` from `LayerText.subHoverProps`.
- `pinned: { idx; sub: SubHover | null } | null` — exists (line 42); `pinned.sub` set by `setPinned({idx, sub: hit})` in `LayerText` line 36.
- `resetAll` (line 91) and `setInchiData` (line 81) already null both → idle reset and preset-swap clear the sub-token card for free.

No new field, no new action, no selector signature change. The only store-side touch is `Explanation` adding `const subHover = useInchiStore(s => s.subHover);`.

---

## Q5 — Build order & testing seam

Strict dependency order — each step compiles and is independently testable:

1. **`src/lib/layerInfo.ts`** — extend `ELEMENT_NAMES` to the full periodic table; `export` `atomLabel` if reused. *Smallest, no behavior change to existing callers.* Test: existing `layerInfo.test.ts` still green + new assertion that a non-drawable element (e.g. `K`) resolves to "potassium".
2. **`src/lib/subTokenInfo.ts`** (NEW) — the pure module. **Built and unit-tested before any component wiring** — same discipline as `buildFeedbackUrl` ("Pure DOM-free … built/tested first", PROJECT Key Decisions) and `inchiKeyInfo`. **This is the testing seam.**
3. **`src/components/Explanation.tsx`** — add `subHover` selector, derive `effSub` + `subCopy`, insert the branch between `keyHoverKind` and `layer`. No other component changes.

**Testing seam** — `subTokenInfo` is the pure-function seam, exactly like `readingFor` (`layerInfo.test.ts`) and `KEY_ZONE_COPY`/`parseInchiKey` (`inchiKeyInfo.test.ts`). New `src/lib/__tests__/subTokenInfo.test.ts` (vitest, no DOM, no fixtures framework):

```ts
// element
subTokenInfo({kind:'element', el:'O'}, 'formula', {})            // title contains "Oxygen"
// hAtoms
subTokenInfo({kind:'hAtoms', atoms:[1], count:3}, 'h', {1:'C'})  // body mentions 3 / "three"
// mobileH
subTokenInfo({kind:'mobileH', atoms:[3,4]}, 'h', {})             // body says "shared"/"mobile"/"tautomeric"
// stereo — the mandated caveat (HIGH-value test)
const t = subTokenInfo({kind:'stereo', atom:5, sign:'+'}, 't', {5:'C'});
expect(t.body.toLowerCase()).toContain('parity');                // canonical-ordering parity present
expect(t.body).toMatch(/not.*R\/S/i);                            // explicit "not R/S" caveat
// c-layer kinds return null → fall through
expect(subTokenInfo({kind:'atom', canonical:1}, 'c', {})).toBeNull();
```

Use **real** element symbols and real canonical indices per the v1.4 lesson (memory `feedback_real_domain_fixtures_and_gates`): fabricated fixtures hid a broken feature behind 333 green tests. The `stereo` "not R/S" assertion is the high-value test — it pins the chemically-critical claim the milestone goal mandates.

**Ordering rationale:** 1 first (smallest, unblocks element copy with no consumer risk). 2 is the value core and is fully testable in isolation before any React touches. 3 is a thin wiring change gated on 2. Every step honors no-remount (no `<Editor>` conditional, no new store field) and verbatim passthrough (no string reconstruction).

---

## Architectural Patterns (reused, not invented)

### Pattern 1: Pure prose module beside the renderer
**What:** Static/derived card copy lives in a DOM-free `*.ts` module (`inchiKeyInfo.ts`, `layerInfo.ts`) returning a `{title, body, …}` shape; the component imports and renders it.
**When:** Any new card content. v1.5 adds `subTokenInfo.ts`.
**Trade-off:** One extra file, but full unit-testability and the verbatim invariant enforced by construction (no `layer.text` access).

### Pattern 2: `effX = pinned ? pinned.X : hoverX` derivation
**What:** Pinned state overrides live hover for the card, mirroring the store's hover-gate.
**When:** Already used for `effIdx`; v1.5 adds `effSub` identically.
**Example:** `const effSub = pinned ? pinned.sub : subHover;` (parallel to `Explanation.tsx:46`).

### Pattern 3: Card-only tier that never touches the canvas
**What:** A precedence branch reads a store field and renders prose without calling any highlight API (Invariant #2).
**When:** `keyHoverKind` does this today; the sub-token card tier is read-only too. (The canvas highlight for sub-tokens comes from the *separate, pre-existing* `subHover → useKetcherHighlights` path — the new card tier neither adds nor removes that.)

---

## Anti-Patterns (v1.5-specific)

### Anti-Pattern 1: A new store field for the sub-token card
**What people do:** add `subHoverCopy` / `subPinned`. **Why wrong:** churns store shape, risks a new `KetcherPanel` selector, threatens no-remount. **Instead:** derive everything in `Explanation` from existing `subHover`/`pinned.sub`.

### Anti-Pattern 2: Reconstructing the InChI fragment for display
**What people do:** build `"1H3"` inside `subTokenInfo` to "show the token." **Why wrong:** violates verbatim-passthrough — the displayed token already comes from `LayerText`'s verbatim slice. **Instead:** describe the *meaning* from parsed numeric fields.

### Anti-Pattern 3: Duplicating the element-name table
**What people do:** a second `ELEMENT_NAMES` in `subTokenInfo.ts`. **Why wrong:** two sources drift. **Instead:** extend the one in `layerInfo.ts`.

### Anti-Pattern 4: Putting the sub tier below the layer branch
**What people do:** append after `legendHover`. **Why wrong:** the layer branch is truthy whenever a sub-token is hovered, so the sub copy never shows. **Instead:** it must sit *above* the layer branch.

---

## Integration Points

| Boundary | Communication | v1.5 notes |
|---|---|---|
| `LayerText` → store | `setSubHover` / `setPinned` | Unchanged; already writes the data the card needs |
| store → `Explanation` | selector read `subHover` (new) + `pinned` (existing) | Read-only, no remount |
| `Explanation` → `subTokenInfo` | direct call, pure | The only new module |
| `subTokenInfo` → `layerInfo` | `ELEMENT_NAMES`, `subscript`, (`atomLabel`) import | Reuse; extend table in place |
| `subHover` → `useKetcherHighlights` | EXISTING, untouched | Canvas highlight path stays independent of the card path |

---

## New-vs-Modified Summary (for the roadmapper)

| File | New or Modified | Scope | Step |
|------|-----------------|-------|------|
| `src/lib/layerInfo.ts` `ELEMENT_NAMES` | Modified | full periodic-table name table | 1 |
| `src/lib/layerInfo.ts` `atomLabel` | Modified (optional) | add `export` if reused | 1 |
| `src/lib/subTokenInfo.ts` | **New** | pure copy module (element/hAtoms/mobileH/stereo; null for c-layer) | 2 |
| `src/lib/__tests__/subTokenInfo.test.ts` | **New** | pure-function unit tests (incl. not-R/S caveat) | 2 |
| `src/components/Explanation.tsx` | Modified | `subHover` selector + `effSub`/`subCopy` + new branch above layer branch | 3 |
| `src/store.ts` | **Unchanged** | `subHover`/`pinned.sub` already present | — |
| `src/components/LayerText.tsx` | **Unchanged** | already emits all `SubHover` kinds | — |
| `src/lib/parseInchi.ts` `SubHover` | **Unchanged** | union already covers all v1.5 kinds | — |

---

## Sources

- `src/store.ts`, `src/components/Explanation.tsx`, `src/components/LayerText.tsx`, `src/lib/layerInfo.ts`, `src/lib/inchiKeyInfo.ts`, `src/lib/parseInchi.ts` (read 2026-06-26) — HIGH
- `src/lib/__tests__/inchiKeyInfo.test.ts` — pure-module test-seam pattern — HIGH
- `.planning/PROJECT.md` — milestone goal, D-04a precedence, no-remount (D-13), verbatim-passthrough, buildFeedbackUrl "pure-first" decision — HIGH
- MEMORY: `feedback_inchi_passthrough`, `feedback_real_domain_fixtures_and_gates` — HIGH

---
*Architecture research for: v1.5 sub-token-specific explanations*
*Researched: 2026-06-26*
