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

// Placeholder prose (Phase 13 replaces with full content).
const KEY_ZONE_COPY: Record<KeyHoverZone, { title: string; body: string; label: string }> = {
  skeleton:    { label: 'skeleton',         title: 'Skeleton hash',        body: 'First 14-character block of the InChIKey. Encodes the molecular skeleton (connectivity layer).' },
  hash:        { label: 'hash',             title: 'Remaining-layers hash', body: 'Second 8-character block. Encodes the remaining InChI layers (stereo, charge, isotopes).' },
  flagVersion: { label: 'flag + version',   title: 'Standard flag & version', body: 'Two-character suffix of the second block: S/N indicates standard/non-standard InChI; A indicates InChIKey version 1.' },
  protonation: { label: 'protonation',      title: 'Protonation flag',     body: 'Single character encoding the protonation state of the molecule.' },
};

export function Explanation() {
  const layers = useInchiStore(state => state.layers);
  const hoverIdx = useInchiStore(state => state.hoverIdx);
  const atomElements = useInchiStore(state => state.atomElements);
  // D-04a: read keyHoverKind; treat undefined the same as null (falsy-safe for test mocks).
  const keyHoverKind = useInchiStore(state => state.keyHoverKind);

  const layer = hoverIdx !== null ? layers[hoverIdx] : null;
  const info = layer ? LAYER_INFO[layer.type] : null;

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
          <div className={styles.layerTag}>
            <span className={styles.swatch} />
            {KEY_ZONE_COPY[keyHoverKind].label}
          </div>
          <h3 className={styles.layerTitle}>{KEY_ZONE_COPY[keyHoverKind].title}</h3>
          <p className={styles.layerBody}>{KEY_ZONE_COPY[keyHoverKind].body}</p>
        </div>
      ) : (
        <div
          className={[styles.card, layer ? styles.active : ''].filter(Boolean).join(' ')}
          style={{ '--accent': accentVar } as React.CSSProperties}
        >
          {!layer ? (
            /* D-10: Idle state — DEFAULT_INFO with ink-faint left border */
            <>
              <div className={styles.layerTag}>
                <span className={styles.swatch} />
                Idle
              </div>
              <h3 className={styles.layerTitle}>{DEFAULT_INFO.title}</h3>
              <p className={styles.layerBody}>{DEFAULT_INFO.blurb}</p>
            </>
          ) : (
            /* Active state: show layer info + readingFor output */
            <>
              <div className={styles.layerTag}>
                <span className={styles.swatch} />
                {layer.prefix ? `${layer.prefix}-layer` : `${layer.type}-layer`}
              </div>
              <h3 className={styles.layerTitle}>{info!.title}</h3>
              <p className={styles.layerBody}>{info!.blurb}</p>
              <div className={styles.layerEg}>
                <span className={styles.lbl}>{info!.egLabel}</span>
                {/* D-09: innerHTML for reading-code block */}
                <span dangerouslySetInnerHTML={{ __html: reading || info!.eg || layer.text }} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Right legend card */}
      <Legend activeType={layer?.type} />
    </div>
  );
}
