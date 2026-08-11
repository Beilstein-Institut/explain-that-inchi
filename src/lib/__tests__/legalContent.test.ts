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

  // Vendored in public/, so package-lock.json does not cover it — the only
  // places it can be declared are this list and THIRD-PARTY-NOTICES.md.
  it('Terms declares the vendored coi-serviceworker', () => {
    expect(TERMS_HTML).toMatch(/coi-serviceworker/);
    expect(TERMS_HTML).toMatch(/Zuidhof/);
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

  // The retention statements below are the DPO-reviewed answers to "how long is
  // it kept, and how does the user delete it". They are only true because the
  // app persists nothing itself (no localStorage/sessionStorage/IndexedDB writes
  // in src/, no zustand persist middleware) and Ketcher's own keys carry no TTL.
  // If that ever changes, these assertions must fail rather than the docs quietly
  // becoming wrong.
  it('Privacy states drawn structures are not persisted on the device', () => {
    expect(PRIVACY_HTML).toMatch(/only in your browser's memory/);
    expect(PRIVACY_HTML).toMatch(/discarded when you reload or close it/);
  });

  // Backs registerLeaveWipe(): the policy promises the editor's storage is gone
  // when the visitor leaves. If that wipe is ever removed, this claim becomes
  // false — see leaveWipe.test.ts for the behaviour itself.
  it('Privacy states editor storage is wiped on leaving, and gives a manual route too', () => {
    expect(PRIVACY_HTML).toMatch(/deleted automatically as soon as you leave/);
    // Narrowed deliberately: § 3 (3) says the HTTP cache and history DO remain,
    // so the claim may only cover the storage § 3 (2) is about.
    expect(PRIVACY_HTML).toMatch(/none of this data remains stored on your device between visits/);
    expect(PRIVACY_HTML).toMatch(/settings for site data/);
  });

  // § 3 (3)–(4) are the honest limits of registerLeaveWipe(). Pinned against
  // distinctive phrases, not whole paragraphs, so a copy edit does not break
  // them but a silently dropped claim does.
  it('Privacy admits the browsing history survives and is beyond the site s reach', () => {
    expect(PRIVACY_HTML).toMatch(/records the visit in your browsing history/);
    expect(PRIVACY_HTML).toMatch(/can never delete your browsing history/);
  });

  // Pinned as unconditional. registerLeaveWipe() beacons on every pagehide with
  // no opt-in; if a toggle is ever reintroduced, this claim becomes false.
  it('Privacy describes the cache purge as always-on and not switchable', () => {
    expect(PRIVACY_HTML).toMatch(/it always asks your browser to clear its cached files/);
    expect(PRIVACY_HTML).toMatch(/not an option and cannot be switched off/);
    expect(PRIVACY_HTML).not.toMatch(/Leave no trace on exit/);
  });

  // Clear-Site-Data is scoped to the origin, not to /explain-that-inchi/ — see
  // the blast-radius note in leaveWipe.ts. The policy must not imply otherwise.
  it('Privacy states the purge is origin-scoped, not app-scoped', () => {
    expect(PRIVACY_HTML).toMatch(/works per origin and not per application/);
    expect(PRIVACY_HTML).toMatch(/cheminfo\.beilstein\.org/);
  });

  it('Privacy states the reload and Safari limitations of the purge', () => {
    expect(PRIVACY_HTML).toMatch(/cannot tell a reload apart from closing the page/);
    expect(PRIVACY_HTML).toMatch(/Safari does not support the mechanism/);
    expect(PRIVACY_HTML).toMatch(/Clear-Site-Data/);
  });

  it('Privacy carries the current version date', () => {
    expect(PRIVACY_HTML).toMatch(/Version 11\.08\.2026/);
  });

  // § 3 (1) promises no analytics; § 5 must not imply analysis happens anyway.
  it('Privacy does not claim data-analysis processing that the app never does', () => {
    expect(PRIVACY_HTML).not.toMatch(/data analysis purposes/);
  });

  it('no doc carries stale product/tech tokens', () => {
    for (const html of [IMPRINT_HTML, PRIVACY_HTML, TERMS_HTML]) {
      for (const stale of STALE_PRODUCT_TOKENS) {
        expect(html).not.toMatch(stale);
      }
    }
  });
});
