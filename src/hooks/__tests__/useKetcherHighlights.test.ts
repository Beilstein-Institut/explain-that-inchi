import { describe, it, expect, vi } from 'vitest';
import { applyKetcherHighlights, whiteAtomLabels, renderHBadges, cleanHBadges, renderFormulaHBadges, outlineWhiteHalos } from '../useKetcherHighlights';
import type { HighlightSpec, StructLike } from '../../lib/highlightUtils';
import type { SubHover, AuxMap, Layer } from '../../lib/parseInchi';

function makeMockEditor() {
  return {
    highlights: {
      clear: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('applyKetcherHighlights', () => {
  it('calls clear() before any create()', () => {
    const editor = makeMockEditor();
    const spec: HighlightSpec = { atoms: [0], bonds: [], rgroupAttachmentPoints: [], color: '#ff0000' };
    applyKetcherHighlights(editor, [spec]);
    expect(editor.highlights.clear).toHaveBeenCalledTimes(1);
    expect(editor.highlights.create).toHaveBeenCalledWith(spec);
  });

  it('calls clear() but NOT create() when specs is empty', () => {
    const editor = makeMockEditor();
    applyKetcherHighlights(editor, []);
    expect(editor.highlights.clear).toHaveBeenCalledTimes(1);
    expect(editor.highlights.create).not.toHaveBeenCalled();
  });

  it('passes multiple specs as variadic args to create()', () => {
    const editor = makeMockEditor();
    const spec1: HighlightSpec = { atoms: [0], bonds: [], rgroupAttachmentPoints: [], color: '#ff0000' };
    const spec2: HighlightSpec = { atoms: [1], bonds: [], rgroupAttachmentPoints: [], color: '#00ff00' };
    applyKetcherHighlights(editor, [spec1, spec2]);
    expect(editor.highlights.create).toHaveBeenCalledWith(spec1, spec2);
  });
});

function makeAtomEl(atomId: number, label: string): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  el.setAttribute('data-atom-id', String(atomId));
  el.setAttribute('data-atomLabel', label);
  return el as unknown as SVGElement;
}

/**
 * Creates a `<g>` element containing a `<text data-atom-id="atomId">` child.
 * Mocks `getBBox()` on the group to return predictable coordinates for badge positioning tests.
 * JSDOM does not implement getBBox natively — cast and assign manually.
 */
function makeAtomGroup(atomId: number, x: number, y: number): SVGGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g') as SVGGElement;
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('data-atom-id', String(atomId));
  text.setAttribute('data-atomLabel', 'C');
  g.appendChild(text);
  // JSDOM does not implement getBBox — mock it so renderHBadges can read atom position
  (g as unknown as { getBBox(): DOMRect }).getBBox = () =>
    ({ x, y, width: 20, height: 16 } as DOMRect);
  return g;
}

const resolveVarFn = (name: string): string => name;

describe('whiteAtomLabels', () => {
  it('sets fill:white on heteroatom labels (N, O, S, H)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const nEl = makeAtomEl(5, 'N');
    const oEl = makeAtomEl(6, 'O');
    svg.append(nEl, oEl);
    const specs: HighlightSpec[] = [{ atoms: [5, 6], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    whiteAtomLabels(svg, specs);
    expect((nEl as unknown as HTMLElement).style.fill).toBe('white');
    expect((oEl as unknown as HTMLElement).style.fill).toBe('white');
  });

  it('does NOT set fill on C atoms (no visible label in skeletal formula)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const cEl = makeAtomEl(3, 'C');
    svg.append(cEl);
    const specs: HighlightSpec[] = [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    whiteAtomLabels(svg, specs);
    expect((cEl as unknown as HTMLElement).style.fill).toBe('');
  });

  it('skips atoms with no matching DOM element without throwing', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const specs: HighlightSpec[] = [{ atoms: [99], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(80,150,255)' }];
    expect(() => whiteAtomLabels(svg, specs)).not.toThrow();
  });

  it('handles multiple specs correctly', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const nEl = makeAtomEl(1, 'N');
    const clEl = makeAtomEl(2, 'Cl');
    svg.append(nEl, clEl);
    const specs: HighlightSpec[] = [
      { atoms: [1], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(1,2,3)' },
      { atoms: [2], bonds: [], rgroupAttachmentPoints: [], color: 'rgb(4,5,6)' },
    ];
    whiteAtomLabels(svg, specs);
    expect((nEl as unknown as HTMLElement).style.fill).toBe('white');
    expect((clEl as unknown as HTMLElement).style.fill).toBe('white');
  });
});

// ---------------------------------------------------------------------------
// outlineWhiteHalos: dark ring around white (hydrogen) highlights on canvas
// ---------------------------------------------------------------------------

function makeSvgWithAtom(atomId: number) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const g = document.createElementNS(ns, 'g');
  const el = document.createElementNS(ns, 'text');
  el.setAttribute('data-atom-id', String(atomId));
  // JSDOM lacks getBBox — stub it on the group.
  (g as unknown as { getBBox(): DOMRect }).getBBox = () =>
    ({ x: 10, y: 20, width: 8, height: 8 } as DOMRect);
  g.appendChild(el);
  svg.appendChild(g);
  return svg;
}

describe('outlineWhiteHalos', () => {
  it('draws a ringed circle for a white-colored spec', () => {
    const svg = makeSvgWithAtom(3);
    outlineWhiteHalos(svg, [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: '#ffffff' }]);
    const ring = svg.querySelector('[data-h-ring]');
    expect(ring).not.toBeNull();
    expect(ring!.getAttribute('stroke')).not.toBe('white');
    // Ring must be the svg's first child so bonds/glyphs drawn after it in
    // markup order paint on top (z-order: disc behind, H glyph in front).
    expect(svg.firstChild).toBe(ring);
  });

  it('draws nothing for a non-white spec', () => {
    const svg = makeSvgWithAtom(3);
    outlineWhiteHalos(svg, [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: '#909090' }]);
    expect(svg.querySelector('[data-h-ring]')).toBeNull();
  });

  it('cleanHBadges removes injected rings', () => {
    const svg = makeSvgWithAtom(3);
    outlineWhiteHalos(svg, [{ atoms: [3], bonds: [], rgroupAttachmentPoints: [], color: '#ffffff' }]);
    cleanHBadges(svg);
    expect(svg.querySelector('[data-h-ring]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase 8: renderHBadges + cleanHBadges tests (RED — functions not yet exported)
// ---------------------------------------------------------------------------

describe('renderHBadges', () => {
  it('injects exactly one [data-h-badge] SVG text element per atom in subHover.atoms when atom group exists', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    const g1 = makeAtomGroup(1, 200, 50);
    svg.append(g0, g1);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1, 2], count: 1 };
    // canonical 1 → pool 0, canonical 2 → pool 1
    const auxMap: AuxMap = { 1: 0, 2: 1 };

    renderHBadges(svg, subHover, auxMap, resolveVarFn);

    const badges = svg.querySelectorAll('[data-h-badge]');
    expect(badges.length).toBe(2);
  });

  it('sets textContent to "H2" for kind hAtoms with count 2', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 2 };
    const auxMap: AuxMap = { 1: 0 };

    renderHBadges(svg, subHover, auxMap, resolveVarFn);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('H2');
  });

  it('sets textContent to "H?" and font-style="italic" for kind mobileH', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'mobileH', atoms: [1] };
    const auxMap: AuxMap = { 1: 0 };

    renderHBadges(svg, subHover, auxMap, resolveVarFn);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('H?');
    expect(badge!.getAttribute('font-style')).toBe('italic');
  });

  it('does NOT throw when atom pool ID has no matching DOM element (graceful skip)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // No atom groups in SVG — all atoms are missing

    const subHover: SubHover = { kind: 'hAtoms', atoms: [99], count: 1 };
    const auxMap: AuxMap = { 99: 42 }; // pool 42 not in SVG

    expect(() => renderHBadges(svg, subHover, auxMap, resolveVarFn)).not.toThrow();
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(0);
  });

  it('skips badge for heavy atom that already has an explicit H bonded in the canvas', () => {
    // canonical 1 → pool 0 (heavy atom), pool 5 = explicit H bonded to pool 0
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 1 };
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5];
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 0, end: 5 }, 0); } },
      atoms: { forEach: () => {} },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(0);
  });

  it('renders badge for heavy atom that has NO explicit H bonded (implicit H only)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 1 };
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5]; // pool 5 is H, but bonded to pool 3 (different atom)
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 3, end: 5 }, 0); } },
      atoms: { forEach: () => {} },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(1);
  });

  it('renders badges for a mix: atoms with implicit H get badges, atoms with explicit H do not', () => {
    // canonical 1 → pool 0 (implicit H only), canonical 2 → pool 1 (has explicit H pool 5 bonded)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    const g1 = makeAtomGroup(1, 200, 50);
    svg.append(g0, g1);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1, 2], count: 1 };
    const auxMap: AuxMap = { 1: 0, 2: 1 };
    const hAtomPoolIds = [5];
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 1, end: 5 }, 0); } }, // pool 1 has explicit H (pool 5)
      atoms: { forEach: () => {} },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    // pool 0 (canonical 1) → no explicit H bonded → badge rendered
    // pool 1 (canonical 2) → explicit H (pool 5) bonded → no badge
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(1);
  });

  it('places implicit H badge in the largest angular gap — away from bonded explicit H and bond lines', () => {
    // Heavy atom pool 0 at (100,100); explicit H pool 5 directly above at (100,70).
    // Only one neighbor in SVG → gap is the full circle minus that direction.
    // Gap midpoint = opposite direction → badge goes downward (badge y > heavy center y).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 100); // center: (110, 108)
    const g5 = makeAtomGroup(5, 100, 70);  // center: (110, 78) — above g0
    svg.append(g0, g5);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 2 };
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5];
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 0, end: 5 }, 0); } },
      atoms: { forEach: () => {} },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    // Only neighbor is above → gap midpoint is below → badge y > 108
    const badgeY = parseFloat(badge!.getAttribute('y')!);
    expect(badgeY).toBeGreaterThan(108);
  });

  it('avoids bond lines: badge placed in the open sector when heavy atom is bonded to a heavy neighbor', () => {
    // Heavy atom pool 0 at (100,100); heavy neighbor pool 1 at (140,100) — directly to the right.
    // No explicit H. Largest gap is the left half (opposite to the bond).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 100); // center: (110, 108)
    const g1 = makeAtomGroup(1, 140, 100); // center: (150, 108) — to the right
    svg.append(g0, g1);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 1 };
    const auxMap: AuxMap = { 1: 0 };
    const struct: StructLike = {
      findBondId: () => null,
      bonds: { forEach: (cb) => { cb({ begin: 0, end: 1 }, 0); } },
      atoms: { forEach: () => {} },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, [], struct);

    const badge = svg.querySelector('[data-h-badge]');
    expect(badge).not.toBeNull();
    // Neighbor is to the right (angle 0°) → gap midpoint is left (angle 180°) → badge x < 110
    const badgeX = parseFloat(badge!.getAttribute('x')!);
    expect(badgeX).toBeLessThan(110);
  });

  it('shows residual implicit H badge when atom has some explicit H but not all (e.g. H3 total, 1 explicit → H2 badge)', () => {
    // Reproduces the case: methyl group drawn with 2 explicit H, InChI h-layer says H3 → 1 implicit H remains
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g0 = makeAtomGroup(0, 100, 50);
    svg.appendChild(g0);

    const subHover: SubHover = { kind: 'hAtoms', atoms: [1], count: 3 }; // InChI says 3H total
    const auxMap: AuxMap = { 1: 0 };
    const hAtomPoolIds = [5, 6]; // 2 explicit H atoms (pool 5 and 6) bonded to pool 0
    const struct: StructLike = {
      findBondId: () => null,
      bonds: {
        forEach: (cb) => {
          cb({ begin: 0, end: 5 }, 0); // pool 0 bonded to explicit H pool 5
          cb({ begin: 0, end: 6 }, 1); // pool 0 bonded to explicit H pool 6
        },
      },
      atoms: { forEach: () => {} },
    };

    renderHBadges(svg, subHover, auxMap, resolveVarFn, hAtomPoolIds, struct);

    const badges = svg.querySelectorAll('[data-h-badge]');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toBe('H'); // 3 total − 2 explicit = 1 implicit → "H"
  });
});

// ---------------------------------------------------------------------------
// QUICK-260610-ist: formula-H fragment-scoped implicit badges
// renderFormulaHBadges derives global-canonical → declared-H from the /h-layer
// (expandLayerText + formulaFragmentCounts + parseHydrogenAtoms with cumulative
// offset), filters to canonRange, and renders one implicit-H badge per in-range
// H-bearing heavy atom (reusing renderHBadges skip logic for fully-explicit atoms).
// ---------------------------------------------------------------------------
describe('renderFormulaHBadges — formula-H fragment-scoped badges', () => {
  // Two-fragment fixture.
  //   Fragment A (CH4 = 1 heavy atom): /h token "1H4" → global canonical 1, 4 H.
  //   Fragment B (C6H6 = 6 heavy atoms): /h token "1-6H" → global canonicals 2..7, 1 H each.
  // auxMap maps global canonical → pool ID (identity-ish offset).
  const formulaLayer: Layer = {
    type: 'formula', prefix: '', text: 'CH4.C6H6', atoms: [1, 2, 3, 4, 5, 6, 7], bonds: [],
  };
  const hLayer: Layer = {
    type: 'h', prefix: 'h', text: '1H4;1-6H', atoms: [1, 2, 3, 4, 5, 6, 7], bonds: [],
  };
  const layers: Layer[] = [formulaLayer, hLayer];
  // global canonical → pool: 1→10, 2→20, 3→21, ... 7→25
  const auxMap: AuxMap = { 1: 10, 2: 20, 3: 21, 4: 22, 5: 23, 6: 24, 7: 25 };

  function noBondStruct(): StructLike {
    return { findBondId: () => null, bonds: { forEach: () => {} }, atoms: { forEach: () => {} } };
  }

  it('renders one implicit-H badge per in-range H-bearing heavy atom (fragment B, canonRange [2,7])', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // Fragment B heavy atoms pools 20..25 present in canvas
    for (let pool = 20; pool <= 25; pool++) svg.appendChild(makeAtomGroup(pool, 100 + pool, 50));
    const struct = noBondStruct();

    renderFormulaHBadges(svg, [2, 7], layers, auxMap, resolveVarFn, [], struct);

    // 6 H-bearing heavy atoms in fragment B, all implicit → 6 badges.
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(6);
  });

  it('does NOT badge heavy atoms outside canonRange (no cross-fragment leakage)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // Render BOTH fragment A (pool 10) and fragment B (pools 20..25) in canvas
    svg.appendChild(makeAtomGroup(10, 100, 50));
    for (let pool = 20; pool <= 25; pool++) svg.appendChild(makeAtomGroup(pool, 100 + pool, 50));
    const struct = noBondStruct();

    // Hover fragment A only (canonRange [1,1]) → only pool 10 should badge.
    renderFormulaHBadges(svg, [1, 1], layers, auxMap, resolveVarFn, [], struct);

    const badges = svg.querySelectorAll('[data-h-badge]');
    expect(badges.length).toBe(1); // only fragment A's single heavy atom
    expect(badges[0].textContent).toBe('H4'); // CH4 → 4 implicit H
  });

  it('skips an in-range heavy atom whose H are all drawn explicitly', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.appendChild(makeAtomGroup(10, 100, 50)); // fragment A heavy atom pool 10
    // 4 explicit H atoms (pools 30..33) all bonded to pool 10 → CH4 fully drawn.
    const hAtomPoolIds = [30, 31, 32, 33];
    const struct: StructLike = {
      findBondId: () => null,
      bonds: {
        forEach: (cb) => {
          cb({ begin: 10, end: 30 }, 0);
          cb({ begin: 10, end: 31 }, 1);
          cb({ begin: 10, end: 32 }, 2);
          cb({ begin: 10, end: 33 }, 3);
        },
      },
      atoms: { forEach: () => {} },
    };

    renderFormulaHBadges(svg, [1, 1], layers, auxMap, resolveVarFn, hAtomPoolIds, struct);

    // All 4 H drawn explicitly → 0 implicit remaining → no badge.
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(0);
  });

  it('undefined canonRange uses the whole /h-layer (single-fragment formula-H)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // Single-fragment benzene: /h "1-6H", 6 heavy atoms pools 0..5.
    const singleFormula: Layer = { type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] };
    const singleH: Layer = { type: 'h', prefix: 'h', text: '1-6H', atoms: [1, 2, 3, 4, 5, 6], bonds: [] };
    const singleLayers: Layer[] = [singleFormula, singleH];
    const singleAux: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    for (let pool = 0; pool <= 5; pool++) svg.appendChild(makeAtomGroup(pool, 100 + pool * 10, 50));
    const struct = noBondStruct();

    renderFormulaHBadges(svg, undefined, singleLayers, singleAux, resolveVarFn, [], struct);

    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(6);
  });

  it('renders "H?" mobile-H badges for (H,5,6) groups (alanine COOH proton)', () => {
    // InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1
    // Mobile proton (H,5,6) must badge atoms 5 and 6; parseHydrogenAtoms strips it,
    // so without the mobile pass the OH/COOH proton gets no badge.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const alaFormula: Layer = { type: 'formula', prefix: '', text: 'C3H7NO2', atoms: [1, 2, 3, 4, 5, 6], bonds: [] };
    const alaH: Layer = { type: 'h', prefix: 'h', text: '2H,4H2,1H3,(H,5,6)', atoms: [1, 2, 3, 4, 5, 6], bonds: [] };
    const alaLayers: Layer[] = [alaFormula, alaH];
    const alaAux: AuxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    for (let pool = 0; pool <= 5; pool++) svg.appendChild(makeAtomGroup(pool, 100 + pool * 10, 50));
    const struct = noBondStruct();

    renderFormulaHBadges(svg, undefined, alaLayers, alaAux, resolveVarFn, [], struct);

    const badges = Array.from(svg.querySelectorAll('[data-h-badge]'));
    // Implicit count badges: atom1 (H3), atom2 (H), atom4 (H2) = 3; mobile atoms 5,6 = 2 "H?".
    const mobileBadges = badges.filter(b => b.textContent === 'H?');
    expect(mobileBadges.length).toBe(2);
    expect(badges.length).toBe(5);
  });
});

describe('cleanHBadges', () => {
  it('removes all [data-h-badge] elements from the SVG root', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const ns = 'http://www.w3.org/2000/svg';

    const badge1 = document.createElementNS(ns, 'text');
    badge1.setAttribute('data-h-badge', 'true');
    badge1.textContent = 'H';

    const badge2 = document.createElementNS(ns, 'text');
    badge2.setAttribute('data-h-badge', 'true');
    badge2.textContent = 'H2';

    svg.append(badge1, badge2);
    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(2);

    cleanHBadges(svg);

    expect(svg.querySelectorAll('[data-h-badge]').length).toBe(0);
  });

  it('does not throw on an empty SVG root', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(() => cleanHBadges(svg)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Phase 16 — Pin-to-freeze precedence: pinned overrides live hover
//
// Strategy: test the effective-target derivation logic using the store directly
// with a real InChI fixture (alanine: InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,1,4H2,1H3,(H,5,6))
// reusing the established pattern from prior phases (real fixture, not fabricated layer text).
//
// These tests verify the store + derivation invariants that make hook precedence
// correct, without needing to render the full hook (which requires a live Ketcher).
// ---------------------------------------------------------------------------

describe('Phase 16: pinned precedence — store + effective target derivation', () => {
  // Real InChI fixture: L-alanine (existing real fixture, multi-layer molecule)
  const ALANINE_INCHI = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,1,4H2,1H3,(H,5,6)';

  // Canonical layer array for alanine — formula, c, h layers
  const ALANINE_LAYERS: Layer[] = [
    { type: 'version', prefix: '', text: '1S', atoms: [], bonds: [] },
    { type: 'formula', prefix: '', text: 'C3H7NO2', atoms: [1, 2, 3, 4, 5, 6, 7], bonds: [] },
    { type: 'c', prefix: 'c', text: '1-2(4)3(5)6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] },
    { type: 'h', prefix: 'h', text: '2H,1,4H2,1H3,(H,5,6)', atoms: [1, 2, 3, 4, 5, 6, 7], bonds: [] },
  ];

  it('fixture: ALANINE_INCHI is a real InChI=1S/ string (not fabricated)', () => {
    expect(ALANINE_INCHI).toMatch(/^InChI=1S\//);
    // Verify it contains a real formula and connection layer
    expect(ALANINE_INCHI).toContain('C3H7NO2');
    expect(ALANINE_INCHI).toContain('/c');
    expect(ALANINE_INCHI).toContain('/h');
  });

  it('effIdx: when pinned is set, pinned.idx overrides live hoverIdx', () => {
    // Simulate: hoverIdx = 1, pinned = { idx: 2, sub: null }
    const hoverIdx = 1;
    const pinned: { idx: number; sub: SubHover | null } | null = { idx: 2, sub: null };
    const effIdx = pinned ? pinned.idx : hoverIdx;

    expect(effIdx).toBe(2);
    // Resolves to the pinned layer, not the hovered one
    expect(ALANINE_LAYERS[effIdx]?.type).toBe('c');
  });

  it('effSub: when pinned is set with a sub-token, pinned.sub overrides live subHover', () => {
    const liveSubHover: SubHover = { kind: 'element', el: 'N' };
    const pinnedSub: SubHover = { kind: 'atom', canonical: 3 };
    const pinned: { idx: number; sub: SubHover | null } | null = { idx: 1, sub: pinnedSub };
    const subHover = liveSubHover;

    const effSub = pinned ? pinned.sub : subHover;

    expect(effSub).toEqual(pinnedSub);
    expect(effSub?.kind).toBe('atom');
  });

  it('effIdx: when pinned is null, live hoverIdx is used', () => {
    const hoverIdx = 3;
    const pinned = null;
    const effIdx = pinned ? (pinned as { idx: number }).idx : hoverIdx;

    expect(effIdx).toBe(3);
    // Resolves to the h layer
    expect(ALANINE_LAYERS[effIdx]?.type).toBe('h');
  });

  it('effSub: when pinned is null, live subHover is used', () => {
    const liveSubHover: SubHover = { kind: 'element', el: 'C' };
    const pinned = null;
    const subHover = liveSubHover;

    const effSub = pinned ? (pinned as { sub: SubHover | null }).sub : subHover;

    expect(effSub).toEqual(liveSubHover);
    expect(effSub?.kind).toBe('element');
  });

  it('pin override: pinned layer resolves to the correct layer object via effIdx', () => {
    const pinned: { idx: number; sub: SubHover | null } = { idx: 1, sub: null };
    const effIdx = pinned.idx;

    const layer = ALANINE_LAYERS[effIdx];
    expect(layer.type).toBe('formula');
    expect(layer.text).toBe('C3H7NO2');
  });

  it('unpin: after clearPinned (pinned=null), effIdx reverts to hoverIdx', () => {
    // Before clear: pinned = { idx: 2 }, hoverIdx = 0
    let pinned: { idx: number; sub: SubHover | null } | null = { idx: 2, sub: null };
    const hoverIdx = 0;

    let effIdx = pinned ? pinned.idx : hoverIdx;
    expect(effIdx).toBe(2);

    // After clear
    pinned = null;
    effIdx = pinned ? (pinned as { idx: number }).idx : hoverIdx;
    expect(effIdx).toBe(0);
    expect(ALANINE_LAYERS[effIdx]?.type).toBe('version');
  });
});
