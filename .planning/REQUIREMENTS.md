# Requirements: Explain that InChI — Milestone v1.2

**Milestone:** v1.2 — In-app feedback via prefilled GitHub issues
**Defined:** 2026-06-17
**Source:** Conversation + parallel research (`.planning/research/SUMMARY.md`)

Core mechanism (locked): a "Send feedback" control opens a **prefilled GitHub new-issue page** in a new tab — pure client-side URL construction, **no backend**. Repo: `cm-beilstein/explain-that-inchi`.

---

## v1.2 Requirements

### Feedback Entry & Submission (FEED)

- [ ] **FEED-01**: User can open a feedback dialog from a visible, on-brand "Send feedback" control in the UI (does not disturb / remount the Ketcher canvas).
- [ ] **FEED-02**: User can select a feedback category (Bug · Explanation wrong/confusing · Highlighting wrong · Suggestion · General).
- [ ] **FEED-03**: User can type a free-text feedback message in the dialog.
- [ ] **FEED-04**: On submit, a prefilled GitHub `issues/new` page opens **in a new tab**, with a title that carries the category as a prefix and a body containing the user's message. (Category also passed as a `labels=` value redundantly; title prefix is the source of truth since labels silently drop for non-collaborators.)
- [ ] **FEED-05**: The issue body auto-includes the captured context — current InChI string, molecule SMILES + preset name (if any), and browser user-agent + app version/commit — each wrapped in a code fence, with `@` neutralized in user-supplied text to prevent accidental mentions.

### Context, Transparency & Privacy (FEED)

- [ ] **FEED-06**: Before submitting, the user can see the auto-captured context that will be attached, and the dialog clearly states that submitting opens a **public** GitHub issue and requires a GitHub account.
- [ ] **FEED-07**: When the captured context would push the issue URL past the safe byte budget (~7.5 KB, measured with `TextEncoder`), the auto-captured context (InChI/SMILES) is deterministically truncated — never the user's message — and the user is offered a clipboard fallback to copy the full InChI / issue body.
- [ ] **FEED-08**: Feedback works gracefully when the canvas is empty / no InChI has been generated yet — the body degrades cleanly (e.g. "no structure loaded") with no broken or empty submission.

### Build & Configuration (FEED)

- [ ] **FEED-09**: The build injects an app version/commit identifier (Vite `define`; `GITHUB_SHA` / `git describe` fallback; bump `package.json` off `0.0.0`) that is surfaced in the feedback context.

---

## Future Requirements (deferred)

- **FEED-F1**: Contextual "report this layer/explanation" affordance that pre-fills the specific InChI layer the user is questioning.
- **FEED-F2**: Optional GitHub @handle / contact field for follow-up.
- **FEED-F3**: Anonymous (no-GitHub-account) path via a third-party form service — revisit if account-requirement proves a barrier.

---

## Out of Scope (explicit exclusions)

| Excluded | Reason |
|----------|--------|
| Backend / serverless function to receive feedback | Hard project constraint — static GitHub Pages, no backend |
| Third-party feedback SaaS / floating widget (Usersnap, etc.) | Adds external dependency, branding, privacy surface; GitHub issues suffice |
| Client-side auth / GitHub OAuth / API token submission | No backend to hold secrets; prefilled-URL flow needs none |
| Collecting PII / email / screenshots | Privacy; only surface what's already on screen |
| Repo-side labels / issue-template / triage setup | Maintainer GitHub config, not app code — tracked as a non-code checklist item in ROADMAP.md |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FEED-01 | Phase 10 | pending |
| FEED-02 | Phase 10 | pending |
| FEED-03 | Phase 10 | pending |
| FEED-04 | Phase 9 | pending |
| FEED-05 | Phase 9 | pending |
| FEED-06 | Phase 10 | pending |
| FEED-07 | Phase 9 | pending |
| FEED-08 | Phase 10 | pending |
| FEED-09 | Phase 9 | pending |
