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
// CAFFEINE_TOLUENE_2BENZENE: caffeine (C8H10N4O2) + toluene (C7H8) + 2× benzene (2C6H6),
// real getInchi() output observed verbatim from the live app (Phase-19 UAT screenshot).
// Exercises the N* duplicated-fragment notation in BOTH layers:
//  - c-layer segment `2*1-2-4-6-5-3-1` (components 3 & 4, global offset +21 = caffeine 14 + toluene 7).
//  - h-layer segment `2*1-6H` (atoms 1-6 in EACH of the two identical benzene copies).
// The N* card must show ONE representative fragment in per-component LOCAL numbering, while the
// canvas highlight still lights the atom in every copy (CLYR-05) — proven separately in highlightUtils.
const CAFFEINE_TOLUENE_2BENZENE =
  'InChI=1S/C8H10N4O2.C7H8.2C6H6/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2;1-7-5-3-2-4-6-5-3-1;2*1-2-4-6-5-3-1/h4H,1-3H3;2-6H,1H3;2*1-6H';

describe('subTokenInfo — anti-fabrication fixture sanity (D-18)', () => {
  it('every fixture const is real getInchi() output (starts with InChI=1S/)', () => {
    expect(ALANINE).toMatch(/^InChI=1S\//);
    expect(SALT).toMatch(/^InChI=1S\//);
    expect(MELATONIN_TOLUENE).toMatch(/^InChI=1S\//);
    expect(CAFFEINE_TOLUENE_2BENZENE).toMatch(/^InChI=1S\//);
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

  it('returns a non-null card with title "Hydrogen count: N" carrying the count (D-16)', () => {
    expect(card.title).toBe('Hydrogen count: 3');
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

// ---------------------------------------------------------------------------
// Phase 19 (CONN-01..04): the three c-layer cases now return cards (no longer null).
// Every SubHover literal below is the PARSED PROJECTION of a real getInchi() fixture
// (ALANINE `c1-2(4)3(5)6`, MELATONIN_TOLUENE component-2 `;1-7-5-3-2-4-6-7`) — the
// same legitimate precedent the hAtoms `[3,4,7,8,15]` literal above uses. subTokenInfo
// consumes SubHover numeric fields, never the string (verbatim-passthrough).
// ---------------------------------------------------------------------------
describe('subTokenInfo — c-layer kinds return cards (CONN-04: the reversed null contract)', () => {
  it('atom kind returns a non-null card', () => {
    expect(subTokenInfo({ kind: 'atom', canonical: 1, incidentPairs: [[1, 2]] }, {})).not.toBeNull();
  });

  it('bond kind returns a non-null card', () => {
    expect(subTokenInfo({ kind: 'bond', endpointPairs: [[1, 2]] }, {})).not.toBeNull();
  });

  it('branch kind returns a non-null card', () => {
    expect(subTokenInfo({ kind: 'branch', bondPairs: [[2, 4]], branchPoint: 2 }, {})).not.toBeNull();
  });
});

describe('subTokenInfo — atom card (CONN-01)', () => {
  // ALANINE `c1-2(4)3(5)6`: atom 2 is bonded to 1, 4 and 3 → deduped sorted neighbour set {1,3,4}.
  const card = subTokenInfo({ kind: 'atom', canonical: 2, incidentPairs: [[1, 2], [2, 3], [2, 4]] }, {})!;

  it('titles "Connection layer - Atom"', () => {
    expect(card.title).toBe('Connection layer - Atom');
  });

  it('names the hovered atom', () => {
    expect(card.body).toContain('Atom 2');
  });

  it('enumerates the full, deduped, sorted neighbour set "1, 3 and 4"', () => {
    expect(card.body).toContain('1, 3 and 4');
  });
});

describe('subTokenInfo — atom card empty-list guard (CONN-01 / WR-04)', () => {
  // A single-atom / isolated number with no incident bonds.
  const card = subTokenInfo({ kind: 'atom', canonical: 4, incidentPairs: [] }, {})!;

  it('says "no bonds recorded"', () => {
    expect(card.body).toContain('no bonds recorded');
  });

  it('never renders "atoms  and" or "undefined"', () => {
    expect(card.body).not.toContain('atoms  and');
    expect(card.body).not.toContain('undefined');
  });
});

describe('subTokenInfo — bond card (CONN-02)', () => {
  // ALANINE `1-2`: the hyphen joins canonical atoms 1 and 2.
  const card = subTokenInfo({ kind: 'bond', endpointPairs: [[1, 2]] }, {})!;

  it('titles "Connection layer - Bond"', () => {
    expect(card.title).toBe('Connection layer - Bond');
  });

  it('names the two joined atoms "1 and 2"', () => {
    expect(card.body).toContain('1 and 2');
  });
});

describe('subTokenInfo — branch card (CONN-02)', () => {
  // ALANINE `2(4)`: branch off atom 2 encoding bond pair 2–4 (en-dash).
  const card = subTokenInfo({ kind: 'branch', bondPairs: [[2, 4]], branchPoint: 2 }, {})!;

  it('titles "Connection layer - Branch"', () => {
    expect(card.title).toBe('Connection layer - Branch');
  });

  it('names the branch-point "atom 2"', () => {
    expect(card.body).toContain('atom 2');
  });

  it('lists the bond pair "2–4" with an en-dash', () => {
    expect(card.body).toContain('2–4');
  });
});

describe('subTokenInfo — c-layer multi-component de-offset (CONN-03)', () => {
  // MELATONIN_TOLUENE component-2 (toluene) c-segment `1-7-5-3-2-4-6-7`, global offset +17.
  // The printed adjacent pair `1-7` → global [18, 24]; de-offset 18-17=1, 24-17=7.
  const card = subTokenInfo(
    { kind: 'bond', endpointPairs: [[18, 24]], fragmentOffset: 17, componentIndex: 1 },
    {},
  )!;

  it('de-offsets to the printed per-component numbers "1 and 7"', () => {
    expect(card.body).toContain('1 and 7');
  });

  it('carries "(component 2)"', () => {
    expect(card.body).toContain('(component 2)');
  });

  it('never shows the global numbers 18 or 24', () => {
    expect(card.body).not.toContain('18');
    expect(card.body).not.toContain('24');
  });
});

describe('subTokenInfo — c-layer copy safety (CONN-04)', () => {
  const atomCard = subTokenInfo({ kind: 'atom', canonical: 2, incidentPairs: [[1, 2], [2, 3], [2, 4]] }, {})!;
  const bondCard = subTokenInfo({ kind: 'bond', endpointPairs: [[1, 2]] }, {})!;
  const branchCard = subTokenInfo({ kind: 'branch', bondPairs: [[2, 4]], branchPoint: 2 }, {})!;

  it('no card makes a POSITIVE bond-order claim', () => {
    for (const c of [atomCard, bondCard, branchCard]) {
      expect(c.body).not.toMatch(/bond is (a |an )?(single|double|triple)/i);
    }
  });

  it('no card names an element word', () => {
    for (const c of [atomCard, bondCard, branchCard]) {
      expect(c.body).not.toMatch(/\b(carbon|nitrogen|oxygen|hydrogens?)\b/i);
    }
  });

  it('no card claims geometry', () => {
    for (const c of [atomCard, bondCard, branchCard]) {
      expect(c.body).not.toMatch(/\bgeometry\b/i);
    }
  });
});

// Phase 19 gap closure (UAT test 2): N* duplicated-fragment notation.
// Projections below come from CAFFEINE_TOLUENE_2BENZENE (real getInchi() output):
//   c `…;…;2*1-2-4-6-5-3-1`  and  h `…;…;2*1-6H`
// The duplicated benzenes are components 3 & 4; global offset +21 (caffeine 14 + toluene 7),
// atomsPerFrag 6, fragMult 2. The card must read ONE fragment in LOCAL numbering and state the
// multiplicity; the SubHover's highlight fields (canonicals / full atoms) stay GLOBAL & fanned.
describe('subTokenInfo — c-layer N* atom card (CONN-01 / CONN-03, GAP-19)', () => {
  // benzene `1-2-4-6-5-3-1`, hover local atom 2 → bonded to local 1 and 4 (single fragment).
  // incidentPairs are single-fragment GLOBAL (frag-0): atom 23 ↔ 22 and 25. fragMult=2 → components 3 & 4.
  const card = subTokenInfo(
    { kind: 'atom', canonical: 23, incidentPairs: [[22, 23], [23, 25]], fragmentOffset: 21, componentIndex: 2, fragMult: 2 },
    {},
  )!;

  it('shows the per-component LOCAL self number, not the global one', () => {
    expect(card.body).toMatch(/Atom 2 is bonded to/);
    expect(card.body).not.toMatch(/Atom 23/);
  });

  it('lists only this fragment’s neighbours in local numbering (1 and 4, not 6 fanned globals)', () => {
    expect(card.body).toMatch(/bonded to atoms 1 and 4/);
    expect(card.body).not.toMatch(/22|25|28|29|34|35/);
  });

  it('states the duplicated-fragment multiplicity and component span', () => {
    expect(card.body).toMatch(/in each of the 2 identical components \(components 3 and 4\)/);
  });
});

describe('subTokenInfo — c-layer N* bond card (CONN-02 / CONN-03, GAP-19)', () => {
  // hyphen `1-2` inside the 2* benzene segment: endpointPairs fanned across both copies
  // [frag0, frag1]; the card reads pair[0] (frag-0 global) and de-offsets to local 1 and 2.
  const card = subTokenInfo(
    { kind: 'bond', endpointPairs: [[22, 23], [28, 29]], fragmentOffset: 21, componentIndex: 2, fragMult: 2 },
    {},
  )!;

  it('names the two atoms in local numbering and states the multiplicity', () => {
    expect(card.body).toMatch(/Atoms 1 and 2 are bonded/);
    expect(card.body).toMatch(/in each of the 2 identical components \(components 3 and 4\)/);
    expect(card.body).not.toMatch(/22|23|28|29/);
  });
});

describe('subTokenInfo — h-layer N* hAtoms card (GAP-19, screenshot-1 regression)', () => {
  // `2*1-6H`: atoms[] is the FULL highlight set across both copies (grouped frag-0 then frag-1):
  // [22..27, 28..33]. fragMult=2 → the card shows ONE fragment, local 1-6.
  const atoms = [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];
  const card = subTokenInfo(
    { kind: 'hAtoms', atoms, count: 1, fragmentOffset: 21, componentIndex: 2, fragMult: 2 },
    {},
  )!;

  it('enumerates ONE fragment in local numbering (1-6), not both copies (1-12)', () => {
    expect(card.body).toMatch(/Atoms 1, 2, 3, 4, 5 and 6 each bear one hydrogen/);
    expect(card.body).not.toMatch(/\b7, 8, 9\b|and 12\b/);
  });

  it('states the duplicated-fragment multiplicity and component span', () => {
    expect(card.body).toMatch(/in each of the 2 identical components \(components 3 and 4\)/);
  });
});

// CLYR-06: the comma card. Choline's measured c-layer "1-6(2,3)4-5-7" — the comma sits
// between two methyls that both hang off the nitrogen and are not bonded to each other.
describe('subTokenInfo — branch-list comma', () => {
  it('names both flanking atoms and denies a bond between them', () => {
    const info = subTokenInfo({ kind: 'siblings', siblingPairs: [[2, 3]] }, {});
    expect(info).not.toBeNull();
    expect(info!.title).toMatch(/Connection layer/);
    expect(info!.body).toContain('2');
    expect(info!.body).toContain('3');
    expect(info!.body).toMatch(/not bonded/i);
  });

  it('de-offsets the displayed numbers for a later component', () => {
    const info = subTokenInfo(
      { kind: 'siblings', siblingPairs: [[9, 10]], fragmentOffset: 6, componentIndex: 1 },
      {},
    );
    expect(info!.body).toContain('3');
    expect(info!.body).toContain('4');
    expect(info!.body).not.toContain('10');
  });
});
