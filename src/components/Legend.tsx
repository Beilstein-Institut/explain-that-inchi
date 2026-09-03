// Legend — right card in the explanation panel showing all 11 InChI layer types.
// Port of design_handoff_explain_that_inchi/app.jsx lines 407-462.
// CSS-only tooltip on row hover — no React state for tooltip visibility.
// Reads layers from Zustand store to compute which layer types are present.

import type React from 'react';
import { useInchiStore } from '../store';
import { swatchVar, LAYER_KEY } from '../lib/layerInfo';
import { pick } from '../lib/audience';
import type { Copy } from '../lib/audience';
import type { LayerType } from '../lib/parseInchi';
import styles from './Legend.module.css';
import expStyles from './Explanation.module.css';

const { setHover, setSubHover, setLegendHover } = useInchiStore.getState();

interface LegendLayerDef {
  type: LayerType;
  name: Copy;
  desc: Copy;
  eg: string;
}

// Verbatim from app.jsx lines 415-427, except the key column: that now comes
// from LAYER_KEY (layerInfo.ts) so the Legend and the picker's layer chips
// cannot name the same layer differently. The '…' suffix on the nine letter
// layers is presentation — it says "prefix plus content", which is true here
// and not on a chip.
const ALL_LAYERS: LegendLayerDef[] = [
  { type: 'version', name: { chemist: 'Version',           plain: 'Version' },        desc: { chemist: 'Which InChI specification',     plain: 'Which rule set' },               eg: '1S' },
  { type: 'formula', name: { chemist: 'Formula',           plain: 'Ingredients' },    desc: { chemist: 'Atoms by element & count',      plain: 'Which atoms, how many' },        eg: 'C8H10N4O2' },
  { type: 'c',       name: { chemist: 'Connection',        plain: 'Joins' },          desc: { chemist: 'Heavy-atom connectivity',       plain: 'Which atoms are bonded' },       eg: 'c1-2(4)3-5' },
  { type: 'h',       name: { chemist: 'Hydrogen',          plain: 'Hydrogens' },      desc: { chemist: 'H count per atom + mobile H',   plain: 'Hydrogen count per atom' },      eg: 'h2H,1H3,(H,3,4)' },
  { type: 'q',       name: { chemist: 'Charge',            plain: 'Charge' },         desc: { chemist: 'Net formal charge',             plain: 'Overall electric charge' },      eg: 'q+1' },
  { type: 'p',       name: { chemist: 'Proton',            plain: 'Hydrogen ions' },  desc: { chemist: 'Hydrons added or removed',      plain: 'Gained or lost H⁺' },            eg: 'p+1' },
  { type: 'b',       name: { chemist: 'Double-bond stereo', plain: 'Double-bond sides' }, desc: { chemist: 'E/Z configuration',         plain: 'Which side groups sit' },        eg: 'b6-9+' },
  { type: 't',       name: { chemist: 'Tetrahedral',       plain: 'Handedness' },     desc: { chemist: 'Chirality centres',             plain: 'Left- or right-handed atoms' },  eg: 't2-,4+' },
  { type: 'm',       name: { chemist: 'Enantiomer',        plain: 'Mirror image' },   desc: { chemist: 'Mirror-image choice',           plain: 'Which twin is meant' },          eg: 'm0 or m1' },
  { type: 's',       name: { chemist: 'Stereo flag',       plain: 'Shape certainty' }, desc: { chemist: 'Absolute / relative / racemic', plain: 'Exact, relative or mixed' },    eg: 's1' },
  { type: 'i',       name: { chemist: 'Isotope',           plain: 'Isotopes' },       desc: { chemist: 'Isotopic substitution',         plain: 'Unusual atom weights' },         eg: 'i2D,5+1' },
];

/** Legend key column: 'c' → 'c…', but '1S' and 'Hill' stay as they are. */
const legendKey = (type: LayerType) =>
  LAYER_KEY[type].length === 1 ? `${LAYER_KEY[type]}…` : LAYER_KEY[type];

interface LegendProps {
  activeType: LayerType | undefined;
}

export function Legend({ activeType }: LegendProps) {
  const layers = useInchiStore(state => state.layers);
  const audience = useInchiStore(state => state.audience);
  const presentTypes = new Set(layers.map(l => l.type));
  const layerIndexByType = new Map(layers.map((l, i) => [l.type, i]));
  // Empty canvas: the legend is inert (see `show`), and the string boxes above already
  // say so for themselves with data-empty — same attribute, same dim, same one rule.
  const isEmpty = layers.length === 0;

  return (
    <div
      className={`${expStyles.card} ${expStyles.legendCard}`}
      data-tour-id="legend"
      data-empty={isEmpty ? 'true' : undefined}
    >
      {/* UAT-13: legend header (swatch dot + "Layer legend · hover any row") removed. */}
      {ALL_LAYERS.map(l => {
        const present = presentTypes.has(l.type);
        const isActive = l.type === activeType;
        const color = `var(--c-${swatchVar(l.type)})`;
        const layerIdx = layerIndexByType.get(l.type);
        // One handler for hover, focus and tap — the three ways in must not drift.
        const show = () => {
          // Empty canvas: every row is "absent", and the card is telling the visitor to
          // draw something. Swapping that for per-layer static info on a stray hover
          // reads as the page reacting to a molecule that does not exist — stay inert.
          if (layers.length === 0) return;
          setSubHover(null);
          setLegendHover({ type: l.type, eg: l.eg });
          if (present && layerIdx !== undefined) setHover(layerIdx);
        };
        // UAT-13: hovering ANY row shows that layer's info in the explanation card
        // (the floating tooltip is gone). Present layers also drive the live card +
        // canvas highlight via setHover; absent layers show static info via legendHoverType.
        return (
          <div
            key={l.type}
            className={[styles.legendRow, !present ? styles.muted : ''].filter(Boolean).join(' ')}
            // The layer hue goes down as a custom property so the presence styling can
            // live entirely in CSS (filled swatch vs ring, coloured key vs faint).
            style={{
              '--layer-color': color,
              ...(isActive ? { background: `var(--c-${swatchVar(l.type)}-bg)` } : {}),
            } as React.CSSProperties}
            // Focusable text, not a button: focus shows the layer's card exactly as
            // hover does, and there is nothing further to activate. While the canvas
            // is empty a focus would do nothing, so the rows leave the tab order.
            tabIndex={isEmpty ? -1 : 0}
            onMouseEnter={show}
            onFocus={show}
            // Touch has no hover, and iOS Safari does not reliably move focus to a
            // non-form element on tap — so without this the legend is the one part of
            // the page a touch user cannot reach at all. It is also how the layers
            // ABSENT from the molecule are explained, which exist nowhere else.
            onClick={show}
            onMouseLeave={() => {
              setLegendHover(null);
              if (present && layerIdx !== undefined) setHover(null);
            }}
            onBlur={() => {
              setLegendHover(null);
              if (present && layerIdx !== undefined) setHover(null);
            }}
          >
            <span className={styles.sw} />
            <span className={styles.key}>{legendKey(l.type)}</span>
            <span className={styles.name}>{pick(l.name, audience)}</span>
            <span className={styles.desc}>{pick(l.desc, audience)}</span>
          </div>
        );
      })}
    </div>
  );
}
