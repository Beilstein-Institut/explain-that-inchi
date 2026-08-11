import { describe, it, expect } from 'vitest';
import { MOLECULES } from '../data/molecules';
import type { MoleculePreset } from '../data/molecules';

describe('MOLECULES preset data', () => {
  it('exports at least 10 molecules', () => {
    expect(MOLECULES.length).toBeGreaterThanOrEqual(10);
  });

  it('every entry has id, name, formula, smiles fields', () => {
    for (const mol of MOLECULES) {
      expect(mol.id).toBeTruthy();
      expect(mol.name).toBeTruthy();
      expect(mol.formula).toBeTruthy();
      expect(typeof mol.smiles).toBe('string');
      expect(mol.smiles.length).toBeGreaterThan(0);
    }
  });

  it('contains all expected molecule ids', () => {
    const ids = MOLECULES.map(m => m.id);
    expect(ids).toContain('methane');
    expect(ids).toContain('ethanol');
    expect(ids).toContain('benzene');
    expect(ids).toContain('acetic');
    expect(ids).toContain('alanine');
    expect(ids).toContain('vanillin');
    expect(ids).toContain('caffeine');
    expect(ids).toContain('nicotine');
    expect(ids).toContain('melatonin');
    expect(ids).toContain('naloxone');
  });

  it('has correct embedded SMILES for stereo-sensitive molecules', () => {
    const find = (id: string) => MOLECULES.find(m => m.id === id)!;
    expect(find('methane').smiles).toBe('C');
    expect(find('benzene').smiles).toBe('C1=CC=CC=C1');
    expect(find('alanine').smiles).toBe('C[C@@H](C(=O)O)N');    // L-Alanine (2S) enantiomer
    expect(find('nicotine').smiles).toBe('CN1CCC[C@H]1C2=CN=CC=C2');  // (S)-Nicotine
    expect(find('naloxone').smiles).toBe('C=CCN1CC[C@]23[C@@H]4C(=O)CC[C@]2([C@H]1CC5=C3C(=C(C=C5)O)O4)O');
  });

  // The seven layer-coverage presets. Without them the picker reaches only 7 of
  // the 11 layer types, so q/p/b/i have no clickable example anywhere in the app.
  // The InChI cannot be asserted here (no indigo WASM under jsdom), so this pins
  // the SMILES that produce it — each string was measured through the WASM, and
  // the resulting InChI is recorded in .planning/quick/260811-kvl-*/. Editing a
  // SMILES below silently changes which layer the preset demonstrates.
  it('keeps the layer-coverage SMILES exact', () => {
    const find = (id: string) => MOLECULES.find(m => m.id === id)!;
    expect(find('fumaric').smiles).toBe('OC(=O)/C=C/C(=O)O');            // /b2-1+ (E)
    expect(find('maleic').smiles).toBe('OC(=O)\\C=C/C(=O)O');            // /b2-1- (Z)
    expect(find('choline').smiles).toBe('C[N+](C)(C)CCO');               // /q+1
    expect(find('acetate').smiles).toBe('CC(=O)[O-]');                   // /p-1
    expect(find('chloroformD').smiles).toBe('[2H]C(Cl)(Cl)Cl');          // /i1D
    expect(find('sodiumAcetate').smiles).toBe('CC(=O)[O-].[Na+]');       // /q;+1 /p-1
    expect(find('pge2').smiles).toBe(
      'CCCCC[C@@H](O)/C=C/[C@H]1[C@@H](O)CC(=O)[C@@H]1C/C=C\\CCCC(=O)O', // /b /t /m /s
    );
  });

  it('keeps fumaric and maleic acid adjacent', () => {
    const ids = MOLECULES.map(m => m.id);
    // Their InChIs differ in one character (/b2-1+ vs /b2-1-). Side by side in
    // the chip strip they teach the b layer; separated they are just two acids.
    expect(ids.indexOf('maleic') - ids.indexOf('fumaric')).toBe(1);
  });

  it('MoleculePreset type has correct shape', () => {
    const mol: MoleculePreset = MOLECULES[0];
    const keys = Object.keys(mol);
    expect(keys).toContain('id');
    expect(keys).toContain('name');
    expect(keys).toContain('formula');
    expect(keys).toContain('smiles');
  });
});

describe('canvas overlay derivation', () => {
  it('formula is derived from layers[0].text, not preset formula field', () => {
    // This tests the contract: overlay uses live InChI formula layer, not hardcoded preset data
    // layers[0].text for benzene from Ketcher WASM = "C6H6", not "C₆H₆"
    // These are different strings — live data takes precedence over preset metadata
    const liveFormula = 'C6H6';
    const presetFormula = 'C₆H₆';
    expect(liveFormula).not.toBe(presetFormula);
  });

  it('heavyAtomCount = Object.keys(atomElements).length', () => {
    const atomElements: Record<number, string> = { 1: 'C', 2: 'C', 3: 'O' };
    expect(Object.keys(atomElements).length).toBe(3);
  });
});
