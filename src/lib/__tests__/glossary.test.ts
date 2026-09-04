import { describe, it, expect } from 'vitest';
import { GLOSSARY, markTerms } from '../glossary';

describe('GLOSSARY', () => {
  it('keys are lower-case, trimmed, unique; definitions non-empty', () => {
    const keys = Object.keys(GLOSSARY);
    for (const k of keys) {
      expect(k).toBe(k.toLowerCase().trim());
      expect(GLOSSARY[k].trim().length).toBeGreaterThan(0);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('markTerms', () => {
  it('returns one plain segment when nothing matches', () => {
    expect(markTerms('nothing here')).toEqual([{ text: 'nothing here' }]);
  });

  it('marks a term, preserving surrounding text and casing', () => {
    expect(markTerms('An Atom joined')).toEqual([
      { text: 'An ' }, { text: 'Atom', term: 'atom' }, { text: ' joined' },
    ]);
  });

  it('matches plurals and whole words only', () => {
    expect(markTerms('atoms')).toEqual([{ text: 'atoms', term: 'atom' }]);
    expect(markTerms('diatoms')).toEqual([{ text: 'diatoms' }]);
  });

  it('marks only the first occurrence of each term', () => {
    const segs = markTerms('atom then atom');
    expect(segs.filter(s => s.term)).toHaveLength(1);
  });

  it('longest term wins', () => {
    const segs = markTerms('a mobile hydrogen here');
    expect(segs).toContainEqual({ text: 'mobile hydrogen', term: 'mobile hydrogen' });
  });

  it('handles terms with slashes', () => {
    expect(markTerms('the E/Z label')).toContainEqual({ text: 'E/Z', term: 'e/z' });
  });

  it('concatenates back to the input', () => {
    const text = 'Atoms 1 and 2 share a double bond; the parity is not the E/Z stereodescriptor.';
    expect(markTerms(text).map(s => s.text).join('')).toBe(text);
  });

  // The legend's stereo-flag row is the exact string a reader hovers; the
  // two-word 'absolute configuration' key never matches it.
  it("marks every word of the legend's stereo-flag row", () => {
    const terms = markTerms('Absolute / relative / racemic')
      .filter(s => s.term)
      .map(s => s.term);
    expect(terms).toEqual(['absolute', 'relative', 'racemic']);
  });

  it('the full phrase still beats the bare adjective', () => {
    expect(markTerms('fixes the absolute configuration')).toContainEqual({
      text: 'absolute configuration',
      term: 'absolute configuration',
    });
  });
});
