// InchiSection — the primary InChI display strip with color-coded interactive layers.
// Port of design_handoff_explain_that_inchi/app.jsx lines 281-313.
// Reads layers and hoverIdx from Zustand store via selectors.
// D-06: inline style for accent colors (CSS var token per layer type).
// D-07: setSubHover wired on all sub-token spans (via LayerText).
// D-08: hint text from formula layer.
// Phase 16: click-to-pin — onClick on layers/sub-tokens pins/releases highlight.

import React, { useState, useRef, useEffect } from 'react';
import { useInchiStore } from '../store';
import { swatchVar } from '../lib/layerInfo';
import { formulaFragmentCounts } from '../lib/parseInchi';
import { LayerText } from './LayerText';
import { activateProps } from '../lib/keyboardProps';
import styles from './InchiSection.module.css';

export function InchiSection() {
  const inchi = useInchiStore(state => state.inchi);
  const layers = useInchiStore(state => state.layers);
  const hoverIdx = useInchiStore(state => state.hoverIdx);
  const pinned = useInchiStore(state => state.pinned);
  const inchiError = useInchiStore(state => state.inchiError);

  const formulaLayer = layers.find(l => l.type === 'formula');
  const fragCounts = formulaLayer ? formulaFragmentCounts(formulaLayer.text) : [];

  const [copied, setCopied] = useState(false);

  // Guard against calling setCopied on an unmounted component (WR-02).
  // Reset to true on (re)mount so StrictMode's dev double-invoke (mount → cleanup →
  // mount) doesn't leave the ref stuck false, which would block setCopied(false).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Phase 16: add click-anywhere and Esc listeners to release pin.
  // Listeners are added only while pinned and removed on unpin (T-16-01 mitigation).
  useEffect(() => {
    if (!pinned) return;

    const handleClickAnywhere = (e: MouseEvent) => {
      // A glossary term (or its floating tooltip, portaled to <body>) is read
      // *about* the pinned layer — clicking one must not throw the pin away.
      const t = e.target as Element;
      if (t.closest?.('[data-glossary-term]') || t.closest?.('[role="tooltip"]')) {
        return;
      }
      useInchiStore.getState().clearPinned();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useInchiStore.getState().clearPinned();
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
  }, [pinned]);

  const isEmpty = layers.length === 0;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inchi);
      setCopied(true);
      setTimeout(() => { if (mountedRef.current) setCopied(false); }, 3000);
    } catch {
      // Silent failure — clipboard API may be unavailable in some contexts
    }
  }

  // Phase 16: derive effective index from pinned or live hover for active/dim computation.
  const effectiveIdx = pinned ? pinned.idx : hoverIdx;

  return (
    <section className={styles.inchiSection} data-tour-id="inchi-string" aria-label="InChI string, layer by layer">
      <div
        className={styles.inchiDisplay}
        data-empty={isEmpty ? 'true' : undefined}
        onMouseLeave={isEmpty ? undefined : () => {
          useInchiStore.getState().setHover(null);
          useInchiStore.getState().setSubHover(null);
        }}
      >
        {isEmpty && inchiError ? (
          // A structure IS on the canvas — saying "draw a molecule" here would be a lie.
          <span className={styles.errorHint} role="status">{inchiError}</span>
        ) : isEmpty ? (
          <span className={styles.emptyHint}>Draw a molecule above to see its InChI.</span>
        ) : (
          <>
            <span className={styles.inchiPrefix}>InChI=</span>
            {layers.map((l, i) => {
              const isActive = effectiveIdx === i;
              const isDim = effectiveIdx !== null && effectiveIdx !== i;
              const tokenColor = `var(--c-${swatchVar(l.type)})`;
              const bgColor = `var(--c-${swatchVar(l.type)}-bg)`;
              // Phase 16: layer is pinned at layer level (no sub-token selected)
              const isLayerPinned = pinned !== null && pinned.idx === i && pinned.sub === null;
              const enter = () => {
                useInchiStore.getState().setHover(i);
                useInchiStore.getState().setSubHover(null);
                // WR-01: hover sources are mutually exclusive — entering an InChI
                // layer clears any active key-segment hover so the precedence chain
                // in Explanation cannot show a stale key card over a layer hover.
                useInchiStore.getState().setKeyHoverKind(null);
              };
              const activate = () => {
                // Any click while pinned only releases — the document capture
                // listener (added in the useEffect above) already called clearPinned()
                // before this bubble-phase handler fires, so getState().pinned is null.
                // On Enter/Space no capture listener runs, so this toggles the pin off.
                if (useInchiStore.getState().pinned) {
                  useInchiStore.getState().clearPinned();
                  return;
                }
                useInchiStore.getState().setPinned({ idx: i, sub: null });
              };
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span className={styles.inchiSlash}>/</span>}
                  <span
                    className={[
                      styles.inchiLayer,
                      isActive ? styles.active : '',
                      isDim ? styles.dim : '',
                      isLayerPinned ? styles.pinned : '',
                    ].filter(Boolean).join(' ')}
                    data-layer={l.type}
                    style={{
                      color: tokenColor,
                      ...(isActive ? { background: bgColor } : {}),
                      // Pass layer accent var for the pinned ring color (D-03)
                      '--layer-accent': tokenColor,
                    } as React.CSSProperties}
                    {...activateProps(activate)}
                    aria-label={`${l.prefix ?? ''}${l.text} — ${l.type} layer`}
                    onMouseEnter={enter}
                    onFocus={enter}
                    onBlur={(e) => {
                      // Arrowing into this layer's own sub-tokens is not leaving it —
                      // React's onBlur is focusout, so it fires on moves to children too.
                      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                      useInchiStore.getState().setHover(null);
                      useInchiStore.getState().setSubHover(null);
                    }}
                    onClick={activate}
                  >
                    {l.prefix && <span className={styles.prefix}>{l.prefix}</span>}
                    {/* rawText={l.text} kept verbatim — passthrough invariant (spec line 148, CONTEXT D) */}
                    <LayerText
                      layer={l}
                      rawText={l.text}
                      fragCounts={fragCounts}
                      layerIdx={i}
                      pinnedSub={pinned && pinned.idx === i ? pinned.sub : null}
                    />
                  </span>
                </React.Fragment>
              );
            })}
            <button
              className={styles.copyBtn}
              onClick={handleCopy}
              aria-label="Copy InChI to clipboard"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="4" width="8" height="10" rx="1.5" />
                <path d="M4 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v1" />
              </svg>
            </button>
            {copied && <span className={styles.copiedFeedback}>Copied!</span>}
            {pinned && (
              // Both phrasings ship; CSS shows one. On touch, pinning is the ONLY way
              // to open an explanation — hover does not exist — so the release
              // instruction is load-bearing on exactly the devices where "click" and
              // "Esc" name things the user does not have. display:none keeps the
              // hidden one out of the accessibility tree too, so nothing is read twice.
              <span className={styles.pinnedHint}>
                Pinned — <span className={styles.hintPointer}>click anywhere or press Esc</span>
                <span className={styles.hintTouch}>tap anywhere</span> to release.
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
