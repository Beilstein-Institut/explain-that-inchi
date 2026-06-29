// Pure InChI parsing library — no browser globals, Node-compatible for Vitest.
// Ported from design_handoff_explain_that_inchi/molecules.js lines 334–422.
// No algorithmic changes from the original JS; types added only.

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export type LayerType =
  | 'version'
  | 'formula'
  | 'c'
  | 'h'
  | 'q'
  | 'p'
  | 'b'
  | 't'
  | 'm'
  | 's'
  | 'i';

export interface Layer {
  type: LayerType;
  prefix: string;
  text: string;
  atoms: number[];   // canonical 1-based indices (per D-07)
  bonds: number[][]; // [a, b] canonical atom-pair tuples — only 'c' layer (per D-08)
}

export type AuxMap = Record<number, number>; // canonical 1-based → Ketcher 0-based (per D-10)

export interface SubHover {
  kind: 'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH' | 'bond' | 'branch';
  el?: string;
  // Inclusive canonical ID range [lo, hi] for element hovers in multi-fragment formulas.
  // Restricts highlights to the hovered fragment or group of identical fragments.
  // Absent for single-fragment and pure-N* formulas (hover highlights everything).
  canonRange?: [number, number];
  canonical?: number;
  // For 2* identical-fragment layers: all globally-offset canonicals (one per fragment).
  // buildSubHoverSpecs uses canonicals when present, falling back to canonical otherwise.
  canonicals?: number[];
  atom?: number;
  sign?: string;
  atoms?: number[];
  count?: number;

  /** DISPLAY-ONLY fragment context for multi-component h-layer cards.
   *  fragmentOffset is the cumulative heavy-atom offset of preceding components; atoms[]
   *  stay GLOBAL (they key the global auxMap for canvas highlights — subtract fragmentOffset
   *  for per-component DISPLAY only, NEVER for the auxMap lookup). componentIndex is 0-based.
   *  Both absent/0 for single-fragment molecules. */
  fragmentOffset?: number;
  componentIndex?: number;

  /** 'bond' kind: each pair is [leftCanonical, rightCanonical] with fragment offset applied.
   *  Single fragment: one pair. N* multi-fragment: one pair per fragment instance. */
  endpointPairs?: [number, number][];

  /** 'branch' kind: all [leftCanonical, rightCanonical] pairs for every hyphen inside the
   *  branch's brackets. Includes nested sub-branches. Fragment offset already applied.
   *  N* multi-fragment: pairs from all fragment instances combined. */
  bondPairs?: [number, number][];
}

// ---------------------------------------------------------------------------
// Layer helper parsers (ported from molecules.js lines 352–421)
// ---------------------------------------------------------------------------

/**
 * Parses the InChI connection layer text into canonical atom-pair bond tuples.
 * Handles linear chains, ring closures, and branch notation.
 * Port of molecules.js lines 352–378 — stack-based branch parser.
 */
export function parseConnectionBonds(text: string): [number, number][] {
  const bonds: [number, number][] = [];
  const stack: (number | null)[] = [];
  let i = 0;
  let last: number | null = null;
  while (i < text.length) {
    const c = text[i];
    if (c === '(') {
      stack.push(last);
      i++;
    } else if (c === ')') {
      last = stack.pop() ?? null;
      i++;
    } else if (c === '-') {
      i++;
    } else if (c === ',') {
      // Comma inside a branch: next atom bonds to the branch root, not the
      // previous atom. e.g. "19(18,23)" => 19-18 AND 19-23, not 18-23.
      if (stack.length) last = stack[stack.length - 1] as number | null;
      i++;
    } else if (/\d/.test(c)) {
      let j = i;
      while (j < text.length && /\d/.test(text[j])) j++;
      const n = parseInt(text.slice(i, j), 10);
      if (last != null) bonds.push([last, n]);
      last = n;
      i = j;
    } else {
      i++;
    }
  }
  return bonds;
}

// ---------------------------------------------------------------------------
// C-layer token types and tokenizer (for Phase 15 hover precision)
// ---------------------------------------------------------------------------

/**
 * Discriminated union of token types produced by tokenizeCLayerSeg.
 * All numeric values are LOCAL (pre-offset) — the caller applies offset
 * or canonicalFn after tokenization (Pitfall 3).
 */
export type CLayerToken =
  | { type: 'atom';   start: number; end: number; localN: number }
  | { type: 'hyphen'; pos: number; leftLocal: number | null; rightLocal: number | null }
  | { type: 'open';   pos: number; attachLocal: number | null; closeTokenIdx: number }
  | { type: 'close';  pos: number; openTokenIdx: number }
  | { type: 'other';  slice: string };

// Internal type aliases for narrowing within the tokenizer
type HyphenToken = Extract<CLayerToken, { type: 'hyphen' }>;
type OpenToken   = Extract<CLayerToken, { type: 'open' }>;

/**
 * Tokenizes a single c-layer segment (no ';' separators — those are split before calling).
 * Produces a CLayerToken[] array in a single O(n) forward scan.
 *
 * Key differences from parseConnectionBonds:
 * - Emits typed tokens instead of bond tuples.
 * - Stack tracks token *indices* of 'open' tokens so open/close pairs can cross-reference.
 * - On ')': restores lastLocal to the open token's attachLocal (Pitfall 2).
 * - All localN values are pre-offset (Pitfall 3).
 */
export function tokenizeCLayerSeg(seg: string): CLayerToken[] {
  const tokens: CLayerToken[] = [];
  const stack: number[] = []; // indices into tokens[] of pending 'open' tokens
  let lastLocal: number | null = null;
  let i = 0;
  while (i < seg.length) {
    const c = seg[i];
    if (/\d/.test(c)) {
      // Parse multi-digit integer
      let j = i;
      while (j < seg.length && /\d/.test(seg[j])) j++;
      const localN = parseInt(seg.slice(i, j), 10);
      // Fill rightLocal of the immediately preceding hyphen token
      if (tokens.length > 0 && tokens[tokens.length - 1].type === 'hyphen') {
        (tokens[tokens.length - 1] as HyphenToken).rightLocal = localN;
      }
      tokens.push({ type: 'atom', start: i, end: j, localN });
      lastLocal = localN;
      i = j;
    } else if (c === '-') {
      tokens.push({ type: 'hyphen', pos: i, leftLocal: lastLocal, rightLocal: null });
      i++;
    } else if (c === '(') {
      const openIdx = tokens.length;
      tokens.push({ type: 'open', pos: i, attachLocal: lastLocal, closeTokenIdx: -1 });
      stack.push(openIdx);
      i++;
    } else if (c === ')') {
      const openIdx = stack.pop() ?? -1;
      const closeIdx = tokens.length;
      tokens.push({ type: 'close', pos: i, openTokenIdx: openIdx });
      if (openIdx >= 0) {
        (tokens[openIdx] as OpenToken).closeTokenIdx = closeIdx;
        // Restore lastLocal to the branch attachment point (Pitfall 2)
        lastLocal = (tokens[openIdx] as OpenToken).attachLocal;
      }
      i++;
    } else {
      // comma, semicolon (shouldn't appear — segments are pre-split), etc.
      tokens.push({ type: 'other', slice: c });
      i++;
    }
  }
  return tokens;
}

/**
 * Walks an entire c-layer segment by atom ADJACENCY (the same semantics as
 * parseConnectionBonds) and returns every bond as a pseudo-hyphen token, preserving
 * the parent→child direction in which each bond is emitted. All values are LOCAL
 * (pre-offset). Hyphen characters carry no adjacency information — adjacency covers them.
 */
function segmentBonds(tokens: CLayerToken[]): Extract<CLayerToken, { type: 'hyphen' }>[] {
  const bonds: Extract<CLayerToken, { type: 'hyphen' }>[] = [];
  const stack: (number | null)[] = [];
  let last: number | null = null;
  for (const t of tokens) {
    if (t.type === 'atom') {
      if (last != null) bonds.push({ type: 'hyphen', pos: -1, leftLocal: last, rightLocal: t.localN });
      last = t.localN;
    } else if (t.type === 'open') {
      stack.push(last);
    } else if (t.type === 'close') {
      last = stack.pop() ?? null;
    } else if (t.type === 'other' && t.slice === ',') {
      if (stack.length) last = stack[stack.length - 1] as number | null;
    }
  }
  return bonds;
}

/**
 * Derives the bonds a parenthesis hover should highlight (CLYR-03).
 *
 * A parenthesis in the c-layer marks a BRANCH POINT: the atom the branch hangs off
 * (the open token's attachLocal). Hovering either '(' or ')' highlights every bond
 * INCIDENT TO that branch-point atom — the chain bond coming in, the bond into the
 * branch, and the chain bond continuing after the ')'. For a typical branch atom that
 * is exactly three bonds (e.g. ciprofloxacin "...11-14(8-...)21..." → 11-14, 14-8,
 * 14-21). This is the user-confirmed semantics; an earlier version highlighted the
 * whole substituent (clyr-03-paren-bonds), which lit up most of the molecule.
 *
 * Bonds are computed from the FULL segment by adjacency, then filtered to those
 * touching the branch-point atom, deduplicated by unordered endpoint pair (first-seen
 * direction kept). Returns pseudo-hyphen tokens so callers read endpoints uniformly.
 * All values are LOCAL (pre-offset).
 *
 * Used by ConnectionText (LayerText.tsx) to build bondPairs for branch hovers.
 */
export function collectBranchPointBonds(
  tokens: CLayerToken[],
  oi: number,
): Extract<CLayerToken, { type: 'hyphen' }>[] {
  const open = tokens[oi];
  if (open?.type !== 'open') return [];
  const p = open.attachLocal;
  if (p == null) return [];

  const seen = new Set<string>();
  const out: Extract<CLayerToken, { type: 'hyphen' }>[] = [];
  for (const b of segmentBonds(tokens)) {
    if (b.leftLocal !== p && b.rightLocal !== p) continue;
    const key = b.leftLocal! < b.rightLocal! ? `${b.leftLocal}-${b.rightLocal}` : `${b.rightLocal}-${b.leftLocal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

/**
 * Parses the InChI hydrogen layer text into a canonical atom → H-count map.
 * Handles ranges (1-6H), comma lists, and multipliers (H2, H3).
 * Strips mobile-H groups in parentheses before parsing.
 * Port of molecules.js lines 381–404.
 */
export function parseHydrogenAtoms(text: string): Record<number, number> {
  const out: Record<number, number> = {};
  // Strip parenthesised mobile-H groups: (H,3,4)
  const cleaned = text.replace(/\([^)]*\)/g, '');
  // Match runs of digits/commas/dashes followed by "Hn?", up to the next
  // comma or end of string.
  const re = /([\d,\-]+)H(\d*)(?=,|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    const count = m[2] ? parseInt(m[2], 10) : 1;
    for (const range of m[1].split(',')) {
      if (!range) continue;
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(n => parseInt(n, 10));
        for (let k = a; k <= b; k++) out[k] = count;
      } else {
        out[parseInt(range, 10)] = count;
      }
    }
  }
  return out;
}

/**
 * Parses mobile hydrogen groups from the InChI hydrogen layer.
 * Returns flat array of atom numbers from (H,a,b,...) groups.
 * Port of molecules.js lines 407–415.
 */
export function parseMobileHydrogens(text: string): number[] {
  const groups: number[] = [];
  const re = /\(H\d*,([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    groups.push(...m[1].split(',').map(n => parseInt(n, 10)));
  }
  return groups;
}

/**
 * Extracts canonical atom numbers from the InChI stereo layer (t or b layer).
 * Port of molecules.js lines 418–421.
 */
export function parseStereoAtoms(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(/(\d+)[\-+?]/g)) nums.push(parseInt(m[1], 10));
  return nums;
}

// ---------------------------------------------------------------------------
// Enrichment (new — not in design handoff JS; required per D-06/D-07/D-08/D-09)
// ---------------------------------------------------------------------------

/**
 * Counts total heavy atoms in a single-component formula like 'C6H6' or 'C2H6O'.
 * Hydrogen atoms are excluded because canonical numbering covers heavy atoms only.
 */
export function countFormulaAtoms(formulaText: string): number {
  let total = 0;
  for (const m of formulaText.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (m[1] !== 'H') total += m[2] ? parseInt(m[2], 10) : 1;
  }
  return total;
}

/**
 * Returns the per-fragment heavy-atom counts for a formula layer text.
 *
 * InChI uses two multi-fragment notations:
 *   "C7H8.C6H6"    — dot-separated different components → [7, 6]
 *   "2C6H6"        — multiplier for identical components → [6, 6]
 *   "C7H8.2C6H6"  — mixed: dot-separated with multiplied sub-group → [7, 6, 6]
 *   "C6H6"         — single component                   → [6]
 */
export function formulaFragmentCounts(formulaText: string): number[] {
  if (formulaText.includes('.')) {
    return formulaText.split('.').flatMap(seg => {
      const multMatch = seg.match(/^(\d+)([A-Z])/);
      if (multMatch) {
        const n = parseInt(multMatch[1], 10);
        const base = countFormulaAtoms(seg.slice(multMatch[1].length));
        return Array(n).fill(base) as number[];
      }
      return [countFormulaAtoms(seg)];
    });
  }
  const multMatch = formulaText.match(/^(\d+)([A-Z])/);
  if (multMatch) {
    const n = parseInt(multMatch[1], 10);
    const base = countFormulaAtoms(formulaText.slice(multMatch[1].length));
    return Array(n).fill(base) as number[];
  }
  return [countFormulaAtoms(formulaText)];
}

/**
 * Expands a layer text segment into per-fragment strings.
 *
 * Three InChI multi-fragment formats are handled:
 *   "2*1-2-4-6-5-3-1"              — top-level multiplier → ["1-2-4-6-5-3-1", "1-2-4-6-5-3-1"]
 *   "1-7-5-3-2-4-6-7;1-2-4"       — semicolon notation   → ["1-7-5-3-2-4-6-7", "1-2-4"]
 *   "1-7-5-3-2-4-6-7;2*1-2-4-6-5-3-1" — mixed           → ["1-7-5-3-2-4-6-7", "1-2-4-6-5-3-1", "1-2-4-6-5-3-1"]
 *   "1-2-4-6-5-3-1"                — single fragment     → ["1-2-4-6-5-3-1"]
 */
export function expandLayerText(text: string): string[] {
  return text.split(';').flatMap(seg => {
    const segMult = seg.match(/^(\d+)\*([\s\S]*)$/);
    if (segMult) {
      const n = parseInt(segMult[1], 10);
      return Array(n).fill(segMult[2]) as string[];
    }
    return [seg];
  });
}

/**
 * Enriches parsed layers by filling in `atoms[]` and `bonds[]` per layer type.
 * Runs after the raw layer split in parseInchi().
 *
 * Enrichment table (per D-06/D-07/D-08/D-09 and RESEARCH.md Pattern 5):
 *   version  → atoms: [],       bonds: []
 *   formula  → atoms: [1..N],   bonds: []
 *   c        → atoms: deduplicated from parseConnectionBonds, bonds: those bond tuples
 *   h        → atoms: keys(parseHydrogenAtoms) + parseMobileHydrogens, bonds: []
 *   t, b     → atoms: parseStereoAtoms, bonds: []
 *   others   → atoms: [], bonds: []
 */
function enrichLayers(layers: Layer[]): Layer[] {
  const formulaLayer = layers.find(l => l.type === 'formula');

  // Per-fragment heavy-atom counts — handles both "C7H8.C6H6" and "2C6H6" notation.
  const fragCounts = formulaLayer ? formulaFragmentCounts(formulaLayer.text) : [];
  const totalAtoms = fragCounts.reduce((s, n) => s + n, 0);

  return layers.map(layer => {
    switch (layer.type) {
      case 'formula':
        return { ...layer, atoms: Array.from({ length: totalAtoms }, (_, idx) => idx + 1) };
      case 'c': {
        // expandLayerText handles both "2*text" (multiplier) and "text;text" (semicolon).
        const fragmentTexts = expandLayerText(layer.text);
        const allBonds: [number, number][] = [];
        const atomSet = new Set<number>();
        let cumulativeOffset = 0;
        fragmentTexts.forEach((fragText, fi) => {
          const rawBonds = parseConnectionBonds(fragText);
          rawBonds.forEach(([a, b]) => {
            const oa = a + cumulativeOffset;
            const ob = b + cumulativeOffset;
            allBonds.push([oa, ob]);
            atomSet.add(oa);
            atomSet.add(ob);
          });
          cumulativeOffset += fragCounts[fi] ?? 0;
        });
        return { ...layer, atoms: [...atomSet].sort((a, b) => a - b), bonds: allBonds };
      }
      case 'h': {
        const fragmentTexts = expandLayerText(layer.text);
        const allAtoms = new Set<number>();
        let cumulativeOffset = 0;
        fragmentTexts.forEach((fragText, fi) => {
          const fixed = Object.keys(parseHydrogenAtoms(fragText)).map(Number);
          const mobile = parseMobileHydrogens(fragText);
          fixed.forEach(a => allAtoms.add(a + cumulativeOffset));
          mobile.forEach(a => allAtoms.add(a + cumulativeOffset));
          cumulativeOffset += fragCounts[fi] ?? 0;
        });
        return { ...layer, atoms: [...allAtoms].sort((a, b) => a - b) };
      }
      case 't':
      case 'b': {
        const fragmentTexts = expandLayerText(layer.text);
        const allAtoms: number[] = [];
        let cumulativeOffset = 0;
        fragmentTexts.forEach((fragText, fi) => {
          const stereoAtoms = parseStereoAtoms(fragText);
          stereoAtoms.forEach(a => allAtoms.push(a + cumulativeOffset));
          cumulativeOffset += fragCounts[fi] ?? 0;
        });
        return { ...layer, atoms: allAtoms.sort((a, b) => a - b) };
      }
      default:
        return layer; // version, m, s, q, p, i — atoms: [], bonds: []
    }
  });
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Splits an InChI string into typed, enriched Layer objects.
 * Port of molecules.js lines 335–348, extended with enrichLayers().
 *
 * parseInchi('InChI=1S//') returns layers.length === 1 (version only, no formula),
 * enabling the empty-canvas guard in App.tsx (D-13).
 */
export function parseInchi(s: string): Layer[] {
  const body = s.slice('InChI='.length);
  const parts = body.split('/');
  const layers: Layer[] = [];
  layers.push({ type: 'version', prefix: '', text: parts[0], atoms: [], bonds: [] });
  if (parts[1]) {
    layers.push({ type: 'formula', prefix: '', text: parts[1], atoms: [], bonds: [] });
  }
  for (let i = 2; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const prefix = p[0] as LayerType;
    layers.push({ type: prefix, prefix, text: p.slice(1), atoms: [], bonds: [] });
  }
  return enrichLayers(layers);
}
