import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteFooter } from '../SiteFooter';
import { LEAVE_NO_TRACE_KEY, isLeaveNoTrace } from '../../lib/leaveWipe';

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
});

// The beacon behaviour this flag drives is covered in leaveWipe.test.ts; here
// only the control and the value it writes.
describe('SiteFooter leave-no-trace toggle', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('offers the toggle, off by default', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('checkbox', { name: 'Leave no trace on exit' })).not.toBeChecked();
  });

  it('sets the session flag when checked', async () => {
    render(<SiteFooter />);
    const toggle = screen.getByRole('checkbox', { name: 'Leave no trace on exit' });

    await userEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(isLeaveNoTrace()).toBe(true);
    expect(sessionStorage.getItem(LEAVE_NO_TRACE_KEY)).not.toBeNull();
  });

  it('clears the session flag when unchecked again', async () => {
    render(<SiteFooter />);
    const toggle = screen.getByRole('checkbox', { name: 'Leave no trace on exit' });

    await userEvent.click(toggle);
    await userEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(isLeaveNoTrace()).toBe(false);
    expect(sessionStorage.getItem(LEAVE_NO_TRACE_KEY)).toBeNull();
  });

  it('starts checked when the flag is already set for this visit', () => {
    sessionStorage.setItem(LEAVE_NO_TRACE_KEY, '1');
    render(<SiteFooter />);
    expect(screen.getByRole('checkbox', { name: 'Leave no trace on exit' })).toBeChecked();
  });
});
