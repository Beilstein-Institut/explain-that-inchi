// Site footer. Impressum / Privacy / Terms are in-app hash routes (see Root +
// LegalPage). Third-party attribution is not linked here — it lives in the
// Terms doc's "Third-party components" section, with the full generated notices
// in THIRD-PARTY-NOTICES.md at the repo root.
import { useState } from 'react';
import logoUrl from '../assets/beilstein-institut-logo-wide.png';
import { isLeaveNoTrace, setLeaveNoTrace } from '../lib/leaveWipe';

export function SiteFooter() {
  const [noTrace, setNoTrace] = useState(() => isLeaveNoTrace());

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
      {/* The caveats live in the title; the full explanation is in the privacy
          policy, which is linked one element away. */}
      <label
        className="site-footer-toggle"
        title="Asks the browser to clear this site's cached files when you leave. A reload counts as leaving, so the editor is downloaded again. Has no effect in Safari."
      >
        <input
          type="checkbox"
          checked={noTrace}
          onChange={(event) => {
            setLeaveNoTrace(event.target.checked);
            setNoTrace(event.target.checked);
          }}
        />
        Leave no trace on exit
      </label>
      <a href="#imprint">Impressum</a>
      <span aria-hidden="true">·</span>
      <a href="#privacy">Privacy Policy</a>
      <span aria-hidden="true">·</span>
      <a href="#terms">Terms &amp; Conditions</a>
    </footer>
  );
}
