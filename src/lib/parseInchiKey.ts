// Pure parser — no browser globals, Node-compatible for Vitest.
// Returns offset ranges only; callers slice the stored verbatim key string at render time (Invariant #1).

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

/**
 * The five named segments of a 27-character InChIKey string.
 * Mirrors the LayerType union pattern from parseInchi.ts.
 */
export type InchiKeySegmentKind =
  | 'skeleton'
  | 'hash'
  | 'flag'
  | 'version'
  | 'protonation';

/**
 * A segment of an InChIKey, represented as inclusive start / exclusive end offsets.
 * Callers use key.slice(start, end) to retrieve the text at render time.
 * No text/value/chars property — offsets only (Invariant #1).
 */
export interface InchiKeySegment {
  kind: InchiKeySegmentKind;
  start: number; // inclusive
  end: number;   // exclusive — callers use key.slice(start, end)
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Splits a 27-character InChIKey string into 5 typed offset-range segments.
 *
 * InChIKey anatomy (InChI Trust spec):
 *   Position  0–13  : skeleton hash (14 chars)    → kind 'skeleton'
 *   Position  14    : hyphen — NOT a segment
 *   Position  15–22 : remaining-layers hash (8 ch) → kind 'hash'
 *   Position  23    : flag — 'S' (standard) or 'N' (non-standard) → kind 'flag'
 *   Position  24    : version — 'A'                → kind 'version'
 *   Position  25    : hyphen — NOT a segment
 *   Position  26    : protonation char (e.g. 'N' for neutral) → kind 'protonation'
 *
 * Returns [] for any input that does not conform to the 27-char format
 * (length !== 27, or no hyphen at position 14, or no hyphen at position 25).
 * Never throws for any string input (Threat T-11-01 / D-08).
 */
export function parseInchiKey(key: string): InchiKeySegment[] {
  if (key.length !== 27 || key[14] !== '-' || key[25] !== '-') {
    return [];
  }

  return [
    { kind: 'skeleton',    start: 0,  end: 14 },
    { kind: 'hash',        start: 15, end: 23 },
    { kind: 'flag',        start: 23, end: 24 },
    { kind: 'version',     start: 24, end: 25 },
    { kind: 'protonation', start: 26, end: 27 },
  ];
}
