import { useState, useEffect, type ReactNode } from 'react';
import { resolveLegalRoute } from '../lib/legalRoutes';
import { LegalPage } from './LegalPage';

// Top-level hash router. A legal hash (#imprint/#privacy/#terms) shows the
// corresponding LegalPage; anything else shows the main app (children). The
// main app is passed as children so it only mounts on non-legal routes —
// keeping Ketcher/WASM dormant while viewing a legal page.
export function Root({ children }: { children: ReactNode }) {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const doc = resolveLegalRoute(hash);
  return doc ? <LegalPage doc={doc} /> : <>{children}</>;
}
