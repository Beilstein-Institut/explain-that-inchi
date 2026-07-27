// Bridging (multivalent) hydrogens: InChI numbers them as skeleton atoms, not as
// implicit H counts, because an H bonded to two heavy atoms cannot be expressed as
// an h-layer count. They are numbered AFTER every heavy atom of their fragment —
// even when the Hill formula writes H second (e.g. CH8B2 → C₁ B₂ B₃ H₄ H₅).
//
// Every fixture below is verbatim output of the same InChI engine the app uses
// (indigo-ketcher WASM, `indigo.convert(smiles, 'inchi')`), NOT hand-written.

import { describe, it, expect } from 'vitest';
import { parseInchi, skeletonHydrogenCounts } from '../parseInchi';
import { buildAtomElements } from '../parseAuxMapping';
import { readingFor } from '../layerInfo';

// The reported repro: Cl-B(H)(µ-H)₂B(H)-Cl drawn in Ketcher.
const B2CL2H4 = 'InChI=1S/B2Cl2H4/c3-1-5-2(4)6-1/h1-2H';
const DIBORANE = 'InChI=1S/B2H6/c1-3-2-4-1/h1-2H2';
const METHYLDIBORANE = 'InChI=1S/CH8B2/c1-3-4-2-5-3/h3H,2H2,1H3';
const B4H10 = 'InChI=1S/B4H10/c1-5-3-4(6-1)8-2-7-3/h3-4H,1-2H2';
const H2 = 'InChI=1S/H2/h1H';

const elementsOf = (inchi: string) => buildAtomElements(parseInchi(inchi));

describe('skeletonHydrogenCounts', () => {
  it('counts the two bridging H of the B2Cl2H4 repro', () => {
    expect(skeletonHydrogenCounts('B2Cl2H4', '1-2H')).toEqual([2]);
  });

  it('counts the four bridging H of B4H10', () => {
    expect(skeletonHydrogenCounts('B4H10', '3-4H,1-2H2')).toEqual([4]);
  });

  it('is zero for ordinary molecules (benzene, water)', () => {
    expect(skeletonHydrogenCounts('C6H6', '1-6H')).toEqual([0]);
    expect(skeletonHydrogenCounts('H2O', '1H2')).toEqual([0]);
  });

  it('counts mobile-H groups as accounted for — no phantom skeleton H for acetate', () => {
    expect(skeletonHydrogenCounts('C2H4O2', '1H3,(H,3,4)')).toEqual([0]);
  });

  it('is per fragment', () => {
    expect(skeletonHydrogenCounts('C6H6.B2H6', '1-6H;1-2H2')).toEqual([0, 2]);
    expect(skeletonHydrogenCounts('2B2H6', '2*1-2H2')).toEqual([2, 2]);
    // Al2Me6-style: multiplied fragments plus trailing empty h segments.
    expect(skeletonHydrogenCounts('4CH3.2CH2.2Al', '4*1H3;2*1H2;;')).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('treats lone H2 as a single skeleton H atom', () => {
    expect(skeletonHydrogenCounts('H2', '1H')).toEqual([1]);
  });
});

describe('buildAtomElements with bridging hydrogens', () => {
  it('resolves the B2Cl2H4 repro bridging H as H₅ and H₆', () => {
    expect(elementsOf(B2CL2H4)).toEqual({ 1: 'B', 2: 'B', 3: 'Cl', 4: 'Cl', 5: 'H', 6: 'H' });
  });

  it('resolves diborane bridging H as atoms 3 and 4', () => {
    expect(elementsOf(DIBORANE)).toEqual({ 1: 'B', 2: 'B', 3: 'H', 4: 'H' });
  });

  it('numbers bridging H last even when the formula writes H second (CH8B2)', () => {
    expect(elementsOf(METHYLDIBORANE)).toEqual({ 1: 'C', 2: 'B', 3: 'B', 4: 'H', 5: 'H' });
  });

  it('resolves all four B4H10 bridging H', () => {
    expect(elementsOf(B4H10)).toEqual({
      1: 'B', 2: 'B', 3: 'B', 4: 'B', 5: 'H', 6: 'H', 7: 'H', 8: 'H',
    });
  });

  it('resolves lone H2', () => {
    expect(elementsOf(H2)).toEqual({ 1: 'H' });
  });

  it('leaves ordinary molecules untouched', () => {
    expect(elementsOf('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H')).toEqual({
      1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C',
    });
    expect(elementsOf('InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)/p-1')).toEqual({
      1: 'C', 2: 'C', 3: 'O', 4: 'O',
    });
    expect(
      elementsOf('InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H'),
    ).toEqual({
      1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C', 7: 'C',
      8: 'C', 9: 'C', 10: 'C', 11: 'C', 12: 'C', 13: 'C',
    });
  });
});

describe('connection-layer reading with bridging hydrogens', () => {
  it('labels every bond of the repro with an element, never "#n"', () => {
    const layers = parseInchi(B2CL2H4);
    const cLayer = layers.find(l => l.type === 'c')!;
    const reading = readingFor(cLayer, buildAtomElements(layers), [6]);
    expect(reading).not.toContain('#');
    expect(reading).toContain('H₅');
    expect(reading).toContain('H₆');
    expect(reading).toContain('Cl₃');
  });
});

describe('formula layer atom set includes bridging hydrogens', () => {
  it('covers all six skeleton atoms of the repro', () => {
    const formula = parseInchi(B2CL2H4).find(l => l.type === 'formula')!;
    expect(formula.atoms).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('still covers exactly the heavy atoms of benzene', () => {
    const formula = parseInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H').find(l => l.type === 'formula')!;
    expect(formula.atoms).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
