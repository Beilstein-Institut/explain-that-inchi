import { describe, it, expect } from 'vitest';
import {
  subscript,
  swatchVar,
  formulaReading,
  readingFor,
  parseStereoParities,
  parityColor,
  LAYER_INFO,
  DEFAULT_INFO,
  ELEMENT_NAMES,
} from '../layerInfo';
import { parseInchi, formulaFragmentCounts, parseStereoAtoms } from '../parseInchi';
import { buildAtomElements } from '../parseAuxMapping';
import type { Layer } from '../parseInchi';

// Repro from PLAN objective: three-component InChI (two amines + benzene).
// formulaFragmentCounts = [13, 12, 6]; fragment canonical ranges A=1-13, C=14-25, B(benzene)=26-31.
const REPRO =
  'InChI=1S/C12H19N.C11H17N.C6H6/c1-9(11(3)13)10(2)12-7-5-4-6-8-12;1-9(10(2)12)8-11-6-4-3-5-7-11;1-2-4-6-5-3-1/h4-11H,13H2,1-3H3;3-7,9-10H,8,12H2,1-2H3;1-6H/t9?,10?,11-;9?,10-;/m11./s1';

describe('subscript', () => {
  it('converts 0 to ₀', () => expect(subscript(0)).toBe('₀'));
  it('converts 6 to ₆', () => expect(subscript(6)).toBe('₆'));
  it('converts 12 to ₁₂', () => expect(subscript(12)).toBe('₁₂'));
});

describe('swatchVar', () => {
  it('maps c to conn', () => expect(swatchVar('c')).toBe('conn'));
  it('maps h to hydro', () => expect(swatchVar('h')).toBe('hydro'));
  it('maps q to charge', () => expect(swatchVar('q')).toBe('charge'));
  it('maps p to proton', () => expect(swatchVar('p')).toBe('proton'));
  it('maps i to isotope', () => expect(swatchVar('i')).toBe('isotope'));
  it('maps b to stereo', () => expect(swatchVar('b')).toBe('stereo'));
  it('maps t to stereo', () => expect(swatchVar('t')).toBe('stereo'));
  it('maps m to stereo', () => expect(swatchVar('m')).toBe('stereo'));
  it('maps s to stereo', () => expect(swatchVar('s')).toBe('stereo'));
  it('maps version to version', () => expect(swatchVar('version')).toBe('version'));
  it('maps formula to formula', () => expect(swatchVar('formula')).toBe('formula'));
});

describe('formulaReading', () => {
  it('converts C6H6 to element count prose', () => {
    const result = formulaReading('C6H6');
    expect(result).toContain('<b>6</b>');
    expect(result).toContain('carbon');
    expect(result).toContain('hydrogen');
  });
  it('uses singular for count of 1', () => {
    const result = formulaReading('CH4');
    expect(result).toContain('<b>1</b>');
    expect(result).toMatch(/carbon(?!s)/);
  });
});

describe('readingFor', () => {
  const versionLayer: Layer = { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] };
  const formulaLayer: Layer = { type: 'formula', prefix: '', text: 'C6H6', atoms: [1,2,3,4,5,6], bonds: [] };
  const cLayer: Layer = { type: 'c', prefix: 'c', text: '1-2-3-4-5-6-1', atoms: [1,2,3,4,5,6], bonds: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1]] };
  const hLayer: Layer = { type: 'h', prefix: 'h', text: '1-6H', atoms: [1,2,3,4,5,6], bonds: [] };

  const benzeneAtomElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C' };

  it('returns standard version reading for 1S', () => {
    const result = readingFor(versionLayer, {});
    expect(result).toContain('<b>1</b>');
    expect(result).toContain('<b>S</b>');
  });

  it('returns formula reading for formula layer', () => {
    const result = readingFor(formulaLayer, {});
    expect(result).toContain('carbon');
    expect(result).toContain('hydrogen');
  });

  it('uses atomElements for c-layer bond labels', () => {
    const result = readingFor(cLayer, benzeneAtomElements);
    // Should use element label like C₁–C₂, not #1–#2
    expect(result).toContain('C');
    expect(result).not.toContain('#1');
  });

  it('uses atomElements for h-layer atom labels', () => {
    const result = readingFor(hLayer, benzeneAtomElements);
    expect(result).toContain('C');
    expect(result).not.toContain('#1');
  });

  it('falls back to #N when atomElements is empty', () => {
    const result = readingFor(cLayer, {});
    expect(result).toContain('#1');
  });
});

describe('readingFor multi-fragment (Bug 1)', () => {
  const layers = parseInchi(REPRO);
  const atomElements = buildAtomElements(layers);
  const formulaLayer = layers.find(l => l.type === 'formula')!;
  const fragCounts = formulaFragmentCounts(formulaLayer.text);

  const find = (type: string) => layers.find(l => l.type === type)!;

  it('formulaFragmentCounts of repro is [13,12,6]', () => {
    expect(fragCounts).toEqual([13, 12, 6]);
  });

  it('formulaReading separates dot fragments with "; "', () => {
    const result = formulaReading('C12H19N.C11H17N.C6H6');
    expect(result).toContain('; ');
    // three fragment groups
    expect(result.split('; ')).toHaveLength(3);
    expect(result).toContain('carbon');
    expect(result).toContain('nitrogen');
  });

  it('formulaReading single fragment is byte-identical to legacy output', () => {
    // Legacy: comma-joined element prose, no "; "
    const single = formulaReading('C6H6');
    expect(single).not.toContain('; ');
    expect(single).toBe('<b>6</b> carbons, <b>6</b> hydrogens');
  });

  it('c-layer reading has no spurious A->C boundary bond (13-14)', () => {
    const cLayer = find('c');
    const result = readingFor(cLayer, atomElements, fragCounts);
    // No bond crossing fragment-1 (ends at 13) into fragment-2 (starts at 14).
    expect(result).not.toContain(`${subscript(13)}</b>–<b>${atomElements[14] ?? '#'}${subscript(14)}`);
    // First-fragment bond labels still resolve to elements (not '#'), not absent.
    expect(result).toContain('C');
    expect(result).not.toContain('#');
  });

  it('c-layer enriched bonds reference offset canonicals >=14 with no 13<->14 bond', () => {
    // The reading truncates at MAX=10 (all from fragment A), so assert offset
    // correctness on the full enriched bond list from parseInchi instead.
    const cLayer = find('c');
    // Cross-boundary bond [13,14] must not exist.
    expect(cLayer.bonds.some(([a, b]) => (a === 13 && b === 14) || (a === 14 && b === 13))).toBe(false);
    // Fragment C/B bonds use offset canonicals >= 14.
    expect(cLayer.bonds.some(([a, b]) => a >= 14 || b >= 14)).toBe(true);
    expect(cLayer.bonds.some(([a, b]) => a >= 26 || b >= 26)).toBe(true); // benzene fragment
  });

  it('t-layer reading references offset fragment-C center 23 (10+13), not a duplicate 10', () => {
    const tLayer = find('t');
    const result = readingFor(tLayer, atomElements, fragCounts);
    // Fragment C center 10 (sign '-') is offset by +13 -> 23. (center 22 from '9?' covered in Bug 2 tests.)
    expect(result).toContain(subscript(23));
  });

  it('single-fragment readingFor is byte-identical with and without empty fragCounts', () => {
    const benzene = parseInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    const ae = buildAtomElements(benzene);
    for (const l of benzene) {
      expect(readingFor(l, ae, [])).toBe(readingFor(l, ae));
      expect(readingFor(l, ae, [6])).toBe(readingFor(l, ae));
    }
  });
});

describe("'?' undefined stereocenters (Bug 2)", () => {
  it("parseStereoAtoms captures '?' atoms", () => {
    expect(parseStereoAtoms('9?,10?,11-')).toEqual([9, 10, 11]);
  });

  it("parseStereoParities returns '?' sign for undefined centers", () => {
    expect(parseStereoParities('9?,10?,11-')).toEqual({ 9: '?', 10: '?', 11: '-' });
  });

  it('parityColor maps signs correctly', () => {
    expect(parityColor('?')).toBe('var(--c-stereo)');
    expect(parityColor('+')).toBe('var(--c-stereo-plus)');
    expect(parityColor('-')).toBe('var(--c-stereo-minus)');
  });

  it("t-layer reading includes '?' centers across fragments (22 from 9?+13)", () => {
    const layers = parseInchi(REPRO);
    const atomElements = buildAtomElements(layers);
    const fragCounts = formulaFragmentCounts(layers.find(l => l.type === 'formula')!.text);
    const tLayer = layers.find(l => l.type === 't')!;
    const result = readingFor(tLayer, atomElements, fragCounts);
    // Fragment A '9?' -> 9, fragment C '9?' -> 22; both must appear.
    expect(result).toContain(subscript(9));
    expect(result).toContain(subscript(22));
  });
});

describe('LAYER_INFO', () => {
  it('has entries for all 11 layer types', () => {
    const expected = ['version','formula','c','h','q','p','b','t','m','s','i'];
    for (const key of expected) {
      expect(LAYER_INFO).toHaveProperty(key);
      expect(LAYER_INFO[key as keyof typeof LAYER_INFO].title).toBeTruthy();
    }
  });
});

describe('DEFAULT_INFO', () => {
  it('has title "Hover any layer"', () => expect(DEFAULT_INFO.title).toBe('Hover any layer'));
  it('has non-empty blurb', () => expect(DEFAULT_INFO.blurb.length).toBeGreaterThan(10));
});

describe('ELEMENT_NAMES — D-19 full periodic table', () => {
  it('has exactly 120 entries (118 IUPAC H–Og + D + T)', () =>
    expect(Object.keys(ELEMENT_NAMES).length).toBe(120));
  it('is case-exact: Co is cobalt, not C+O', () => {
    expect(ELEMENT_NAMES['Co']).toBe('cobalt');
    expect(ELEMENT_NAMES['C']).toBe('carbon');
    expect(ELEMENT_NAMES['O']).toBe('oxygen');
  });
  it('resolves a non-organic symbol (K → potassium)', () =>
    expect(ELEMENT_NAMES['K']).toBe('potassium'));
  it('includes both hydrogen-isotope pseudo-symbols', () => {
    expect(ELEMENT_NAMES['D']).toBeDefined();
    expect(ELEMENT_NAMES['T']).toBeDefined();
  });
});
