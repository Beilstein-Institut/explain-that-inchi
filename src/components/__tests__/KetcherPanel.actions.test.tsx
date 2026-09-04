import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Editor needs WASM and a laid-out DOM; neither exists under jsdom.
vi.mock('ketcher-react', () => ({ Editor: () => <div /> }));

import { KetcherPanel } from '../KetcherPanel';

describe('KetcherPanel action row', () => {
  it('orders the buttons Reset / Limitations / Help / Send feedback', () => {
    render(
      <KetcherPanel
        isReady={false}
        onInit={vi.fn()}
        structServiceProvider={{} as never}
        selectedMolId={null}
        onMolSelect={vi.fn()}
        isLoading={false}
        onHelpClick={vi.fn()}
        onResetClick={vi.fn()}
        onLimitationsClick={vi.fn()}
        onFeedbackClick={vi.fn()}
      />,
    );
    const row = screen.getByRole('button', { name: 'Reset' }).parentElement!;
    // The AudienceToggle's radios share the row; only the action pills count.
    const names = Array.from(row.querySelectorAll('button:not([role="radio"])')).map(
      (b) => b.textContent,
    );
    expect(names).toEqual(['Reset', 'Limitations', 'Help', 'Send feedback']);
  });
});
