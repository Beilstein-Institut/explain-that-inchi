// Site footer. Impressum / Privacy / Terms are in-app hash routes (see Root +
// LegalPage); Licenses stays an external link to the generated notices file.
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
      <span aria-hidden="true">·</span>
      <a
        href="https://github.com/Beilstein-Institut/explain-that-inchi/blob/master/THIRD-PARTY-NOTICES.md"
        target="_blank"
        rel="noopener noreferrer"
      >
        Licenses
      </a>
    </footer>
  );
}
