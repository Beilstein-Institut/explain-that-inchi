import { Editor } from 'ketcher-react';
import type { Ketcher, StructServiceProvider } from 'ketcher-core';
import { MOLECULES } from '../data/molecules';
import styles from './KetcherPanel.module.css';

interface KetcherPanelProps {
  isReady: boolean;
  onInit: (ketcher: Ketcher) => void;
  structServiceProvider: StructServiceProvider;
  selectedMolId: string | null;
  onMolSelect: (id: string) => void;
  isLoading: boolean;
  /** Opens the feedback dialog. Rendered as a trigger on the section-label row. */
  onFeedbackClick?: () => void;
  /** Clears the canvas and resets all app state to idle. Rendered to the left of Send feedback. */
  onResetClick?: () => void;
  /** Opens the guided Help tour. Rendered next to Reset on the section-label row. */
  onHelpClick?: () => void;
  /** Opens the Limitations dialog. Rendered immediately left of Send feedback. */
  onLimitationsClick?: () => void;
}

export function KetcherPanel({
  isReady,
  onInit,
  structServiceProvider,
  selectedMolId,
  onMolSelect,
  isLoading,
  onFeedbackClick,
  onResetClick,
  onHelpClick,
  onLimitationsClick,
}: KetcherPanelProps) {
  return (
    <section aria-labelledby="editor-heading">
      <div className="section-label">
        <h2 id="editor-heading">Draw a molecule to see its InChI</h2>
        <div className="section-label-actions">
          {onHelpClick && (
            <button type="button" className="help-trigger" onClick={onHelpClick}>
              Help
            </button>
          )}
          {onResetClick && (
            <button type="button" className="reset-trigger" onClick={onResetClick}>
              Reset
            </button>
          )}
          {onLimitationsClick && (
            <button type="button" className="limitations-trigger" onClick={onLimitationsClick}>
              Limitations
            </button>
          )}
          {onFeedbackClick && (
            <button type="button" className="feedback-trigger" onClick={onFeedbackClick}>
              Send feedback
            </button>
          )}
        </div>
      </div>
      <div className={styles.ketcher}>
        {/* Canvas column: Editor + loading overlay + canvas-meta overlay */}
        <div className={`${styles.canvasWrap} canvas-wrap`} data-tour-id="editor">
          {/* Editor is ALWAYS rendered — never conditional. Removing and remounting
              causes WASM to re-initialize from scratch. */}
          <Editor
            structServiceProvider={structServiceProvider}
            staticResourcesUrl={import.meta.env.BASE_URL}
            onInit={onInit}
            errorHandler={(msg) => console.error('Ketcher error:', msg)}
          />
          {/* Loading overlay sits position:absolute on top of the mounted Editor.
              Removed from DOM (not hidden) when isReady becomes true. */}
          {!isReady && (
            <div className={styles.loadingOverlay}>
              Loading editor…
            </div>
          )}

        </div>
        {/* Mol-list sidebar — hidden on narrow viewports via global CSS media query */}
        <div className="mol-list">
          <div className="mol-list-header">Examples</div>
          {MOLECULES.map(m => (
            <button
              key={m.id}
              className={'mol-item' + (selectedMolId === m.id ? ' active' : '')}
              onClick={() => !isLoading && onMolSelect(m.id)}
              disabled={isLoading}
            >
              <span className="mol-name">{m.name}</span>
              <span className="mol-formula">{m.formula}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
