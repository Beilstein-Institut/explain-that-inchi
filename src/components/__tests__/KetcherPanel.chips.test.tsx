// Does the preset list actually render, with its chips, without throwing?
//
// The layer chips were reported as breaking the app. The data assertions in
// presetLayerCoverage.test.ts prove the *assignments* are right but never
// render a single element — they would pass with the JSX completely broken.
// This mounts the real KetcherPanel (ketcher-react's Editor stubbed, since it
// needs WASM and a laid-out DOM neither of which exist under jsdom) so a throw
// in the mol-list markup fails here instead of in someone's browser.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MOLECULES } from '../../data/molecules';

// The editor is the one thing that cannot run here. Everything else — the
// section, the action buttons, the whole mol-list — is the real component.
vi.mock('ketcher-react', () => ({
  Editor: () => <div data-testid="ketcher-editor-stub" />,
}));

import { KetcherPanel } from '../KetcherPanel';

const renderPanel = () =>
  render(
    <KetcherPanel
      isReady
      onInit={() => {}}
      structServiceProvider={{} as never}
      selectedMolId={null}
      onMolSelect={() => {}}
      isLoading={false}
    />,
  );

describe('KetcherPanel preset list', () => {
  it('mounts without throwing', () => {
    expect(() => renderPanel()).not.toThrow();
  });

  it('renders every preset button', () => {
    renderPanel();
    for (const m of MOLECULES) {
      expect(screen.getByText(m.name)).toBeTruthy();
    }
  });

  it('renders exactly one chip per chipped preset, and none for the rest', () => {
    const { container } = renderPanel();
    const chips = container.querySelectorAll('.mol-layer');
    expect(chips.length).toBe(MOLECULES.filter(m => m.layer).length);
    expect(chips.length).toBe(11);
  });

  it('labels each chip with its layer key and tints it with the layer swatch', () => {
    const { container } = renderPanel();
    const labels = [...container.querySelectorAll('.mol-layer')].map(c => c.textContent);
    expect(labels.sort()).toEqual(
      ['1S', 'Hill', 'b', 'c', 'h', 'i', 'm', 'p', 'q', 's', 't'].sort(),
    );
    // A chip with no background is a chip that lost its layer identity.
    for (const chip of container.querySelectorAll('.mol-layer')) {
      expect((chip as HTMLElement).style.background).toContain('--c-');
      expect((chip as HTMLElement).style.color).toContain('--c-');
    }
  });

  it('keeps the chip inside the preset button, not floating beside it', () => {
    // The chip lives in .mol-meta next to the formula; if that nesting breaks,
    // the sidebar layout goes with it.
    const { container } = renderPanel();
    for (const chip of container.querySelectorAll('.mol-layer')) {
      expect(chip.parentElement?.className).toBe('mol-meta');
      expect(chip.closest('button.mol-item')).toBeTruthy();
    }
  });
});
