// Click-anywhere / Esc release for whichever pin is set (layer or key).
// Listeners exist only while something is pinned. Two kinds of click are exempt:
// a pin target (the chunk/segment/sub-token itself — its own onClick owns the
// toggle, and releasing here first made it re-pin), and a glossary term or its
// tooltip (they are read *about* the pin).
import { useEffect } from 'react';
import { useInchiStore } from '../store';

export function usePinRelease(): void {
  const pinned = useInchiStore(state => state.pinned);
  const keyPinned = useInchiStore(state => state.keyPinned);

  // Phase 16: add click-anywhere and Esc listeners to release pin.
  // Listeners are added only while pinned and removed on unpin (T-16-01 mitigation).
  useEffect(() => {
    if (!pinned && !keyPinned) return;

    // Clearing a pin that is already null is harmless, so both run unconditionally.
    const release = () => {
      useInchiStore.getState().clearPinned();
      useInchiStore.getState().clearKeyPinned();
    };

    const handleClickAnywhere = (e: MouseEvent) => {
      const t = e.target as Element;
      // The pinned element toggles itself: clearing here would leave its own
      // bubble-phase handler seeing no pin, and it would pin straight back.
      if (t.closest?.('[data-pin-target]')) {
        return;
      }
      // A glossary term (or its floating tooltip, portaled to <body>) is read
      // *about* the pinned layer — clicking one must not throw the pin away.
      if (t.closest?.('[data-glossary-term]') || t.closest?.('[role="tooltip"]')) {
        return;
      }
      release();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        release();
      }
    };

    // Capture phase so a click that lands outside every pin target releases before
    // anything else can act on it. Clicks inside a pin target are skipped above.
    document.addEventListener('click', handleClickAnywhere, { capture: true });
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('click', handleClickAnywhere, { capture: true });
      window.removeEventListener('keydown', handleEsc);
    };
  }, [pinned, keyPinned]);
}
