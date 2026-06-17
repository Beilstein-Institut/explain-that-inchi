# Feature Research — v1.2 In-app Feedback (prefilled GitHub issue)

**Domain:** In-app "Send feedback" feature for a static/client-side educational web tool (opens a prefilled GitHub issue; no backend)
**Researched:** 2026-06-17
**Confidence:** HIGH (mechanism is a well-trodden pattern; GitHub URL params and modal a11y are documented; only the precise byte-budget cutover for long InChI/SMILES is project-specific and flagged MEDIUM)

> Note: `.planning/research/FEATURES.md` holds the v1.0 milestone feature research and was intentionally NOT overwritten.
> This file is the v1.2-scoped feature research.

## Scope note

This research covers ONLY the v1.2 feedback feature. The mechanism is already decided: a "Send feedback" control opens
`github.com/cm-beilstein/explain-that-inchi/issues/new` prefilled with title/body/labels, client-side only, no backend.
The open design questions are: entry-point UX, modal-first vs direct deep-link, fields/categories, privacy/transparency,
and accessibility. Recommendations below resolve each.

## Headline recommendation

**Modal-first, not direct deep-link.** A small "Send feedback" link in the header/footer opens a lightweight in-app
modal that collects (1) a category, (2) a short free-text message, and (3) shows the auto-captured context for review,
then builds the prefilled GitHub URL and opens it in a new tab on submit. Rationale below in *Differentiators* and
*Anti-Features*. The native HTML `<dialog>` element gives focus-trap, Escape-to-close, and backdrop inertness almost for
free, so "modal" here is low-cost, not heavyweight.

## App-state dependencies (for downstream requirements / executor)

The feedback feature must read live app state. What exists today and how to get each piece:

| Context to capture | Source | Availability | Notes |
|--------------------|--------|--------------|-------|
| Current InChI string | `useInchiStore.getState().inchi` (Zustand, `src/store.ts`) | Present today | Empty string `''` when canvas empty / no valid structure. Already the verbatim Ketcher output per MEMORY (never reconstruct). |
| Layers / parse state | `useInchiStore` `layers` | Present today | Not needed in the issue body, but indicates whether InChI is valid. |
| SMILES of current molecule | `ketcher.getSmiles()` (async, Ketcher API) — **not in the store today** | NEW read needed | The store has no SMILES field. Either call `ketcher.getSmiles()` at submit time, or (cheaper) capture the preset SMILES when a preset is active. Live-drawn molecules have no SMILES in the store → must call the Ketcher API. |
| Preset name | `selectedMolId` — **component-local state in `App.tsx`, not in the store** | NEW plumbing needed | Maps to `MOLECULES` (`src/data/molecules.ts`) for `name`/`smiles`. `null` when the user free-draws or edits a preset. Either lift `selectedMolId` into the store, or pass it down to the feedback component as a prop. |
| App version / commit | Build-time env (e.g. Vite `import.meta.env` / `define`) — **does not exist today** | NEW build wiring | No app version string is currently surfaced. Inject `__APP_VERSION__`/commit SHA via Vite `define` at build time. Header hardcodes "InChI v1.06" but that is the InChI *standard* version, not the app version. |
| Browser / user-agent | `navigator.userAgent` | Free | No new dependency. Consider a trimmed summary rather than the raw UA for readability. |

**Key plumbing finding:** Of the six context fields, only `inchi` and `userAgent` are trivially available. `SMILES`,
`preset name`, and `app version` each require a small piece of new wiring (a Ketcher API call, lifting/threading
`selectedMolId`, and a Vite build-time define respectively). This is the main hidden cost of the feature and should be
an explicit requirement, not assumed free.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| A discoverable "Send feedback" entry point | Users can't report what they can't find; a polished tool is expected to have an obvious channel | LOW | Header or footer link. A header/footer link is table stakes; a floating widget is not. |
| Prefilled issue **title** and **body** | The whole value of the feature; raw `issues/new` with empty fields is no better than a plain link | LOW | GitHub supports `?title=`, `?body=`, `?labels=` query params (all `encodeURIComponent`'d). Confirmed via GitHub docs + sindresorhus/new-github-issue-url. |
| Auto-captured context in the body (InChI, molecule, env) | The decided core value: reporters shouldn't hand-copy the InChI string | MEDIUM | See app-state dependency table — this is where the real work is. |
| Opens in a **new tab** (`target="_blank"`, `rel="noopener"`) | Don't destroy the user's in-progress drawing by navigating away | LOW | Critical: navigating the same tab loses canvas state (no persistence in v1). |
| Graceful empty-canvas behavior | Tool starts empty; "no InChI yet" must not produce a broken/garbage issue | LOW | When `inchi === ''`, omit the InChI/molecule block or label it "(no molecule drawn)". Bug reports unrelated to a molecule are valid. |
| Clear statement that it opens a **public** GitHub issue | Ethical baseline; users must not be surprised that their text becomes world-readable | LOW | One line of copy in the modal. Table stakes, not a differentiator — surprising users with publicity is a trust failure. |
| On-brand styling (oklch tokens, IBM Plex type) | Project fidelity constraint is "high"; a default/unstyled widget would visibly clash | LOW-MEDIUM | Reuse existing CSS-variable token system and card styling from explanation/legend cards. |

### Differentiators (Competitive Advantage)

These are where a small educational tool can feel notably more polished than the typical "link to issues" approach.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Modal-first flow** (category + message captured before building URL) | Produces well-structured, triaged issues instead of empty-bodied "New issue" pages; reduces back-and-forth | MEDIUM | Native `<dialog>` keeps cost low. The message + category become the issue title prefix + label. |
| **Feedback category selector** mapped to labels/title prefix | Auto-triages reports into bug / suggestion / "explanation wrong or confusing" / "wrong highlighting" / general — directly actionable for a solo maintainer | LOW | See category mapping below. Labels via `?labels=`; a title prefix is a robust fallback (labels silently drop if the label doesn't exist or the submitter lacks perms). |
| **Context preview / review before submit** | User sees exactly what InChI/SMILES/UA will be posted publicly — builds trust, prevents accidental disclosure | MEDIUM | A collapsible "What will be included" block showing the rendered context. Strong privacy-UX win for a public tool. |
| **Contextual "report this explanation" affordance** | A small "flag" on a layer/explanation card lets users report the exact layer that's wrong, pre-selecting the "explanation wrong" category and capturing which layer | MEDIUM-HIGH | High product fit (the app's core value is per-layer explanations) but higher cost: needs per-layer hooks into the hover/layer state. Recommend as a v1.x follow-on, not launch. |
| **Opt-out / edit of captured context** | Lets a privacy-conscious user uncheck "include molecule" before it goes public | LOW-MEDIUM | A single "Include current molecule & environment" checkbox (default on) is sufficient; full per-field editing is over-engineering. |
| **URL-length guard for long InChI/SMILES** | Prevents a broken/"414 Request-URI Too Long" experience for large molecules (atorvastatin-scale or multi-fragment) | MEDIUM | Real constraint: browser/GitHub URI limits commonly 4–8KB (confirmed via GitHub CLI issue #1575, MDN 414). If the assembled URL exceeds a safe budget (~6–7KB), truncate the InChI in the body with a "(truncated — paste full string below)" note and copy the full InChI to the clipboard. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Persistent floating "feedback" bubble (bottom-right widget) | Industry default; "best click rates" | Spammy/SaaS-y for a focused educational tool; covers the Ketcher canvas or legend; visually fights the clean handoff design | A quiet header/footer text link. Floating widgets suit conversion-funnel SaaS, not a one-screen explainer. |
| Third-party feedback SaaS (Usersnap, Canny, Sentry user-feedback, etc.) | Turnkey, screenshots, analytics | Adds a runtime dependency, external network calls, cookies/PII, and a privacy-policy burden — all contrary to the "no backend, only what's on the page" constraint | The decided GitHub-issue deep-link: zero dependencies, zero data collection by us. |
| Requiring login / OAuth / GitHub App auth before feedback | "Verify the reporter" | Impossible without a backend; GitHub already requires the submitter to be logged in *on github.com* to file the issue — re-implementing auth client-side is wasted and infeasible | Accept the decided tradeoff: submitting needs a GitHub account; we add nothing. |
| Collecting email / name / "contact me" field | Lets the maintainer follow up | Becomes PII posted to a **public** issue; GDPR/disclosure risk; the GitHub issue thread already provides a reply channel via the submitter's account | No PII field. If contact is wanted, one *optional* "GitHub @handle (optional, public)" field — but default to none. |
| Screenshot / canvas-image capture | "A picture of the bug" | Heavy (html2canvas / Ketcher render export), large data that won't fit in a URL, and the InChI+SMILES already fully describe the molecule | Capture InChI + SMILES (exact, compact, reproducible) instead of pixels. |
| Auto-submitting the issue via GitHub API token | "One click, no GitHub tab" | Requires storing a token client-side (security hole) or a backend (banned by constraints) | Open the prefilled `issues/new` page; the user clicks "Submit" on GitHub. |
| Rich text / markdown editor for the message | "Nicer formatting" | Over-engineering a 1–3 sentence message box; GitHub renders the body's markdown anyway | A plain `<textarea>`; we wrap the captured context in a markdown code block ourselves. |
| Rating / NPS / star-survey prompt | "Measure satisfaction" | Off-mission for an explainer tool; nags users; no backend to store responses | Out of scope. |

## Entry-point analysis (question 1)

| Pattern | Verdict | Rationale |
|---------|---------|-----------|
| Header link ("Send feedback" near the title meta) | **Recommended — table stakes** | Discoverable, on-brand, doesn't obscure the canvas. `Header` already has a `.meta` block (`src/components/Header.tsx`) with an external link — a natural home. |
| Footer link | Acceptable alternative / additional | Conventional for "report an issue / source on GitHub"; lower discoverability than header. Pairing footer "View source / report issue" with the header control is fine. |
| Persistent floating button | **Not recommended** | Visual noise that risks covering the single-screen UI. Anti-feature above. |
| Contextual "report this layer" affordance | **Differentiator, defer to v1.x** | Best product fit but highest cost; not launch-critical. |

## Interaction model: modal-first vs direct deep-link (question 2)

**Recommendation: modal-first.** A direct deep-link drops the user on GitHub's new-issue page with our body prefilled but
*no* category, *no* user message, and the public-disclosure surprise happening on GitHub's domain rather than ours.
The modal is cheap (native `<dialog>`) and buys: category selection (→ triage), a guided short message, an in-our-UI
public-issue disclosure + context review, and a place to enforce the URL-length guard before we ever build the link.

**Fields worth collecting in the modal:**

| Field | Type | Required | Maps to |
|-------|------|----------|---------|
| Category | radio / segmented control | Yes (default "general") | GitHub label + title prefix |
| Message | `<textarea>`, short | Yes (or strongly encouraged) | Top of issue body |
| Include molecule & environment context | checkbox, default **on** | No | Whether the auto-captured block is appended |
| GitHub @handle (optional, public) | text | No — omit at launch unless wanted | A line in the body |

The "Open feedback on GitHub" button assembles `title`, `body`, `labels` and opens the new tab.

## Feedback categorization for THIS app (question 3)

Mapped to GitHub labels AND a redundant title prefix (labels can silently fail; prefix is the robust fallback):

| Category (user-facing) | Title prefix | GitHub label | When |
|------------------------|--------------|--------------|------|
| Something's broken | `[Bug]` | `bug` | Tool errors, canvas/highlight crashes, wrong InChI computed |
| An explanation is wrong or confusing | `[Explanation]` | `explanation` | A layer's prose/reading-code is incorrect or unclear — core product surface |
| Highlighting looks wrong | `[Highlighting]` | `highlighting` | Hovering a layer highlights the wrong atoms/bonds (high-value given the multi-fragment work) |
| Suggestion / idea | `[Suggestion]` | `enhancement` | Feature requests, new presets |
| General / other | `[Feedback]` | `feedback` | Anything else |

Note: `bug` and `enhancement` exist by default on GitHub repos; `explanation`, `highlighting`, and `feedback` must be
created in the repo first, or label application is a no-op (the title prefix still carries the signal).

## Privacy / transparency UX (question 4)

- **State plainly, in the modal:** "This opens a new public issue on GitHub. Anything you write — and the molecule/InChI
  shown below — will be visible to everyone." Table stakes, not optional.
- **Show the captured context for review** before submit (the "context preview" differentiator). The captured data is
  non-sensitive (a molecule the user drew, an InChI, a UA string), but transparency is the right default and cheap.
- **Opt-out:** a single "Include current molecule & environment" checkbox (default on) is sufficient. Full per-field
  editing is over-engineering; the user can always edit freely on GitHub's own page before submitting.
- **No PII collection** by us. The only identity attached is the submitter's own GitHub account, surfaced by GitHub — out
  of our hands and expected.

## Accessibility expectations (question 5)

Consistent with WAI-ARIA APG Dialog (Modal) pattern. Using the native `<dialog>` element provides most of this for free;
verify each:

- `role="dialog"` + `aria-modal="true"` (native `<dialog>` via `showModal()` supplies these).
- `aria-labelledby` pointing at the modal heading so the title is announced on open.
- **Focus management:** move focus into the dialog on open; **return focus to the triggering link** on close. Native
  `showModal()` handles initial focus and the top-layer focus trap.
- **Keyboard:** Tab / Shift+Tab cycle within the dialog; **Escape closes** (native `<dialog>` provides Escape).
- **Background inert:** native modal `<dialog>` makes the backdrop inert automatically; a custom div modal would need
  `inert`/`aria-hidden` on the rest of the page.
- Category radios properly grouped (`<fieldset>`/`<legend>`); all controls keyboard-operable.
- Honor `prefers-reduced-motion` for any open/close transition.

**Implementation note:** prefer the native `<dialog>` element over a hand-rolled focus-trap to minimize a11y bugs. No new
dependency needed.

## Feature Dependencies

```
[Send feedback entry point (header link)]
        └──opens──> [Feedback modal (native <dialog>)]
                          ├──requires──> [Read current InChI]  (store.inchi — exists)
                          ├──requires──> [Read SMILES]          (ketcher.getSmiles() OR active preset — NEW read)
                          ├──requires──> [Read preset name]     (selectedMolId — NEW plumbing, App-local today)
                          ├──requires──> [App version/commit]   (Vite build-time define — NEW wiring)
                          ├──uses──────> [navigator.userAgent]  (free)
                          └──builds────> [Prefilled GitHub issue URL]
                                              └──guarded by──> [URL-length budget guard (~6-7KB)]
                                                                    └──fallback──> [truncate + copy full InChI to clipboard]

[Category selector] ──maps to──> [GitHub label + title prefix]
[Context preview/opt-out checkbox] ──gates──> [auto-captured context block]
[Contextual "report this layer" affordance] ──enhances──> [Feedback modal]  (defer to v1.x)
```

### Dependency Notes

- **Modal requires SMILES/preset/version reads that don't fully exist yet.** Critical roadmap fact: three of six context
  fields need new wiring. InChI and UA are free; the rest are not. Size the milestone accordingly.
- **URL-length guard depends on the assembled body**, so it runs after context assembly and before opening the tab. Hard
  constraint for large molecules, not an edge case (preset list includes atorvastatin and multi-fragment test cases).
- **Contextual per-layer reporting enhances the modal** but depends on hooking the existing `hoverIdx`/layer state; higher
  cost, defer.

## MVP Definition

### Launch With (v1.2)

- [ ] Header (and/or footer) "Send feedback" link, on-brand — table-stakes entry point
- [ ] Accessible modal via native `<dialog>` (focus, Escape, aria-labelledby) — table-stakes interaction shell
- [ ] Category selector (5 categories) → title prefix + label — differentiator, low cost
- [ ] Short message `<textarea>` — table-stakes content
- [ ] Auto-captured context: InChI (store), SMILES (Ketcher API/preset), preset name, UA, app version — core decided value
- [ ] Public-issue disclosure line + context preview — privacy table stakes + cheap differentiator
- [ ] "Include molecule & environment" opt-out checkbox (default on) — privacy
- [ ] Graceful empty-canvas handling — table stakes
- [ ] URL-length guard with truncate + clipboard fallback — required for large molecules
- [ ] Opens prefilled `issues/new` in a new tab (`rel="noopener"`) — table stakes

### Add After Validation (v1.x)

- [ ] Contextual "report this explanation/layer" affordance pre-selecting category + offending layer — trigger: users file vague "explanation X is wrong" issues without saying which layer
- [ ] Optional public GitHub @handle field — trigger: maintainer wants a faster contact path than issue comments

### Future Consideration (v2+)

- [ ] GitHub issue *forms* (structured templates) instead of URL params — trigger: feedback volume grows enough that forms beat URL prefill; partially supersedes the URL-param approach

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Header "Send feedback" link | HIGH | LOW | P1 |
| Accessible `<dialog>` modal shell | MEDIUM | LOW-MEDIUM | P1 |
| Category → label/prefix | HIGH (triage) | LOW | P1 |
| Message textarea | HIGH | LOW | P1 |
| Auto-capture InChI + UA | HIGH | LOW | P1 |
| Auto-capture SMILES + preset name | MEDIUM | MEDIUM (new plumbing) | P1 |
| App version/commit capture | MEDIUM | LOW (build define) | P1 |
| Public-issue disclosure + context preview | HIGH (trust) | LOW-MEDIUM | P1 |
| Opt-out checkbox | MEDIUM | LOW | P1 |
| URL-length guard + clipboard fallback | MEDIUM (large molecules) | MEDIUM | P1 |
| Contextual per-layer report affordance | HIGH (product fit) | MEDIUM-HIGH | P2 |
| Optional GitHub @handle | LOW | LOW | P3 |
| Floating widget | LOW | LOW | (anti-feature — do not build) |

## Competitor Feature Analysis

| Aspect | Typical SaaS widget (Usersnap/Canny) | Plain "Issues" link (many OSS sites) | Our approach |
|--------|--------------------------------------|--------------------------------------|--------------|
| Entry point | Floating bubble | Footer link | Header/footer text link |
| Data collection | Cookies, analytics, screenshots, PII | None | None by us; only on-page molecule/InChI/UA, user-reviewed |
| Backend | Hosted SaaS | None | None (URL construction only) |
| Triage | Tags/boards | Manual | Category → label + title prefix |
| Auth | SaaS account | GitHub login on submit | GitHub login on submit (accepted) |
| Privacy posture | Privacy policy required | Public by nature | Explicit "this is public" + review/opt-out |

## Sources

- GitHub new-issue query parameters (title/body/labels/template/etc.): https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue — HIGH
- sindresorhus/new-github-issue-url (supported fields reference): https://github.com/sindresorhus/new-github-issue-url — HIGH
- GitHub CLI HTTP 414 on long prefilled body (URL-length constraint, real-world): https://github.com/cli/cli/issues/1575 — HIGH
- MDN HTTP 414 URI Too Long (4–8KB common server limits): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/414 — HIGH
- W3C WAI-ARIA APG Dialog (Modal) pattern (focus, Escape, aria): https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ — HIGH
- Deque: WAI-ARIA modal dialog support: https://www.deque.com/blog/aria-modal-alert-dialogs-a11y-support-series-part-2/ — MEDIUM
- Usersnap: website feedback button placement/examples: https://usersnap.com/blog/website-feedback-button/ — MEDIUM (industry practice, used to argue *against* the floating widget here)
- Qualaroo: in-app feedback strategies / button best practices: https://qualaroo.com/blog/in-app-feedback-strategies/ — MEDIUM
- App state (verified by reading source): `src/store.ts`, `src/components/Header.tsx`, `src/lib/handleMolSelectLogic.ts`, `src/data/molecules.ts` — HIGH

---
*Feature research for: in-app feedback via prefilled GitHub issue (static client-side educational tool)*
*Researched: 2026-06-17*
