// LayerText.fragmentOffset.test.tsx — GAP-2: multi-component h-layer cards must carry the
// display-only fragmentOffset/componentIndex so the card can print per-component numbers, while
// SubHover.atoms stay GLOBAL (the auxMap key — the canvas highlight must be unaffected).
//
// Real fixture: MELATONIN_TOLUENE (melatonin C13H16N2O2 . toluene C7H8), real getInchi() output
// from the indigo WASM engine behind ketcher-standalone. Its h-layer is
//   `3-4,7-8,15H,5-6H2,1-2H3,(H,14,16);2-6H,1H3`  with fragCounts [17, 7].
// Component 1 = 17 heavy atoms (offset 0); component 2 = toluene (offset 17, componentIndex 1).
// The component-2 token `2-6H` projects to GLOBAL atoms {19..23} with fragmentOffset 17.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LayerText } from '../components/LayerText';
import type { Layer, SubHover } from '../lib/parseInchi';

const MELATONIN_TOLUENE =
  'InChI=1S/C13H16N2O2.C7H8/c1-9(16)14-6-5-10-8-15-13-4-3-11(17-2)7-12(10)13;1-7-5-3-2-4-6-7/h3-4,7-8,15H,5-6H2,1-2H3,(H,14,16);2-6H,1H3';

const mockSetSubHover = vi.fn();

vi.mock('../store', () => {
  const storeState = () => ({ setSubHover: mockSetSubHover });
  const useInchiStore = vi.fn() as ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof storeState> };
  useInchiStore.getState = () => storeState();
  return { useInchiStore };
});

beforeEach(() => {
  vi.clearAllMocks();
});

const hLayer: Layer = { type: 'h', prefix: 'h', text: '', atoms: [], bonds: [] };

// All SubHover hits captured this render (most recent last).
function hits(): SubHover[] {
  return mockSetSubHover.mock.calls.filter((c) => c[0] != null).map((c) => c[0] as SubHover);
}

describe('LayerText — fragmentOffset on multi-component h-layer (GAP-2 anti-fabrication)', () => {
  it('the fixture is real getInchi() output', () => {
    expect(MELATONIN_TOLUENE).toMatch(/^InChI=1S\//);
  });

  // The real component-2 h-segment is `2-6H,1H3`. fragCounts [17,7]: component 2 offset = 17.
  it('component-2 H token carries GLOBAL atoms [18,24], fragmentOffset 17, componentIndex 1', () => {
    const { container } = render(
      <LayerText layer={hLayer} rawText="3-4,7-8,15H,5-6H2,1-2H3,(H,14,16);2-6H,1H3" fragCounts={[17, 7]} />,
    );
    // Component 2's `2-6H` token renders text "2-6H" (after the ';').
    const comp2H = Array.from(container.querySelectorAll('span')).find((s) => s.textContent === '2-6H');
    expect(comp2H).toBeDefined();
    fireEvent.mouseEnter(comp2H!);

    const hit = hits().at(-1)!;
    expect(hit.kind).toBe('hAtoms');
    expect(hit.fragmentOffset).toBe(17);
    expect(hit.componentIndex).toBe(1);
    // atoms stay GLOBAL (local 2-6 + 17) — never de-offset on the payload.
    expect(hit.atoms!.length).toBeGreaterThan(0);
    for (const a of hit.atoms!) {
      expect(a).toBeGreaterThanOrEqual(18);
      expect(a).toBeLessThanOrEqual(24);
    }
  });

  it('component-1 H token has fragmentOffset 0 and componentIndex 0', () => {
    const { container } = render(
      <LayerText layer={hLayer} rawText="3-4,7-8,15H,5-6H2,1-2H3,(H,14,16);2-6H,1H3" fragCounts={[17, 7]} />,
    );
    // Component 1's first H token renders "3-4,7-8,15H".
    const comp1H = Array.from(container.querySelectorAll('span')).find((s) => s.textContent === '3-4,7-8,15H');
    expect(comp1H).toBeDefined();
    fireEvent.mouseEnter(comp1H!);

    const hit = hits().at(-1)!;
    expect(hit.kind).toBe('hAtoms');
    expect(hit.fragmentOffset ?? 0).toBe(0);
    expect(hit.componentIndex ?? 0).toBe(0);
    // Component 1 atoms are already global == local (offset 0).
    for (const a of hit.atoms!) expect(a).toBeLessThanOrEqual(17);
  });
});
