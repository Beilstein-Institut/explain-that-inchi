import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted fonts (GDPR: no request to Google's CDN). Only the weights/styles
// actually used in styles.css are imported.
// The `latin-` prefix matters: the bare `400.css` aggregate pulls the cyrillic,
// cyrillic-ext, greek and vietnamese subsets too — 30 extra woff2 (~348 KB) that
// an English-only UI never requests. The glyphs this app uses beyond Latin-1
// (subscripts, arrows, +/-) are in no IBM Plex subset, so they fell back to a
// system face before this change and still do.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
// The one italic cut. The mobile-H token in the h-layer is set in italic
// (InchiSection.module.css .hydroMobile) — a colour-independent second channel
// for a distinction colour alone was carrying. Without the real cut the browser
// shears the upright, which is visibly wrong at --fs-string. Not unused: delete
// this and the token silently degrades to a synthesised slant.
import '@fontsource/ibm-plex-mono/latin-400-italic.css';
import './styles.css';
import { Root } from './components/Root';
import { registerLeaveWipe } from './lib/leaveWipe';

// Registered here, not in App: a visitor who only opens a legal route never
// mounts App, and any editor data left by an earlier visit should still be
// cleared when they leave.
registerLeaveWipe();

// App is lazy so the legal routes (#imprint/#privacy/#terms) never download it.
// Root already keeps Ketcher dormant on those routes, but a static import still
// shipped the whole editor + WASM glue to a reader who only wanted the Impressum.
// Creating the element is not rendering it: the import fires when Root renders
// children, which it does not do on a legal route.
// ketcher-react's stylesheet rides along in App's chunk for the same reason.
const App = React.lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root>
      <React.Suspense fallback={<div className="app-loading">Loading the editor…</div>}>
        <App />
      </React.Suspense>
    </Root>
  </React.StrictMode>,
);
