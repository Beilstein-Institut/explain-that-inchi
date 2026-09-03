// Keyboard parity for the hover-driven InChI display.
//
// The string chunks and sub-tokens are spans, not buttons — they sit inline inside
// a monospace run and must not inherit button layout. That makes them invisible to
// keyboard and screen-reader users unless button semantics are added back by hand
// (WCAG 2.1.1 Keyboard, 4.1.2 Name/Role/Value).
//
// Sub-tokens are nested inside their layer chunk, so both cannot be tab stops:
// nesting interactive controls is invalid ARIA and would put ~40 stops in the tab
// order for a drug-sized molecule. Instead this is a composite widget, the same
// pattern as a toolbar:
//
//   Tab            — moves between layer chunks (a handful of stops)
//   ArrowRight     — steps into, then along, that layer's sub-tokens
//   ArrowLeft      — steps back, and out to the layer chunk
//   Enter / Space  — pins whatever is focused; pressing again releases
//   Escape         — releases the pin (handled globally in hooks/usePinRelease)
//
// Callers pair these props with onFocus/onBlur mirroring onMouseEnter/onMouseLeave,
// so focusing a token does exactly what hovering it does.
import type React from 'react';

/** Marks a sub-token as arrow-navigable. Applied by subHoverProps. */
export const SUBTOKEN_ATTR = 'data-subtoken';

// Returns true when the key was consumed as navigation.
function rove(e: React.KeyboardEvent): boolean {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return false;
  const el = e.currentTarget as HTMLElement;
  const layer = el.closest<HTMLElement>('[data-layer]');
  if (!layer) return false;
  const items = Array.from(layer.querySelectorAll<HTMLElement>(`[${SUBTOKEN_ATTR}]`));
  if (items.length === 0) return false;

  // -1 when the layer chunk itself holds focus, i.e. we are about to step in.
  const here = items.indexOf(el);
  e.preventDefault();
  e.stopPropagation();

  if (e.key === 'ArrowRight') {
    items[Math.min(here + 1, items.length - 1)]?.focus();
  } else if (here <= 0) {
    layer.focus(); // step back out to the chunk
  } else {
    items[here - 1].focus();
  }
  return true;
}

export function activateProps(
  onActivate: (e: React.SyntheticEvent) => void,
  opts: { child?: boolean } = {},
) {
  return {
    role: 'button',
    // Sub-tokens are reached with arrows from their layer, never with Tab.
    tabIndex: opts.child ? -1 : 0,
    ...(opts.child ? { [SUBTOKEN_ATTR]: '' } : {}),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (rove(e)) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      // Space would otherwise scroll the page out from under the highlight.
      e.preventDefault();
      onActivate(e);
    },
  };
}
