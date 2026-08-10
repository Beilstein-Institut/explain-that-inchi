// Site footer. Impressum / Privacy / Terms are in-app hash routes (see Root +
// LegalPage). Third-party attribution is not linked here — it lives in the
// Terms doc's "Third-party components" section, with the full generated notices
// in THIRD-PARTY-NOTICES.md at the repo root.
import logoUrl from '../assets/beilstein-institut-logo-wide.png';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a
        className="site-footer-logo"
        href="https://www.beilstein-institut.de/en/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={logoUrl} width={507} height={120} alt="Beilstein-Institut" />
      </a>
      <a href="#imprint">Impressum</a>
      <span aria-hidden="true">·</span>
      <a href="#privacy">Privacy Policy</a>
      <span aria-hidden="true">·</span>
      <a href="#terms">Terms &amp; Conditions</a>
    </footer>
  );
}
