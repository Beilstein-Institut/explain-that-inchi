// The editor-failure notice. Console-only was the old behaviour: on a WASM or
// shape failure the InChI box sat on its placeholder with no explanation, which
// reads to a user as "my molecule is wrong" rather than "the tool broke".
//
// Editor is stubbed for the same reason as in KetcherPanel.chips.test.tsx — it
// needs WASM and a laid-out DOM, neither of which exists under jsdom. The stub
// captures errorHandler so the routing can be exercised.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let lastErrorHandler: ((msg: unknown) => void) | undefined;

vi.mock('ketcher-react', () => ({
  Editor: (props: { errorHandler?: (msg: unknown) => void }) => {
    lastErrorHandler = props.errorHandler;
    return <div data-testid="ketcher-editor-stub" />;
  },
}));

import { KetcherPanel } from '../KetcherPanel';

const renderPanel = (over: Record<string, unknown> = {}) =>
  render(
    <KetcherPanel
      isReady
      onInit={() => {}}
      structServiceProvider={{} as never}
      selectedMolId={null}
      onMolSelect={() => {}}
      isLoading={false}
      {...over}
    />,
  );

describe('KetcherPanel editor-failure notice', () => {
  it('is absent when nothing has failed', () => {
    renderPanel();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the message as an alert so a screen reader announces it', () => {
    renderPanel({ editorError: 'The molecule editor could not start.' });
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('The molecule editor could not start.');
  });

  // The notice must sit with the canvas it describes, not above the section heading —
  // an alert that precedes the h2 separates the heading from its own section.
  it('renders after the section heading, not before it', () => {
    const { container } = renderPanel({ editorError: 'boom' });
    const heading = container.querySelector('#editor-heading')!;
    const alert = screen.getByRole('alert');
    expect(heading.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("routes Ketcher's own errorHandler to the notice instead of only the console", () => {
    const onEditorError = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPanel({ onEditorError });

    expect(lastErrorHandler).toBeTypeOf('function');
    lastErrorHandler!('Cannot parse molfile');

    expect(onEditorError).toHaveBeenCalledWith('Cannot parse molfile');
    expect(spy).toHaveBeenCalled(); // still logged, for the stack
    spy.mockRestore();
  });
});
