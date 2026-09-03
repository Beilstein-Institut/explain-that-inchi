// TypeScript port of design_handoff_explain_that_inchi/layers-info.js
// Adapted per D-02/D-03: mol.atoms replaced by atomElements: Record<number, string>
// swatchVar ported from app.jsx lines 464-472.
// parseMobileHydrogens, parseConnectionBonds, parseStereoAtoms imported from parseInchi.ts (D-05).

import type { Layer, LayerType } from './parseInchi';
import type { Copy } from './audience';
import { parseMobileHydrogens, parseConnectionBonds, parseStereoAtoms, expandLayerText } from './parseInchi';
import { JMOL_COLORS } from './jmolColors';

// ---------------------------------------------------------------------------
// LAYER_INFO — ported from layers-info.js lines 1-81; copy rewritten in two registers
// ---------------------------------------------------------------------------

export interface LayerInfoEntry {
  title: Copy;
  accent: string;
  blurb: Copy;
  egLabel: string;
  eg?: string;
}

// Chemist register cites the IUPAC Blue Book (2013) section that owns the term;
// where the Blue Book has none the comment names the Gold Book term or says the
// concept is InChI-specific. Plain register: same claims, no jargon.
export const LAYER_INFO: Record<LayerType, LayerInfoEntry> = {
  version: {
    // InChI-specific: no IUPAC nomenclature term.
    title: { chemist: 'Version', plain: 'Version' },
    accent: 'var(--c-version)',
    blurb: {
      chemist:
        "Identifies the InChI version. '1' is version 1; the trailing 'S' marks the Standard InChI — the fixed option set most databases store.",
      plain:
        "Which edition of the InChI rules made this text. The 1 is the version. The S means the standard settings were used, which is what most databases store.",
    },
    egLabel: 'Reads as',
    eg: 'version <b>1</b>, <b>S</b>tandard',
  },
  formula: {
    // Gold Book: molecular formula. Hill order is a CAS convention, not IUPAC.
    title: { chemist: 'Molecular formula', plain: 'What it is made of' },
    accent: 'var(--c-formula)',
    blurb: {
      chemist:
        'The molecular formula of every atom, hydrogen included, in Hill order: carbon first, then hydrogen, then the remaining elements alphabetically. It states what the molecule contains before any structure is described.',
      plain:
        'A list of the atoms in the molecule. Each capital letter, or letter pair, is one element, such as C for carbon. The number after it says how many of that atom there are. No number means one.',
    },
    egLabel: 'Reads as',
  },
  c: {
    // InChI-specific: canonical numbering and the connection layer have no
    // nomenclature counterpart. Gold Book: connectivity.
    title: { chemist: 'Connection layer', plain: 'How the atoms are joined' },
    accent: 'var(--c-conn)',
    blurb: {
      chemist:
        'The connectivity of the non-hydrogen atoms, using canonical atom numbers. Hyphens represent bonds; parentheses open and close branches. Hydrogens are normally left out here and counted in the h-layer instead — the exception is a hydrogen bonded to two atoms at once, such as the bridging H of a borane: it cannot be written as a per-atom count, so it gets its own canonical number and appears in this layer.',
      plain:
        'Every atom except hydrogen gets a number. This layer lists which numbered atoms are joined. A dash is a bond. Brackets mark a side branch. Hover a number to light up that atom in the drawing.',
    },
    egLabel: 'Reads as',
  },
  h: {
    // Gold Book: tautomerism. InChI-specific: the per-atom H count.
    title: { chemist: 'Hydrogen layer', plain: 'Where the hydrogens are' },
    accent: 'var(--c-hydro)',
    blurb: {
      chemist:
        "Where the hydrogens left out of the connection layer are recorded — as a count stored per atom, not something you deduce from valence. '1H3' means atom 1 carries three H. Ranges like '1-6H' indicate that atoms 1-6 each carry one H. Parenthesised groups like '(H,3,4)' are mobile hydrogens: tautomerism lets them sit on any of the listed atoms, so InChI records them as shared. Hydrogens you have not drawn are shown as badges on the canvas when you hover this layer.",
      plain:
        "Hydrogen atoms are not in the layer above, so this layer counts them. '1H3' means atom 1 has three hydrogens. '1-6H' means atoms 1 to 6 have one each. A group in brackets like '(H,3,4)' is a hydrogen that can move between the listed atoms. Hover to see them as badges on the drawing.",
    },
    egLabel: 'Reads as',
  },
  q: {
    // Blue Book P-72 anions, P-73 cations, P-74 zwitterions.
    title: { chemist: 'Net charge', plain: 'Overall charge' },
    accent: 'var(--c-charge)',
    blurb: {
      chemist:
        'The net charge of the species — the sum of all formal charges, as carried by an anion, cation or zwitterion. Absent when the species is neutral.',
      plain:
        'Molecules can carry an electric charge, positive or negative. This layer gives the total. It is left out when the molecule is neutral, which is the usual case.',
    },
    egLabel: 'Reads as',
  },
  p: {
    // Blue Book P-81.3 Table 8.1: 'hydron' is the generic H⁺; 'proton' is ¹H⁺.
    title: { chemist: 'Proton balance', plain: 'Hydrogen ions gained or lost' },
    accent: 'var(--c-proton)',
    blurb: {
      chemist:
        "Hydrons (H⁺) added to or removed from the neutral form: 'p+1' is one added, 'p-1' one removed. A protonated or deprotonated species thereby shares every other layer with its neutral parent.",
      plain:
        "Some molecules have gained or lost a hydrogen ion, which gives them a charge. This layer says how many. 'p+1' means one gained, 'p-1' means one lost. Everything else is written as if the molecule were neutral.",
    },
    egLabel: 'Reads as',
  },
  b: {
    // Blue Book P-93.4.2.1.1: 'E'/'Z' stereodescriptors for double bonds.
    title: { chemist: 'Double-bond stereo', plain: 'Which side of a double bond' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        'Configuration of stereogenic double bonds — what a name expresses with E/Z. Each entry names the two atoms of a double bond and a + or − parity. The parity is taken over canonical atom numbers, not CIP priorities, so it is not the E/Z stereodescriptor itself.',
      plain:
        'Some double bonds hold their neighbouring groups rigidly on one side or the other. This layer records which side for each such bond, as a plus or minus. Swapping sides gives a different substance made of the same atoms.',
    },
    egLabel: 'Reads as',
  },
  t: {
    // Blue Book P-92.1.1 chirality centre; P-91.2.1.1 R/S stereodescriptors.
    title: { chemist: 'Tetrahedral stereo', plain: 'Left- or right-handed atoms' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        "Tetrahedral chirality centres, the stereogenic units of a name's R/S descriptors. Each entry is a canonical atom number followed by + or −: the parity of its four ligands under InChI's canonical ordering. It is not the CIP R/S stereodescriptor; /m and /s fix the absolute configuration.",
      plain:
        'An atom joined to four different groups can be arranged two ways, like a left and a right hand. This layer lists such atoms with a plus or minus for their arrangement. The two mirror forms can behave very differently, for example in the body.',
    },
    egLabel: 'Reads as',
  },
  m: {
    // Blue Book P-93.1.1 absolute configuration; Gold Book: enantiomer.
    title: { chemist: 'Enantiomer marker', plain: 'Mirror-image flag' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        "One bit choosing between the two enantiomers the /t parities could describe. '1' means the parities are as written; '0' means take the inverted set, the mirror image. Together with /s1 this fixes the absolute configuration.",
      plain:
        'The layer before this can describe a molecule or its mirror image. This single digit says which one is meant. 0 and 1 are the two mirror twins.',
    },
    egLabel: 'Reads as',
  },
  s: {
    // Blue Book P-93.1.1 absolute, P-93.1.2 relative ('rel'), P-91.2.1.1 racemate ('rac').
    title: { chemist: 'Stereo flag', plain: 'How exact the 3-D shape is' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        "How the stereo layers are to be read. '1' = absolute configuration; '2' = relative configuration, the 'rel' of a name; '3' = racemate, the 'rac' of a name.",
      plain:
        'Says how to read the handedness information. 1: the exact 3-D form is known. 2: only how the handed atoms relate to each other is known. 3: a 50:50 mix of both mirror forms.',
    },
    egLabel: 'Reads as',
  },
  i: {
    // Blue Book P-82 isotopically substituted compounds; P-81.4 natural composition.
    title: { chemist: 'Isotope layer', plain: 'Heavier or lighter atoms' },
    accent: 'var(--c-isotope)',
    blurb: {
      chemist:
        'Isotopic substitution: atoms whose nuclide differs from natural composition — deuterium (D), tritium (T), or a mass shift such as +1 for ¹³C. Atoms not listed have natural isotopic composition.',
      plain:
        'Atoms of one element can come in slightly different weights, called isotopes. This layer lists atoms that are not the everyday kind, such as heavy hydrogen (D). Any atom not listed is the ordinary kind.',
    },
    egLabel: 'Reads as',
  },
};

// ---------------------------------------------------------------------------
// DEFAULT_INFO — ported from layers-info.js lines 83-89
// ---------------------------------------------------------------------------

export const DEFAULT_INFO = {
  title: { chemist: 'Hover any layer', plain: 'Hover any layer' },
  blurb: {
    chemist:
      'Move your cursor over a coloured layer of the InChI string above to see what it encodes and watch the structure light up.',
    plain:
      'Move your mouse over a coloured part of the InChI text above. This card explains it and the drawing lights up.',
  },
  accent: 'var(--ink-faint)',
};

// Shown in place of DEFAULT_INFO while the canvas is empty: there are no layers to
// hover yet, so the card names the prerequisite instead of prompting for a gesture
// that cannot succeed. Deliberately not a second copy of the InChI box's placeholder
// — that one promises the string, this one promises the explanation.
export const EMPTY_INFO = {
  title: { chemist: 'Nothing to explain yet', plain: 'Nothing to explain yet' },
  blurb: {
    chemist:
      'Draw a molecule in the editor above. Its InChI appears below, split into colour-coded layers — hover any one to see what it encodes.',
    plain:
      'Draw a molecule in the editor above. Its InChI text appears below in coloured pieces. Hover a piece to learn what it means.',
  },
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
// elementColor — returns the Jmol CPK color for the element (see jmolColors.ts).
// Non-element pseudo-symbols (R-groups, etc.) fall back to the formula color.
// ---------------------------------------------------------------------------

export function elementColor(el: string): string {
  return JMOL_COLORS[el] ?? 'var(--c-formula)';
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
  // '?' is a double bond whose geometry is unspecified or unknown — still one token.
  for (const m of text.matchAll(/(\d+)-(\d+)([+\-?])/g)) {
    entries.push({ a1: parseInt(m[1], 10), a2: parseInt(m[2], 10), sign: m[3] });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// LAYER_KEY — how a layer is named where it has to be identified in one or two
// characters: the Legend's key column and the preset chips in the picker. The
// nine letter layers are the prefix character as it appears in the InChI; the
// two that have no prefix get the shortest thing a chemist would recognise.
// Single source so a chip and its Legend row can never disagree.
// ---------------------------------------------------------------------------

export const LAYER_KEY: Record<LayerType, string> = {
  version: '1S',
  formula: 'Hill',
  c: 'c',
  h: 'h',
  q: 'q',
  p: 'p',
  b: 'b',
  t: 't',
  m: 'm',
  s: 's',
  i: 'i',
};

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
