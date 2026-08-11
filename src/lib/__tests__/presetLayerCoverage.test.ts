// The picker's layer-coverage presets, parsed end-to-end.
//
// Until these seven molecules were added, no preset produced a q, p, b or i
// layer — so the parser had never seen one from a route a user could actually
// reach, and four explanation cards were unreachable in the running app.
//
// Every fixture below is verbatim output of the same InChI engine the app uses
// (indigo-ketcher WASM, `indigo.convert(smiles, 'inchi')`), produced from the
// exact SMILES stored in src/data/molecules.ts. NOT hand-written: a fabricated
// InChI here would pin the parser against a string the app never receives.

import { describe, it, expect } from 'vitest';
import { parseInchi, expandLayerText } from '../parseInchi';
import { buildAtomElements } from '../parseAuxMapping';
import type { LayerType } from '../parseInchi';

const FUMARIC        = 'InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+';
const MALEIC         = 'InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1-';
const CHOLINE        = 'InChI=1S/C5H14NO/c1-6(2,3)4-5-7/h7H,4-5H2,1-3H3/q+1';
const ACETATE        = 'InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)/p-1';
const CHLOROFORM_D   = 'InChI=1S/CHCl3/c2-1(3)4/h1H/i1D';
const SODIUM_ACETATE = 'InChI=1S/C2H4O2.Na/c1-2(3)4;/h1H3,(H,3,4);/q;+1/p-1';
const PGE2 =
  'InChI=1S/C20H32O5/c1-2-3-6-9-15(21)12-13-17-16(18(22)14-19(17)23)10-7-4-5-8-11-20(24)25/' +
  'h4,7,12-13,15-17,19,21,23H,2-3,5-6,8-11,14H2,1H3,(H,24,25)/b7-4-,13-12+/t15-,16-,17-,19+/m1/s1';

const ALL_FIXTURES = [
  FUMARIC, MALEIC, CHOLINE, ACETATE, CHLOROFORM_D, SODIUM_ACETATE, PGE2,
];

const typesOf = (inchi: string): LayerType[] => parseInchi(inchi).map(l => l.type);
const layer = (inchi: string, type: LayerType) =>
  parseInchi(inchi).find(l => l.type === type);

describe('preset layer coverage', () => {
  // The point of the seven. If this fails, some legend row has gone dark again.
  it('reaches all 11 layer types across the set', () => {
    const seen = new Set(ALL_FIXTURES.flatMap(typesOf));
    expect([...seen].sort()).toEqual(
      ['b', 'c', 'formula', 'h', 'i', 'm', 'p', 'q', 's', 't', 'version'],
    );
  });

  it('parses every fixture without dropping the trailing layer', () => {
    // A layer parsed as empty text would render as a bare prefix with nothing
    // to hover — the failure mode that hides a whole card.
    for (const inchi of ALL_FIXTURES) {
      for (const l of parseInchi(inchi)) expect(l.text).not.toBe('');
    }
  });
});

describe('double-bond stereo (b)', () => {
  it('distinguishes fumaric (E) from maleic (Z) by the sign alone', () => {
    expect(layer(FUMARIC, 'b')!.text).toBe('2-1+');
    expect(layer(MALEIC, 'b')!.text).toBe('2-1-');
    // Everything before the b layer is identical — that is the teaching point,
    // and it is also what makes a copy-paste error between the two invisible.
    const upTo = (i: string) => i.slice(0, i.lastIndexOf('/b'));
    expect(upTo(FUMARIC)).toBe(upTo(MALEIC));
  });

  it('keeps both double bonds of PGE2, with their opposite signs', () => {
    expect(layer(PGE2, 'b')!.text).toBe('7-4-,13-12+');
  });
});

describe('charge (q) vs proton balance (p)', () => {
  it('reads choline as a charge, with no proton layer', () => {
    expect(layer(CHOLINE, 'q')!.text).toBe('+1');
    expect(layer(CHOLINE, 'p')).toBeUndefined();
  });

  it('reads acetate as a proton balance, with no charge layer', () => {
    expect(layer(ACETATE, 'p')!.text).toBe('-1');
    expect(layer(ACETATE, 'q')).toBeUndefined();
  });

  it('carries both on sodium acetate, per fragment for q', () => {
    // ';' separates the two components: the acetate contributes nothing, the
    // sodium +1. p is a whole-structure count and is NOT fragment-separated.
    expect(layer(SODIUM_ACETATE, 'q')!.text).toBe(';+1');
    expect(expandLayerText(layer(SODIUM_ACETATE, 'q')!.text)).toEqual(['', '+1']);
    expect(layer(SODIUM_ACETATE, 'p')!.text).toBe('-1');
  });
});

describe('isotope (i)', () => {
  it('reads the single labelled atom of chloroform-d', () => {
    expect(layer(CHLOROFORM_D, 'i')!.text).toBe('1D');
  });
});

describe('multi-component parsing (sodium acetate)', () => {
  it('splits the formula into its two components', () => {
    expect(layer(SODIUM_ACETATE, 'formula')!.text).toBe('C2H4O2.Na');
  });

  it('numbers the sodium after the acetate carbons', () => {
    // The only preset where a canonical index crosses a fragment boundary.
    const elements = buildAtomElements(parseInchi(SODIUM_ACETATE));
    expect(elements).toMatchObject({ 1: 'C', 2: 'C', 3: 'O', 4: 'O', 5: 'Na' });
  });

  it('keeps the empty leading fragment of the c layer', () => {
    // 'c1-2(3)4;' — the trailing ';' is the sodium's empty connection table.
    // Dropping it would shift every downstream fragment index by one.
    expect(expandLayerText(layer(SODIUM_ACETATE, 'c')!.text)).toEqual(['1-2(3)4', '']);
  });
});
