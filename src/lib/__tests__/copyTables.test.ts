import { describe, it, expect } from 'vitest';
import { LAYER_INFO, DEFAULT_INFO, EMPTY_INFO } from '../layerInfo';
import { KEY_ZONE_COPY } from '../inchiKeyInfo';
import { STEPS } from '../../components/HelpTour';
import { ALL_LAYERS } from '../../components/Legend';
import type { Copy } from '../audience';

// Words that mark the plain register as having leaked chemist jargon.
const BANNED_IN_PLAIN = [/sp³/i, /\bparit(y|ies)\b/i, /stereodescriptor/i, /\bcanonical\b/i, /\bHill\b/i, /\bCIP\b/i, /\bligand/i, /\btautomer/i, /\benantiomer/i];
const MAX_PLAIN_SENTENCE_WORDS = 20;

function allCopies(): [string, Copy][] {
  const out: [string, Copy][] = [];
  for (const [k, e] of Object.entries(LAYER_INFO)) { out.push([`layer ${k} title`, e.title], [`layer ${k} blurb`, e.blurb]); }
  out.push(['DEFAULT title', DEFAULT_INFO.title], ['DEFAULT blurb', DEFAULT_INFO.blurb]);
  out.push(['EMPTY title', EMPTY_INFO.title], ['EMPTY blurb', EMPTY_INFO.blurb]);
  for (const [k, e] of Object.entries(KEY_ZONE_COPY)) { out.push([`key ${k} title`, e.title], [`key ${k} body`, e.body]); }
  STEPS.forEach((s, i) => out.push([`tour ${i} title`, s.title], [`tour ${i} body`, s.body]));
  ALL_LAYERS.forEach(l => out.push([`legend ${l.type} name`, l.name], [`legend ${l.type} desc`, l.desc]));
  return out;
}

describe('copy tables', () => {
  it.each(allCopies())('%s: both registers non-empty', (_n, c) => {
    expect(c.chemist.trim().length).toBeGreaterThan(0);
    expect(c.plain.trim().length).toBeGreaterThan(0);
  });

  it.each(allCopies().filter(([n]) => /blurb|body|desc/.test(n)))('%s: plain differs from chemist', (_n, c) => {
    expect(c.plain).not.toBe(c.chemist);
  });

  it.each(allCopies())('%s: plain has no banned jargon', (_n, c) => {
    for (const re of BANNED_IN_PLAIN) {
      expect(c.plain).not.toMatch(re);
    }
  });

  it.each(allCopies().filter(([n]) => /blurb|body/.test(n)))('%s: plain sentences are short', (_n, c) => {
    for (const s of c.plain.split(/(?<=[.!?])\s+/)) {
      const words = s.trim().split(/\s+/).filter(Boolean).length;
      expect(words, s).toBeLessThanOrEqual(MAX_PLAIN_SENTENCE_WORDS);
    }
  });
});
