// Legend — right card in the explanation panel showing all 11 InChI layer types.
// Port of design_handoff_explain_that_inchi/app.jsx lines 407-462.
// CSS-only tooltip on row hover — no React state for tooltip visibility.
// Reads layers from Zustand store to compute which layer types are present.

import { useInchiStore } from '../store';
import { swatchVar } from '../lib/layerInfo';
import type { LayerType } from '../lib/parseInchi';
import styles from './Legend.module.css';
import expStyles from './Explanation.module.css';

const { setHover, setSubHover, setLegendHover } = useInchiStore.getState();

interface LegendLayerDef {
  type: LayerType;
  key: string;
  name: string;
  desc: string;
  eg: string;
}

// Verbatim from app.jsx lines 415-427
const ALL_LAYERS: LegendLayerDef[] = [
  { type: 'version', key: '1S',   name: 'Version',            desc: 'Which InChI specification',      eg: '1S' },
  { type: 'formula', key: 'Hill', name: 'Formula',            desc: 'Atoms by element & count',       eg: 'C8H10N4O2' },
  { type: 'c',       key: 'c…', name: 'Connection',     desc: 'Heavy-atom skeleton',             eg: 'c1-2(4)3-5' },
  { type: 'h',       key: 'h…', name: 'Hydrogen',       desc: 'H count per atom + mobile H',    eg: 'h2H,1H3,(H,3,4)' },
  { type: 'q',       key: 'q…', name: 'Charge',         desc: 'Net formal charge',               eg: 'q+1' },
  { type: 'p',       key: 'p…', name: 'Proton',         desc: 'Proton balance',                  eg: 'p+1' },
  { type: 'b',       key: 'b…', name: 'Double-bond stereo', desc: 'E/Z geometry',               eg: 'b6-9+' },
  { type: 't',       key: 't…', name: 'Tetrahedral',    desc: 'sp³ stereocenters',         eg: 't2-,4+' },
  { type: 'm',       key: 'm…', name: 'Enantiomer',     desc: 'Mirror-image flag',               eg: 'm0 or m1' },
  { type: 's',       key: 's…', name: 'Stereo flag',    desc: 'Absolute / relative / racemic',  eg: 's1' },
  { type: 'i',       key: 'i…', name: 'Isotope',        desc: 'Non-natural isotopes',            eg: 'i2D,5+1' },
];

interface LegendProps {
  activeType: LayerType | undefined;
}

export function Legend({ activeType }: LegendProps) {
  const layers = useInchiStore(state => state.layers);
  const presentTypes = new Set(layers.map(l => l.type));
  const layerIndexByType = new Map(layers.map((l, i) => [l.type, i]));

  return (
    <div className={`${expStyles.card} ${expStyles.legendCard}`} data-tour-id="legend">
      {/* UAT-13: legend header (swatch dot + "Layer legend · hover any row") removed. */}
      {ALL_LAYERS.map(l => {
        const present = presentTypes.has(l.type);
        const isActive = l.type === activeType;
        const color = `var(--c-${swatchVar(l.type)})`;
        const layerIdx = layerIndexByType.get(l.type);
        // UAT-13: hovering ANY row shows that layer's info in the explanation card
        // (the floating tooltip is gone). Present layers also drive the live card +
        // canvas highlight via setHover; absent layers show static info via legendHoverType.
        return (
          <div
            key={l.type}
            className={[styles.legendRow, !present ? styles.muted : ''].filter(Boolean).join(' ')}
            style={isActive ? { background: `var(--c-${swatchVar(l.type)}-bg)` } : undefined}
            onMouseEnter={() => {
              setSubHover(null);
              setLegendHover({ type: l.type, eg: l.eg });
              if (present && layerIdx !== undefined) setHover(layerIdx);
            }}
            onMouseLeave={() => {
              setLegendHover(null);
              if (present && layerIdx !== undefined) setHover(null);
            }}
          >
            <span className={styles.sw} style={{ background: color }} />
            <span
              className={styles.key}
              style={{ color: present ? color : 'var(--ink-faint)' }}
            >
              {l.key}
            </span>
            <span className={styles.name} style={!present ? { color: 'var(--ink-faint)' } : undefined}>
              {l.name}
            </span>
            <span className={styles.desc}>{l.desc}</span>
          </div>
        );
      })}
    </div>
  );
}
