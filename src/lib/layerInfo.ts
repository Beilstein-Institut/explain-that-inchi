// TypeScript port of design_handoff_explain_that_inchi/layers-info.js
// Adapted per D-02/D-03: mol.atoms replaced by atomElements: Record<number, string>
// swatchVar ported from app.jsx lines 464-472.
// parseMobileHydrogens, parseConnectionBonds, parseStereoAtoms imported from parseInchi.ts (D-05).

import type { Layer, LayerType } from './parseInchi';
import { parseMobileHydrogens, parseConnectionBonds, parseStereoAtoms, expandLayerText } from './parseInchi';

// ---------------------------------------------------------------------------
// LAYER_INFO — verbatim from layers-info.js lines 1-81
// ---------------------------------------------------------------------------

export interface LayerInfoEntry {
  title: string;
  accent: string;
  blurb: string;
  egLabel: string;
  eg?: string;
}

export const LAYER_INFO: Record<LayerType, LayerInfoEntry> = {
  version: {
    title: 'Version',
    accent: 'var(--c-version)',
    blurb:
      "Identifies the InChI version. '1' is version 1; the trailing 'S' marks the Standard InChI — the canonical form most databases use.",
    egLabel: 'Reads as',
    eg: 'version <b>1</b>, <b>S</b>tandard',
  },
  formula: {
    title: 'Molecular formula',
    accent: 'var(--c-formula)',
    blurb:
      'The Hill-system formula of the heavy atoms (plus total H count). Carbon first, then hydrogen, then the rest alphabetically. This layer answers the question "what is in the molecule" before any structure is described.',
    egLabel: 'Reads as',
  },
  c: {
    title: 'Connection layer',
    accent: 'var(--c-conn)',
    blurb:
      'How the heavy atoms are connected, using canonical atom numbers. Hyphens represent bonds; parentheses open and close branches. The heavy atom core, without explicit hydrogens.',
    egLabel: 'Reads as',
  },
  h: {
    title: 'Hydrogen layer',
    accent: 'var(--c-hydro)',
    blurb:
      "Where the non-explicit hydrogen atoms are represented. '1H3' means atom 1 carries three H. Ranges like '1-6H' indicates that atoms 1-6 each carry one H. Parenthesised groups like '(H,3,4)' are mobile (tautomeric) protons shared between atoms. Implicit hydrogens are shown as badges on the canvas when you hover this layer.",
    egLabel: 'Reads as',
  },
  q: {
    title: 'Net charge',
    accent: 'var(--c-charge)',
    blurb: 'The overall formal charge of the molecule. Absent when the species is neutral.',
    egLabel: 'Reads as',
  },
  p: {
    title: 'Proton balance',
    accent: 'var(--c-proton)',
    blurb:
      'Adjustments to the proton count relative to the neutral form — used for ionised and zwitterionic species.',
    egLabel: 'Reads as',
  },
  b: {
    title: 'Double-bond stereo',
    accent: 'var(--c-stereo)',
    blurb:
      'Geometry around stereogenic double bonds (E/Z, cis/trans). Each entry names the two atoms defining a double bond and a + or – sign for its parity.',
    egLabel: 'Reads as',
  },
  t: {
    title: 'Tetrahedral stereo',
    accent: 'var(--c-stereo)',
    blurb:
      'Tetrahedral (sp³) stereocenters. Each entry is an atom number followed by + or – — the parity of the four-substituent arrangement under the canonical ordering.',
    egLabel: 'Reads as',
  },
  m: {
    title: 'Enantiomer marker',
    accent: 'var(--c-stereo)',
    blurb:
      "A single bit (0 or 1) that disambiguates which enantiomer the t-layer parities describe. '1' means the parities are as written; '0' means take the mirror image.",
    egLabel: 'Reads as',
  },
  s: {
    title: 'Stereo flag',
    accent: 'var(--c-stereo)',
    blurb:
      "How the stereo information should be interpreted. '1' = absolute, '2' = relative, '3' = racemic.",
    egLabel: 'Reads as',
  },
  i: {
    title: 'Isotope layer',
    accent: 'var(--c-isotope)',
    blurb:
      'Non-natural isotopic substitutions — deuterium, ¹³C, and so on. Atoms not mentioned have natural isotopic abundance.',
    egLabel: 'Reads as',
  },
};

// ---------------------------------------------------------------------------
// DEFAULT_INFO — verbatim from layers-info.js lines 83-89
// ---------------------------------------------------------------------------

export const DEFAULT_INFO = {
  title: 'Hover any layer',
  blurb:
    'Move your cursor over a coloured layer of the InChI string above to see what it encodes and watch the structure light up.',
  accent: 'var(--ink-faint)',
};

// ---------------------------------------------------------------------------
// subscript — verbatim from layers-info.js lines 184-189
// ---------------------------------------------------------------------------

export function subscript(n: number): string {
  const s = '₀₁₂₃₄₅₆₇₈₉';
  return String(n)
    .split('')
    .map(d => s[+d])
    .join('');
}

// ---------------------------------------------------------------------------
// atomLabel — adapted per D-02: mol.atoms replaced by atomElements
// ---------------------------------------------------------------------------

function atomLabel(atomElements: Record<number, string>, canon: number): string {
  const el = atomElements[canon];
  if (!el) return '#' + canon;
  return el + subscript(canon);
}

// ---------------------------------------------------------------------------
// formulaReading — verbatim from layers-info.js lines 193-205
// ---------------------------------------------------------------------------

/**
 * Renders a single (multiplier-stripped) formula segment into element-count prose.
 * Single-segment output is byte-identical to the legacy formulaReading.
 */
function formulaSegmentReading(seg: string): string {
  const out: string[] = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg))) {
    if (!m[1]) continue;
    const el = m[1];
    const n = m[2] ? parseInt(m[2], 10) : 1;
    const name = ELEMENT_NAMES[el] || el;
    out.push(`<b>${n}</b> ${name}${n === 1 ? '' : 's'}`);
  }
  return out.join(', ');
}

export function formulaReading(s: string): string {
  // Multi-component formulas are dot-separated (e.g. 'C12H19N.C11H17N.C6H6').
  // A segment may carry a leading integer multiplier (e.g. '2C6H6' = two benzenes).
  // Render each fragment separately and join with '; '. A single segment with no
  // multiplier reproduces the legacy single-fragment output byte-for-byte.
  const segments = s.split('.');
  const parts: string[] = [];
  for (const seg of segments) {
    const multMatch = seg.match(/^(\d+)(?=[A-Z])/);
    if (multMatch) {
      const n = parseInt(multMatch[1], 10);
      const base = formulaSegmentReading(seg.slice(multMatch[1].length));
      parts.push(`<b>${n}×</b> (${base})`);
    } else {
      parts.push(formulaSegmentReading(seg));
    }
  }
  return parts.join('; ');
}

// ---------------------------------------------------------------------------
// ELEMENT_NAMES — verbatim from layers-info.js lines 207-210
// ---------------------------------------------------------------------------

export const ELEMENT_NAMES: Record<string, string> = {
  // 1–10
  H: 'hydrogen', He: 'helium', Li: 'lithium', Be: 'beryllium', B: 'boron',
  C: 'carbon', N: 'nitrogen', O: 'oxygen', F: 'fluorine', Ne: 'neon',
  // 11–20
  Na: 'sodium', Mg: 'magnesium', Al: 'aluminium', Si: 'silicon', P: 'phosphorus',
  S: 'sulfur', Cl: 'chlorine', Ar: 'argon', K: 'potassium', Ca: 'calcium',
  // 21–30
  Sc: 'scandium', Ti: 'titanium', V: 'vanadium', Cr: 'chromium', Mn: 'manganese',
  Fe: 'iron', Co: 'cobalt', Ni: 'nickel', Cu: 'copper', Zn: 'zinc',
  // 31–40
  Ga: 'gallium', Ge: 'germanium', As: 'arsenic', Se: 'selenium', Br: 'bromine',
  Kr: 'krypton', Rb: 'rubidium', Sr: 'strontium', Y: 'yttrium', Zr: 'zirconium',
  // 41–50
  Nb: 'niobium', Mo: 'molybdenum', Tc: 'technetium', Ru: 'ruthenium', Rh: 'rhodium',
  Pd: 'palladium', Ag: 'silver', Cd: 'cadmium', In: 'indium', Sn: 'tin',
  // 51–60
  Sb: 'antimony', Te: 'tellurium', I: 'iodine', Xe: 'xenon', Cs: 'caesium',
  Ba: 'barium', La: 'lanthanum', Ce: 'cerium', Pr: 'praseodymium', Nd: 'neodymium',
  // 61–70
  Pm: 'promethium', Sm: 'samarium', Eu: 'europium', Gd: 'gadolinium', Tb: 'terbium',
  Dy: 'dysprosium', Ho: 'holmium', Er: 'erbium', Tm: 'thulium', Yb: 'ytterbium',
  // 71–80
  Lu: 'lutetium', Hf: 'hafnium', Ta: 'tantalum', W: 'tungsten', Re: 'rhenium',
  Os: 'osmium', Ir: 'iridium', Pt: 'platinum', Au: 'gold', Hg: 'mercury',
  // 81–90
  Tl: 'thallium', Pb: 'lead', Bi: 'bismuth', Po: 'polonium', At: 'astatine',
  Rn: 'radon', Fr: 'francium', Ra: 'radium', Ac: 'actinium', Th: 'thorium',
  // 91–100
  Pa: 'protactinium', U: 'uranium', Np: 'neptunium', Pu: 'plutonium', Am: 'americium',
  Cm: 'curium', Bk: 'berkelium', Cf: 'californium', Es: 'einsteinium', Fm: 'fermium',
  // 101–110
  Md: 'mendelevium', No: 'nobelium', Lr: 'lawrencium', Rf: 'rutherfordium', Db: 'dubnium',
  Sg: 'seaborgium', Bh: 'bohrium', Hs: 'hassium', Mt: 'meitnerium', Ds: 'darmstadtium',
  // 111–118
  Rg: 'roentgenium', Cn: 'copernicium', Nh: 'nihonium', Fl: 'flerovium', Mc: 'moscovium',
  Lv: 'livermorium', Ts: 'tennessine', Og: 'oganesson',
  // pseudo-symbols (hydrogen isotopes carried by the i-layer/formula)
  D: 'deuterium', T: 'tritium',
};

// ---------------------------------------------------------------------------
// elementColor — verbatim from layers-info.js lines 212-215
// ---------------------------------------------------------------------------

export function elementColor(el: string): string {
  const known = ['C', 'H', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I'];
  return known.includes(el) ? `var(--c-el-${el})` : 'var(--c-formula)';
}

// ---------------------------------------------------------------------------
// hydroColor — verbatim from layers-info.js lines 218-221
// ---------------------------------------------------------------------------

export function hydroColor(count: number | null | undefined): string | null {
  if (!count || count < 1) return null;
  return `var(--c-hydro-${Math.min(count, 4)})`;
}

// ---------------------------------------------------------------------------
// parseStereoParities — verbatim from layers-info.js lines 224-229
// NOTE: distinct from parseStereoAtoms in parseInchi.ts — returns {atom: parity} not atom[]
// ---------------------------------------------------------------------------

export function parseStereoParities(text: string): Record<number, string> {
  const out: Record<number, string> = {};
  for (const m of text.matchAll(/(\d+)([-+?])/g)) {
    out[parseInt(m[1], 10)] = m[2];
  }
  return out;
}

// ---------------------------------------------------------------------------
// parityColor — verbatim from layers-info.js lines 231-233
// ---------------------------------------------------------------------------

export function parityColor(sign: string): string {
  if (sign === '+') return 'var(--c-stereo-plus)';
  if (sign === '-') return 'var(--c-stereo-minus)';
  // '?' (undefined/unspecified) and any other sign — neutral stereo color.
  return 'var(--c-stereo)';
}

// ---------------------------------------------------------------------------
// parseBondStereoEntries — parses b-layer text into atom-pair + sign tuples.
// b-layer format: "9-4+,12-6-" → [{a1:9, a2:4, sign:'+'}, {a1:12, a2:6, sign:'-'}]
// Distinct from parseStereoParities (t-layer) which uses "atomN+/-" single-atom notation.
// ---------------------------------------------------------------------------

export type BondStereoEntry = { a1: number; a2: number; sign: string };

export function parseBondStereoEntries(text: string): BondStereoEntry[] {
  const entries: BondStereoEntry[] = [];
  for (const m of text.matchAll(/(\d+)-(\d+)([+-])/g)) {
    entries.push({ a1: parseInt(m[1], 10), a2: parseInt(m[2], 10), sign: m[3] });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// swatchVar — ported from app.jsx lines 464-472 (not in layers-info.js)
// Maps LayerType to CSS token suffix for color lookup.
// ---------------------------------------------------------------------------

export function swatchVar(type: LayerType): string {
  if (type === 'c') return 'conn';
  if (type === 'h') return 'hydro';
  if (type === 'q') return 'charge';
  if (type === 'p') return 'proton';
  if (type === 'i') return 'isotope';
  if ('btms'.includes(type)) return 'stereo';
  return type; // 'version', 'formula' — use type as-is
}

// ---------------------------------------------------------------------------
// readingFor — adapted per D-02: mol.atoms replaced by atomElements
// Port of layers-info.js lines 92-175
// Uses parseConnectionBonds, parseMobileHydrogens, parseStereoAtoms from parseInchi.ts
// ---------------------------------------------------------------------------

export function readingFor(
  layer: Layer,
  atomElements: Record<number, string>,
  fragCounts: number[] = [],
): string {
  // Multi-fragment is active only when there is more than one fragment. With an
  // empty (or single-element) fragCounts the per-fragment loops collapse to a
  // single pass at offset 0, producing output byte-identical to the legacy code.
  const multi = fragCounts.length > 1;

  switch (layer.type) {
    case 'version':
      return layer.text === '1S'
        ? 'version <b>1</b>, <b>S</b>tandard'
        : 'version ' + layer.text;
    case 'formula':
      return formulaReading(layer.text);
    case 'c': {
      // Parse bonds per fragment, applying a cumulative canonical offset, so no
      // spurious cross-fragment bond is invented and fragment 2+ labels are correct.
      const fragmentTexts = multi ? expandLayerText(layer.text) : [layer.text];
      const bonds: [number, number][] = [];
      let cumulativeOffset = 0;
      fragmentTexts.forEach((fragText, fi) => {
        for (const [a, b] of parseConnectionBonds(fragText)) {
          bonds.push([a + cumulativeOffset, b + cumulativeOffset]);
        }
        cumulativeOffset += fragCounts[fi] ?? 0;
      });
      if (!bonds.length) return 'no heavy-atom bonds';
      const MAX = 10;
      const shown = bonds.slice(0, MAX);
      const out = shown
        .map(([a, b]) => `<b>${atomLabel(atomElements, a)}</b>–<b>${atomLabel(atomElements, b)}</b>`)
        .join(' · ');
      return bonds.length > MAX
        ? out + ` · <span style="color:var(--ink-faint)">+ ${bonds.length - MAX} more</span>`
        : out;
    }
    case 'h': {
      const fragmentTexts = multi ? expandLayerText(layer.text) : [layer.text];
      const parts: string[] = [];
      let cumulativeOffset = 0;
      fragmentTexts.forEach((fragText, fi) => {
        const off = cumulativeOffset;
        const re = /([\d,-]+)H(\d*)(?=,|$)/g;
        const cleaned = fragText.replace(/\([^)]*\)/g, '');
        let m: RegExpExecArray | null;
        while ((m = re.exec(cleaned))) {
          const count = m[2] ? parseInt(m[2], 10) : 1;
          for (const range of m[1].split(',')) {
            if (!range) continue;
            if (range.includes('-')) {
              const [a, b] = range.split('-').map(n => parseInt(n, 10));
              for (let k = a; k <= b; k++)
                parts.push(`<b>${atomLabel(atomElements, k + off)}</b> bears ${count}H`);
            } else {
              parts.push(`<b>${atomLabel(atomElements, parseInt(range, 10) + off)}</b> bears ${count}H`);
            }
          }
        }
        const mob = parseMobileHydrogens(fragText);
        if (mob.length) {
          parts.push(
            `mobile H shared by ${mob.map(n => `<b>${atomLabel(atomElements, n + off)}</b>`).join(' / ')}`
          );
        }
        cumulativeOffset += fragCounts[fi] ?? 0;
      });
      const MAX = 8;
      const shown = parts.slice(0, MAX);
      return parts.length > MAX
        ? shown.join(' · ') + ` · <span style="color:var(--ink-faint)">+ ${parts.length - MAX} more</span>`
        : shown.join(' · ');
    }
    case 't': {
      const fragmentTexts = multi ? expandLayerText(layer.text) : [layer.text];
      const nums: number[] = [];
      let cumulativeOffset = 0;
      fragmentTexts.forEach((fragText, fi) => {
        for (const n of parseStereoAtoms(fragText)) nums.push(n + cumulativeOffset);
        cumulativeOffset += fragCounts[fi] ?? 0;
      });
      return nums.length
        ? 'stereocenter at ' + nums.map(n => `<b>${atomLabel(atomElements, n)}</b>`).join(', ')
        : layer.text;
    }
    case 'm':
      return layer.text === '0'
        ? 'take the <b>mirror image</b> of the listed parities'
        : 'parities as listed';
    case 's':
      return layer.text === '1'
        ? '<b>absolute</b> configuration'
        : layer.text === '2'
        ? '<b>relative</b> configuration'
        : '<b>racemic</b>';
    case 'b':
      return 'double-bond geometry: <b>' + layer.text + '</b>';
    case 'q':
      return 'net charge: <b>' + layer.text + '</b>';
    case 'p':
      return 'proton offset: <b>' + layer.text + '</b>';
    case 'i':
      return 'isotope: <b>' + layer.text + '</b>';
    default:
      return layer.text;
  }
}
