import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('Escape closes, and does not leak to the tour/pin handlers on window', () => {
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    render(<Prose text={TEXT} />);

    // Nothing open: Esc belongs to whoever else wants it.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(outer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(outer).toHaveBeenCalledTimes(1); // consumed by Prose

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

  // The tooltip is centred on the word, so a term near either window edge would
  // hang outside it. happy-dom reports zero rects, so both edges are staged with
  // a stubbed getBoundingClientRect and a known innerWidth.
  describe('viewport clamping', () => {
    const VIEWPORT_WIDTH = 1000;
    const TIP_WIDTH = 300;
    const PAD = 8;
    let realWidth: number;

    const stageRects = (btnLeft: number) => {
      realWidth = window.innerWidth;
      window.innerWidth = VIEWPORT_WIDTH;
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          const isTip = this.getAttribute('role') === 'tooltip';
          const box = isTip
            ? { left: 0, width: TIP_WIDTH, top: 0, bottom: 40 }
            : { left: btnLeft, width: 40, top: 500, bottom: 520 };
          return { ...box, right: box.left + box.width, height: box.bottom - box.top } as DOMRect;
        },
      );
    };

    afterEach(() => {
      vi.restoreAllMocks();
      window.innerWidth = realWidth;
    });

    it('pulls a tooltip on a left-edge word back to the padding', () => {
      stageRects(0);
      render(<Prose text={TEXT} />);
      fireEvent.click(screen.getByRole('button', { name: 'atom' }));
      expect(screen.getByRole('tooltip').style.left).toBe(`${PAD}px`);
    });

    it('pulls a tooltip on a right-edge word back inside the window', () => {
      stageRects(VIEWPORT_WIDTH - 10);
      render(<Prose text={TEXT} />);
      fireEvent.click(screen.getByRole('button', { name: 'atom' }));
      const expected = VIEWPORT_WIDTH - TIP_WIDTH - PAD; // 692
      expect(screen.getByRole('tooltip').style.left).toBe(`${expected}px`);
    });
  });
});
