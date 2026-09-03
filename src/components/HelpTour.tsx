// HelpTour — custom stepped spotlight overlay for guided onboarding.
// Zero runtime dependencies (D-01). Purely presentational: App owns open/close state.
// Registers resize/scroll/Esc listeners only while open; removes them on close.
// Implements spec §Feature 2 — Guided Help Tour (lines 72-118).

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useInchiStore } from '../store';
import { pick } from '../lib/audience';
import type { Copy } from '../lib/audience';
import styles from './HelpTour.module.css';

export interface HelpTourProps {
  open: boolean;
  onClose: () => void;
}

export interface TourStep {
  title: Copy;
  body: Copy;
  /** CSS selector that locates the anchor DOM element for this step */
  selector: string;
}

// Tour steps in order (originally 8 per spec lines 94-104; the explanation-card
// step was added later). Exported so tests derive the count and titles from the
// data instead of hard-coding them — every previous step addition broke a dozen
// '<n> of 8' assertions that were only ever restating this array.
export const STEPS: TourStep[] = [
  {
    title: { chemist: 'The molecule editor', plain: 'The drawing area' },
    body: {
      chemist: 'Draw or edit a structure here. The InChI updates live as you draw.',
      plain: 'Draw or change a molecule here. The text below updates as you draw.',
    },
    selector: '[data-tour-id="editor"]',
  },
  {
    title: { chemist: 'Presets list', plain: 'Example molecules' },
    body: {
      chemist: 'Click an example molecule to load it instantly into the editor.',
      plain: 'Click a name to load a ready-made molecule.',
    },
    selector: '.mol-list',
  },
  {
    title: { chemist: 'The InChI string', plain: 'The InChI text' },
    body: {
      chemist: 'The InChI is displayed here, colour-coded by layer. Each colour represents a different kind of chemical information.',
      plain: 'This is the molecule written as text. Each colour is one kind of information.',
    },
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: { chemist: 'Hovering', plain: 'Hovering' },
    body: {
      chemist: 'Hover any coloured chunk to highlight the matching atoms or bonds in the drawing above.',
      plain: 'Point at a coloured piece to light up the matching atoms in the drawing.',
    },
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: { chemist: 'Pinning (click to freeze)', plain: 'Pinning' },
    body: {
      chemist: 'Click a chunk to lock the highlight — the view freezes so you can inspect the drawing. Click anywhere or press Esc to release.',
      plain: 'Click a piece to freeze the highlight. Click anywhere or press Esc to release it.',
    },
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: { chemist: 'The InChIKey', plain: 'The InChIKey' },
    body: {
      chemist: 'The InChIKey is a fixed-length, hashed form of the InChI — useful for database searches and comparisons.',
      plain: 'A short fixed-length fingerprint of the text above, handy for searching databases.',
    },
    selector: '[data-tour-id="inchikey"]',
  },
  {
    // Between the InChIKey and the legend, matching where the card sits on screen
    // — the tour reads down the page. It is also the step that explains where the
    // output of steps 4 and 5 actually appears, which was previously left implied.
    title: { chemist: 'The explanation card', plain: 'The explanation card' },
    body: {
      chemist: 'Whatever you point at is explained here — a whole layer, or a single character inside one. The text names the atoms it refers to, so you can read it against the drawing above. Click any underlined term for a definition.',
      plain: 'Whatever you point at is explained here in plain words. The text names the atoms it means. Click any underlined word for its meaning.',
    },
    selector: '[data-tour-id="explanation"]',
  },
  {
    title: { chemist: 'The legend', plain: 'The legend' },
    body: {
      chemist: 'Every layer type is listed here with its colour and a description of what chemical information it encodes. Hovering a row explains that layer in the card to its left, even for layers this molecule does not have.',
      plain: 'Every kind of layer is listed here with its colour. Hover a row to read about it, even if this molecule does not have it.',
    },
    selector: '[data-tour-id="legend"]',
  },
  {
    title: { chemist: 'Expert / Simple, Reset, Help', plain: 'Expert / Simple, Reset, Help' },
    body: {
      chemist: 'Expert / Simple sets how much chemistry the explanations assume. Reset clears the canvas. Help reopens this tour at any time.',
      plain: 'Expert / Simple picks how the explanations are written. Reset clears the drawing. Help reopens this tour.',
    },
    selector: '.section-label-actions',
  },
];

const TOTAL = STEPS.length;

/** Viewport margin to keep callout away from edges, in pixels */
const MARGIN = 12;

/**
 * First-paint estimates only. The card is sized by its own copy, and the longest
 * step body renders around 210px tall — taller than the 180px this used to assert.
 * Placement now measures the real card (see `size` state below) and only falls
 * back to these for the single frame before the first measurement lands.
 *
 * The old code trusted 180 as fact: `pickSide` allowed 'above' whenever 192px of
 * room existed, then the card grew upward by its true height, so any target with
 * 192–222px above it put the card off the top of the viewport. It was still in
 * the DOM and still passed every test — just not on screen.
 */
const CALLOUT_HEIGHT = 180;
const CALLOUT_WIDTH = 320;

type CalloutSide = 'above' | 'below' | 'right' | 'left';

/** Measured (or estimated) callout box. */
export interface CalloutSize { width: number; height: number; }
/** Viewport, passed in rather than read from `window` so this stays testable. */
export interface Viewport { width: number; height: number; }

export function pickSide(rect: DOMRect, size: CalloutSize, view: Viewport): CalloutSide {
  const spaceAbove = rect.top;
  const spaceBelow = view.height - rect.bottom;
  const spaceRight = view.width - rect.right;
  const spaceLeft = rect.left;

  if (spaceBelow >= size.height + MARGIN) return 'below';
  if (spaceAbove >= size.height + MARGIN) return 'above';
  if (spaceRight >= size.width + MARGIN) return 'right';
  if (spaceLeft >= size.width + MARGIN) return 'left';
  return spaceBelow >= spaceAbove ? 'below' : 'above';
}

/** Keep `v` within [min, max]; when the box exceeds the axis, prefer the near edge. */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));

/**
 * Always returns `top`/`left` — never `bottom`/`right`. Anchoring the card by its
 * far edge is what let it hang off-screen: `bottom` said where the card ended,
 * and its height then decided where it began. With `top` the clamp can guarantee
 * both edges are inside the viewport.
 */
export function calloutPosition(
  rect: DOMRect,
  side: CalloutSide,
  size: CalloutSize,
  view: Viewport,
): React.CSSProperties {
  const width = Math.min(size.width, view.width - 2 * MARGIN);
  const height = size.height;
  const maxLeft = view.width - width - MARGIN;
  const maxTop = view.height - height - MARGIN;
  const centredLeft = clamp(rect.left + rect.width / 2 - width / 2, MARGIN, maxLeft);

  switch (side) {
    case 'below':
      return { top: clamp(rect.bottom + MARGIN, MARGIN, maxTop), left: centredLeft };
    case 'above':
      return { top: clamp(rect.top - height - MARGIN, MARGIN, maxTop), left: centredLeft };
    case 'right':
      return { top: clamp(rect.top, MARGIN, maxTop), left: clamp(rect.right + MARGIN, MARGIN, maxLeft) };
    case 'left':
      return { top: clamp(rect.top, MARGIN, maxTop), left: clamp(rect.left - width - MARGIN, MARGIN, maxLeft) };
  }
}

export function HelpTour({ open, onClose }: HelpTourProps) {
  const audience = useInchiStore(state => state.audience);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // The card's real box. Copy length decides its height, so it is measured after
  // paint rather than assumed — the assumption is what pushed it off-screen.
  const calloutRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<CalloutSize>({
    width: CALLOUT_WIDTH,
    height: CALLOUT_HEIGHT,
  });

  // mountedRef: guard against setState after unmount
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const step = STEPS[stepIndex];

  const computeRect = useCallback(() => {
    if (!open) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (mountedRef.current) setTargetRect(rect);
    } else {
      if (mountedRef.current) setTargetRect(null);
    }
  }, [open, step.selector]);

  // Recompute rect on step change and on open
  useEffect(() => {
    if (!open) return;
    computeRect();
  }, [open, computeRect]);

  // Measure the card after every step change: each step's copy is a different
  // length, so a height measured on step 1 misplaces step 5. useLayoutEffect so
  // the corrected position is committed before the browser paints, otherwise the
  // card visibly jumps. The 1px guard stops a measurement that rounds to the same
  // box from looping (setSize -> render -> measure -> setSize).
  useLayoutEffect(() => {
    if (!open) return;
    const el = calloutRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return; // jsdom, or not laid out yet
    if (Math.abs(width - size.width) > 1 || Math.abs(height - size.height) > 1) {
      setSize({ width, height });
    }
  }, [open, stepIndex, targetRect, size.width, size.height]);

  // Register resize/scroll/Esc listeners only while open (T-16-04 mitigation)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('resize', computeRect);
    window.addEventListener('scroll', computeRect, { capture: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', computeRect);
      window.removeEventListener('scroll', computeRect, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, computeRect, onClose]);

  // Reset step index when tour opens — useLayoutEffect prevents one-frame flash of stale step
  useLayoutEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  if (!open) return null;

  const handleNext = () => {
    if (stepIndex >= TOTAL - 1) {
      onClose();
    } else {
      setStepIndex(s => s + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(s => s - 1);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if click landed on the dimmer itself (not callout)
    if (e.target === e.currentTarget) onClose();
  };

  const view = { width: window.innerWidth, height: window.innerHeight };
  const side = targetRect ? pickSide(targetRect, size, view) : 'below';
  // No target (selector missed): centre the card rather than leaving it
  // unpositioned at the viewport origin, where it used to land under the header.
  const calloutStyle: React.CSSProperties = targetRect
    ? calloutPosition(targetRect, side, size, view)
    : {
        top: Math.max(MARGIN, (view.height - size.height) / 2),
        left: Math.max(MARGIN, (view.width - size.width) / 2),
      };

  // Spotlight cutout via clip-path or box-shadow hole technique.
  // We use a large box-shadow approach: render a positioned div over the target
  // with a giant box-shadow spreading the dimmer outward.
  const SPREAD = 9999;
  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top - 4,
        left: targetRect.left - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
        borderRadius: '4px',
        boxShadow: `0 0 0 ${SPREAD}px oklch(from var(--ink) l c h / 0.52)`,
        pointerEvents: 'none',
        zIndex: 9998,
      }
    : {
        display: 'none',
      };

  return (
    // Dimmer backdrop — clicking closes the tour
    <div
      className={styles.dimmer}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Guided Help Tour"
    >
      {/* Spotlight cutout rendered as a hole in the dimmer via box-shadow */}
      <div style={spotlightStyle} aria-hidden="true" />

      {/* Callout card */}
      <div
        ref={calloutRef}
        className={styles.callout}
        style={{ ...calloutStyle, position: 'fixed' }}
        onClick={e => e.stopPropagation()}
        role="document"
      >
        <div className={styles.calloutHeader}>
          <span className={styles.stepCounter}>{stepIndex + 1} of {TOTAL}</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close tour"
          >
            ×
          </button>
        </div>

        <h3 className={styles.stepTitle}>{pick(step.title, audience)}</h3>
        <p className={styles.stepBody}>{pick(step.body, audience)}</p>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          <button
            type="button"
            className={styles.navBtnPrimary}
            onClick={handleNext}
          >
            {stepIndex >= TOTAL - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
