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
      hAtomPoolIds: [],
      inchiKey: '',
      hoverIdx: null,
      subHover: null,
      pinned: null,
      keyPinned: null,
      keyHoverKind: null,
      legendHover: null,
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

  // REVIEW W-01 / quick 260902-gxx: a hoverIdx left over from a molecule with more layers
  // points past the new array, so every chunk renders dimmed and none active until the
  // mouse moves. The data transition must drop both transient hover fields.
  it('setInchiData clears a stale hoverIdx and subHover', () => {
    useInchiStore.setState({ hoverIdx: 5, subHover: { kind: 'element', el: 'C' } });
    const fakeLayers: Layer[] = [
      { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] },
      { type: 'formula', prefix: '', text: 'CH4', atoms: [1], bonds: [] },
    ];

    useInchiStore.getState().setInchiData('InChI=1S/CH4/h1H4', fakeLayers, { 1: 0 }, { 1: 'C' });

    const state = useInchiStore.getState();
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

    it('resetAll clears pinned along with other fields', () => {
      useInchiStore.getState().setPinned({ idx: 1, sub: null });
      expect(useInchiStore.getState().pinned).not.toBeNull();

      useInchiStore.getState().resetAll();

      expect(useInchiStore.getState().pinned).toBeNull();
    });
  });

  describe('pinned state machine', () => {
    beforeEach(() => {
      // ensure pinned is null at start of each pin test
      useInchiStore.setState({ pinned: null, hoverIdx: null, subHover: null });
    });

    it('setPinned with layer-level payload stores idx and null sub', () => {
      useInchiStore.getState().setPinned({ idx: 0, sub: null });
      const state = useInchiStore.getState();
      expect(state.pinned).not.toBeNull();
      expect(state.pinned!.idx).toBe(0);
      expect(state.pinned!.sub).toBeNull();
    });

    it('setPinned with sub-token payload stores sub verbatim', () => {
      const hit: SubHover = { kind: 'atom', canonical: 3 };
      useInchiStore.getState().setPinned({ idx: 2, sub: hit });
      const state = useInchiStore.getState();
      expect(state.pinned!.idx).toBe(2);
      expect(state.pinned!.sub).toEqual(hit);
    });

    it('while pinned, setHover is a no-op (hoverIdx stays unchanged)', () => {
      useInchiStore.setState({ hoverIdx: 1 });
      useInchiStore.getState().setPinned({ idx: 0, sub: null });

      useInchiStore.getState().setHover(2);

      expect(useInchiStore.getState().hoverIdx).toBe(1);
    });

    it('while pinned, setSubHover is a no-op (subHover stays unchanged)', () => {
      const originalSub: SubHover = { kind: 'element', el: 'C' };
      useInchiStore.setState({ subHover: originalSub });
      useInchiStore.getState().setPinned({ idx: 0, sub: null });

      useInchiStore.getState().setSubHover({ kind: 'atom', canonical: 5 });

      expect(useInchiStore.getState().subHover).toEqual(originalSub);
    });

    it('clearPinned sets pinned back to null', () => {
      useInchiStore.getState().setPinned({ idx: 0, sub: null });
      expect(useInchiStore.getState().pinned).not.toBeNull();

      useInchiStore.getState().clearPinned();

      expect(useInchiStore.getState().pinned).toBeNull();
    });

    it('after clearPinned, setHover works again', () => {
      useInchiStore.getState().setPinned({ idx: 0, sub: null });
      useInchiStore.getState().clearPinned();

      useInchiStore.getState().setHover(3);

      expect(useInchiStore.getState().hoverIdx).toBe(3);
    });

    it('after clearPinned, setSubHover works again', () => {
      useInchiStore.getState().setPinned({ idx: 0, sub: null });
      useInchiStore.getState().clearPinned();

      const hit: SubHover = { kind: 'atom', canonical: 7 };
      useInchiStore.getState().setSubHover(hit);

      expect(useInchiStore.getState().subHover).toEqual(hit);
    });
  });

  // Task 13: a key segment can be pinned so its card (and its glossary terms) stay
  // readable. The key pin NEVER touches hoverIdx/subHover — Invariant #2.
  describe('keyPinned state machine', () => {
    beforeEach(() => {
      useInchiStore.setState({ keyPinned: null, keyHoverKind: null, pinned: null });
    });

    it('starts null', () => {
      expect(useInchiStore.getState().keyPinned).toBeNull();
    });

    it('setKeyPinned stores the zone and mirrors it into keyHoverKind', () => {
      useInchiStore.getState().setKeyPinned('hash');
      const state = useInchiStore.getState();
      expect(state.keyPinned).toBe('hash');
      expect(state.keyHoverKind).toBe('hash');
    });

    it('while key-pinned, setKeyHoverKind is a no-op', () => {
      useInchiStore.getState().setKeyPinned('skeleton');
      useInchiStore.getState().setKeyHoverKind('protonation');
      expect(useInchiStore.getState().keyHoverKind).toBe('skeleton');
      useInchiStore.getState().setKeyHoverKind(null);
      expect(useInchiStore.getState().keyHoverKind).toBe('skeleton');
    });

    it('clearKeyPinned lets setKeyHoverKind through again', () => {
      useInchiStore.getState().setKeyPinned('skeleton');
      useInchiStore.getState().clearKeyPinned();
      expect(useInchiStore.getState().keyPinned).toBeNull();
      useInchiStore.getState().setKeyHoverKind('hash');
      expect(useInchiStore.getState().keyHoverKind).toBe('hash');
    });

    it('setKeyPinned never writes a highlight target (Invariant #2)', () => {
      useInchiStore.setState({ hoverIdx: null, subHover: null });
      useInchiStore.getState().setKeyPinned('flagVersion');
      const state = useInchiStore.getState();
      expect(state.hoverIdx).toBeNull();
      expect(state.subHover).toBeNull();
    });

    it('setKeyPinned drops any live highlight target', () => {
      const hit: SubHover = { kind: 'element', el: 'C' };
      useInchiStore.setState({ hoverIdx: 2, subHover: hit });

      useInchiStore.getState().setKeyPinned('hash');

      const state = useInchiStore.getState();
      expect(state.hoverIdx).toBeNull();
      expect(state.subHover).toBeNull();
    });

    it('while key-pinned, setHover and setSubHover are no-ops', () => {
      useInchiStore.getState().setKeyPinned('hash');

      useInchiStore.getState().setHover(2);
      useInchiStore.getState().setSubHover({ kind: 'element', el: 'C' });

      const state = useInchiStore.getState();
      expect(state.hoverIdx).toBeNull();
      expect(state.subHover).toBeNull();
    });

    it('after clearKeyPinned, setHover works again', () => {
      useInchiStore.getState().setKeyPinned('hash');
      useInchiStore.getState().clearKeyPinned();

      useInchiStore.getState().setHover(2);

      expect(useInchiStore.getState().hoverIdx).toBe(2);
    });

    it('one pin at a time: setKeyPinned drops a layer pin', () => {
      useInchiStore.getState().setPinned({ idx: 1, sub: null });
      useInchiStore.getState().setKeyPinned('hash');
      expect(useInchiStore.getState().pinned).toBeNull();
    });

    it('one pin at a time: setPinned drops a key pin', () => {
      useInchiStore.getState().setKeyPinned('hash');
      useInchiStore.getState().setPinned({ idx: 1, sub: null });
      expect(useInchiStore.getState().keyPinned).toBeNull();
    });

    it('a data transition drops the key pin', () => {
      useInchiStore.getState().setKeyPinned('hash');
      useInchiStore.getState().setInchiData('InChI=1S/CH4/h1H4', [], {}, {});
      expect(useInchiStore.getState().keyPinned).toBeNull();
    });

    it('setInchiFailure and resetAll drop the key pin', () => {
      useInchiStore.getState().setKeyPinned('hash');
      useInchiStore.getState().setInchiFailure('nope');
      expect(useInchiStore.getState().keyPinned).toBeNull();

      useInchiStore.getState().setKeyPinned('hash');
      useInchiStore.getState().resetAll();
      expect(useInchiStore.getState().keyPinned).toBeNull();
    });
  });

  describe('audience', () => {
    it('defaults to chemist', () => {
      expect(useInchiStore.getState().audience).toBe('chemist');
    });
    it('setAudience switches and resetAll leaves it alone', () => {
      useInchiStore.getState().setAudience('plain');
      useInchiStore.getState().resetAll();
      expect(useInchiStore.getState().audience).toBe('plain');
      useInchiStore.getState().setAudience('chemist');
    });
  });
});
