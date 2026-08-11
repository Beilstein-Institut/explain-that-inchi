---
id: 260811-jar
type: quick
description: Make the site footer persistent across all pages
completed: 2026-08-11
status: complete
commits:
  - 9076bf2
  - 5d9639d
---

# Quick Task 260811-jar — Persistent site footer

## What changed

`SiteFooter` moved from `App` to `Root`, rendered as a sibling of the route
switch, so it is on the main app and on all three legal hash routes. The legal
documents are now reachable from each other, which they were not.

`LegalPage`'s `.legal-masthead` logo is gone along with its CSS — it existed
only to compensate for the missing footer, and would otherwise have been the
same Beilstein-Institut mark twice on one page.

`.site-footer` gained `max-width: 1240px`, `margin: 8px auto 0` and its own
padding now that it no longer sits inside `.app`. The numbers reproduce the old
geometry exactly rather than approximating it:

| | before | after |
|---|---|---|
| side inset ≥900px | `.app` 32 + footer 2 | `padding-left/right: 34px` |
| side inset <900px | 16 + 2 | `18px` |
| space below ≥900px | `.app` 40 + footer 12 | `padding-bottom: 52px` |
| space below <900px | 32 + 12 | `44px` |

`.app`'s bottom padding went to 0 at both breakpoints so the 8px gap above the
footer is unchanged.

## Tests

`Root.test.tsx` gained a `site footer` block: the three legal links at all four
routes, the Beilstein mark on an app route and a legal route, and one assertion
that a route change does not unmount the links. All footer queries are scoped to
the `contentinfo` landmark — the privacy document links to "Privacy Policy" in
its own body text, so an unscoped query matches twice and fails.

`LegalPage.test.tsx`'s "identifies the Beilstein-Institut" case inverted: it now
asserts the page carries *no* second publisher mark, with a comment pointing at
where the positive assertion moved.

548 tests green, `tsc --noEmit` clean.

## Notes

Read as "one footer on every page", not "pinned to the viewport" — the request
said static/shown across all pages, and a `position: fixed` bar would eat canvas
height on the editor route where vertical space is the scarce resource.
