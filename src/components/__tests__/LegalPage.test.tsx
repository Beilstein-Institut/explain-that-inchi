import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalPage } from '../LegalPage';
import { LEGAL_DOCS } from '../../lib/legalRoutes';

const privacy = LEGAL_DOCS.find((d) => d.id === 'privacy')!;
const terms = LEGAL_DOCS.find((d) => d.id === 'terms')!;

describe('LegalPage', () => {
  it('renders the doc title as the page heading', () => {
    render(<LegalPage doc={privacy} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
    ).toBeInTheDocument();
  });

  it('renders section headings from the doc body (formatting preserved)', () => {
    render(<LegalPage doc={privacy} />);
    expect(
      screen.getByRole('heading', { level: 2, name: '§ 3 Cookies' }),
    ).toBeInTheDocument();
  });

  it('renders body text so it is readable', () => {
    render(<LegalPage doc={privacy} />);
    expect(
      screen.getByText(/We do not use Cookies or similar technical aids/),
    ).toBeInTheDocument();
  });

  it('preserves links within the body (e.g. the mailto contact)', () => {
    render(<LegalPage doc={privacy} />);
    const link = screen.getByRole('link', {
      name: 'datenschutz@beilstein-institut.de',
    });
    expect(link).toHaveAttribute('href', 'mailto:datenschutz@beilstein-institut.de');
  });

  it('renders the numbered list in the Terms doc', () => {
    render(<LegalPage doc={terms} />);
    expect(
      screen.getByText(/Everybody is free to use Explain that InChI/),
    ).toBeInTheDocument();
  });

  it('provides a back link to the main app', () => {
    render(<LegalPage doc={privacy} />);
    const back = screen.getByRole('link', { name: /back to explain that inchi/i });
    expect(back).toHaveAttribute('href', import.meta.env.BASE_URL);
  });
});
