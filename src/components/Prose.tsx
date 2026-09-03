// Card prose with glossary terms. Hovering or focusing a term floats its
// definition over the word; a click sticks that tooltip open so the pointer can
// leave (and gives touch devices, which never hover, the same affordance).
// .card is overflow:hidden, so the tooltip is portaled into <body> and placed
// fixed from the word's rect — no ancestor can clip or offset it.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY, markTerms } from '../lib/glossary';
import styles from './Prose.module.css';

interface ProseProps {
  text: string;
  className?: string;
  /** Wrapper element. 'p' for card bodies, 'span' where the parent is inline. */
  as?: 'p' | 'span';
}

const ESCAPE = 'Escape';
const GAP = 6; // px between the word and the tooltip
const TIP_MAX_HEIGHT = 120; // px of headroom needed to sit above the word
const VIEWPORT_PAD = 8; // px kept clear of the window's left and right edges

// The open definition keeps both the glossary key and the surface text the
// reader clicked, so the heading prints "E/Z", not a capitalised key ("E/z").
// `rect` is the anchor word measured at open time; `sticky` marks a clicked
// tooltip, which outlives the pointer leaving the word.
type Open = { key: string; label: string; rect: DOMRect; sticky: boolean };

/** How the tooltip was opened: hover/focus (transient) or click (sticky). */
type Mode = 'transient' | 'sticky';

// Vertical placement only; `left` is measured separately (see the layout effect).
// Anchoring the bottom edge for "above" needs no knowledge of the tooltip's height.
const placeY = (r: DOMRect): CSSProperties =>
  r.top >= TIP_MAX_HEIGHT
    ? { bottom: window.innerHeight - r.top + GAP }
    : { top: r.bottom + GAP };

export function Prose({ text, className, as = 'p' }: ProseProps) {
  const [open, setOpen] = useState<Open | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const rootRef = useRef<HTMLParagraphElement & HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  // New text = new card; an open definition from the old card must not linger.
  // Guarded through a ref so mounting writes no state (nothing to reset yet).
  const openRef = useRef<Open | null>(null);
  openRef.current = open;
  useEffect(() => {
    if (openRef.current) {
      setOpen(null);
    }
  }, [text]);

  // Centre the tooltip on the word, then pull it back inside the window. The
  // centring needs the tooltip's own width, which exists only once it has
  // rendered, so it renders hidden and is placed here — useLayoutEffect runs
  // before paint, so the reader never sees the unplaced position.
  useLayoutEffect(() => {
    if (!open || !tipRef.current) {
      setLeft(null);
      return;
    }
    const width = tipRef.current.getBoundingClientRect().width;
    const centred = open.rect.left + open.rect.width / 2 - width / 2;
    // max-width caps the tooltip at 100vw - 16px, so the clamp normally has
    // room; a viewport narrower than the tooltip falls back to the left pad.
    const max = window.innerWidth - width - VIEWPORT_PAD;
    setLeft(max < VIEWPORT_PAD ? VIEWPORT_PAD : Math.min(Math.max(centred, VIEWPORT_PAD), max));
  }, [open]);

  // Esc, outside click and any viewport shift close. Listeners exist only while
  // something is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    // Esc is also the tour's close key and the pin's release key (both on
    // window, which is downstream of document): stop it so one press closes
    // only the definition.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ESCAPE) {
        e.stopPropagation();
        setOpen(null);
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !tipRef.current?.contains(t)) {
        setOpen(null);
      }
    };
    // Scroll or resize staled the anchor rect. Closing is cheaper than
    // re-measuring, and the word is one hover away.
    const onShift = () => setOpen(null);

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onShift, { capture: true, passive: true });
    window.addEventListener('resize', onShift);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onShift, { capture: true });
      window.removeEventListener('resize', onShift);
    };
  }, [open]);

  // A click on the already-sticky term closes; anything else opens that term.
  const openAt = (el: HTMLElement, key: string, label: string, mode: Mode) => {
    const rect = el.getBoundingClientRect();
    const sticky = mode === 'sticky';
    setOpen(o =>
      o?.key === key && o.sticky ? (sticky ? null : o) : { key, label, rect, sticky },
    );
  };

  // Leaving the word only closes what hover/focus opened.
  const closeTransient = (key: string) => {
    setOpen(o => (o?.key === key && !o.sticky ? null : o));
  };

  const Tag = as;
  const segments = markTerms(text);

  return (
    <Tag ref={rootRef} className={className}>
      {segments.map((s, i) =>
        s.term ? (
          <button
            key={i}
            type="button"
            className={styles.term}
            data-glossary-term=""
            aria-expanded={open?.key === s.term}
            aria-describedby={open?.key === s.term ? tipId : undefined}
            onMouseEnter={e => openAt(e.currentTarget, s.term!, s.text, 'transient')}
            onMouseLeave={() => closeTransient(s.term!)}
            onFocus={e => openAt(e.currentTarget, s.term!, s.text, 'transient')}
            onBlur={() => closeTransient(s.term!)}
            onClick={e => openAt(e.currentTarget, s.term!, s.text, 'sticky')}
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
      {open &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            id={tipId}
            className={styles.tip}
            style={{
              ...placeY(open.rect),
              left: left ?? VIEWPORT_PAD,
              visibility: left === null ? 'hidden' : undefined,
            }}
          >
            <b>{open.label}</b> {GLOSSARY[open.key]}
          </span>,
          document.body,
        )}
    </Tag>
  );
}
