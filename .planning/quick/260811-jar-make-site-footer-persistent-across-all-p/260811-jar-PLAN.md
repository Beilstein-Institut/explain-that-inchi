---
id: 260811-jar
type: quick
description: Make the site footer persistent across all pages
created: 2026-08-11
status: planned
---

# Quick Task 260811-jar — Persistent site footer

## Problem

`SiteFooter` renders inside `App`, and `Root` swaps the whole app out for
`LegalPage` on `#imprint`/`#privacy`/`#terms`. So the footer — with the legal
links and the Beilstein-Institut mark — disappears exactly on the pages that
are reached through it. `LegalPage` compensates with its own `.legal-masthead`
logo (its comment says so outright) and there is no way back to Impressum from
Privacy without going through the app.

## Approach

Hoist `<SiteFooter />` out of `App` and into `Root`, rendered after the routed
content. One footer, every route. The `LegalPage` masthead then becomes a second
logo on the same page, so it goes.

The footer no longer inherits `.app`'s width and padding, so it needs its own —
matched to the old inset so nothing moves visually:

| | old (inside `.app`) | new (standalone) |
|---|---|---|
| text inset ≥900px | 32 (`.app`) + 2 = 34 | `padding: 4px 34px 52px`, `max-width: 1240px` |
| text inset <900px | 16 + 2 = 18 | `padding: 4px 18px 44px` |
| space below | `.app` 40/32 + footer 12 | folded into the footer's bottom padding |

`.app`'s bottom padding drops to 0 so the 8px gap above the footer is unchanged.

## Tasks

1. **Move the footer** — `Root.tsx` renders `<>{content}<SiteFooter /></>`;
   drop the import + element from `App.tsx`.
2. **Drop the LegalPage masthead** — remove the logo link, the `logoUrl` import
   and the `.legal-masthead` rules; give `.site-footer` its own width/padding
   (both breakpoints) and zero `.app`'s bottom padding.
3. **Tests** — move the "identifies the Beilstein-Institut" assertion from
   `LegalPage.test.tsx` to `Root.test.tsx` (it is now a footer fact, and Root is
   where both routes exist); add Root assertions that the legal links are
   present on both an app route and a legal route.

## Verification

- `npx vitest run` green
- `npx tsc --noEmit` clean
- No `SiteFooter` reference left in `App.tsx`; no `legal-masthead` left anywhere
