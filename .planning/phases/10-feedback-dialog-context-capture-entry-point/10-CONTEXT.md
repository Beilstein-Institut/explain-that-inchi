# Phase 10: Feedback dialog, context capture & entry point - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the **user-facing shell** for in-app feedback: a "Send feedback" entry control, an
on-brand native `<dialog>` modal (category + message + always-visible context preview + privacy
copy), submit-time context capture, the gesture-anchor open into a prefilled GitHub `issues/new`
tab, and the truncation-only clipboard fallback.

Requirements covered: **FEED-01, FEED-02, FEED-03, FEED-06, FEED-08**.

In scope: the entry-point button, the dialog component + its open/close/reset state, the radio
category selector, the message field, the always-visible context preview, the inline public-issue
warning, App-side submit-time context assembly (verbatim store `inchi`, live `getSmiles()`, preset
name, full UA, app version), wiring the dialog's submit to `buildFeedbackUrl()` via a real
user-gesture anchor, and the clipboard fallback when the builder reports `truncated: true`.

Out of scope: the URL/encoding/budget/truncation logic itself (Phase 9 — `buildFeedbackUrl()` is
done and locked), the issue body/title/category/placeholder *templates* (locked by Phase 9
D-01..D-13), and any backend / SaaS / auth (hard project constraint). Visual fidelity (exact
spacing, colour tokens, type) is refined next in `/gsd-ui-phase 10` — this CONTEXT locks decisions,
not pixels.
</domain>

<decisions>
## Implementation Decisions

### Entry-point placement & affordance (FEED-01)
- **D-01:** The "Send feedback" control is a **pill button**, **right-aligned in a new thin toolbar
  row placed between `<Header />` and `<KetcherPanel />`** in `App.tsx`'s flat layout. NOT in the
  Header `.meta` markup, NOT a floating/fixed overlay, NOT a footer — a dedicated toolbar strip
  above the canvas.
- **D-02:** The control and dialog mount as **leaf siblings** in the App tree; opening/closing must
  NOT remount `KetcherPanel`, re-init Ketcher, touch the Zustand store, or re-run `getInchi`
  (FEED-01 hard constraint). Dialog open/close lives in **local React state**, not the store.

### Dialog layout & copy (FEED-02, FEED-03, FEED-06)
- **D-03:** Category selector is a **vertical radio-button list** showing all five categories at
  once (Bug · Explanation wrong/confusing · Highlighting wrong · Suggestion · General). No dropdown,
  no segmented pills. Labels are the exact `FeedbackCategory` union strings from `buildFeedbackUrl.ts`.
- **D-04:** Free-text **message field** (textarea) for the user's feedback.
- **D-05:** The **auto-captured context preview is ALWAYS visible** in the dialog (not behind a
  toggle) — a read-only/monospace block showing InChI, SMILES, preset, user-agent, and app version
  exactly as they will be attached. Maximum transparency per FEED-06.
- **D-06:** The "submitting opens a **PUBLIC** GitHub issue and requires a GitHub account" warning
  is an **inline note placed near the submit button** (read at the decision moment), not a top
  callout banner.
- **D-07:** Use a **native `<dialog>`** element (modal). Lean on its built-in behaviours (Escape to
  close, backdrop, focus trapping) rather than re-implementing — exact keyboard/backdrop polish is
  `/gsd-ui-phase` / planner territory.

### Submit flow & post-submit behaviour (FEED-08, consumes FEED-04)
- **D-08:** Submit opens the prefilled GitHub `issues/new` page **in a new tab via a real
  user-gesture anchor** (`<a target="_blank" rel="noopener">` clicked synchronously in the submit
  handler — no `await` between the click and the open, so it is not popup-blocked). The URL comes
  from `buildFeedbackUrl()`.
- **D-09:** **Normal (non-truncated) submit → close the dialog AND reset the form** (category +
  message cleared) after opening the tab.
- **D-10:** **Truncated submit (`truncated: true`) → the dialog STAYS OPEN** after opening the tab
  and reveals a **"Copy full issue body"** action plus a short note (e.g. "The InChI was shortened
  in the URL — paste the full body into the issue"). The user copies, then closes manually. Only the
  truncated path surfaces the clipboard fallback; non-truncated submissions never show it.
- **D-11:** The clipboard fallback copies the **full, untruncated issue body** (message + full
  context). This body MUST be sourced from the builder module as the single source of truth — the
  dialog MUST NOT re-assemble the body template. Extend `buildFeedbackUrl` to also return the full
  untruncated body (e.g. add a `fullBody` field to `BuildFeedbackUrlResult`), or expose a sibling
  pure function in `src/lib/buildFeedbackUrl.ts` that composes the body. Do not duplicate Phase 9's
  D-01 template in the dialog. (Aligns with the project rule: never reconstruct/re-join — pass
  through the authoritative string.)

### Context capture wiring (FEED-05, FEED-08)
- **D-12:** SMILES is captured via **live `ketcher.getSmiles()` at submit time** (async — must
  resolve before calling `buildFeedbackUrl`). This reflects the actual canvas, including edited
  presets and fully custom molecules. Do NOT use the static preset SMILES from `MOLECULES`.
- **D-13:** User-agent is the **full `navigator.userAgent`** string verbatim (the builder fences it,
  so no Markdown/mention risk). No browser/OS parsing/summarisation.
- **D-14:** **App.tsx assembles the `FeedbackContext`** at submit time (it already owns `ketcherRef`,
  `selectedMolId`, and reads the store's verbatim `inchi`) and passes the snapshot (or a submit
  callback that produces it) to the dialog. Ketcher glue stays in App; the dialog does not get its
  own `ketcherRef`. Context fields:
  - `inchi`: verbatim from `useInchiStore` (`state.inchi`) — never reconstructed.
  - `smiles`: `await ketcherRef.current?.getSmiles()` (D-12).
  - `presetName`: `MOLECULES.find(m => m.id === selectedMolId)?.name`.
  - `userAgent`: `navigator.userAgent` (D-13).
  - `appVersion`: assembled from `__APP_VERSION__` / `__APP_COMMIT__` into the
    `v{version} ({shortSha})` form Phase 9 D-09 specified.
- **D-15:** **Empty-canvas / no-InChI degradation** relies on Phase 9's locked placeholders (D-03:
  `(no structure loaded)`, `(none)`, `(custom molecule)`). The always-visible preview (D-05) must
  show those same placeholders so what the user sees matches what gets submitted, and submit must
  still succeed with no broken/empty body (FEED-08).

### Claude's Discretion
- Exact button label wording ("Send feedback" is the working label; minor wording at discretion).
- Component/file names and structure (suggest `src/components/FeedbackDialog.tsx` +
  `FeedbackDialog.module.css`, and a small toolbar/control — follow existing component conventions).
- Error handling if `getSmiles()` rejects/throws (fall back to `(none)` / undefined SMILES so submit
  still works — should not block feedback).
- Whether the entry-control row is its own tiny component or inline JSX in `App.tsx`.
- The precise mechanism for the gesture anchor (hidden `<a>` ref + `.click()` vs rendered link) —
  as long as D-08's no-await-before-open / not-popup-blocked guarantee holds.
- Exact shape of the builder extension in D-11 (`fullBody` return field vs sibling export).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — FEED-01, FEED-02, FEED-03, FEED-06, FEED-08 (this phase's locked
  requirements); the Out-of-Scope table (no backend, no SaaS, no auth, no PII).
- `.planning/ROADMAP.md` §"Phase 10" — goal + 5 success criteria (the verification target).
- `.planning/STATE.md` §"v1.2 Key Decisions (carry-forward from research)" — locked mechanism
  decisions (gesture-anchor open, title-prefix categorization, no backend).

### Phase 9 contract (DONE — consumed by this phase)
- `.planning/phases/09-feedback-url-builder-config-version-injection/09-CONTEXT.md` — D-01..D-13:
  body/title templates, the five categories, placeholders, version-string format, byte budget &
  truncation semantics. The issue *content* is locked here; Phase 10 only builds the shell + capture.
- `src/lib/buildFeedbackUrl.ts` — the pure builder consumed at submit. Signature:
  `buildFeedbackUrl({ message, category, context }) -> { url, truncated }`. Exposes
  `FeedbackCategory`, `FeedbackContext`, `BuildFeedbackUrlOpts`, `BuildFeedbackUrlResult`.
  D-11 requires extending this module to also expose the full untruncated body.
- `src/lib/__tests__/buildFeedbackUrl.test.ts` — existing test pattern to extend if D-11 changes the API.

### Research (v1.2 feedback feature)
- `.planning/research/SUMMARY.md` — synthesized approach & rationale.
- `.planning/research/PITFALLS.md` — popup-blocker (no await before open), labels dropping for
  non-collaborators, GitHub ~8 KB URL cap.
- `.planning/research/ARCHITECTURE.md` — pure-builder (Phase 9) vs impure-capture (Phase 10) split.

### Code integration points
- `src/App.tsx` — flat layout (`Header`, `KetcherPanel`, `InchiSection`, `Explanation`); owns
  `ketcherRef`, `selectedMolId`, the highlight/change guards. Toolbar row + dialog mount here (D-01,
  D-02, D-14).
- `src/store.ts` — `useInchiStore`; `state.inchi` is the verbatim Ketcher InChI (D-14).
- `src/data/molecules.ts` — `MOLECULES` / `MoleculePreset`; preset-name lookup (D-14).
- `src/vite-env.d.ts` + `vite.config.ts` — `__APP_VERSION__` / `__APP_COMMIT__` defines (D-14).
- `src/styles.css` + `src/components/*.module.css` — the oklch token system + CSS-module convention
  the dialog/button must follow (on-brand). `Header.tsx` uses global classes; feature components use
  CSS modules — match the component-level pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildFeedbackUrl()` (Phase 9) — fully tested pure builder; the dialog's submit calls it directly.
- `useInchiStore` selector pattern — read `inchi` without subscribing the dialog to unrelated slices.
- CSS-module + oklch token convention (`*.module.css` + `src/styles.css`) for on-brand styling.

### Established Patterns
- `App.tsx` already centralises all Ketcher glue (`ketcherRef`, `getInchi`, highlight guards). Adding
  submit-time `getSmiles()` capture there (D-14) follows that precedent — no new `ketcherRef` holders.
- Components are small and single-purpose with colocated CSS modules and tests (vitest).
- 206+ existing tests pass and `tsc -b` is clean — keep both green; the only lib change is the D-11
  builder extension (with a test).

### Integration Points
- Dialog + entry button are new leaf siblings in `App.tsx`; submit consumes `buildFeedbackUrl()` and
  opens a gesture anchor. Context assembled in App from store `inchi` + live `getSmiles()` + preset +
  UA + version defines.
- No existing `getSmiles()` call — this phase introduces the first one (async at submit).
- No existing toolbar region above the canvas — this phase introduces the thin toolbar row (D-01).
</code_context>

<specifics>
## Specific Ideas

- The dialog is content-locked by Phase 9's approved previews (body/title/category/placeholder) —
  Phase 10 must not redesign that content, only present and submit it.
- Truncation is rare and only triggered by very long InChI/SMILES (multi-fragment repro molecule);
  the stay-open + copy-full-body path (D-10/D-11) is the safety net for exactly that case.
- Transparency is a first-class value here (always-visible preview D-05 + explicit public-issue note
  D-06) — the user explicitly wanted users to see exactly what is attached before submitting.
</specifics>

<deferred>
## Deferred Ideas

- **FEED-F1** contextual "report this layer/explanation" pre-fill — future requirement.
- **FEED-F2** optional GitHub @handle / contact field — future requirement.
- **FEED-F3** anonymous (no-GitHub-account) path via third-party form — future requirement.
- Repo-side label/issue-template/triage setup — non-code maintainer checklist in ROADMAP, not a
  code phase.

None of these arose as scope creep during discussion — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-feedback-dialog-context-capture-entry-point*
*Context gathered: 2026-06-17*
