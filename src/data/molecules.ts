import type { LayerType } from '../lib/parseInchi';

export interface MoleculePreset {
  id: string;
  name: string;
  formula: string;
  smiles: string;
  /**
   * The one InChI layer this preset is the picker's example of, shown as a
   * chip. Across MOLECULES each layer type is claimed AT MOST ONCE, and all 11
   * are claimed — so the chips are a map of the legend, and clicking every
   * chipped preset walks the whole notation. A preset carrying several layers
   * (PGE2 has b/t/m/s) advertises only the one still unclaimed.
   * presetLayerCoverage.test.ts pins each claim against a measured InChI.
   */
  layer?: LayerType;
}

/**
 * Preset molecules for the molecule picker panel.
 * Structures are embedded isomeric SMILES strings (sourced once from PubChem
 * PUG REST on 2026-06-10), loaded directly via setMolecule in handleMolSelectLogic.
 * There is NO runtime network fetch — presets load fully offline. SMILES carry no
 * coordinates; Ketcher standalone generates the 2D layout on setMolecule.
 * Formula uses Unicode subscript characters matching the design handoff.
 */
export const MOLECULES: MoleculePreset[] = [
  // ---------------------------------------------------------------------------
  // The eleven layer examples, in legend order (version → formula → c → h → q →
  // p → b → t → m → s → i). Every chipped preset is here and they come first, so
  // reading the top of the picker walks the InChI left to right and matches the
  // legend row for row. Adding a chip below this block, or reordering within it,
  // breaks that correspondence — PresetMolecules.test.ts fails if either happens.
  // Each InChI was measured through the indigo WASM, never written by hand.
  // ---------------------------------------------------------------------------
  // Methane's InChI is `1S/CH4/h1H4` — one heavy atom, no bonds, so no c layer
  // at all. Version is the only layer it can be the example of, and it is the
  // shortest InChI in the list, which is what makes it readable as the first.
  { id: 'methane',        name: 'Methane',         formula: 'CH₄',              smiles: 'C',                                                            layer: 'version' },
  // C8H10N4O2 is verbatim the legend's own formula example.
  { id: 'caffeine',       name: 'Caffeine',         formula: 'C₈H₁₀N₄O₂',     smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',                                 layer: 'formula' },
  { id: 'benzene',        name: 'Benzene',          formula: 'C₆H₆',            smiles: 'C1=CC=CC=C1',                                                  layer: 'c'       },
  // 1H / 2H / 3H all in one h layer: `h3H,2H2,1H3`.
  { id: 'ethanol',        name: 'Ethanol',          formula: 'C₂H₆O',           smiles: 'CCO',                                                          layer: 'h'       },
  // Charge that is NOT a proton count → /q+1.
  { id: 'choline',        name: 'Choline',          formula: 'C₅H₁₄NO⁺',       smiles: 'C[N+](C)(C)CCO',                                               layer: 'q'       },
  // Charge that IS a proton count → /p-1. The formula chip is the species
  // formula; the InChI normalizes to the neutral parent (C2H4O2), which is
  // precisely what the p layer records.
  { id: 'acetate',        name: 'Acetate',          formula: 'C₂H₃O₂⁻',        smiles: 'CC(=O)[O-]',                                                   layer: 'p'       },
  { id: 'fumaric',        name: 'Fumaric acid',     formula: 'C₄H₄O₄',         smiles: 'OC(=O)/C=C/C(=O)O',                                            layer: 'b'       },
  { id: 'alanine',        name: 'L-Alanine',        formula: 'C₃H₇NO₂',        smiles: 'C[C@@H](C(=O)O)N',                                             layer: 't'       },
  // Alanine and nicotine both produce /t…/m0/s1, so which of them advertises t
  // and which m is an editorial split of a shared set, not a property of either.
  { id: 'nicotine',       name: '(S)-Nicotine',     formula: 'C₁₀H₁₄N₂',      smiles: 'CN1CCC[C@H]1C2=CN=CC=C2',                                      layer: 'm'       },
  // All four stereo layers at once, including two double bonds of opposite
  // geometry in one b layer (/b7-4-,13-12+). It carries b/t/m as well, but those
  // are claimed above, so the chip names the one layer nothing else shows: s.
  { id: 'pge2',           name: 'Prostaglandin E₂', formula: 'C₂₀H₃₂O₅',      smiles: 'CCCCC[C@@H](O)/C=C/[C@H]1[C@@H](O)CC(=O)[C@@H]1C/C=C\\CCCC(=O)O', layer: 's'     },
  // Simplest possible isotope layer: one atom, one label → /i1D.
  { id: 'chloroformD',    name: 'Chloroform-d',     formula: 'CDCl₃',           smiles: '[2H]C(Cl)(Cl)Cl',                                              layer: 'i'       },

  // ---------------------------------------------------------------------------
  // Everything below is unchipped: real molecules to draw and explore, grouped
  // by what they are rather than by which layer they teach.
  // ---------------------------------------------------------------------------
  // Simple & educational
  { id: 'melatonin',      name: 'Melatonin',        formula: 'C₁₃H₁₆N₂O₂',    smiles: 'CC(=O)NCCC1=CNC2=C1C=C(C=C2)OC'                                                 },
  // Analgesics & anti-inflammatories
  { id: 'aspirin',        name: 'Aspirin',          formula: 'C₉H₈O₄',         smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O'                                                       },
  { id: 'ibuprofen',      name: 'Ibuprofen',        formula: 'C₁₃H₁₈O₂',      smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O'                                                  },
  { id: 'morphine',       name: 'Morphine',         formula: 'C₁₇H₁₉NO₃',     smiles: 'CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)O)O[C@H]3[C@H](C=C4)O'                  },
  // Cardiovascular & metabolic
  { id: 'atorvastatin',   name: 'Atorvastatin',     formula: 'C₃₃H₃₅FN₂O₅',   smiles: 'CC(C)C1=C(C(=C(N1CC[C@H](C[C@H](CC(=O)O)O)O)C2=CC=C(C=C2)F)C3=CC=CC=C3)C(=O)NC4=CC=CC=C4' },
  { id: 'propranolol',    name: 'Propranolol',      formula: 'C₁₆H₂₁NO₂',     smiles: 'CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O'                                               },
  // Antibiotics & antivirals
  { id: 'penicillinG',    name: 'Penicillin G',     formula: 'C₁₆H₁₈N₂O₄S',   smiles: 'CC1([C@@H](N2[C@H](S1)[C@@H](C2=O)NC(=O)CC3=CC=CC=C3)C(=O)O)C'                  },
  { id: 'ciprofloxacin',  name: 'Ciprofloxacin',    formula: 'C₁₇H₁₈FN₃O₃',   smiles: 'C1CC1N2C=C(C(=O)C3=CC(=C(C=C32)N4CCNCC4)F)C(=O)O'                              },
  { id: 'oseltamivir',    name: 'Oseltamivir',      formula: 'C₁₆H₂₈N₂O₄',    smiles: 'CCC(CC)O[C@@H]1C=C(C[C@@H]([C@H]1NC(=O)C)N)C(=O)OCC'                            },
  // CNS & psychiatric
  { id: 'fluoxetine',     name: 'Fluoxetine',       formula: 'C₁₇H₁₈F₃NO',    smiles: 'CNCCC(C1=CC=CC=C1)OC2=CC=C(C=C2)C(F)(F)F'                                       },
  { id: 'diazepam',       name: 'Diazepam',         formula: 'C₁₆H₁₃ClN₂O',   smiles: 'CN1C(=O)CN=C(C2=C1C=CC(=C2)Cl)C3=CC=CC=C3'                                      },
  { id: 'dopamine',       name: 'Dopamine',         formula: 'C₈H₁₁NO₂',      smiles: 'C1=CC(=C(C=C1CCN)O)O'                                                           },
  // Other notable drugs
  { id: 'methotrexate',   name: 'Methotrexate',     formula: 'C₂₀H₂₂N₈O₅',    smiles: 'CN(CC1=CN=C2C(=N1)C(=NC(=N2)N)N)C3=CC=C(C=C3)C(=O)N[C@@H](CCC(=O)O)C(=O)O'     },
  { id: 'dexamethasone',  name: 'Dexamethasone',    formula: 'C₂₂H₂₉FO₅',     smiles: 'C[C@@H]1C[C@H]2[C@@H]3CCC4=CC(=O)C=C[C@@]4([C@]3([C@H](C[C@@]2([C@]1(C(=O)CO)O)C)O)F)C' },
  // q and p together, and the only multi-component preset: '.' in the formula,
  // ';' separators inside every layer. Unchipped because q and p are claimed by
  // choline and acetate, where each appears alone and is therefore legible.
  { id: 'sodiumAcetate',  name: 'Sodium acetate',   formula: 'C₂H₃NaO₂',       smiles: 'CC(=O)[O-].[Na+]'                                                               },
];
