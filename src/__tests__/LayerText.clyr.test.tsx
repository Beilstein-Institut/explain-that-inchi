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

  it('alanine "1-2(4)3(5)6": open-paren of single-atom branch (4) is INTERACTIVE and emits 2->4 bond', () => {
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
    // Branch (4) hangs off atom 2 → stem bond 2-4 (derived by adjacency, NOT by a hyphen).
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['2-4']));
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
    expect(pairKeys(closeHit!.bondPairs)).toEqual(new Set(['2-4']));
  });

  it('alanine "1-2(4)3(5)6": second branch (5) hangs off atom 3 → emits 3->5 bond', () => {
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
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['3-5']));
  });

  // Nested branch: "9(11(3)13)10(2)12"
  // Outer branch on atom 9: (11(3)13) → bonds 9-11, 11-3, 11-13.
  // Inner branch on atom 11: (3) → bond 11-3.
  it('nested "9(11(3)13)10(2)12": outer open-paren emits adjacency bonds 9-11, 11-3, 11-13', () => {
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
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['9-11', '11-3', '11-13']));
  });

  it('nested "9(11(3)13)10(2)12": inner open-paren (3) on atom 11 emits 11-3 bond', () => {
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
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['11-3']));
  });

  it('nested "9(11(3)13)10(2)12": trailing branch (2) on atom 10 emits 10-2 bond', () => {
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
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['10-2']));
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
    // fragment-1 branch (4) off atom 2 → 2-4
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['2-4']));
  });

  it('N* "2*1-2(3)4": branch bondPairs cover both fragment instances', () => {
    // "1-2(3)4" with 2 identical fragments, 4 atoms each.
    // Branch (3) off atom 2 → instance 1: 2-3, instance 2: 6-7.
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
    expect(pairKeys(hit!.bondPairs)).toEqual(new Set(['2-3', '6-7']));
  });
});
