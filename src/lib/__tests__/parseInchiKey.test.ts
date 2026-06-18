import { describe, it, expect } from 'vitest';
import { parseInchiKey } from '../parseInchiKey';

const BENZENE_KEY = 'UHOVQNZJYSORNB-UHFFFAOYSA-N';

describe('Group 1: valid neutral key — benzene', () => {
  it('returns exactly 5 segments for BENZENE_KEY', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(segs).toHaveLength(5);
  });

  it('segment 0 is skeleton {kind:"skeleton", start:0, end:14}', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(segs[0]).toEqual({ kind: 'skeleton', start: 0, end: 14 });
  });

  it('segment 1 is hash {kind:"hash", start:15, end:23}', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(segs[1]).toEqual({ kind: 'hash', start: 15, end: 23 });
  });

  it('segment 2 is flag {kind:"flag", start:23, end:24}', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(segs[2]).toEqual({ kind: 'flag', start: 23, end: 24 });
  });

  it('segment 3 is version {kind:"version", start:24, end:25}', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(segs[3]).toEqual({ kind: 'version', start: 24, end: 25 });
  });

  it('segment 4 is protonation {kind:"protonation", start:26, end:27}', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(segs[4]).toEqual({ kind: 'protonation', start: 26, end: 27 });
  });

  it('slice boundaries produce correct substrings for all 5 segments', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(BENZENE_KEY.slice(segs[0].start, segs[0].end)).toBe('UHOVQNZJYSORNB');
    expect(BENZENE_KEY.slice(segs[1].start, segs[1].end)).toBe('UHFFFAOY');
    expect(BENZENE_KEY.slice(segs[2].start, segs[2].end)).toBe('S');
    expect(BENZENE_KEY.slice(segs[3].start, segs[3].end)).toBe('A');
    expect(BENZENE_KEY.slice(segs[4].start, segs[4].end)).toBe('N');
  });
});

describe('Group 2: charged/protonated key', () => {
  const PROTONATED_KEY = 'UHOVQNZJYSORNB-UHFFFAOYSA-L';

  it('returns 5 segments for a key with protonation char L', () => {
    const segs = parseInchiKey(PROTONATED_KEY);
    expect(segs).toHaveLength(5);
  });

  it('protonation segment is {kind:"protonation", start:26, end:27}', () => {
    const segs = parseInchiKey(PROTONATED_KEY);
    expect(segs[4]).toEqual({ kind: 'protonation', start: 26, end: 27 });
  });

  it('slicing protonation segment yields L', () => {
    const segs = parseInchiKey(PROTONATED_KEY);
    expect(PROTONATED_KEY.slice(segs[4].start, segs[4].end)).toBe('L');
  });
});

describe('Group 3: non-standard flag', () => {
  // Replace position 23 (S→N) to create a non-standard key fixture
  const NON_STANDARD_KEY = BENZENE_KEY.slice(0, 23) + 'N' + BENZENE_KEY.slice(24);

  it('returns 5 segments for a non-standard key (flag=N)', () => {
    expect(NON_STANDARD_KEY).toHaveLength(27);
    const segs = parseInchiKey(NON_STANDARD_KEY);
    expect(segs).toHaveLength(5);
  });

  it('flag segment is {kind:"flag", start:23, end:24}', () => {
    const segs = parseInchiKey(NON_STANDARD_KEY);
    expect(segs[2]).toEqual({ kind: 'flag', start: 23, end: 24 });
  });

  it('slicing flag segment yields N', () => {
    const segs = parseInchiKey(NON_STANDARD_KEY);
    expect(NON_STANDARD_KEY.slice(segs[2].start, segs[2].end)).toBe('N');
  });
});

describe('Group 4: empty string', () => {
  it('returns [] for empty string', () => {
    expect(parseInchiKey('')).toEqual([]);
  });
});

describe('Group 5: malformed and short keys', () => {
  it('returns [] for a string shorter than 27 chars ("UHOVQNZJYSORNB")', () => {
    expect(parseInchiKey('UHOVQNZJYSORNB')).toEqual([]);
  });

  it('returns [] for "not-a-key"', () => {
    expect(parseInchiKey('not-a-key')).toEqual([]);
  });

  it('returns [] for 27 X\'s with no hyphens', () => {
    expect(parseInchiKey('X'.repeat(27))).toEqual([]);
  });

  it('returns [] for 28-char string (length check)', () => {
    expect(parseInchiKey('UHOVQNZJYSORNB-UHFFFAOYSA-NN')).toEqual([]);
  });
});

describe('Group 6: no-reassembly structural invariant', () => {
  it('each segment object has exactly the keys [end, kind, start] — no text/value/chars', () => {
    const segs = parseInchiKey(BENZENE_KEY);
    expect(segs).toHaveLength(5);
    for (const seg of segs) {
      expect(Object.keys(seg).sort()).toEqual(['end', 'kind', 'start']);
    }
  });
});
