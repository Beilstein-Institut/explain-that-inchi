import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Prose } from '../Prose';
import { GLOSSARY } from '../../lib/glossary';

const TEXT = 'An atom and a bond. Another atom.';

describe('Prose', () => {
  it('renders the full text and one button per first term occurrence', () => {
    const { container } = render(<Prose text={TEXT} />);
    expect(container.firstChild).toHaveTextContent(TEXT);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('click opens the definition, second click closes it', () => {
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });
    fireEvent.click(btn);
    expect(screen.getByRole('note')).toHaveTextContent(GLOSSARY['atom']);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(btn);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('only one definition open at a time', () => {
    render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.click(screen.getByRole('button', { name: 'bond' }));
    expect(screen.getAllByRole('note')).toHaveLength(1);
    expect(screen.getByRole('note')).toHaveTextContent(GLOSSARY['bond']);
  });

  it('Escape closes, and does not leak to the tour/pin handlers on window', () => {
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    render(<Prose text={TEXT} />);

    // Nothing open: Esc belongs to whoever else wants it.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(outer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('note')).toBeNull();
    expect(outer).toHaveBeenCalledTimes(1); // consumed by Prose

    window.removeEventListener('keydown', outer);
  });

  it('the definition heading prints the surface text, not the glossary key', () => {
    render(<Prose text="An E/Z label." />);
    fireEvent.click(screen.getByRole('button', { name: 'E/Z' }));
    expect(screen.getByRole('note').querySelector('b')).toHaveTextContent('E/Z');
  });

  it('click outside closes', () => {
    render(<div><Prose text={TEXT} /><span>outside</span></div>);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('text change closes an open definition', () => {
    const { rerender } = render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    rerender(<Prose text="A bond." />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
