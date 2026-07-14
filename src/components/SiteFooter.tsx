// Site footer. Imprint / Privacy / Terms are in-app hash routes (see Root +
// LegalPage); Licenses stays an external link to the generated notices file.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a href="#imprint">Imprint</a>
      <span aria-hidden="true">·</span>
      <a href="#privacy">Privacy Policy</a>
      <span aria-hidden="true">·</span>
      <a href="#terms">Terms</a>
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
