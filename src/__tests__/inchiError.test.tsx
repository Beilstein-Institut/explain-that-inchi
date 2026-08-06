// The strip used to claim "Draw a molecule above to see its InChI" whenever the
// generator failed — with the user's molecule sitting on the canvas. Empty and
// failed are different states and must read differently.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useInchiStore } from '../store';
import { InchiSection } from '../components/InchiSection';
import { InchiKeySection } from '../components/InchiKeySection';

beforeEach(() => {
  useInchiStore.getState().resetAll();
});

describe('store: inchiError', () => {
  it('starts null', () => {
    expect(useInchiStore.getState().inchiError).toBeNull();
  });

  it('setInchiFailure records the message and blanks the data fields', () => {
    useInchiStore.getState().setInchiData('InChI=1S/CH4/h1H4', [
      { type: 'version', prefix: '', text: '1S' },
      { type: 'formula', prefix: '/', text: 'CH4' },
    ] as never, {}, {}, [], 'VNWKTOKETHGBQD-UHFFFAOYSA-N');

    useInchiStore.getState().setInchiFailure('nope');

    const s = useInchiStore.getState();
    expect(s.inchiError).toBe('nope');
    expect(s.inchi).toBe('');
    expect(s.layers).toEqual([]);
    expect(s.inchiKey).toBe('');
  });

  it('setInchiData clears a previous failure', () => {
    useInchiStore.getState().setInchiFailure('nope');
    useInchiStore.getState().setInchiData('InChI=1S/CH4/h1H4', [
      { type: 'version', prefix: '', text: '1S' },
      { type: 'formula', prefix: '/', text: 'CH4' },
    ] as never, {}, {}, [], '');
    expect(useInchiStore.getState().inchiError).toBeNull();
  });

  it('setInchiFailure(null) is the plain empty state, not an error', () => {
    useInchiStore.getState().setInchiFailure('nope');
    useInchiStore.getState().setInchiFailure(null);
    expect(useInchiStore.getState().inchiError).toBeNull();
  });

  it('resetAll clears the failure', () => {
    useInchiStore.getState().setInchiFailure('nope');
    useInchiStore.getState().resetAll();
    expect(useInchiStore.getState().inchiError).toBeNull();
  });
});

describe('InchiSection empty vs failed', () => {
  it('invites a drawing when the canvas is genuinely empty', () => {
    render(<InchiSection />);
    expect(screen.getByText(/Draw a molecule above to see its InChI/)).toBeInTheDocument();
  });

  it('names the problem instead when generation failed', () => {
    useInchiStore.getState().setInchiFailure(
      'No InChI could be generated for this structure.',
    );
    render(<InchiSection />);
    expect(
      screen.getByText(/No InChI could be generated for this structure/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Draw a molecule above/)).not.toBeInTheDocument();
  });

  it('gives the failure an assertive role so it is announced', () => {
    useInchiStore.getState().setInchiFailure('No InChI could be generated for this structure.');
    render(<InchiSection />);
    expect(screen.getByRole('status')).toHaveTextContent(/No InChI could be generated/);
  });
});

describe('InchiKeySection empty vs failed', () => {
  it('invites a drawing when the canvas is genuinely empty', () => {
    render(<InchiKeySection />);
    expect(screen.getByText(/Draw a molecule above to see its InChIKey/)).toBeInTheDocument();
  });

  it('stays quiet about the key when the InChI itself failed', () => {
    useInchiStore.getState().setInchiFailure('No InChI could be generated for this structure.');
    render(<InchiKeySection />);
    // The key strip must not repeat the same error, and must not claim the canvas is empty.
    expect(screen.queryByText(/Draw a molecule above/)).not.toBeInTheDocument();
    expect(screen.getByText(/No InChIKey without an InChI/)).toBeInTheDocument();
  });
});
