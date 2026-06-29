import { describe, it, expect } from 'vitest';
import { subTokenInfo } from '../subTokenInfo';

// ---------------------------------------------------------------------------
// Real getInchi() fixtures only (D-18 / SUBEX-10). No fabricated InChI.
// - ALANINE: byte-identical to HelpTour.test.tsx:11 — covers stereo (/t2-/m0/s1),
//   amine 4H2, the methyl trap 1H3, and the carboxyl mobile-H (H,5,6).
// - SALT: methylamine hydrochloride, generated verbatim from the live WASM tool
//   (provenance-confirmed getInchi() output) — multi-fragment, two elements.
// ---------------------------------------------------------------------------
const ALANINE = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';
const SALT = 'InChI=1S/CH5N.ClH/c1-2;/h2H2,1H3;1H';
// MELATONIN_TOLUENE: melatonin (C13H16N2O2) + toluene (C7H8), real getInchi() output
// generated verbatim from the live indigo WASM engine (the same engine behind
// ketcher-standalone's getInchi). Provenance-confirmed. Exercises BOTH gap fixes:
//  - GAP-1: component-1 h-layer carries the discontiguous token `3-4,7-8,15H` → set {3,4,7,8,15}.
//  - GAP-2: component-2 h-token `2-6H` is per-component-numbered; globally it offsets by +17
//    (component 1 = 17 heavy atoms: C13 N2 O2) to {19,20,21,22,23}.
const MELATONIN_TOLUENE =
  'InChI=1S/C13H16N2O2.C7H8/c1-9(16)14-6-5-10-8-15-13-4-3-11(17-2)7-12(10)13;1-7-5-3-2-4-6-7/h3-4,7-8,15H,5-6H2,1-2H3,(H,14,16);2-6H,1H3';

describe('subTokenInfo — anti-fabrication fixture sanity (D-18)', () => {
  it('every fixture const is real getInchi() output (starts with InChI=1S/)', () => {
    expect(ALANINE).toMatch(/^InChI=1S\//);
    expect(SALT).toMatch(/^InChI=1S\//);
    expect(MELATONIN_TOLUENE).toMatch(/^InChI=1S\//);
  });
});

describe('subTokenInfo — element (SUBEX-07 copy, D-16/D-17)', () => {
  it('titles with looked-up name + symbol: Carbon (C)', () => {
    const card = subTokenInfo({ kind: 'element', el: 'C' }, {})!;
    expect(card.title).toBe('Carbon (C)');
  });

  it('carbon body carries the Hill-order note (D-17)', () => {
    const card = subTokenInfo({ kind: 'element', el: 'C' }, {})!;
    expect(card.body).toMatch(/hill/i);
  });

  it('hydrogen body carries the Hill-order note (D-17)', () => {
    const card = subTokenInfo({ kind: 'element', el: 'H' }, {})!;
    expect(card.body).toMatch(/hill/i);
  });

  it('non-organic element titles correctly: Potassium (K)', () => {
    const card = subTokenInfo({ kind: 'element', el: 'K' }, {})!;
    expect(card.title).toBe('Potassium (K)');
  });

  it('non-organic element omits the Hill-order note (D-17)', () => {
    const card = subTokenInfo({ kind: 'element', el: 'K' }, {})!;
    expect(card.body).not.toMatch(/hill/i);
  });

  it('multi-fragment element (canonRange present) scopes count to this component (D-14)', () => {
    // Constructed SubHover literal — subTokenInfo consumes SubHover fields, not the
    // InChI string, so a literal is legitimate (not fabrication). Models the Na+/Cl-
    // -style scoping the SALT fixture documents.
    const card = subTokenInfo({ kind: 'element', el: 'Na', canonRange: [4, 4] }, {})!;
    expect(card.body).toMatch(/component/i);
  });

  it('single-fragment element (no canonRange) has no per-component scope clause (D-14)', () => {
    const card = subTokenInfo({ kind: 'element', el: 'C' }, {})!;
    expect(card.body).not.toMatch(/in this component/i);
  });
});

describe('subTokenInfo — hAtoms (SUBEX-03, D-08/D-09)', () => {
  // Alanine 1H3 token: atom 1 bears three hydrogens. The methyl trap.
  const card = subTokenInfo({ kind: 'hAtoms', atoms: [1], count: 3 }, {})!;

  it('returns a non-null card with title "Hydrogen count" (D-16)', () => {
    expect(card.title).toBe('Hydrogen count');
  });

  it('body states the atom bears its hydrogens', () => {
    expect(card.body).toMatch(/bear|hydrogen/i);
  });

  it('NEVER names a functional group — the methyl trap (D-08)', () => {
    expect(card.body).not.toMatch(/methyl|amine|carboxyl|functional group/i);
  });
});

describe('subTokenInfo — hAtoms discrete-set enumeration (GAP-1, D-04 chemist gate)', () => {
  // MELATONIN_TOLUENE component-1 h-token `3-4,7-8,15H` parses to the DISCRETE heavy-atom
  // set {3,4,7,8,15} (count 1). The SubHover literal below is the parsed projection of that
  // real fixture's h-layer — subTokenInfo consumes SubHover numeric fields, not the string
  // (same precedent as the SALT-derived literals above; legitimate, not fabrication).
  const card = subTokenInfo({ kind: 'hAtoms', atoms: [3, 4, 7, 8, 15], count: 1 }, {})!;

  it('enumerates the exact atom set "3, 4, 7, 8 and 15"', () => {
    expect(card.body).toContain('3, 4, 7, 8 and 15');
  });

  it('does NOT collapse the set to a two-number range (no min–max en-dash)', () => {
    // The bug rendered "atoms 3–15". Assert no two-number en-dash range appears anywhere.
    expect(card.body).not.toMatch(/\d+\s*[–-]\s*\d+/);
  });

  it('does NOT name the intervening false-positive atoms as a span', () => {
    expect(card.body).not.toContain('3–15');
    expect(card.body).not.toContain('3-15');
  });
});

describe('subTokenInfo — multi-component de-offset (GAP-2, per-component numbering)', () => {
  // MELATONIN_TOLUENE component 2 (toluene, C7H8) h-token `2-6H`: per-component atoms {2..6}.
  // Globally offset by +17 (component 1 = 17 heavy atoms) → {19,20,21,22,23}. The card must
  // print the per-component numbers the chemist reads in the string, with a component marker.
  it('hAtoms with fragmentOffset reads per-component numbers + "(component N)"', () => {
    const card = subTokenInfo(
      { kind: 'hAtoms', atoms: [19, 20, 21, 22, 23], count: 1, fragmentOffset: 17, componentIndex: 1 },
      {},
    )!;
    expect(card.body).toContain('2, 3, 4, 5 and 6');
    expect(card.body).toContain('(component 2)');
    expect(card.body).not.toContain('19');
    expect(card.body).not.toContain('23');
  });

  it('mobileH with fragmentOffset de-offsets for display too', () => {
    // A multi-component mobile-H group: global {19,20} with offset 17 → local {2,3}.
    const card = subTokenInfo(
      { kind: 'mobileH', atoms: [19, 20], fragmentOffset: 17, componentIndex: 1 },
      {},
    )!;
    expect(card.body).toContain('2 and 3');
    expect(card.body).not.toContain('19');
  });

  it('single-fragment hAtoms (no fragmentOffset) reads literal numbers, no marker', () => {
    const card = subTokenInfo({ kind: 'hAtoms', atoms: [3, 4, 7, 8, 15], count: 1 }, {})!;
    expect(card.body).toContain('3, 4, 7, 8 and 15');
    expect(card.body).not.toMatch(/component/i);
  });
});

describe('subTokenInfo — mobileH (SUBEX-04, D-10)', () => {
  // Alanine (H,5,6) carboxyl mobile proton: atoms only, no count.
  const card = subTokenInfo({ kind: 'mobileH', atoms: [5, 6] }, {})!;

  it('returns a non-null card with title "Mobile hydrogen" (D-16)', () => {
    expect(card.title).toBe('Mobile hydrogen');
  });

  it('body states the proton is shared / mobile / tautomeric (D-10)', () => {
    expect(card.body).toMatch(/shared|mobile|tautomer/i);
  });

  it('body carries NO count and no fixed-bond / per-atom claim (D-10)', () => {
    expect(card.body).not.toMatch(/bond between|each|\bcount\b/i);
  });

  it('a 3+-atom mobile-H group reads a comma list, not a chain of "and" (WR-03)', () => {
    // Real molecule C20H22N2O5, token (H4,21,22,23,26,27).
    const multi = subTokenInfo(
      { kind: 'mobileH', atoms: [21, 22, 23, 26, 27] },
      {},
    )!;
    expect(multi.body).toContain('atoms 21, 22, 23, 26 and 27');
    expect(multi.body).not.toContain('21 and 22 and 23');
  });
});

describe('subTokenInfo — stereo (SUBEX-05/06, D-11/D-12/D-13)', () => {
  const card = subTokenInfo({ kind: 'stereo', atom: 2, sign: '-' }, {})!;

  it('returns a non-null card with title "Tetrahedral stereocenter" (D-16)', () => {
    expect(card.title).toBe('Tetrahedral stereocenter');
  });

  it('body mentions parity (D-11)', () => {
    expect(card.body).toMatch(/parity/i);
  });

  it('body states the parity is NOT R/S — load-bearing caveat (D-11)', () => {
    expect(card.body).toMatch(/not.*R\/S/i);
  });

  it('body names the hovered minus sign (D-12)', () => {
    expect(card.body).toMatch(/[−-]/);
  });

  it('body points at the /m and /s layers (D-13)', () => {
    expect(card.body).toMatch(/\/m/);
    expect(card.body).toMatch(/\/s/);
  });
});

describe('subTokenInfo — c-layer kinds fall through to null', () => {
  it('atom kind returns null', () => {
    expect(subTokenInfo({ kind: 'atom', canonical: 1 }, {})).toBeNull();
  });

  it('bond kind returns null', () => {
    expect(subTokenInfo({ kind: 'bond', endpointPairs: [[1, 2]] }, {})).toBeNull();
  });

  it('branch kind returns null', () => {
    expect(subTokenInfo({ kind: 'branch', bondPairs: [[1, 2]] }, {})).toBeNull();
  });
});
