// The five limitations shown in the in-app Limitations dialog.
//
// These are the ones a chemist is most likely to hit and most likely to file as
// a bug, and none of them is a defect in this tool: each is the capability
// envelope of a standard it sits on. LIMITATIONS.md at the repo root carries the
// full list — keep the two in step, and keep `source` accurate, because naming
// the responsible layer is the entire point of showing this dialog.
//
// Plain data, no JSX: the dialog renders it, and the test asserts against it.

export interface LimitationEntry {
  /** Short heading — the chemistry the user tried to do. */
  title: string;
  /** Which layer imposes the limit. Rendered as a tag beside the title. */
  source: 'InChI' | 'RInChI' | 'MInChI' | 'Ketcher' | 'Standard InChI';
  /** Two or three sentences: what fails, and why it is not a bug here. */
  body: string;
}

export const LIMITATIONS: LimitationEntry[] = [
  {
    title: 'Inorganics and organometallics',
    source: 'InChI',
    body:
      'InChI disconnects metal–ligand bonds, so a coordination compound or an ' +
      'organometallic comes out as separate fragments rather than one entity — ' +
      'cisplatin becomes 2ClH.2H3N.Pt with its charge pushed into /q and /p. ' +
      'The layer that would reconnect the metal (/r) exists only in non-standard ' +
      'InChI, which this tool does not produce. Ferrocene will not explain usefully.',
  },
  {
    title: 'Reactions',
    source: 'RInChI',
    body:
      'Reactions have their own IUPAC standard, RInChI, with its own structure and ' +
      'key. It is not implemented here. Ketcher will let you draw a reaction with ' +
      'arrows and agents, but there is no InChI for what you drew, so the tool ' +
      'reports an error instead of an identifier.',
  },
  {
    title: 'Mixtures, formulations and polymers',
    source: 'MInChI',
    body:
      'Mixture InChI is still a draft standard, so solvates, formulated salts, ' +
      'ratios and concentrations are outside the model. Polymers are similar: the ' +
      'InChI library bundled here does have experimental polymer support, but only ' +
      'as a non-standard option, so a repeat unit drawn in Ketcher cannot be ' +
      'expressed. A dot-separated multi-component InChI is not a described mixture.',
  },
  {
    title: 'The string is not your drawing',
    source: 'Standard InChI',
    body:
      'Standard InChI normalizes before it names. Draw acetate and the formula ' +
      'layer reads C2H4O2 — the neutral parent — with the charge moved into /p-1. ' +
      'Tautomers may collapse onto one string. This tool explains the InChI it is ' +
      'given, so it will faithfully explain something that looks wrong. The ' +
      'tautomer-explicit view (/f) is non-standard and not shown.',
  },
  {
    title: 'What can be drawn, and what can be highlighted',
    source: 'Ketcher',
    body:
      'Anything the editor cannot represent never reaches the InChI engine: ' +
      'R-groups and Markush structures have no InChI at all, and Ketcher’s ' +
      'macromolecule mode is out of reach here. Highlighting has its own ceiling — ' +
      'the canvas API tints atoms and bonds, so a hydrogen you did not draw, or a ' +
      'whole-molecule flag like /m and /s, has nothing to point at.',
  },
];
