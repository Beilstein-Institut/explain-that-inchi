// A present legend row and an absent one must stay visibly different on every axis
// they claim to differ on. This exists because .desc did not: both states resolved to
// --ink-faint, so the widest column of the grid looked identical and flattened the
// whole comparison until someone reported it.
//
// Text contrast is NOT one of the axes to push. An absent row is focusable and opens
// its own explanation card, so it is an active control — WCAG 1.4.3's incidental-text
// exception does not apply and its text stays at 4.5:1. tokenContrast.test.ts holds
// that floor for --ink-faint on --bg-canvas; this file holds the separation.
import { describe, it, expect } from 'vitest';
import { readCss, rule, decl as declOf } from '../../testing/cssProbe';

const CSS = readCss('components/Legend.module.css');

const decl = (selector: string, prop: string) => declOf(rule(CSS, selector), prop);

describe('the legend separates present from absent on four axes', () => {
  // 1. Swatch: filled for present, a ring for absent. A shape difference, not a dim —
  //    it costs no contrast, which is why it carries the most weight here.
  it('swatch is filled when present and hollow when absent', () => {
    expect(decl('.sw', 'background')).toBe('var(--layer-color)');
    expect(decl('.muted .sw', 'background')).toBe('transparent');
    expect(decl('.muted .sw', 'box-shadow')).toContain('inset');
    expect(decl('.muted .sw', 'box-shadow')).toContain('var(--layer-color)');
  });

  // 2. Key: the layer's own hue vs neutral ink.
  it('key carries the layer hue only when present', () => {
    expect(decl('.key', 'color')).toBe('var(--layer-color)');
    expect(decl('.muted .key', 'color')).toBe('var(--ink-faint)');
  });

  // 3. Name: both colour and weight step down.
  it('name steps down in colour and weight when absent', () => {
    expect(decl('.name', 'color')).toBe('var(--ink)');
    expect(decl('.muted .name', 'color')).toBe('var(--ink-faint)');
    expect(Number(decl('.muted .name', 'font-weight')))
      .toBeLessThan(Number(decl('.name', 'font-weight')));
  });

  // 4. Desc — the regression this file is named for. The widest column must not
  //    resolve to the same token in both states.
  it('desc differs between the two states', () => {
    const present = decl('.desc', 'color');
    const absent = decl('.muted .desc', 'color');
    expect(present).toBeDefined();
    expect(absent).toBeDefined();
    expect(present).not.toBe(absent);
  });

  // Every colour the absent row paints must be a token the contrast guard covers, so
  // "make it fainter" cannot be done with a literal that skips the AA check.
  it('absent-row colours are tokens, never literals', () => {
    for (const sel of ['.muted .key', '.muted .name', '.muted .desc']) {
      expect(decl(sel, 'color')).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  // The row hands the hue down; nothing may reintroduce a per-element inline colour,
  // which is what split this logic across JSX and CSS before.
  it('presence styling lives in CSS, not in the JSX', () => {
    const tsx = readCss('components/Legend.tsx'); // comment-stripped is fine here
    expect(tsx).toContain("'--layer-color': color");
    expect(tsx).not.toMatch(/style=\{\{\s*background:\s*color/);
    expect(tsx).not.toContain("present ? color :");
  });
});
