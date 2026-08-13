// The limitations shown in the in-app Limitations dialog.
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
  source: 'InChI' | 'RInChI' | 'MInChI' | 'Ketcher';
  /** Two or three sentences: what fails, and why it is not a bug here. */
  body: string;
}

export const LIMITATIONS: LimitationEntry[] = [
  {
    title: 'Inorganics and organometallics',
    source: 'InChI',
    body:
      'InChI breaks the bonds between a metal and its ligands, so a coordination ' +
      'compound comes out as separate pieces instead of one molecule — cisplatin ' +
      'becomes 2ClH.2H3N.Pt, which says very little about the compound. This is a ' +
      'known gap, and current InChI development is working to close it, so expect ' +
      'inorganics to be better supported in a future version of the standard.',
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
      'ratios and concentrations are outside the model, and a repeat unit drawn ' +
      'in Ketcher cannot be expressed either. A dot-separated multi-component ' +
      'InChI is not a described mixture — it names the components, not the recipe.',
  },
  {
    title: 'What can be drawn, and what can be highlighted',
    source: 'Ketcher',
    body:
      'Anything the editor cannot represent never reaches the InChI engine: ' +
      'R-groups and Markush structures have no InChI at all, and Ketcher’s ' +
      'macromolecule mode is out of reach here. Highlighting has its own ceiling — ' +
      'the canvas API tints atoms and bonds, so a hydrogen you did not draw has ' +
      'nothing on the canvas to point at.',
  },
];
