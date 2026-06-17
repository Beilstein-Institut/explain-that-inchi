# Project Research Summary

**Project:** Explain that InChI — v1.2 "Send feedback" feature
**Domain:** Client-side prefilled-GitHub-issue feedback in a static, no-backend React/Vite/Ketcher SPA (GitHub Pages)
**Researched:** 2026-06-17
**Confidence:** HIGH

## Executive Summary

The v1.2 feedback feature is a **purely client-side URL construction problem**, not an integration problem. All four research agents converged on the same verdict: a small "Send feedback" control opens a lightweight in-app modal (native `<dialog>`), collects a category + short message, snapshots the current app context (InChI, SMILES, preset name, browser UA, app version), and opens a **prefilled `github.com/cm-beilstein/explain-that-inchi/issues/new` URL in a new tab**. No backend, no API token, no network call until the user clicks through. The implementation needs **zero new npm dependencies** — native `URL`/`URLSearchParams` plus one Vite build-time `define` for version injection. The agents are explicit and unanimous: **do NOT add `new-github-issue-url`** (a trivial native-API wrapper) or any feedback SaaS.

The single dominant risk, agreed across STACK, FEATURES, ARCHITECTURE, and PITFALLS, is **GitHub's ~8 KB (8191-byte) server-side URL cap**. Multi-fragment InChI strings — the app's whole reason to exist — plus SMILES, UA, version, and percent-encoding overhead (each special char becomes 3 bytes) can blow past this, yielding a 414 error or a silently-clipped body missing the very InChI it was meant to carry. The mitigation is a **`TextEncoder` byte-budget guard (~7-7.5 KB)** inside a pure, testable URL builder, with **deterministic truncation of auto-context only (never the user's message)** and a **clipboard fallback** for pathological molecules. The secondary risks all have clean, well-understood fixes: single-`URLSearchParams` encoding (no double-encoding), fenced code blocks for all auto-context plus `@`-mention neutralization in user prose, synchronous/anchor-based tab opening to dodge popup blockers, title-prefix categorization (because `labels=` is silently dropped for non-collaborators), and honest "this opens a PUBLIC GitHub issue, account required" copy.

Architecturally the feature is **purely additive and drops in cleanly**. The keystone is a pure `buildFeedbackUrl(message, category, context) -> { url, truncated }` module with no DOM/React/async — the testable seam where all the hard logic (encoding, byte cap, templating, label mapping) lives. The only non-obvious decision is the **three-way split of context source-of-truth**: InChI from the Zustand store (verbatim passthrough — never re-run `getInchi`, per the MEMORY rule), SMILES from `ketcher.getSmiles()`, preset name from `MOLECULES.find(selectedMolId)` in App.tsx local state (`null` = custom). All three are read **imperatively at submit time** (`getState()` / `ketcherRef.current`) to honor the existing stale-closure discipline. The Ketcher canvas, store, highlight pipeline, and InChI parse path are all untouched.

## Key Findings

### Recommended Stack

Zero new runtime dependencies. The feature is built from platform-native browser APIs plus the existing Vite build. See `STACK.md` for the full GitHub query-param API table and the version-injection snippet.

**Core technologies:**
- **`URL` + `URLSearchParams` (native)**: build/encode the `issues/new` query string — correct percent-encoding of newlines, markdown, `/ + ; , ( ) # =` with one mechanism, zero deps.
- **`TextEncoder` (native)**: measure encoded **byte** length (not `.length`) to enforce the ~8 KB cap.
- **Vite `define` (build-time)**: inject app version + git SHA (`git describe --tags --always`, with `$GITHUB_SHA` CI fallback) — reuses the existing `processShim` define; `package.json` version is `0.0.0` and must be bumped.
- **GitHub `issues/new` query-param API**: the submission target — just a URL opened in a new tab; no API, no auth.

**Explicitly rejected:** `new-github-issue-url`, `@octokit`/REST clients, `axios`/`fetch` to GitHub, analytics/error SDKs (Sentry), `qs`/`query-string`, hardcoded SHA.

### Expected Features

The mechanism is decided; the resolved design questions are entry-point, modal-vs-deeplink, categories, privacy, and a11y. See `FEATURES.md` for the full prioritization matrix and app-state dependency table.

**Must have (table stakes):**
- Discoverable "Send feedback" entry point — header/footer text link (NOT a floating widget).
- Prefilled title + body with auto-captured context (InChI, SMILES, preset, UA, version).
- Opens in a **new tab** (`target="_blank" rel="noopener"`) — navigating away would destroy the in-progress drawing.
- Graceful empty-canvas handling (omit/label the context block when `inchi === ''`).
- Plain "this opens a PUBLIC GitHub issue" disclosure.
- On-brand styling (oklch tokens, IBM Plex).

**Should have (competitive, low cost):**
- Modal-first flow (native `<dialog>`: focus trap, Escape, `aria-labelledby` for free).
- Category selector -> title prefix + best-effort label.
- Context preview ("what will be included") + a single "include molecule & environment" opt-out checkbox.
- URL-length guard with truncate-marker + clipboard fallback.

**Defer (v1.x / v2+):**
- Contextual "report this layer" affordance (high product fit, needs hover/layer hooks — defer).
- Optional public GitHub @handle field.
- YAML issue *forms* with per-field prefill (raw `?body=` markdown is recommended for v1.2; forms add repo surface and ignore `body`).

### Architecture Approach

Additive: one pure lib module, one config module, one optional impure collector, one modal component, one trigger, and small edits to `App.tsx` + `vite.config.ts`/`vite-env.d.ts`. The feature adds **no fields to the Zustand store** (feedback is ephemeral UI state). See `ARCHITECTURE.md` for the component diagram, the source-of-truth decision block, and the TDD-first build order.

**Major components:**
1. **`lib/feedbackUrl.ts`** (NEW, PURE) — `buildFeedbackUrl(message, category, context) -> { url, truncated }`. Owns templating, label mapping, encoding, and the byte-cap truncation. No DOM/async/React — the unit-testable crown jewel.
2. **`lib/feedbackConfig.ts`** (NEW) — repo slug constant, category->label/prefix maps, `URL_BYTE_CAP`.
3. **`getFeedbackContext` callback** (in App, or `lib/getFeedbackContext.ts`) — impure submit-time snapshot: InChI from `useInchiStore.getState().inchi`; SMILES from `ketcherRef.current.getSmiles()`; preset from `MOLECULES.find(m => m.id === selectedMolId)`; UA from `navigator.userAgent`; version from `import.meta.env.VITE_APP_VERSION`.
4. **`FeedbackModal.tsx` + `.module.css`** (NEW) — native `<dialog>` form (message, category, preview, opt-out, public-issue disclosure); leaf sibling, never wraps KetcherPanel.
5. **`FeedbackButton`** (NEW) — trigger, likely in `Header`.
6. **`vite.config.ts` / `vite-env.d.ts`** (MODIFIED) — build-time version injection.

### Critical Pitfalls

Top items from `PITFALLS.md` (10 total, with a phase mapping and a "looks done but isn't" checklist):

1. **~8 KB URL cap -> 414 / silent clip** (P1, the #1 real risk) — build URL, measure `new TextEncoder().encode(url).length`, budget ~7.5 KB, truncate auto-context deterministically (drop SMILES -> trim InChI with `...[truncated]` marker -> keep user message intact), clipboard fallback. Test against the multi-fragment repro molecule from HANDOFF.md, not short presets.
2. **Encoding / double-encoding** (P2) — use exactly one `URLSearchParams`; never pre-encode values fed into it. Unencoded `#` truncates the body as a fragment. Gate with a round-trip parse test over `+ / ; , ( ) # =`.
3. **Markdown injection / `@`-mention pings** (P3) — fence ALL auto-context in code blocks; neutralize `@` in user prose; build no raw HTML.
4. **Popup/tab blocked** (P4) — no `await` before opening; prefer a real `<a href target=_blank rel="noopener noreferrer">` triggered by the user gesture, or synchronous `window.open(..., 'noopener')`.
5. **`labels=` silently dropped for non-collaborators** (P9) — categorize via **title prefix** (`[Bug]`, `[Explanation]`, `[Highlighting]`, `[Suggestion]`, `[Feedback]`) with `labels=` as a redundant best-effort. Plus: empty-canvas body (P7), public/account-required copy (P5), privacy over-capture / trim UA (P6), repo-slug + base-path correctness (P8), mobile-app deeplink steals prefill (P10).

## Implications for Roadmap

The TDD-first build order from ARCHITECTURE.md and the pitfall-to-phase mapping align almost perfectly. Suggested structure (this is a small, single-milestone feature — phases are lightweight slices):

### Phase 1: Pure URL builder + config (the testable core)
**Rationale:** Everything hard lives here, it's fully DOM-free, fastest to land, and de-risks the #1 pitfall before any UI exists. ARCHITECTURE explicitly names it the keystone and step 1-2 of the build order.
**Delivers:** `lib/feedbackConfig.ts` (repo slug, category prefix/label maps, byte cap) + `lib/feedbackUrl.ts` with `buildFeedbackUrl() -> { url, truncated }`, fully unit-tested.
**Addresses:** auto-captured context templating, category->prefix/label, single-`URLSearchParams` encoding.
**Avoids:** P1 (byte-budget + truncation), P2 (round-trip encoding), P3 (fenced context + `@` neutralization), P7 (empty-canvas body), P9 (title-prefix categorization). Tests use the multi-fragment repro molecule and a special-char round-trip.

### Phase 2: Build-time version injection
**Rationale:** Independent, tiny, and a context field the builder consumes. Bump `package.json` from `0.0.0`.
**Delivers:** `vite.config.ts` `define` for `import.meta.env.VITE_APP_VERSION` (`git describe --tags --always` / `$GITHUB_SHA` fallback) + `vite-env.d.ts` typing.
**Uses:** existing Vite `define`/`processShim` mechanism.
**Avoids:** P8 (version via build, not page-URL parsing).

### Phase 3: Context collector + modal UI + entry point
**Rationale:** Depends on Phases 1-2; the pure builder is already proven so component tests stay light. Groups the impure submit-time snapshot with the `<dialog>` form and trigger.
**Delivers:** submit-time `getFeedbackContext` (3-way source split), `FeedbackModal.tsx` + `.module.css` (message, category, preview, opt-out, public-issue disclosure), `FeedbackButton`/Header slot, and `App.tsx` wiring (`feedbackOpen` state, mount modal as leaf sibling).
**Implements:** the modal-first flow, a11y via native `<dialog>`, source-of-truth reads.
**Avoids:** P4 (anchor/synchronous open — recommend reactive `<a href>`), P5 (account-required copy), P6 (trimmed UA + preview), P7 (graceful empty canvas), Anti-Pattern 1 (never remount Ketcher), Anti-Pattern 2/3 (imperative submit-time reads; never re-run `getInchi`).

### Phase 4 (repo-side, non-code): Labels, issue template, triage
**Rationale:** Some mitigations live in repo settings, not app code, and can run in parallel/after.
**Delivers:** create `explanation`/`highlighting`/`feedback` labels (or accept title-prefix-only), optional `.github/ISSUE_TEMPLATE/config.yml`, optional auto-label workflow, interaction limits.
**Avoids:** P9 (labels exist), spam/abuse mitigation.

### Phase Ordering Rationale
- **Pure-before-impure:** the URL builder has no dependencies and absorbs every critical pitfall, so it goes first and is proven by tests before UI is written.
- **Version injection is independent** and small — sequence it early so Phase 3's collector has a real version string.
- **Collector + modal + wiring group together** because they share the submit-time data flow and the modal can't be meaningfully tested without the builder.
- **Repo-side config is decoupled** from code and flagged separately so it isn't mistaken for an implementation task.

### Research Flags

Phases with standard patterns (skip `--research-phase`):
- **Phase 1:** GitHub query-param API and `TextEncoder` byte budgeting are fully documented in STACK/PITFALLS — execute directly.
- **Phase 2:** Vite `define` injection is a known, in-repo pattern — execute directly.
- **Phase 3:** Native `<dialog>` a11y, the source-of-truth split, and popup mitigation are all resolved in ARCHITECTURE/FEATURES/PITFALLS — execute directly.
- **Phase 4:** Standard GitHub repo settings — no research.

No phase needs deeper research. The only project-specific uncertainty (the exact byte cutover) is handled empirically by the budget guard, not by more research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Native APIs + documented GitHub params; the ~8 KB exact number is MEDIUM (empirical/undocumented) but the existence of a hard cap is HIGH. |
| Features | HIGH | Pattern is well-trodden; modal a11y and GitHub params documented; only the precise byte-budget cutover is project-specific (MEDIUM). |
| Architecture | HIGH | Grounded in the real source files; purely client-side, additive; no external API dependency. |
| Pitfalls | HIGH | GitHub URL limit + prefill params officially documented; encoding/popup/markdown are established web-platform facts. |

**Overall confidence:** HIGH

### Gaps to Address
- **Exact byte cap (MEDIUM):** treat 8191 bytes as empirical; budget ~7.5 KB for headroom and validate the truncation path against the HANDOFF.md multi-fragment repro fixture rather than trusting a precise number.
- **Label existence (MEDIUM):** `explanation`/`highlighting`/`feedback` labels may not exist in the repo; verify in repo settings (Phase 4) or rely on title-prefix categorization — a one-line settings action, never a code blocker.
- **Mobile-app deeplink (MEDIUM):** GitHub mobile app may ignore the prefill; document as a known limitation with a clipboard fallback rather than over-engineering (mobile is secondary per PROJECT.md).
- **`getSmiles()` async + popup gesture:** confirm during Phase 3 whether to pre-fetch SMILES on modal-open into a reactive `<a href>` (recommended) vs. detect a blocked `window.open` and show a fallback link.

## Sources

### Primary (HIGH confidence)
- GitHub Docs — creating an issue with query parameters (title/body/labels/template, permission gates) — https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue
- GitHub community discussion #15477 — issue-form field prefill (`template=` + field id; `body` ignored for forms)
- GitHub CLI issue #1575 — real-world HTTP 414 on long prefilled body
- MDN — HTTP 414 URI Too Long (4-8 KB common server limits)
- W3C WAI-ARIA APG Dialog (Modal) pattern — focus/Escape/aria
- sindresorhus/new-github-issue-url — reference impl confirming native-URL approach (cited as what NOT to add)
- Project source (read directly): `src/App.tsx`, `src/store.ts`, `src/components/Header.tsx`, `src/components/InchiSection.tsx`, `src/data/molecules.ts`, `src/lib/handleMolSelectLogic.ts`, `vite.config.ts`
- MEMORY: "never reconstruct InChI — always display verbatim Ketcher output" (drives read-InChI-from-store)

### Secondary (MEDIUM confidence)
- github/docs issue #5136 — undocumented ~8191-byte server-side URL cap (existence HIGH, exact number empirical)
- GitHub community discussion #113726 — mobile app intercepts prefilled new-issue links, ignores prefill
- GitHub community discussion #22946 — passing long body to issues/new
- Vite `define` build-time constant injection — https://vite.dev/config/shared-options.html#define
- Usersnap / Qualaroo — industry feedback-widget practice (used to argue AGAINST a floating widget)

### Tertiary (LOW confidence)
- None — all findings are documented or source-verified.

---
*Research completed: 2026-06-17*
*Ready for roadmap: yes*
