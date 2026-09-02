// LayerText.blayer.test.tsx — the /b layer is a list of DOUBLE BONDS, not stereocentres.
//
// Regression guard (quick 260902-gxx): `case 'b'` used to share ParityText with the t-layer,
// whose regex /(\d+)([-+?])/g reads fumaric acid's `2-1+` as "stereocentre at atom 1" and
// leaves the `2` inert. Each b token must be ONE hover target carrying both bond ends.
//
// Fixtures are real getInchi() output:
//   fumaric acid  InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1+
//   maleic acid   InChI=1S/C4H4O4/c5-3(6)1-2-4(7)8/h1-2H,(H,5,6)(H,7,8)/b2-1-
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

const bLayer: Layer = { type: 'b', prefix: 'b', text: '', atoms: [], bonds: [] };

function hoverable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('span')).filter(s =>
    s.className.includes('inchiSubtoken'),
  );
}

function hits(): SubHover[] {
  return mockSetSubHover.mock.calls.map(c => c[0]).filter((h): h is SubHover => h != null);
}

describe('LayerText BLayerText — /b tokens are double bonds', () => {
  it('fumaric "2-1+": the whole token is one hover target that names both atoms', () => {
    const { container } = render(<LayerText layer={bLayer} rawText="2-1+" fragCounts={[8]} />);
    const spans = hoverable(container);
    expect(spans).toHaveLength(1);
    expect(spans[0].textContent).toBe('2-1+');
    expect(spans[0].className).toContain('parityPlus');

    fireEvent.mouseEnter(spans[0]);
    expect(hits()).toEqual([{ kind: 'bondStereo', stereoBond: [2, 1], sign: '+' }]);
  });

  it('never emits a tetrahedral-stereo hit for a b token', () => {
    const { container } = render(<LayerText layer={bLayer} rawText="2-1+" fragCounts={[8]} />);
    hoverable(container).forEach(s => fireEvent.mouseEnter(s));
    expect(hits().some(h => h.kind === 'stereo')).toBe(false);
    // The leading atom is part of the hover target, not inert text.
    expect(container.textContent).toBe('2-1+');
  });

  it('maleic "2-1-": minus sign, minus colour', () => {
    const { container } = render(<LayerText layer={bLayer} rawText="2-1-" fragCounts={[8]} />);
    const [span] = hoverable(container);
    expect(span.className).toContain('parityMinus');
    fireEvent.mouseEnter(span);
    expect(hits()[0]).toEqual({ kind: 'bondStereo', stereoBond: [2, 1], sign: '-' });
  });

  it('unspecified "2-1?": hoverable, neutral colour', () => {
    const { container } = render(<LayerText layer={bLayer} rawText="2-1?" fragCounts={[8]} />);
    const [span] = hoverable(container);
    expect(span.className).not.toContain('parityPlus');
    expect(span.className).not.toContain('parityMinus');
    fireEvent.mouseEnter(span);
    expect(hits()[0].sign).toBe('?');
  });

  it('two components: the second token is offset by the first fragment\'s heavy-atom count', () => {
    const { container } = render(<LayerText layer={bLayer} rawText="2-1+;2-1-" fragCounts={[4, 4]} />);
    const spans = hoverable(container);
    expect(spans).toHaveLength(2);
    expect(container.textContent).toBe('2-1+;2-1-');
    fireEvent.mouseEnter(spans[1]);
    expect(hits()[0]).toEqual({
      kind: 'bondStereo',
      stereoBond: [6, 5],
      sign: '-',
      fragmentOffset: 4,
      componentIndex: 1,
    });
  });

  it('a pinned bondStereo with the same bond gets the pinned class', () => {
    const pinnedSub: SubHover = { kind: 'bondStereo', stereoBond: [2, 1], sign: '+' };
    const { container } = render(
      <LayerText layer={bLayer} rawText="2-1+" fragCounts={[8]} pinnedSub={pinnedSub} />,
    );
    expect(hoverable(container)[0].className).toContain('pinned');
  });
});
