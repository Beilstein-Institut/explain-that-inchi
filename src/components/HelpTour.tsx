// HelpTour — custom stepped spotlight overlay for guided onboarding.
// Zero runtime dependencies (D-01). Purely presentational: App owns open/close state.
// Registers resize/scroll/Esc listeners only while open; removes them on close.
// Implements spec §Feature 2 — Guided Help Tour (lines 72-118).

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './HelpTour.module.css';

export interface HelpTourProps {
  open: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  body: string;
  /** CSS selector that locates the anchor DOM element for this step */
  selector: string;
}

// 8 steps in order per spec lines 94-104
const STEPS: TourStep[] = [
  {
    title: 'The molecule editor',
    body: 'Draw or edit a structure here. The InChI updates live as you draw.',
    selector: '[data-tour-id="editor"]',
  },
  {
    title: 'Presets list',
    body: 'Click an example molecule to load it instantly into the editor.',
    selector: '.mol-list',
  },
  {
    title: 'The InChI string',
    body: 'The InChI is displayed here, colour-coded by layer. Each colour represents a different kind of chemical information.',
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: 'Hovering',
    body: 'Hover any coloured chunk to highlight the matching atoms or bonds in the drawing above.',
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: 'Pinning (click to freeze)',
    body: 'Click a chunk to lock the highlight — the view freezes so you can inspect the drawing. Click anywhere or press Esc to release.',
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: 'The InChIKey',
    body: 'The InChIKey is a fixed-length, hashed form of the InChI — useful for database searches and comparisons.',
    selector: '[data-tour-id="inchikey"]',
  },
  {
    title: 'The legend',
    body: 'Every layer type is listed here with its colour and a description of what chemical information it encodes.',
    selector: '[data-tour-id="legend"]',
  },
  {
    title: 'Reset / Help buttons',
    body: 'Reset clears the canvas. Help reopens this tour at any time.',
    selector: '.section-label-actions',
  },
];

const TOTAL = STEPS.length;

/** Viewport margin to keep callout away from edges, in pixels */
const MARGIN = 12;

/** Minimum space (px) needed above/below/beside target for the callout */
const CALLOUT_HEIGHT = 180;
const CALLOUT_WIDTH = 320;

type CalloutSide = 'above' | 'below' | 'right' | 'left';

function pickSide(rect: DOMRect): CalloutSide {
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceRight = window.innerWidth - rect.right;
  const spaceLeft = rect.left;

  if (spaceBelow >= CALLOUT_HEIGHT + MARGIN) return 'below';
  if (spaceAbove >= CALLOUT_HEIGHT + MARGIN) return 'above';
  if (spaceRight >= CALLOUT_WIDTH + MARGIN) return 'right';
  if (spaceLeft >= CALLOUT_WIDTH + MARGIN) return 'left';
  // Fallback: prefer whichever side has more room
  return spaceBelow >= spaceAbove ? 'below' : 'above';
}

function calloutPosition(rect: DOMRect, side: CalloutSide): React.CSSProperties {
  const halfW = CALLOUT_WIDTH / 2;
  switch (side) {
    case 'below': {
      // Center horizontally over target, clamp to viewport
      const rawLeft = rect.left + rect.width / 2 - halfW;
      const left = Math.max(MARGIN, Math.min(rawLeft, window.innerWidth - CALLOUT_WIDTH - MARGIN));
      return { top: rect.bottom + MARGIN, left };
    }
    case 'above': {
      const rawLeft = rect.left + rect.width / 2 - halfW;
      const left = Math.max(MARGIN, Math.min(rawLeft, window.innerWidth - CALLOUT_WIDTH - MARGIN));
      return { bottom: window.innerHeight - rect.top + MARGIN, left };
    }
    case 'right': {
      const top = Math.max(MARGIN, Math.min(rect.top, window.innerHeight - CALLOUT_HEIGHT - MARGIN));
      return { top, left: rect.right + MARGIN };
    }
    case 'left': {
      const top = Math.max(MARGIN, Math.min(rect.top, window.innerHeight - CALLOUT_HEIGHT - MARGIN));
      return { top, right: window.innerWidth - rect.left + MARGIN };
    }
  }
}

export function HelpTour({ open, onClose }: HelpTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // mountedRef: guard against setState after unmount
  const mountedRef = useRef(true);
  mountedRef.current = true;

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

  // Reset step index when tour opens
  useEffect(() => {
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

  const side = targetRect ? pickSide(targetRect) : 'below';
  const calloutStyle = targetRect ? calloutPosition(targetRect, side) : {};

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
        boxShadow: `0 0 0 ${SPREAD}px oklch(0.2 0.015 255 / 0.52)`,
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

        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepBody}>{step.body}</p>

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
