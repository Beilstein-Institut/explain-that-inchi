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

export function Prose({ text, className, as = 'p' }: ProseProps) {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLParagraphElement & HTMLSpanElement>(null);

  // New text = new card; an open definition from the old card must not linger.
  useEffect(() => setOpen(null), [text]);

  // Esc and outside click close. Listeners exist only while something is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ESCAPE) {
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
            aria-expanded={open === s.term}
            onClick={() => setOpen(open === s.term ? null : s.term!)}
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
      {open && (
        <span role="note" className={styles.def}>
          <b>{open}</b> {GLOSSARY[open]}
        </span>
      )}
    </Tag>
  );
}
