import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

describe('Header', () => {
  it('carries the Beilstein-Institut logo link', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Beilstein-Institut' })).toHaveAttribute(
      'href',
      'https://www.beilstein-institut.de/en/',
    );
  });

  it('carries the editor heading directly below the title', () => {
    render(<Header />);
    const h2 = screen.getByRole('heading', {
      level: 2,
      name: 'Draw a molecule to learn more about its InChI',
    });
    expect(h2).toHaveAttribute('id', 'editor-heading');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('no longer carries the InChI version meta', () => {
    render(<Header />);
    expect(screen.queryByText(/standard/i)).toBeNull();
  });
});
