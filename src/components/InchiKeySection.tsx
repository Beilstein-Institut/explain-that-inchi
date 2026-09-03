// InchiKeySection — the InChIKey display strip with color-coded hoverable segments.
// Mirror of InchiSection.tsx adapted for the InChIKey (D-12).
// Reads inchiKey from Zustand store; slices verbatim via parseInchiKey() offsets (Invariant #1).
// 5 colored segments, 4 hover zones (D-07/D-08), dimmed hyphens, copy button (D-11).
// NEVER calls setHover/setSubHover with anything but null — key segments must not
// trigger canvas highlights (Invariant #2 / D-04).
// Task 13: segments pin like InChI layers (keyPinned), so the frozen card's glossary
// terms stay reachable. The pin is card-only — still no canvas highlight.

import React, { useState, useRef, useEffect } from 'react';
import { useInchiStore } from '../store';
import type { KeyHoverZone } from '../store';
import { parseInchiKey } from '../lib/parseInchiKey';
import { activateProps } from '../lib/keyboardProps';
import { KEY_ZONE_COPY } from '../lib/inchiKeyInfo';
import type { InchiKeySegmentKind } from '../lib/parseInchiKey';
import styles from './InchiKeySection.module.css';

// Segment → color token mapping (D-01 / UI-SPEC).
// These are the base color tokens; inline style also applies the -bg variant when active.
// do NOT use swatchVar() — that takes a LayerType, not an InchiKeySegmentKind.
const SEGMENT_COLOR: Record<InchiKeySegmentKind, string> = {
  skeleton:    '--c-conn',
  hash:        '--c-stereo',
  flag:        '--c-version',
  version:     '--c-version',
  protonation: '--c-proton',
};

// Segment kind → hover zone mapping (D-07/D-08: 4 zones, flag+version combined).
const SEGMENT_ZONE: Record<InchiKeySegmentKind, KeyHoverZone> = {
  skeleton:    'skeleton',
  hash:        'hash',
  flag:        'flagVersion',
  version:     'flagVersion',
  protonation: 'protonation',
};

export function InchiKeySection() {
  const inchiKey = useInchiStore(state => state.inchiKey);
  const keyHoverKind = useInchiStore(state => state.keyHoverKind);
  const keyPinned = useInchiStore(state => state.keyPinned);
  const inchiError = useInchiStore(state => state.inchiError);

  // A pin freezes the zone the card reads; live hover drives it otherwise.
  const effZone = keyPinned ?? keyHoverKind;

  const segments = parseInchiKey(inchiKey);
  const isEmpty = segments.length === 0;

  const [copied, setCopied] = useState(false);

  // Guard against calling setCopied on an unmounted component (WR-02).
  // Reset to true on (re)mount so StrictMode's dev double-invoke (mount → cleanup →
  // mount) doesn't leave the ref stuck false, which would block setCopied(false).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inchiKey);
      setCopied(true);
      setTimeout(() => { if (mountedRef.current) setCopied(false); }, 3000);
    } catch {
      // Silent failure — clipboard API may be unavailable in some contexts
    }
  }

  return (
    <section className={styles.inchiKeySection} data-tour-id="inchikey" aria-label="InChIKey, segment by segment">
      <div
        className={styles.inchiKeyDisplay}
        data-empty={isEmpty ? 'true' : undefined}
        onMouseLeave={isEmpty ? undefined : () => {
          useInchiStore.getState().setKeyHoverKind(null);
        }}
      >
        {isEmpty && inchiError ? (
          // The InChI strip already names the problem; repeating it here would just
          // shout twice. This states the consequence and nothing more.
          <span className={styles.emptyHint}>No InChIKey without an InChI.</span>
        ) : isEmpty ? (
          <span className={styles.emptyHint}>Draw a molecule above to see its InChIKey.</span>
        ) : (
          <>
            <span className={styles.inchiPrefix}>InChIKey</span>
            {segments.map((seg, i) => {
              const zone = SEGMENT_ZONE[seg.kind];
              const isActive = effZone === zone;
              const isDim = effZone !== null && effZone !== zone;
              const isPinned = keyPinned === zone;
              const activate = () => {
                // Mirrors InchiSection's activate: toggle on the EXACT zone, so
                // clicking the pinned segment releases and clicking another moves the
                // pin in one click. usePinRelease skips clicks inside a pin target.
                const s = useInchiStore.getState();
                if (s.keyPinned === zone) {
                  s.clearKeyPinned();
                  return;
                }
                // setKeyPinned drops any live layer highlight itself (WR-01) — calling
                // setHover(null) after it would be swallowed by the store's own gate.
                s.setKeyPinned(zone);
              };
              const tokenBase = SEGMENT_COLOR[seg.kind];
              const tokenColor = `var(${tokenBase})`;
              const bgColor = `var(${tokenBase}-bg)`;

              // Insert dimmed hyphen before 'hash' segment (boundary at index 14)
              // and before 'protonation' segment (boundary at index 25).
              const needsHyphenBefore = seg.kind === 'hash' || seg.kind === 'protonation';

              return (
                <React.Fragment key={i}>
                  {needsHyphenBefore && (
                    <span className={styles.inchiSlash}>-</span>
                  )}
                  <span
                    className={[
                      styles.inchiLayer,
                      isActive ? styles.active : '',
                      isDim ? styles.dim : '',
                      isPinned ? styles.pinned : '',
                    ].filter(Boolean).join(' ')}
                    style={{
                      color: tokenColor,
                      ...(isActive ? { background: bgColor } : {}),
                    }}
                    // Key segments pin (Task 13) but still never highlight the canvas
                    // (INKEY-09). Tab reaches them, Enter/Space pins, focus alone shows
                    // the card — activateProps supplies the button semantics aria-pressed
                    // needs; there are no sub-tokens here for its arrow keys to walk.
                    data-pin-target=""
                    {...activateProps(activate)}
                    aria-pressed={isPinned}
                    // The raw hash characters are no name at all read aloud; the zone's
                    // short label is (mirrors the layer span's aria-label).
                    aria-label={`InChIKey ${KEY_ZONE_COPY[zone].label}`}
                    onClick={activate}
                    onBlur={() => useInchiStore.getState().setKeyHoverKind(null)}
                    onFocus={() => {
                      useInchiStore.getState().setKeyHoverKind(zone);
                      useInchiStore.getState().setHover(null);
                      useInchiStore.getState().setSubHover(null);
                    }}
                    onMouseEnter={() => {
                      useInchiStore.getState().setKeyHoverKind(zone);
                      // WR-01: hover sources are mutually exclusive — entering a key
                      // segment clears any active InChI-layer hover. These are state-clearing
                      // writes ONLY (clearing existing hover state to null); they do NOT
                      // create canvas highlights, so Invariant #2 is preserved. DO NOT remove.
                      useInchiStore.getState().setHover(null);
                      useInchiStore.getState().setSubHover(null);
                    }}
                  >
                    {inchiKey.slice(seg.start, seg.end)}
                  </span>
                </React.Fragment>
              );
            })}
            <button
              className={styles.copyBtn}
              onClick={handleCopy}
              aria-label="Copy InChIKey"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="4" width="8" height="10" rx="1.5" />
                <path d="M4 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v1" />
              </svg>
            </button>
            {copied && <span className={styles.copiedFeedback}>Copied!</span>}
            {keyPinned && (
              // Same wording as the InChI strip (both phrasings ship; CSS shows one).
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
