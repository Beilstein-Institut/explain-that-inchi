// Explanation — left card in the explanation panel, plus right Legend card.
// Port of design_handoff_explain_that_inchi/app.jsx lines 359-404.
// Reads layers, hoverIdx, atomElements from Zustand store.
// D-09: innerHTML for reading-code block (readingFor output).
// D-10: Idle state shows DEFAULT_INFO.title when no layer hovered.
// Pitfall 3: --accent always set — idle uses ink-faint, active uses layer accent.
// D-04a: Precedence: keyHoverKind (key segment) → hoverIdx (InChI layer) → idle.
// GUARDRAIL (Invariant #2): keyHoverKind branch is read-only; does NOT touch canvas highlights.

import { useInchiStore } from '../store';
import type { KeyHoverZone } from '../store';
import { formulaFragmentCounts } from '../lib/parseInchi';
import { LAYER_INFO, DEFAULT_INFO, readingFor, swatchVar } from '../lib/layerInfo';
import { KEY_ZONE_COPY } from '../lib/inchiKeyInfo';
import { Legend } from './Legend';
import styles from './Explanation.module.css';

// D-01: Key-segment zone → accent token mapping (no new CSS tokens; reuses existing palette).
// T-12-04 mitigated: key-segment card prose rendered as React text children (no innerHTML).
const KEY_ZONE_ACCENT: Record<KeyHoverZone, string> = {
  skeleton:    'var(--c-conn)',
  hash:        'var(--c-stereo)',
  flagVersion: 'var(--c-version)',
  protonation: 'var(--c-proton)',
};

export function Explanation() {
  const layers = useInchiStore(state => state.layers);
  const hoverIdx = useInchiStore(state => state.hoverIdx);
  const atomElements = useInchiStore(state => state.atomElements);
  // Phase 16: read pinned; when set, it overrides hoverIdx for the explanation card.
  const pinned = useInchiStore(state => state.pinned);
  // D-04a: read keyHoverKind; treat undefined the same as null (falsy-safe for test mocks).
  const rawKeyHoverKind = useInchiStore(state => state.keyHoverKind);
  const inchiKey = useInchiStore(state => state.inchiKey);
  // CR-01 (defensive): an empty key can never show a key-segment card, even if a stale
  // keyHoverKind slips through. Primary fix is the keyHoverKind reset in setInchiData.
  const keyHoverKind = inchiKey ? rawKeyHoverKind : null;
  // UAT-13: legend-hover payload — drives a static info card for layers not on the
  // canvas (the floating tooltip was removed). Lower precedence than a live layer.
  const legendHover = useInchiStore(state => state.legendHover);

  // Phase 16: pinned wins over live hover (spec line 56).
  // The store gate freezes hoverIdx while pinned, so effIdx already equals the pinned
  // target — this derivation makes intent explicit and handles belt-and-suspenders.
  const effIdx = pinned ? pinned.idx : hoverIdx;
  const layer = effIdx !== null ? layers[effIdx] : null;
  const info = layer ? LAYER_INFO[layer.type] : null;

  const presentTypes = new Set(layers.map(l => l.type));
  const legendInfo = legendHover ? LAYER_INFO[legendHover.type] : null;
  const legendAccent = legendHover ? `var(--c-${swatchVar(legendHover.type)})` : 'var(--ink-faint)';

  // Pitfall 3: always set --accent so card::before always has a value.
  // Idle: var(--ink-faint); active: layer accent color.
  const accentVar = layer ? `var(--c-${swatchVar(layer.type)})` : 'var(--ink-faint)';

  // Per-fragment heavy-atom counts — needed for correct multi-component
  // canonical offsetting in readingFor (c/h/t layers). Empty for single-fragment.
  const formulaLayer = layers.find(l => l.type === 'formula');
  const fragCounts = formulaLayer ? formulaFragmentCounts(formulaLayer.text) : [];

  // D-09: readingFor output — HTML string for the reading-code block.
  // readingFor() only emits <b> and <span style="color:var(--...)"> tags.
  // Inputs are parsed InChI data from WASM — no user-controlled free text.
  const reading = layer ? readingFor(layer, atomElements, fragCounts) : '';

  return (
    <div className={styles.explain}>
      {/* Left explanation card — D-04a precedence: key-hover → InChI-layer → idle */}
      {keyHoverKind ? (
        /* Key-segment card (D-03: extends shared panel; no standalone surface).
           T-12-04: prose is React text children (no innerHTML in this branch).
           T-12-05: read-only; canvas highlight path never reached (Invariant #2). */
        <div
          className={[styles.card, styles.active].join(' ')}
          style={{ '--accent': KEY_ZONE_ACCENT[keyHoverKind] } as React.CSSProperties}
        >
          {/* UAT-13: unified card header — title only, no tag row and no swatch dot
              (consistent across all card states; the left accent strip carries colour). */}
          <h3 className={styles.layerTitle}>{KEY_ZONE_COPY[keyHoverKind].title}</h3>
          <p className={styles.layerBody}>{KEY_ZONE_COPY[keyHoverKind].body}</p>
        </div>
      ) : layer ? (
        /* Active state: a live InChI layer is hovered (InChI string or a present
           legend row) — show layer info + readingFor output (title only). */
        <div
          className={[styles.card, styles.active].join(' ')}
          style={{ '--accent': accentVar } as React.CSSProperties}
        >
          <h3 className={styles.layerTitle}>{info!.title}</h3>
          <p className={styles.layerBody}>{info!.blurb}</p>
          <div className={styles.layerEg}>
            <span className={styles.lbl}>{info!.egLabel}</span>
            {/* D-09: innerHTML only for readingFor()/info.eg (emit known-safe <b>/<span> tags).
                WR-02: layer.text fallback is rendered as a plain React text child, never
                as raw HTML, so any '<'/'>' in malformed/edge parses is escaped, not markup. */}
            {(() => {
              const safeHtml = reading || info!.eg;
              return safeHtml
                ? <span dangerouslySetInnerHTML={{ __html: safeHtml }} />
                : <span>{layer.text}</span>;
            })()}
          </div>
        </div>
      ) : legendHover ? (
        /* UAT-13: static info for a hovered legend row whose layer is NOT on the
           canvas — replaces the old floating tooltip. No live reading exists, so the
           canonical example snippet is shown. l.eg is a plain InChI fragment string
           (no markup) → rendered as an escaped React text child, never innerHTML. */
        <div
          className={[styles.card, styles.active].join(' ')}
          style={{ '--accent': legendAccent } as React.CSSProperties}
        >
          <h3 className={styles.layerTitle}>{legendInfo!.title}</h3>
          <p className={styles.layerBody}>{legendInfo!.blurb}</p>
          {!presentTypes.has(legendHover.type) && (
            <p className={styles.notPresent}>Not present in this molecule.</p>
          )}
          {legendHover.eg && (
            <div className={styles.layerEg}>
              <span className={styles.lbl}>Example</span>
              <span>{legendHover.eg}</span>
            </div>
          )}
        </div>
      ) : (
        /* D-10: Idle state — DEFAULT_INFO with ink-faint left border (title only) */
        <div
          className={styles.card}
          style={{ '--accent': 'var(--ink-faint)' } as React.CSSProperties}
        >
          <h3 className={styles.layerTitle}>{DEFAULT_INFO.title}</h3>
          <p className={styles.layerBody}>{DEFAULT_INFO.blurb}</p>
        </div>
      )}

      {/* Right legend card */}
      <Legend activeType={layer?.type} />
    </div>
  );
}
