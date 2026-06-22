// InchiSection — the primary InChI display strip with color-coded interactive layers.
// Port of design_handoff_explain_that_inchi/app.jsx lines 281-313.
// Reads layers and hoverIdx from Zustand store via selectors.
// D-06: inline style for accent colors (CSS var token per layer type).
// D-07: setSubHover wired on all sub-token spans (via LayerText).
// D-08: hint text from formula layer.

import React, { useState, useRef, useEffect } from 'react';
import { useInchiStore } from '../store';
import { swatchVar } from '../lib/layerInfo';
import { formulaFragmentCounts } from '../lib/parseInchi';
import { LayerText } from './LayerText';
import styles from './InchiSection.module.css';

export function InchiSection() {
  const inchi = useInchiStore(state => state.inchi);
  const layers = useInchiStore(state => state.layers);
  const hoverIdx = useInchiStore(state => state.hoverIdx);

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

  return (
    <section className={styles.inchiSection} data-tour-id="inchi-string">
      <div
        className={styles.inchiDisplay}
        data-empty={isEmpty ? 'true' : undefined}
        onMouseLeave={isEmpty ? undefined : () => {
          useInchiStore.getState().setHover(null);
          useInchiStore.getState().setSubHover(null);
        }}
      >
        {isEmpty ? (
          <span className={styles.emptyHint}>Draw a molecule above to see its InChI.</span>
        ) : (
          <>
            <span className={styles.inchiPrefix}>InChI=</span>
            {layers.map((l, i) => {
              const isActive = hoverIdx === i;
              const isDim = hoverIdx !== null && hoverIdx !== i;
              const tokenColor = `var(--c-${swatchVar(l.type)})`;
              const bgColor = `var(--c-${swatchVar(l.type)}-bg)`;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span className={styles.inchiSlash}>/</span>}
                  <span
                    className={[
                      styles.inchiLayer,
                      isActive ? styles.active : '',
                      isDim ? styles.dim : '',
                    ].filter(Boolean).join(' ')}
                    data-layer={l.type}
                    style={{
                      color: tokenColor,
                      ...(isActive ? { background: bgColor } : {}),
                    }}
                    onMouseEnter={() => {
                      useInchiStore.getState().setHover(i);
                      useInchiStore.getState().setSubHover(null);
                      // WR-01: hover sources are mutually exclusive — entering an InChI
                      // layer clears any active key-segment hover so the precedence chain
                      // in Explanation cannot show a stale key card over a layer hover.
                      useInchiStore.getState().setKeyHoverKind(null);
                    }}
                  >
                    {l.prefix && <span className={styles.prefix}>{l.prefix}</span>}
                    <LayerText layer={l} rawText={l.text} fragCounts={fragCounts} />
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
          </>
        )}
      </div>
    </section>
  );
}
