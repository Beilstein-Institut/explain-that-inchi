// The palette's lightness values are solved, not eyeballed — styles.css says so in a
// comment. A comment cannot fail, so this computes every ratio the comment claims and
// fails when one stops holding. It caught nothing when written; it exists so the next
// person to move a surface, an ink, or a border learns what they broke from a test
// rather than from a user.
//
// WCAG 2.2: 4.5:1 for text (1.4.3), 3:1 for the boundary of a UI component (1.4.11).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEXT_MIN = 4.5;   // SC 1.4.3 Contrast (Minimum), normal-size text
const CONTROL_MIN = 3;  // SC 1.4.11 Non-text Contrast, UI component boundaries

/** :root oklch tokens, parsed once. */
const TOK: Record<string, [number, number, number]> = (() => {
  const css = readFileSync(resolve(__dirname, '..', 'styles.css'), 'utf8');
  const out: Record<string, [number, number, number]> = {};
  for (const [, name, l, c, h] of css.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    out[name] = [parseFloat(l), parseFloat(c), parseFloat(h)];
  }
  return out;
})();

/** oklch -> linear sRGB, clamped to gamut the way a browser renders it. */
function linearRgb([L, C, H]: [number, number, number]): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(v => Math.min(1, Math.max(0, v))) as [number, number, number];
}

function ratio(fg: string, bg: string): number {
  for (const t of [fg, bg]) {
    if (!TOK[t]) throw new Error(`token --${t} not found in styles.css`);
  }
  const lum = (t: string) => {
    const [r, g, b] = linearRgb(TOK[t]);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(fg), lum(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Every surface a token can sit on. A border sits between two of them, so the
// lightest is the hardest case and all three must clear.
const SURFACES = ['bg', 'bg-canvas', 'bg-panel'];
const LAYERS = ['c-version', 'c-formula', 'c-conn', 'c-hydro', 'c-charge', 'c-proton', 'c-stereo', 'c-isotope'];

describe('layer colours clear AA on the page, the panel, and their own chip', () => {
  it.each(LAYERS)('--%s', (layer) => {
    for (const surface of [...SURFACES, `${layer}-bg`]) {
      expect(ratio(layer, surface), `--${layer} on --${surface}`).toBeGreaterThanOrEqual(TEXT_MIN);
    }
  });
});

describe('the ink ramp clears AA on every surface', () => {
  it.each(['ink', 'ink-soft', 'ink-faint'])('--%s', (ink) => {
    for (const surface of SURFACES) {
      expect(ratio(ink, surface), `--${ink} on --${surface}`).toBeGreaterThanOrEqual(TEXT_MIN);
    }
  });

  // The subdued pills (.reset-trigger / .limitations-trigger / .help-trigger) paint
  // --ink-soft on a --line fill, which is neither a page surface nor a chip.
  it('--ink-soft on the --line pill fill', () => {
    expect(ratio('ink-soft', 'line')).toBeGreaterThanOrEqual(TEXT_MIN);
  });
});

describe('the stereo parities and the hydrogen ramp clear AA on their own chips', () => {
  it.each(['c-stereo-plus', 'c-stereo-minus'])('--%s', (p) => {
    expect(ratio(p, `${p}-bg`)).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(ratio(p, 'bg')).toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it.each([1, 2, 3, 4])('--c-hydro-%i', (n) => {
    expect(ratio(`c-hydro-${n}`, `c-hydro-${n}-bg`)).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(ratio(`c-hydro-${n}`, 'bg')).toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it('--c-hydro-mobile and --c-alert', () => {
    expect(ratio('c-hydro-mobile', 'c-hydro-bg')).toBeGreaterThanOrEqual(TEXT_MIN);
    expect(ratio('c-alert', 'bg-canvas')).toBeGreaterThanOrEqual(TEXT_MIN);
    // The editor-failure notice paints --c-alert on its own chip, not on the page.
    expect(ratio('c-alert', 'c-alert-bg')).toBeGreaterThanOrEqual(TEXT_MIN);
    // And its 1px border must still read as a boundary on the page behind it.
    expect(ratio('c-alert', 'bg')).toBeGreaterThanOrEqual(CONTROL_MIN);
  });
});

describe('the inverted ink clears AA on the --ink-painted tooltip', () => {
  it.each(['ink-inverse', 'ink-inverse-soft', 'ink-inverse-faint'])('--%s', (i) => {
    expect(ratio(i, 'ink')).toBeGreaterThanOrEqual(TEXT_MIN);
  });
});

// SC 1.4.11. --line stays soft on purpose: it draws container edges, which the
// success criterion does not cover. Anything a user operates gets --line-control.
describe('control boundaries clear SC 1.4.11 on every surface', () => {
  it.each(SURFACES)('--line-control on --%s', (surface) => {
    expect(ratio('line-control', surface)).toBeGreaterThanOrEqual(CONTROL_MIN);
  });

  it('--line is deliberately NOT held to 3:1 — it is a container edge', () => {
    expect(ratio('line', 'bg')).toBeLessThan(CONTROL_MIN);
  });
});
