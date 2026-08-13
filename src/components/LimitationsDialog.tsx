// LimitationsDialog — native <dialog> listing the five limitations most likely
// to be mistaken for bugs. Structure and CSS follow FeedbackDialog (same surface,
// title, backdrop and action row); the content comes from limitationsContent.ts.
//
// Read-only: owns no Ketcher refs, reads no store, and takes no input. The only
// action is closing, so there is no Cancel/confirm pair — just Close.

import { LIMITATIONS } from '../lib/limitationsContent';
import styles from './LimitationsDialog.module.css';

interface LimitationsDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement>;
}

export function LimitationsDialog({ dialogRef }: LimitationsDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className={styles.limitationsDialog}
      aria-labelledby="limitations-dialog-title"
    >
      <h2 id="limitations-dialog-title" className={styles.dialogTitle}>
        Limitations
      </h2>
      <ul className={styles.limitationList}>
        {LIMITATIONS.map((l) => (
          <li key={l.title} className={styles.limitationItem}>
            <p className={styles.limitationHead}>
              <span className={styles.limitationTitle}>{l.title}</span>
              <span className={styles.limitationSource}>{l.source}</span>
            </p>
            <p className={styles.limitationBody}>{l.body}</p>
          </li>
        ))}
      </ul>

      <p className={styles.moreNote}>
        A full list of limitations is in{' '}
        <code className={styles.filename}>LIMITATIONS.md</code> in the repository.
      </p>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => dialogRef.current?.close()}
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
