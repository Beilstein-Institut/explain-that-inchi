// @vitest-environment happy-dom
// src/lib tests default to the node environment because the rest of lib/ is
// pure. This one needs localStorage and window, so it opts in per-file rather
// than pulling every lib test into a DOM.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wipeSiteData, registerLeaveWipe } from '../leaveWipe';

// The privacy policy (§ 3 (2)–(4)) promises the site's browser storage is gone
// once the visitor leaves. These tests are what make that promise true.

/** Replaces a window/navigator property for one test; returns the undo. */
function stub(host: object, prop: string, value: unknown): () => void {
  const had = Object.prototype.hasOwnProperty.call(host, prop);
  const previous = Object.getOwnPropertyDescriptor(host, prop);
  Object.defineProperty(host, prop, { value, configurable: true, writable: true });
  return () => {
    if (had && previous) Object.defineProperty(host, prop, previous);
    else delete (host as Record<string, unknown>)[prop];
  };
}

function clearStores() {
  localStorage.clear();
  sessionStorage.clear();
}

describe('wipeSiteData', () => {
  beforeEach(clearStores);
  afterEach(clearStores);

  it('removes every ketcher-owned key, whatever the separator', () => {
    // The three Ketcher 3.17.1 uses: two separators plus a bare prefix match.
    localStorage.setItem('ketcher-opts', '{"bondLength":40}');
    localStorage.setItem('ketcher_editor_saved_settings', '{"zoom":1}');
    localStorage.setItem('ketcher-tmpls', '[]');

    wipeSiteData();

    expect(localStorage.getItem('ketcher-opts')).toBeNull();
    expect(localStorage.getItem('ketcher_editor_saved_settings')).toBeNull();
    expect(localStorage.getItem('ketcher-tmpls')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  // This is what widened: the old sweep only touched `ketcher`-prefixed keys, so
  // anything a future dependency wrote survived a promise that it would not.
  it('removes keys with no ketcher prefix too', () => {
    localStorage.setItem('ketcher-opts', '{}');
    localStorage.setItem('theme', 'dark');

    wipeSiteData();

    expect(localStorage.getItem('theme')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('empties sessionStorage', () => {
    sessionStorage.setItem('anything', 'x');

    wipeSiteData();

    expect(sessionStorage.length).toBe(0);
  });

  it('is a no-op on empty stores', () => {
    expect(() => wipeSiteData()).not.toThrow();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('deletes every named IndexedDB database', async () => {
    const deleteDatabase = vi.fn();
    const undo = stub(window, 'indexedDB', {
      databases: () => Promise.resolve([{ name: 'a' }, { name: 'b' }, {}]),
      deleteDatabase,
    });

    wipeSiteData();

    await vi.waitFor(() => expect(deleteDatabase).toHaveBeenCalledTimes(2));
    expect(deleteDatabase).toHaveBeenCalledWith('a');
    expect(deleteDatabase).toHaveBeenCalledWith('b');
    undo();
  });

  it('deletes every Cache Storage entry', async () => {
    const del = vi.fn().mockResolvedValue(true);
    const undo = stub(window, 'caches', {
      keys: () => Promise.resolve(['v1', 'v2']),
      delete: del,
    });

    wipeSiteData();

    await vi.waitFor(() => expect(del).toHaveBeenCalledTimes(2));
    undo();
  });

  it('unregisters service workers when the origin is cross-origin isolated', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    const undoSw = stub(navigator, 'serviceWorker', { getRegistrations });
    const undoCoi = stub(window, 'crossOriginIsolated', true);

    wipeSiteData();

    await vi.waitFor(() => expect(unregister).toHaveBeenCalledTimes(1));
    undoCoi();
    undoSw();
  });

  // Load-bearing guard: without origin COOP/COEP, coi-serviceworker.js IS the
  // thing providing cross-origin isolation. Unregistering it would force its
  // register-and-reload dance on every single visit.
  it('leaves service workers alone when the origin is not cross-origin isolated', () => {
    const getRegistrations = vi.fn().mockResolvedValue([]);
    const undoSw = stub(navigator, 'serviceWorker', { getRegistrations });
    const undoCoi = stub(window, 'crossOriginIsolated', false);

    wipeSiteData();

    expect(getRegistrations).not.toHaveBeenCalled();
    undoCoi();
    undoSw();
  });

  it('throws nothing when indexedDB, caches and serviceWorker are all absent', () => {
    const undo = [
      stub(window, 'indexedDB', undefined),
      stub(window, 'caches', undefined),
      stub(navigator, 'serviceWorker', undefined),
      stub(window, 'crossOriginIsolated', true),
    ];

    expect(() => wipeSiteData()).not.toThrow();

    for (const u of undo) u();
  });
});

describe('registerLeaveWipe', () => {
  // The beacon now fires on every pagehide, so happy-dom's real sendBeacon
  // would attempt a network request in tests that only care about the wipe.
  // Neutralise it by default; the beacon tests stub their own spy over this.
  let undoBeacon: () => void;

  beforeEach(() => {
    clearStores();
    undoBeacon = stub(navigator, 'sendBeacon', () => true);
  });
  afterEach(() => {
    undoBeacon();
    clearStores();
  });

  it('wipes storage when the page hides', () => {
    const unsubscribe = registerLeaveWipe();
    localStorage.setItem('ketcher-opts', '{}');

    window.dispatchEvent(new Event('pagehide'));

    expect(localStorage.getItem('ketcher-opts')).toBeNull();
    unsubscribe();
  });

  it('stops wiping once unsubscribed', () => {
    const unsubscribe = registerLeaveWipe();
    unsubscribe();
    localStorage.setItem('ketcher-opts', '{}');

    window.dispatchEvent(new Event('pagehide'));

    expect(localStorage.getItem('ketcher-opts')).toBe('{}');
  });

  // The URL must be derived from BASE_URL, never hardcoded: the app is built
  // with base=/explain-that-inchi/ but BASE_URL is '/' under vitest, so a
  // hardcoded deploy path fails right here.
  //
  // Unconditional by design — there is no opt-in to gate it. If this ever grows
  // a condition, the privacy policy's § 3 (4) claim stops being true.
  it('always beacons the leave endpoint under BASE_URL when the page hides', () => {
    const sendBeacon = vi.fn();
    const undo = stub(navigator, 'sendBeacon', sendBeacon);
    const unsubscribe = registerLeaveWipe();

    window.dispatchEvent(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}__leave`);
    expect(sendBeacon).toHaveBeenCalledWith('/__leave');
    unsubscribe();
    undo();
  });

  it('sends no beacon once unsubscribed', () => {
    const sendBeacon = vi.fn();
    const undo = stub(navigator, 'sendBeacon', sendBeacon);
    const unsubscribe = registerLeaveWipe();
    unsubscribe();

    window.dispatchEvent(new Event('pagehide'));

    expect(sendBeacon).not.toHaveBeenCalled();
    undo();
  });

  it('wipes even when sendBeacon is unavailable', () => {
    const undo = stub(navigator, 'sendBeacon', undefined);
    const unsubscribe = registerLeaveWipe();
    localStorage.setItem('ketcher-opts', '{}');

    expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow();

    expect(localStorage.getItem('ketcher-opts')).toBeNull();
    unsubscribe();
    undo();
  });
});
