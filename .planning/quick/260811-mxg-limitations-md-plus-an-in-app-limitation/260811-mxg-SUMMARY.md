---
id: 260811-mxg
type: quick
description: LIMITATIONS.md plus an in-app Limitations dialog and trigger button
completed: 2026-08-11
status: complete
commits:
  - 62b6b21
  - 31a452d
  - d49ef9e
---

# Quick Task 260811-mxg — Limitations doc + in-app dialog

## What changed

**`LIMITATIONS.md`** (new, repo root). The full list, grouped by the layer that
imposes each limit rather than by symptom — the organising idea being that most
of these are not defects in this tool and the document's job is to say which
layer to complain to. Sections: InChI's coverage, the standard/non-standard
split, Ketcher, the canonical↔canvas mapping, the InChIKey hash, browser-only
deployment, and one closing entry that is a gap rather than a limit (no InChI
input, though the shipped WASM can already do the reverse conversion).

**`src/lib/limitationsContent.ts`** (new). The five dialog entries as plain data
with `{title, source, body}`. `source` is a union of the responsible layers
(`InChI` / `RInChI` / `MInChI` / `Ketcher` / `Standard InChI`) and renders as a
tag beside each title.

The five, chosen as the ones most likely to arrive as bug reports:

| Entry | Source |
|---|---|
| Inorganics and organometallics | InChI |
| Reactions | RInChI |
| Mixtures, formulations and polymers | MInChI |
| The string is not your drawing | Standard InChI |
| What can be drawn, and what can be highlighted | Ketcher |

**`src/components/LimitationsDialog.tsx`** + module CSS (new). Native `<dialog>`
mirroring `FeedbackDialog`. Read-only: no store, no Ketcher refs, no input, and
Close is its only control.

**`Limitations` button** on the section-label row, immediately left of Send
feedback, wired through a new optional `onLimitationsClick` prop on
`KetcherPanel` and a second dialog ref in `App`.

## Decisions

- **CSS `composes`, not duplication.** `LimitationsDialog.module.css` composes
  `feedbackDialog`, `dialogTitle`, `dialogIntro`, `actionRow` and `cancelBtn`
  from `FeedbackDialog.module.css`; only the entry list is new. Verified in a
  production build that the element receives both class names
  (`_limitationsDialog_1m7ej_9 _feedbackDialog_1cpx1_8`) — the alternative was
  either restating ~40 lines of surface CSS or refactoring FeedbackDialog into a
  shared module, and this is neither. `::backdrop` is redeclared because it is
  not a class and cannot be composed.
- **Subdued pill, not brand accent.** The button shares `.reset-trigger`'s rule.
  It opens a read-only panel; making it compete with Send feedback would misrank
  the two actions.
- **Five is a ceiling, and a test enforces it.** The dialog is a scannable
  warning, not the document. Growth goes into LIMITATIONS.md.
- **The `source` tag is load-bearing**, so a test asserts it renders: without it
  the dialog reads as a list of our own bugs, which inverts its purpose.

## Tests

9 new (`LimitationsDialog.test.tsx`): title, every entry rendered, every source
tag rendered, Close closes, no control other than Close, the pointer to
LIMITATIONS.md, exactly five entries, the three layers users misattribute are
covered, and every entry has a non-trivial body. Role queries use
`{ hidden: true }` because jsdom never opens the `<dialog>` — same reason as
`FeedbackDialog.test.tsx`.

587 tests green, `tsc --noEmit` clean, lint unchanged (the one pre-existing
exhaustive-deps warning), production build succeeds.

## Not verified

**The button was not unit-tested.** `KetcherPanel` mounts Ketcher's `Editor`,
which needs WASM and will not render under jsdom, which is why no KetcherPanel
test exists to extend. Writing one would mean mocking `ketcher-react` — more
harness than the four-line conditional warrants. The dialog it opens is tested.

**Nothing was seen in a browser.** The dialog's scroll behaviour at
`max-height: min(85vh, 760px)` with five entries, and the button's placement in
the wrapping action row at ≤900px, are both unconfirmed. Worth one look.
