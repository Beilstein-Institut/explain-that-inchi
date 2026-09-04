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

  it('carries the InChI version meta with the InChI Trust link', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/standard/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'International Chemical Identifier' }),
    ).toHaveAttribute('href', 'https://www.inchi-trust.org/');
  });

  it('no longer carries the Beilstein-Institut logo', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('link', { name: 'Beilstein-Institut' })).toBeNull();
  });

  it('does not link out to the licences notices', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('link', { name: 'Licenses' })).toBeNull();
  });

  it('opens the legal pages in the same tab (no target=_blank)', () => {
    render(<SiteFooter />);
    for (const name of ['Impressum', 'Privacy Policy', 'Terms & Conditions']) {
      expect(screen.getByRole('link', { name })).not.toHaveAttribute('target');
    }
  });

  // The wipe and the cache purge are unconditional (see leaveWipe.ts). No
  // control belongs here — a checkbox would imply the purge is optional.
  it('offers no controls, only links', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
