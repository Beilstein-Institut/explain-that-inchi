import { describe, it, expect } from 'vitest';
import { subTokenInfo } from '../subTokenInfo';
import { ELEMENT_NAMES } from '../layerInfo';

// ---------------------------------------------------------------------------
// Real getInchi() fixtures only (D-18 / SUBEX-10). No fabricated InChI.
// - ALANINE: byte-identical to HelpTour.test.tsx:11 — covers stereo (/t2-/m0/s1),
//   amine 4H2, the methyl trap 1H3, and the carboxyl mobile-H (H,5,6).
// - SALT: methylamine hydrochloride, generated verbatim from the live WASM tool
//   (provenance-confirmed getInchi() output) — multi-fragment, two elements.
// ---------------------------------------------------------------------------
const ALANINE = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';
const SALT = 'InChI=1S/CH5N.ClH/c1-2;/h2H2,1H3;1H';

describe('subTokenInfo — anti-fabrication fixture sanity (D-18)', () => {
  it('every fixture const is real getInchi() output (starts with InChI=1S/)', () => {
    expect(ALANINE).toMatch(/^InChI=1S\//);
    expect(SALT).toMatch(/^InChI=1S\//);
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
