// InChIKey zone prose — Phase 13: Content & Explanation.
// Exports KEY_ZONE_COPY (all 4 hover-zone cards) and SHARED_TAGLINE.
// No code reconstructs or re-joins the key from segments (Invariant #1 / D-08).

import type { KeyHoverZone } from '../store';
import type { Copy } from './audience';

// ---------------------------------------------------------------------------
// SHARED_TAGLINE — appears on every key-segment card (D-02 / INKEY-09).
// States the central one-way-hash lesson: the key cannot be decoded back to
// the structure or mapped to atoms — which is why key segments do not highlight.
// ---------------------------------------------------------------------------

export const SHARED_TAGLINE =
  'The InChIKey is a one-way hash — it cannot be decoded back to the structure or mapped to atoms, which is why these segments do not highlight.';

// ---------------------------------------------------------------------------
// KEY_ZONE_COPY — prose for all 4 hover zones.
// Shape mirrors { label, title, body } expected by Explanation.tsx.
// Voice: terse chemist-register, 1–3 sentences + tagline (D-05, D-07).
// ---------------------------------------------------------------------------

// InChI-specific throughout: hashing has no IUPAC nomenclature term.
// Chemist bodies end with SHARED_TAGLINE (D-02 / INKEY-09); plain bodies
// carry the same one-way-hash lesson in their own words.
const PLAIN_TAGLINE =
  'It cannot be turned back into the drawing, so nothing lights up when you hover it.';

export const KEY_ZONE_COPY: Record<KeyHoverZone, { label: string; title: Copy; body: Copy }> = {

  // INKEY-07 (block structure), INKEY-08 (27-char purpose), INKEY-11 (lookup basis), D-03, D-04.
  skeleton: {
    label: 'skeleton hash',
    title: { chemist: 'Skeleton hash', plain: 'Skeleton code' },
    body: {
      chemist:
        'This 14-character block is a hash of the connectivity (skeleton) layer of the InChI — ' +
        'the InChIKey as a whole is the fixed 27-character, web- and database-search-friendly hashed form of the full InChI. ' +
        'Molecules that share the same connectivity share this first block, making it the basis for InChIKey database and web lookup; ' +
        'a multi-component or salt structure yields one key for the whole drawn assembly, not separate keys per fragment. ' +
        SHARED_TAGLINE,
      plain:
        'These 14 characters are a fingerprint of how the atoms are joined. ' +
        'Two molecules with the same joins share these 14 characters, so databases use this block to look molecules up. ' +
        'A drawing with several parts, such as a salt, gets one key for the whole drawing. ' +
        PLAIN_TAGLINE,
    },
  },

  // INKEY-07 (block structure), INKEY-10 (collision caveat), D-03.
  hash: {
    label: 'remaining-layers hash',
    title: { chemist: 'Remaining-layers hash', plain: 'Details code' },
    body: {
      chemist:
        'This 8-character block hashes the remaining InChI layers — stereo, isotope, and proton information. ' +
        'Collisions are improbable but theoretically possible, so the key is suited for lookup and indexing, not as proof of identity. ' +
        SHARED_TAGLINE,
      plain:
        'These 8 characters are a fingerprint of everything else: 3-D shape, isotopes and hydrogen ions. ' +
        'Two different molecules could in theory share it, so the key is for searching, not proof. ' +
        PLAIN_TAGLINE,
    },
  },

  // INKEY-07 (block structure), INKEY-12 (S/N flag + version A), D-03.
  flagVersion: {
    label: 'flag + version',
    title: { chemist: 'Standard flag & version', plain: 'Type and version' },
    body: {
      chemist:
        'S indicates a standard InChI; N indicates a non-standard InChI. ' +
        'The following character A identifies InChIKey version 1. ' +
        SHARED_TAGLINE,
      plain:
        'S means the standard InChI settings were used; N means custom settings. ' +
        'The A says which version of the key format this is. ' +
        PLAIN_TAGLINE,
    },
  },

  // INKEY-07 (block structure), D-03.
  protonation: {
    label: 'protonation',
    title: { chemist: 'Protonation flag', plain: 'Hydrogen-ion flag' },
    body: {
      chemist:
        'This single character encodes the protonation state of the drawn assembly (N = neutral is the standard preset). ' +
        SHARED_TAGLINE,
      plain:
        'One letter recording whether hydrogen ions were added or removed. N means none, the usual case. ' +
        PLAIN_TAGLINE,
    },
  },
};
