// InchiSection.test.tsx — PLSH-01 empty state acceptance tests
// Wave 0 RED state: 'renders the inchi-display box' and 'shows placeholder text'
// FAIL against the current InchiSection which returns null when layers is empty.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InchiSection } from '../components/InchiSection';
import type { Layer } from '../lib/parseInchi';

// Mutable state controlled per-test
let mockLayers: Layer[] = [];
let mockHoverIdx: number | null = null;
let mockInchi = '';

const mockSetHover = vi.fn();
const mockSetSubHover = vi.fn();

// Mock the store module — selector pattern matching InchiSection's usage
vi.mock('../store', () => {
  const storeState = () => ({
    layers: mockLayers,
    hoverIdx: mockHoverIdx,
    pinned: null as null | { idx: number; sub: null },
    setHover: mockSetHover,
    setSubHover: mockSetSubHover,
    setPinned: vi.fn(),
    clearPinned: vi.fn(),
    inchi: mockInchi,
    auxMap: {},
    atomElements: {},
    setInchiData: vi.fn(),
    setKeyHoverKind: vi.fn(),
  });

  const useInchiStore = vi.fn((selector: (s: ReturnType<typeof storeState>) => unknown) =>
    selector(storeState())
  ) as ReturnType<typeof vi.fn> & { getState: () => ReturnType<typeof storeState> };

  useInchiStore.getState = () => storeState();

  return { useInchiStore };
});

beforeEach(() => {
  mockLayers = [];
  mockHoverIdx = null;
  mockInchi = '';
  vi.clearAllMocks();
});

describe('InchiSection — PLSH-01 empty state', () => {
  it('renders the inchi-display box even when layers is empty', () => {
    // Mock: layers = [], hoverIdx = null (set in beforeEach)
    const { container } = render(<InchiSection />);
    // After PLSH-01 fix, must render a container with data-empty="true"
    // RED signal: current code returns null so this assertion fails
    expect(container.querySelector('[data-empty="true"]')).toBeInTheDocument();
  });

  it('shows the exact placeholder text when layers is empty', () => {
    // Mock: layers = [], hoverIdx = null
    render(<InchiSection />);
    // RED signal: current code returns null so this assertion fails
    expect(screen.getByText('Draw a molecule above to see its InChI.')).toBeInTheDocument();
  });

  it('does NOT render InChI= prefix when layers is empty', () => {
    // Mock: layers = [], hoverIdx = null
    render(<InchiSection />);
    // This test passes in RED state (returns null → no InChI= prefix rendered).
    // Must continue to pass after the PLSH-01 fix.
    expect(screen.queryByText(/InChI=/)).not.toBeInTheDocument();
  });

  it('renders InChI= prefix and layers when layers is non-empty', () => {
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] }];
    render(<InchiSection />);
    // Regression test: current code renders the prefix when layers exist
    expect(screen.getByText(/InChI=/)).toBeInTheDocument();
  });

  it('does not apply data-empty="true" when layers is non-empty', () => {
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [], bonds: [] }];
    const { container } = render(<InchiSection />);
    expect(container.querySelector('[data-empty="true"]')).not.toBeInTheDocument();
  });
});

describe('PLSH-04: copy button', () => {
  // Mock navigator.clipboard before all tests in this describe block
  // jsdom defines clipboard as a getter-only property, so Object.assign won't work.
  // Use Object.defineProperty to override it. (Pitfall 4 — see RESEARCH.md)
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('Test C: copy button is present when layers is non-empty and inchi is set', () => {
    mockInchi = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H';
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] }];
    render(<InchiSection />);
    // Copy button should be present in the DOM
    const copyBtn = screen.queryByRole('button', { name: /copy/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it('Test D: copy button is NOT present (or hidden) when layers is empty', () => {
    mockInchi = '';
    mockLayers = [];
    render(<InchiSection />);
    // When canvas is empty, copy button should be absent or hidden
    const copyBtn = screen.queryByRole('button', { name: /copy/i });
    expect(copyBtn).not.toBeInTheDocument();
  });

  it('Test E: clicking copy button calls navigator.clipboard.writeText with verbatim inchi string', async () => {
    const inchiString = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H';
    mockInchi = inchiString;
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] }];
    render(<InchiSection />);
    const copyBtn = screen.getByRole('button', { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(inchiString);
  });

  it('Test F: "Copied!" text appears in DOM after clicking the copy button', async () => {
    mockInchi = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H';
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] }];
    render(<InchiSection />);
    const copyBtn = screen.getByRole('button', { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('Test G: "Copied!" text is gone after 3000ms', async () => {
    vi.useFakeTimers();
    mockInchi = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H';
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] }];
    render(<InchiSection />);
    const copyBtn = screen.getByRole('button', { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    // Still visible just before 3000ms
    await act(async () => {
      vi.advanceTimersByTime(2900);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    // Gone after passing 3000ms
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('Test H: "Copied!" still hides under React.StrictMode (mountedRef reset on remount)', async () => {
    // StrictMode double-invokes effects in dev (mount → cleanup → mount). If mountedRef
    // is only ever set false by the cleanup and never reset true on remount, the setTimeout
    // guard stays false and setCopied(false) never runs — "Copied!" would stick forever.
    vi.useFakeTimers();
    mockInchi = 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H';
    mockLayers = [{ type: 'formula', prefix: '', text: 'C6H6', atoms: [1, 2, 3, 4, 5, 6], bonds: [] }];
    render(
      <StrictMode>
        <InchiSection />
      </StrictMode>,
    );
    const copyBtn = screen.getByRole('button', { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
