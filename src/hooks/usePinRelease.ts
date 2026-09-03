// Click-anywhere / Esc release for whichever pin is set (layer or key).
// Listeners exist only while something is pinned. Glossary terms and their
// tooltip are exempt from click release (they are read *about* the pin).
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
      // A glossary term (or its floating tooltip, portaled to <body>) is read
      // *about* the pinned layer — clicking one must not throw the pin away.
      const t = e.target as Element;
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

    // Use capture phase so the listener fires before any element's onClick.
    // The layer span's onClick checks getState().pinned — which is already cleared by
    // the time the bubble-phase handler runs — so no re-pin happens on the same gesture.
    document.addEventListener('click', handleClickAnywhere, { capture: true });
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('click', handleClickAnywhere, { capture: true });
      window.removeEventListener('keydown', handleEsc);
    };
  }, [pinned, keyPinned]);
}
