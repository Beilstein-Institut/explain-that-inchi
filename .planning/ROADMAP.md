# Roadmap: Explain that InChI

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 (shipped 2026-06-05)
- ✅ **v1.1 Post-ship correctness & polish** — patch, no roadmap phases (shipped 2026-06-17)
- 🚧 **v1.2 In-app feedback via prefilled GitHub issues** — Phases 9–10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–8) — SHIPPED 2026-06-05</summary>

- [x] Phase 1: Scaffold and Ketcher Mount (2/2 plans) — completed 2026-05-19
- [x] Phase 2: Data Pipeline (3/3 plans) — completed 2026-05-20
- [x] Phase 3: InChI Display and Explanation UI (5/5 plans) — completed 2026-05-21
- [x] Phase 4: Hover-to-Highlight Integration (3/3 plans) — completed 2026-05-22
- [x] Phase 5: Mapping Strip and Preset Molecules (3/3 plans) — completed 2026-05-22
- [x] Phase 6: Hydrogen Highlight, Polish, and Deploy (4/4 plans) — completed 2026-06-01
- [x] Phase 7: Multi-Fragment Highlighting, p-Layer, and Copy (3/3 plans) — completed 2026-06-01
- [x] Phase 8: Hydrogen Implicit & Explicit Highlight (2/2 plans) — completed 2026-06-05

Full phase details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.2 In-app feedback via prefilled GitHub issues (In Progress)

**Milestone Goal:** Let any visitor send feedback through a "Send feedback" control that opens a prefilled GitHub `issues/new` page in a new tab, auto-including the current InChI, molecule (SMILES + preset name), and environment (user-agent + app version) — purely client-side, no backend, zero new npm dependencies.

**Overview:** This is a small, low-complexity, purely additive feature: client-side URL construction, no network call until the user clicks through. It splits along the one natural seam research identified — a pure, DOM-free URL builder that owns all the hard logic (single-`URLSearchParams` encoding, the ~7.5 KB `TextEncoder` byte-budget guard, deterministic truncation of auto-context only, `@`-neutralization, category title-prefixing) plus the build-time version string it consumes — built and test-anchored first — then the impure submit-time context collector, the native `<dialog>` modal, the entry-point control, and App wiring layered on top.

- [x] **Phase 9: Feedback URL builder, config & version injection** — Pure, fully-tested `buildFeedbackUrl()` plus build-time app version (completed 2026-06-17)
- [ ] **Phase 10: Feedback dialog, context capture & entry point** — On-brand "Send feedback" modal wired into the app, opening the prefilled issue

## Phase Details

### Phase 9: Feedback URL builder, config & version injection

**Goal**: A pure, DOM-free `buildFeedbackUrl(message, category, context) -> { url, truncated }` exists, fully unit-tested, that turns a message + category + context snapshot into a correct, length-safe GitHub `issues/new` URL — and the build surfaces a real app version string for the context to carry.
**Depends on**: Phase 8 (v1.0 codebase)
**Requirements**: FEED-04, FEED-05, FEED-07, FEED-09
**Success Criteria** (what must be TRUE):

  1. Given a message, category, and context, the builder returns a GitHub `issues/new` URL whose title carries the category as a prefix (e.g. `[Bug]`) and whose body contains the user's message plus the auto-context (InChI, SMILES, preset name, user-agent, app version) each in a fenced code block; the category is also passed redundantly as a `labels=` value.
  2. Special characters and newlines round-trip correctly through a single `URLSearchParams` encoding (no double-encoding; an unencoded `#` does not truncate the body), verified by a round-trip parse test over `+ / ; , ( ) # =`.
  3. When the encoded URL would exceed the ~7.5 KB `TextEncoder` byte budget, the auto-context (drop SMILES first, then trim InChI with a `...[truncated]` marker) is deterministically reduced while the user's message is preserved intact, and the result reports `truncated: true` — verified against the multi-fragment repro molecule.
  4. `@` in user-supplied text is neutralized so submissions cannot accidentally ping GitHub users.
  5. The running app exposes a non-`0.0.0` version/commit string (Vite `define`, `git describe --tags --always` with `$GITHUB_SHA` CI fallback, `package.json` bumped) that the builder includes in the context block.

**Plans**: 2 plans

Plans:

- [x] 09-01-PLAN.md — Bump version + inject __APP_VERSION__/__APP_COMMIT__ Vite defines (FEED-09)
- [x] 09-02-PLAN.md — Pure, test-anchored buildFeedbackUrl() with encoding/budget/truncation/@-neutralization (FEED-04/05/07)

### Phase 10: Feedback dialog, context capture & entry point

**Goal**: A visitor can discover a "Send feedback" control, fill in a category and message in an on-brand modal, see exactly what context will be attached, and click through to a prefilled GitHub issue in a new tab — without ever disturbing the Ketcher canvas.
**Depends on**: Phase 9
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-06, FEED-08
**Success Criteria** (what must be TRUE):

  1. User can open a visible, on-brand "Send feedback" control that mounts a native `<dialog>` as a leaf sibling — the Ketcher canvas, Zustand store, and InChI never remount or re-run `getInchi`.
  2. User can pick a feedback category (Bug · Explanation wrong/confusing · Highlighting wrong · Suggestion · General) and type a free-text message in the dialog.
  3. Before submitting, the user sees a preview of the auto-captured context (InChI read verbatim from the store, SMILES via `ketcher.getSmiles()`, preset name via `MOLECULES.find(selectedMolId)`, trimmed user-agent, app version) and clear copy stating that submitting opens a PUBLIC GitHub issue and requires a GitHub account.
  4. On submit, a prefilled GitHub `issues/new` page opens in a new tab via a real user-gesture anchor (`target="_blank" rel="noopener"`) without being popup-blocked; if the builder reported truncation, the user is offered a clipboard fallback to copy the full InChI / issue body.
  5. With an empty canvas / no InChI yet, the dialog still works and the body degrades cleanly (e.g. "no structure loaded") with no broken or empty submission.

**Plans**: 3 plans
**UI hint**: yes

Plans:
**Wave 1**

- [ ] 10-01-PLAN.md — Extend buildFeedbackUrl to return fullBody field (D-11 builder extension + tests)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 10-02-PLAN.md — FeedbackDialog component: category selector, message field, context preview, submit/clipboard flows

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 10-03-PLAN.md — App.tsx wiring: toolbar pill, dialogRef, handleFeedbackSubmit context assembly

## Non-Code Maintainer Checklist (not a phase)

Surfaced here so it isn't mistaken for implementation work (per REQUIREMENTS.md Out-of-Scope — repo-side label/template/triage setup is maintainer GitHub config, not app code):

- [ ] Optional repo-side GitHub settings: create `bug` / `explanation` / `highlighting` / `feedback` / `suggestion` labels, an optional `.github/ISSUE_TEMPLATE/config.yml`, and interaction limits for spam. Categorization works via title prefix regardless, so this is best-effort and never blocks Phase 9 or 10.

## Progress

**Execution Order:**
Phases execute in numeric order: 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Scaffold and Ketcher Mount | v1.0 | 2/2 | Complete | 2026-05-19 |
| 2. Data Pipeline | v1.0 | 3/3 | Complete | 2026-05-20 |
| 3. InChI Display and Explanation UI | v1.0 | 5/5 | Complete | 2026-05-21 |
| 4. Hover-to-Highlight Integration | v1.0 | 3/3 | Complete | 2026-05-22 |
| 5. Mapping Strip and Preset Molecules | v1.0 | 3/3 | Complete | 2026-05-22 |
| 6. Hydrogen Highlight, Polish, and Deploy | v1.0 | 4/4 | Complete | 2026-06-01 |
| 7. Multi-Fragment Highlighting, p-Layer, and Copy | v1.0 | 3/3 | Complete | 2026-06-01 |
| 8. Hydrogen Implicit & Explicit Highlight | v1.0 | 2/2 | Complete | 2026-06-05 |
| 9. Feedback URL builder, config & version injection | v1.2 | 2/2 | Complete | 2026-06-17 |
| 10. Feedback dialog, context capture & entry point | v1.2 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-05-18*
*Updated: 2026-06-17 — v1.2 milestone (in-app feedback) roadmap added (Phases 9–10)*
