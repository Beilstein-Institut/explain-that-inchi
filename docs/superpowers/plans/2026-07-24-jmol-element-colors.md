# Jmol Element Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's 10-element oklch palette with the official Jmol CPK colors for the full element set, in both the canvas atom highlights and the InChI formula text.

**Architecture:** A flat TS hex map (`jmolColors.ts`) becomes the single source of element colors. `elementColor()` returns the hex directly; the canvas highlight path gains a hex passthrough; the formula text applies the hex inline (H stays black); white-highlighted atoms get a dark ring drawn on the Ketcher SVG. All the old `--c-el-*` CSS vars and per-element CSS classes are deleted.

**Tech Stack:** Vite + React 18 + TypeScript, Vitest, Ketcher (`ketcher-core` highlights API), CSS Modules + `oklch()` relative color.

## Global Constraints

- InChI passthrough rule: never reconstruct the InChI string; only read parsed layers. (Not touched by this plan, but do not violate.)
- Element symbols are Titlecase and must match `ELEMENT_NAMES` keys in `src/lib/layerInfo.ts`.
- Jmol colors are applied verbatim (no theme/contrast adjustment). Source: Jmol jscolors (<https://jmol.sourceforge.net/jscolors/>), transcribed via NGL's `element-colormaker.ts`, with `Xe` corrected to `#429eb0` (NGL bug) and `Ts`/`Og` added as `#ffffff` (Jmol default).
- Push to BOTH git remotes only if/when the user asks to push.

---

### Task 1: Jmol color map + `elementColor` returns hex

**Files:**
- Create: `src/lib/jmolColors.ts`
- Modify: `src/lib/layerInfo.ts:225-228` (`elementColor`)
- Test: `src/lib/__tests__/layerInfo.test.ts` (add cases)

**Interfaces:**
- Produces: `JMOL_COLORS: Record<string, string>` (Titlecase symbol → lowercase `#rrggbb`); `elementColor(el: string): string` returns the hex or `'var(--c-formula)'`.

- [ ] **Step 1: Write the failing test** (add to `layerInfo.test.ts`)

```ts
import { elementColor } from '../layerInfo';
import { JMOL_COLORS } from '../jmolColors';

describe('elementColor (Jmol)', () => {
  it('returns the Jmol hex for carbon (grey)', () => {
    expect(elementColor('C')).toBe('#909090');
  });
  it('returns Jmol white for hydrogen', () => {
    expect(elementColor('H')).toBe('#ffffff');
  });
  it('covers off-list elements (Fe)', () => {
    expect(elementColor('Fe')).toBe('#e06633');
  });
  it('has the corrected xenon value, not iodine', () => {
    expect(JMOL_COLORS.Xe).toBe('#429eb0');
    expect(JMOL_COLORS.I).toBe('#940094');
  });
  it('falls back for non-element pseudo-symbols', () => {
    expect(elementColor('R')).toBe('var(--c-formula)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/layerInfo.test.ts -t Jmol`
Expected: FAIL — `jmolColors` module not found.

- [ ] **Step 3: Create `src/lib/jmolColors.ts`**

```ts
// Jmol CPK element colors — the standard palette from
// https://jmol.sourceforge.net/jscolors/
// Transcribed via NGL's element-colormaker.ts (which cites the same source),
// with two corrections: Xe -> #429eb0 (NGL copy-pasted iodine's value) and
// Ts/Og added as #ffffff (Jmol's default for elements NGL omitted).
export const JMOL_COLORS: Record<string, string> = {
  H: '#ffffff', He: '#d9ffff', Li: '#cc80ff', Be: '#c2ff00', B: '#ffb5b5',
  C: '#909090', N: '#3050f8', O: '#ff0d0d', F: '#90e050', Ne: '#b3e3f5',
  Na: '#ab5cf2', Mg: '#8aff00', Al: '#bfa6a6', Si: '#f0c8a0', P: '#ff8000',
  S: '#ffff30', Cl: '#1ff01f', Ar: '#80d1e3', K: '#8f40d4', Ca: '#3dff00',
  Sc: '#e6e6e6', Ti: '#bfc2c7', V: '#a6a6ab', Cr: '#8a99c7', Mn: '#9c7ac7',
  Fe: '#e06633', Co: '#f090a0', Ni: '#50d050', Cu: '#c88033', Zn: '#7d80b0',
  Ga: '#c28f8f', Ge: '#668f8f', As: '#bd80e3', Se: '#ffa100', Br: '#a62929',
  Kr: '#5cb8d1', Rb: '#702eb0', Sr: '#00ff00', Y: '#94ffff', Zr: '#94e0e0',
  Nb: '#73c2c9', Mo: '#54b5b5', Tc: '#3b9e9e', Ru: '#248f8f', Rh: '#0a7d8c',
  Pd: '#006985', Ag: '#c0c0c0', Cd: '#ffd98f', In: '#a67573', Sn: '#668080',
  Sb: '#9e63b5', Te: '#d47a00', I: '#940094', Xe: '#429eb0', Cs: '#57178f',
  Ba: '#00c900', La: '#70d4ff', Ce: '#ffffc7', Pr: '#d9ffc7', Nd: '#c7ffc7',
  Pm: '#a3ffc7', Sm: '#8fffc7', Eu: '#61ffc7', Gd: '#45ffc7', Tb: '#30ffc7',
  Dy: '#1fffc7', Ho: '#00ff9c', Er: '#00e675', Tm: '#00d452', Yb: '#00bf38',
  Lu: '#00ab24', Hf: '#4dc2ff', Ta: '#4da6ff', W: '#2194d6', Re: '#267dab',
  Os: '#266696', Ir: '#175487', Pt: '#d0d0e0', Au: '#ffd123', Hg: '#b8b8d0',
  Tl: '#a6544d', Pb: '#575961', Bi: '#9e4fb5', Po: '#ab5c00', At: '#754f45',
  Rn: '#428296', Fr: '#420066', Ra: '#007d00', Ac: '#70abfa', Th: '#00baff',
  Pa: '#00a1ff', U: '#008fff', Np: '#0080ff', Pu: '#006bff', Am: '#545cf2',
  Cm: '#785ce3', Bk: '#8a4fe3', Cf: '#a136d4', Es: '#b31fd4', Fm: '#b31fba',
  Md: '#b30da6', No: '#bd0d87', Lr: '#c70066', Rf: '#cc0059', Db: '#d1004f',
  Sg: '#d90045', Bh: '#e00038', Hs: '#e6002e', Mt: '#eb0026', Ds: '#ffffff',
  Rg: '#ffffff', Cn: '#ffffff', Nh: '#ffffff', Fl: '#ffffff', Mc: '#ffffff',
  Lv: '#ffffff', Ts: '#ffffff', Og: '#ffffff', D: '#ffffc0', T: '#ffffa0',
};
```

- [ ] **Step 4: Rewrite `elementColor` in `src/lib/layerInfo.ts`**

Replace the header comment + function (lines ~221-228) with:

```ts
// ---------------------------------------------------------------------------
// elementColor — returns the Jmol CPK color for the element (see jmolColors.ts).
// Non-element pseudo-symbols (R-groups, etc.) fall back to the formula color.
// ---------------------------------------------------------------------------

import { JMOL_COLORS } from './jmolColors';

export function elementColor(el: string): string {
  return JMOL_COLORS[el] ?? 'var(--c-formula)';
}
```

(Place the `import` with the other imports at the top of the file, not mid-file — move it up.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/layerInfo.test.ts -t Jmol`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/jmolColors.ts src/lib/layerInfo.ts src/lib/__tests__/layerInfo.test.ts
git commit -m "feat: Jmol element color map + elementColor returns hex"
```

---

### Task 2: `resolveVar` hex passthrough + update highlight tests

**Files:**
- Modify: `src/lib/highlightUtils.ts:39-55` (`resolveVar`)
- Test: `src/lib/__tests__/highlightUtils.test.ts` (update existing assertions)

**Interfaces:**
- Consumes: `elementColor` now returning hex (Task 1).
- Produces: `resolveVar('#909090') === '#909090'` (passthrough). Element highlight specs now carry the Jmol hex as `color`.

- [ ] **Step 1: Write the failing test** (add near the resolveVar tests, or in highlightUtils.test.ts)

```ts
import { resolveVar } from '../highlightUtils';
it('resolveVar passes a hex color through unchanged', () => {
  expect(resolveVar('#909090')).toBe('#909090');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/highlightUtils.test.ts -t "hex color through"`
Expected: FAIL — production `resolveVar` reads it as a CSS var name and returns `#888` (or a JSDOM value), not `#909090`.

- [ ] **Step 3: Add the passthrough guard** at the top of `resolveVar` (after the JSDoc, before `const raw = ...`):

```ts
export function resolveVar(name: string): string {
  // A concrete hex is already Raphaël-safe — no CSS-var lookup needed.
  if (name.startsWith('#')) return name;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // ...unchanged...
```

- [ ] **Step 4: Update the element-color assertions.** In `highlightUtils.test.ts`, the tests that assert `spec.color === '--c-el-C'` / `'--c-el-N'` / `'--c-el-H'` (with the identity `resolveVarFn`) now flow the Jmol hex through `stripVar` (no-op on a hex) + passthrough. Change expected values:
  - `'--c-el-C'` → `'#909090'`
  - `'--c-el-N'` → `'#3050f8'`
  - `'--c-el-H'` → `'#ffffff'`
  (Lines ~240, 254, 470, 477, 485, 698, 892, and the comment at 226/234/237/243/463/686/877 — search for `--c-el-` in the file and update each expected string; leave the surrounding test logic unchanged.)

- [ ] **Step 5: Run the whole highlight suite**

Run: `npx vitest run src/lib/__tests__/highlightUtils.test.ts`
Expected: PASS (all element-color assertions now expect Jmol hex).

- [ ] **Step 6: Commit**

```bash
git add src/lib/highlightUtils.ts src/lib/__tests__/highlightUtils.test.ts
git commit -m "feat: resolveVar hex passthrough; element highlights use Jmol hex"
```

---

### Task 3: Formula text uses Jmol color inline; H stays black

**Files:**
- Modify: `src/components/LayerText.tsx:15-18` (`EL_CLASS`) and the two `FormulaText` spans that apply it (lines ~113 and ~151)
- Test: `src/components/__tests__/` — add/extend a LayerText render test if one exists; otherwise a focused test file `src/components/__tests__/LayerText.formula.test.tsx`.

**Interfaces:**
- Consumes: `JMOL_COLORS` (Task 1).
- Produces: formula element `<span>`s carry inline `color`/`--el-color`/`--el-bg-color` from Jmol for every non-H element; H spans carry none.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react';
import LayerText from '../LayerText';
// Render a formula layer "C2H6O" and assert:
//  - the 'O' letter span has style color rgb(255, 13, 13) (#ff0d0d)
//  - the 'H' letter span has NO inline color (inherits black)
// (Adapt to LayerText's actual props — see existing LayerText tests for the
//  layer/pinnedSub/layerIdx shape.)
```

Follow the existing LayerText test setup for props; assert via `getComputedStyle(span).color` or `span.style.color`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/LayerText.formula.test.tsx`
Expected: FAIL — spans currently use the CSS-module class, no inline color.

- [ ] **Step 3: Add a helper and replace `EL_CLASS` usage** in `LayerText.tsx`.

Remove the `EL_CLASS` map (lines 15-18). Add near the top of the file:

```tsx
import { JMOL_COLORS } from '../lib/jmolColors';

// Inline per-element style from the Jmol color. Hydrogen renders black (Jmol
// white is invisible on the page), so it gets no per-element style.
function elStyle(el: string): React.CSSProperties | undefined {
  if (el === 'H') return undefined;
  const hex = JMOL_COLORS[el];
  if (!hex) return undefined;
  return {
    color: hex,
    ['--el-color' as string]: hex,
    ['--el-bg-color' as string]: `oklch(from ${hex} 0.95 0.04 h)`,
  };
}
```

In the two element `<span>`s (the single-segment path ~line 113 and the multi-segment path ~line 151), drop `EL_CLASS[el] ?? ''` from the className list and add `style={elStyle(el)}`:

```tsx
<span
  key={key++}
  className={[styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
  style={elStyle(el)}
  {...subHoverProps(hit, layerIdx)}
>
```

(Keep everything else — `hit`, `subHoverProps`, key — unchanged. If a span already has a `style`, merge.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/__tests__/LayerText.formula.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LayerText.tsx src/components/__tests__/LayerText.formula.test.tsx
git commit -m "feat: formula letters use Jmol color inline; hydrogen stays black"
```

---

### Task 4: Delete dead element CSS + fix FeedbackDialog

**Files:**
- Modify: `src/components/InchiSection.module.css` (remove `.elC`…`.elI` rules, lines ~104-113)
- Modify: `src/styles.css` (remove `.el-C`…`.el-I` rules ~511-520 and the `--c-el-*` / `--c-el-*-bg` var block ~22-42)
- Modify: `src/components/FeedbackDialog.tsx:136` (`var(--c-el-O)` → `#ff0d0d`)

**Interfaces:** none produced; pure cleanup. Verify no remaining references before deleting.

- [ ] **Step 1: Verify nothing else consumes the tokens**

Run: `grep -rn "c-el-\|\.elC\|EL_CLASS" src | grep -v jmolColors`
Expected: only the lines listed above (CSS defs, FeedbackDialog, and any test comments). If a live consumer appears, stop and handle it.

- [ ] **Step 2: Delete the `.elC … .elI` block** in `InchiSection.module.css` (the 10 lines `[data-layer="formula"] .elC { ... }` … `.elI { ... }`). Keep the `--el-color`/`--el-bg-color` documentation comment and the `.inchiSubtoken`/`.pinned` rules that *read* those vars.

- [ ] **Step 3: Delete the `.el-C … .el-I` rules** (`styles.css` ~511-520) and the `--c-el-C … --c-el-I` + `--c-el-C-bg … --c-el-I-bg` variable definitions (~22-42). Leave `--c-formula`, `--c-conn`, `--c-hydro*`, `--c-stereo*`, `--c-proton`, and their `-bg` variants intact.

- [ ] **Step 4: Fix FeedbackDialog** line 136:

```tsx
<strong style={{ color: '#ff0d0d' }}>public</strong>
```

- [ ] **Step 5: Build + full test run**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no TS errors, all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/components/InchiSection.module.css src/styles.css src/components/FeedbackDialog.tsx
git commit -m "refactor: remove dead --c-el-* tokens and per-element CSS classes"
```

---

### Task 5: Dark ring around white-highlighted atoms on canvas

**Files:**
- Modify: `src/hooks/useKetcherHighlights.ts` — add `outlineWhiteHalos`, extend cleanup, wire into the effect; adjust `whiteAtomLabels`.
- Test: `src/hooks/__tests__/useKetcherHighlights.test.ts` (add cases)

**Interfaces:**
- Consumes: `HighlightSpec[]` from `buildHighlightSpecs`; element highlight specs now carry `#ffffff` for hydrogen (Task 2).
- Produces: `outlineWhiteHalos(svgRoot: Element, specs: HighlightSpec[]): void` appends `<circle data-h-ring="true">` per white-halo atom; `cleanHBadges` also removes `[data-h-ring]`.

- [ ] **Step 1: Write the failing test** (JSDOM, mirror the existing `whiteAtomLabels` test setup)

```ts
import { outlineWhiteHalos, cleanHBadges } from '../useKetcherHighlights';

function makeSvgWithAtom(atomId: number) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const g = document.createElementNS(ns, 'g');
  const el = document.createElementNS(ns, 'text');
  el.setAttribute('data-atom-id', String(atomId));
  // JSDOM lacks getBBox — stub it on the group.
  (g as any).getBBox = () => ({ x: 10, y: 20, width: 8, height: 8 });
  g.appendChild(el);
  svg.appendChild(g);
  return svg;
}

it('draws a ringed circle for a white-colored spec', () => {
  const svg = makeSvgWithAtom(3);
  outlineWhiteHalos(svg, [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: '#ffffff' }]);
  const ring = svg.querySelector('[data-h-ring]');
  expect(ring).not.toBeNull();
  expect(ring!.getAttribute('stroke')).not.toBe('white');
});

it('draws nothing for a non-white spec', () => {
  const svg = makeSvgWithAtom(3);
  outlineWhiteHalos(svg, [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: '#909090' }]);
  expect(svg.querySelector('[data-h-ring]')).toBeNull();
});

it('cleanHBadges removes injected rings', () => {
  const svg = makeSvgWithAtom(3);
  outlineWhiteHalos(svg, [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: '#ffffff' }]);
  cleanHBadges(svg);
  expect(svg.querySelector('[data-h-ring]')).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useKetcherHighlights.test.ts -t "ring"`
Expected: FAIL — `outlineWhiteHalos` not exported.

- [ ] **Step 3: Implement `outlineWhiteHalos`** in `useKetcherHighlights.ts` (place near `whiteAtomLabels`):

```ts
/**
 * Jmol hydrogen (and any pure-white element) highlights render a white halo that
 * is invisible on the white Ketcher canvas. Draw a dark-outlined white disc on
 * each such atom so the highlight reads. Canvas-only; mirrors renderHBadges'
 * SVG-injection + cleanHBadges removal pattern.
 */
function isWhite(color: string): boolean {
  const c = color.replace(/\s/g, '').toLowerCase();
  return c === '#ffffff' || c === '#fff' || c === 'rgb(255,255,255)' || c === 'white';
}

export function outlineWhiteHalos(svgRoot: Element, specs: HighlightSpec[]): void {
  const ns = 'http://www.w3.org/2000/svg';
  for (const spec of specs) {
    if (!isWhite(spec.color)) continue;
    for (const atomId of spec.atoms) {
      const el = svgRoot.querySelector(`[data-atom-id="${atomId}"]`);
      if (!el) continue;
      const group = el.closest('g') ?? el;
      const bbox = (group as SVGGraphicsElement).getBBox?.();
      if (!bbox) continue;
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const ring = document.createElementNS(ns, 'circle');
      ring.setAttribute('data-h-ring', 'true');
      ring.setAttribute('cx', String(cx));
      ring.setAttribute('cy', String(cy));
      ring.setAttribute('r', '9');            // tune in Step 6
      ring.setAttribute('fill', 'white');
      ring.setAttribute('stroke', '#333');    // dark outline; tune in Step 6
      ring.setAttribute('stroke-width', '1.5');
      ring.setAttribute('pointer-events', 'none');
      svgRoot.appendChild(ring);
    }
  }
}
```

- [ ] **Step 4: Extend cleanup + skip whitening white labels + wire in.**

In `cleanHBadges`, also remove rings:

```ts
export function cleanHBadges(svgRoot: Element): void {
  svgRoot.querySelectorAll('[data-h-badge], [data-h-ring]').forEach(el => el.remove());
}
```

In `whiteAtomLabels`, don't whiten a label whose spec color is white (keep the `H` glyph dark on the white disc):

```ts
export function whiteAtomLabels(svgRoot: Element, specs: HighlightSpec[]): void {
  for (const spec of specs) {
    if (isWhite(spec.color)) continue; // white halos keep their dark labels
    for (const atomId of spec.atoms) {
      // ...unchanged...
```

In `useKetcherHighlights`, after the `whiteAtomLabels(svgRoot, specs)` call (inside `if (specs.length > 0)`), add:

```ts
        whiteAtomLabels(svgRoot, specs);
        outlineWhiteHalos(svgRoot, specs);
```

- [ ] **Step 5: Run the hook suite**

Run: `npx vitest run src/hooks/__tests__/useKetcherHighlights.test.ts`
Expected: PASS.

- [ ] **Step 6: Manual visual verification** (see run skill / `npm run dev`):
  - Draw ethanol (C2H6O) or a molecule with explicit H; hover the formula layer.
  - Confirm: heavy atoms show Jmol-colored halos; explicit H atoms show a **white disc with a dark ring**; the formula `H` letter is **black**; off-list elements (draw an Fe or Si) show their Jmol color on both canvas and formula.
  - Tune `r` / `stroke-width` / `stroke` in `outlineWhiteHalos` until the ring reads cleanly at Ketcher's default zoom. Re-run tests, amend the commit.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useKetcherHighlights.ts src/hooks/__tests__/useKetcherHighlights.test.ts
git commit -m "feat: dark ring around white (hydrogen) atom highlights on canvas"
```

---

## Self-Review

- **Spec coverage:** data map (T1), elementColor hex (T1), canvas passthrough (T2), formula text + H-black (T3), CSS cleanup + FeedbackDialog (T4), H ring on canvas (T5). All spec sections mapped.
- **Type consistency:** `JMOL_COLORS` / `elementColor` / `resolveVar` / `outlineWhiteHalos` / `cleanHBadges` signatures consistent across tasks. `isWhite` is a shared private helper in `useKetcherHighlights.ts` used by both `whiteAtomLabels` and `outlineWhiteHalos`.
- **Placeholders:** none — full data map and all code inline. Ring radius/stroke are real defaults with an explicit visual-tuning step.
