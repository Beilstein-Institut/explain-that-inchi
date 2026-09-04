// The chosen register lives in the URL (?mode=plain), never in browser storage:
// leaveWipe.ts clears every store on pagehide and privacy policy §3 promises
// nothing persists. Chemist is the default and has no parameter.
import { DEFAULT_AUDIENCE } from './audience';
import type { Audience } from './audience';

const PARAM = 'mode';
const PLAIN = 'plain';

export function readAudience(): Audience {
  if (typeof window === 'undefined') {
    return DEFAULT_AUDIENCE;
  }

  const mode = new URLSearchParams(window.location.search).get(PARAM);
  return mode === PLAIN ? 'plain' : DEFAULT_AUDIENCE;
}

export function writeAudience(audience: Audience): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const url = new URL(window.location.href);
    if (audience === 'plain') {
      url.searchParams.set(PARAM, PLAIN);
    } else {
      url.searchParams.delete(PARAM);
    }

    window.history.replaceState(null, '', url);
  } catch {
    // Sandboxed frame: the state still switches, only the URL is not updated.
  }
}
