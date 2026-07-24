// src/lib/highlightUtils.ts
// Pure highlight spec builder — no browser globals required.
// resolveVarFn is injected so this module is testable in Node (vitest environment: 'node').
// Production caller passes: (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

import type { Layer, SubHover, AuxMap } from './parseInchi';
import {
  parseHydrogenAtoms,
  parseMobileHydrogens,
  parseStereoAtoms,
  formulaFragmentCounts,
  expandLayerText,
} from './parseInchi';

import {
  elementColor,
  hydroColor,
  parityColor,
  parseStereoParities,
  parseBondStereoEntries,
} from './layerInfo';

export type HighlightSpec = {
  atoms: number[];
  bonds: number[];
  rgroupAttachmentPoints: number[];
  color: string;
};

// Minimal struct interface — only the methods/properties Phase 4 needs
export interface StructLike {
  findBondId(begin: number, end: number): number | null;
  bonds: { forEach(cb: (bond: { begin: number; end: number }, id: number) => void): void };
  atoms: { forEach(cb: (atom: { charge?: number | null }, id: number) => void): void };
}

/** Production implementation: reads CSS custom property and converts to rgb for Ketcher SVG renderer.
 * getComputedStyle returns oklch() strings which Raphaël cannot parse — use canvas to normalise. */
export function resolveVar(name: string): string {
  // A concrete hex is already Raphaël-safe — no CSS-var lookup needed.
  if (name.startsWith('#')) return name;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return '#888';
  // Convert to rgb via a 1x1 canvas — handles oklch, hsl, named colors, etc.
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r},${g},${b})`;
  } catch {
    return raw;
  }
}

/**
 * Strips a CSS var() wrapper to get the custom property name.
 * elementColor('C') => 'var(--c-el-C)' => '--c-el-C'
 */
function stripVar(cssVar: string): string {
  return cssVar.replace('var(', '').replace(')', '');
}

export function buildHighlightSpecs(
  layer: Layer,
  subHover: SubHover | null,
  auxMap: AuxMap,
  atomElements: Record<number, string>,
  hAtomPoolIds: number[] = [],
  layers: Layer[],
  struct: StructLike,
  resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  // When subHover is active, delegate entirely to buildSubHoverSpecs (D-05)
  if (subHover !== null) {
    return buildSubHoverSpecs(subHover, auxMap, atomElements, hAtomPoolIds, layer, struct, resolveVarFn);
  }

  // NON-SPATIAL layers — no canvas highlight (D-01)
  if (['version', 'i'].includes(layer.type)) {
    return [];
  }

  switch (layer.type) {
    case 'formula': {
      // Group atoms by resolved element color
      const colorToAtoms = new Map<string, number[]>();
      for (const canon of layer.atoms) {
        const el = atomElements[canon];
        if (!el) continue;
        const kId = auxMap[canon];
        if (kId === undefined) continue;
        const color = resolveVarFn(stripVar(elementColor(el)));
        if (!colorToAtoms.has(color)) colorToAtoms.set(color, []);
        colorToAtoms.get(color)!.push(kId);
      }
      // Append explicit H atom pool IDs with H element color (D-05)
      if (hAtomPoolIds.length > 0) {
        const hColor = resolveVarFn(stripVar(elementColor('H')));
        const existing = colorToAtoms.get(hColor) ?? [];
        colorToAtoms.set(hColor, [...existing, ...hAtomPoolIds]);
      }
      const specs: HighlightSpec[] = [];
      for (const [color, atoms] of colorToAtoms) {
        specs.push({ atoms, bonds: [], rgroupAttachmentPoints: [], color });
      }
      return specs.filter(s => s.atoms.length > 0 || s.bonds.length > 0);
    }

    case 'c': {
      // Map canonical atoms through auxMap
      const kAtoms = layer.atoms
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);

      // Resolve bonds via findBondId for each canonical bond pair
      const kBonds: number[] = [];
      for (const [a, b] of layer.bonds) {
        const kA = auxMap[a];
        const kB = auxMap[b];
        if (kA === undefined || kB === undefined) continue;
        const bid = struct.findBondId(kA, kB);
        if (bid !== null) kBonds.push(bid);
      }

      const color = resolveVarFn('--c-conn');
      const specs: HighlightSpec[] = [
        { atoms: kAtoms, bonds: kBonds, rgroupAttachmentPoints: [], color },
      ];
      return specs.filter(s => s.atoms.length > 0 || s.bonds.length > 0);
    }

    case 'h': {
      const formulaLayerH = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsH = formulaLayerH ? formulaFragmentCounts(formulaLayerH.text) : [];

      // expandLayerText handles both "2*1-6H" (multiplier) and "2-6H;1-6H" (semicolon)
      const fragmentTextsH = expandLayerText(layer.text);
      const colorToAtoms = new Map<string, number[]>();
      let cumulativeOffsetH = 0;
      fragmentTextsH.forEach((fragText, fi) => {
        const hydroAtoms = parseHydrogenAtoms(fragText);
        for (const [canonStr, count] of Object.entries(hydroAtoms)) {
          const canon = Number(canonStr) + cumulativeOffsetH;
          const colorVar = hydroColor(count);
          if (!colorVar) continue; // count < 1 — skip
          const kId = auxMap[canon];
          if (kId === undefined) continue;
          const color = resolveVarFn(stripVar(colorVar));
          if (!colorToAtoms.has(color)) colorToAtoms.set(color, []);
          colorToAtoms.get(color)!.push(kId);
        }
        cumulativeOffsetH += fragmentAtomCountsH[fi] ?? 0;
      });

      // Mobile hydrogen atoms — same per-fragment offset approach
      cumulativeOffsetH = 0;
      const mobileKAtoms: number[] = [];
      fragmentTextsH.forEach((fragText, fi) => {
        parseMobileHydrogens(fragText).forEach(c => {
          const kId = auxMap[c + cumulativeOffsetH];
          if (kId !== undefined) mobileKAtoms.push(kId);
        });
        cumulativeOffsetH += fragmentAtomCountsH[fi] ?? 0;
      });

      const specs: HighlightSpec[] = [];
      for (const [color, atoms] of colorToAtoms) {
        specs.push({ atoms, bonds: [], rgroupAttachmentPoints: [], color });
      }
      if (mobileKAtoms.length > 0) {
        const mobileColor = resolveVarFn('--c-hydro-mobile');
        specs.push({ atoms: mobileKAtoms, bonds: [], rgroupAttachmentPoints: [], color: mobileColor });
      }
      return specs.filter(s => s.atoms.length > 0 || s.bonds.length > 0);
    }

    case 't': {
      const formulaLayerT = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsT = formulaLayerT ? formulaFragmentCounts(formulaLayerT.text) : [];
      const fragmentTextsT = expandLayerText(layer.text);
      const plusAtoms: number[] = [];
      const minusAtoms: number[] = [];
      const undefinedAtoms: number[] = [];
      let cumulativeOffsetT = 0;
      fragmentTextsT.forEach((fragText, fi) => {
        const parities = parseStereoParities(fragText);
        for (const [canonStr, sign] of Object.entries(parities)) {
          const canon = Number(canonStr) + cumulativeOffsetT;
          const kId = auxMap[canon];
          if (kId === undefined) continue;
          if (sign === '+') plusAtoms.push(kId);
          else if (sign === '-') minusAtoms.push(kId);
          else undefinedAtoms.push(kId); // '?' — undefined/unspecified center
        }
        cumulativeOffsetT += fragmentAtomCountsT[fi] ?? 0;
      });

      const specs: HighlightSpec[] = [];
      if (plusAtoms.length > 0) {
        specs.push({
          atoms: plusAtoms,
          bonds: [],
          rgroupAttachmentPoints: [],
          color: resolveVarFn('--c-stereo-plus'),
        });
      }
      if (minusAtoms.length > 0) {
        specs.push({
          atoms: minusAtoms,
          bonds: [],
          rgroupAttachmentPoints: [],
          color: resolveVarFn('--c-stereo-minus'),
        });
      }
      if (undefinedAtoms.length > 0) {
        specs.push({
          atoms: undefinedAtoms,
          bonds: [],
          rgroupAttachmentPoints: [],
          color: resolveVarFn('--c-stereo'),
        });
      }
      return specs;
    }

    case 'p': {
      // Primary: highlight mobile-H bearing atoms from the /h layer (the actual protonation sites).
      // Fallback: all heteroatoms, for molecules with no mobile-H notation.
      const hLayerP = layers.find(l => l.type === 'h');
      if (hLayerP) {
        const formulaLayerP = layers.find(l => l.type === 'formula');
        const fragmentAtomCountsP = formulaLayerP ? formulaFragmentCounts(formulaLayerP.text) : [];
        const fragmentTextsP = expandLayerText(hLayerP.text);
        const mobileKAtoms: number[] = [];
        let cumulativeOffsetP = 0;
        fragmentTextsP.forEach((fragText, fi) => {
          parseMobileHydrogens(fragText).forEach(c => {
            const kId = auxMap[c + cumulativeOffsetP];
            if (kId !== undefined) mobileKAtoms.push(kId);
          });
          cumulativeOffsetP += fragmentAtomCountsP[fi] ?? 0;
        });
        if (mobileKAtoms.length > 0) {
          return [{ atoms: mobileKAtoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVarFn('--c-proton') }];
        }
      }
      // Fallback: collect heteroatom canonical indices (not C, not H)
      const heteroIds: number[] = [];
      for (const [canonStr, el] of Object.entries(atomElements)) {
        if (el === 'C' || el === 'H') continue;
        const canon = Number(canonStr);
        const kId = auxMap[canon];
        if (kId === undefined) continue;
        heteroIds.push(kId);
      }
      if (heteroIds.length === 0) return [];
      return [{ atoms: heteroIds, bonds: [], rgroupAttachmentPoints: [], color: resolveVarFn('--c-proton') }];
    }

    case 'q': {
      // /q text is per-fragment (semicolon-separated), e.g. "+2;" means fragment 1 charged, fragment 2 not.
      // For each fragment with a non-zero q entry, prefer atoms that carry a formal charge in the Ketcher
      // struct (precise, e.g. quaternary N+). Fall back to all atoms in the fragment if none do (delocalized).
      const qFragments = layer.text.split(';');

      const poolCharges = new Map<number, number>();
      struct.atoms.forEach((atom, poolId) => {
        if (atom.charge != null && atom.charge !== 0) poolCharges.set(poolId, atom.charge);
      });

      // Single-fragment: avoid dependence on formulaFragmentCounts — use Object.values(auxMap) directly.
      // This is robust even when the formula atom count and auxMap disagree.
      if (qFragments.length === 1) {
        const trimmed = qFragments[0].trim();
        if (!trimmed || trimmed === '0') return [];
        const formallyCharged = [...poolCharges.keys()];
        const atoms = formallyCharged.length > 0 ? formallyCharged : Object.values(auxMap);
        if (atoms.length === 0) return [];
        return [{ atoms, bonds: [], rgroupAttachmentPoints: [], color: resolveVarFn('--c-charge') }];
      }

      // Multi-fragment: use formula layer to restrict to charged fragments only.
      const formulaLayerQ = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsQ = formulaLayerQ ? formulaFragmentCounts(formulaLayerQ.text) : [];
      const chargedIds: number[] = [];
      let cumulativeOffsetQ = 0;
      qFragments.forEach((qText, fi) => {
        const trimmed = qText.trim();
        const fragCount = fragmentAtomCountsQ[fi] ?? 0;
        if (trimmed && trimmed !== '0') {
          const fragPoolIds: number[] = [];
          for (let i = 1; i <= fragCount; i++) {
            const kId = auxMap[cumulativeOffsetQ + i];
            if (kId !== undefined) fragPoolIds.push(kId);
          }
          const formallyCharged = fragPoolIds.filter(id => poolCharges.has(id));
          chargedIds.push(...(formallyCharged.length > 0 ? formallyCharged : fragPoolIds));
        }
        cumulativeOffsetQ += fragCount;
      });
      if (chargedIds.length === 0) return [];
      return [{ atoms: chargedIds, bonds: [], rgroupAttachmentPoints: [], color: resolveVarFn('--c-charge') }];
    }

    case 'b': {
      // Double-bond stereo (E/Z): highlight the two atoms and the bond between them.
      // b-layer format: "9-4+,12-6-" — each entry is a canonical atom pair + E/Z sign.
      const formulaLayerB = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsB = formulaLayerB ? formulaFragmentCounts(formulaLayerB.text) : [];
      const fragmentTextsB = expandLayerText(layer.text);
      const plusAtoms: number[] = [];
      const minusAtoms: number[] = [];
      const plusBonds: number[] = [];
      const minusBonds: number[] = [];
      let cumulativeOffsetB = 0;
      fragmentTextsB.forEach((fragText, fi) => {
        for (const { a1, a2, sign } of parseBondStereoEntries(fragText)) {
          const kA1 = auxMap[a1 + cumulativeOffsetB];
          const kA2 = auxMap[a2 + cumulativeOffsetB];
          if (kA1 === undefined || kA2 === undefined) continue;
          const bid = struct.findBondId(kA1, kA2);
          if (sign === '+') {
            plusAtoms.push(kA1, kA2);
            if (bid !== null) plusBonds.push(bid);
          } else {
            minusAtoms.push(kA1, kA2);
            if (bid !== null) minusBonds.push(bid);
          }
        }
        cumulativeOffsetB += fragmentAtomCountsB[fi] ?? 0;
      });

      const specs: HighlightSpec[] = [];
      if (plusAtoms.length > 0 || plusBonds.length > 0) {
        specs.push({ atoms: plusAtoms, bonds: plusBonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-stereo-plus') });
      }
      if (minusAtoms.length > 0 || minusBonds.length > 0) {
        specs.push({ atoms: minusAtoms, bonds: minusBonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-stereo-minus') });
      }
      return specs;
    }

    case 'm':
    case 's': {
      // Delegate to co-present t-layer atoms
      const tLayer = layers.find(l => l.type === 't');
      if (!tLayer) return [];
      const formulaLayerMS = layers.find(l => l.type === 'formula');
      const fragmentAtomCountsMS = formulaLayerMS ? formulaFragmentCounts(formulaLayerMS.text) : [];
      const fragmentTextsMS = expandLayerText(tLayer.text);
      const kAtoms: number[] = [];
      let cumulativeOffsetMS = 0;
      fragmentTextsMS.forEach((fragText, fi) => {
        parseStereoAtoms(fragText).forEach(c => {
          const kId = auxMap[c + cumulativeOffsetMS];
          if (kId !== undefined) kAtoms.push(kId);
        });
        cumulativeOffsetMS += fragmentAtomCountsMS[fi] ?? 0;
      });

      if (kAtoms.length === 0) return [];
      const color = resolveVarFn('--c-stereo');
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    default:
      return [];
  }
}

export function buildSubHoverSpecs(
  subHover: SubHover,
  auxMap: AuxMap,
  atomElements: Record<number, string>,
  hAtomPoolIds: number[] = [],
  layer: Layer,
  struct: StructLike,
  resolveVarFn: (name: string) => string,
): HighlightSpec[] {
  switch (subHover.kind) {
    case 'element': {
      const el = subHover.el!;
      // Explicit H atoms: direct pool ID list, no canonical lookup (D-04, D-06)
      if (el === 'H') {
        if (hAtomPoolIds.length === 0) return []; // silent no-op per D-04
        const color = resolveVarFn(stripVar(elementColor('H')));
        // No canonRange → single-fragment behavior unchanged: all explicit H atoms.
        if (subHover.canonRange === undefined) {
          return [{ atoms: hAtomPoolIds, bonds: [], rgroupAttachmentPoints: [], color }];
        }
        // Fragment-scoped: keep only explicit H atoms whose bonded heavy-atom
        // canonical falls inside the hovered fragment's [lo, hi] range.
        const [lo, hi] = subHover.canonRange;
        const poolToCanon = new Map<number, number>();
        for (const [cStr, pid] of Object.entries(auxMap)) poolToCanon.set(pid, Number(cStr));
        const scoped: number[] = [];
        for (const hPid of hAtomPoolIds) {
          let neighbor: number | undefined;
          struct.bonds.forEach((bond) => {
            const other =
              bond.begin === hPid ? bond.end : bond.end === hPid ? bond.begin : undefined;
            if (other === undefined) return; // bond not incident to this H
            if (hAtomPoolIds.includes(other)) return; // defensively skip H–H
            neighbor = other;
          });
          if (neighbor === undefined) continue;
          const neighborCanon = poolToCanon.get(neighbor);
          if (neighborCanon === undefined) continue;
          if (neighborCanon >= lo && neighborCanon <= hi) scoped.push(hPid);
        }
        if (scoped.length === 0) return [];
        return [{ atoms: scoped, bonds: [], rgroupAttachmentPoints: [], color }];
      }
      // Restrict to the canonical ID range of the hovered fragment or group.
      // Used for dot-separated formulas (e.g. C7H8.C6H6, C7H8.2C6H6).
      let atomsToCheck = layer.atoms;
      if (subHover.canonRange !== undefined) {
        const [lo, hi] = subHover.canonRange;
        atomsToCheck = layer.atoms.filter(c => c >= lo && c <= hi);
      }
      const kAtoms = atomsToCheck
        .filter(canon => atomElements[canon] === el)
        .map(canon => auxMap[canon])
        .filter((id): id is number => id !== undefined);
      if (kAtoms.length === 0) return [];
      const color = resolveVarFn(stripVar(elementColor(el)));
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'atom': {
      // canonicals is set for 2* identical-fragment layers (one canonical per fragment).
      // Falls back to the single canonical field for single-fragment and ;-separated layers.
      const canonIds = subHover.canonicals ?? (subHover.canonical != null ? [subHover.canonical] : []);
      const kAtomIds = canonIds.map(c => auxMap[c]).filter((id): id is number => id !== undefined);
      if (kAtomIds.length === 0) return [];
      // CLYR-01 (D-01): atom number hover highlights ONLY the atom — no incident bonds.
      // Bonds are reachable via their own hyphen tokens (kind:'bond').
      const color = resolveVarFn('--c-conn');
      return [{ atoms: kAtomIds, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'bond': {
      // CLYR-02 (D-02): hyphen hover highlights only the bond between the two endpoint atoms.
      // endpointPairs: [[leftCanonical, rightCanonical], ...] — offset already applied by caller.
      // N* multi-fragment: multiple pairs, one per fragment instance.
      const bonds: number[] = [];
      for (const [a, b] of subHover.endpointPairs ?? []) {
        const kA = auxMap[a];
        const kB = auxMap[b];
        if (kA === undefined || kB === undefined) continue;
        const bid = struct.findBondId(kA, kB);
        if (bid !== null) bonds.push(bid);
      }
      if (bonds.length === 0) return [];
      return [{ atoms: [], bonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-conn') }];
    }

    case 'branch': {
      // CLYR-03 (D-03/D-04): parenthesis hover highlights all bonds in the branch (incl. nested
      // sub-branches and the stem bond). bondPairs: all hyphen pairs within the branch token range.
      // Deduplication via includes() guard prevents nested branches from producing duplicate bond IDs.
      const bonds: number[] = [];
      for (const [a, b] of subHover.bondPairs ?? []) {
        const kA = auxMap[a];
        const kB = auxMap[b];
        if (kA === undefined || kB === undefined) continue;
        const bid = struct.findBondId(kA, kB);
        if (bid !== null && !bonds.includes(bid)) bonds.push(bid);
      }
      if (bonds.length === 0) return [];
      return [{ atoms: [], bonds, rgroupAttachmentPoints: [], color: resolveVarFn('--c-conn') }];
    }

    case 'stereo': {
      const kAtomId = auxMap[subHover.atom!];
      if (kAtomId === undefined) return [];
      const color = resolveVarFn(stripVar(parityColor(subHover.sign!)));
      return [{ atoms: [kAtomId], bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'hAtoms': {
      // QUICK-260610-ist (LOCKED rule 1): explicit-H-only highlight.
      // The /h-layer token lists the HEAVY atoms that bear H (e.g. "1-6H" = carbons
      // 1–6), never the H atoms themselves. Resolve the explicit (drawn) H by
      // traversing bonds from each heavy atom to neighbour pool IDs that are in
      // hAtomPoolIds. Highlight ONLY those H atoms — NO heavy-atom fill, NO bonds.
      // Implicit-H count badges are rendered separately by the hook (renderHBadges),
      // decoupled from this spec set. If no explicit H are drawn for this token,
      // return [] — the hook still renders badges from count.
      const canonAtoms = subHover.atoms ?? [];
      const explicitHKAtoms: number[] = [];
      for (const canon of canonAtoms) {
        const heavyId = auxMap[canon];
        if (heavyId === undefined) continue;
        struct.bonds.forEach((bond) => {
          const neighbor =
            bond.begin === heavyId ? bond.end : bond.end === heavyId ? bond.begin : undefined;
          if (neighbor === undefined) return;
          if (hAtomPoolIds.includes(neighbor) && !explicitHKAtoms.includes(neighbor)) {
            explicitHKAtoms.push(neighbor);
          }
        });
      }
      if (explicitHKAtoms.length === 0) return [];
      const colorVar = hydroColor(subHover.count!) ?? 'var(--c-hydro-1)';
      const color = resolveVarFn(stripVar(colorVar));
      return [{ atoms: explicitHKAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    case 'mobileH': {
      const kAtoms = (subHover.atoms ?? [])
        .map(c => auxMap[c])
        .filter((id): id is number => id !== undefined);
      if (kAtoms.length === 0) return [];
      const color = resolveVarFn('--c-hydro-mobile');
      return [{ atoms: kAtoms, bonds: [], rgroupAttachmentPoints: [], color }];
    }

    default:
      return [];
  }
}

// Re-export utilities used by the production hook to avoid it needing to import from layerInfo directly
export { elementColor, hydroColor, parityColor, parseStereoParities, parseHydrogenAtoms, parseMobileHydrogens, parseStereoAtoms, formulaFragmentCounts, expandLayerText };
