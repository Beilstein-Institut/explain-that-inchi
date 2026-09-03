import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudienceToggle } from '../AudienceToggle';
import { useInchiStore } from '../../store';

describe('AudienceToggle', () => {
  beforeEach(() => {
    useInchiStore.getState().setAudience('chemist');
  });

  it('renders a radiogroup with Expert checked by default', () => {
    render(<AudienceToggle />);
    expect(screen.getByRole('radiogroup', { name: 'Explanation style' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Expert' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Simple' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking Simple switches the store and the URL', () => {
    render(<AudienceToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Simple' }));
    expect(useInchiStore.getState().audience).toBe('plain');
    expect(screen.getByRole('radio', { name: 'Simple' })).toHaveAttribute('aria-checked', 'true');
    expect(window.location.search).toContain('mode=plain');
  });

  it('clicking Expert removes the URL parameter', () => {
    render(<AudienceToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Simple' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Expert' }));
    expect(useInchiStore.getState().audience).toBe('chemist');
    expect(window.location.search).not.toContain('mode=');
  });
});

// The editor is the one thing that cannot run under happy-dom (WASM + layout).
vi.mock('ketcher-react', () => ({
  Editor: () => <div data-testid="ketcher-editor-stub" />,
}));

// Placement is the point of this amendment, so it gets an assertion of its own:
// the toggle must be the first control on the section-label row, left of Help.
describe('AudienceToggle placement', () => {
  it('sits left of the Help button on the section-label row', async () => {
    const { KetcherPanel } = await import('../KetcherPanel');
    const { container } = render(
      <KetcherPanel
        isReady
        onInit={() => {}}
        structServiceProvider={{} as never}
        selectedMolId={null}
        onMolSelect={() => {}}
        isLoading={false}
        onHelpClick={() => {}}
      />,
    );
    const actions = container.querySelector('.section-label-actions')!;
    const children = Array.from(actions.children);
    const toggleIdx = children.findIndex(el => el.getAttribute('role') === 'radiogroup');
    const helpIdx = children.findIndex(el => el.textContent === 'Help');
    expect(toggleIdx).toBe(0);
    expect(helpIdx).toBeGreaterThan(toggleIdx);
  });
});
