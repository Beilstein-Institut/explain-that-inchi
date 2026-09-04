// Site footer. Impressum / Privacy / Terms are in-app hash routes (see Root +
// LegalPage). Third-party attribution is not linked here — it lives in the
// Terms doc's "Third-party components" section, with the full generated notices
// in THIRD-PARTY-NOTICES.md at the repo root.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="meta">
        InChI v<b>1.06</b> · standard ·{' '}
        <a href="https://www.inchi-trust.org/" target="_blank" rel="noopener noreferrer">
          International Chemical Identifier
        </a>
      </span>
      <a href="#imprint">Impressum</a>
      <span aria-hidden="true">·</span>
      <a href="#privacy">Privacy Policy</a>
      <span aria-hidden="true">·</span>
      <a href="#terms">Terms &amp; Conditions</a>
    </footer>
  );
}
