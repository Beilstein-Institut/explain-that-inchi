import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { useInchiStore } from '../../store';

describe('Header audience toggle', () => {
  beforeEach(() => {
    useInchiStore.getState().setAudience('chemist');
  });

  it('renders a radiogroup with Chemist checked by default', () => {
    render(<Header />);
    const group = screen.getByRole('radiogroup', { name: 'Explanation style' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Chemist' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Plain language' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking Plain language switches the store and the URL', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Plain language' }));
    expect(useInchiStore.getState().audience).toBe('plain');
    expect(screen.getByRole('radio', { name: 'Plain language' })).toHaveAttribute('aria-checked', 'true');
    expect(window.location.search).toContain('mode=plain');
  });

  it('clicking Chemist removes the URL parameter', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Plain language' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Chemist' }));
    expect(useInchiStore.getState().audience).toBe('chemist');
    expect(window.location.search).not.toContain('mode=');
  });
});
