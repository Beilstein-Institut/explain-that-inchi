import { describe, it, expect } from 'vitest';
import { resolveLegalRoute, LEGAL_DOCS } from '../legalRoutes';

describe('resolveLegalRoute', () => {
  it('maps #imprint to the imprint doc', () => {
    expect(resolveLegalRoute('#imprint')?.id).toBe('imprint');
  });

  it('maps #privacy to the privacy doc', () => {
    expect(resolveLegalRoute('#privacy')?.id).toBe('privacy');
  });

  it('maps #terms to the terms doc', () => {
    expect(resolveLegalRoute('#terms')?.id).toBe('terms');
  });

  it('tolerates a hash without the leading # (from location.hash edge cases)', () => {
    expect(resolveLegalRoute('privacy')?.id).toBe('privacy');
  });

  it('returns null for the empty hash (main app)', () => {
    expect(resolveLegalRoute('')).toBeNull();
  });

  it('returns null for an unknown hash', () => {
    expect(resolveLegalRoute('#nope')).toBeNull();
  });

  it('exposes a title and HTML body for every doc', () => {
    for (const doc of LEGAL_DOCS) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.html).toContain('<h1');
    }
  });
});
