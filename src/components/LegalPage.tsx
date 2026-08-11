import { useEffect } from 'react';
import type { LegalDoc } from '../lib/legalRoutes';

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
      {/* No publisher mark here: SiteFooter renders on every route (see Root),
          so these documents carry the Beilstein-Institut identification in the
          footer. A masthead as well would be the same logo twice on one page. */}
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
