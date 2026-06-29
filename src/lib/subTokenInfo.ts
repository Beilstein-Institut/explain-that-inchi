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
function atomList(atoms: number[]): string {
  if (atoms.length === 1) return `atom ${atoms[0]}`;
  const head = atoms.slice(0, -1).join(', ');
  return `atoms ${head} and ${atoms[atoms.length - 1]}`;
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
      const atoms = sub.atoms ?? [];
      const count = sub.count ?? 1;
      const h = count === 1 ? 'one hydrogen' : `${count} hydrogens`;
      const verb = atoms.length === 1 ? 'bears' : 'each bear';
      // Plain "atom N" — never infer a functional group from an H-count (D-08).
      const body = `${capitalise(atomList(atoms))} ${verb} ${h}. This is a count of attached hydrogens, nothing about what kind of group the atom is part of.`;
      return { title: 'Hydrogen count', body };
    }

    case 'mobileH': {
      // Reads sub.atoms ONLY — mobileH carries no count (Pitfall 3 / D-10).
      const atoms = sub.atoms ?? [];
      const where =
        atoms.length === 1 ? `atom ${atoms[0]}` : `atoms ${atoms.join(' and ')}`;
      const body =
        `A mobile, tautomeric proton is shared across ${where} rather than fixed to one of them. ` +
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

    default:
      // 'atom' | 'bond' | 'branch' — c-layer kinds fall through to the layer card.
      return null;
  }
}

function capitalise(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
