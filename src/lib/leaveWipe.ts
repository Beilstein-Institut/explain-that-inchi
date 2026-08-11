// Data minimisation: everything this site can reach in the browser's storage is
// wiped when the visitor leaves, so nothing persists between visits. Privacy
// policy § 3 (2)–(4) states this behaviour — the two must stay in step.
//
// Scope, measured on a fresh Chromium profile after one visit: localStorage
// holds Ketcher's own keys ('ketcher-opts', 'ketcher_editor_saved_settings',
// and 'ketcher-tmpls' after a favourite) and nothing else; sessionStorage,
// IndexedDB, Cookies and Service Worker registrations are all empty. The
// dominant footprint is the HTTP cache (49 MB of built assets, of which 18 MB
// is deliberately-uncompressed WASM), which no script can touch — only the
// Clear-Site-Data response header can, hence the beacon below.
//
// The IndexedDB and Cache Storage sweeps therefore clear nothing today. They
// are a guard against a future dependency introducing a store, replacing the
// old `ketcher`-prefix sweep whose enumerated-name assumption rotted on every
// Ketcher upgrade.

/**
 * Clears every browser store this page can reach. The app persists nothing of
 * its own, so there is no key worth preserving.
 *
 * The asynchronous sweeps are fired without awaiting and swallow their own
 * errors: pagehide gives no time to await, and a rejected sweep must not stop
 * the synchronous storage clears that actually matter.
 */
export function wipeSiteData(): void {
  window.localStorage.clear();
  window.sessionStorage.clear();

  // Property access, never a bare `indexedDB` / `caches` identifier: `caches`
  // is undefined on insecure origins, and a bare read there is a ReferenceError
  // rather than undefined. `databases()` is also not universally implemented.
  if (typeof window.indexedDB?.databases === 'function') {
    window.indexedDB
      .databases()
      .then((dbs) => {
        for (const { name } of dbs) {
          if (name) window.indexedDB.deleteDatabase(name);
        }
      })
      .catch(() => {});
  }

  if (window.caches) {
    window.caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
      .catch(() => {});
  }

  // The crossOriginIsolated guard is load-bearing, not defensive noise. When
  // COOP/COEP do NOT arrive from the origin, coi-serviceworker.js is the thing
  // providing cross-origin isolation; unregistering it blindly forces its
  // register-and-reload dance on every single visit, breaking the fallback path
  // that keeps the InChI WASM working.
  if (window.crossOriginIsolated && navigator.serviceWorker) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) void registration.unregister();
      })
      .catch(() => {});
  }
}

/**
 * Wipes site data when the page goes away, and beacons the leave endpoint first
 * so the server can answer with Clear-Site-Data and purge the HTTP cache.
 * Returns an unsubscribe.
 *
 * Both halves are unconditional. There is deliberately no opt-in: a setting
 * that defaults to "keep the data" is a setting almost nobody changes, and the
 * privacy policy would then describe the minority case.
 *
 * 'pagehide' rather than 'beforeunload': beforeunload never fires reliably on
 * mobile and disqualifies the page from the back/forward cache. Firing on a
 * bfcache hide is harmless — a restored page keeps its in-memory editor state,
 * and Ketcher rewrites its settings as it runs.
 *
 * Accepted cost: pagehide cannot distinguish a reload from a close
 * (`event.persisted` only signals bfcache), so every reload purges the cache
 * and re-downloads the whole bundle. Data minimisation was chosen over that.
 *
 * Blast radius: the endpoint answers with Clear-Site-Data, which the spec
 * scopes to the ORIGIN, not to this path. Leaving this app therefore clears
 * cache and storage for everything on cheminfo.beilstein.org.
 */
export function registerLeaveWipe(): () => void {
  const onPagehide = () => {
    // Beacon first: it is the fragile half, and the wipe cannot fail.
    if (typeof navigator.sendBeacon === 'function') {
      // Vite normalises BASE_URL to a trailing slash, so no join helper is
      // needed and no deploy path is hardcoded.
      navigator.sendBeacon(`${import.meta.env.BASE_URL}__leave`);
    }
    wipeSiteData();
  };
  window.addEventListener('pagehide', onPagehide);
  return () => window.removeEventListener('pagehide', onPagehide);
}
