// Diagnostic + regression for the formula-layer H token on a two-component structure:
//   InChI=1S/C3H8.B2Cl2H4/c1-3-2;3-1-5-2(4)6-1/h3H2,1-2H3;1-2H
//   AuxInfo N:9,11,10;2,6,4,8,1,5
// (verbatim indigo-ketcher WASM output for '[H]1[B]([H])([Cl])[H][B]1([H])[Cl].CCC',
// laid out so /rC: carries real coordinates — the propane's H are implicit, the
// borane's four H are all drawn explicitly.)
//
// Runs exactly the sequence useKetcherHighlights runs, against a mock Ketcher SVG,
// and asserts each component's H token produces visible canvas feedback: a brown
// halo on drawn H, count badges on atoms whose H are implicit.

import { describe, it, expect } from 'vitest';
import { parseInchiWithAux } from '../../lib/parseAuxMapping';
import { buildHighlightSpecs } from '../../lib/highlightUtils';
import type { StructLike } from '../../lib/highlightUtils';
import { renderFormulaHBadges, cleanHBadges } from '../useKetcherHighlights';
import type { SubHover } from '../../lib/parseInchi';

const RAW =
  'InChI=1S/C3H8.B2Cl2H4/c1-3-2;3-1-5-2(4)6-1/h3H2,1-2H3;1-2H\n' +
  'AuxInfo=1/0/N:9,11,10;2,6,4,8,1,5/E:(1,2);(1,2)(3,4)(5,6)/CRV:;1.4,2.4,5.2,6.2' +
  '/rA:11H2B4HClH2B4HClCCC/rB:s1;s2;s2;s2;s1s5;s6;s6;;s9;s10;' +
  '/rC:1.366,1.7321,0;.866,.866,0;0,1.366,0;.366,0,0;1.7321,.366,0;2.2321,1.2321,0;' +
  '3.0981,.7321,0;2.7321,2.0981,0;5.0981,.5,0;5.9641,0,0;6.8301,.5,0;';

// Molfile order (== pool id, freshly loaded): H B H Cl H B H Cl C C C
const LABELS = ['H', 'B', 'H', 'Cl', 'H', 'B', 'H', 'Cl', 'C', 'C', 'C'];
const BONDS: [number, number][] = [
  [0, 1], [1, 2], [1, 3], [1, 4], [4, 5], [5, 0], [5, 6], [5, 7], [8, 9], [9, 10],
];
const H_POOL_IDS = LABELS.map((l, i) => (l === 'H' ? i : -1)).filter(i => i >= 0);

type EachFn = (item: never, id: number) => void;
const struct: StructLike = {
  atoms: { forEach: (fn: EachFn) => LABELS.forEach((label, id) => fn({ label } as never, id)) },
  bonds: {
    forEach: (fn: EachFn) => BONDS.forEach(([begin, end], id) => fn({ begin, end } as never, id)),
  },
} as unknown as StructLike;

function makeSvg(): Element {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  LABELS.forEach((label, id) => {
    const g = document.createElementNS(ns, 'g');
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('data-atom-id', String(id));
    text.setAttribute('data-atomLabel', label);
    g.appendChild(text);
    (g as unknown as { getBBox(): DOMRect }).getBBox = () =>
      ({ x: id * 20, y: 0, width: 16, height: 16 }) as DOMRect;
    svg.appendChild(g);
  });
  return svg;
}

const { layers, auxMap, atomElements } = parseInchiWithAux(RAW);
const formula = layers.find(l => l.type === 'formula')!;
const resolveVar = (v: string) => v;

/** The tail of the useKetcherHighlights effect for a formula H sub-hover. */
function applyFormulaHHover(sub: SubHover) {
  const svg = makeSvg();
  const specs = buildHighlightSpecs(
    formula, sub, auxMap, atomElements, H_POOL_IDS, layers, struct, resolveVar,
  );
  cleanHBadges(svg);
  renderFormulaHBadges(svg, sub.canonRange, layers, auxMap, resolveVar, H_POOL_IDS, struct);
  return {
    specs,
    badges: Array.from(svg.querySelectorAll('[data-h-badge]')).map(b => b.textContent),
  };
}

describe('formula H token, two components', () => {
  it('maps all nine skeleton atoms including the two bridging H', () => {
    expect(atomElements).toEqual({
      1: 'C', 2: 'C', 3: 'C', 4: 'B', 5: 'B', 6: 'Cl', 7: 'Cl', 8: 'H', 9: 'H',
    });
  });

  // canonRange is [4,7] — what FormulaText computes from heavy-atom fragment counts.
  // The H highlight is pool-id based (bonded-neighbour canonical), so it survives the
  // range stopping short of the bridging H at 8-9.
  it("the borane's H4 fills its four drawn H with the hydrogen brown", () => {
    const { specs } = applyFormulaHHover({ kind: 'element', el: 'H', canonRange: [4, 7] });
    expect(specs[0]?.atoms.slice().sort((a, b) => a - b)).toEqual([0, 2, 4, 6]);
    // Never Jmol white — invisible as a halo on the white canvas.
    expect(specs[0]?.color).toBe('--c-hydro-1');
  });

  it("propane's H8 badges its three carbons and touches no borane H", () => {
    const { specs, badges } = applyFormulaHHover({ kind: 'element', el: 'H', canonRange: [1, 3] });
    expect(specs).toEqual([]);
    expect(badges.sort()).toEqual(['H2', 'H3', 'H3']);
  });

  it("propane's H8 does not highlight the borane's H (no cross-component leak)", () => {
    const { specs } = applyFormulaHHover({ kind: 'element', el: 'H', canonRange: [1, 3] });
    expect(specs.flatMap(s => s.atoms)).not.toContain(0);
  });

  // Whole-formula hover paints every atom by element; the bridging H must come out
  // brown like every other hydrogen, not Jmol white.
  it('formula-layer hover never emits a white spec', () => {
    const specs = buildHighlightSpecs(
      formula, null, auxMap, atomElements, H_POOL_IDS, layers, struct, resolveVar,
    );
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.map(s => s.color)).not.toContain('#ffffff');
    const brown = specs.find(s => s.color === '--c-hydro-1');
    expect(brown!.atoms).toContain(0); // a bridging H, canonical 8
  });
});
