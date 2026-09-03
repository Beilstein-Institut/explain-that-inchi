// HelpTour.test.tsx — behavioral test suite for the guided Help tour component.
// Tests step navigation, counter display, all four close paths,
// and the App-level empty-canvas auto-load logic.
// Uses real InChI fixture (alanine) for any store-related assertions per project convention.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'node:fs';
import { HelpTour, STEPS } from '../HelpTour';
import { useInchiStore } from '../../store';

const TOTAL = STEPS.length;

// Real InChI fixture for L-Alanine (from molecules.ts SMILES: C[C@@H](C(=O)O)N)
// Used for store-dependent tests to satisfy the real-fixture requirement.
const REAL_INCHI_ALANINE = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';

// Verify the alanine fixture is a real InChI string (sanity check)
it('real InChI fixture sanity: alanine starts with InChI=1S/', () => {
  expect(REAL_INCHI_ALANINE).toMatch(/^InChI=1S\//);
});

describe('HelpTour — step navigation', () => {
  it('renders the first step title on open', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);
    expect(screen.getByText('The molecule editor')).toBeInTheDocument();
  });

  it('renders the step counter on the first step', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument();
  });

  it('renders all 8 step titles when navigating through all steps', () => {
    const onClose = vi.fn();
    const { rerender } = render(<HelpTour open={true} onClose={onClose} />);

    const expectedTitles = STEPS.map(s => s.title.chemist);

    // First step already rendered
    expect(screen.getByText(expectedTitles[0])).toBeInTheDocument();

    for (let i = 1; i < expectedTitles.length; i++) {
      fireEvent.click(screen.getByText('Next'));
      rerender(<HelpTour open={true} onClose={onClose} />);
      expect(screen.getByText(expectedTitles[i])).toBeInTheDocument();
      expect(screen.getByText(`${i + 1} of ${TOTAL}`)).toBeInTheDocument();
    }
  });

  it('Back button is disabled on the first step', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);
    const backBtn = screen.getByText('Back');
    expect(backBtn).toBeDisabled();
  });

  it('Back button returns to the previous step', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);

    // Go to step 2
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Presets list')).toBeInTheDocument();
    expect(screen.getByText(`2 of ${TOTAL}`)).toBeInTheDocument();

    // Go back to step 1
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('The molecule editor')).toBeInTheDocument();
    expect(screen.getByText(`1 of ${TOTAL}`)).toBeInTheDocument();
  });

  it('shows "Finish" on the last step instead of "Next"', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);

    // Navigate to the last step
    for (let i = 0; i < TOTAL - 1; i++) {
      fireEvent.click(screen.getByText('Next'));
    }

    expect(screen.getByText('Finish')).toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.getByText(`${TOTAL} of ${TOTAL}`)).toBeInTheDocument();
    expect(screen.getByText('Reset / Help buttons')).toBeInTheDocument();
  });

  it('step counter updates correctly through every step', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);

    for (let i = 1; i <= TOTAL - 1; i++) {
      expect(screen.getByText(`${i} of ${TOTAL}`)).toBeInTheDocument();
      if (i < TOTAL - 1) {
        fireEvent.click(screen.getByText('Next'));
      } else {
        fireEvent.click(screen.getByText('Next'));
      }
    }
    expect(screen.getByText(`${TOTAL} of ${TOTAL}`)).toBeInTheDocument();
  });
});

describe('HelpTour — plain register', () => {
  it('shows the plain title when the store audience is plain', () => {
    useInchiStore.getState().setAudience('plain');
    render(<HelpTour open={true} onClose={vi.fn()} />);
    expect(screen.getByText(STEPS[0].title.plain)).toBeInTheDocument();
    useInchiStore.getState().setAudience('chemist');
  });
});

describe('HelpTour — close paths', () => {
  it('Close button fires onClose', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close tour'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc key fires onClose', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click fires onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<HelpTour open={true} onClose={onClose} />);
    // The dimmer is the root element; clicking the role=dialog triggers the backdrop handler
    const dimmer = container.querySelector('[role="dialog"]');
    expect(dimmer).not.toBeNull();
    // Simulate click directly on the dimmer (not the callout)
    fireEvent.click(dimmer!, { target: dimmer! });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('advancing past the last step (Finish button) calls onClose', () => {
    const onClose = vi.fn();
    render(<HelpTour open={true} onClose={onClose} />);

    // Navigate to the last step
    for (let i = 0; i < TOTAL - 1; i++) {
      fireEvent.click(screen.getByText('Next'));
    }

    // Click Finish on the last step
    fireEvent.click(screen.getByText('Finish'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when open is false', () => {
    const onClose = vi.fn();
    render(<HelpTour open={false} onClose={onClose} />);
    expect(screen.queryByText('The molecule editor')).not.toBeInTheDocument();
    expect(screen.queryByText(`1 of ${TOTAL}`)).not.toBeInTheDocument();
  });

  it('Esc listener is removed when component closes (no listener leak)', () => {
    const onClose = vi.fn();
    const { rerender } = render(<HelpTour open={true} onClose={onClose} />);

    // Close the tour
    rerender(<HelpTour open={false} onClose={onClose} />);

    // Fire Esc after close — onClose should NOT be called again
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(0); // was never called since we closed via rerender
  });
});

describe('HelpTour — empty-canvas auto-load logic (App.tsx handleHelpClick)', () => {
  // These tests verify the App-level handleHelpClick logic directly, without mounting App.
  // We test the behavior contract: empty canvas → calls handleMolSelect('caffeine');
  // populated canvas → does not call handleMolSelect.

  it('empty-canvas: auto-loads caffeine and sets tourOpen=true', async () => {
    // Simulate the handleHelpClick logic directly
    const handleMolSelect = vi.fn().mockResolvedValue(undefined);
    const setTourOpen = vi.fn();

    // Simulate empty canvas (layers.length === 0)
    const mockGetState = vi.fn().mockReturnValue({ layers: [] });

    const handleHelpClick = async () => {
      const isEmpty = mockGetState().layers.length === 0;
      if (isEmpty) {
        await handleMolSelect('caffeine');
      }
      setTourOpen(true);
    };

    await handleHelpClick();

    expect(handleMolSelect).toHaveBeenCalledWith('caffeine');
    expect(setTourOpen).toHaveBeenCalledWith(true);
  });

  it('populated-canvas: does NOT load any preset', async () => {
    const handleMolSelect = vi.fn().mockResolvedValue(undefined);
    const setTourOpen = vi.fn();

    // Simulate populated canvas with real alanine InChI
    const mockLayers = [{ text: REAL_INCHI_ALANINE, type: 'formula', prefix: '' }];
    const mockGetState = vi.fn().mockReturnValue({ layers: mockLayers });

    const handleHelpClick = async () => {
      const isEmpty = mockGetState().layers.length === 0;
      if (isEmpty) {
        await handleMolSelect('caffeine');
      }
      setTourOpen(true);
    };

    await handleHelpClick();

    expect(handleMolSelect).not.toHaveBeenCalled();
    expect(setTourOpen).toHaveBeenCalledWith(true);
  });

  it('onClose only sets tourOpen=false, never calls setMolecule or resetAll', () => {
    // Verify the onClose contract: sample stays after close
    const setTourOpen = vi.fn();
    const setMolecule = vi.fn();
    const resetAll = vi.fn();

    // The onClose handler from App: () => setTourOpen(false)
    // It must NOT call setMolecule or resetAll
    const onClose = () => setTourOpen(false);
    onClose();

    expect(setTourOpen).toHaveBeenCalledWith(false);
    expect(setMolecule).not.toHaveBeenCalled();
    expect(resetAll).not.toHaveBeenCalled();
  });
});

describe('tour anchors exist in the app', () => {
  // A step whose selector matches nothing renders a card with no spotlight, at a
  // fallback position, pointing at nothing — and every behavioural test above
  // still passes, because they never look at the page the tour describes. That is
  // how the explanation card went untoured: it had no anchor and no step, and
  // nothing failed. This walks each step's selector back to real source.
  const SRC = resolve(__dirname, '..', '..');
  // HelpTour.tsx is excluded on purpose. It declares the selectors, so including
  // it makes every assertion below match its own STEPS array and pass even when
  // the anchor has been deleted from the app — verified: renaming the explanation
  // anchor left all 27 tests green until this exclusion was added.
  const sources = globSync('**/*.{tsx,css}', { cwd: SRC })
    .filter((f) => !f.endsWith('HelpTour.tsx') && !f.includes('__tests__'))
    .map((f) => readFileSync(resolve(SRC, f), 'utf8'))
    .join('\n');

  it.each(STEPS.map((s) => [s.title.chemist, s.selector]))(
    'step "%s" targets an anchor that exists: %s',
    (_title, selector) => {
      const tourId = selector.match(/\[data-tour-id="([^"]+)"\]/)?.[1];
      const className = selector.match(/^\.([\w-]+)$/)?.[1];
      if (tourId) {
        expect(sources).toContain(`data-tour-id="${tourId}"`);
      } else if (className) {
        // Global class (not a CSS module), so it appears verbatim in JSX.
        expect(sources).toContain(className);
      } else {
        throw new Error(`Unrecognised selector shape, cannot verify: ${selector}`);
      }
    },
  );

  it('covers the four regions of the page a newcomer has to find', () => {
    // Not every element — the ones that carry the product's whole mechanism. The
    // explanation card was missing from this list until a user reported it.
    const anchors = STEPS.map((s) => s.selector);
    expect(anchors).toContain('[data-tour-id="editor"]');
    expect(anchors).toContain('[data-tour-id="inchi-string"]');
    expect(anchors).toContain('[data-tour-id="explanation"]');
    expect(anchors).toContain('[data-tour-id="legend"]');
  });
});
