// Data minimisation: the molecule editor's localStorage entries are wiped when
// the user leaves the site, so nothing persists between visits. Privacy policy
// § 3 (2) states this behaviour — the two must stay in step.
//
// Prefix sweep rather than a fixed key list. Ketcher owns these names and has
// changed them across versions (at 3.17.1: 'ketcher-opts',
// 'ketcher_editor_saved_settings', 'ketcher-tmpls'), so an enumerated list would
// rot silently on the next upgrade and leave data behind that the policy claims
// is gone.
const EDITOR_STORAGE_PREFIX = 'ketcher';

/** Removes every editor-owned key from `store`. */
export function clearEditorStorage(store: Storage = window.localStorage): void {
  // Collect before removing: removeItem() reindexes the store, so deleting
  // while walking by index skips entries.
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key !== null && key.startsWith(EDITOR_STORAGE_PREFIX)) {
      doomed.push(key);
    }
  }
  for (const key of doomed) {
    store.removeItem(key);
  }
}

/**
 * Wipes editor storage when the page goes away. Returns an unsubscribe.
 *
 * 'pagehide' rather than 'beforeunload': beforeunload never fires reliably on
 * mobile and disqualifies the page from the back/forward cache. Firing on a
 * bfcache hide is harmless — a restored page keeps its in-memory editor state,
 * and Ketcher rewrites its settings as it runs.
 */
export function registerEditorStorageWipe(): () => void {
  const wipe = () => clearEditorStorage();
  window.addEventListener('pagehide', wipe);
  return () => window.removeEventListener('pagehide', wipe);
}
