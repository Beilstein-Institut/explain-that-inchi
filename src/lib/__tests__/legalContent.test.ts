import { describe, it, expect } from 'vitest';
import { IMPRINT_HTML, PRIVACY_HTML, TERMS_HTML } from '../../data/legalContent';

// These docs were templated from a different Beilstein tool ("BChemXtractWeb",
// a Python/FastAPI backend product). They must now describe *this* app:
// Explain that InChI — a static, in-browser React/Ketcher tool, no backend.
const STALE_PRODUCT_TOKENS = [
  /BChemXtract/i,
  /FastAPI/i,
  /JPype/i,
  /\bCDK\b/,
  /Tailwind/i,
  /Base UI/i,
  /Lucide/i,
  /JetBrains/i,
  /fat JAR/i,
  /backend/i,
  /RInChI/i,
];

describe('legal content is adapted to Explain that InChI', () => {
  it('Terms names this product, not the templated one', () => {
    expect(TERMS_HTML).toMatch(/Explain that InChI/);
    for (const stale of STALE_PRODUCT_TOKENS) {
      expect(TERMS_HTML).not.toMatch(stale);
    }
  });

  it('Terms lists the real third-party components (Ketcher, IBM Plex, React)', () => {
    expect(TERMS_HTML).toMatch(/Ketcher/);
    expect(TERMS_HTML).toMatch(/Apache/);
    expect(TERMS_HTML).toMatch(/IBM Plex/);
    expect(TERMS_HTML).toMatch(/OFL-1\.1/);
    expect(TERMS_HTML).toMatch(/React/);
    expect(TERMS_HTML).toMatch(/MIT/);
  });

  it('Terms describes the actual purpose (draw a molecule, understand its InChI)', () => {
    expect(TERMS_HTML).toMatch(/Everybody is free to use Explain that InChI/);
  });

  it('Terms links its Privacy Policy reference to the in-app page, not an external site', () => {
    expect(TERMS_HTML).toMatch(/href="#privacy"/);
    expect(TERMS_HTML).not.toMatch(/beilstein-strenda-db\.org/);
  });

  it('Privacy states molecule data is processed only in the browser', () => {
    expect(PRIVACY_HTML).toMatch(/processed entirely within your browser/);
  });

  it('no doc carries stale product/tech tokens', () => {
    for (const html of [IMPRINT_HTML, PRIVACY_HTML, TERMS_HTML]) {
      for (const stale of STALE_PRODUCT_TOKENS) {
        expect(html).not.toMatch(stale);
      }
    }
  });
});
