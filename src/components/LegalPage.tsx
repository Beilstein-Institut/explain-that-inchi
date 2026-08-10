import { useEffect } from 'react';
import type { LegalDoc } from '../lib/legalRoutes';
import logoUrl from '../assets/beilstein-institut-logo-wide.png';

// Standalone legal page (Impressum / Privacy / Terms), reached via a hash route.
// Body is a developer-authored constant string, so dangerouslySetInnerHTML is
// safe here (no user-supplied content).
export function LegalPage({ doc }: { doc: LegalDoc }) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${doc.title} · Explain that InChI`;
    return () => {
      document.title = prev;
    };
  }, [doc.title]);

  return (
    <div className="legal-page">
      {/* Publisher mark. Root swaps the whole app out for LegalPage, so the
          SiteFooter logo is not on screen here — these documents would
          otherwise carry no Beilstein-Institut identification. The wordmark is
          part of the image, so alt text supplies the name. */}
      <a
        className="legal-masthead"
        href="https://www.beilstein-institut.de/en/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={logoUrl} width={507} height={120} alt="Beilstein-Institut" />
      </a>
      <a className="legal-back" href={import.meta.env.BASE_URL}>
        ← Back to Explain that InChI
      </a>
      <article
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: doc.html }}
      />
    </div>
  );
}
