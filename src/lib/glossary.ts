// Plain-language glossary. One register only (spec §4): the definitions are
// for the reader who does not know the word, whichever mode the card is in.
// Keys are lower-case; markTerms matches case-insensitively and allows a
// trailing 's'. Definitions are rendered as plain text — never re-marked.
export const GLOSSARY: Record<string, string> = {
  'atom': 'The smallest piece of an element, such as one carbon or one oxygen. Molecules are atoms joined together.',
  'bond': 'A link holding two atoms together in a molecule.',
  'double bond': 'Two bonds between the same pair of atoms. It is stiff and cannot rotate.',
  'heavy atom': 'Any atom that is not hydrogen. InChI numbers only these.',
  'non-hydrogen atom': 'Any atom that is not hydrogen. InChI numbers only these.',
  'hydrogen': 'The lightest and most common atom. Chemists often leave it out of drawings because it is so common.',
  'molecular formula': 'A count of each kind of atom in a molecule, such as C8H10N4O2 for caffeine.',
  'hill order': 'The rule for writing a formula: carbon first, hydrogen second, then the other elements alphabetically.',
  'canonical': "InChI's fixed way of numbering the atoms so the same molecule always gets the same numbers, however it is drawn.",
  'connectivity': 'Which atoms are joined to which, ignoring shape and bond strength.',
  'branch': 'A side chain of atoms hanging off the main chain, written inside brackets.',
  'component': 'One separate molecule in a drawing of several, such as the two halves of a salt.',
  'valence': 'How many bonds an atom normally makes. Carbon makes four, oxygen two, hydrogen one.',
  'formal charge': "The charge written on one atom in a drawing, positive or negative. Adding them up gives the molecule's total charge.",
  'net charge': 'The total electric charge of the whole molecule.',
  'anion': 'A negatively charged molecule or atom.',
  'cation': 'A positively charged molecule or atom.',
  'zwitterion': 'A molecule carrying both a positive and a negative charge that cancel out overall.',
  'hydron': 'A hydrogen atom that has lost its electron, written H⁺. Adding or removing one changes a molecule’s charge.',
  'proton': 'A hydrogen atom that has lost its electron, written H⁺. Adding or removing one changes a molecule’s charge.',
  'hydrogen ion': 'A hydrogen atom that has lost its electron, written H⁺. Adding or removing one changes a molecule’s charge.',
  'protonated': 'Having gained a hydrogen ion (H⁺).',
  'deprotonated': 'Having lost a hydrogen ion (H⁺).',
  'tautomer': 'One of two or more forms of a molecule that differ only in where a hydrogen sits. They swap back and forth in solution.',
  'tautomerism': 'A hydrogen moving between two places in a molecule, so the molecule flips between forms.',
  'mobile hydrogen': 'A hydrogen that can sit on more than one atom. InChI records it as shared.',
  'chirality centre': 'An atom joined to four different groups. It can be arranged in two mirror-image ways.',
  'stereocenter': 'An atom joined to four different groups. It can be arranged in two mirror-image ways.',
  'stereogenic': 'Able to exist in more than one 3-D arrangement, such as a handed atom or a rigid double bond.',
  'stereogenic unit': 'A part of a molecule that can exist in more than one 3-D arrangement, such as a handed atom or a rigid double bond.',
  'chiral': 'Not matching its own mirror image, like a hand.',
  'chirality': 'The property of not matching your own mirror image, like a hand. Chiral molecules come in left and right forms.',
  'nonsuperposable': 'Cannot be laid exactly on top of the other, however you turn it. Your two hands are nonsuperposable.',
  'enantiomer': 'One of the two mirror-image forms of a chiral molecule.',
  'mirror image': 'The form you would see holding the molecule up to a mirror. For handed molecules it is a different substance.',
  'parity': "A plus or minus that InChI gives a 3-D arrangement. It is InChI's own label, not the R/S or E/Z used in names.",
  'cip': 'Cahn–Ingold–Prelog: the rules chemists use to label a 3-D arrangement as R or S, or E or Z.',
  'r/s': 'The two labels chemists give a handed atom, from the Cahn–Ingold–Prelog rules.',
  'e/z': 'The two labels for which side groups sit on a rigid double bond. Z: same side. E: opposite sides.',
  'stereodescriptor': 'A label such as R, S, E or Z placed in a chemical name to state a 3-D arrangement.',
  'configuration': 'The 3-D arrangement of the atoms in a molecule.',
  'absolute configuration': 'The true 3-D arrangement of a molecule, as opposed to only knowing how its parts relate.',
  'relative configuration': 'How the handed atoms in one molecule are arranged relative to each other, without knowing the true mirror form.',
  // The legend's stereo-flag row and the s-layer copy use the bare adjectives,
  // where the two-word keys above cannot match. Longest-first ordering in
  // TERM_RE keeps "absolute configuration" winning wherever the phrase is whole.
  'absolute': 'Said of a 3-D arrangement whose true form is known, not just how its parts relate. Short for absolute configuration.',
  'relative': 'Said of a 3-D arrangement where only how the handed atoms relate to each other is known. Short for relative configuration.',
  'racemate': 'A 50:50 mixture of the two mirror-image forms of a molecule.',
  'racemic': 'A 50:50 mixture of the two mirror-image forms of a molecule.',
  'ligand': 'A group attached to an atom.',
  'substituent': 'A group attached to an atom.',
  'tetrahedral': 'Shaped like a four-cornered pyramid: an atom with four groups pointing to the corners.',
  'isotope': 'Atoms of the same element with different weights. Deuterium is a heavy form of hydrogen.',
  'isotopic substitution': 'Swapping an atom for a heavier or lighter version of the same element.',
  'nuclide': 'A specific kind of atom defined by its element and its weight, such as carbon-13.',
  'deuterium': 'Hydrogen that weighs twice the usual. Written D.',
  'tritium': 'Hydrogen that weighs three times the usual. Written T.',
  'hash': 'A short fixed-length code computed from longer data. It cannot be run backwards to recover the original.',
  'inchikey': 'A 27-character hashed form of an InChI, used for searching and comparing.',
  'standard inchi': 'An InChI made with the default options, marked by the S. What most databases store.',
  'borane': 'A compound of boron and hydrogen. Some have a hydrogen bridging two boron atoms.',
  'alkene': 'A molecule containing a carbon–carbon double bond.',
};

export type Segment = { text: string; term?: string };

// Longest term first so "mobile hydrogen" beats "hydrogen". Special characters
// (E/Z, R/S) are escaped. \b on both sides keeps "atom" out of "diatoms"; the
// optional s picks up plurals. Built once at module load.
const TERM_RE = new RegExp(
  `\\b(${Object.keys(GLOSSARY)
    .sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
    .join('|')})s?\\b`,
  'gi',
);

export function markTerms(text: string): Segment[] {
  const out: Segment[] = [];
  const seen = new Set<string>();
  let last = 0;

  for (const m of text.matchAll(TERM_RE)) {
    const term = m[1].toLowerCase();
    // Only the first occurrence of each term is a button; later ones stay text.
    if (seen.has(term)) {
      continue;
    }
    seen.add(term);
    if (m.index! > last) {
      out.push({ text: text.slice(last, m.index) });
    }
    out.push({ text: m[0], term });
    last = m.index! + m[0].length;
  }

  if (last < text.length) {
    out.push({ text: text.slice(last) });
  }
  return out.length ? out : [{ text }];
}
