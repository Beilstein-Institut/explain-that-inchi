import { describe, it, expect } from 'vitest';
import { KEY_ZONE_COPY, SHARED_TAGLINE } from '../inchiKeyInfo';
import { parseInchiKey } from '../parseInchiKey';

// Reference InChIKey: 27-char conforming string with S at position 23 (flag),
// A at position 24 (version), N at position 26 (protonation).
// Hyphens at positions 14 and 25 per the InChIKey anatomy spec.
const REF_KEY = 'AAAAAAAAAAAAAA-BBBBBBBBSA-N';

describe('KEY_ZONE_COPY — all zones present', () => {
  const ZONE_KEYS = ['skeleton', 'hash', 'flagVersion', 'protonation'] as const;

  it('has entries for all four zones', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY).toHaveProperty(key);
    }
  });

  it('each entry has a non-empty label', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY[key].label.length).toBeGreaterThan(0);
    }
  });

  it('each entry has a non-empty title', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY[key].title.length).toBeGreaterThan(0);
    }
  });

  it('each entry has a non-empty body', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY[key].body.length).toBeGreaterThan(0);
    }
  });
});

describe('SC-1 — zone labels map to correct segment offsets', () => {
  it('parseInchiKey returns 5 segments for the reference key', () => {
    const segments = parseInchiKey(REF_KEY);
    expect(segments).toHaveLength(5);
  });

  it('skeleton segment: start 0, end 14', () => {
    const segments = parseInchiKey(REF_KEY);
    const skeleton = segments.find(s => s.kind === 'skeleton');
    expect(skeleton).toBeDefined();
    expect(skeleton!.start).toBe(0);
    expect(skeleton!.end).toBe(14);
  });

  it('hash segment: start 15, end 23', () => {
    const segments = parseInchiKey(REF_KEY);
    const hash = segments.find(s => s.kind === 'hash');
    expect(hash).toBeDefined();
    expect(hash!.start).toBe(15);
    expect(hash!.end).toBe(23);
  });

  it('flag segment: start 23, end 24', () => {
    const segments = parseInchiKey(REF_KEY);
    const flag = segments.find(s => s.kind === 'flag');
    expect(flag).toBeDefined();
    expect(flag!.start).toBe(23);
    expect(flag!.end).toBe(24);
  });

  it('version segment: start 24, end 25', () => {
    const segments = parseInchiKey(REF_KEY);
    const version = segments.find(s => s.kind === 'version');
    expect(version).toBeDefined();
    expect(version!.start).toBe(24);
    expect(version!.end).toBe(25);
  });

  it('protonation segment: start 26, end 27', () => {
    const segments = parseInchiKey(REF_KEY);
    const protonation = segments.find(s => s.kind === 'protonation');
    expect(protonation).toBeDefined();
    expect(protonation!.start).toBe(26);
    expect(protonation!.end).toBe(27);
  });

  it('skeleton zone label contains "skeleton" (case-insensitive)', () => {
    expect(KEY_ZONE_COPY.skeleton.label.toLowerCase()).toContain('skeleton');
  });

  it('hash zone label contains "hash" (case-insensitive)', () => {
    expect(KEY_ZONE_COPY.hash.label.toLowerCase()).toContain('hash');
  });

  it('flagVersion zone label contains "flag" or "version" (case-insensitive)', () => {
    const label = KEY_ZONE_COPY.flagVersion.label.toLowerCase();
    expect(label.includes('flag') || label.includes('version')).toBe(true);
  });

  it('protonation zone label contains "protonation" (case-insensitive)', () => {
    expect(KEY_ZONE_COPY.protonation.label.toLowerCase()).toContain('protonation');
  });
});

describe('SC-1 — block-size consistency: zone body cites correct char counts', () => {
  it('skeleton body includes "14" (14-char skeleton hash, INKEY-07)', () => {
    expect(KEY_ZONE_COPY.skeleton.body).toContain('14');
  });

  it('skeleton body includes "27" (27-char full key, INKEY-08)', () => {
    expect(KEY_ZONE_COPY.skeleton.body).toContain('27');
  });

  it('hash body includes "8" (8-char remaining-layers hash, INKEY-07)', () => {
    expect(KEY_ZONE_COPY.hash.body).toContain('8');
  });
});

describe('SC-1 — SHARED_TAGLINE present on every zone (INKEY-09 / D-02)', () => {
  // Use the first 20 characters of SHARED_TAGLINE as a stable pin.
  const taglinePrefix = SHARED_TAGLINE.slice(0, 20);

  it('skeleton body includes the shared tagline', () => {
    expect(KEY_ZONE_COPY.skeleton.body).toContain(taglinePrefix);
  });

  it('hash body includes the shared tagline', () => {
    expect(KEY_ZONE_COPY.hash.body).toContain(taglinePrefix);
  });

  it('flagVersion body includes the shared tagline', () => {
    expect(KEY_ZONE_COPY.flagVersion.body).toContain(taglinePrefix);
  });

  it('protonation body includes the shared tagline', () => {
    expect(KEY_ZONE_COPY.protonation.body).toContain(taglinePrefix);
  });
});

describe('D-07 — no reversibility/identity claims', () => {
  const ZONE_KEYS = ['skeleton', 'hash', 'flagVersion', 'protonation'] as const;

  it('no zone body contains "reverse"', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY[key].body).not.toContain('reverse');
    }
  });

  it('no zone body matches /unique identifier/i', () => {
    for (const key of ZONE_KEYS) {
      expect(KEY_ZONE_COPY[key].body).not.toMatch(/unique identifier/i);
    }
  });
});
