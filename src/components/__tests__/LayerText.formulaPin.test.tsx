// Pinning one component's element token in a multi-component formula must mark only
// that token. Real fixture: propane + the bridged borane, both drawn on one canvas.
//   InChI=1S/C3H8.B2Cl2H4/c1-3-2;3-1-5-2(4)6-1/h3H2,1-2H3;1-2H
// (indigo-ketcher WASM output for '[H]1[B]([H])([Cl])[H][B]1([H])[Cl].CCC')

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LayerText } from '../LayerText';
import type { Layer, SubHover } from '../../lib/parseInchi';
import styles from '../InchiSection.module.css';

const FORMULA = 'C3H8.B2Cl2H4';
const layer = { type: 'formula', text: FORMULA } as unknown as Layer;

// canonRange as FormulaText computes it: C3H8 → [1,3], B2Cl2H4 → [4,7]
const pinnedSpans = (pinnedSub: SubHover) => {
  const { container } = render(
    <LayerText layer={layer} rawText={FORMULA} pinnedSub={pinnedSub} />,
  );
  return Array.from(container.querySelectorAll('span'))
    .filter(s => s.className.includes(styles.pinned))
    .map(s => s.textContent);
};

describe('formula element pin is scoped to its component', () => {
  it("pinning the borane's H4 does not also pin C3H8's H8", () => {
    expect(pinnedSpans({ kind: 'element', el: 'H', canonRange: [4, 7] })).toEqual(['H4']);
  });

  it("pinning C3H8's H8 does not also pin the borane's H4", () => {
    expect(pinnedSpans({ kind: 'element', el: 'H', canonRange: [1, 3] })).toEqual(['H8']);
  });

  it('still pins a single-component element token', () => {
    const single = { type: 'formula', text: 'C2H6O' } as unknown as Layer;
    const { container } = render(
      <LayerText layer={single} rawText="C2H6O" pinnedSub={{ kind: 'element', el: 'H' }} />,
    );
    expect(
      Array.from(container.querySelectorAll('span'))
        .filter(s => s.className.includes(styles.pinned))
        .map(s => s.textContent),
    ).toEqual(['H6']);
  });
});
