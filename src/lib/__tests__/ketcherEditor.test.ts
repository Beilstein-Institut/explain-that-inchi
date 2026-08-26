// The adapter is the app's only door into Ketcher's private internals, so these tests
// pin both halves of its job: that it reads the real shape faithfully, and that it
// names the exact path when that shape moves. The second half is the point — the seven
// casts it replaced would have kept type-checking through a Ketcher upgrade.
import { describe, it, expect, vi } from 'vitest';
import type { Ketcher } from 'ketcher-core';
import {
  checkEditorShape, readCanvasAtoms, moleculeStruct, canvasSvgRoot, highlightApi,
  setRenderDefaults,
} from '../ketcherEditor';

// Mirrors the real internals: atoms is a Pool, keyed by non-sequential pool IDs.
// The gap (0, 1, 7) is deliberate — pool IDs are cumulative across draws, never indices,
// and a helper that quietly assumed indices would pass a 0,1,2 fixture.
function makeKetcher(over: Record<string, unknown> = {}): Ketcher {
  const pool = new Map<number, { label: string; pp: { x: number; y: number } }>([
    [0, { label: 'C', pp: { x: 1, y: -2 } }],
    [1, { label: 'D', pp: { x: 3, y: -4 } }],
    [7, { label: 'O', pp: { x: 5, y: -6 } }],
  ]);
  const molecule = { atoms: { size: pool.size, forEach: (cb: (a: unknown, id: number) => void) => pool.forEach((a, id) => cb(a, id)) } };
  return {
    editor: {
      render: { ctab: { molecule }, paper: { canvas: { tagName: 'svg' } } },
      highlights: { clear: vi.fn(), create: vi.fn() },
      setOptions: vi.fn(),
      ...over,
    },
  } as unknown as Ketcher;
}

describe('checkEditorShape names the exact path that moved', () => {
  it('passes on the real shape', () => {
    expect(checkEditorShape(makeKetcher())).toBeNull();
  });

  it.each([
    ['editor.setOptions', { setOptions: undefined }],
    ['editor.render', { render: undefined }],
    ['editor.render.ctab.molecule.atoms', { render: { ctab: { molecule: {} }, paper: { canvas: {} } } }],
    ['editor.render.paper.canvas', { render: { ctab: { molecule: { atoms: { forEach: () => {} } } }, paper: {} } }],
    ['editor.highlights', { highlights: {} }],
  ])('reports %s when it is gone', (path, broken) => {
    expect(checkEditorShape(makeKetcher(broken))).toBe(path);
  });

  it('reports the forEach separately from the pool itself', () => {
    const k = makeKetcher({ render: { ctab: { molecule: { atoms: { size: 0 } } }, paper: { canvas: {} } } });
    expect(checkEditorShape(k)).toBe('editor.render.ctab.molecule.atoms.forEach');
  });
});

describe('readCanvasAtoms', () => {
  it('returns pool IDs verbatim, never indices', () => {
    expect(readCanvasAtoms(makeKetcher()).map(a => a.poolId)).toEqual([0, 1, 7]);
  });

  it('carries label and coordinates for every atom', () => {
    expect(readCanvasAtoms(makeKetcher())).toEqual([
      { poolId: 0, label: 'C', x: 1, y: -2 },
      { poolId: 1, label: 'D', x: 3, y: -4 },
      { poolId: 7, label: 'O', x: 5, y: -6 },
    ]);
  });

  // The isotope labels are why the h-atom projection cannot test label === 'H'.
  it('preserves isotope labels the hydrogen projection depends on', () => {
    expect(readCanvasAtoms(makeKetcher()).map(a => a.label)).toContain('D');
  });

  it('is empty on an empty canvas', () => {
    const k = makeKetcher({ render: { ctab: { molecule: { atoms: { size: 0, forEach: () => {} } } }, paper: { canvas: {} } } });
    expect(readCanvasAtoms(k)).toEqual([]);
  });
});

describe('the remaining accessors hand back the live objects', () => {
  it('moleculeStruct is the struct the highlight builder reads', () => {
    const k = makeKetcher();
    expect(moleculeStruct(k)).toBe((k.editor as unknown as { render: { ctab: { molecule: unknown } } }).render.ctab.molecule);
  });

  it('canvasSvgRoot is the paper canvas', () => {
    expect(canvasSvgRoot(makeKetcher())).toEqual({ tagName: 'svg' });
  });

  it('highlightApi exposes clear and create', () => {
    const api = highlightApi(makeKetcher());
    expect(typeof api.clear).toBe('function');
    expect(typeof api.create).toBe('function');
  });

  it('setRenderDefaults sends the canonical options as JSON', () => {
    const k = makeKetcher();
    setRenderDefaults(k);
    const setOptions = (k.editor as unknown as { setOptions: ReturnType<typeof vi.fn> }).setOptions;
    expect(setOptions).toHaveBeenCalledWith(
      JSON.stringify({ bondLength: 40, bondLengthUnit: 'px', zoom: 1 }),
    );
  });
});
