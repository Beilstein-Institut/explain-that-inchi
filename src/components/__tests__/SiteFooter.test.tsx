import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteFooter } from '../SiteFooter';

describe('SiteFooter', () => {
  it('links Impressum to the in-app #imprint page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Impressum' })).toHaveAttribute(
      'href',
      '#imprint',
    );
  });

  it('links Privacy Policy to the in-app #privacy page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '#privacy',
    );
  });

  it('links Terms & Conditions to the in-app #terms page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute(
      'href',
      '#terms',
    );
  });

  it('keeps the Licenses link pointing at THIRD-PARTY-NOTICES', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Licenses' })).toHaveAttribute(
      'href',
      expect.stringContaining('THIRD-PARTY-NOTICES.md'),
    );
  });

  it('opens the legal pages in the same tab (no target=_blank)', () => {
    render(<SiteFooter />);
    for (const name of ['Impressum', 'Privacy Policy', 'Terms & Conditions']) {
      expect(screen.getByRole('link', { name })).not.toHaveAttribute('target');
    }
  });
});
