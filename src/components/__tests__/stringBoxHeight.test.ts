// The InChI and InChIKey display boxes must be exactly as tall empty as they are
// filled. When they are not, drawing the first atom shifts everything below them.
//
// The boxes reserve one line of --fs-string via `min-height`, but the placeholder
// inside renders at --fs-body with its own vertical padding. Nothing in CSS
// couples those two numbers, so a type-scale edit can silently reintroduce the
// shift. This test does the coupling: it reads the declared values and asserts
// the empty state cannot outgrow the reserved line.
import { describe, it, expect } from 'vitest';
import { readCss, rule as ruleOf, decl } from '../../testing/cssProbe';

const ROOT_FONT_PX = 16;
const LINE_HEIGHT = 1.6; // declared on both display boxes

/** --fs-* tokens from styles.css, in px. */
function typeScale(): Record<string, number> {
  const css = readCss('styles.css');
  const scale: Record<string, number> = {};
  for (const [, name, rem] of css.matchAll(/--(fs-[\w-]+):\s*([\d.]+)rem/g)) {
    scale[name] = parseFloat(rem) * ROOT_FONT_PX;
  }
  return scale;
}

/** Sum of the two vertical values of a `padding` shorthand, in px. */
function verticalPadding(body: string): number {
  const p = decl(body, 'padding');
  if (!p) return 0;
  const top = p.trim().split(/\s+/)[0];
  return 2 * (parseFloat(top) || 0);
}

/** `calc(<factor> * var(--fs-token))` → px. */
function evalLineHeight(value: string, scale: Record<string, number>): number {
  const m = value.match(/calc\(\s*([\d.]+)\s*\*\s*var\(--(fs-[\w-]+)\)\s*\)/);
  if (!m) throw new Error(`unsupported line-height: ${value}`);
  return parseFloat(m[1]) * scale[m[2]];
}

const BOXES = [
  { file: 'components/InchiSection.module.css', box: '.inchiDisplay', hints: ['.emptyHint', '.errorHint'] },
  { file: 'components/InchiKeySection.module.css', box: '.inchiKeyDisplay', hints: ['.emptyHint'] },
];

describe.each(BOXES)('$box does not change height when the first atom is drawn', ({ file, box, hints }) => {
  const css = readCss(file);
  const scale = typeScale();
  const boxBody = ruleOf(css, box);

  // The filled state is one line of the box's own font-size — no child grows the
  // line box, so this is the whole content height.
  const filledContent = LINE_HEIGHT * scale['fs-string'];

  it.each(hints)('%s fits inside the reserved line', (hint) => {
    const hintBody = ruleOf(css, hint);
    const hintFont = decl(hintBody, 'font-size')!.replace(/var\(--|\)/g, '');
    // A hint may override line-height to fill the reserved line; otherwise it
    // inherits the box's unitless 1.6 and multiplies its own font-size.
    const ownLine = decl(hintBody, 'line-height');
    const lineBox = ownLine
      ? evalLineHeight(ownLine, scale)
      : LINE_HEIGHT * scale[hintFont];
    const emptyContent = lineBox + verticalPadding(hintBody);

    expect(emptyContent).toBeLessThanOrEqual(filledContent);
  });

  // box-sizing is border-box globally (styles.css), so min-height must also cover
  // the box's own padding and border or it floors below the filled height and
  // never binds.
  it('reserves the filled height including padding and border', () => {
    const minHeight = decl(boxBody, 'min-height')!;
    const added = parseFloat(minHeight.match(/\+\s*([\d.]+)px/)![1]);
    const border = 2 * parseFloat(decl(boxBody, 'border')!);

    expect(minHeight).toContain(`${LINE_HEIGHT}em`);
    expect(added).toBe(verticalPadding(boxBody) + border);
  });
});
