import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted fonts (GDPR: no request to Google's CDN). Only the weights/styles
// actually used in styles.css are imported.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-serif/400.css';
import '@fontsource/ibm-plex-serif/400-italic.css';
import '@fontsource/ibm-plex-serif/500.css';
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
