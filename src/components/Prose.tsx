// Card prose with clickable glossary terms. The definition renders as a block
// directly under the text (not a floating popover): .card is overflow:hidden,
// and an in-flow block needs no positioning and works on touch.
import { useEffect, useRef, useState } from 'react';
import { GLOSSARY, markTerms } from '../lib/glossary';
import styles from './Prose.module.css';

interface ProseProps {
  text: string;
  className?: string;
  /** Wrapper element. 'p' for card bodies, 'span' where the parent is inline. */
  as?: 'p' | 'span';
}

const ESCAPE = 'Escape';

// The open definition keeps both the glossary key and the surface text the
// reader clicked, so the heading prints "E/Z", not a capitalised key ("E/z").
type Open = { key: string; label: string };

export function Prose({ text, className, as = 'p' }: ProseProps) {
  const [open, setOpen] = useState<Open | null>(null);
  const rootRef = useRef<HTMLParagraphElement & HTMLSpanElement>(null);

  // New text = new card; an open definition from the old card must not linger.
  // Guarded through a ref so mounting writes no state (nothing to reset yet).
  const openRef = useRef<Open | null>(null);
  openRef.current = open;
  useEffect(() => {
    if (openRef.current) {
      setOpen(null);
    }
  }, [text]);

  // Esc and outside click close. Listeners exist only while something is open.
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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

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
            aria-expanded={open?.key === s.term}
            onClick={() => setOpen(open?.key === s.term ? null : { key: s.term!, label: s.text })}
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
      {open && (
        <span role="note" className={styles.def}>
          <b>{open.label}</b> {GLOSSARY[open.key]}
        </span>
      )}
    </Tag>
  );
}
