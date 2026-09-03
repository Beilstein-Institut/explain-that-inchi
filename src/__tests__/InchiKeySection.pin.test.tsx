// A key segment used to explain itself on hover only, so its card swapped away the
// moment the pointer left the strip — putting the glossary terms inside that card out
// of reach. Key segments now pin like InChI layers, and pinning still never creates a
// canvas highlight (Invariant #2).
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useInchiStore } from '../store';
import { InchiKeySection } from '../components/InchiKeySection';
import { usePinRelease } from '../hooks/usePinRelease';

// The release listener lives in a hook that App mounts via InchiSection, so a strip
// rendered alone never sees it — and the capture-phase ordering it introduces is
// exactly what broke releasing a pin by clicking its own segment. Every pin test
// below renders the strip WITH the hook.
function Strip() {
  usePinRelease();
  return <InchiKeySection />;
}

// Caffeine, real getInchi() output (Invariant #1 — never fabricated).
const CAFFEINE_KEY = 'RYYVLZVUVIJVGH-UHFFFAOYSA-N';
const SKELETON = 'RYYVLZVUVIJVGH';
const HASH = 'UHFFFAOY';

beforeEach(() => {
  useInchiStore.getState().resetAll();
  useInchiStore.setState({ inchiKey: CAFFEINE_KEY });
});

describe('InchiKeySection — pinning', () => {
  it('a click pins the segment and freezes its card', () => {
    render(<Strip />);

    fireEvent.click(screen.getByText(SKELETON));

    const s = useInchiStore.getState();
    expect(s.keyPinned).toBe('skeleton');
    expect(s.keyHoverKind).toBe('skeleton');
  });

  it('the pinned zone survives leaving the strip', () => {
    render(<Strip />);
    const seg = screen.getByText(SKELETON);

    fireEvent.click(seg);
    fireEvent.mouseLeave(seg.parentElement!);
    fireEvent.blur(seg);

    expect(useInchiStore.getState().keyHoverKind).toBe('skeleton');
  });

  it('clicking the pinned segment again releases it', () => {
    render(<Strip />);
    const seg = screen.getByText(HASH);

    fireEvent.click(seg);
    fireEvent.click(seg);

    expect(useInchiStore.getState().keyPinned).toBeNull();
  });

  it('clicking another segment moves the pin in one click', () => {
    render(<Strip />);

    fireEvent.click(screen.getByText(HASH));
    fireEvent.click(screen.getByText(SKELETON));

    expect(useInchiStore.getState().keyPinned).toBe('skeleton');
  });

  it('names each segment for a screen reader', () => {
    render(<Strip />);
    expect(screen.getByText(SKELETON)).toHaveAttribute('aria-label', 'InChIKey skeleton hash');
  });

  it('Enter pins the focused segment', () => {
    render(<Strip />);

    fireEvent.keyDown(screen.getByText(HASH), { key: 'Enter' });

    expect(useInchiStore.getState().keyPinned).toBe('hash');
  });

  it('pinning creates no canvas highlight (Invariant #2)', () => {
    render(<Strip />);

    fireEvent.click(screen.getByText(SKELETON));

    const s = useInchiStore.getState();
    expect(s.hoverIdx).toBeNull();
    expect(s.subHover).toBeNull();
    expect(s.pinned).toBeNull();
  });

  it('marks the pinned segment pressed and shows the release hint', () => {
    render(<Strip />);
    const seg = screen.getByText(SKELETON);
    expect(seg).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Pinned —/)).not.toBeInTheDocument();

    fireEvent.click(seg);

    expect(screen.getByText(SKELETON)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Pinned —/)).toBeInTheDocument();
  });
});
