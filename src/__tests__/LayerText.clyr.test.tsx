// LayerText.clyr.test.tsx — Phase 15 Wave 0 component tests for c-layer hyphen/paren hover spans
// These tests FAIL in RED state because LayerText.tsx ConnectionText does not yet emit
// kind='bond' or kind='branch' SubHover payloads from hyphen/paren spans.
// They pass GREEN after Plan 15-02 refactors ConnectionText.renderSegment.
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

describe('LayerText ConnectionText — c-layer hyphen/paren hover spans (Phase 15)', () => {
  it('single-fragment: hyphen span emits kind="bond" with endpointPairs defined', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2-3(-4-5)-6" fragCounts={[6]} />
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
    expect(hit!.endpointPairs!.length).toBeGreaterThan(0);
  });

  it('single-fragment: open-paren span emits kind="branch" with bondPairs covering branch bonds', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2-3(-4-5)-6" fragCounts={[6]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    expect(openParens.length).toBeGreaterThan(0);
    fireEvent.mouseEnter(openParens[0]);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('branch');
    expect(hit!.bondPairs).toBeDefined();
    expect(hit!.bondPairs!.length).toBeGreaterThan(0);
  });

  it('single-fragment: close-paren span emits same bondPairs as matching open-paren', () => {
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2-3(-4-5)-6" fragCounts={[6]} />
    );
    const openParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === '(',
    );
    const closeParens = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.textContent === ')',
    );
    expect(openParens.length).toBeGreaterThan(0);
    expect(closeParens.length).toBeGreaterThan(0);

    fireEvent.mouseEnter(openParens[0]);
    const openHit = lastHit();
    vi.clearAllMocks();
    fireEvent.mouseEnter(closeParens[0]);
    const closeHit = lastHit();

    expect(openHit).toBeDefined();
    expect(closeHit).toBeDefined();
    expect(closeHit!.kind).toBe('branch');
    expect(closeHit!.bondPairs).toEqual(openHit!.bondPairs);
  });

  it('multi-fragment: hyphen in fragment 2 has offset-applied endpointPairs (canonical >= 6)', () => {
    // rawText "1-2-3(-4)-5;1-2-3", fragCounts [5,3]
    // Fragment 1: atoms 1-5 (offset 0). Fragment 2: atoms 1-3 offset by 5 → canonicals 6-8.
    // Hyphens in fragment 2 should have endpointPairs with values >= 6.
    const { container } = render(
      <LayerText layer={cLayer} rawText="1-2-3(-4)-5;1-2-3" fragCounts={[5, 3]} />
    );
    const allSpans = Array.from(container.querySelectorAll('span'));
    const allHyphens = allSpans.filter((s) => s.textContent === '-');
    // Find a hyphen in fragment 2 (after the ';' separator)
    // Fragment 2 has 2 hyphens (1-2 and 2-3). There are more hyphens in fragment 1.
    // The last two hyphens belong to fragment 2.
    expect(allHyphens.length).toBeGreaterThan(2);
    const frag2Hyphen = allHyphens[allHyphens.length - 1];
    fireEvent.mouseEnter(frag2Hyphen);
    const hit = lastHit();
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('bond');
    expect(hit!.endpointPairs).toBeDefined();
    // All canonical values in fragment 2 should be >= 6 (offset applied)
    const flat = hit!.endpointPairs!.flat();
    expect(flat.every((v) => v >= 6)).toBe(true);
  });

  it('N*: hyphen endpointPairs covers both fragment instances (length 2)', () => {
    // rawText "2*1-2(-3)-4", fragCounts [4,4]
    // First hyphen local 1→2: instance 1 → [1,2], instance 2 → [5,6]
    // endpointPairs should have 2 entries (one per fragment instance)
    const { container } = render(
      <LayerText layer={cLayer} rawText="2*1-2(-3)-4" fragCounts={[4, 4]} />
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
    expect(hit!.endpointPairs!.length).toBe(2);
  });
});
