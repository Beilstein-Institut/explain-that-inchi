// Card prose with glossary terms. Hovering or focusing a term floats its
// definition over the word; a click sticks that tooltip open so the pointer can
// leave (and gives touch devices, which never hover, the same affordance).
// .card is overflow:hidden, so the tooltip is portaled into <body> and placed
// fixed from the word's rect — no ancestor can clip or offset it.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
const VIEWPORT_PAD = 8; // px kept clear of every window edge

// The open definition keeps both the glossary key and the surface text the
// reader clicked, so the heading prints "E/Z", not a capitalised key ("E/z").
// `rect` is the anchor word measured at open time; `sticky` marks a clicked
// tooltip, which outlives the pointer leaving the word.
type Open = { key: string; label: string; rect: DOMRect; sticky: boolean };

/** How the tooltip was opened: hover/focus (transient) or click (sticky). */
type Mode = 'transient' | 'sticky';

// Keep one edge inside [PAD, extent - size - PAD]. A viewport smaller than the
// tooltip itself falls back to the near edge rather than a negative offset.
const clampPos = (v: number, size: number, extent: number) => {
  const max = extent - size - VIEWPORT_PAD;
  return max < VIEWPORT_PAD ? VIEWPORT_PAD : Math.min(Math.max(v, VIEWPORT_PAD), max);
};

export function Prose({ text, className, as = 'p' }: ProseProps) {
  const [open, setOpen] = useState<Open | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
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

  // Place the tooltip: centred on the word, above it by preference. Both axes
  // need the tooltip's own size, which exists only once it has rendered, so it
  // renders hidden and is positioned here — useLayoutEffect runs before paint,
  // so the reader never sees the unplaced position.
  useLayoutEffect(() => {
    if (!open || !tipRef.current) {
      setPos(null);
      return;
    }
    const { width, height } = tipRef.current.getBoundingClientRect();
    const r = open.rect;

    // Above unless the word sits too near the top; then below, unless that
    // overflows too — in which case above wins and the clamp takes over.
    const aboveFits = r.top - GAP - height >= VIEWPORT_PAD;
    const belowFits = r.bottom + GAP + height <= window.innerHeight - VIEWPORT_PAD;
    const top = !aboveFits && belowFits ? r.bottom + GAP : r.top - GAP - height;

    setPos({
      left: clampPos(r.left + r.width / 2 - width / 2, width, window.innerWidth),
      top: clampPos(top, height, window.innerHeight),
    });
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
              left: pos?.left ?? VIEWPORT_PAD,
              top: pos?.top ?? VIEWPORT_PAD,
              visibility: pos ? undefined : 'hidden',
            }}
          >
            <b>{open.label}</b> {GLOSSARY[open.key]}
          </span>,
          document.body,
        )}
    </Tag>
  );
}
