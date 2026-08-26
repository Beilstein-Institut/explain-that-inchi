// Touch targets must stay keyed to the INPUT DEVICE, not the viewport width.
//
// They were keyed to `max-width: 900px`, which got both ends wrong: a 1024px iPad and
// a 1280px touch laptop are wide AND coarse, so they got 32px mouse-sized pills, while
// a 700px desktop window on a mouse got 44px finger-sized ones. Width decides layout;
// the pointer decides target size. This fails if anything moves back.
import { describe, it, expect } from 'vitest';
import { readCss } from '../testing/cssProbe';

const TARGET_PX = 44; // Apple HIG; WCAG 2.5.8 asks 24

const FILES = [
  'styles.css',
  'components/Legend.module.css',
  'components/InchiSection.module.css',
  'components/InchiKeySection.module.css',
  'components/HelpTour.module.css',
  'components/FeedbackDialog.module.css',
];

/** Body of every @media block whose condition matches `test`. Brace-counted, so
 *  nested rules inside the query are included rather than cut at the first '}'. */
function mediaBlocks(css: string, test: (cond: string) => boolean): string[] {
  const out: string[] = [];
  const re = /@media([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    if (!test(m[1])) continue;
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    out.push(css.slice(re.lastIndex, i - 1));
  }
  return out;
}

const isCoarse = (c: string) => c.includes('pointer: coarse');
const isWidthOnly = (c: string) => /max-width/.test(c) && !isCoarse(c);

describe('touch target sizing is keyed to the pointer, not the viewport', () => {
  it.each(FILES)('%s declares no %ipx target inside a width-only query', (file) => {
    for (const body of mediaBlocks(readCss(file), isWidthOnly)) {
      expect(body, `${file}: a ${TARGET_PX}px target sits in a width query`)
        .not.toMatch(new RegExp(`(min-)?(height|width):\\s*${TARGET_PX}px`));
    }
  });

  it.each(FILES)('%s sizes its targets under (pointer: coarse)', (file) => {
    const coarse = mediaBlocks(readCss(file), isCoarse).join('\n');
    expect(coarse, `${file} has no (pointer: coarse) block`).not.toBe('');
    // Either an explicit 44px, or padding that lifts a known-small icon button to it.
    expect(coarse).toMatch(/(min-)?(height|width):\s*44px|padding:\s*14px/);
  });
});

describe('the pinned-release hint speaks the language of the input', () => {
  const css = readCss('components/InchiSection.module.css');

  it('hides the touch phrasing by default and swaps it where hover is absent', () => {
    expect(css).toMatch(/\.hintTouch\s*\{\s*display:\s*none/);
    const noHover = mediaBlocks(css, (c) => c.includes('hover: none')).join('\n');
    expect(noHover).not.toBe('');
    expect(noHover).toMatch(/\.hintPointer\s*\{\s*display:\s*none/);
    expect(noHover).toMatch(/\.hintTouch\s*\{\s*display:\s*inline/);
  });

  // On touch, pinning is the only route to an explanation, so naming a key the device
  // does not have is a dead end rather than a cosmetic slip.
  it('never tells a touch user to press Esc', () => {
    const tsx = readCss('components/InchiSection.tsx');
    const touchPhrase = tsx.match(/hintTouch[^>]*>([^<]*)</)?.[1] ?? '';
    expect(touchPhrase).toMatch(/tap/i);
    expect(touchPhrase).not.toMatch(/Esc|click/i);
  });
});
