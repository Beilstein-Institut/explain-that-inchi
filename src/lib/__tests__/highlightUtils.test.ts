// Wave 0 RED state: all tests FAIL against stubs that return []
// Implementation fills in Plan 02.
import { describe, it, expect, vi } from 'vitest';
import { buildHighlightSpecs, buildSubHoverSpecs, resolveVar } from '../highlightUtils';
import type { StructLike } from '../highlightUtils';
import { parseInchi } from '../parseInchi';
import type { Layer, AuxMap } from '../parseInchi';

// Identity mock — CSS var names passed through as-is for readable assertions
const resolveVarFn = (name: string): string => name;

it('resolveVar passes a hex color through unchanged', () => {
  expect(resolveVar('#909090')).toBe('#909090');
});

// Benzene fixture (6 C atoms, cyclic bonds)
const auxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const atomElements: Record<number, string> = {
  1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C',
};

// Mock struct for c-layer tests — no charged atoms
function makeMockStruct(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}

// Mock struct with one positively charged atom at pool id 2
function makeMockStructWithCharge(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
      }),
    },
    atoms: {
      forEach: vi.fn((cb) => {
        cb({ charge: 0 }, 0);
        cb({ charge: 0 }, 1);
        cb({ charge: 1 }, 2);  // N+ at pool id 2
        cb({ charge: 0 }, 3);
        cb({ charge: 0 }, 4);
        cb({ charge: 0 }, 5);
      }),
    },
  };
}

/**
 * Phase 8: Mock struct with an explicit H atom.
 * Bonds 0–5 are the same benzene ring as makeMockStruct.
 * Bond 6 connects pool 0 (heavy atom) to pool 6 (explicit H atom).
 */
function makeMockStructWithExplicitH(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
        cb({ begin: 0, end: 6 }, 6); // bond 6: explicit H (pool 6) bonded to heavy atom (pool 0)
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}

/**
 * Benzene with 6 explicit (drawn) H atoms — reproduces InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H.
 * Pools 0–5 are the ring carbons (bonds 0–5). Pools 6–11 are explicit H atoms, each bonded
 * to one carbon (bonds 6–11). The /h-layer token "1-6H" lists the CARBONS (canonical 1–6 →
 * pools 0–5), NOT the H atoms — the explicit H are bonded neighbors found via bond traversal.
 */
function makeBenzeneWithExplicitH(): StructLike {
  return {
    findBondId: vi.fn().mockReturnValue(99),
    bonds: {
      forEach: vi.fn((cb) => {
        cb({ begin: 0, end: 1 }, 0);
        cb({ begin: 1, end: 2 }, 1);
        cb({ begin: 2, end: 3 }, 2);
        cb({ begin: 3, end: 4 }, 3);
        cb({ begin: 4, end: 5 }, 4);
        cb({ begin: 5, end: 0 }, 5);
        cb({ begin: 0, end: 6 }, 6); // C0–H6
        cb({ begin: 1, end: 7 }, 7); // C1–H7
        cb({ begin: 2, end: 8 }, 8); // C2–H8
        cb({ begin: 3, end: 9 }, 9); // C3–H9
        cb({ begin: 4, end: 10 }, 10); // C4–H10
        cb({ begin: 5, end: 11 }, 11); // C5–H11
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}

// Helper to make a basic layer
function makeLayer(overrides: Partial<Layer>): Layer {
  return {
    type: 'formula',
    prefix: '',
    text: '',
    atoms: [],
    bonds: [],
    ...overrides,
  };
}

const formulaLayer: Layer = makeLayer({
  type: 'formula',
  text: 'C6H6',
  atoms: [1, 2, 3, 4, 5, 6],
});

const cLayer: Layer = makeLayer({
  type: 'c',
  prefix: 'c',
  text: '1-2-3-4-5-6-1',
  atoms: [1, 2, 3, 4, 5, 6],
  bonds: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1]],
});

const hLayer: Layer = makeLayer({
  type: 'h',
  prefix: 'h',
  text: '1-6H',
  atoms: [1, 2, 3, 4, 5, 6],
});

const hLayerMulti: Layer = makeLayer({
  type: 'h',
  prefix: 'h',
  text: '1H3,2H',
  atoms: [1, 2],
});

const hLayerMobile: Layer = makeLayer({
  type: 'h',
  prefix: 'h',
  text: '(H,3,4)',
  atoms: [3, 4],
});

const tLayer: Layer = makeLayer({
  type: 't',
  prefix: 't',
  text: '1+,2-',
  atoms: [1, 2],
});

const bLayer: Layer = makeLayer({
  type: 'b',
  prefix: 'b',
  text: '1-2+',
  atoms: [1, 2],
});

const mLayer: Layer = makeLayer({
  type: 'm',
  prefix: 'm',
  text: '1',
  atoms: [],
});

const sLayer: Layer = makeLayer({
  type: 's',
  prefix: 's',
  text: '1',
  atoms: [],
});

const versionLayer: Layer = makeLayer({
  type: 'version',
  prefix: '',
  text: '1S',
  atoms: [],
});

const qLayer: Layer = makeLayer({
  type: 'q',
  prefix: 'q',
  text: '+1',
  atoms: [],
});

const pLayer: Layer = makeLayer({
  type: 'p',
  prefix: 'p',
  text: '+1',
  atoms: [],
});

const iLayer: Layer = makeLayer({
  type: 'i',
  prefix: 'i',
  text: '2D',
  atoms: [],
});

// Layers array including t-layer for m/s tests
const allLayers: Layer[] = [versionLayer, formulaLayer, cLayer, hLayer, tLayer, mLayer, sLayer];

describe('buildHighlightSpecs', () => {
  describe('INCHI-03: layer-wide highlights', () => {
    it('formula layer: returns specs with C atoms grouped by element color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      // Should NOT be empty — C atoms should be grouped by --c-el-C color
      expect(specs.length).toBeGreaterThan(0);
      // All 6 atoms should appear in specs
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds).toContain(0); // canonical 1 → ketcher 0
      expect(allAtomIds).toContain(5); // canonical 6 → ketcher 5
    });

    it('formula layer: atom color is elementColor resolved (--c-el-C)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      // With identity resolveVarFn, color should be '--c-el-C'
      const cSpec = specs.find(s => s.atoms.includes(0));
      expect(cSpec).toBeDefined();
      expect(cSpec!.color).toBe('#909090');
    });

    it('formula layer with N atom: N atoms get --c-el-N color', () => {
      const mixedLayer: Layer = makeLayer({
        type: 'formula',
        text: 'C2N',
        atoms: [1, 2, 3],
      });
      const mixedElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'N' };
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(mixedLayer, null, { 1: 0, 2: 1, 3: 2 }, mixedElements, [], allLayers, struct, resolveVarFn);
      const nSpec = specs.find(s => s.atoms.includes(2));
      expect(nSpec).toBeDefined();
      expect(nSpec!.color).toBe('#3050f8');
    });

    it('formula layer: bonds array is empty (no bond highlights)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const hasBonds = specs.some(s => s.bonds.length > 0);
      expect(hasBonds).toBe(false);
    });

    it('c-layer: atoms from bond endpoint set are returned', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds.length).toBeGreaterThan(0);
    });

    it('c-layer: bonds array is non-empty (findBondId was called)', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const hasBonds = specs.some(s => s.bonds.length > 0);
      expect(hasBonds).toBe(true);
    });

    it('c-layer: color is --c-conn', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(cLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-conn');
    });

    it('h-layer: atoms grouped by H-count color (count 1 → --c-hydro-1)', () => {
      // hLayer has text '1-6H' → all atoms get count 1
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(hLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      const spec = specs[0];
      expect(spec.color).toBe('--c-hydro-1');
    });

    it('h-layer: count 3 → --c-hydro-3', () => {
      // hLayerMulti has '1H3,2H' → atom 1 gets count 3, atom 2 gets count 1
      const struct = makeMockStruct();
      const smallAuxMap: AuxMap = { 1: 0, 2: 1 };
      const smallElements: Record<number, string> = { 1: 'C', 2: 'C' };
      const specs = buildHighlightSpecs(hLayerMulti, null, smallAuxMap, smallElements, [], allLayers, struct, resolveVarFn);
      const hydro3Spec = specs.find(s => s.color === '--c-hydro-3');
      expect(hydro3Spec).toBeDefined();
      expect(hydro3Spec!.atoms).toContain(0); // canonical 1 → ketcher 0
    });

    it('h-layer: mobile H atoms get --c-hydro-mobile color', () => {
      const struct = makeMockStruct();
      const smallAuxMap: AuxMap = { 3: 2, 4: 3 };
      const smallElements: Record<number, string> = { 3: 'C', 4: 'C' };
      const specs = buildHighlightSpecs(hLayerMobile, null, smallAuxMap, smallElements, [], allLayers, struct, resolveVarFn);
      const mobileSpec = specs.find(s => s.color === '--c-hydro-mobile');
      expect(mobileSpec).toBeDefined();
      expect(mobileSpec!.atoms).toContain(2); // canonical 3 → ketcher 2
      expect(mobileSpec!.atoms).toContain(3); // canonical 4 → ketcher 3
    });

    it('t-layer: plus-parity atoms get --c-stereo-plus', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(tLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const plusSpec = specs.find(s => s.color === '--c-stereo-plus');
      expect(plusSpec).toBeDefined();
      expect(plusSpec!.atoms).toContain(0); // canonical 1 → ketcher 0
    });

    it('t-layer: minus-parity atoms get --c-stereo-minus', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(tLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
      expect(minusSpec).toBeDefined();
      expect(minusSpec!.atoms).toContain(1); // canonical 2 → ketcher 1
    });

    it("t-layer: '?' undefined stereocenters form a distinct --c-stereo group; union of all 5 repro centers is {9,10,11,22,23}", () => {
      // Repro t-layer: '9?,10?,11-;9?,10-;' over fragments [13,12,6].
      // Fragment A: 9?,10?,11- ; fragment C (+13): 9?->22, 10-?->23 ; fragment B: none.
      const repro =
        'InChI=1S/C12H19N.C11H17N.C6H6/c1-9(11(3)13)10(2)12-7-5-4-6-8-12;1-9(10(2)12)8-11-6-4-3-5-7-11;1-2-4-6-5-3-1/h4-11H,13H2,1-3H3;3-7,9-10H,8,12H2,1-2H3;1-6H/t9?,10?,11-;9?,10-;/m11./s1';
      const reproLayers = parseInchi(repro);
      const reproT = reproLayers.find(l => l.type === 't')!;
      // Identity auxMap 1:1..31:31 and identity element map.
      const idAux: AuxMap = {};
      const idEl: Record<number, string> = {};
      for (let i = 1; i <= 31; i++) { idAux[i] = i; idEl[i] = 'C'; }
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(reproT, null, idAux, idEl, [], reproLayers, struct, resolveVarFn);

      const union = new Set(specs.flatMap(s => s.atoms));
      expect([...union].sort((a, b) => a - b)).toEqual([9, 10, 11, 22, 23]);

      // The undefined ('?') atoms 9,10,22 must be in a spec colored from --c-stereo,
      // NOT lumped into the minus group.
      const undefinedSpec = specs.find(s => s.color === '--c-stereo');
      expect(undefinedSpec).toBeDefined();
      expect(undefinedSpec!.atoms).toEqual(expect.arrayContaining([9, 10, 22]));
      const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
      expect(minusSpec!.atoms).not.toContain(9);
      expect(minusSpec!.atoms).not.toContain(22);
    });

    it('b-layer: highlights the double-bond atom pair and the bond with stereo-plus color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(bLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toHaveLength(1);
      expect(specs[0].color).toBe('--c-stereo-plus');
      expect(specs[0].atoms).toEqual(expect.arrayContaining([0, 1]));
      expect(specs[0].bonds).toContain(99); // findBondId(0,1) in mock struct
    });

    it('m-layer: reads atoms from co-present t-layer, uses --c-stereo color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(mLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo');
      // Should include stereo atoms from t-layer (canonical 1,2 → ketcher 0,1)
      const allAtomIds = specs.flatMap(s => s.atoms);
      expect(allAtomIds).toContain(0);
      expect(allAtomIds).toContain(1);
    });

    it('s-layer: reads atoms from co-present t-layer, uses --c-stereo color', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(sLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo');
    });

    it('m-layer with no t-layer: returns empty array', () => {
      const struct = makeMockStruct();
      const noTLayers: Layer[] = [versionLayer, formulaLayer, mLayer];
      const specs = buildHighlightSpecs(mLayer, null, auxMap, atomElements, [], noTLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('version layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(versionLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    it('q layer single fragment: highlights only the formally-charged atom within the fragment', () => {
      // makeMockStructWithCharge has pool id 2 with charge +1; qLayer.text = '+1'
      // Single-fragment path: formallyCharged = [2], so only pool id 2 highlighted
      const struct = makeMockStructWithCharge();
      const specs = buildHighlightSpecs(qLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toHaveLength(1);
      expect(specs[0].color).toBe('--c-charge');
      expect(specs[0].atoms).toEqual([2]);
    });

    it('q layer single fragment: falls back to Object.values(auxMap) when no formal charges in struct', () => {
      // makeMockStruct has no charged atoms → single-fragment fallback uses Object.values(auxMap) = [0..5]
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(qLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toHaveLength(1);
      expect(specs[0].color).toBe('--c-charge');
      // Object.values({1:0,2:1,3:2,4:3,5:4,6:5}) = [0,1,2,3,4,5]
      expect(specs[0].atoms).toEqual(expect.arrayContaining([0, 1, 2, 3, 4, 5]));
      expect(specs[0].atoms).toHaveLength(6);
    });

    it('q layer multi-fragment: only highlights formally-charged atom in charged fragment, not uncharged fragment', () => {
      // CuSO4-like: q '+2;' → Cu (pool 0) has +2 in struct, sulfate O- atoms are in the uncharged fragment
      const cuSo4FormulaLayer = makeLayer({ type: 'formula', text: 'Cu.H2O4S', atoms: [1, 2, 3, 4, 5, 6] });
      const cuSo4QLayer = makeLayer({ type: 'q', prefix: 'q', text: '+2;', atoms: [] });
      const cuSo4AuxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
      const cuSo4Elements: Record<number, string> = { 1: 'Cu', 2: 'O', 3: 'O', 4: 'O', 5: 'O', 6: 'S' };
      const localLayers: Layer[] = [cuSo4FormulaLayer, cuSo4QLayer];
      // struct: Cu (pool 0) has +2, O atoms (pools 1-4) have -1 each
      const cuSo4Struct: StructLike = {
        findBondId: () => null,
        bonds: { forEach: () => {} },
        atoms: {
          forEach: (cb) => {
            cb({ charge: 2 }, 0);   // Cu²⁺
            cb({ charge: -1 }, 1);  // O⁻
            cb({ charge: -1 }, 2);  // O⁻
            cb({ charge: -1 }, 3);  // O⁻
            cb({ charge: -1 }, 4);  // O⁻
            cb({ charge: 0 }, 5);   // S
          },
        },
      };
      const specs = buildHighlightSpecs(cuSo4QLayer, null, cuSo4AuxMap, cuSo4Elements, [], localLayers, cuSo4Struct, resolveVarFn);
      expect(specs).toHaveLength(1);
      expect(specs[0].color).toBe('--c-charge');
      expect(specs[0].atoms).toEqual([0]); // only Cu (pool id 0), not O⁻ atoms
    });

    it('p layer: returns empty array []', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(pLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toEqual([]);
    });

    // Was 'returns empty array []' — that assertion encoded the Phase 4 decision
    // to treat i as non-spatial, which is why hovering /i1D highlighted nothing.
    // The i layer indexes heavy atoms; see isotopeHighlight.test.ts for the full
    // behaviour against real chloroform-d and ethanol-d5 output.
    it('i layer: highlights the atom named by the isotope entry', () => {
      const struct = makeMockStruct();
      // iLayer text is '2D' → canonical 2 → pool 1. No explicit H in this
      // fixture (hAtomPoolIds is []), so only the heavy atom comes back.
      const specs = buildHighlightSpecs(iLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      expect(specs).toEqual([
        { atoms: [1], bonds: [], rgroupAttachmentPoints: [], color: '--c-isotope' },
      ]);
    });
  });

  describe('INCHI-05: formula layer with explicit H atoms (hAtomPoolIds)', () => {
    it('formula layer with hAtomPoolIds: H pool IDs are appended with the hydrogen brown', () => {
      const struct = makeMockStruct();
      // Simulate ethanol-like molecule: 2 C atoms (canonical 1,2 → ketcher 0,1) + 1 explicit H (pool id 7)
      const hAtomPoolIds = [7];
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, hAtomPoolIds, allLayers, struct, resolveVarFn);
      const hSpec = specs.find(s => s.atoms.includes(7));
      expect(hSpec).toBeDefined();
      // Jmol white is invisible on the white canvas — hydrogen borrows --c-hydro-1.
      expect(hSpec!.color).toBe('--c-hydro-1');
    });

    it('formula layer with empty hAtomPoolIds: no H spec appended', () => {
      const struct = makeMockStruct();
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, [], allLayers, struct, resolveVarFn);
      // No H pool IDs — should not produce an H-colored spec
      const hSpec = specs.find(s => s.color === '--c-hydro-1');
      expect(hSpec).toBeUndefined();
    });

    it('formula layer with multiple hAtomPoolIds: all H IDs appear in one H spec', () => {
      const struct = makeMockStruct();
      const hAtomPoolIds = [10, 11, 12];
      const specs = buildHighlightSpecs(formulaLayer, null, auxMap, atomElements, hAtomPoolIds, allLayers, struct, resolveVarFn);
      const hSpec = specs.find(s => s.color === '--c-hydro-1');
      expect(hSpec).toBeDefined();
      expect(hSpec!.atoms).toContain(10);
      expect(hSpec!.atoms).toContain(11);
      expect(hSpec!.atoms).toContain(12);
    });
  });
});

describe('INCHI-07: p-layer highlight', () => {
  it('Test A: buildHighlightSpecs pLayer with N heteroatom returns non-empty specs highlighting the N atom', () => {
    // atomElements_with_N: canonical 3 is N, rest are C
    const atomElements_with_N: Record<number, string> = { 1: 'C', 2: 'C', 3: 'N' };
    const smallAuxMap: AuxMap = { 1: 0, 2: 1, 3: 2 };
    const struct = makeMockStruct();
    const localAllLayers: Layer[] = [versionLayer, makeLayer({ type: 'formula', text: 'C2N', atoms: [1, 2, 3] }), pLayer];
    const specs = buildHighlightSpecs(pLayer, null, smallAuxMap, atomElements_with_N, [], localAllLayers, struct, resolveVarFn);
    expect(specs.length).toBeGreaterThan(0);
    // canonical 3 (N) → Ketcher index 2
    expect(specs[0].atoms).toContain(2);
    expect(specs[0].color).toBe('--c-proton');
  });

  it('Test B: buildHighlightSpecs pLayer with all-carbon atomElements returns [] (no heteroatoms)', () => {
    const atomElements_all_C: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C' };
    const smallAuxMap: AuxMap = { 1: 0, 2: 1, 3: 2 };
    const struct = makeMockStruct();
    const localAllLayers: Layer[] = [versionLayer, makeLayer({ type: 'formula', text: 'C3', atoms: [1, 2, 3] }), pLayer];
    const specs = buildHighlightSpecs(pLayer, null, smallAuxMap, atomElements_all_C, [], localAllLayers, struct, resolveVarFn);
    expect(specs).toEqual([]);
  });

  it('p layer with mobile-H sites: highlights only mobile-H bearing atoms, not all heteroatoms', () => {
    // CuSO4: /h;(H2,1,2,3,4) — no mobile H on Cu (fragment 1), mobile H on oxygens (local 1-4 of fragment 2)
    // Cu (canonical 1, pool 0) must NOT be highlighted; S (canonical 6, pool 5) must NOT be highlighted
    const cuSo4FormulaLayer = makeLayer({ type: 'formula', text: 'Cu.H2O4S', atoms: [1, 2, 3, 4, 5, 6] });
    const cuSo4HLayer = makeLayer({ type: 'h', prefix: 'h', text: ';(H2,1,2,3,4)', atoms: [] });
    const cuSo4PLayer = makeLayer({ type: 'p', prefix: 'p', text: '-2', atoms: [] });
    const cuSo4AuxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    const cuSo4Elements: Record<number, string> = { 1: 'Cu', 2: 'O', 3: 'O', 4: 'O', 5: 'O', 6: 'S' };
    const localLayers: Layer[] = [cuSo4FormulaLayer, cuSo4HLayer, cuSo4PLayer];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(cuSo4PLayer, null, cuSo4AuxMap, cuSo4Elements, [], localLayers, struct, resolveVarFn);
    expect(specs).toHaveLength(1);
    expect(specs[0].color).toBe('--c-proton');
    expect(specs[0].atoms).not.toContain(0); // Cu must not be highlighted
    expect(specs[0].atoms).not.toContain(5); // S must not be highlighted
    expect(specs[0].atoms).toContain(1);     // O (canonical 2 → pool 1)
    expect(specs[0].atoms).toContain(2);     // O (canonical 3 → pool 2)
    expect(specs[0].atoms).toContain(3);     // O (canonical 4 → pool 3)
    expect(specs[0].atoms).toContain(4);     // O (canonical 5 → pool 4)
  });
});

describe('CR-01: h-layer multi-fragment offset correction', () => {
  // Two-fragment molecule: fragment 1 = methane (CH4, 1 atom), fragment 2 = benzene (C6H6, 6 atoms)
  // h-layer text: "1H4;1-6H" (fragment separator ';')
  // auxMap: fragment-1 canonical 1 → Ketcher 0; fragment-2 canonicals 1–6 → Ketcher 1–6 (global 7–12 offset by 1)
  const twoFragFormulaLayer: Layer = makeLayer({
    type: 'formula',
    text: 'CH4.C6H6', // fragment 1: 1 atom, fragment 2: 6 atoms
    atoms: [1, 2, 3, 4, 5, 6, 7],
  });
  // auxMap: global canonical index → Ketcher pool ID
  const twoFragAuxMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 };
  const twoFragElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C', 7: 'C' };

  it('h-layer: fragment-2 atoms are highlighted with correct global offset', () => {
    // Fragment 1 has 1 atom (canonical 1), fragment 2 has 6 atoms (canonicals 2–7 globally).
    // h-layer "1H4;1-6H": fragment-1 atom 1 → global 1; fragment-2 atoms 1–6 → global 2–7
    const hLayerTwoFrag: Layer = makeLayer({
      type: 'h',
      prefix: 'h',
      text: '1H4;1-6H',
      atoms: [1, 2, 3, 4, 5, 6, 7],
    });
    const layers: Layer[] = [versionLayer, twoFragFormulaLayer, hLayerTwoFrag];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(hLayerTwoFrag, null, twoFragAuxMap, twoFragElements, [], layers, struct, resolveVarFn);
    // Fragment-1 atom 1 → Ketcher 0, should be in --c-hydro-4 spec
    const hydro4Spec = specs.find(s => s.color === '--c-hydro-4');
    expect(hydro4Spec).toBeDefined();
    expect(hydro4Spec!.atoms).toContain(0); // canonical 1 → Ketcher 0

    // Fragment-2 atoms 1–6 offset by 1 → global canonicals 2–7 → Ketcher 1–6
    const hydro1Spec = specs.find(s => s.color === '--c-hydro-1');
    expect(hydro1Spec).toBeDefined();
    // All 6 fragment-2 atoms should appear
    expect(hydro1Spec!.atoms).toContain(1); // global canonical 2 → Ketcher 1
    expect(hydro1Spec!.atoms).toContain(6); // global canonical 7 → Ketcher 6
  });

  it('h-layer single-fragment: behaves identically to pre-fix code (no regression)', () => {
    // Single-fragment benzene h-layer — no ';' in text
    const hLayerSingleFrag: Layer = makeLayer({
      type: 'h',
      prefix: 'h',
      text: '1-6H',
      atoms: [1, 2, 3, 4, 5, 6],
    });
    const layers: Layer[] = [versionLayer, formulaLayer, hLayerSingleFrag];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(hLayerSingleFrag, null, auxMap, atomElements, [], layers, struct, resolveVarFn);
    expect(specs.length).toBeGreaterThan(0);
    const hydro1Spec = specs.find(s => s.color === '--c-hydro-1');
    expect(hydro1Spec).toBeDefined();
    expect(hydro1Spec!.atoms).toContain(0); // canonical 1 → Ketcher 0
    expect(hydro1Spec!.atoms).toContain(5); // canonical 6 → Ketcher 5
  });
});

describe('CR-02: t-layer multi-fragment offset correction', () => {
  // Two-fragment molecule: fragment 1 = 2 atoms, fragment 2 = 2 atoms
  // t-layer text: "1+;1-" — fragment 1 atom 1 is '+', fragment 2 atom 1 is '-'
  // Without offset correction both fragments return canonical index 1, second overwrites first.
  const twoFragFormulaT: Layer = makeLayer({
    type: 'formula',
    text: 'C2.C2',  // 2 atoms in each fragment
    atoms: [1, 2, 3, 4],
  });
  const twoFragAuxMapT: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3 };
  const twoFragElementsT: Record<number, string> = { 1: 'C', 2: 'C', 3: 'C', 4: 'C' };

  it('t-layer: fragment-2 stereocentre uses global canonical index (no collision)', () => {
    const tLayerTwoFrag: Layer = makeLayer({
      type: 't',
      prefix: 't',
      text: '1+;1-', // fragment 1 atom 1 = '+', fragment 2 atom 1 = '-'
      atoms: [1, 3],
    });
    const layers: Layer[] = [versionLayer, twoFragFormulaT, tLayerTwoFrag];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(tLayerTwoFrag, null, twoFragAuxMapT, twoFragElementsT, [], layers, struct, resolveVarFn);

    // Fragment-1 atom 1 → global 1 → Ketcher 0 → plus
    const plusSpec = specs.find(s => s.color === '--c-stereo-plus');
    expect(plusSpec).toBeDefined();
    expect(plusSpec!.atoms).toContain(0);

    // Fragment-2 atom 1 + offset 2 → global 3 → Ketcher 2 → minus
    const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
    expect(minusSpec).toBeDefined();
    expect(minusSpec!.atoms).toContain(2);
  });

  it('t-layer single-fragment: behaves identically to pre-fix code (no regression)', () => {
    const tLayerSingle: Layer = makeLayer({
      type: 't',
      prefix: 't',
      text: '1+,2-',
      atoms: [1, 2],
    });
    const layers: Layer[] = [versionLayer, formulaLayer, tLayerSingle];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(tLayerSingle, null, auxMap, atomElements, [], layers, struct, resolveVarFn);
    const plusSpec = specs.find(s => s.color === '--c-stereo-plus');
    expect(plusSpec).toBeDefined();
    expect(plusSpec!.atoms).toContain(0); // canonical 1 → Ketcher 0
    const minusSpec = specs.find(s => s.color === '--c-stereo-minus');
    expect(minusSpec).toBeDefined();
    expect(minusSpec!.atoms).toContain(1); // canonical 2 → Ketcher 1
  });

  it('m-layer with two-fragment t-layer: uses global canonical indices for both fragments', () => {
    const tLayerTwoFrag: Layer = makeLayer({
      type: 't',
      prefix: 't',
      text: '1+;1-',
      atoms: [1, 3],
    });
    const mLayerLocal: Layer = makeLayer({ type: 'm', prefix: 'm', text: '1', atoms: [] });
    const layers: Layer[] = [versionLayer, twoFragFormulaT, tLayerTwoFrag, mLayerLocal];
    const struct = makeMockStruct();
    const specs = buildHighlightSpecs(mLayerLocal, null, twoFragAuxMapT, twoFragElementsT, [], layers, struct, resolveVarFn);
    expect(specs.length).toBeGreaterThan(0);
    expect(specs[0].color).toBe('--c-stereo');
    // Both fragments' stereocentres should be highlighted
    expect(specs[0].atoms).toContain(0); // fragment-1 atom 1 → Ketcher 0
    expect(specs[0].atoms).toContain(2); // fragment-2 atom 1 + offset 2 → Ketcher 2
  });
});

describe('buildSubHoverSpecs', () => {
  describe('INCHI-04: sub-token highlights', () => {
    it('kind element: only atoms where atomElements[canonical] === subHover.el are highlighted', () => {
      const struct = makeMockStruct();
      const mixedElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'N', 4: 'C', 5: 'C', 6: 'C' };
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'N' },
        auxMap,
        mixedElements,
        [],
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      // Only canonical 3 (ketcher 2) should appear — it's the N atom
      expect(specs[0].atoms).toEqual([2]);
    });

    it('kind element: color comes from elementColor (--c-el-C for C)', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'C' },
        auxMap,
        atomElements,
        [],
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('#909090');
    });

    it('kind atom: single atom highlighted, bonds is [] (CLYR-01 D-01: no incident bonds)', () => {
      // CLYR-01: atom number hover highlights ONLY the atom — no incident bonds.
      // Bonds are reachable via their own hyphen hover tokens (kind:'bond').
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'atom', canonical: 1 },
        auxMap,
        atomElements,
        [],
        cLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      // canonical 1 → ketcher 0
      expect(specs[0].atoms).toContain(0);
      // CLYR-01: bonds MUST be empty — no incident bonds (changed from pre-Phase-15 behavior)
      expect(specs[0].bonds).toEqual([]);
    });

    it('kind atom: color is --c-conn', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'atom', canonical: 1 },
        auxMap,
        atomElements,
        [],
        cLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-conn');
    });

    it('kind stereo: single atom, color from parityColor(subHover.sign)', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'stereo', atom: 1, sign: '+' },
        auxMap,
        atomElements,
        [],
        tLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(0); // canonical 1 → ketcher 0
      expect(specs[0].color).toBe('--c-stereo-plus');
    });

    it('kind stereo: minus sign uses --c-stereo-minus', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'stereo', atom: 2, sign: '-' },
        auxMap,
        atomElements,
        [],
        tLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-stereo-minus');
    });

    it('kind hAtoms: bonded explicit-H pool IDs only, color from hydroColor(subHover.count)', () => {
      // NEW CONTRACT (LOCKED rule 1): the token lists the HEAVY atom (canonical 1 → carbon
      // pool 0); the explicit H is its bonded neighbour (pool 6). Spec highlights the H, not
      // the carbon, and carries no bonds.
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1], count: 1 },
        { 1: 0 }, // canonical 1 → carbon pool 0 (bonded to explicit H pool 6)
        atomElements,
        [6], // pool 6 is the drawn explicit H
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(6); // bonded explicit H pool
      expect(specs[0].atoms).not.toContain(0); // carbon NOT filled
      expect(specs[0].bonds).toHaveLength(0); // no bonds
      expect(specs[0].color).toBe('--c-hydro-1');
    });

    it('kind hAtoms: count 3 → --c-hydro-3 (explicit-H spec)', () => {
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1], count: 3 },
        { 1: 0 }, // canonical 1 → carbon pool 0 (bonded to explicit H pool 6)
        atomElements,
        [6],
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].color).toBe('--c-hydro-3');
    });

    it('kind hAtoms: GAP-2 guard — resolves via GLOBAL atoms, fragmentOffset is ignored on the highlight path', () => {
      // A multi-component hAtoms hit carries GLOBAL canonical 19 plus a display-only
      // fragmentOffset 17 (per-component-local 2). The highlight MUST key auxMap by the
      // global 19 (→ carbon pool 0 → bonded explicit H pool 6). If fragmentOffset were
      // subtracted here, auxMap[2] would be undefined and specs would be empty.
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [19], count: 1, fragmentOffset: 17, componentIndex: 1 },
        { 19: 0 }, // GLOBAL canonical 19 → carbon pool 0 (bonded to explicit H pool 6)
        atomElements,
        [6],
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBe(1);
      expect(specs[0].atoms).toContain(6); // resolved via global 19, NOT the de-offset 2
    });

    it('kind atom: GAP-2 guard — resolves via GLOBAL canonical, fragmentOffset ignored on highlight (CONN-03)', () => {
      // A multi-component c-layer atom hit carries GLOBAL canonical 1 plus a display-only
      // fragmentOffset 17 (per-component-local would be a negative/different number). The
      // highlight MUST key auxMap by the global 1 (→ pool 0). If fragmentOffset leaked onto
      // the highlight path the lookup would miss.
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'atom', canonical: 1, fragmentOffset: 17, componentIndex: 1, incidentPairs: [[1, 2]] },
        { 1: 0 }, // GLOBAL canonical 1 → pool 0
        atomElements,
        [],
        cLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBe(1);
      expect(specs[0].atoms).toContain(0); // resolved via global 1, NOT a de-offset
    });

    it('kind bond: GAP-2 guard — resolves bond via GLOBAL endpointPairs, fragmentOffset ignored (CONN-03)', () => {
      // A bond-kind SubHover with non-zero fragmentOffset still resolves via the global
      // endpointPairs (auxMap 1→0, 2→1; makeMockStruct bond 0 connects pools 0–1).
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'bond', endpointPairs: [[1, 2]], fragmentOffset: 17, componentIndex: 1 },
        { 1: 0, 2: 1 },
        atomElements,
        [],
        cLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBe(1);
      expect(specs[0].bonds.length).toBeGreaterThan(0); // resolved via global endpoints
    });

    it('kind mobileH: atoms from subHover.atoms[], color --c-hydro-mobile', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'mobileH', atoms: [3, 4] },
        auxMap,
        atomElements,
        [],
        hLayerMobile,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(2); // canonical 3 → ketcher 2
      expect(specs[0].atoms).toContain(3); // canonical 4 → ketcher 3
      expect(specs[0].color).toBe('--c-hydro-mobile');
    });
  });

  describe('INCHI-05: element sub-hover H-branch', () => {
    it('kind element H with hAtomPoolIds: returns spec with H pool IDs and --c-el-H color', () => {
      const struct = makeMockStruct();
      const hAtomPoolIds = [7, 8];
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H' },
        auxMap,
        atomElements,
        hAtomPoolIds,
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(7);
      expect(specs[0].atoms).toContain(8);
      expect(specs[0].color).toBe('--c-hydro-1');
    });

    it('kind element H with empty hAtomPoolIds: silent no-op, returns []  (D-04)', () => {
      const struct = makeMockStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H' },
        auxMap,
        atomElements,
        [],
        formulaLayer,
        struct,
        resolveVarFn,
      );
      expect(specs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // QUICK-260610-fn1: fragment-scoped explicit-H hover
  // -------------------------------------------------------------------------
  describe('QUICK-260610-fn1: fragment-scoped explicit-H hover', () => {
    // Two-fragment fixture: heavy atoms canonical 1→pool 10, canonical 2→pool 20.
    // Explicit H pool 100 bonded to heavy pool 10; explicit H pool 200 bonded to heavy pool 20.
    const fnAuxMap: AuxMap = { 1: 10, 2: 20 };
    const fnAtomElements: Record<number, string> = { 1: 'C', 2: 'C' };
    const fnHAtomPoolIds = [100, 200];
    const fnLayer = makeLayer({ type: 'formula', atoms: [1, 2], bonds: [] });

    function makeFnStruct(): StructLike {
      return {
        findBondId: () => null,
        bonds: {
          forEach: (cb) => {
            cb({ begin: 10, end: 100 }, 0);
            cb({ begin: 20, end: 200 }, 1);
          },
        },
        atoms: { forEach: vi.fn() },
      };
    }

    it('canonRange [2,2] → only fragment-2 explicit H (pool 200)', () => {
      const struct = makeFnStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H', canonRange: [2, 2] },
        fnAuxMap,
        fnAtomElements,
        fnHAtomPoolIds,
        fnLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.flatMap(s => s.atoms)).toEqual([200]);
    });

    it('canonRange [1,1] → only fragment-1 explicit H (pool 100)', () => {
      const struct = makeFnStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H', canonRange: [1, 1] },
        fnAuxMap,
        fnAtomElements,
        fnHAtomPoolIds,
        fnLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.flatMap(s => s.atoms)).toEqual([100]);
    });

    it('no canonRange → all explicit H atoms (single-fragment behavior unchanged)', () => {
      const struct = makeFnStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H' },
        fnAuxMap,
        fnAtomElements,
        fnHAtomPoolIds,
        fnLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.flatMap(s => s.atoms)).toEqual([100, 200]);
    });

    it('canonRange [1,2] → both fragments in range', () => {
      const struct = makeFnStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H', canonRange: [1, 2] },
        fnAuxMap,
        fnAtomElements,
        fnHAtomPoolIds,
        fnLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.flatMap(s => s.atoms)).toEqual([100, 200]);
    });

    it('empty hAtomPoolIds with canonRange [2,2] → no-op, returns []', () => {
      const struct = makeFnStruct();
      const specs = buildSubHoverSpecs(
        { kind: 'element', el: 'H', canonRange: [2, 2] },
        fnAuxMap,
        fnAtomElements,
        [],
        fnLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.flatMap(s => s.atoms)).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // QUICK-260610-ist: unify H hover — hAtoms case emits explicit-H-only specs.
  // REVERSES the Phase 8 heavy-fill + bond path (intentional contract change).
  // LOCKED rule 1: NO heavy-atom fill, NO bonds. Implicit H are rendered as
  // badges by the hook (renderHBadges), NOT as highlight specs.
  // -------------------------------------------------------------------------
  describe('case hAtoms — explicit-H-only contract (no heavy fill, no bonds)', () => {
    it('REPRO benzene /h1-6H with explicit H: highlights the 6 bonded explicit H atoms, not the carbons, no bonds', () => {
      // InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H — the token lists carbons (canonical 1–6 → pools 0–5);
      // the explicit drawn H are bonded neighbor pools 6–11. The hover must light the H atoms,
      // resolved by bond traversal from each heavy atom — NOT test whether the carbon is itself H.
      const struct = makeBenzeneWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1, 2, 3, 4, 5, 6], count: 1 },
        { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 },
        atomElements,
        [6, 7, 8, 9, 10, 11], // explicit H pool IDs (bonded to carbons 0–5)
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      const allAtoms = specs.flatMap(s => s.atoms).sort((a, b) => a - b);
      expect(allAtoms).toEqual([6, 7, 8, 9, 10, 11]); // all explicit H, nothing else
      for (const carbon of [0, 1, 2, 3, 4, 5]) expect(allAtoms).not.toContain(carbon);
      expect(specs.flatMap(s => s.bonds)).toHaveLength(0);
    });

    it('implicit-only token (hAtomPoolIds empty) → NO heavy atom, NO bonds (empty spec set acceptable)', () => {
      // canonical 1 → pool 0; pool 0 is NOT in hAtomPoolIds (empty) → purely implicit.
      // Under the new contract the heavy atom is NOT collected and bonds are empty.
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1], count: 1 },
        { 1: 0 }, // canonical 1 → pool 0 (heavy)
        atomElements,
        [], // no explicit H atoms drawn
        hLayer,
        struct,
        resolveVarFn,
      );
      // Accept either [] or a spec whose atoms exclude the heavy pool 0.
      const allAtoms = specs.flatMap(s => s.atoms);
      expect(allAtoms).not.toContain(0); // heavy atom must NOT be filled
      const allBonds = specs.flatMap(s => s.bonds);
      expect(allBonds).toHaveLength(0); // no bonds ever
    });

    it('explicit H token → spec.atoms includes ONLY the bonded explicit H pool ID; excludes heavy atom; bonds empty', () => {
      // canonical 1 → carbon pool 0; bond 6 connects pool 0 to its drawn H (pool 6).
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1], count: 1 },
        { 1: 0 }, // canonical 1 → carbon pool 0 (bonded to explicit H pool 6)
        atomElements,
        [6], // pool 6 is the drawn explicit H
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      expect(specs[0].atoms).toContain(6); // bonded explicit H pool ID
      expect(specs[0].atoms).not.toContain(0); // heavy atom NOT filled
      expect(specs[0].bonds).toHaveLength(0); // no bonds
    });

    it('mixed token (one carbon with drawn H, one purely implicit) → only the bonded explicit H; no heavy fill; bonds empty', () => {
      // canonical 1 → carbon pool 0 (has drawn H pool 6); canonical 2 → carbon pool 1 (no drawn H).
      const struct = makeMockStructWithExplicitH();
      const specs = buildSubHoverSpecs(
        { kind: 'hAtoms', atoms: [1, 2], count: 1 },
        { 1: 0, 2: 1 }, // both carbons; only pool 0 has a bonded explicit H
        atomElements,
        [6], // only pool 6 is explicit H
        hLayer,
        struct,
        resolveVarFn,
      );
      expect(specs.length).toBeGreaterThan(0);
      const allAtoms = specs.flatMap(s => s.atoms);
      expect(allAtoms).toContain(6); // drawn explicit H on carbon 0
      expect(allAtoms).not.toContain(0); // carbon 0 NOT filled
      expect(allAtoms).not.toContain(1); // carbon 1 (purely implicit) NOT filled
      const allBonds = specs.flatMap(s => s.bonds);
      expect(allBonds).toHaveLength(0); // no bonds ever
    });
  });
});

// ---------------------------------------------------------------------------
// quick 260902-gxx: the /b sub-token is a double bond — both ends AND the bond, parity colour.
// Fixture: fumaric acid InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+
// ---------------------------------------------------------------------------
describe('buildSubHoverSpecs bondStereo', () => {
  const FUMARIC = 'InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+';
  const bLayer = parseInchi(FUMARIC).find(l => l.type === 'b')!;
  // canonical → ketcher pool id; 8 heavy atoms
  const fumaricMap: AuxMap = { 1: 10, 2: 11, 3: 12, 4: 13, 5: 14, 6: 15, 7: 16, 8: 17 };

  function struct(bondId: number | null): StructLike {
    return {
      findBondId: vi.fn().mockReturnValue(bondId),
      bonds: { forEach: vi.fn() },
      atoms: { forEach: vi.fn() },
    } as unknown as StructLike;
  }

  it('lights both atoms and the bond between them in the plus colour', () => {
    const s = struct(42);
    const specs = buildSubHoverSpecs(
      { kind: 'bondStereo', stereoBond: [2, 1], sign: '+' },
      fumaricMap, {}, [], bLayer, s, resolveVarFn,
    );
    expect(specs).toEqual([{ atoms: [11, 10], bonds: [42], rgroupAttachmentPoints: [], color: '--c-stereo-plus' }]);
    expect(s.findBondId).toHaveBeenCalledWith(11, 10);
  });

  it('uses the minus colour for a minus sign and tolerates a missing bond id', () => {
    const specs = buildSubHoverSpecs(
      { kind: 'bondStereo', stereoBond: [2, 1], sign: '-' },
      fumaricMap, {}, [], bLayer, struct(null), resolveVarFn,
    );
    expect(specs[0].bonds).toEqual([]);
    expect(specs[0].atoms).toEqual([11, 10]);
    expect(specs[0].color).toBe('--c-stereo-minus');
  });

  it('returns nothing when an end is not in the auxMap', () => {
    const specs = buildSubHoverSpecs(
      { kind: 'bondStereo', stereoBond: [2, 99], sign: '+' },
      fumaricMap, {}, [], bLayer, struct(42), resolveVarFn,
    );
    expect(specs).toEqual([]);
  });

  it('layer-wide: an unspecified (?) bond is lit neutral, not as a minus', () => {
    const qLayer: Layer = { ...bLayer, text: '2-1?' };
    const layers: Layer[] = [
      { type: 'formula', prefix: '', text: 'C4H4O4', atoms: [], bonds: [] },
      qLayer,
    ];
    const specs = buildHighlightSpecs(qLayer, null, fumaricMap, {}, [], layers, struct(42), resolveVarFn);
    expect(specs).toHaveLength(1);
    expect(specs[0].color).toBe('--c-stereo');
    expect(specs[0].bonds).toEqual([42]);
  });
});
