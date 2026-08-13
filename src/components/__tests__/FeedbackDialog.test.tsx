// FeedbackDialog.test.tsx — 9 behavioral test cases
// Tests the FeedbackDialog component in isolation (no store dependency).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FeedbackDialog } from '../FeedbackDialog';
import type { FeedbackContext, BuildFeedbackUrlResult } from '../../lib/buildFeedbackUrl';

// FeedbackDialog imports types only from buildFeedbackUrl, not runtime functions.
// No vi.mock needed for the module itself.

const defaultContextPreview: FeedbackContext = {
  inchi: 'InChI=1S/CH4/h1H4',
  smiles: 'C',
  presetName: 'Methane',
  userAgent: 'Mozilla/5.0',
  appVersion: 'v1.0.0 (abc1234)',
};

function makeDialogRef() {
  // Create a real createRef so React can assign the DOM element to .current.
  // After render, spy on the DOM element's native close() method.
  return createRef<HTMLDialogElement>();
}

function spyOnDialogClose(dialogRef: React.RefObject<HTMLDialogElement>) {
  // jsdom's HTMLDialogElement has close() as a native method.
  // After render, replace it with a spy so we can assert on calls.
  if (dialogRef.current) {
    vi.spyOn(dialogRef.current, 'close').mockImplementation(() => undefined);
  }
  return dialogRef;
}

function makeOnSubmit(result: BuildFeedbackUrlResult) {
  return vi.fn().mockResolvedValue(result);
}

beforeEach(() => {
  // Clipboard mock — jsdom doesn't implement it; override before each test.
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

describe('FeedbackDialog', () => {
  it('renders category radio list with all five options', () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({ url: 'https://github.com', truncated: false, fullBody: '' });
    render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={defaultContextPreview}
      />
    );
    // Use hidden: true because the <dialog> is not open in jsdom
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Explanation wrong/confusing')).toBeInTheDocument();
    expect(screen.getByText('Highlighting wrong')).toBeInTheDocument();
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('defaults selected category to General', () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({ url: 'https://github.com', truncated: false, fullBody: '' });
    const { container } = render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={defaultContextPreview}
      />
    );
    // Query directly since <dialog> not open in jsdom hides accessible roles
    const radios = container.querySelectorAll('input[type="radio"]');
    const generalRadio = Array.from(radios).find(
      (r) => (r as HTMLInputElement).value === 'General'
    ) as HTMLInputElement | undefined;
    expect(generalRadio).toBeDefined();
    expect(generalRadio?.checked).toBe(true);
  });

  it('renders textarea with correct placeholder', () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({ url: 'https://github.com', truncated: false, fullBody: '' });
    const { container } = render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={defaultContextPreview}
      />
    );
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea?.placeholder).toBe('What happened, or what would help?');
  });

  it('gives the message field a real label, not just a placeholder', () => {
    // The visible "Your message" text used to be a <p>, which looks like a label
    // and announces as nothing — the field read as an unlabelled edit box, and
    // the placeholder that hinted at its purpose disappears as soon as anyone
    // types. getByLabelText resolves through the accessibility tree, so it only
    // passes when the association is real.
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({ url: 'https://github.com', truncated: false, fullBody: '' });
    const { container } = render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={defaultContextPreview}
      />
    );
    const labelled = screen.getByLabelText('Your message');
    expect(labelled.tagName).toBe('TEXTAREA');
    expect(labelled).toBe(container.querySelector('textarea'));
  });

  it('always-visible context preview renders supplied context values', () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({ url: 'https://github.com', truncated: false, fullBody: '' });
    render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={{ inchi: 'InChI=1S/CH4/h1H4', smiles: 'C', presetName: 'Methane' }}
      />
    );
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('InChI=1S/CH4/h1H4');
    expect(pre?.textContent).toContain('C');
    expect(pre?.textContent).toContain('Methane');
  });

  it('context preview shows Phase 9 placeholders for empty context (D-15)', () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({ url: 'https://github.com', truncated: false, fullBody: '' });
    render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={{}}
      />
    );
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('(no structure loaded)');
    expect(pre?.textContent).toContain('(none)');
    expect(pre?.textContent).toContain('(custom molecule)');
  });

  it('non-truncated submit closes dialog and resets form (D-09)', async () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({
      url: 'https://github.com/Beilstein-Institut/explain-that-inchi/issues/new?title=...',
      truncated: false,
      fullBody: 'full body text',
    });
    const { container } = render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={defaultContextPreview}
      />
    );
    // Spy on the real DOM element's close method after render
    spyOnDialogClose(dialogRef);

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello' } });

    const submitBtn = screen.getByText('Open GitHub issue');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(dialogRef.current?.close).toHaveBeenCalled();
    expect(textarea.value).toBe('');

    // Category should be reset to General
    const radios = container.querySelectorAll('input[type="radio"]');
    const generalRadio = Array.from(radios).find(
      (r) => (r as HTMLInputElement).value === 'General'
    ) as HTMLInputElement | undefined;
    expect(generalRadio?.checked).toBe(true);
  });

  it('truncated submit keeps dialog open and shows truncation UI (D-10)', async () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({
      url: 'https://github.com/Beilstein-Institut/explain-that-inchi/issues/new?truncated',
      truncated: true,
      fullBody: 'full body text',
    });
    render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={defaultContextPreview}
      />
    );
    // Spy on the real DOM element's close method after render
    spyOnDialogClose(dialogRef);

    const submitBtn = screen.getByText('Open GitHub issue');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByText('Copy full issue body')).toBeInTheDocument();
    expect(dialogRef.current?.close).not.toHaveBeenCalled();
  });

  it('Copy full issue body calls clipboard with fullBody (D-11)', async () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({
      url: 'https://github.com/Beilstein-Institut/explain-that-inchi/issues/new?truncated',
      truncated: true,
      fullBody: 'full body text',
    });
    render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={defaultContextPreview}
      />
    );

    // First trigger a truncated submit to reveal the "Copy full issue body" button
    const submitBtn = screen.getByText('Open GitHub issue');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    const copyBtn = screen.getByText('Copy full issue body');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('full body text');
  });

  it('context preview renders supplied SMILES string (gap-10-UAT-T3)', () => {
    const dialogRef = makeDialogRef();
    const onSubmit = makeOnSubmit({ url: 'https://github.com', truncated: false, fullBody: '' });
    render(
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={onSubmit}
        contextPreview={{ smiles: 'CC(=O)O' }}
      />
    );
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('CC(=O)O');
    expect(pre?.textContent).not.toMatch(/SMILES:.*\(none\)/);
  });

  it('clipboard success shows transient copied message, hides after 3s', async () => {
    vi.useFakeTimers();
    try {
      const dialogRef = makeDialogRef();
      const onSubmit = makeOnSubmit({
        url: 'https://github.com/Beilstein-Institut/explain-that-inchi/issues/new?truncated',
        truncated: true,
        fullBody: 'full body text',
      });
      render(
        <FeedbackDialog
          dialogRef={dialogRef}
          onSubmit={onSubmit}
          contextPreview={defaultContextPreview}
        />
      );

      // Trigger truncated submit
      const submitBtn = screen.getByText('Open GitHub issue');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Click "Copy full issue body"
      const copyBtn = screen.getByText('Copy full issue body');
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(screen.getByText('Copied — now paste it into the issue.')).toBeInTheDocument();

      // Advance past 3000ms
      await act(async () => {
        vi.advanceTimersByTime(3100);
      });

      expect(screen.queryByText('Copied — now paste it into the issue.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
