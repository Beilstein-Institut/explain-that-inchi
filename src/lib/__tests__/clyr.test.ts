// clyr.test.ts — Wave 0 failing tests for CLYR-01..05
// These tests FAIL in RED state (tokenizeCLayerSeg not yet exported; 'bond'/'branch' kinds not yet in SubHover).
// They will pass GREEN after Tasks 2 and 3 implement the library tier.
import { describe, it, expect, vi } from 'vitest';
import { buildSubHoverSpecs } from '../highlightUtils';
import type { StructLike } from '../highlightUtils';
import type { Layer, AuxMap } from '../parseInchi';
import { tokenizeCLayerSeg } from '../parseInchi';

// Identity mock — CSS var names passed through as-is for readable assertions
const resolveVarFn = (name: string): string => name;

// Fixture A: linear chain + branch segment "1-2-3(-4-5)-6"
// auxMap: canonical 1-based → Ketcher 0-based pool ID
const auxMapA: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
// bonds: pool ID pairs (matching auxMapA: 0-1=bond0, 1-2=bond1, 2-3=bond2, 3-4=bond3, 2-5=bond4)
const bondsA: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]];

// Fixture B: benzene ring closure segment "1-2-4-6-5-3-1"
const auxMapB: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
// Benzene ring bonds (pool IDs 0-5, ring closed by bond 5: 2→0)
const bondsB: Array<[number, number]> = [[0, 1], [1, 3], [3, 5], [5, 4], [4, 2], [2, 0]];

// Generic mock struct factory — bidirectional bond lookup by position in bonds array
function makeMockStruct(bonds: Array<[number, number]>): StructLike {
  return {
    findBondId: vi.fn((a: number, b: number) => {
      const idx = bonds.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
      return idx >= 0 ? idx : null;
    }),
    bonds: {
      forEach: vi.fn((cb) => {
        bonds.forEach(([begin, end], id) => cb({ begin, end }, id));
      }),
    },
    atoms: { forEach: vi.fn() },
  };
}

function makeLayer(overrides: Partial<Layer>): Layer {
  return { type: 'formula', prefix: '', text: '', atoms: [], bonds: [], ...overrides };
}

const cLayer = makeLayer({ type: 'c', prefix: 'c' });

// ---------------------------------------------------------------------------
// tokenizeCLayerSeg — pure tokenizer (Fixture E)
// ---------------------------------------------------------------------------

describe('tokenizeCLayerSeg — "1-2-3(-4-5)-6"', () => {
  it('emits 13 tokens with correct types in order', () => {
    const tokens = tokenizeCLayerSeg('1-2-3(-4-5)-6');
    expect(tokens).toHaveLength(13);
    const types = tokens.map(t => t.type);
    expect(types).toEqual([
      'atom',   // 1
      'hyphen', // -
      'atom',   // 2
      'hyphen', // -
      'atom',   // 3
      'open',   // (
      'hyphen', // -
      'atom',   // 4
      'hyphen', // -
      'atom',   // 5
      'close',  // )
      'hyphen', // -
      'atom',   // 6
    ]);
  });

  it('atom tokens have correct localN values', () => {
    const tokens = tokenizeCLayerSeg('1-2-3(-4-5)-6');
    const atomTokens = tokens.filter(t => t.type === 'atom') as Array<{ type: 'atom'; start: number; end: number; localN: number }>;
    expect(atomTokens.map(t => t.localN)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('hyphen tokens have correct leftLocal / rightLocal', () => {
    const tokens = tokenizeCLayerSeg('1-2-3(-4-5)-6');
    const hyphens = tokens.filter(t => t.type === 'hyphen') as Array<{ type: 'hyphen'; pos: number; leftLocal: number | null; rightLocal: number | null }>;
    expect(hyphens).toHaveLength(5);
    // hyphen 0: 1→2
    expect(hyphens[0].leftLocal).toBe(1);
    expect(hyphens[0].rightLocal).toBe(2);
    // hyphen 1: 2→3
    expect(hyphens[1].leftLocal).toBe(2);
    expect(hyphens[1].rightLocal).toBe(3);
    // hyphen 2: 3→4 (inside branch, first hyphen after open)
    expect(hyphens[2].leftLocal).toBe(3);
    expect(hyphens[2].rightLocal).toBe(4);
    // hyphen 3: 4→5 (inside branch)
    expect(hyphens[3].leftLocal).toBe(4);
    expect(hyphens[3].rightLocal).toBe(5);
    // hyphen 4: 3→6 (after close paren — leftLocal restored to attachLocal=3)
    expect(hyphens[4].leftLocal).toBe(3);
    expect(hyphens[4].rightLocal).toBe(6);
  });

  it('open token at idx 5 has closeTokenIdx === 10', () => {
    const tokens = tokenizeCLayerSeg('1-2-3(-4-5)-6');
    const openToken = tokens[5] as { type: 'open'; pos: number; attachLocal: number | null; closeTokenIdx: number };
    expect(openToken.type).toBe('open');
    expect(openToken.closeTokenIdx).toBe(10);
    expect(openToken.attachLocal).toBe(3);
  });

  it('close token at idx 10 has openTokenIdx === 5', () => {
    const tokens = tokenizeCLayerSeg('1-2-3(-4-5)-6');
    const closeToken = tokens[10] as { type: 'close'; pos: number; openTokenIdx: number };
    expect(closeToken.type).toBe('close');
    expect(closeToken.openTokenIdx).toBe(5);
  });
});

describe('tokenizeCLayerSeg — "1-2-4-6-5-3-1" (ring closure)', () => {
  it('emits 13 tokens, no open/close, all hyphens have non-null leftLocal + rightLocal', () => {
    const tokens = tokenizeCLayerSeg('1-2-4-6-5-3-1');
    expect(tokens).toHaveLength(13);
    const types = tokens.map(t => t.type);
    expect(types.every(t => t === 'atom' || t === 'hyphen')).toBe(true);
    const hyphens = tokens.filter(t => t.type === 'hyphen') as Array<{ type: 'hyphen'; leftLocal: number | null; rightLocal: number | null }>;
    for (const h of hyphens) {
      expect(h.leftLocal).not.toBeNull();
      expect(h.rightLocal).not.toBeNull();
    }
  });

  it('last hyphen has leftLocal=3, rightLocal=1 (ring closure bond)', () => {
    const tokens = tokenizeCLayerSeg('1-2-4-6-5-3-1');
    const hyphens = tokens.filter(t => t.type === 'hyphen') as Array<{ type: 'hyphen'; leftLocal: number | null; rightLocal: number | null }>;
    const lastHyphen = hyphens[hyphens.length - 1];
    expect(lastHyphen.leftLocal).toBe(3);
    expect(lastHyphen.rightLocal).toBe(1);
  });
});

describe('tokenizeCLayerSeg — "1-2-3(-4(-5)-6)-7" (nested branches)', () => {
  it('nested open/close indices are mutually consistent', () => {
    const tokens = tokenizeCLayerSeg('1-2-3(-4(-5)-6)-7');
    const opens = tokens
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.type === 'open') as Array<{ t: { type: 'open'; closeTokenIdx: number }; i: number }>;
    const closes = tokens
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.type === 'close') as Array<{ t: { type: 'close'; openTokenIdx: number }; i: number }>;
    expect(opens).toHaveLength(2);
    expect(closes).toHaveLength(2);
    // inner open's closeTokenIdx < outer open's closeTokenIdx
    const outerOpen = opens[0];
    const innerOpen = opens[1];
    expect(innerOpen.t.closeTokenIdx).toBeLessThan(outerOpen.t.closeTokenIdx);
    // cross-references are symmetric
    expect(closes[0].t.openTokenIdx).toBe(innerOpen.i);
    expect(closes[1].t.openTokenIdx).toBe(outerOpen.i);
  });
});

// ---------------------------------------------------------------------------
// CLYR-01: atom hover drops incident bonds
// ---------------------------------------------------------------------------

describe('CLYR-01 atom hover — buildSubHoverSpecs returns bonds:[]', () => {
  it('atom 3 (canonical=3) → spec.atoms=[2], spec.bonds=[]', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'atom', canonical: 3 },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([2]); // canonical 3 → pool 2
    expect(specs[0].bonds).toEqual([]);
  });

  it('atom hover color is --c-conn', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'atom', canonical: 1 },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].color).toBe('--c-conn');
  });
});

// ---------------------------------------------------------------------------
// CLYR-02: hyphen hover — single bond only
// ---------------------------------------------------------------------------

describe('CLYR-02 hyphen hover — spec.atoms=[], spec.bonds=[bondId]', () => {
  it('endpointPairs [[3,4]] resolves bond between pool 2 and pool 3', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'bond', endpointPairs: [[3, 4]] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([]);
    // canonical 3 → pool 2, canonical 4 → pool 3; bond at bondsA index 2 = [2,3]
    expect(specs[0].bonds).toEqual([2]);
  });

  it('color is --c-conn', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'bond', endpointPairs: [[1, 2]] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].color).toBe('--c-conn');
  });

  it('empty endpointPairs → returns []', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'bond', endpointPairs: [] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// CLYR-02: ring closure
// ---------------------------------------------------------------------------

describe('CLYR-02 ring closure — "1-2-4-6-5-3-1" last hyphen 3→1', () => {
  it('endpointPairs [[3,1]] resolves ring-closure bond', () => {
    const struct = makeMockStruct(bondsB);
    const specs = buildSubHoverSpecs(
      { kind: 'bond', endpointPairs: [[3, 1]] },
      auxMapB,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([]);
    expect(specs[0].bonds).toHaveLength(1);
    // pool 2 (canonical 3) → pool 0 (canonical 1): that's bondsB index 5 = [2,0]
    expect(specs[0].bonds[0]).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// CLYR-03: branch open — whole branch's bonds
// ---------------------------------------------------------------------------

describe('CLYR-03 branch open — spec.atoms=[], spec.bonds=all branch bond IDs', () => {
  it('bondPairs [[3,4],[4,5]] resolves two branch bonds', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4], [4, 5]] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([]);
    // canonical 3→4: pool 2→3 = bondsA index 2; canonical 4→5: pool 3→4 = bondsA index 3
    expect(specs[0].bonds).toContain(2);
    expect(specs[0].bonds).toContain(3);
    expect(specs[0].bonds).toHaveLength(2);
  });

  it('color is --c-conn', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4]] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].color).toBe('--c-conn');
  });

  it('empty bondPairs → returns []', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// CLYR-03: branch close — symmetric (same bondPairs as open)
// ---------------------------------------------------------------------------

describe('CLYR-03 branch close — identical bondPairs → identical spec', () => {
  it('close paren with same bondPairs [[3,4],[4,5]] produces identical spec as open', () => {
    const struct = makeMockStruct(bondsA);
    const openSpecs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4], [4, 5]] },
      auxMapA, {}, [], cLayer, struct, resolveVarFn,
    );
    const closeSpecs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4], [4, 5]] },
      auxMapA, {}, [], cLayer, struct, resolveVarFn,
    );
    expect(closeSpecs[0].bonds).toEqual(openSpecs[0].bonds);
    expect(closeSpecs[0].atoms).toEqual(openSpecs[0].atoms);
  });
});

// ---------------------------------------------------------------------------
// CLYR-03: single-atom branch "1-2-3(-4)-5"
// ---------------------------------------------------------------------------

describe('CLYR-03 single atom branch — only stem bond highlighted', () => {
  it('bondPairs [[3,4]] (single-atom branch) → one bond in spec', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4]] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].bonds).toHaveLength(1);
    // canonical 3→4: pool 2→3 = bondsA index 2
    expect(specs[0].bonds[0]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// CLYR-04: multi-fragment hyphen — offset applied
// ---------------------------------------------------------------------------

describe('CLYR-04 multi fragment hyphen — endpointPairs with offset applied', () => {
  it('fragment 2 (offset=5) hyphen local 1→2 → endpointPairs [[6,7]] → resolves in augmented auxMap', () => {
    // Fragment 2 atoms get canonical IDs 6..8 (offset 5 applied to local 1,2,3)
    const auxMapC: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    const bondsC: Array<[number, number]> = [[5, 6], [6, 7]]; // pool IDs for canonical 6→7, 7→8
    const struct = makeMockStruct(bondsC);
    const specs = buildSubHoverSpecs(
      { kind: 'bond', endpointPairs: [[6, 7]] },
      auxMapC,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([]);
    // canonical 6 → pool 5, canonical 7 → pool 6; bond 0 in bondsC
    expect(specs[0].bonds).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// CLYR-04: multi-fragment branch — offset applied
// ---------------------------------------------------------------------------

describe('CLYR-04 multi fragment branch — bondPairs with offset applied', () => {
  it('fragment 1 (offset=0) branch bondPairs [[3,4]] resolves using auxMapA', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4]] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    // canonical 3→4: pool 2→3 = bondsA index 2
    expect(specs[0].bonds).toEqual([2]);
  });
});

// ---------------------------------------------------------------------------
// CLYR-05: N* hyphen — endpointPairs covers both fragment instances
// ---------------------------------------------------------------------------

describe('CLYR-05 N-star hyphen — endpointPairs covers both fragment instances', () => {
  it('endpointPairs [[1,2],[5,6]] → two bond IDs from two fragment instances', () => {
    // Both fragments share same structure; offset 4 applies to second copy.
    // auxMapD: canonical → pool ID; bonds for both instances
    const auxMapD: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    const bondsD: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]];
    const struct = makeMockStruct(bondsD);
    const specs = buildSubHoverSpecs(
      { kind: 'bond', endpointPairs: [[1, 2], [5, 6]] },
      auxMapD,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([]);
    // canonical 1→2: pool 0→1 = bondsD index 0; canonical 5→6: pool 4→5 = bondsD index 3
    expect(specs[0].bonds).toContain(0);
    expect(specs[0].bonds).toContain(3);
    expect(specs[0].bonds).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// CLYR-05: N* branch — bondPairs covers both fragment instances
// ---------------------------------------------------------------------------

describe('CLYR-05 N-star branch — bondPairs covers both fragment instances', () => {
  it('bondPairs [[2,3],[6,7]] → two bond IDs from two fragment instances', () => {
    const auxMapD: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    const bondsD: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]];
    const struct = makeMockStruct(bondsD);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[2, 3], [6, 7]] },
      auxMapD,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([]);
    // canonical 2→3: pool 1→2 = bondsD index 1; canonical 6→7: pool 5→6 = bondsD index 4
    expect(specs[0].bonds).toContain(1);
    expect(specs[0].bonds).toContain(4);
    expect(specs[0].bonds).toHaveLength(2);
  });

  it('deduplication: duplicate bondPairs produce only one bond ID each', () => {
    const struct = makeMockStruct(bondsA);
    // bondPairs with intentional duplicate
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4], [3, 4]] },
      auxMapA,
      {},
      [],
      cLayer,
      struct,
      resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    // Only one unique bond ID (bondsA index 2 = [2,3] for canonical 3→4)
    expect(specs[0].bonds).toHaveLength(1);
  });
});
