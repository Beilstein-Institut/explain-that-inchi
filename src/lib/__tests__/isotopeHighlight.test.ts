// Isotope (/i) layer canvas highlight.
//
// The i layer was classified "non-spatial" in Phase 4 alongside b, q and p
// (see .planning/milestones/v1.0-phases/04-hover-to-highlight-integration/
// 04-02-SUMMARY.md:77). The other three were each implemented later; i was the
// leftover, and nothing caught it because no preset produced an i layer until
// chloroform-d was added. Hovering /i1D highlighted nothing at all.
//
// The i layer is NOT non-spatial: it indexes heavy atoms by canonical number,
// exactly as h and t do.
//
// Fixtures are verbatim indigo-ketcher WASM output for the SMILES in
// src/data/molecules.ts — never hand-written.

import { describe, it, expect, vi } from 'vitest';
import { buildHighlightSpecs } from '../highlightUtils';
import type { StructLike } from '../highlightUtils';
import { parseInchi, parseIsotopeEntries } from '../parseInchi';
import type { AuxMap } from '../parseInchi';

const resolveVarFn = (name: string): string => name;

// Chloroform-d, from SMILES '[2H]C(Cl)(Cl)Cl'.
// c2-1(3)4 → canonical 1 = C, 2/3/4 = Cl. /i1D = atom 1's hydrogen is a D.
const CHLOROFORM_D = 'InChI=1S/CHCl3/c2-1(3)4/h1H/i1D';
// Ethanol-d5, from '[2H]C([2H])([2H])C([2H])([2H])O' — two labelled atoms, counts > 1.
const ETHANOL_D5 = 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3/i1D3,2D2';
// Caffeine with one 13C: the mass-offset form, where the numbered atom IS the isotope.
const CAFFEINE_13C =
  'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3/i1+1';

const iLayer = (inchi: string) => parseInchi(inchi).find(l => l.type === 'i')!;

// Chloroform-d as Ketcher holds it: pool 0 = C, 1..3 = Cl, 4 = the explicit D.
const CHCL3_AUX: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3 };
const CHCL3_ELEMENTS: Record<number, string> = { 1: 'C', 2: 'Cl', 3: 'Cl', 4: 'Cl' };
const CHCL3_H_POOL = [4];

function makeChloroformStruct(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(null),
    bonds: {
      forEach: vi.fn(cb => {
        cb({ begin: 0, end: 1 }, 0); // C–Cl
        cb({ begin: 0, end: 2 }, 1); // C–Cl
        cb({ begin: 0, end: 3 }, 2); // C–Cl
        cb({ begin: 0, end: 4 }, 3); // C–D  (explicit)
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}

const specsFor = (inchi: string, aux: AuxMap, els: Record<number, string>, hPool: number[]) =>
  buildHighlightSpecs(
    iLayer(inchi),
    null,
    aux,
    els,
    hPool,
    parseInchi(inchi),
    makeChloroformStruct(),
    resolveVarFn,
  );

describe('parseIsotopeEntries', () => {
  it('reads the single hydrogen-isotope entry of chloroform-d', () => {
    expect(parseIsotopeEntries('1D')).toEqual([{ atom: 1, hIsotope: true }]);
  });

  it('reads both counted entries of ethanol-d5', () => {
    expect(parseIsotopeEntries('1D3,2D2')).toEqual([
      { atom: 1, hIsotope: true },
      { atom: 2, hIsotope: true },
    ]);
  });

  it('marks a mass-offset entry as not a hydrogen isotope', () => {
    // 1+1 is 13C on atom 1 — the atom itself is the isotope, no H involved.
    expect(parseIsotopeEntries('1+1')).toEqual([{ atom: 1, hIsotope: false }]);
  });

  it('reads tritium, and a mass offset mixed with a D entry', () => {
    expect(parseIsotopeEntries('2T,5-1')).toEqual([
      { atom: 2, hIsotope: true },
      { atom: 5, hIsotope: false },
    ]);
  });

  it('returns nothing for the empty text of an isotopic-mobile-H layer', () => {
    // Heavy water is 'InChI=1S/H2O/h1H2/i/hD2' — the i layer carries no numbers.
    expect(parseIsotopeEntries('')).toEqual([]);
  });
});

describe('i layer atoms', () => {
  it('gives the i layer the canonical atom it names', () => {
    expect(iLayer(CHLOROFORM_D).atoms).toEqual([1]);
  });

  it('gives both labelled carbons of ethanol-d5', () => {
    expect(iLayer(ETHANOL_D5).atoms).toEqual([1, 2]);
  });
});

describe('i layer highlight', () => {
  it('highlights the carbon that bears the deuterium', () => {
    const specs = specsFor(CHLOROFORM_D, CHCL3_AUX, CHCL3_ELEMENTS, CHCL3_H_POOL);
    expect(specs).not.toEqual([]);
    const highlighted = specs.flatMap(s => s.atoms);
    expect(highlighted).toContain(0); // pool 0 = canonical 1 = the carbon
  });

  it('also highlights the explicit D atom bonded to it', () => {
    // The D is what is actually isotopic, and Ketcher holds it as a real atom
    // here because the preset SMILES writes it as [2H].
    const specs = specsFor(CHLOROFORM_D, CHCL3_AUX, CHCL3_ELEMENTS, CHCL3_H_POOL);
    expect(specs.flatMap(s => s.atoms)).toContain(4);
  });

  it('uses the isotope color', () => {
    const specs = specsFor(CHLOROFORM_D, CHCL3_AUX, CHCL3_ELEMENTS, CHCL3_H_POOL);
    expect(specs.map(s => s.color)).toContain('--c-isotope');
  });

  it('highlights no bonds — the layer names atoms, not connections', () => {
    const specs = specsFor(CHLOROFORM_D, CHCL3_AUX, CHCL3_ELEMENTS, CHCL3_H_POOL);
    expect(specs.flatMap(s => s.bonds)).toEqual([]);
  });

  it('leaves the chlorines alone', () => {
    const specs = specsFor(CHLOROFORM_D, CHCL3_AUX, CHCL3_ELEMENTS, CHCL3_H_POOL);
    const highlighted = specs.flatMap(s => s.atoms);
    expect(highlighted).not.toContain(1);
    expect(highlighted).not.toContain(2);
    expect(highlighted).not.toContain(3);
  });

  it('highlights only the atom itself for a mass-offset entry', () => {
    // 13C-caffeine: no D anywhere, so no explicit H may be pulled in even
    // though the struct passed here has one.
    const specs = specsFor(CAFFEINE_13C, CHCL3_AUX, CHCL3_ELEMENTS, CHCL3_H_POOL);
    expect(specs.flatMap(s => s.atoms)).toEqual([0]);
  });

  it('returns no spec when the i layer names no atom', () => {
    // Isotopic mobile H ('/i/hD2'): nothing to point at, so stay silent rather
    // than highlighting the whole molecule.
    const emptyI = { type: 'i' as const, prefix: 'i', text: '', atoms: [], bonds: [] };
    const specs = buildHighlightSpecs(
      emptyI, null, CHCL3_AUX, CHCL3_ELEMENTS, CHCL3_H_POOL,
      [emptyI], makeChloroformStruct(), resolveVarFn,
    );
    expect(specs).toEqual([]);
  });
});
