import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prose } from '../Prose';
import { GLOSSARY } from '../../lib/glossary';

const TEXT = 'An atom and a bond. Another atom.';

describe('Prose', () => {
  it('renders the full text and one button per first term occurrence', () => {
    const { container } = render(<Prose text={TEXT} />);
    expect(container.firstChild).toHaveTextContent(TEXT);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('click opens the definition, second click closes it', () => {
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });
    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toHaveTextContent(GLOSSARY['atom']);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('only one definition open at a time', () => {
    render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.click(screen.getByRole('button', { name: 'bond' }));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent(GLOSSARY['bond']);
  });

  it('Escape closes, and only a sticky tooltip consumes the press', () => {
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });

    // Nothing open: Esc belongs to whoever else wants it.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(outer).toHaveBeenCalledTimes(1);

    // Merely hovered: the tooltip closes, but the pin and the tour still get
    // their Esc — resting the pointer on a word must not disarm the key.
    fireEvent.mouseEnter(btn);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(outer).toHaveBeenCalledTimes(2);

    // Clicked open: the reader's active thing, so Esc stops here.
    fireEvent.click(btn);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(outer).toHaveBeenCalledTimes(2); // consumed by Prose

    window.removeEventListener('keydown', outer);
  });

  it('the definition heading prints the surface text, not the glossary key', () => {
    render(<Prose text="An E/Z label." />);
    fireEvent.click(screen.getByRole('button', { name: 'E/Z' }));
    expect(screen.getByRole('tooltip').querySelector('b')).toHaveTextContent('E/Z');
  });

  it('click outside closes', () => {
    render(<div><Prose text={TEXT} /><span>outside</span></div>);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('text change closes an open definition', () => {
    const { rerender } = render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    rerender(<Prose text="A bond." />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('the tooltip is portaled to body, outside the prose element', () => {
    const { container } = render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    const tip = screen.getByRole('tooltip');
    expect(container.firstChild).not.toContainElement(tip);
    expect(document.body).toContainElement(tip);
  });

  it('the open button describes itself by the tooltip id', () => {
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });
    expect(btn).not.toHaveAttribute('aria-describedby');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
  });

  it('scrolling closes an open tooltip', () => {
    render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('resizing closes an open tooltip', () => {
    render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.resize(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('mousedown inside the tooltip does not close it', () => {
    render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.mouseDown(screen.getByRole('tooltip'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hover opens the tooltip and leaving the word closes it', () => {
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole('tooltip')).toHaveTextContent(GLOSSARY['atom']);
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('a click on a hovered term sticks the tooltip past mouseleave', () => {
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });
    fireEvent.mouseEnter(btn);
    fireEvent.click(btn);
    fireEvent.mouseLeave(btn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('focus opens the tooltip and blur closes it', () => {
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });
    fireEvent.focus(btn);
    expect(screen.getByRole('tooltip')).toHaveTextContent(GLOSSARY['atom']);
    fireEvent.blur(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  // The tooltip is placed from the word's rect and its own measured size, so a
  // term near any window edge would hang outside it. happy-dom reports zero
  // rects, so every edge is staged with a stubbed getBoundingClientRect and a
  // known viewport.
  describe('viewport clamping', () => {
    const VIEWPORT_WIDTH = 1000;
    const VIEWPORT_HEIGHT = 800;
    const TIP_WIDTH = 300;
    const TIP_HEIGHT = 60;
    const PAD = 8;
    const GAP = 6;
    const BTN_HEIGHT = 20;
    let realSize: { width: number; height: number };

    // Stage one word: its left/top in the viewport. Everything else is fixed.
    const stageRects = (btnLeft: number, btnTop: number) => {
      realSize = { width: window.innerWidth, height: window.innerHeight };
      window.innerWidth = VIEWPORT_WIDTH;
      window.innerHeight = VIEWPORT_HEIGHT;
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          const isTip = this.getAttribute('role') === 'tooltip';
          const box = isTip
            ? { left: 0, width: TIP_WIDTH, top: 0, height: TIP_HEIGHT }
            : { left: btnLeft, width: 40, top: btnTop, height: BTN_HEIGHT };
          return {
            ...box,
            right: box.left + box.width,
            bottom: box.top + box.height,
          } as DOMRect;
        },
      );
    };

    const openTip = () => {
      render(<Prose text={TEXT} />);
      fireEvent.click(screen.getByRole('button', { name: 'atom' }));
      return screen.getByRole('tooltip');
    };

    afterEach(() => {
      vi.restoreAllMocks();
      window.innerWidth = realSize.width;
      window.innerHeight = realSize.height;
    });

    it('pulls a tooltip on a left-edge word back to the padding', () => {
      stageRects(0, 500);
      expect(openTip().style.left).toBe(`${PAD}px`);
    });

    it('pulls a tooltip on a right-edge word back inside the window', () => {
      stageRects(VIEWPORT_WIDTH - 10, 500);
      const expected = VIEWPORT_WIDTH - TIP_WIDTH - PAD; // 692
      expect(openTip().style.left).toBe(`${expected}px`);
    });

    it('sits above a word with headroom for its measured height', () => {
      stageRects(400, 500);
      expect(openTip().style.top).toBe(`${500 - GAP - TIP_HEIGHT}px`); // 434
    });

    it('flips below a word too near the top for its measured height', () => {
      stageRects(400, 20);
      expect(openTip().style.top).toBe(`${20 + BTN_HEIGHT + GAP}px`); // 46
    });
  });

  // The tour's step bodies render through Prose, so a tooltip opened inside the
  // callout must paint over it. Both values are plain CSS, invisible to
  // happy-dom's stub of CSS Modules, so the files are compared directly
  // (precedent: src/__tests__/tokenContrast.test.ts).
  it('the tooltip paints above every Help tour layer', () => {
    const zIndexes = (file: string) =>
      [...readFileSync(resolve(__dirname, '..', file), 'utf8').matchAll(/z-index:\s*(\d+)/g)]
        .map(m => Number(m[1]));

    const tour = Math.max(...zIndexes('HelpTour.module.css'));
    expect(tour).toBeGreaterThan(0); // the tour really does stack
    expect(Math.max(...zIndexes('Prose.module.css'))).toBeGreaterThan(tour);
  });
});
