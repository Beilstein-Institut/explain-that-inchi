import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
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

  // The footer is a sibling of the route switch, not part of either branch.
  // These are the assertions that would fail if it slipped back inside App:
  // the legal documents are only reachable from each other through it, and it
  // is the only Beilstein-Institut identification they now carry.
  describe('site footer', () => {
    it.each(['', '#imprint', '#privacy', '#terms'])(
      'renders the legal links at hash "%s"',
      (hash) => {
        window.location.hash = hash;
        render(<Root><MainApp /></Root>);
        // Scoped to the footer landmark: the legal documents link to each other
        // in their own body text, so an unscoped query is ambiguous there.
        const footer = within(screen.getByRole('contentinfo'));
        expect(footer.getByRole('link', { name: 'Impressum' })).toHaveAttribute(
          'href',
          '#imprint',
        );
        expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
          'href',
          '#privacy',
        );
        expect(footer.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute(
          'href',
          '#terms',
        );
      },
    );

    it.each(['', '#privacy'])('identifies the Beilstein-Institut at hash "%s"', (hash) => {
      window.location.hash = hash;
      render(<Root><MainApp /></Root>);
      const mark = within(screen.getByRole('contentinfo')).getByRole('link', {
        name: 'Beilstein-Institut',
      });
      expect(mark).toHaveAttribute('href', 'https://www.beilstein-institut.de/en/');
    });

    it('survives a route change without unmounting the links', () => {
      render(<Root><MainApp /></Root>);
      setHash('#terms');
      expect(
        within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Impressum' }),
      ).toBeInTheDocument();
    });
  });
});
