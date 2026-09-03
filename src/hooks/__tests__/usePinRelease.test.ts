// Click-anywhere / Esc release now covers BOTH pins. The effect used to live inline in
// InchiSection and only knew about `pinned`; the key pin (Task 13) needs the same
// release, and a second copy of the listeners would be a second thing to keep in sync.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInchiStore } from '../../store';
import { usePinRelease } from '../usePinRelease';

const LAYER_PIN = { idx: 1, sub: null };

beforeEach(() => {
  useInchiStore.getState().resetAll();
  document.body.innerHTML = '';
});

function clickOn(target: Element) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function pressEsc() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

describe('usePinRelease', () => {
  it('a click anywhere releases a layer pin', () => {
    useInchiStore.getState().setPinned(LAYER_PIN);
    renderHook(() => usePinRelease());

    clickOn(document.body);

    expect(useInchiStore.getState().pinned).toBeNull();
  });

  it('a click anywhere releases a key pin', () => {
    useInchiStore.getState().setKeyPinned('hash');
    renderHook(() => usePinRelease());

    clickOn(document.body);

    expect(useInchiStore.getState().keyPinned).toBeNull();
  });

  it('a click on a glossary term releases neither pin', () => {
    const term = document.createElement('span');
    term.setAttribute('data-glossary-term', '');
    document.body.appendChild(term);

    useInchiStore.getState().setPinned(LAYER_PIN);
    renderHook(() => usePinRelease());
    clickOn(term);
    expect(useInchiStore.getState().pinned).toEqual(LAYER_PIN);

    act(() => useInchiStore.getState().setKeyPinned('hash'));
    clickOn(term);
    expect(useInchiStore.getState().keyPinned).toBe('hash');
  });

  it('Esc releases either pin', () => {
    useInchiStore.getState().setPinned(LAYER_PIN);
    renderHook(() => usePinRelease());
    pressEsc();
    expect(useInchiStore.getState().pinned).toBeNull();

    act(() => useInchiStore.getState().setKeyPinned('hash'));
    pressEsc();
    expect(useInchiStore.getState().keyPinned).toBeNull();
  });

  it('registers no listeners while nothing is pinned', () => {
    const onDoc = vi.spyOn(document, 'addEventListener');
    const onWin = vi.spyOn(window, 'addEventListener');

    renderHook(() => usePinRelease());

    expect(onDoc.mock.calls.filter(([type]) => type === 'click')).toHaveLength(0);
    expect(onWin.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0);
    onDoc.mockRestore();
    onWin.mockRestore();
  });
});
