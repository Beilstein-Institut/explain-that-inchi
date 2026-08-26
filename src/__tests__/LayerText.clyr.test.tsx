// LayerText.clyr.test.tsx — Phase 15 c-layer hyphen/paren hover spans
//
// CLYR-03 REGRESSION GUARD (clyr-03-paren-bonds):
// These fixtures use REAL InChI c-layer syntax. Real InChI encodes branch bonds by atom
// ADJACENCY, not by hyphen characters — a single-atom branch like "(4)" has NO internal
// hyphen. The previous fixtures used a FABRICATED syntax ("(-4-5)", "(-2)") with leading
// hyphens that never occur in real InChI; that masked the bug where parentheses are
// non-interactive on real molecules.
//
// Real fixtures used here:
//   - alanine c-layer  "1-2(4)3(5)6"          → branches (4),(5) ; bond 2-4 and 3-5
//   - nested example   "9(11(3)13)10(2)12"    → branches (11(3)13),(3),(2)
//
// RED expectation (current implementation): open/close paren spans for single-atom branches
// are plain non-interactive spans (no kind='branch' SubHover, no inchiSubtoken class), and
// the branch bond (e.g. 2->4) is never emitted. These tests FAIL until branch bondPairs are
// derived by adjacency.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LayerText } from '../components/LayerText';
import type { Layer, SubHover } from '../lib/parseInchi';

const mockSetSubHover = vi.fn();

vi.mock('../store', () => {
  const storeState = () => ({
    setSubHover: mockSetSubHover,
  });
  const useInchiStore = vi.fn() as ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof storeState> };
  useInchiStore.getState = () => storeState();
  return { useInchiStore };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// Minimal c-layer object — ConnectionText dispatches on layer.type === 'c'
const cLayer: Layer = { type: 'c', prefix: 'c', text: '', atoms: [], bonds: [] };

// Capture the SubHover argument of the most recent mouseEnter that produced a non-null payload.
function lastHit(): SubHover | undefined {
  const calls = mockSetSubHover.mock.calls.filter((c) => c[0] != null);
  return calls.length ? (calls[calls.length - 1][0] as SubHover) : undefined;
}

// Bond direction is meaningful here: branch bonds are emitted parent→child by adjacency
// (e.g. atom 11's sub-branch (3) is the bond 11→3). Preserve the emitted order so the
// directional expectations (11-3, 10-2, 9-11) compare correctly.
function pairKeys(pairs: [number, number][] | undefined): Set<string> {
  return new Set((pairs ?? []).map(([a, b]) => `${a}-${b}`));
}

describe('LayerText ConnectionText — REAL InChI c-layer hover spans (CLYR-03 regression)', () => {
  // alanine: InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,1H3,(H,7,8)... — c-layer "1-2(4)3(5)6"
  it('alanine "1-2(4)3(5)6": hyphen span still emits kind="bond"', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2(4)3(5)6" fragCounts={[6]} />
    );
    const hyphens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '-',
    );
    expect(hyphens.length).toBeGreaterThan(0);
    fireEvent.mouseEnter(hyphens[0]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('bond');
    expect(hit!.endpointPairs).toBeDefined();
    // first hyphen is the 1-2 bond
    expect(pairKeys(hit!.endpointPairs)).toEqual(new Set(['1-2']));
  });

  it('alanine "1-2(4)3(5)6": open-paren of branch (4) is INTERACTIVE and emits atom-2 incident bonds {1-2,2-4,2-3}', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2(4)3(5)6" fragCounts={[6]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    expect(openParens.length).toBe(2);

    const firstOpen = openParens[0];
    // Must be interactive (have hover handlers / inchiSubtoken styling).
    // In RED, single-atom branch parens are plain non-interactive spans.
    fireEvent.mouseEnter(firstOpen);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    expect(hit!.bondPairs).toBeDefined();
    // Branch (4) hangs off atom 2 → highlight ALL bonds incident to atom 2 (chain-in, branch, chain-out).
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['1-2', '2-4', '2-3']));
  });

  it('alanine "1-2(4)3(5)6": close-paren emits identical bondPairs as its open-paren', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2(4)3(5)6" fragCounts={[6]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    const closeParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === ')',
    );
    expect(openParens.length).toBe(2);
    expect(closeParens.length).toBe(2);

    fireEvent.mouseEnter(openParens[0]);
    const openHit = lastHit();
    vi.clearAllMocks();
    fireEvent.mouseEnter(closeParens[0]);
    const closeHit = lastHit();

    expect(openHit).toBeDefined();
    expect(closeHit).toBeDefined();
    expect(closeHit!.kind).toBe('branch');
    expect(pairKeys(closeHit!.bondPairs)).toEqual(pairKeys(openHit!.bondPairs));
    expect(pairKeys(closeHit!.bondPairs)).toEqual(new Set(['1-2', '2-4', '2-3']));
  });

  it('alanine "1-2(4)3(5)6": second branch (5) hangs off atom 3 → incident bonds {2-3,3-5,3-6}', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2(4)3(5)6" fragCounts={[6]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    expect(openParens.length).toBe(2);
    fireEvent.mouseEnter(openParens[1]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['2-3', '3-5', '3-6']));
  });

  // Nested branch: "9(11(3)13)10(2)12" — paren highlights the branch-POINT atom's incident bonds.
  // Outer branch hangs off atom 9 (only 9-11, 9-10 in this segment).
  // Inner branch hangs off atom 11 (9-11, 11-3, 11-13). Trailing off atom 10 (9-10, 10-2, 10-12).
  it('nested "9(11(3)13)10(2)12": outer open-paren hangs off atom 9 → incident bonds {9-11,9-10}', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="9(11(3)13)10(2)12" fragCounts={[13]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    // two outer-level branches plus one nested branch = 3 open parens
    expect(openParens.length).toBe(3);

    // openParens[0] is the outer branch "(11(3)13)" attached to atom 9
    fireEvent.mouseEnter(openParens[0]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['9-11', '9-10']));
  });

  it('nested "9(11(3)13)10(2)12": inner open-paren (3) on atom 11 → incident bonds {9-11,11-3,11-13}', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="9(11(3)13)10(2)12" fragCounts={[13]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    expect(openParens.length).toBe(3);
    // openParens[1] is the inner "(3)" attached to atom 11
    fireEvent.mouseEnter(openParens[1]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['9-11', '11-3', '11-13']));
  });

  it('nested "9(11(3)13)10(2)12": trailing branch (2) on atom 10 → incident bonds {9-10,10-2,10-12}', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="9(11(3)13)10(2)12" fragCounts={[13]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    expect(openParens.length).toBe(3);
    // openParens[2] is the "(2)" attached to atom 10
    fireEvent.mouseEnter(openParens[2]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['9-10', '10-2', '10-12']));
  });

  it('multi-fragment "1-2(4)3;1-2-3" frag2 branch offset-applied (canonical >= 7)', () => {
    // Fragment 1: 1-2(4)3 atoms 1-4 (offset 0). Fragment 2: 1-2-3 atoms offset by 4 → canonicals 5-7.
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2(4)3;1-2-3" fragCounts={[4, 3]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    // single branch (4) in fragment 1
    expect(openParens.length).toBe(1);
    fireEvent.mouseEnter(openParens[0]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    // fragment-1 branch (4) off atom 2 → incident bonds {1-2,2-4,2-3}
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['1-2', '2-4', '2-3']));
  });

  it('N* "2*1-2(3)4": branch-point incident bonds cover both fragment instances', () => {
    // "1-2(3)4" with 2 identical fragments, 4 atoms each.
    // Branch (3) off atom 2 → incident bonds {1-2,2-3,2-4}; per instance: {1-2,2-3,2-4} and {5-6,6-7,6-8}.
    const { container } = render(
      <LayerText layer={cLayer} rawText="2*1-2(3)4" fragCounts={[4, 4]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    expect(openParens.length).toBe(1);
    fireEvent.mouseEnter(openParens[0]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    expect(hit!.bondPairs).toBeDefined();
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['1-2', '2-3', '2-4', '5-6', '6-7', '6-8']));
  });

  // The branch point has to fan across the copies exactly as bondPairs do. If it
  // does not, the highlight lights the centre atom of the first copy and leaves
  // the second copy's centre dark — the same hole this fix closes, one level down.
  it('N* "2*1-2(3)4": branchPoints cover both fragment instances', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="2*1-2(3)4" fragCounts={[4, 4]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    fireEvent.mouseEnter(openParens[0]);
    const hit = lastHit();
    expect(hit!.branchPoints).toEqual([2, 6]);
  });

  it('single fragment "1-2(3)4": branchPoint is set, branchPoints is not', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2(3)4" fragCounts={[4]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    fireEvent.mouseEnter(openParens[0]);
    const hit = lastHit();
    expect(hit!.branchPoint).toBe(2);
    expect(hit!.branchPoints).toBeUndefined();
  });
});

// CLYR-06: the comma in a branch list. Choline's measured c-layer is "1-6(2,3)4-5-7"
// (InChI=1S/C5H14NO/c1-6(2,3)4-5-7/h7H,4-5H2,1-3H3/q+1) — atom 6 is the quaternary
// nitrogen, 2 and 3 two of its methyls. The comma separates two sibling branches, so
// it names a pair of atoms that share an attachment but are NOT bonded to each other.
describe('LayerText ConnectionText — branch-list comma (CLYR-06)', () => {
  const CHOLINE_C = '1-6(2,3)4-5-7';

  function commaSpans(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll('span')).filter((s) => s.textContent === ',');
  }

  it('choline "1-6(2,3)4-5-7": the comma is interactive and emits kind="siblings"', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText={CHOLINE_C} fragCounts={[7]} />
    );
    const commas = commaSpans(container);
    expect(commas.length).toBe(1);

    fireEvent.mouseEnter(commas[0]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('siblings');
    expect(pairKeys(hit!.siblingPairs)).toEqual(new Set(['2-3']));
  });

  // A comma between a branch that ENDS in one atom and a branch that STARTS at another
  // takes the atoms either side of it in the string, exactly as the hyphen does.
  it('"1-6(2-8,3)4": the comma takes the atoms flanking it, 8 and 3', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-6(2-8,3)4" fragCounts={[8]} />
    );
    fireEvent.mouseEnter(commaSpans(container)[0]);
    expect(pairKeys(lastHit()!.siblingPairs)).toEqual(new Set(['8-3']));
  });

  it('multi-fragment "1-6(2,3)4;1-2(3,4)5": frag-2 comma is offset-applied', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-6(2,3)4;1-2(3,4)5" fragCounts={[6, 5]} />
    );
    const commas = commaSpans(container);
    expect(commas.length).toBe(2);
    fireEvent.mouseEnter(commas[1]);
    // Fragment 2 starts after 6 heavy atoms, so its local 3,4 are canonical 9,10.
    expect(pairKeys(lastHit()!.siblingPairs)).toEqual(new Set(['9-10']));
  });
});
