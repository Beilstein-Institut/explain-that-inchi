// Callout placement — the bug that hid the tour's description card.
//
// Reported as "the help tour doesn't show the description card". The card was in
// the DOM the whole time and every existing test passed: it was positioned off
// the top of the viewport. Placement asserted a 180px card, the real one renders
// around 210px+ (the longest step body is 126 characters at 320px wide), and the
// 'above' branch anchored by `bottom` — so the card's true height decided where
// its top edge landed, and nothing checked that the result was on screen.
//
// These assertions are about one property, the only one that actually matters:
// the card is fully inside the viewport. They are written against sizes bigger
// than the old constant on purpose.

import { describe, it, expect } from 'vitest';
import { calloutPosition, pickSide } from '../HelpTour';
import type { CalloutSize, Viewport } from '../HelpTour';

const rect = (top: number, left: number, width: number, height: number): DOMRect =>
  ({ top, left, width, height, bottom: top + height, right: left + width, x: left, y: top,
     toJSON: () => ({}) }) as DOMRect;

const MARGIN = 12;
const VIEW: Viewport = { width: 1280, height: 800 };
/** The real card, not the old 180px guess. */
const CARD: CalloutSize = { width: 320, height: 214 };

const px = (v: React.CSSProperties[keyof React.CSSProperties]) => Number(v);

function fitsInside(style: React.CSSProperties, size: CalloutSize, view: Viewport) {
  const top = px(style.top);
  const left = px(style.left);
  return {
    top, left,
    withinTop: top >= 0,
    withinBottom: top + size.height <= view.height,
    withinLeft: left >= 0,
    withinRight: left + size.width <= view.width,
  };
}

describe('callout placement keeps the card on screen', () => {
  it('does not push the card off the top when space above is tight', () => {
    // THE REGRESSION, off the top edge. A 500px-tall target starting at y=200
    // leaves 100px below (too little) and 200px above — more than the old 180+12
    // threshold, less than the real 214+12. Old code chose 'above', anchored by
    // `bottom: 800-200+12 = 612`, and the card's top landed at -26. Replayed and
    // confirmed at -26, -21, -16, -11 and -6 for targets at y=200..220.
    const target = rect(200, 400, 300, 500);
    const side = pickSide(target, CARD, VIEW);
    const fit = fitsInside(calloutPosition(target, side, CARD, VIEW), CARD, VIEW);
    expect(fit.withinTop).toBe(true);
    expect(fit.top).toBeGreaterThanOrEqual(0);
  });

  it('does not push the card off the bottom when space below is tight', () => {
    // THE REGRESSION, off the bottom edge. 200px below the target passes the old
    // 192px test, so 'below' was chosen and top became 612 — putting the card's
    // bottom at 826 in an 800px viewport. Replayed and confirmed.
    const target = rect(200, 400, 300, 400);
    const side = pickSide(target, CARD, VIEW);
    const fit = fitsInside(calloutPosition(target, side, CARD, VIEW), CARD, VIEW);
    expect(fit.withinBottom).toBe(true);
    expect(fit.top + CARD.height).toBeLessThanOrEqual(VIEW.height);
  });

  it('keeps the card on screen for every side, target and viewport combination', () => {
    // Brute force beats guessing which arrangement breaks: any target position,
    // any card size, three viewports including a phone.
    const views: Viewport[] = [VIEW, { width: 390, height: 844 }, { width: 1440, height: 620 }];
    const cards: CalloutSize[] = [CARD, { width: 320, height: 300 }, { width: 320, height: 180 }];
    for (const view of views) {
      for (const card of cards) {
        const size = { width: Math.min(card.width, view.width - 2 * MARGIN), height: card.height };
        for (const top of [0, 60, 200, 400, view.height - 120]) {
          for (const left of [0, 150, view.width - 200]) {
            const target = rect(top, left, 180, 120);
            const side = pickSide(target, card, view);
            const fit = fitsInside(calloutPosition(target, side, card, view), size, view);
            const where = `view ${view.width}x${view.height} card ${card.height} target ${top},${left} side ${side}`;
            expect(fit.withinTop, `${where}: off the top`).toBe(true);
            expect(fit.withinLeft, `${where}: off the left`).toBe(true);
            expect(fit.withinRight, `${where}: off the right`).toBe(true);
            // A card taller than the viewport cannot fit; it must still start on screen.
            if (card.height + 2 * MARGIN <= view.height) {
              expect(fit.withinBottom, `${where}: off the bottom`).toBe(true);
            }
          }
        }
      }
    }
  });

  it('never anchors by bottom or right', () => {
    // The far-edge anchor is what allowed the card's own height to decide where
    // it began. Positions are top/left so the clamp can guarantee both edges.
    const target = rect(300, 400, 200, 100);
    for (const side of ['above', 'below', 'left', 'right'] as const) {
      const style = calloutPosition(target, side, CARD, VIEW);
      expect(style.bottom, `${side} anchored by bottom`).toBeUndefined();
      expect(style.right, `${side} anchored by right`).toBeUndefined();
    }
  });

  it('picks a side using the measured card, not a fixed guess', () => {
    // 200px below the target: enough for a 180px card, not for a 214px one.
    const target = rect(0, 400, 300, 588);
    expect(pickSide(target, { width: 320, height: 180 }, VIEW)).toBe('below');
    expect(pickSide(target, { width: 320, height: 214 }, VIEW)).not.toBe('below');
  });
});
