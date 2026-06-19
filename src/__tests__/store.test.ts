import { describe, it, expect, beforeEach } from 'vitest';

// These imports will fail until src/store.ts is created — RED phase
import { useInchiStore } from '../store';
import type { Layer, AuxMap, SubHover } from '../lib/parseInchi';

describe('useInchiStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useInchiStore.setState({
      inchi: '',
      layers: [],
      auxMap: {},
      atomElements: {},
      inchiKey: '',
      hoverIdx: null,
      subHover: null,
    });
  });

  it('has correct initial state', () => {
    const state = useInchiStore.getState();
    expect(state.inchi).toBe('');
    expect(state.layers).toEqual([]);
    expect(state.auxMap).toEqual({});
    expect(state.inchiKey).toBe('');
    expect(state.hoverIdx).toBeNull();
    expect(state.subHover).toBeNull();
  });

  it('setInchiData updates inchi, layers, and auxMap', () => {
    const fakeLayers: Layer[] = [
      { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] },
      { type: 'formula', prefix: '', text: 'C6H6', atoms: [1,2,3,4,5,6], bonds: [] },
    ];
    const fakeMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

    useInchiStore.getState().setInchiData('InChI=1S/C6H6/...', fakeLayers, fakeMap, {});

    const state = useInchiStore.getState();
    expect(state.inchi).toBe('InChI=1S/C6H6/...');
    expect(state.layers).toBe(fakeLayers);
    expect(state.auxMap).toBe(fakeMap);
  });

  it('setInchiData stores inchiKey verbatim — no reconstruction or transformation', () => {
    const fakeLayers: Layer[] = [
      { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] },
      { type: 'formula', prefix: '', text: 'C6H6', atoms: [1,2,3,4,5,6], bonds: [] },
    ];
    const fakeMap: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    const rawInchiKey = 'UHOVQNZJYSORNB-UHFFFAOYSA-N';

    useInchiStore.getState().setInchiData('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H', fakeLayers, fakeMap, {}, [], rawInchiKey);

    const state = useInchiStore.getState();
    expect(state.inchiKey).toBe(rawInchiKey);
  });

  it('setHover updates hoverIdx to a number', () => {
    useInchiStore.getState().setHover(3);
    expect(useInchiStore.getState().hoverIdx).toBe(3);
  });

  it('setHover updates hoverIdx to null', () => {
    useInchiStore.getState().setHover(3);
    useInchiStore.getState().setHover(null);
    expect(useInchiStore.getState().hoverIdx).toBeNull();
  });

  it('setSubHover updates subHover with atom kind', () => {
    const sub: SubHover = { kind: 'atom', canonical: 2 };
    useInchiStore.getState().setSubHover(sub);
    expect(useInchiStore.getState().subHover?.kind).toBe('atom');
    expect(useInchiStore.getState().subHover?.canonical).toBe(2);
  });

  it('setSubHover accepts null', () => {
    useInchiStore.getState().setSubHover({ kind: 'element', el: 'C' });
    useInchiStore.getState().setSubHover(null);
    expect(useInchiStore.getState().subHover).toBeNull();
  });

  it('getState returns all five v1 fields', () => {
    const state = useInchiStore.getState();
    expect('inchi' in state).toBe(true);
    expect('layers' in state).toBe(true);
    expect('auxMap' in state).toBe(true);
    expect('hoverIdx' in state).toBe(true);
    expect('subHover' in state).toBe(true);
  });

  it('getState returns all three action functions', () => {
    const state = useInchiStore.getState();
    expect(typeof state.setInchiData).toBe('function');
    expect(typeof state.setHover).toBe('function');
    expect(typeof state.setSubHover).toBe('function');
  });

  describe('resetAll', () => {
    it('resets all fields to idle after data and hover have been set', () => {
      // Set up non-idle state
      const fakeLayers: Layer[] = [
        { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] },
        { type: 'formula', prefix: '', text: 'CH4', atoms: [1], bonds: [] },
      ];
      const fakeMap: AuxMap = { 1: 0 };

      useInchiStore.getState().setInchiData('InChI=1S/CH4/h1H4', fakeLayers, fakeMap, { 1: 'C' }, [2], 'VNWKTOKETHGBQD-UHFFFAOYSA-N');
      useInchiStore.getState().setHover(0);
      useInchiStore.getState().setSubHover({ kind: 'atom', canonical: 1 });
      useInchiStore.getState().setKeyHoverKind('skeleton');
      useInchiStore.getState().setLegendHover({ type: 'formula', eg: 'C6H6' });

      // Call resetAll
      useInchiStore.getState().resetAll();

      // Assert all fields at idle
      const state = useInchiStore.getState();
      expect(state.inchi).toBe('');
      expect(state.layers).toEqual([]);
      expect(state.auxMap).toEqual({});
      expect(state.atomElements).toEqual({});
      expect(state.hAtomPoolIds).toEqual([]);
      expect(state.inchiKey).toBe('');
      expect(state.hoverIdx).toBeNull();
      expect(state.subHover).toBeNull();
      expect(state.keyHoverKind).toBeNull();
      expect(state.legendHover).toBeNull();
    });

    it('is a safe no-op on an already-idle store (RESET-05)', () => {
      // Store is already at idle state after beforeEach reset
      expect(() => useInchiStore.getState().resetAll()).not.toThrow();

      const state = useInchiStore.getState();
      expect(state.inchi).toBe('');
      expect(state.layers).toEqual([]);
      expect(state.auxMap).toEqual({});
      expect(state.atomElements).toEqual({});
      expect(state.hAtomPoolIds).toEqual([]);
      expect(state.inchiKey).toBe('');
      expect(state.hoverIdx).toBeNull();
      expect(state.subHover).toBeNull();
      expect(state.keyHoverKind).toBeNull();
      expect(state.legendHover).toBeNull();
    });

    it('sets keyHoverKind to null even when it was previously non-null', () => {
      useInchiStore.getState().setKeyHoverKind('skeleton');
      expect(useInchiStore.getState().keyHoverKind).toBe('skeleton');

      useInchiStore.getState().resetAll();

      expect(useInchiStore.getState().keyHoverKind).toBeNull();
    });
  });
});
