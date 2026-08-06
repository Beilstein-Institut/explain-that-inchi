// FeedbackDialog — native <dialog> modal for the feedback workflow.
// Receives dialogRef, onSubmit, and contextPreview from App.
// Owns no Ketcher refs and does not read the Zustand store.
// Implements D-03..D-11, D-15 from 10-CONTEXT.md.

import { useRef, useState } from 'react';
import type { FeedbackCategory, FeedbackContext, BuildFeedbackUrlResult } from '../lib/buildFeedbackUrl';
import styles from './FeedbackDialog.module.css';

interface FeedbackDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement>;
  onSubmit: (message: string, category: FeedbackCategory) => Promise<BuildFeedbackUrlResult>;
  contextPreview: FeedbackContext;
}

const CATEGORIES: FeedbackCategory[] = [
  'Bug',
  'Explanation wrong/confusing',
  'Highlighting wrong',
  'Suggestion',
  'General',
];

export function FeedbackDialog({ dialogRef, onSubmit, contextPreview }: FeedbackDialogProps) {
  const [category, setCategory] = useState<FeedbackCategory>('General');
  const [message, setMessage] = useState('');
  const [lastResult, setLastResult] = useState<BuildFeedbackUrlResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [clipboardFailed, setClipboardFailed] = useState(false);

  // Guard against calling setCopied on an unmounted dialog (pattern from InchiSection.tsx).
  const mountedRef = useRef(true);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  // mountedRef is set in a useEffect-like pattern — we use a ref directly since
  // FeedbackDialog is conditionally shown via showModal/close, not unmounted/remounted.
  mountedRef.current = true;

  async function handleSubmit() {
    const result = await onSubmit(message, category);
    // CRITICAL: click the anchor synchronously in the same tick after awaiting —
    // the user gesture persists across a microtask boundary (D-08, popup-safe).
    if (anchorRef.current) {
      anchorRef.current.href = result.url;
      anchorRef.current.click();
    }

    if (!result.truncated) {
      // Non-truncated: close dialog, reset form (D-09)
      dialogRef.current?.close();
      setCategory('General');
      setMessage('');
      setLastResult(null);
    } else {
      // Truncated: keep dialog open, reveal truncation UI (D-10)
      setLastResult(result);
    }
  }

  async function handleCopyFullBody() {
    if (!lastResult?.fullBody) return;
    try {
      await navigator.clipboard.writeText(lastResult.fullBody);
      setCopied(true);
      setTimeout(() => {
        if (mountedRef.current) setCopied(false);
      }, 3000);
    } catch {
      setClipboardFailed(true);
    }
  }

  function handleCancel() {
    dialogRef.current?.close();
    setLastResult(null);
    setClipboardFailed(false);
    setCopied(false);
  }

  // Context preview values with Phase 9 placeholders for empty context (D-15)
  const previewInchi = contextPreview.inchi || '(no structure loaded)';
  const previewSmiles = contextPreview.smiles || '(none)';
  const previewPreset = contextPreview.presetName || '(custom molecule)';
  const previewVersion = contextPreview.appVersion || '(unknown)';
  const previewUA = contextPreview.userAgent || '(unknown)';

  return (
    <dialog
      ref={dialogRef}
      className={styles.feedbackDialog}
      aria-labelledby="feedback-dialog-title"
    >
      <h2 id="feedback-dialog-title" className={styles.dialogTitle}>Send feedback</h2>
      <p className={styles.dialogIntro}>
        Tell us what&apos;s wrong or what could be better — your note opens a prefilled GitHub issue.
      </p>

      {/* Category radio group (D-03) */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldLabel}>Category</legend>
        {CATEGORIES.map((cat) => (
          <label key={cat} className={styles.radioRow}>
            <input
              type="radio"
              name="category"
              value={cat}
              checked={category === cat}
              onChange={() => setCategory(cat)}
              style={{ accentColor: 'var(--c-formula)' }}
            />
            {cat}
          </label>
        ))}
      </fieldset>

      {/* Message textarea (D-04) */}
      <p className={styles.fieldLabel}>Your message</p>
      <textarea
        className={styles.textarea}
        placeholder="What happened, or what would help?"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* Always-visible context preview (D-05, D-15) */}
      <p className={styles.fieldLabel}>What gets attached</p>
      <p className={styles.previewSubNote}>This is included with your issue, exactly as shown below.</p>
      <pre className={styles.contextPreview}>
        {`InChI: ${previewInchi}\nSMILES: ${previewSmiles}\nPreset: ${previewPreset}\nVersion: ${previewVersion}\nUser agent: ${previewUA}`}
      </pre>

      {/* Inline public-issue note (D-06) */}
      <p className={styles.publicNote}>
        Submitting opens a{' '}
        <strong style={{ color: 'var(--c-alert)' }}>public</strong>
        {' '}GitHub issue and requires a GitHub account.
      </p>

      {/* Truncation section — only when last submit was truncated (D-10) */}
      {lastResult?.truncated && (
        <div className={styles.truncationSection}>
          <p className={styles.truncationNote}>
            The InChI was shortened to fit the URL. Paste the full issue body in by hand.
          </p>
          <div className={styles.truncationActions}>
            <button
              type="button"
              className={styles.copyBodyBtn}
              onClick={handleCopyFullBody}
            >
              Copy full issue body
            </button>
            {copied && (
              <span className={styles.copiedFeedback}>Copied — now paste it into the issue.</span>
            )}
          </div>
          {clipboardFailed && (
            <pre className={styles.fallbackBody} aria-label="Full issue body — select and copy">
              {lastResult.fullBody}
            </pre>
          )}
        </div>
      )}

      {/* Action row */}
      <div className={styles.actionRow}>
        <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
          Cancel
        </button>
        <button type="button" className={styles.submitBtn} onClick={handleSubmit}>
          Open GitHub issue
        </button>
      </div>

      {/* Hidden anchor for popup-safe URL opening (D-08) */}
      <a
        ref={anchorRef}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </dialog>
  );
}
