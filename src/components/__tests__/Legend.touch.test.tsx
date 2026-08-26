// The legend's tap path.
//
// Rows were hover-and-focus only. Touch has no hover, and iOS Safari does not reliably
// move focus to a non-form element on tap — so the legend was the one part of the page
// a touch user could not reach, and it is the only route to an explanation of a layer
// that is ABSENT from the drawn molecule. These tests hold the three ways in together.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Layer } from '../../lib/parseInchi';

// eslint-disable-next-line no-var
var spies: { setHover: ReturnType<typeof vi.fn>; setSubHover: ReturnType<typeof vi.fn>; setLegendHover: ReturnType<typeof vi.fn> };
// eslint-disable-next-line no-var
var mockLayers: Layer[];

vi.mock('../../store', () => {
  spies = { setHover: vi.fn(), setSubHover: vi.fn(), setLegendHover: vi.fn() };
  const state = () => ({ layers: mockLayers ?? [], ...spies });
  const useInchiStore = vi.fn((sel: (s: ReturnType<typeof state>) => unknown) => sel(state())) as
    ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof state> };
  useInchiStore.getState = () => state();
  return { useInchiStore };
});

import { Legend } from '../Legend';

// Benzene: the c and h layers are present, everything else in the legend is absent.
const BENZENE: Layer[] = [
  { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] },
  { type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] },
  { type: 'c', prefix: 'c', text: '1-2-4-6-5-3-1', atoms: [1, 2, 3, 4, 5, 6], bonds: [] },
  { type: 'h', prefix: 'h', text: '1-6H', atoms: [1, 2, 3, 4, 5, 6], bonds: [] },
];

beforeEach(() => {
  mockLayers = BENZENE;
  vi.clearAllMocks();
});

const row = (name: string) => screen.getByText(name).closest('div[tabindex]') as HTMLElement;

describe('a legend row responds to tap, not only hover and focus', () => {
  it('tapping a PRESENT row opens its card and drives the canvas highlight', () => {
    render(<Legend activeType={undefined} />);
    fireEvent.click(row('Connection'));
    expect(spies.setLegendHover).toHaveBeenCalledWith({ type: 'c', eg: expect.any(String) });
    expect(spies.setHover).toHaveBeenCalledWith(2); // index of the c layer
  });

  // The whole reason the legend exists on touch: these layers appear nowhere else.
  it('tapping an ABSENT row opens its static card and moves no highlight', () => {
    render(<Legend activeType={undefined} />);
    fireEvent.click(row('Isotope'));
    expect(spies.setLegendHover).toHaveBeenCalledWith({ type: 'i', eg: expect.any(String) });
    expect(spies.setHover).not.toHaveBeenCalled();
  });

  it('tap, hover and focus all do the same thing', () => {
    render(<Legend activeType={undefined} />);
    const target = row('Hydrogen');

    fireEvent.click(target);
    const fromTap = spies.setLegendHover.mock.calls.at(-1);
    vi.clearAllMocks();

    fireEvent.mouseEnter(target);
    const fromHover = spies.setLegendHover.mock.calls.at(-1);
    vi.clearAllMocks();

    fireEvent.focus(target);
    const fromFocus = spies.setLegendHover.mock.calls.at(-1);

    expect(fromTap).toEqual(fromHover);
    expect(fromHover).toEqual(fromFocus);
  });

  it('every row is reachable by tap, not just the present ones', () => {
    const { container } = render(<Legend activeType={undefined} />);
    const rows = container.querySelectorAll('div[tabindex="0"]');
    expect(rows.length).toBe(11); // all 11 InChI layer types
    for (const r of rows) {
      vi.clearAllMocks();
      fireEvent.click(r as HTMLElement);
      expect(spies.setLegendHover).toHaveBeenCalled();
    }
  });
});
