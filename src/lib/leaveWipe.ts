// Data minimisation: everything this site can reach in the browser's storage is
// wiped when the visitor leaves, so nothing persists between visits. Privacy
// policy § 3 (2)–(4) states this behaviour — the two must stay in step.
//
// Scope, measured on a fresh Chromium profile after one visit: localStorage
// holds Ketcher's own keys ('ketcher-opts', 'ketcher_editor_saved_settings',
// and 'ketcher-tmpls' after a favourite) and nothing else; sessionStorage,
// IndexedDB, Cookies and Service Worker registrations are all empty. The
// dominant footprint is the ~29 MB HTTP cache, which no script can touch —
// only the Clear-Site-Data response header can, hence the opt-in beacon below.
//
// The IndexedDB and Cache Storage sweeps therefore clear nothing today. They
// are a guard against a future dependency introducing a store, replacing the
// old `ketcher`-prefix sweep whose enumerated-name assumption rotted on every
// Ketcher upgrade.

/**
 * sessionStorage key for the opt-in cache purge. Per-visit by construction:
 * sessionStorage dies with the tab, so the setting cannot leak into a later
 * visit even though it survives `wipeSiteData()`.
 */
export const LEAVE_NO_TRACE_KEY = 'eti-leave-no-trace';

/** Whether the visitor asked for the browser cache to be purged on leaving. */
export function isLeaveNoTrace(): boolean {
  return window.sessionStorage.getItem(LEAVE_NO_TRACE_KEY) === '1';
}

/** Records the opt-in choice for this visit. */
export function setLeaveNoTrace(on: boolean): void {
  if (on) window.sessionStorage.setItem(LEAVE_NO_TRACE_KEY, '1');
  else window.sessionStorage.removeItem(LEAVE_NO_TRACE_KEY);
}

/**
 * Clears every browser store this page can reach. The app persists nothing of
 * its own, so there is no key worth preserving beyond the opt-in flag.
 *
 * The asynchronous sweeps are fired without awaiting and swallow their own
 * errors: pagehide gives no time to await, and a rejected sweep must not stop
 * the synchronous storage clears that actually matter.
 */
export function wipeSiteData(): void {
  window.localStorage.clear();

  // Read-clear-restore. Clearing wholesale and putting one key back is both
  // shorter and stronger than enumerating what to remove.
  const flag = window.sessionStorage.getItem(LEAVE_NO_TRACE_KEY);
  window.sessionStorage.clear();
  if (flag !== null) window.sessionStorage.setItem(LEAVE_NO_TRACE_KEY, flag);

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
 * Wipes site data when the page goes away, and — only if the visitor opted in —
 * beacons the leave endpoint first so the server can answer with
 * Clear-Site-Data and purge the HTTP cache. Returns an unsubscribe.
 *
 * 'pagehide' rather than 'beforeunload': beforeunload never fires reliably on
 * mobile and disqualifies the page from the back/forward cache. Firing on a
 * bfcache hide is harmless — a restored page keeps its in-memory editor state,
 * and Ketcher rewrites its settings as it runs.
 *
 * Accepted wart: pagehide cannot distinguish a reload from a close
 * (`event.persisted` only signals bfcache), so reloading with the opt-in on
 * purges the cache and re-downloads roughly 29 MB. A Clear-Site-Data "storage"
 * purge may also take the opt-in flag with it, which is fine — the setting is
 * per-visit anyway.
 */
export function registerLeaveWipe(): () => void {
  const onPagehide = () => {
    // Beacon first: it is the fragile half, and the wipe cannot fail.
    if (isLeaveNoTrace() && typeof navigator.sendBeacon === 'function') {
      // Vite normalises BASE_URL to a trailing slash, so no join helper is
      // needed and no deploy path is hardcoded.
      navigator.sendBeacon(`${import.meta.env.BASE_URL}__leave`);
    }
    wipeSiteData();
  };
  window.addEventListener('pagehide', onPagehide);
  return () => window.removeEventListener('pagehide', onPagehide);
}
