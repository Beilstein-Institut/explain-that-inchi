# Phase 10: Feedback dialog, context capture & entry point - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 10-feedback-dialog-context-capture-entry-point
**Areas discussed:** Entry-point placement, Dialog layout & copy, Submit & truncation UX, Context capture wiring

---

## Entry-point placement & affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Header .meta area | Top-right next to InChI version + InChI-Trust link | |
| Floating corner button | Fixed bottom-right overlay pill | |
| Footer / page bottom | New footer region below Explanation | |

**User's choice:** Free-text — "a button above ketcher on the right hand side" → a new right-aligned toolbar row between `Header` and `KetcherPanel`.

| Option | Description | Selected |
|--------|-------------|----------|
| Text link | Matches existing header .meta links | |
| Button / pill | Bordered button/pill, prominent CTA | ✓ |

**User's choice:** Button / pill.
**Notes:** Avoids editing Header markup and avoids a floating overlay clipping the canvas on small screens.

---

## Dialog layout & copy

| Option | Description | Selected |
|--------|-------------|----------|
| Radio button list | All 5 categories visible as vertical radio list | ✓ |
| Native <select> dropdown | Compact, hides options behind a click | |
| Segmented pills | Horizontal pills, may wrap on narrow screens | |

**User's choice:** Radio button list.

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Context preview shown directly in dialog | ✓ |
| Collapsible (collapsed) | Disclosure collapsed by default | |
| Collapsible (expanded) | Disclosure expanded but collapsible | |

**User's choice:** Always visible.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline note near submit | Sentence above/beside submit button | ✓ |
| Callout banner at top | Highlighted banner at dialog top | |

**User's choice:** Inline note near submit.
**Notes:** Transparency emphasised — preview always visible + explicit public-issue/account note at the decision moment.

---

## Submit & truncation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Close & reset | Dialog closes, form resets after opening tab | ✓ |
| Close, keep draft | Closes but retains message/category | |
| Stay open | Remains open after opening tab | |

**User's choice:** Close & reset (normal path).

| Option | Description | Selected |
|--------|-------------|----------|
| Only when truncated | Surface copy action only on truncated:true | ✓ |
| Always available | Copy button always present | |

**User's choice:** Only when truncated.

| Option | Description | Selected |
|--------|-------------|----------|
| Full issue body | Complete untruncated body | ✓ |
| Full InChI only | Just the verbatim InChI | |
| Offer both | Two copy actions | |

**User's choice:** Full issue body.

### Truncated-flow reconciliation (close & reset vs clipboard fallback)

| Option | Description | Selected |
|--------|-------------|----------|
| Stay open if truncated | Normal submits close; truncated stays open, reveals copy + note, manual close | ✓ |
| Show copy before opening tab | Two-step: copy first, then continue to GitHub | |
| Copy then close | Auto-copy, open tab, close with toast | |

**User's choice:** Stay open if truncated.
**Notes:** Resolved the collision between "close & reset on submit" and "fallback only when truncated". The copy must use the builder's untruncated body as the single source of truth (no template re-assembly in the dialog).

---

## Context capture wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Live ketcher.getSmiles() | Async call at submit, reflects actual canvas | ✓ |
| Preset data only | MOLECULES SMILES, wrong for custom/edited | |

**User's choice:** Live ketcher.getSmiles().

| Option | Description | Selected |
|--------|-------------|----------|
| Full navigator.userAgent | Raw UA verbatim (builder fences it) | ✓ |
| Browser + OS summary | Parsed short summary | |

**User's choice:** Full navigator.userAgent.

| Option | Description | Selected |
|--------|-------------|----------|
| App assembles, passes to dialog | App builds FeedbackContext, hands to dialog | ✓ |
| Dialog gathers via props | Prop-drill ketcherRef into dialog | |

**User's choice:** App assembles, passes to dialog.
**Notes:** Keeps all Ketcher glue centralised in App.tsx where it already lives.

---

## Claude's Discretion

- Exact button label wording ("Send feedback" working label).
- Component/file names & structure (`FeedbackDialog.tsx` + module CSS suggested).
- `getSmiles()` error handling (fall back to `(none)`; never block submit).
- Whether the toolbar control is its own component or inline JSX.
- Gesture-anchor mechanism (hidden `<a>` + `.click()` vs rendered link), as long as no-await-before-open holds.
- Exact shape of the D-11 builder extension (`fullBody` return field vs sibling export).

## Deferred Ideas

- FEED-F1 contextual "report this layer" pre-fill — future requirement.
- FEED-F2 optional GitHub @handle / contact field — future requirement.
- FEED-F3 anonymous (no-account) path via third-party form — future requirement.
- Repo-side label/issue-template/triage setup — non-code maintainer checklist, not a code phase.

No scope creep arose — discussion stayed within phase scope.
