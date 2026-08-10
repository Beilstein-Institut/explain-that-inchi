// @vitest-environment happy-dom
// src/lib tests default to the node environment because the rest of lib/ is
// pure. This one needs localStorage and window, so it opts in per-file rather
// than pulling every lib test into a DOM.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearEditorStorage, registerEditorStorageWipe } from '../clearEditorStorage';

// The privacy policy (§ 3 (2)) promises the editor's local storage is gone once
// the visitor leaves. These tests are what make that promise true.

describe('clearEditorStorage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('removes every ketcher-owned key, whatever the separator', () => {
    // The three Ketcher 3.17.1 uses: two separators plus a bare prefix match.
    localStorage.setItem('ketcher-opts', '{"bondLength":40}');
    localStorage.setItem('ketcher_editor_saved_settings', '{"zoom":1}');
    localStorage.setItem('ketcher-tmpls', '[]');

    clearEditorStorage();

    expect(localStorage.getItem('ketcher-opts')).toBeNull();
    expect(localStorage.getItem('ketcher_editor_saved_settings')).toBeNull();
    expect(localStorage.getItem('ketcher-tmpls')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('leaves keys belonging to anything else alone', () => {
    localStorage.setItem('ketcher-opts', '{}');
    localStorage.setItem('theme', 'dark');

    clearEditorStorage();

    expect(localStorage.getItem('ketcher-opts')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  // removeItem() reindexes the store, so a naive delete-while-walking loop
  // skips every other entry. This is the regression guard for that.
  it('clears all keys even when several match in a row', () => {
    for (let i = 0; i < 6; i += 1) {
      localStorage.setItem(`ketcher-key-${i}`, String(i));
    }

    clearEditorStorage();

    expect(localStorage.length).toBe(0);
  });

  it('is a no-op on an empty store', () => {
    expect(() => clearEditorStorage()).not.toThrow();
    expect(localStorage.length).toBe(0);
  });
});

describe('registerEditorStorageWipe', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('wipes editor storage when the page hides', () => {
    const unsubscribe = registerEditorStorageWipe();
    localStorage.setItem('ketcher-opts', '{}');

    window.dispatchEvent(new Event('pagehide'));

    expect(localStorage.getItem('ketcher-opts')).toBeNull();
    unsubscribe();
  });

  it('stops wiping once unsubscribed', () => {
    const unsubscribe = registerEditorStorageWipe();
    unsubscribe();
    localStorage.setItem('ketcher-opts', '{}');

    window.dispatchEvent(new Event('pagehide'));

    expect(localStorage.getItem('ketcher-opts')).toBe('{}');
  });
});
