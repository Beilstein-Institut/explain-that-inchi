// LayerText — per-layer sub-token renderers.
// Port of design_handoff_explain_that_inchi/app.jsx lines 112-278.
// Key adaptation: no onSubHover prop — calls useInchiStore.getState().setSubHover directly.
// Per D-07 and RESEARCH.md Pitfall 1.
// Phase 16: layerIdx threaded through all sub-renderers for click-to-pin sub-tokens.

import React from 'react';
import { useInchiStore } from '../store';
import type { Layer, SubHover, CLayerToken } from '../lib/parseInchi';
import { formulaFragmentCounts, tokenizeCLayerSeg, collectBranchPointBonds, segmentBonds } from '../lib/parseInchi';
import { JMOL_COLORS } from '../lib/jmolColors';
import { activateProps } from '../lib/keyboardProps';
import styles from './InchiSection.module.css';

// Inline per-element style from the Jmol color. Hydrogen renders black (Jmol
// white is invisible on the page); it must be set explicitly, otherwise it
// inherits the formula layer's blue --c-formula color.
function elStyle(el: string): React.CSSProperties | undefined {
  if (el === 'H') return { color: 'var(--ink)' } as React.CSSProperties;
  const hex = JMOL_COLORS[el];
  if (!hex) return undefined;
  return {
    color: hex,
    ['--el-color' as string]: hex,
    ['--el-bg-color' as string]: `oklch(from ${hex} 0.95 0.04 h)`,
  } as React.CSSProperties;
}

// Hover + pin handler factory — sets subHover in store on enter, clears on leave,
// and pins/unpins on click (Phase 16).
// layerIdx: the owning layer's index in the layers array (threaded from InchiSection).
// Per D-07: wired here so Phase 4 can act on store.subHover without adding event handlers.
function subHoverProps(hit: SubHover, layerIdx: number) {
  const enter = () => useInchiStore.getState().setSubHover(hit);
  const leave = () => useInchiStore.getState().setSubHover(null);
  const activate = (e: React.SyntheticEvent) => {
    // stopPropagation so the layer-level handler in InchiSection does NOT also fire.
    // The document capture listener already cleared the pin (if any) before bubbling,
    // so getState().pinned is null by the time this bubble-phase handler runs.
    // On Enter/Space there is no capture listener, so pinned is still set and the
    // key toggles the pin off — same mental model, different input.
    e.stopPropagation();
    const s = useInchiStore.getState();
    if (s.pinned) { s.clearPinned(); return; }
    s.setPinned({ idx: layerIdx, sub: hit });
  };
  return {
    ...activateProps(activate, { child: true }),
    onMouseEnter: enter,
    onMouseLeave: leave,
    // Focus is the keyboard's hover: same store writes, same card, same highlight.
    onFocus: enter,
    onBlur: leave,
    onClick: activate,
  };
}

// Helper to determine if a sub-token matches the pinned sub-token (for .pinned CSS class).
function isSubPinned(hit: SubHover, pinnedSub: SubHover | null): boolean {
  if (!pinnedSub) return false;
  if (hit.kind !== pinnedSub.kind) return false;
  // Compare by kind-specific identity fields
  if (hit.kind === 'atom' && pinnedSub.kind === 'atom') return hit.canonical === pinnedSub.canonical;
  // canonRange is part of an element token's identity: in "C3H8.B2Cl2H4" the two H
  // tokens differ only by which component they count, so comparing el alone pins both.
  if (hit.kind === 'element' && pinnedSub.kind === 'element') {
    return hit.el === pinnedSub.el
      && JSON.stringify(hit.canonRange) === JSON.stringify(pinnedSub.canonRange);
  }
  if (hit.kind === 'bond' && pinnedSub.kind === 'bond') {
    return JSON.stringify(hit.endpointPairs) === JSON.stringify(pinnedSub.endpointPairs);
  }
  if (hit.kind === 'branch' && pinnedSub.kind === 'branch') {
    return JSON.stringify(hit.bondPairs) === JSON.stringify(pinnedSub.bondPairs);
  }
  if (hit.kind === 'stereo' && pinnedSub.kind === 'stereo') return hit.atom === pinnedSub.atom;
  if (hit.kind === 'hAtoms' && pinnedSub.kind === 'hAtoms') {
    return JSON.stringify(hit.atoms) === JSON.stringify(pinnedSub.atoms);
  }
  if (hit.kind === 'mobileH' && pinnedSub.kind === 'mobileH') {
    return JSON.stringify(hit.atoms) === JSON.stringify(pinnedSub.atoms);
  }
  return false;
}

// Dispatches to the correct sub-renderer by layer type.
// rawText must be the verbatim slice from the Ketcher InChI string (layer.prefix stripped).
// Callers must source rawText from the raw inchi string — never reconstruct it.
// fragCounts: heavy-atom counts per fragment (from formulaFragmentCounts on the formula layer).
// Required for correct multi-fragment canonical ID offsetting.
// layerIdx: the owning layer's index (threaded for sub-token pin onClick).
// pinnedSub: the pinned sub-token for this layer (null if layer is not pinned or pinned at layer level).
export function LayerText({ layer, rawText, fragCounts = [], layerIdx = 0, pinnedSub = null }: {
  layer: Layer;
  rawText: string;
  fragCounts?: number[];
  layerIdx?: number;
  pinnedSub?: SubHover | null;
}) {
  switch (layer.type) {
    case 'formula': return <FormulaText text={rawText} layerIdx={layerIdx} pinnedSub={pinnedSub} />;
    case 'c':       return <ConnectionText text={rawText} fragCounts={fragCounts} layerIdx={layerIdx} pinnedSub={pinnedSub} />;
    case 't':
    case 'b':       return <ParityText text={rawText} fragCounts={fragCounts} layerIdx={layerIdx} pinnedSub={pinnedSub} />;
    case 'h':       return <HLayerText text={rawText} fragCounts={fragCounts} layerIdx={layerIdx} pinnedSub={pinnedSub} />;
    default:        return <>{rawText}</>;
  }
}

// Port of app.jsx FormulaText lines 138-156.
// Uses elStyle() for inline Jmol color (not a CSS class lookup).
// For single dot-segment (including pure N* like "2C6H6"): no canonRange — hovers all fragments.
// For multiple dot-segments: computes inclusive canonRange per segment so hover is scoped to
// that fragment or group (e.g. "C7" in "C7H8.2C6H6" scopes to canonicals 1-7 only;
// "C6" in "2C6H6" portion scopes to 8-19, covering both benzene fragments).
function FormulaText({ text, layerIdx, pinnedSub }: { text: string; layerIdx: number; pinnedSub: SubHover | null }) {
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
      const hit: SubHover = { kind: 'element', el };
      out.push(
        <span key={key++} className={[styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
          style={elStyle(el)}
          {...subHoverProps(hit, layerIdx)}>
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
      const hit: SubHover = { kind: 'element', el, canonRange };
      out.push(
        <span key={key++} className={[styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
          style={elStyle(el)}
          {...subHoverProps(hit, layerIdx)}>
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
function ConnectionText({ text, fragCounts, layerIdx, pinnedSub }: { text: string; fragCounts: number[]; layerIdx: number; pinnedSub: SubHover | null }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // fragmentOffset/componentIndex are DISPLAY-ONLY context threaded onto every c-layer
  // SubHover (GAP-2). Single-component and identical-fragment (N*) copies pass 0/0; the
  // ;-split call site passes cumOffset/fragIdx. SubHover numbers stay GLOBAL regardless.
  const renderSegment = (
    seg: string,
    offset: number,
    canonicalFn?: (n: number) => { canonical: number; canonicals?: number[] },
    fragmentOffset = 0,
    componentIndex = 0,
    fragMult = 1,
  ) => {
    // Pass 1 — tokenize the segment into typed CLayerToken[]
    const tokens = tokenizeCLayerSeg(seg);

    // Pass 2 — render each token to a React span
    for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
      const token = tokens[tokenIdx] as CLayerToken;

      if (token.type === 'atom') {
        const hover = canonicalFn ? canonicalFn(token.localN) : { canonical: token.localN + offset };
        // incidentPairs (GLOBAL): every bond pair touching this atom, computed via the shared
        // segmentBonds adjacency walk (NOT a second walker — GAP-15) filtered to token.localN,
        // mapped to global canonicals with the SAME offset/canonicalFn the hyphen path uses.
        const incidentPairs: [number, number][] = segmentBonds(tokens)
          .filter((b) => b.leftLocal === token.localN || b.rightLocal === token.localN)
          .flatMap((b) => {
            if (b.leftLocal == null || b.rightLocal == null) return [];
            if (canonicalFn) {
              // N* duplicated fragment: the CARD describes ONE representative fragment, so use the
              // single frag-0 canonical (.canonical) — NOT the fanned .canonicals (GAP-19). Fanning
              // here made every neighbour pair repeat across all copies and the neighbour extractor
              // (subTokenInfo) leaked non-self pairs in. The highlight reads `canonicals`, untouched.
              return [[canonicalFn(b.leftLocal).canonical, canonicalFn(b.rightLocal).canonical] as [number, number]];
            }
            return [[b.leftLocal + offset, b.rightLocal + offset] as [number, number]];
          });
        const hit: SubHover = { kind: 'atom', ...hover, incidentPairs, fragmentOffset, componentIndex, fragMult };
        parts.push(
          <span key={key++} className={[styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')} {...subHoverProps(hit, layerIdx)}>
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
          const hit: SubHover = { kind: 'bond', endpointPairs, fragmentOffset, componentIndex, fragMult };
          parts.push(
            <span key={key++} className={[styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
              {...subHoverProps(hit, layerIdx)}>
              {'-'}
            </span>
          );
        }

      } else if (token.type === 'open') {
        if (token.closeTokenIdx === -1) {
          // Malformed — unmatched open paren
          parts.push(<span key={key++}>{'('}</span>);
        } else {
          // CLYR-03: a parenthesis highlights the bonds INCIDENT TO the branch-point atom
          // (the atom the branch hangs off) — the chain-in, branch, and chain-out bonds
          // (typically 3). Not the whole substituent (clyr-03-paren-bonds, user-confirmed).
          const branchHyphens = collectBranchPointBonds(tokens, tokenIdx);
          const validHyphens = branchHyphens.filter(h => h.leftLocal != null && h.rightLocal != null);
          let bondPairs: [number, number][];
          if (canonicalFn) {
            const perHyphen = validHyphens.map(h => {
              const lc = canonicalFn(h.leftLocal!);
              const rc = canonicalFn(h.rightLocal!);
              return { ls: lc.canonicals ?? [lc.canonical], rs: rc.canonicals ?? [rc.canonical] };
            });
            const nFrag = perHyphen[0]?.ls.length ?? 1;
            // N* duplicated fragment: GROUP pairs by fragment (frag-0 first) so the card's
            // firstFragment() slice reads one representative branch (GAP-19); the highlight lights
            // every copy's bonds regardless of order (CLYR-05).
            bondPairs = Array.from({ length: nFrag }, (_, fi) =>
              perHyphen.map(p => [p.ls[fi], p.rs[fi]] as [number, number]),
            ).flat();
          } else {
            bondPairs = validHyphens.map(h => [h.leftLocal! + offset, h.rightLocal! + offset] as [number, number]);
          }
          // branchPoint (GLOBAL): the atom the branch hangs off (open token's attachLocal),
          // run through the SAME offset/canonicalFn as bondPairs (research A2 — explicit field,
          // identical on both parens). Stored on the open token so the close-paren reuses it.
          const branchPoint: number | undefined =
            token.attachLocal == null
              ? undefined
              : canonicalFn
                ? canonicalFn(token.attachLocal).canonical
                : token.attachLocal + offset;
          // Store bondPairs + branchPoint on the open token for the close-paren to look up
          (tokens[tokenIdx] as unknown as Record<string, unknown>)['_bondPairs'] = bondPairs;
          (tokens[tokenIdx] as unknown as Record<string, unknown>)['_branchPoint'] = branchPoint;
          if (bondPairs.length === 0) {
            // Comma-only branch — plain non-interactive span
            parts.push(<span key={key++}>{'('}</span>);
          } else {
            const hit: SubHover = { kind: 'branch', bondPairs, branchPoint, fragmentOffset, componentIndex, fragMult };
            parts.push(
              <span key={key++} className={[styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
                {...subHoverProps(hit, layerIdx)}>
                {'('}
              </span>
            );
          }
        }

      } else if (token.type === 'close') {
        const bondPairs: [number, number][] =
          (tokens[token.openTokenIdx] as unknown as Record<string, unknown>)?.['_bondPairs'] as [number, number][] ?? [];
        // branchPoint stashed by the matching open-paren — both parens carry the identical
        // field so hovering '(' or ')' shows the same card (research A2).
        const branchPoint =
          (tokens[token.openTokenIdx] as unknown as Record<string, unknown>)?.['_branchPoint'] as number | undefined;
        if (bondPairs.length === 0) {
          parts.push(<span key={key++}>{')'}</span>);
        } else {
          const hit: SubHover = { kind: 'branch', bondPairs, branchPoint, fragmentOffset, componentIndex, fragMult };
          parts.push(
            <span key={key++} className={[styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
              {...subHoverProps(hit, layerIdx)}>
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
    // Pure-N* identical-fragment copies share local numbering (offset 0); fragMult=n tells the
    // card to describe ONE representative fragment + state the multiplicity (GAP-19), while the
    // highlight still lights every copy via canonicals. componentIndex 0 → "components 1–n".
    renderSegment(multMatch[2], 0, (localN) => ({
      canonical: localN,
      canonicals: Array.from({ length: n }, (_, fi) => localN + fi * atomsPerFrag),
    }), 0, 0, n);
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
      // Identical-fragment copies share per-component LOCAL numbering: pass fragmentOffset=cumOffset
      // + componentIndex=fragIdx so the card de-offsets to the printed local numbers and names the
      // component span, and fragMult=n so it describes ONE representative fragment (GAP-19). The
      // canonicals array stays global across all copies for the highlight (CLYR-05).
      renderSegment(segMult[2], 0, (localN) => ({
        canonical: localN + cumOffset,
        canonicals: Array.from({ length: n }, (_, fi) => localN + cumOffset + fi * atomsPerFrag),
      }), cumOffset, fragIdx, n);
      cumOffset += n * atomsPerFrag;
      fragIdx += n;
    } else {
      renderSegment(seg, cumOffset, undefined, cumOffset, fragIdx);
      cumOffset += fragCounts[fragIdx] ?? 0;
      fragIdx += 1;
    }
  });
  return <>{parts}</>;
}

// Port of app.jsx ParityText lines 191-212.
// Extended for multi-fragment: applies per-fragment canonical offset for ; notation.
function ParityText({ text, fragCounts, layerIdx, pinnedSub }: { text: string; fragCounts: number[]; layerIdx: number; pinnedSub: SubHover | null }) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const renderSegment = (seg: string, offset: number) => {
    const re = /(\d+)([-+?])/g;
    let m: RegExpExecArray | null;
    let last = 0;
    while ((m = re.exec(seg)) !== null) {
      if (m.index > last) parts.push(<span key={key++}>{seg.slice(last, m.index)}</span>);
      const atom = parseInt(m[1], 10) + offset;
      const sign = m[2];
      // '+' -> plus color, '-' -> minus color, '?' (undefined) -> neutral (no color class).
      const signClass = sign === '+' ? styles.parityPlus : sign === '-' ? styles.parityMinus : '';
      const hit: SubHover = { kind: 'stereo', atom, sign };
      parts.push(
        <span
          key={key++}
          className={[signClass, styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
          {...subHoverProps(hit, layerIdx)}
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
function HLayerText({ text, fragCounts, layerIdx, pinnedSub }: { text: string; fragCounts: number[]; layerIdx: number; pinnedSub: SubHover | null }) {
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

  // componentIdx: 0-based index of the component this segment opens at (display-only
  // context for the H-count card; see SubHover.fragmentOffset/componentIndex).
  const renderSegment = (seg: string, offset: number, componentIdx: number) => {
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
        const hit: SubHover = { kind: 'mobileH', atoms, fragmentOffset: offset, componentIndex: componentIdx };
        parts.push(
          <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
            {...subHoverProps(hit, layerIdx)}
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
        const hit: SubHover = { kind: 'hAtoms', atoms, count, fragmentOffset: offset, componentIndex: componentIdx };
        parts.push(
          <span key={key++} className={[hydroClass, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')} {...subHoverProps(hit, layerIdx)}>
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
        // Pure-N* copies share local numbering (base 0): card shows component-local numbers, component 0.
        const hit: SubHover = { kind: 'mobileH', atoms, fragmentOffset: 0, componentIndex: 0, fragMult: n };
        parts.push(
          <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
            {...subHoverProps(hit, layerIdx)}
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
        const hit: SubHover = { kind: 'hAtoms', atoms, count, fragmentOffset: 0, componentIndex: 0, fragMult: n };
        parts.push(
          <span key={key++} className={[hydroClass, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')} {...subHoverProps(hit, layerIdx)}>
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
          const hit: SubHover = { kind: 'mobileH', atoms, fragmentOffset: baseOffset, componentIndex: fragIdx, fragMult: n };
          parts.push(
            <span key={key++} className={[styles.hydroMobile, styles.inchiSubtoken, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')}
              {...subHoverProps(hit, layerIdx)}
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
          const hit: SubHover = { kind: 'hAtoms', atoms, count, fragmentOffset: baseOffset, componentIndex: fragIdx, fragMult: n };
          parts.push(
            <span key={key++} className={[hydroClass, isSubPinned(hit, pinnedSub) ? styles.pinned : ''].filter(Boolean).join(' ')} {...subHoverProps(hit, layerIdx)}>
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
      renderSegment(seg, cumOffset, fragIdx);
      cumOffset += fragCounts[fragIdx] ?? 0;
      fragIdx += 1;
    }
  });
  return <>{parts}</>;
}
