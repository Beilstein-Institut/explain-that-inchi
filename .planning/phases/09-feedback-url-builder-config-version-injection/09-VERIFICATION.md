---
phase: 09-feedback-url-builder-config-version-injection
verified: 2026-06-17T13:20:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
gaps: []
deferred: []
---

# Phase 09: Feedback URL Builder, Config & Version Injection — Verification Report

**Phase Goal:** A pure, DOM-free `buildFeedbackUrl(message, category, context) -> { url, truncated }` exists, fully unit-tested, that turns a message + category + context snapshot into a correct, length-safe GitHub `issues/new` URL — and the build surfaces a real app version string for the context to carry.
**Verified:** 2026-06-17T13:20:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | `buildFeedbackUrl` returns a GitHub `issues/new` URL with `[Category]` title prefix, message + fenced auto-context body, and redundant `labels=` slug | VERIFIED | `src/lib/buildFeedbackUrl.ts` lines 54, 75–81, 176–179; 38 tests confirm; round-trip URL parse verifies decoded values |
| SC-2 | Special chars `+ / ; , ( ) # =` and newlines round-trip through single `URLSearchParams` encoding — unencoded `#` does not truncate the body | VERIFIED | `assembleUrl()` uses one `new URLSearchParams({...}).toString()` with no nested `encodeURIComponent`; test `FEED-05: round-trip encoding` (5 tests) asserts literal survival and `#hashtag` body integrity |
| SC-3 | Oversized URL > ~7.5 KB budget: SMILES dropped first, then InChI trimmed with `...[truncated]` marker; message preserved intact; `truncated: true` reported | VERIFIED | Truncation loop (lines 218–256) implements exact D-13 order; `FEED-07` describe (7 tests) asserts `truncated:true`, byte length `<= 7680`, message verbatim, SMILES absent, truncation marker present |
| SC-4 | `@` in user-supplied text is neutralized so submissions cannot ping GitHub users | VERIFIED | `neutralizeMentions()` replaces `@` with `(at)` (no `@` char remains); applied to message before title and body composition; 3 `@-neutralization` tests verify title and body both clean |
| SC-5 | Running app exposes a non-`0.0.0` version/commit string via Vite `define`, with `git describe --tags --always` → `$GITHUB_SHA` → `dev` fallback order, `package.json` bumped | VERIFIED | `package.json` version = `1.2.0` (confirmed); `vite.config.ts` lines 12–76: `readFileSync`-based version read, `resolveCommitSha()` with tag-collision guard, `GITHUB_SHA` CI fallback, `'dev'` literal; both defines `JSON.stringify`'d; `src/vite-env.d.ts` declares both ambient consts; `tsc -b` clean |

**Score: 5/5**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/buildFeedbackUrl.ts` | Pure URL builder, named export, no DOM | VERIFIED | 259 lines; exports `buildFeedbackUrl`, `FeedbackCategory`, `FeedbackContext`, `BuildFeedbackUrlOpts`, `BuildFeedbackUrlResult`; no async, no DOM, no default export |
| `src/lib/__tests__/buildFeedbackUrl.test.ts` | Exhaustive vitest coverage grouped by FEED-04/05/07 | VERIFIED | 517 lines; 38 tests across 6 `describe` blocks; all pass |
| `package.json` | version = "1.2.0" | VERIFIED | `node -e` confirmed `"version": "1.2.0"` |
| `vite.config.ts` | `__APP_VERSION__` / `__APP_COMMIT__` defines + fallback chain | VERIFIED | Lines 12–76 implement full D-10 chain with tag-collision guard |
| `src/vite-env.d.ts` | `declare const __APP_VERSION__: string` and `__APP_COMMIT__` | VERIFIED | Lines 3–4 confirmed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `buildFeedbackUrl.ts` | `URLSearchParams` | Single-pass encoding, no nested `encodeURIComponent` | WIRED | `assembleUrl()` constructs `new URLSearchParams({title, body, labels})` and appends `.toString()` once |
| `buildFeedbackUrl.ts` | `TextEncoder` | Byte-budget measurement of the final URL | WIRED | Lines 218, 224, 241, 250: `new TextEncoder().encode(url).length` guards every re-encode point |
| `buildFeedbackUrl.test.ts` | `buildFeedbackUrl.ts` | Round-trip parse `new URL(url).searchParams.get('body')` | WIRED | All test assertions decode through `new URL(url).searchParams.get(...)` |
| `vite.config.ts` | `package.json` | `readFileSync` + `JSON.parse` (no `resolveJsonModule`) | WIRED | Line 13: `readFileSync(new URL('./package.json', import.meta.url), 'utf-8')` |
| `vite.config.ts` | `process.env.GITHUB_SHA` | CI fallback sha source after `git describe` | WIRED | Line 45: `const envSha = process.env.GITHUB_SHA` |

---

### Data-Flow Trace (Level 4)

`buildFeedbackUrl.ts` is a pure transform (no state, no render) — Level 4 data-flow tracing is not applicable. The function takes explicit inputs and returns a composed string; no store, no fetch, no component tree.

For the version injection: `__APP_VERSION__` and `__APP_COMMIT__` are baked into the bundle at build time via Vite `define`. The Phase 10 caller is responsible for assembling `"v{__APP_VERSION__} ({__APP_COMMIT__})"` and passing it as `context.appVersion` — explicitly deferred to Phase 10 and confirmed not a gap for this phase.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite (244 tests) | `npx vitest run` | 14 files, 244 tests passed | PASS |
| buildFeedbackUrl suite (38 tests) | `npx vitest run src/lib/__tests__/buildFeedbackUrl.test.ts` | 38/38 passed | PASS |
| TypeScript check | `npx tsc -b` | exit 0, no output | PASS |
| package.json version | `node -e "console.log(require('./package.json').version)"` | `1.2.0` | PASS |

---

### Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| FEED-04 | 09-02 | Category prefix in title + labels= slug | SATISFIED | All 5 category mappings confirmed in `CATEGORY_MAP`; 9 title-prefix tests pass |
| FEED-05 | 09-02 | Single-pass encoding, round-trip special chars, @-neutralization | SATISFIED | `URLSearchParams` single pass; round-trip tests assert `+ / ; , ( ) # =` survival; `@` replaced with `(at)` |
| FEED-07 | 09-02 | ~7.5 KB byte-budget truncation, SMILES-first, message intact | SATISFIED | Binary-search shrink loop; 7 truncation tests including multi-fragment repro fixture (100x toluene+benzene + 200x SMILES) |
| FEED-09 | 09-01 | Non-`0.0.0` version/commit in build, real sha or `dev` | SATISFIED | `package.json` v1.2.0; `vite.config.ts` full fallback chain; ambient types; `tsc -b` clean |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

Scanned `src/lib/buildFeedbackUrl.ts`, `src/lib/__tests__/buildFeedbackUrl.test.ts`, `vite.config.ts`, `src/vite-env.d.ts`, `package.json` for `TBD`, `FIXME`, `XXX`, `TODO`, `placeholder`, `return null`, `return []`, hardcoded empty assigns. None present in phase-modified files.

---

### Human Verification Required

None. All phase-09 deliverables are pure-function contracts verified by automated tests. UI wiring (the dialog that calls `buildFeedbackUrl` and passes `__APP_VERSION__`/`__APP_COMMIT__` as `context.appVersion`) is explicitly deferred to Phase 10.

---

### Gaps Summary

No gaps. All five ROADMAP.md success criteria are satisfied by the codebase evidence:

- `buildFeedbackUrl` is a real, non-stub implementation (259 lines, all D-01..D-13 behaviors implemented).
- 38 requirement-grouped tests are green and cover every required behavior including the multi-fragment truncation repro.
- Version injection is wired in `vite.config.ts` with the full D-10 fallback chain, ambient types declared, `tsc -b` clean.
- Full suite (244 tests) passes; no regressions.

---

_Verified: 2026-06-17T13:20:00Z_
_Verifier: Claude (gsd-verifier)_
