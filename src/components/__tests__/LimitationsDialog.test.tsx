// LimitationsDialog — static content dialog, no store and no input.
// Conventions follow FeedbackDialog.test.tsx (real createRef, spy on native close).
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LimitationsDialog } from '../LimitationsDialog';
import { LIMITATIONS } from '../../lib/limitationsContent';

function renderDialog() {
  const dialogRef = createRef<HTMLDialogElement>();
  render(<LimitationsDialog dialogRef={dialogRef} />);
  return dialogRef;
}

// jsdom never opens the <dialog>, so its contents stay out of the accessibility
// tree and role queries need hidden: true (same reason as FeedbackDialog.test).
const HIDDEN = { hidden: true } as const;

describe('LimitationsDialog', () => {
  it('is titled Limitations', () => {
    renderDialog();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Limitations', ...HIDDEN }),
    ).toBeInTheDocument();
  });

  it('renders every entry from limitationsContent', () => {
    renderDialog();
    for (const l of LIMITATIONS) {
      expect(screen.getByText(l.title)).toBeInTheDocument();
    }
  });

  it('names the responsible layer beside each entry', () => {
    // The point of the dialog is that these are not defects in this tool. If the
    // source tag stops rendering, the page reads as a list of our own bugs.
    renderDialog();
    for (const l of LIMITATIONS) {
      expect(screen.getAllByText(l.source).length).toBeGreaterThan(0);
    }
  });

  it('closes on Close', () => {
    const dialogRef = renderDialog();
    const close = vi.spyOn(dialogRef.current!, 'close').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Close', ...HIDDEN }));
    expect(close).toHaveBeenCalled();
  });

  it('offers no controls other than Close — it is read-only', () => {
    renderDialog();
    expect(screen.getAllByRole('button', HIDDEN).map(b => b.textContent)).toEqual(['Close']);
    expect(screen.queryByRole('textbox', HIDDEN)).toBeNull();
  });

  it('points at LIMITATIONS.md for the rest', () => {
    renderDialog();
    expect(screen.getByText('LIMITATIONS.md')).toBeInTheDocument();
  });

  it('links LIMITATIONS.md to the file in the repo, opened safely', () => {
    // A dead or wrong link here sends a reader hunting for a document that is
    // the whole point of the closing line. Pinned to the same org the feedback
    // link already uses — a fork's URL shipping in the app would be a bug.
    renderDialog();
    const link = screen.getByText('LIMITATIONS.md').closest('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe(
      'https://github.com/Beilstein-Institut/explain-that-inchi/blob/master/LIMITATIONS.md',
    );
    // target=_blank without noopener hands the opener to the new tab.
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
  });
});

describe('limitationsContent', () => {
  it('stays short enough to scan', () => {
    // The dialog is a scannable warning, not the full document — LIMITATIONS.md
    // is where the long list lives, and the closing line points at it. Five was
    // the original ceiling; the count is free to move under it, but a dialog
    // that grows past it has become the document it was meant to summarise.
    expect(LIMITATIONS.length).toBeGreaterThan(0);
    expect(LIMITATIONS.length).toBeLessThanOrEqual(5);
  });

  it('covers the layers users misattribute to this tool', () => {
    const sources = LIMITATIONS.map(l => l.source);
    expect(sources).toContain('InChI');
    expect(sources).toContain('RInChI');
    expect(sources).toContain('Ketcher');
  });

  it('gives every entry a title, a source and a body', () => {
    for (const l of LIMITATIONS) {
      expect(l.title).toBeTruthy();
      expect(l.source).toBeTruthy();
      expect(l.body.length).toBeGreaterThan(80);
    }
  });
});
