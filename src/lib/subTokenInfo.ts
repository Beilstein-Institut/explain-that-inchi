// Sub-token card copy — Phase 17: the pure value core of v1.5.
// Turns a hovered/pinned SubHover into chemically-accurate card prose.
//
// Verbatim-passthrough (Invariant #1 / project CLAUDE.md): this module consumes
// ONLY the already-offset numeric/symbol fields of a SubHover plus atomElements.
// It never re-reads or re-joins the raw layer string, never calls a parser, never
// accepts a string/Layer arg. Dependency surface is exactly: the SubHover type from
// ./parseInchi and ELEMENT_NAMES + subscript from ./layerInfo.
//
// Voice: two registers (see lib/audience.ts). Chemist: Blue Book terms, caveats
// first. Plain: same claims, no jargon. Both registers of one template sit side
// by side. The stereo primer stays the one student-friendly concession (D-15),
// and chemical-accuracy caveats always win over length (D-05). Plain
// HTML-free strings only (D-07 / security) — Phase 18 renders them as React
// text children.

import type { SubHover } from './parseInchi';
import { ELEMENT_NAMES } from './layerInfo';
import { pick } from './audience';
import type { Audience } from './audience';

export type SubTokenCopy = { title: string; body: string; reading?: string };

// Capitalise the looked-up (lowercase) element name at the title site only —
// keeps ELEMENT_NAMES values byte-identical for formulaReading (D-16, Pitfall 4).
function elementTitle(el: string): string {
  const name = ELEMENT_NAMES[el] ?? el; // case-exact; never .toUpperCase() (D-03)
  return `${name[0].toUpperCase()}${name.slice(1)} (${el})`;
}

// Enumerate the discrete atom set, per-atom — accuracy over brevity (D-05, GAP-1
// chemist gate). An h-layer H-count set is frequently discontiguous (e.g. {3,4,7,8,15}),
// so a min–max range would falsely name the intervening atoms as bearing H. We list the
// exact atoms: "atom 1", "atoms 1 and 2", "atoms 3, 4, 7, 8 and 15".
//
// fragmentOffset (GAP-2) is subtracted for DISPLAY only: the incoming atoms[] are GLOBAL
// canonicals (the auxMap highlight key), but a chemist reads per-component numbers that reset
// after each ';' in the InChI string. Subtracting the offset makes the card match the string.
// 0 for single-fragment — unchanged.
function atomList(atoms: number[], fragmentOffset = 0): string {
  const local = fragmentOffset ? atoms.map((a) => a - fragmentOffset) : atoms;
  if (local.length === 1) return `atom ${local[0]}`;
  const head = local.slice(0, -1).join(', ');
  return `atoms ${head} and ${local[local.length - 1]}`;
}

export function subTokenInfo(
  sub: SubHover,
  // Available for element-prefixed atom labels (Phase 18); the current bare "atom N"
  // phrasing is the D-08-safest reading, so it is intentionally unconsumed here.
  _atomElements: Record<number, string>,
  audience: Audience,
): SubTokenCopy | null {
  switch (sub.kind) {
    case 'element': {
      const el = sub.el!;
      const name = ELEMENT_NAMES[el] ?? el;
      let body = pick({
        chemist: `This symbol is ${name}; the number after it counts how many ${name} atoms the structure contains.`,
        plain: `This letter is ${name}. The number after it says how many ${name} atoms the molecule has; no number means one.`,
      }, audience);
      if (sub.canonRange) {
        // Presence only — never compute the count here (Pitfall 2 / D-14).
        body += pick({
          chemist: ' In a multi-component formula that count is the number in this component.',
          plain: ' In a drawing with several parts, the count is for this part only.',
        }, audience);
      }
      if (el === 'C' || el === 'H') {
        // Hill order is a CAS convention (not Blue Book).
        body += pick({
          chemist: ' The molecular formula is written in Hill order — carbon first, then hydrogen, then the remaining elements alphabetically.',
          plain: ' Carbon is always listed first, then hydrogen, then the rest in alphabetical order.',
        }, audience);
      }
      return { title: elementTitle(el), body };
    }

    case 'hAtoms': {
      const mult = sub.fragMult ?? 1;
      // N* duplicated fragments: sub.atoms is the FULL highlight set across every copy (grouped,
      // frag-0 first); collapse to ONE fragment for the card (GAP-19). Single fragment: unchanged.
      const atoms = firstFragment(sub.atoms ?? [], mult);
      const count = sub.count ?? 1;
      const h = count === 1 ? 'one hydrogen' : `${count} hydrogens`;
      const verb = atoms.length === 1 ? pick({ chemist: 'bears', plain: 'has' }, audience)
                                      : pick({ chemist: 'each bear', plain: 'each have' }, audience);
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const who = capitalise(atomList(atoms, sub.fragmentOffset ?? 0));
      // Plain "atom N" — never infer a functional group from an H-count (D-08).
      const lead = mult > 1 ? `${who} ${verb} ${h}${ctx}.` : `${who}${ctx} ${verb} ${h}.`;
      const body = `${lead} ` + pick({
        chemist: 'This is a count of attached hydrogens, nothing about what kind of group the atom is part of.',
        plain: 'This only counts hydrogens. It says nothing about what the atom is doing in the molecule.',
      }, audience);
      return { title: `Hydrogen count: ${count}`, body };
    }

    case 'mobileH': {
      // Gold Book: tautomerism. Reads sub.atoms ONLY — mobileH carries no count (Pitfall 3 / D-10).
      // Route through atomList so a 3+-atom group reads "atoms 21, 22, 23, 26 and 27",
      // not a chain of "and" (WR-03); atomList also de-offsets for display (GAP-2).
      // N* duplicated fragments: collapse to one representative fragment (GAP-19).
      const mult = sub.fragMult ?? 1;
      const where = atomList(firstFragment(sub.atoms ?? [], mult), sub.fragmentOffset ?? 0);
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const place = mult > 1 ? `${where} rather than fixed to one of them${ctx}` : `${where}${ctx} rather than fixed to one of them`;
      const body = pick({
        chemist:
          `A mobile hydrogen is shared across ${place}: tautomerism lets it sit on any of them. ` +
          `InChI records one identifier per set of tautomers, so this hydrogen is written as shared between these positions instead of drawn as a single fixed bond.`,
        plain:
          `A hydrogen is shared between ${place}; it can sit on any of them. ` +
          `InChI writes it as shared instead of picking one place, so every version of the molecule gets the same text.`,
      }, audience);
      return {
        title: pick({ chemist: 'Mobile hydrogen', plain: 'Movable hydrogen' }, audience),
        body,
      };
    }

    case 'stereo': {
      // Blue Book P-92.1.1 chirality centre; P-91.2.1.1 R/S. D-05: the not-R/S caveat
      // is the load-bearing content and survives in both registers.
      const sign = sub.sign ?? '';
      const body = pick({
        chemist:
          `A chirality centre: a tetrahedral atom whose four distinguishable ligands make its arrangement nonsuperposable on its mirror image. ` +
          `The ${sign} here is the parity of those ligands under InChI's canonical neighbour ordering — it is NOT the CIP R/S stereodescriptor (+ is not R, − is not S). ` +
          `The /m and /s layers fix which enantiomer this parity corresponds to.`,
        plain:
          `This atom is joined to four different groups, so it can exist in two mirror-image forms, like a left and a right hand. ` +
          `The ${sign} records which arrangement this is. It is InChI's own label, not the R or S used in chemical names.`,
      }, audience);
      return {
        title: pick({ chemist: 'Tetrahedral stereocenter', plain: 'Handed atom' }, audience),
        body,
      };
    }

    case 'bondStereo': {
      // Blue Book P-93.4.2.1.1 E/Z. Parity ≠ E/Z (canonical numbers, not CIP priorities).
      // One /b token = one stereogenic double bond. The sign is a canonical parity, and the
      // card must not sell it as the E/Z descriptor: for fumaric (+) and maleic (−) acid the two
      // coincide, but the parity is taken over canonical neighbour numbers, not CIP priorities,
      // so in general they need not. De-offset for DISPLAY only (GAP-2).
      const off = sub.fragmentOffset ?? 0;
      const [a, b] = sub.stereoBond ?? [0, 0];
      const sign = sub.sign ?? '';
      const where = `Atoms ${a - off} and ${b - off}${componentMarker(sub)}`;
      const body = sign === '?'
        ? pick({
            chemist: `${where} are joined by a double bond whose configuration is unspecified or unknown — the ? records that no E/Z assignment is made for this bond.`,
            plain: `${where} share a double bond whose sides are not specified. The ? says so.`,
          }, audience)
        : pick({
            chemist:
              `${where} are the two ends of a double bond whose configuration is fixed: the groups on each end cannot rotate past each other. ` +
              `The ${sign} is the parity of the substituents under InChI's canonical neighbour numbering — it is NOT the E/Z stereodescriptor itself. ` +
              `For simple alkenes + often coincides with E and − with Z, but that follows from the canonical numbers, not from CIP priorities, so it is not guaranteed.`,
            plain:
              `${where} share a double bond that holds its groups on fixed sides. ` +
              `The ${sign} records which side each group sits on. It is InChI's own label, not the E or Z used in chemical names.`,
          }, audience);
      return {
        title: pick({ chemist: 'Double-bond stereo', plain: 'Double-bond side' }, audience),
        body,
      };
    }

    case 'atom': {
      // Neighbour set = the "other endpoint" of each incident pair, deduped + sorted (ring
      // closures can repeat a neighbour across pair directions). All GLOBAL; de-offset for
      // DISPLAY only via atomList (GAP-2) — never written back onto sub.
      const self = sub.canonical!;
      const off = sub.fragmentOffset ?? 0;
      const neighbours = [...new Set((sub.incidentPairs ?? []).map(([a, b]) => (a === self ? b : a)))].sort(
        (x, y) => x - y,
      );
      const selfLocal = self - off;
      const mult = sub.fragMult ?? 1;
      const title = pick({ chemist: 'Connection layer - Atom', plain: 'Joins - Atom' }, audience);
      if (neighbours.length === 0) {
        const tail = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
        return {
          title,
          body: pick({
            chemist: `Atom ${selfLocal}${tail} has no bonds recorded in the connection layer.`,
            plain: `Atom ${selfLocal}${tail} has no bonds listed here.`,
          }, audience),
        };
      }
      const skeleton = pick({ chemist: 'in the connection skeleton', plain: 'in this layer' }, audience);
      // Not "heavy-atom skeleton": the hovered atom is itself a hydrogen when a
      // bridging H carries a canonical number (boranes).
      const tail = mult > 1 ? ` ${skeleton},${multiplicityClause(sub)}` : `${componentMarker(sub)} ${skeleton}`;
      const body = pick({
        chemist:
          `Atom ${selfLocal} is bonded to ${atomList(neighbours, off)}${tail}. ` +
          `The connection layer lists which canonical atom numbers are joined — it records connectivity only, not bond order or 3-D shape.`,
        plain:
          `Atom ${selfLocal} is joined to ${atomList(neighbours, off)}${tail}. ` +
          `This layer only says which atoms touch, not how strongly or in what shape.`,
      }, audience);
      return { title, body };
    }

    case 'bond': {
      // One canonical pair (N* repeats it across identical fragments). De-offset for display.
      const off = sub.fragmentOffset ?? 0;
      const [a, b] = (sub.endpointPairs ?? [[0, 0]])[0];
      const mult = sub.fragMult ?? 1;
      const pair = `Atoms ${a - off} and ${b - off}`;
      const body = mult > 1
        ? pick({
            chemist: `${pair} are bonded — this hyphen joins the canonical numbers on either side of it —${multiplicityClause(sub)}. It records that the two atoms are connected, not the bond order.`,
            plain: `${pair} are joined — this dash links the two numbers on either side of it —${multiplicityClause(sub)}. It does not say whether the bond is single or double.`,
          }, audience)
        : pick({
            chemist: `${pair}${componentMarker(sub)} are bonded — this hyphen joins the canonical numbers on either side of it. It records that the two atoms are connected, not the bond order.`,
            plain: `${pair}${componentMarker(sub)} are joined. This dash links the two numbers on either side of it. It does not say whether the bond is single or double.`,
          }, audience);
      return { title: pick({ chemist: 'Connection layer - Bond', plain: 'Joins - Bond' }, audience), body };
    }

    case 'siblings': {
      // The comma's whole meaning is "another branch off the same atom" — so the card has
      // to say what the highlight cannot: these two are siblings, not neighbours.
      const off = sub.fragmentOffset ?? 0;
      const [a, b] = (sub.siblingPairs ?? [[0, 0]])[0];
      const pair = `Atoms ${a - off} and ${b - off}${componentMarker(sub)}`;
      const body = pick({
        chemist:
          `${pair} are not bonded to each other — this comma separates two branches hanging off the same atom. ` +
          `Each one continues from the atom before the opening parenthesis.`,
        plain:
          `${pair} are not joined to each other. The comma separates two branches that both hang off the same atom, the one before the opening bracket.`,
      }, audience);
      return { title: pick({ chemist: 'Connection layer - Branch separator', plain: 'Joins - Branch separator' }, audience), body };
    }

    case 'branch': {
      // Branch-point is the explicit field (research A1); fall back to the shared left endpoint.
      const off = sub.fragmentOffset ?? 0;
      const mult = sub.fragMult ?? 1;
      const allPairs = sub.bondPairs ?? [];
      const pairs = firstFragment(allPairs, mult);
      const bp = sub.branchPoint ?? pairs[0]?.[0] ?? 0;
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const body = pick({
        chemist:
          `These parentheses are a branch hanging off atom ${bp - off}${ctx}, adding the bonds ${bondPairList(pairs, off)}. ` +
          `InChI writes side-chains in parentheses so a branched skeleton fits on one line; after the ) the main chain continues from atom ${bp - off}.`,
        plain:
          `The brackets are a side branch hanging off atom ${bp - off}${ctx}, adding the bonds ${bondPairList(pairs, off)}. ` +
          `After the closing bracket the main chain carries on from atom ${bp - off}.`,
      }, audience);
      return { title: pick({ chemist: 'Connection layer - Branch', plain: 'Joins - Branch' }, audience), body };
    }

    default:
      return null;
  }
}

// Render bond pairs as "a–b" (en-dash), de-offsetting each endpoint for DISPLAY only
// (GAP-2), with the same comma + "and" grammar as atomList. e.g. [[3,24],[24,11]] → "3–24 and 24–11".
function bondPairList(pairs: [number, number][], off = 0): string {
  const fmt = ([a, b]: [number, number]): string => `${a - off}–${b - off}`;
  if (pairs.length === 0) return '';
  if (pairs.length === 1) return fmt(pairs[0]);
  const head = pairs.slice(0, -1).map(fmt).join(', ');
  return `${head} and ${fmt(pairs[pairs.length - 1])}`;
}

function capitalise(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// " (component N)" marker for multi-component cards (GAP-2) — tells the chemist which
// component the per-component-numbered atoms belong to. Empty for single-fragment
// (componentIndex absent or 0). N is 1-based for display.
function componentMarker(sub: SubHover): string {
  const idx = sub.componentIndex ?? 0;
  return idx > 0 ? ` (component ${idx + 1})` : '';
}

// N* duplicated-fragment phrasing (GAP-19). The token `N*…` describes N identical components;
// the card shows ONE representative fragment in local numbering and appends this clause naming
// how many copies and which component span (1-based, contiguous). componentIndex = first copy.
// e.g. fragMult 2, componentIndex 2 → "in each of the 2 identical components (components 3 and 4)".
function multiplicityClause(sub: SubHover): string {
  const mult = sub.fragMult ?? 1;
  const a = (sub.componentIndex ?? 0) + 1;
  const b = a + mult - 1;
  const span = b - a === 1 ? `components ${a} and ${b}` : `components ${a}–${b}`;
  return ` in each of the ${mult} identical components (${span})`;
}

// First fragment's slice of a GLOBAL highlight array that was fanned/grouped across all N copies
// (frag-0 first). Used by the card so an N* token reads one representative fragment (GAP-19).
function firstFragment<T>(arr: T[], mult: number): T[] {
  return mult > 1 && arr.length % mult === 0 ? arr.slice(0, arr.length / mult) : arr;
}
