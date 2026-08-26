// AuxInfo parsing — pure module, no browser globals, Node-compatible for Vitest.
// Parses the N: field from Ketcher's getInchi(true) AuxInfo block.
// Based on CONTEXT.md D-10/D-11 and RESEARCH.md Pattern 3.

import {
  parseInchi,
  formulaFragmentCounts,
  expandFormulaFragments,
  skeletonHydrogenCounts,
} from './parseInchi';
import type { Layer, AuxMap } from './parseInchi';

/**
 * Derives a canonical → element symbol map from enriched layers.
 * Uses the formula layer's atom list and resolves element symbols from the formula text.
 * Returns Record<canonicalIndex, elementSymbol>.
 */
export function buildAtomElements(layers: Layer[]): Record<number, string> {
  const formulaLayer = layers.find(l => l.type === 'formula');
  if (!formulaLayer) return {};
  const hLayer = layers.find(l => l.type === 'h');
  const skeletonH = skeletonHydrogenCounts(formulaLayer.text, hLayer?.text ?? '');

  const out: Record<number, string> = {};
  let canon = 1;
  expandFormulaFragments(formulaLayer.text).forEach((frag, fi) => {
    for (const m of frag.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
      if (!m[1] || m[1] === 'H') continue;
      const count = m[2] ? parseInt(m[2], 10) : 1;
      for (let i = 0; i < count; i++) out[canon++] = m[1];
    }
    // Bridging H are numbered after every heavy atom of their fragment.
    for (let i = 0; i < (skeletonH[fi] ?? 0); i++) out[canon++] = 'H';
  });
  return out;
}

/**
 * Builds a canonical → Ketcher-index map from an AuxInfo body string.
 *
 * Input: the portion AFTER "AuxInfo=" — e.g. "1/0/N:1,2,6,3,5,4/E:..."
 *
 * The N: field lists 1-based Ketcher draw-order atom indices in canonical order.
 * Position i (0-based) in the list = canonical atom (i+1).
 * Result: auxMap[canonicalIdx] = ketcherDrawOrderValue - 1  (0-based index)
 *
 * Per D-10: keys are canonical 1-based, values are Ketcher 0-based.
 * Per T-02-01: keys are always integers; NaN guard prevents invalid assignment.
 *
 * OPEN QUESTION (Assumption A2): if Ketcher 3.12.0 on Windows uses \r\n, the
 * caller (parseInchiWithAux) must account for that. Verify by drawing benzene
 * in the running app and logging: window.ketcher.getInchi(true).then(r => console.log(JSON.stringify(r)))
 * (window.ketcher is a dev-build handle only — see the guard in App.tsx handleInit)
 */
export function parseAuxMapping(auxBody: string, formulaText?: string): AuxMap {
  const parts = auxBody.split('/');
  const nPart = parts.find(p => p.startsWith('N:'));
  if (!nPart) return {};
  const map: AuxMap = {};

  const nValue = nPart.slice(2);

  // Single-fragment, no multiplier — global Ketcher draw-order values.
  if (!nValue.includes(';') && !/^\d+\*/.test(nValue)) {
    const values = nValue.split(',');
    values.forEach((v, i) => {
      const n = parseInt(v, 10);
      if (!isNaN(n)) map[i + 1] = n - 1;
    });
    return map;
  }

  // Multi-fragment or multiplied.
  // Segments with "N*vals" use LOCAL 1-based ranks (fragOffset + localRank - 1).
  // Plain segments use GLOBAL 1-based Ketcher draw-order (n - 1).
  const fragmentAtomCounts = formulaText ? formulaFragmentCounts(formulaText) : null;
  const segments = nValue.split(';');
  let globalOffset = 0;
  let fragFormulaIdx = 0;

  segments.forEach(seg => {
    const segMult = seg.match(/^(\d+)\*([\s\S]*)$/);
    if (segMult) {
      const n = parseInt(segMult[1], 10);
      const localValues = segMult[2].split(',');
      const atomsPerFrag = fragmentAtomCounts?.[fragFormulaIdx] ?? localValues.length;
      for (let fi = 0; fi < n; fi++) {
        const fragOffset = globalOffset + fi * atomsPerFrag;
        localValues.forEach((v, i) => {
          const localRank = parseInt(v, 10);
          if (!isNaN(localRank)) map[fragOffset + i + 1] = fragOffset + (localRank - 1);
        });
        fragFormulaIdx++;
      }
      globalOffset += n * atomsPerFrag;
    } else {
      const values = seg.split(',');
      values.forEach((v, i) => {
        const n = parseInt(v, 10);
        if (!isNaN(n)) map[globalOffset + i + 1] = n - 1;
      });
      const atomsForFrag = fragmentAtomCounts?.[fragFormulaIdx] ?? values.length;
      globalOffset += atomsForFrag;
      fragFormulaIdx++;
    }
  });

  return map;
}

/**
 * Splits the raw string returned by ketcher.getInchi(true) into its InChI
 * string, enriched layers array, and AuxMap.
 *
 * getInchi(true) format (per D-11 / RESEARCH.md Pattern 3):
 *   "InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H\nAuxInfo=1/0/N:1,2,6,3,5,4/..."
 *
 * If no AuxInfo section is present (shouldn't happen with getInchi(true) on a
 * non-empty canvas), returns the plain InChI with an empty auxMap.
 */
/**
 * Parses the AuxInfo `/rC:` field into molfile-order coordinates.
 *
 * Format: `/rC:x,y,z;x,y,z;.../` — semicolon-separated triples, comma-separated
 * x,y,z. Index i (0-based) = molfile rank i. We take x and y, ignoring z.
 * Ketcher exports molfile with y NEGATED relative to the live editor's screen y.
 *
 * Returns [] when the body contains no `/rC:` field. Empty triples (e.g. the
 * placeholder `;;;` Ketcher sometimes emits with no coords) parse to NaN and are
 * preserved positionally so rank indexing stays aligned.
 */
function parseRcField(auxBody: string): { x: number; y: number }[] {
  const marker = '/rC:';
  const start = auxBody.indexOf(marker);
  if (start === -1) return [];
  const after = auxBody.slice(start + marker.length);
  const end = after.indexOf('/');
  const body = end === -1 ? after : after.slice(0, end);
  // Trailing ';' produces a final empty entry — drop only a single trailing empty.
  const triples = body.split(';');
  if (triples.length > 0 && triples[triples.length - 1] === '') triples.pop();
  return triples.map(triple => {
    const nums = triple.split(',');
    return { x: parseFloat(nums[0]), y: parseFloat(nums[1]) };
  });
}

/**
 * Remaps an AuxMap (canonical → molfile rank) to canonical → Ketcher pool ID by
 * matching each molfile rank's coordinate to the live editor atom at the same
 * position. Ketcher screen y is the negation of molfile y, so a live atom matches
 * rank r when liveAtom.x ≈ molfileCoords[r].x AND -liveAtom.y ≈ molfileCoords[r].y.
 *
 * Why coordinate matching: for multi-component molecules getInchi's molfile groups
 * atoms by connected component, but pool IDs are interleaved across components, so
 * molfile rank order != pool-ID iteration order. Coordinate matching is order-free.
 *
 * Fallback: when molfileCoords is empty, the rank has no coords, or no live atom is
 * within epsilon (0.05 combined |dx|+|dy|), fall back to fallbackPoolIds[rank]
 * (iteration-order behavior). This guarantees no regression for the single-component
 * sequential case where rank order == iteration order.
 *
 * Pure: no DOM, no Ketcher imports.
 */
export function remapAuxToPoolIds(
  auxMap: AuxMap,
  molfileCoords: { x: number; y: number }[],
  liveAtoms: { poolId: number; x: number; y: number }[],
  fallbackPoolIds: number[],
): Record<number, number> {
  const EPSILON = 0.05;
  const result: Record<number, number> = {};
  for (const [canonStr, rank] of Object.entries(auxMap)) {
    const canon = Number(canonStr);
    const r = rank as number;
    const coords = molfileCoords[r];
    let matched: number | undefined;
    if (coords && !Number.isNaN(coords.x) && !Number.isNaN(coords.y)) {
      let bestDist = Infinity;
      let bestPoolId: number | undefined;
      for (const live of liveAtoms) {
        const dist = Math.abs(live.x - coords.x) + Math.abs(-live.y - coords.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestPoolId = live.poolId;
        }
      }
      if (bestPoolId !== undefined && bestDist < EPSILON) matched = bestPoolId;
    }
    if (matched !== undefined) {
      result[canon] = matched;
    } else {
      const fb = fallbackPoolIds[r];
      if (fb !== undefined) result[canon] = fb;
    }
  }
  return result;
}

export function parseInchiWithAux(raw: string): {
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
  atomElements: Record<number, string>;
  molfileCoords: { x: number; y: number }[];
} {
  const sep = '\nAuxInfo=';
  const idx = raw.indexOf(sep);
  if (idx === -1) {
    // No AuxInfo section — plain InChI (shouldn't happen with getInchi(true) on non-empty canvas)
    const layers = parseInchi(raw);
    return { inchi: raw, layers, auxMap: {}, atomElements: buildAtomElements(layers), molfileCoords: [] };
  }
  const inchiStr = raw.slice(0, idx);
  const auxBody = raw.slice(idx + sep.length);
  const layers = parseInchi(inchiStr);
  const formulaLayer = layers.find(l => l.type === 'formula');
  return {
    inchi: inchiStr,
    layers,
    auxMap: parseAuxMapping(auxBody, formulaLayer?.text ?? ''),
    atomElements: buildAtomElements(layers),
    molfileCoords: parseRcField(auxBody),
  };
}
