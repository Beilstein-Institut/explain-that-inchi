// LayerText — per-layer sub-token renderers.
// Port of design_handoff_explain_that_inchi/app.jsx lines 112-278.
// Key adaptation: no onSubHover prop — calls useInchiStore.getState().setSubHover directly.
// Per D-07 and RESEARCH.md Pitfall 1.

import React from 'react';
import { useInchiStore } from '../store';
import type { Layer, SubHover, CLayerToken } from '../lib/parseInchi';
import { formulaFragmentCounts, tokenizeCLayerSeg, collectBranchHyphens } from '../lib/parseInchi';
import styles from './InchiSection.module.css';

// Static lookup — avoids dynamic class name construction which breaks CSS Modules.
// Per Pitfall 1 in RESEARCH.md.
const EL_CLASS: Record<string, string> = {
  C: styles.elC, H: styles.elH, N: styles.elN, O: styles.elO,
  S: styles.elS, P: styles.elP, F: styles.elF, Cl: styles.elCl,
  Br: styles.elBr, I: styles.elI,
};

// Hover handler factory — sets subHover in store on enter, clears on leave.
// Per D-07: wired here so Phase 4 can act on store.subHover without adding event handlers.
function subHoverProps(hit: SubHover) {
  return {
    onMouseEnter: () => useInchiStore.getState().setSubHover(hit),
    onMouseLeave: () => useInchiStore.getState().setSubHover(null),
  };
}

// Dispatches to the correct sub-renderer by layer type.
// rawText must be the verbatim slice from the Ketcher InChI string (layer.prefix stripped).
// Callers must source rawText from the raw inchi string — never reconstruct it.
// fragCounts: heavy-atom counts per fragment (from formulaFragmentCounts on the formula layer).
// Required for correct multi-fragment canonical ID offsetting.
export function LayerText({ layer, rawText, fragCounts = [] }: { layer: Layer; rawText: string; fragCounts?: number[] }) {
  switch (layer.type) {
    case 'formula': return <FormulaText text={rawText} />;
    case 'c':       return <ConnectionText text={rawText} fragCounts={fragCounts} />;
    case 't':
    case 'b':       return <ParityText text={rawText} fragCounts={fragCounts} />;
    case 'h':       return <HLayerText text={rawText} fragCounts={fragCounts} />;
    default:        return <>{rawText}</>;
  }
}

// Port of app.jsx FormulaText lines 138-156.
// Uses EL_CLASS lookup (not "el-"+el).
// For single dot-segment (including pure N* like "2C6H6"): no canonRange — hovers all fragments.
// For multiple dot-segments: computes inclusive canonRange per segment so hover is scoped to
// that fragment or group (e.g. "C7" in "C7H8.2C6H6" scopes to canonicals 1-7 only;
// "C6" in "2C6H6" portion scopes to 8-19, covering both benzene fragments).
function FormulaText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  let key = 0;

  const dotSegments = text.split('.');

  if (dotSegments.length === 1) {
    // Single dot-segment (pure N* or single fragment) — no scoping needed.
    const leadingMult = /^(\d+)(?=[A-Z])/.exec(text);
    if (leadingMult) out.push(<span key={key++}>{leadingMult[1]}</span>);
    let last = leadingMult ? leadingMult[1].length : 0;
    while ((m = re.exec(text)) !== null) {
      if (!m[1]) break;
      if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>);
      const el = m[1];
      out.push(
        <span key={key++} className={[EL_CLASS[el] ?? '', styles.inchiSubtoken].filter(Boolean).join(' ')}
          {...subHoverProps({ kind: 'element', el })}>
          {el}{m[2]}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
    return <>{out}</>;
  }

  // Multiple dot-segments: compute canonical range per segment and scope element hovers.
  const fragCounts = formulaFragmentCounts(text);
  let globalFragIdx = 0;

  dotSegments.forEach((seg, si) => {
    if (si > 0) out.push(<span key={key++}>.</span>);

    // How many actual fragments does this dot-segment represent?
    const segMultMatch = /^(\d+)(?=[A-Z])/.exec(seg);
    const segFragN = segMultMatch ? parseInt(segMultMatch[1], 10) : 1;

    // Inclusive canonical range [lo, hi] for all fragments in this dot-segment.
    let canonStart = 0;
    for (let i = 0; i < globalFragIdx; i++) canonStart += fragCounts[i] ?? 0;
    let canonEnd = canonStart;
    for (let i = 0; i < segFragN; i++) canonEnd += fragCounts[globalFragIdx + i] ?? 0;
    const canonRange: [number, number] = [canonStart + 1, canonEnd];

    if (segMultMatch) out.push(<span key={key++}>{segMultMatch[1]}</span>);
    re.lastIndex = 0;
    let last = segMultMatch ? segMultMatch[1].length : 0;
    while ((m = re.exec(seg)) !== null) {
      if (!m[1]) break;
      if (m.index > last) out.push(<span key={key++}>{seg.slice(last, m.index)}</span>);
      const el = m[1];
      out.push(
        <span key={key++} className={[EL_CLASS[el] ?? '', styles.inchiSubtoken].filter(Boolean).join(' ')}
          {...subHoverProps({ kind: 'element', el, canonRange })}>
          {el}{m[2]}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < seg.length) out.push(<span key={key++}>{seg.slice(last)}</span>);

    globalFragIdx += segFragN;
  });
  return <>{out}</>;
}

// Port of app.jsx ConnectionText lines 158-189.
// Extended for multi-fragment: applies per-fragment canonical offsets for ; notation,
// and emits canonicals arrays for 2* identical-fragment notation.
function ConnectionText({ text, fragCounts }: { text: string; fragCounts: number[] }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const renderSegment = (seg: string, offset: number, canonicalFn?: (n: number) => { canonical: number; canonicals?: number[] }) => {
    // Pass 1 — tokenize the segment into typed CLayerToken[]
    const tokens = tokenizeCLayerSeg(seg);

    // Pass 2 — render each token to a React span
    for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
      const token = tokens[tokenIdx] as CLayerToken;

      if (token.type === 'atom') {
        const hover = canonicalFn ? canonicalFn(token.localN) : { canonical: token.localN + offset };
        parts.push(
          <span key={key++} className={styles.inchiSubtoken} {...subHoverProps({ kind: 'atom', ...hover })}>
            {seg.slice(token.start, token.end)}
          </span>
        );

      } else if (token.type === 'hyphen') {
        if (token.leftLocal == null || token.rightLocal == null) {
          // Malformed hyphen — emit as plain text
          parts.push(<span key={key++}>-</span>);
        } else {
          const endpointPairs: [number, number][] = canonicalFn
            ? (() => {
                const lc = canonicalFn(token.leftLocal);
                const rc = canonicalFn(token.rightLocal);
                const ls = lc.canonicals ?? [lc.canonical];
                const rs = rc.canonicals ?? [rc.canonical];
                return ls.map((l, i) => [l, rs[i]] as [number, number]);
              })()
            : [[token.leftLocal + offset, token.rightLocal + offset]];
          parts.push(
            <span key={key++} className={styles.inchiSubtoken}
              {...subHoverProps({ kind: 'bond', endpointPairs })}>
              {'-'}
            </span>
          );
        }

      } else if (token.type === 'open') {
        if (token.closeTokenIdx === -1) {
          // Malformed — unmatched open paren
          parts.push(<span key={key++}>{'('}</span>);
        } else {
          // Branch bonds are derived by ATOM ADJACENCY (stem + nested), not hyphen chars.
          // collectBranchHyphens now returns adjacency-derived pseudo-hyphen bonds, so a
          // single-atom branch like "(4)" off atom 2 yields the stem bond 2-4 (clyr-03).
          const branchHyphens = collectBranchHyphens(tokens, tokenIdx, token.closeTokenIdx);
          const bondPairs: [number, number][] = branchHyphens.flatMap(h => {
            if (h.leftLocal == null || h.rightLocal == null) return [];
            if (canonicalFn) {
              const lc = canonicalFn(h.leftLocal);
              const rc = canonicalFn(h.rightLocal);
              const ls = lc.canonicals ?? [lc.canonical];
              const rs = rc.canonicals ?? [rc.canonical];
              return ls.map((l, i) => [l, rs[i]] as [number, number]);
            }
            return [[h.leftLocal + offset, h.rightLocal + offset] as [number, number]];
          });
          // Store bondPairs on the open token for the close-paren to look up
          (tokens[tokenIdx] as unknown as Record<string, unknown>)['_bondPairs'] = bondPairs;
          if (bondPairs.length === 0) {
            // Comma-only branch — plain non-interactive span
            parts.push(<span key={key++}>{'('}</span>);
          } else {
            parts.push(
              <span key={key++} className={styles.inchiSubtoken}
                {...subHoverProps({ kind: 'branch', bondPairs })}>
                {'('}
              </span>
            );
          }
        }

      } else if (token.type === 'close') {
        const bondPairs: [number, number][] =
          (tokens[token.openTokenIdx] as unknown as Record<string, unknown>)?.['_bondPairs'] as [number, number][] ?? [];
        if (bondPairs.length === 0) {
          parts.push(<span key={key++}>{')'}</span>);
        } else {
          parts.push(
            <span key={key++} className={styles.inchiSubtoken}
              {...subHoverProps({ kind: 'branch', bondPairs })}>
              {')'}
            </span>
          );
        }

      } else {
        // 'other' token — comma, or any unrecognised character
        parts.push(<span key={key++}>{token.slice}</span>);
      }
    }
  };

  // 2* identical-fragment notation: hovering atom n highlights that atom in all fragments.
  // Guarded to fire ONLY for a pure `N*...` text with no `;`. When a `;` is present, control
  // falls through to the `;`-split branch below, which computes correct cross-fragment canonicals.
  const multMatch = !text.includes(';') ? text.match(/^(\d+)\*([\s\S]*)$/) : null;
  if (multMatch) {
    const n = parseInt(multMatch[1], 10);
    const atomsPerFrag = fragCounts[0] ?? 0;
    parts.push(<span key={key++}>{multMatch[1]}*</span>);
    renderSegment(multMatch[2], 0, (localN) => ({
      canonical: localN,
      canonicals: Array.from({ length: n }, (_, fi) => localN + fi * atomsPerFrag),
    }));
    return <>{parts}</>;
  }

  // ; separated notation: offset each fragment's canonical IDs.
  // A segment may itself carry a N* multiplier (e.g. "2*1-2-4-6-5-3-1" in the mixed case).
  const segments = text.split(';');
  let cumOffset = 0;
  let fragIdx = 0;
  segments.forEach((seg, si) => {
    if (si > 0) parts.push(<span key={key++}>;</span>);
    const segMult = seg.match(/^(\d+)\*([\s\S]*)$/);
    if (segMult) {
      const n = parseInt(segMult[1], 10);
      const atomsPerFrag = fragCounts[fragIdx] ?? 0;
      parts.push(<span key={key++}>{segMult[1]}*</span>);
      renderSegment(segMult[2], 0, (localN) => ({
        canonical: localN + cumOffset,
        canonicals: Array.from({ length: n }, (_, fi) => localN + cumOffset + fi * atomsPerFrag),
      }));
      cumOffset += n * atomsPerFrag;
      fragIdx += n;
    } else {
      renderSegment(seg, cumOffset);
      cumOffset += fragCounts[fragIdx] ?? 0;
      fragIdx += 1;
    }
  });
  return <>{parts}</>;
}

// Port of app.jsx ParityText lines 191-212.
// Extended for multi-fragment: applies per-fragment canonical offset for ; notation.
function ParityText({ text, fragCounts }: { text: string; fragCounts: number[] }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const renderSegment = (seg: string, offset: number) => {
    const re = /(\d+)([\-+?])/g;
    let m: RegExpExecArray | null;
    let last = 0;
    while ((m = re.exec(seg)) !== null) {
      if (m.index > last) parts.push(<span key={key++}>{seg.slice(last, m.index)}</span>);
      const atom = parseInt(m[1], 10) + offset;
      const sign = m[2];
      // '+' -> plus color, '-' -> minus color, '?' (undefined) -> neutral (no color class).
      const signClass = sign === '+' ? styles.parityPlus : sign === '-' ? styles.parityMinus : '';
      parts.push(
        <span
          key={key++}
          className={[signClass, styles.inchiSubtoken].filter(Boolean).join(' ')}
          {...subHoverProps({ kind: 'stereo', atom, sign })}
        >
          {m[1]}{sign}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < seg.length) parts.push(<span key={key++}>{seg.slice(last)}</span>);
  };

  const segments = text.split(';');
  let cumOffset = 0;
  segments.forEach((seg, fi) => {
    if (fi > 0) parts.push(<span key={key++}>;</span>);
    renderSegment(seg, cumOffset);
    cumOffset += fragCounts[fi] ?? 0;
  });
  return <>{parts}</>;
}

// Port of app.jsx HLayerText lines 214-278.
// Extended for multi-fragment: applies per-fragment canonical offset.
function HLayerText({ text, fragCounts }: { text: string; fragCounts: number[] }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Parse atom ranges like "1-6" or "3,5" and apply offset to each result.
  const expandAtoms = (s: string, offset: number): number[] => {
    const out: number[] = [];
    for (const range of s.split(',')) {
      if (!range.trim()) continue;
      if (range.includes('-')) {
        const segs = range.split('-');
        const a = parseInt(segs[0], 10), b = parseInt(segs[1], 10);
        if (!isNaN(a) && !isNaN(b)) for (let k = a; k <= b; k++) out.push(k + offset);
      } else {
        const n = parseInt(range, 10);
        if (!isNaN(n)) out.push(n + offset);
      }
    }
    return out;
  };

  const renderSegment = (seg: string, offset: number) => {
    let buf = '', i = 0;
    const flush = () => { if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; } };
    while (i < seg.length) {
      const c = seg[i];
      if (c === '(') {
        flush();
        const end = seg.indexOf(')', i);
        if (end < 0) { buf += c; i++; continue; }
        const inside = seg.slice(i, end + 1);
        const match = inside.match(/\(H\d*,([^)]+)\)/);
        const atoms = match ? expandAtoms(match[1], offset) : [];
        parts.push(
          <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken].join(' ')}
            {...subHoverProps({ kind: 'mobileH', atoms })}
          >{inside}</span>
        );
        i = end + 1; continue;
      }
      if (c === 'H') {
        let j = i + 1;
        while (j < seg.length && /\d/.test(seg[j])) j++;
        const count = j > i + 1 ? parseInt(seg.slice(i + 1, j), 10) : 1;
        const atoms = expandAtoms(buf.replace(/^,/, ''), offset);
        const hydroClass = [(styles as Record<string, string>)[`hydro${Math.min(count, 4)}`], styles.inchiSubtoken].join(' ');
        parts.push(
          <span key={key++} className={hydroClass} {...subHoverProps({ kind: 'hAtoms', atoms, count })}>
            {buf + seg.slice(i, j)}
          </span>
        );
        buf = ''; i = j; continue;
      }
      buf += c; i++;
    }
    flush();
  };

  // 2* identical-fragment notation: atoms from all fragments combined into each hover target.
  // Guarded to fire ONLY for a pure `N*...` text with no `;`. When a `;` is present, control
  // falls through to the `;`-split branch below, which computes correct cross-fragment canonicals.
  const multMatch = !text.includes(';') ? text.match(/^(\d+)\*([\s\S]*)$/) : null;
  if (multMatch) {
    const n = parseInt(multMatch[1], 10);
    const pattern = multMatch[2];
    const atomsPerFrag = fragCounts[0] ?? 0;
    parts.push(<span key={key++}>{multMatch[1]}*</span>);
    // Render pattern once for display; expand each atom range across all n fragments.
    let buf = '', i = 0;
    const flush = () => { if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; } };
    while (i < pattern.length) {
      const c = pattern[i];
      if (c === '(') {
        flush();
        const end = pattern.indexOf(')', i);
        if (end < 0) { buf += c; i++; continue; }
        const inside = pattern.slice(i, end + 1);
        const match = inside.match(/\(H\d*,([^)]+)\)/);
        // Expand mobile H atoms across all fragments
        const atoms = match
          ? Array.from({ length: n }, (_, fi) => expandAtoms(match[1], fi * atomsPerFrag)).flat()
          : [];
        parts.push(
          <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken].join(' ')}
            {...subHoverProps({ kind: 'mobileH', atoms })}
          >{inside}</span>
        );
        i = end + 1; continue;
      }
      if (c === 'H') {
        let j = i + 1;
        while (j < pattern.length && /\d/.test(pattern[j])) j++;
        const count = j > i + 1 ? parseInt(pattern.slice(i + 1, j), 10) : 1;
        const atoms = Array.from({ length: n }, (_, fi) => expandAtoms(buf.replace(/^,/, ''), fi * atomsPerFrag)).flat();
        const hydroClass = [(styles as Record<string, string>)[`hydro${Math.min(count, 4)}`], styles.inchiSubtoken].join(' ');
        parts.push(
          <span key={key++} className={hydroClass} {...subHoverProps({ kind: 'hAtoms', atoms, count })}>
            {buf + pattern.slice(i, j)}
          </span>
        );
        buf = ''; i = j; continue;
      }
      buf += c; i++;
    }
    flush();
    return <>{parts}</>;
  }

  // ; separated notation: apply per-fragment offsets.
  // A segment may itself carry a N* multiplier (e.g. "2*1-6H" in the mixed case).
  const segments = text.split(';');
  let cumOffset = 0;
  let fragIdx = 0;
  segments.forEach((seg, si) => {
    if (si > 0) parts.push(<span key={key++}>;</span>);
    const segMult = seg.match(/^(\d+)\*([\s\S]*)$/);
    if (segMult) {
      const n = parseInt(segMult[1], 10);
      const atomsPerFrag = fragCounts[fragIdx] ?? 0;
      const baseOffset = cumOffset;
      parts.push(<span key={key++}>{segMult[1]}*</span>);
      // Render pattern once visually; expand atoms across all n fragment copies.
      let buf = '', i = 0;
      const pattern = segMult[2];
      const flush2 = () => { if (buf) { parts.push(<span key={key++}>{buf}</span>); buf = ''; } };
      while (i < pattern.length) {
        const c = pattern[i];
        if (c === '(') {
          flush2();
          const end = pattern.indexOf(')', i);
          if (end < 0) { buf += c; i++; continue; }
          const inside = pattern.slice(i, end + 1);
          const match = inside.match(/\(H\d*,([^)]+)\)/);
          const atoms = match
            ? Array.from({ length: n }, (_, fi) => expandAtoms(match[1], baseOffset + fi * atomsPerFrag)).flat()
            : [];
          parts.push(
            <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken].join(' ')}
              {...subHoverProps({ kind: 'mobileH', atoms })}
            >{inside}</span>
          );
          i = end + 1; continue;
        }
        if (c === 'H') {
          let j = i + 1;
          while (j < pattern.length && /\d/.test(pattern[j])) j++;
          const count = j > i + 1 ? parseInt(pattern.slice(i + 1, j), 10) : 1;
          const atoms = Array.from({ length: n }, (_, fi) => expandAtoms(buf.replace(/^,/, ''), baseOffset + fi * atomsPerFrag)).flat();
          const hydroClass = [(styles as Record<string, string>)[`hydro${Math.min(count, 4)}`], styles.inchiSubtoken].join(' ');
          parts.push(
            <span key={key++} className={hydroClass} {...subHoverProps({ kind: 'hAtoms', atoms, count })}>
              {buf + pattern.slice(i, j)}
            </span>
          );
          buf = ''; i = j; continue;
        }
        buf += c; i++;
      }
      flush2();
      cumOffset += n * atomsPerFrag;
      fragIdx += n;
    } else {
      renderSegment(seg, cumOffset);
      cumOffset += fragCounts[fragIdx] ?? 0;
      fragIdx += 1;
    }
  });
  return <>{parts}</>;
}
