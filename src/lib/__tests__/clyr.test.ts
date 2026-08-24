// clyr.test.ts — CLYR-01..05 library-tier tests.
//
// CLYR-03 REGRESSION GUARD (clyr-03-paren-bonds):
// The tokenizer/derivation fixtures below use REAL InChI c-layer syntax. Real InChI encodes
// branch bonds by atom ADJACENCY, not by hyphen characters. A single-atom branch like "(4)"
// has NO internal hyphen. The previous fixtures ("1-2-3(-4-5)-6", "(-2)") used a FABRICATED
// leading-hyphen syntax that never occurs in real InChI, which is why the bug (non-interactive
// parentheses on real molecules) went undetected.
//
// The deriveBranchBondPairs helper below replicates EXACTLY how LayerText.tsx derives a
// branch's bondPairs (via collectBranchHyphens over the tokens). In RED it returns [] for
// real single-atom branches because there are no internal hyphen tokens — that is the bug.
import { describe, it, expect, vi } from 'vitest';
import { buildSubHoverSpecs } from '../highlightUtils';
import type { StructLike } from '../highlightUtils';
import type { Layer, AuxMap, CLayerToken, SubHover } from '../parseInchi';
import { tokenizeCLayerSeg, collectBranchPointBonds, segmentBonds } from '../parseInchi';

// Replicates LayerText.tsx ConnectionText open-paren bondPairs derivation (single fragment,
// offset 0, no canonicalFn). This is the exact code path that decides whether a paren is
// interactive. Real-InChI branches with no internal hyphen yield [] here in RED.
function deriveBranchBondPairs(seg: string, openTokenIdx: number): [number, number][] {
  const tokens = tokenizeCLayerSeg(seg);
  const open = tokens[openTokenIdx];
  if (open.type !== 'open' || open.closeTokenIdx === -1) {
    throw new Error(`token ${openTokenIdx} is not a matched open paren`);
  }
  const branchHyphens = collectBranchPointBonds(tokens, openTokenIdx);
  return branchHyphens.flatMap((h) =>
    h.leftLocal == null || h.rightLocal == null
      ? []
      : [[h.leftLocal, h.rightLocal] as [number, number]],
  );
}

// Bond direction is meaningful here: branch bonds are emitted parent→child by adjacency
// (e.g. atom 11's sub-branch (3) is the bond 11→3). Preserve the emitted order so the
// directional expectations (11-3, 10-2, 9-11) compare correctly.
function pairKeys(pairs: [number, number][]): Set<string> {
  return new Set(pairs.map(([a, b]) => `${a}-${b}`));
}

// Index of the Nth 'open' token in a tokenized segment.
function openTokenIndex(tokens: CLayerToken[], nth: number): number {
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'open') {
      if (seen === nth) return i;
      seen++;
    }
  }
  throw new Error(`no open token #${nth}`);
}

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

// Real alanine c-layer "1-2(4)3(5)6": branches (4) and (5) are SINGLE atoms with NO
// internal hyphen. The bond into each branch (2-4, 3-5) is encoded purely by adjacency.
describe('tokenizeCLayerSeg — alanine "1-2(4)3(5)6" (real InChI, adjacency branches)', () => {
  it('emits correct token types in order', () => {
    const tokens = tokenizeCLayerSeg('1-2(4)3(5)6');
    const types = tokens.map(t => t.type);
    expect(types).toEqual([
      'atom',  // 1
      'hyphen',// -
      'atom',  // 2
      'open',  // (
      'atom',  // 4
      'close', // )
      'atom',  // 3
      'open',  // (
      'atom',  // 5
      'close', // )
      'atom',  // 6
    ]);
  });

  it('atom tokens have correct localN values', () => {
    const tokens = tokenizeCLayerSeg('1-2(4)3(5)6');
    const atomTokens = tokens.filter(t => t.type === 'atom') as Array<{ type: 'atom'; localN: number }>;
    expect(atomTokens.map(t => t.localN)).toEqual([1, 2, 4, 3, 5, 6]);
  });

  it('open token for branch (4) has attachLocal=2 (adjacency parent), not a hyphen', () => {
    const tokens = tokenizeCLayerSeg('1-2(4)3(5)6');
    const oi = openTokenIndex(tokens, 0);
    const open = tokens[oi] as { type: 'open'; attachLocal: number | null; closeTokenIdx: number };
    expect(open.attachLocal).toBe(2);
    expect(open.closeTokenIdx).toBeGreaterThan(oi);
  });

  it('open token for branch (5) has attachLocal=3', () => {
    const tokens = tokenizeCLayerSeg('1-2(4)3(5)6');
    const oi = openTokenIndex(tokens, 1);
    const open = tokens[oi] as { type: 'open'; attachLocal: number | null };
    expect(open.attachLocal).toBe(3);
  });

  it('only ONE hyphen token exists (the 1-2 bond); branches carry no hyphens', () => {
    const tokens = tokenizeCLayerSeg('1-2(4)3(5)6');
    const hyphens = tokens.filter(t => t.type === 'hyphen');
    expect(hyphens).toHaveLength(1);
  });
});

// CLYR-03 (user-confirmed): a parenthesis highlights the bonds INCIDENT TO the
// branch-point atom (the atom the branch hangs off) — chain-in + branch + chain-out,
// typically three. NOT the whole substituent.
describe('branch bondPairs = branch-point atom incident bonds (CLYR-03)', () => {
  it('alanine "1-2(4)...": branch (4) hangs off atom 2 → incident bonds {1-2, 2-4, 2-3}', () => {
    const tokens = tokenizeCLayerSeg('1-2(4)3(5)6');
    const oi = openTokenIndex(tokens, 0);
    const pairs = deriveBranchBondPairs('1-2(4)3(5)6', oi);
    expect(pairKeys(pairs)).toEqual(new Set(['1-2', '2-4', '2-3']));
  });

  it('alanine "...3(5)6": branch (5) hangs off atom 3 → incident bonds {2-3, 3-5, 3-6}', () => {
    const tokens = tokenizeCLayerSeg('1-2(4)3(5)6');
    const oi = openTokenIndex(tokens, 1);
    const pairs = deriveBranchBondPairs('1-2(4)3(5)6', oi);
    expect(pairKeys(pairs)).toEqual(new Set(['2-3', '3-5', '3-6']));
  });

  it('nested "9(11(3)13)10(2)12": outer branch hangs off atom 9 → incident bonds {9-11, 9-10}', () => {
    const seg = '9(11(3)13)10(2)12';
    const tokens = tokenizeCLayerSeg(seg);
    const oi = openTokenIndex(tokens, 0);
    const pairs = deriveBranchBondPairs(seg, oi);
    expect(pairKeys(pairs)).toEqual(new Set(['9-11', '9-10']));
  });

  it('nested "9(11(3)13)...": inner branch (3) hangs off atom 11 → incident bonds {9-11, 11-3, 11-13}', () => {
    const seg = '9(11(3)13)10(2)12';
    const tokens = tokenizeCLayerSeg(seg);
    const oi = openTokenIndex(tokens, 1);
    const pairs = deriveBranchBondPairs(seg, oi);
    expect(pairKeys(pairs)).toEqual(new Set(['9-11', '11-3', '11-13']));
  });

  it('nested "...10(2)12": trailing branch (2) hangs off atom 10 → incident bonds {9-10, 10-2, 10-12}', () => {
    const seg = '9(11(3)13)10(2)12';
    const tokens = tokenizeCLayerSeg(seg);
    const oi = openTokenIndex(tokens, 2);
    const pairs = deriveBranchBondPairs(seg, oi);
    expect(pairKeys(pairs)).toEqual(new Set(['9-10', '10-2', '10-12']));
  });

  it('ciprofloxacin first branch hangs off atom 14 → exactly 3 incident bonds {11-14, 14-8, 14-21}', () => {
    const seg = '18-13-7-11-14(8-15(13)20-5-3-19-4-6-20)21(10-1-2-10)9-12(16(11)22)17(23)24';
    const tokens = tokenizeCLayerSeg(seg);
    const oi = openTokenIndex(tokens, 0);
    const pairs = deriveBranchBondPairs(seg, oi);
    expect(pairKeys(pairs)).toEqual(new Set(['11-14', '14-8', '14-21']));
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

describe('tokenizeCLayerSeg — "9(11(3)13)10(2)12" (real nested branches)', () => {
  it('nested open/close indices are mutually consistent', () => {
    const tokens = tokenizeCLayerSeg('9(11(3)13)10(2)12');
    const opens = tokens
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.type === 'open') as Array<{ t: { type: 'open'; closeTokenIdx: number }; i: number }>;
    const closes = tokens
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.type === 'close') as Array<{ t: { type: 'close'; openTokenIdx: number }; i: number }>;
    // "9(11(3)13)10(2)12" → opens: outer "(11(3)13)", inner "(3)", trailing "(2)"
    expect(opens).toHaveLength(3);
    expect(closes).toHaveLength(3);
    const outerOpen = opens[0];
    const innerOpen = opens[1];
    const trailingOpen = opens[2];
    // inner open's closeTokenIdx < outer open's closeTokenIdx (inner closes first)
    expect(innerOpen.t.closeTokenIdx).toBeLessThan(outerOpen.t.closeTokenIdx);
    // trailing branch is entirely after the outer branch closes
    expect(trailingOpen.i).toBeGreaterThan(outerOpen.t.closeTokenIdx);
    // every close cross-references a real open
    for (const c of closes) {
      const matchedOpen = tokens[c.t.openTokenIdx];
      expect(matchedOpen.type).toBe('open');
      expect((matchedOpen as { closeTokenIdx: number }).closeTokenIdx).toBe(c.i);
    }
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

describe('CLYR-03 branch open — spec.bonds=all branch bond IDs (no branchPoint → atoms=[])', () => {
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
// CLYR-03: the branch-point ATOM, not just its bonds.
//
// Real caffeine c-layer, measured through the WASM (same string as
// presetLayerCoverage.test.ts). Caffeine is C8H10N4O2, so canonical 1-8 are
// carbon, 9-12 nitrogen, 13-14 oxygen — and its branches hang off both:
// (13) off atom 7, a carbon; (3) off atom 12, a nitrogen.
//
// A branch hover highlights the star of bonds incident to the branch point.
// Ketcher draws a carbon as a bare vertex where those bonds meet at a point,
// and a heteroatom as a letter with clearance around it, so highlighting only
// the bonds LOOKS whole on a carbon branch point and severed on a nitrogen one:
// the atom at the centre of the star reads as a gap. The fix is element-blind —
// highlight the branch point itself — so both cases are asserted.
// ---------------------------------------------------------------------------

const CAFFEINE_C = '1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2';

// canonical 1-based → Ketcher 0-based, identity-shifted; caffeine has 14 heavy atoms.
const auxMapCaffeine: AuxMap = Object.fromEntries(
  Array.from({ length: 14 }, (_, i) => [i + 1, i]),
);

// Every bond in the segment, as pool-ID pairs, so findBondId resolves the real adjacency.
const bondsCaffeine: Array<[number, number]> = segmentBonds(tokenizeCLayerSeg(CAFFEINE_C))
  .map((b) => [auxMapCaffeine[b.leftLocal!], auxMapCaffeine[b.rightLocal!]] as [number, number]);

// Mirrors ConnectionText: bondPairs from the branch point's incident bonds, and the
// branch point itself from the open token's attachLocal.
function deriveBranchHover(seg: string, nthBranch: number): SubHover {
  const tokens = tokenizeCLayerSeg(seg);
  const oi = openTokenIndex(tokens, nthBranch);
  const open = tokens[oi];
  if (open.type !== 'open') throw new Error('not an open token');
  return {
    kind: 'branch',
    bondPairs: deriveBranchBondPairs(seg, oi),
    branchPoint: open.attachLocal ?? undefined,
  };
}

describe('CLYR-03 branch — the branch-point atom is highlighted with its bonds', () => {
  it('caffeine branch (3) hangs off atom 12, a nitrogen', () => {
    expect(deriveBranchHover(CAFFEINE_C, 2).branchPoint).toBe(12);
  });

  it('caffeine branch (13) hangs off atom 7, a carbon', () => {
    expect(deriveBranchHover(CAFFEINE_C, 1).branchPoint).toBe(7);
  });

  it('nitrogen branch point 12 is in spec.atoms — the gap the user sees', () => {
    const struct = makeMockStruct(bondsCaffeine);
    const specs = buildSubHoverSpecs(
      deriveBranchHover(CAFFEINE_C, 2),
      auxMapCaffeine, {}, [], cLayer, struct, resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([auxMapCaffeine[12]]);
    expect(specs[0].bonds.length).toBeGreaterThan(1);
  });

  it('carbon branch point 7 is in spec.atoms too — the fix does not read the element', () => {
    const struct = makeMockStruct(bondsCaffeine);
    const specs = buildSubHoverSpecs(
      deriveBranchHover(CAFFEINE_C, 1),
      auxMapCaffeine, {}, [], cLayer, struct, resolveVarFn,
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].atoms).toEqual([auxMapCaffeine[7]]);
  });

  it('every highlighted bond is incident to the highlighted atom', () => {
    const struct = makeMockStruct(bondsCaffeine);
    const specs = buildSubHoverSpecs(
      deriveBranchHover(CAFFEINE_C, 2),
      auxMapCaffeine, {}, [], cLayer, struct, resolveVarFn,
    );
    const centre = specs[0].atoms[0];
    for (const bid of specs[0].bonds) {
      const [a, b] = bondsCaffeine[bid];
      expect(a === centre || b === centre).toBe(true);
    }
  });

  it('a branch hover carrying no branchPoint still yields atoms: [] (unchanged)', () => {
    const struct = makeMockStruct(bondsA);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[3, 4], [4, 5]] },
      auxMapA, {}, [], cLayer, struct, resolveVarFn,
    );
    expect(specs[0].atoms).toEqual([]);
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

  // branchPoints fans the centre atom the same way bondPairs fan the bonds. Without
  // it the first copy's centre lights and the second copy's stays dark.
  it('branchPoints [2,6] → the centre atom of BOTH copies', () => {
    const auxMapD: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    const bondsD: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]];
    const struct = makeMockStruct(bondsD);
    const specs = buildSubHoverSpecs(
      { kind: 'branch', bondPairs: [[2, 3], [6, 7]], branchPoint: 2, branchPoints: [2, 6] },
      auxMapD, {}, [], cLayer, struct, resolveVarFn,
    );
    expect(specs[0].atoms).toEqual([1, 5]);
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
