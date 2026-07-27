// Sub-token card copy — Phase 17: the pure value core of v1.5.
// Turns a hovered/pinned SubHover into chemically-accurate card prose.
//
// Verbatim-passthrough (Invariant #1 / project CLAUDE.md): this module consumes
// ONLY the already-offset numeric/symbol fields of a SubHover plus atomElements.
// It never re-reads or re-joins the raw layer string, never calls a parser, never
// accepts a string/Layer arg. Dependency surface is exactly: the SubHover type from
// ./parseInchi and ELEMENT_NAMES + subscript from ./layerInfo.
//
// Voice: terse chemist register, student-friendly only where it costs no accuracy
// (D-06; the stereo primer per D-15 is the one concession). Chemical-accuracy
// caveats always win over length (D-05). Plain HTML-free strings only (D-07 /
// security) — Phase 18 renders them as React text children.

import type { SubHover } from './parseInchi';
import { ELEMENT_NAMES } from './layerInfo';

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
): SubTokenCopy | null {
  switch (sub.kind) {
    case 'element': {
      const el = sub.el!;
      let body =
        `This symbol is ${ELEMENT_NAMES[el] ?? el}; the number after it counts how many ` +
        `${ELEMENT_NAMES[el] ?? el} atoms the structure contains.`;
      if (sub.canonRange) {
        // Presence only — never compute the count here (Pitfall 2 / D-14).
        body += ' In a multi-component formula that count is the number in this component.';
      }
      if (el === 'C' || el === 'H') {
        body +=
          ' The molecular formula is written in Hill order — carbon first, then hydrogen, then the remaining elements alphabetically.';
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
      const verb = atoms.length === 1 ? 'bears' : 'each bear';
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      // Plain "atom N" — never infer a functional group from an H-count (D-08).
      const body =
        mult > 1
          ? `${capitalise(atomList(atoms, sub.fragmentOffset ?? 0))} ${verb} ${h}${ctx}. This is a count of attached hydrogens, nothing about what kind of group the atom is part of.`
          : `${capitalise(atomList(atoms, sub.fragmentOffset ?? 0))}${ctx} ${verb} ${h}. This is a count of attached hydrogens, nothing about what kind of group the atom is part of.`;
      return { title: `Hydrogen count: ${count}`, body };
    }

    case 'mobileH': {
      // Reads sub.atoms ONLY — mobileH carries no count (Pitfall 3 / D-10).
      // Route through atomList so a 3+-atom group reads "atoms 21, 22, 23, 26 and 27",
      // not a chain of "and" (WR-03); atomList also de-offsets for display (GAP-2).
      // N* duplicated fragments: collapse to one representative fragment (GAP-19).
      const mult = sub.fragMult ?? 1;
      const where = atomList(firstFragment(sub.atoms ?? [], mult), sub.fragmentOffset ?? 0);
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const body =
        mult > 1
          ? `A mobile, tautomeric proton is shared across ${where} rather than fixed to one of them${ctx}. ` +
            `InChI records one identifier per tautomer, so this proton is written as shared between these positions instead of drawn as a single fixed bond.`
          : `A mobile, tautomeric proton is shared across ${where}${ctx} rather than fixed to one of them. ` +
            `InChI records one identifier per tautomer, so this proton is written as shared between these positions instead of drawn as a single fixed bond.`;
      return { title: 'Mobile hydrogen', body };
    }

    case 'stereo': {
      const sign = sub.sign ?? '';
      // D-05: this caveat must survive any trimming — it is the load-bearing content.
      const body =
        `A tetrahedral (sp³) stereocenter is an atom whose four different substituents make its mirror image non-superimposable, so its 3-D handedness is fixed. ` +
        `The ${sign} here is the parity of the four substituents under InChI's canonical neighbour ordering — it is NOT the CIP R/S descriptor (+ is not R, − is not S). ` +
        `The /m and /s layers fix which absolute enantiomer this parity corresponds to.`;
      return { title: 'Tetrahedral stereocenter', body };
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
      if (neighbours.length === 0) {
        const tail = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
        return {
          title: 'Connection layer - Atom',
          body: `Atom ${selfLocal}${tail} has no bonds recorded in the connection layer.`,
        };
      }
      const tail =
        mult > 1
          // Not "heavy-atom skeleton": the hovered atom is itself a hydrogen when a
          // bridging H carries a canonical number (boranes).
          ? ` in the connection skeleton,${multiplicityClause(sub)}`
          : `${componentMarker(sub)} in the connection skeleton`;
      const body =
        `Atom ${selfLocal} is bonded to ${atomList(neighbours, off)}${tail}. ` +
        `The connection layer lists which canonical atom numbers are joined ` +
        `— it records connectivity only, not bond order or 3-D shape.`;
      return { title: 'Connection layer - Atom', body };
    }

    case 'bond': {
      // One canonical pair (N* repeats it across identical fragments). De-offset for display.
      const off = sub.fragmentOffset ?? 0;
      const [a, b] = (sub.endpointPairs ?? [[0, 0]])[0];
      const mult = sub.fragMult ?? 1;
      const body =
        mult > 1
          ? `Atoms ${a - off} and ${b - off} are bonded — this hyphen joins the canonical numbers on ` +
            `either side of it —${multiplicityClause(sub)}. It records that the two atoms are connected, not the bond order.`
          : `Atoms ${a - off} and ${b - off}${componentMarker(sub)} are bonded — this hyphen joins the ` +
            `canonical numbers on either side of it. It records that the two atoms are connected, not the bond order.`;
      return { title: 'Connection layer - Bond', body };
    }

    case 'branch': {
      // Branch-point is the explicit field (research A1); fall back to the shared left endpoint.
      const off = sub.fragmentOffset ?? 0;
      const mult = sub.fragMult ?? 1;
      const allPairs = sub.bondPairs ?? [];
      const pairs = firstFragment(allPairs, mult);
      const bp = sub.branchPoint ?? pairs[0]?.[0] ?? 0;
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const body =
        `These parentheses are a branch hanging off atom ${bp - off}${ctx}, adding the ` +
        `bonds ${bondPairList(pairs, off)}. InChI writes side-chains in parentheses so a branched skeleton ` +
        `fits on one line; after the ) the main chain continues from atom ${bp - off}.`;
      return { title: 'Connection layer - Branch', body };
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
