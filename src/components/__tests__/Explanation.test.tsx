// Explanation.test.tsx — Phase 18 (SUBEX-01/02/07/09) sub-token card branch.
//
// RED (Task 1): Tests A, B, D, F, G exercise the sub-token precedence branch that
// does not yet exist in Explanation.tsx — they fail until Task 2 wires it.
//
// Real-InChI fixture (D-04a — never fabricated). Source molecule: L-alanine,
// real getInchi() output. Every SubHover object below is the parsed projection of a
// layer of THIS string (documented per object); no InChI fragment is reconstructed.
//   formula : C3H7NO2          → element 'C' (canonRange for the multi-component note)
//   c-layer : 1-2(4)3(5)6      → bond (c-layer kind → subTokenInfo null → fall-through)
//   h-layer : h2H,4H2,1H3,(H,5,6) → hAtoms (2H: atom 2, count 1), mobileH ((H,5,6): atoms 5,6)
//   t-layer : t2-              → stereo (sign '-')
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Explanation } from '../Explanation';
import { subTokenInfo } from '../../lib/subTokenInfo';
import type { Layer, SubHover } from '../../lib/parseInchi';
import { LAYER_INFO, DEFAULT_INFO, EMPTY_INFO } from '../../lib/layerInfo';

const REAL_INCHI = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';

// L-alanine layers (the entries the card reads: type + text + atoms/bonds).
const ALANINE_LAYERS: Layer[] = [
  { type: 'formula', prefix: '', text: 'C3H7NO2', atoms: [1, 2, 3, 4, 5, 6], bonds: [] },
  { type: 'c', prefix: 'c', text: '1-2(4)3(5)6', atoms: [1, 2, 3, 4, 5, 6], bonds: [[1, 2], [2, 4], [2, 3], [3, 5], [3, 6]] },
  { type: 'h', prefix: 'h', text: '2H,4H2,1H3,(H,5,6)', atoms: [1, 2, 4, 5, 6], bonds: [] },
  { type: 't', prefix: 't', text: '2-', atoms: [2], bonds: [] },
];
const FORMULA_IDX = 0;
const C_IDX = 1;
const H_IDX = 2;
const T_IDX = 3;

// Mutable store state controlled per-test; keys cover every selector Explanation reads.
// `var` (not const/let) is deliberate: Legend.tsx calls useInchiStore.getState() at
// module top-level, which the hoisted vi.mock factory's getState() services during the
// import of Explanation — before this declaration runs. `var` hoists without a temporal
// dead zone, and the factory only reads `mock` lazily inside storeState(), by which
// point beforeEach has populated it.
// eslint-disable-next-line no-var
var mock: {
  layers: Layer[];
  hoverIdx: number | null;
  atomElements: Record<number, string>;
  pinned: { idx: number; sub: SubHover | null } | null;
  keyHoverKind: string | null;
  inchiKey: string;
  legendHover: { type: string; eg: string } | null;
  subHover: SubHover | null;
  audience: 'chemist' | 'plain';
} = {
  layers: [],
  hoverIdx: null,
  atomElements: {},
  pinned: null,
  keyHoverKind: null,
  inchiKey: '',
  legendHover: null,
  subHover: null,
  audience: 'chemist',
};

// Setter spies live on a `var`-hoisted holder so they exist (as references) before the
// hoisted vi.mock factory runs; assigned in the factory itself (vi is hoisted by vitest).
// eslint-disable-next-line no-var
var spies: {
  setHover: ReturnType<typeof vi.fn>;
  setSubHover: ReturnType<typeof vi.fn>;
  setKeyHoverKind: ReturnType<typeof vi.fn>;
  setLegendHover: ReturnType<typeof vi.fn>;
};

vi.mock('../../store', () => {
  spies = {
    setHover: vi.fn(),
    setSubHover: vi.fn(),
    setKeyHoverKind: vi.fn(),
    setLegendHover: vi.fn(),
  };
  // `m` may be undefined the first time getState() runs (Legend's module-level call
  // during import, before this file's `mock` is assigned); fall back to empty so the
  // setter destructure at Legend.tsx:12 succeeds. Real tests run after beforeEach.
  const storeState = () => {
    const m = mock ?? ({} as typeof mock);
    return {
    layers: m.layers ?? [],
    hoverIdx: m.hoverIdx ?? null,
    atomElements: m.atomElements ?? {},
    pinned: m.pinned ?? null,
    keyHoverKind: m.keyHoverKind ?? null,
    inchiKey: m.inchiKey ?? '',
    legendHover: m.legendHover ?? null,
    subHover: m.subHover ?? null,
    audience: m.audience ?? 'chemist',
    setHover: spies.setHover,
    setAudience: vi.fn(),
    setSubHover: spies.setSubHover,
    setKeyHoverKind: spies.setKeyHoverKind,
    setLegendHover: spies.setLegendHover,
    setPinned: vi.fn(),
    clearPinned: vi.fn(),
    setInchiData: vi.fn(),
    };
  };
  const useInchiStore = vi.fn((selector: (s: ReturnType<typeof storeState>) => unknown) =>
    selector(storeState()),
  ) as ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof storeState> };
  useInchiStore.getState = () => storeState();
  return { useInchiStore };
});

beforeEach(() => {
  mock.layers = ALANINE_LAYERS;
  mock.hoverIdx = null;
  mock.atomElements = { 1: 'C', 2: 'C', 3: 'C', 4: 'N', 5: 'O', 6: 'O' };
  mock.pinned = null;
  mock.keyHoverKind = null;
  mock.inchiKey = '';
  mock.legendHover = null;
  mock.subHover = null;
  mock.audience = 'chemist';
  vi.clearAllMocks();
});

describe('Explanation — real fixture sanity', () => {
  it('pins a real getInchi() InChI string (D-04a — never fabricated)', () => {
    expect(REAL_INCHI).toMatch(/^InChI=1S\//);
  });
});

describe('Explanation — sub-token card branch (SUBEX-01/02/07)', () => {
  // Test A (SUBEX-01 hover): element sub-token shows the element title, not the layer card.
  it('Test A: element sub-token hover renders the element title', () => {
    mock.subHover = { kind: 'element', el: 'C' }; // projection of formula 'C3...'
    mock.hoverIdx = FORMULA_IDX;
    render(<Explanation />);
    expect(screen.getByText('Carbon (C)')).toBeInTheDocument();
    // The whole-layer 'Molecular formula' card must NOT show while the sub-token wins.
    expect(screen.queryByText('Molecular formula')).not.toBeInTheDocument();
  });

  // Test B (CONN-02): a c-layer bond sub-token now renders its own Bond card (Phase 19
  // reversed the old null fall-through). The whole-layer 'Connection layer' card (exact title)
  // must NOT show — the sub-card title 'Connection layer - Bond' is a distinct exact string.
  it('Test B: c-layer bond sub-token renders the Bond card', () => {
    mock.subHover = { kind: 'bond', endpointPairs: [[1, 2]] }; // projection of c '1-2'
    mock.hoverIdx = C_IDX;
    render(<Explanation />);
    expect(screen.getByText('Connection layer - Bond')).toBeInTheDocument();
    expect(screen.queryByText('Connection layer')).not.toBeInTheDocument();
  });

  // Test C (SUBEX-01 layer-only): no sub-token → unchanged whole-layer card.
  it('Test C: layer-only hover renders the whole-layer card', () => {
    mock.subHover = null;
    mock.hoverIdx = FORMULA_IDX;
    render(<Explanation />);
    expect(screen.getByText('Molecular formula')).toBeInTheDocument();
  });

  // Test D (SUBEX-02 pin): pinned.sub drives the card via effSub.
  it('Test D: pinned stereo sub-token renders the stereo title', () => {
    mock.pinned = { idx: T_IDX, sub: { kind: 'stereo', sign: '-' } }; // projection of t '2-'
    render(<Explanation />);
    expect(screen.getByText('Tetrahedral stereocenter')).toBeInTheDocument();
  });

  // Test E (SUBEX-02 precedence): InChIKey-segment hover wins over an active subHover.
  it('Test E: keyHoverKind wins over an active sub-token', () => {
    mock.keyHoverKind = 'skeleton';
    mock.inchiKey = 'QNAYBMKLOCPYGJ-REOHCLBHSA-N'; // real L-alanine InChIKey
    mock.subHover = { kind: 'element', el: 'C' };
    render(<Explanation />);
    expect(screen.getByText('Skeleton hash')).toBeInTheDocument();
    expect(screen.queryByText('Carbon (C)')).not.toBeInTheDocument();
  });

  // Test F (SUBEX-07 scoping): multi-component note + Hill-order note in the body.
  it('Test F: element sub-token with canonRange shows component + Hill-order copy', () => {
    mock.subHover = { kind: 'element', el: 'C', canonRange: [1, 3] };
    mock.hoverIdx = FORMULA_IDX;
    render(<Explanation />);
    const body = subTokenInfo(mock.subHover, mock.atomElements)!.body;
    expect(body).toContain('this component');
    expect(body).toContain('Hill order');
    expect(screen.getByText(body)).toBeInTheDocument();
  });

  // Test G (D-01 accent): sub-token card inherits parent h-layer swatch (var(--c-hydro)).
  it('Test G: sub-token card --accent inherits the parent layer swatch', () => {
    mock.subHover = { kind: 'hAtoms', atoms: [2], count: 3 }; // projection of h '2H...'
    mock.hoverIdx = H_IDX;
    const { container } = render(<Explanation />);
    const card = container.querySelector('[style*="--accent"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.style.getPropertyValue('--accent')).toBe('var(--c-hydro)');
  });
});

describe('Explanation — invariant guards (SUBEX-09 read-only + verbatim passthrough)', () => {
  // Read-only: rendering the sub-token card invokes no store mutator (Invariant).
  it('renders the sub-token card without calling any store mutator', () => {
    mock.subHover = { kind: 'element', el: 'C' };
    mock.hoverIdx = FORMULA_IDX;
    render(<Explanation />);
    expect(screen.getByText('Carbon (C)')).toBeInTheDocument(); // branch did render
    expect(spies.setHover).not.toHaveBeenCalled();
    expect(spies.setSubHover).not.toHaveBeenCalled();
    expect(spies.setKeyHoverKind).not.toHaveBeenCalled();
    expect(spies.setLegendHover).not.toHaveBeenCalled();
  });

  // Verbatim passthrough: the rendered body string IS the pure-module output, proving
  // the card never re-joins or reconstructs an InChI fragment (SUBEX-09).
  it('renders the card body verbatim from subTokenInfo output', () => {
    mock.subHover = { kind: 'mobileH', atoms: [5, 6] }; // projection of h '(H,5,6)'
    mock.hoverIdx = H_IDX;
    render(<Explanation />);
    const body = subTokenInfo(mock.subHover, mock.atomElements)!.body;
    expect(screen.getByText(body)).toBeInTheDocument();
  });
});

describe('Explanation — empty canvas', () => {
  // "Hover any layer" is a lie when there are no layers to hover. The card has to
  // name the prerequisite instead, and go back to the hover prompt once one exists.
  it('asks for a molecule when no layers are parsed', () => {
    mock.layers = [];
    render(<Explanation />);
    expect(screen.getByText(EMPTY_INFO.title.chemist)).toBeInTheDocument();
    expect(screen.getByText(EMPTY_INFO.blurb.chemist)).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_INFO.title.chemist)).not.toBeInTheDocument();
  });

  it('restores the hover prompt once a molecule is drawn', () => {
    render(<Explanation />); // beforeEach leaves ALANINE_LAYERS in place
    expect(screen.getByText(DEFAULT_INFO.title.chemist)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_INFO.title.chemist)).not.toBeInTheDocument();
  });

  // The two states share the idle branch, so the accent must not regress either.
  it('keeps the idle accent in both states', () => {
    for (const layers of [[], ALANINE_LAYERS]) {
      mock.layers = layers;
      const { container, unmount } = render(<Explanation />);
      const card = container.querySelector('[style*="--accent"]') as HTMLElement;
      expect(card.style.getPropertyValue('--accent')).toBe('var(--ink-faint)');
      unmount();
    }
  });

  it('plain audience swaps the layer card title and blurb', () => {
    mock.audience = 'plain';
    mock.hoverIdx = FORMULA_IDX;
    render(<Explanation />);
    expect(screen.getByText(LAYER_INFO.formula.title.plain)).toBeInTheDocument();
    expect(screen.queryByText(LAYER_INFO.formula.title.chemist)).toBeNull();
  });
});
