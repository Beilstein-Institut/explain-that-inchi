import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Root } from '../Root';

const MainApp = () => <div>MAIN APP</div>;

function setHash(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
  });
}

describe('Root hash router', () => {
  beforeEach(() => {
    window.location.hash = '';
  });
  afterEach(() => {
    window.location.hash = '';
  });

  it('renders the main app when there is no legal hash', () => {
    render(<Root><MainApp /></Root>);
    expect(screen.getByText('MAIN APP')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeNull();
  });

  it('renders the legal page (not the app) when the hash matches', () => {
    window.location.hash = '#privacy';
    render(<Root><MainApp /></Root>);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('MAIN APP')).toBeNull();
  });

  it('switches to the legal page when the hash changes at runtime', () => {
    render(<Root><MainApp /></Root>);
    expect(screen.getByText('MAIN APP')).toBeInTheDocument();

    setHash('#imprint');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Impressum' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('MAIN APP')).toBeNull();
  });

  it('returns to the main app when the hash is cleared', () => {
    window.location.hash = '#terms';
    render(<Root><MainApp /></Root>);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms & Conditions' })).toBeInTheDocument();

    setHash('');
    expect(screen.getByText('MAIN APP')).toBeInTheDocument();
  });
});
