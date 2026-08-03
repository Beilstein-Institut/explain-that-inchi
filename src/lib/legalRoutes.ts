// Hash-based routing for the standalone legal pages (Impressum / Privacy / Terms).
// No router dependency: the app is a static SPA served from a base path, so a
// hash route (#imprint) works on GitHub Pages with no server fallback config.
import { IMPRINT_HTML, PRIVACY_HTML, TERMS_HTML } from '../data/legalContent';

export type LegalDocId = 'imprint' | 'privacy' | 'terms';

export interface LegalDoc {
  id: LegalDocId;
  /** Footer link label + browser-facing page title. */
  title: string;
  /** Self-contained HTML body (developer-authored constant — safe to inline). */
  html: string;
}

export const LEGAL_DOCS: readonly LegalDoc[] = [
  { id: 'imprint', title: 'Impressum', html: IMPRINT_HTML },
  { id: 'privacy', title: 'Privacy Policy', html: PRIVACY_HTML },
  { id: 'terms', title: 'Terms & Conditions', html: TERMS_HTML },
];

/** Map a location.hash (with or without leading '#') to a legal doc, or null. */
export function resolveLegalRoute(hash: string): LegalDoc | null {
  const id = hash.replace(/^#/, '');
  return LEGAL_DOCS.find((doc) => doc.id === id) ?? null;
}
