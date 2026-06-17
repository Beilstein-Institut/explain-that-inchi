# Stack Research

**Domain:** In-app "Send feedback" → prefilled GitHub new-issue link (static client-side React/Vite app, no backend)
**Researched:** 2026-06-17 (v1.2 milestone)
**Confidence:** HIGH

## TL;DR

**No new npm dependencies are needed.** This feature is built entirely with platform-native
`URL` / `URLSearchParams` (browser built-ins) plus one tiny Vite build-time `define` to inject
the app version + git commit SHA. GitHub's `issues/new` endpoint accepts `title`, `body`,
`labels`, `template`, `assignees`, `milestone`, `projects` as query params. The single real
constraint is the **~8 KB total URL length cap** (server-side, GitHub/proxy), which a long
InChI/SMILES + user-agent body can exceed — mitigate by **building the URL, measuring its
encoded byte length, and truncating/omitting the auto-captured context block before it crosses
~7 KB**, with a clipboard fallback for pathological molecules.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `URLSearchParams` (Web API) | native (browser) | Build the query string with correct percent-encoding of `title`/`body`/`labels` | Zero-dependency; correctly encodes newlines (`%0A`), spaces, markdown, commas. Spec-stable, supported in all target browsers. |
| `URL` (Web API) | native (browser) | Assemble base + query into one canonical string | Native; single string to length-check against the 8 KB cap. |
| Vite `define` (build-time) | Vite 8 (already in stack) | Inject `__APP_VERSION__` + `__GIT_SHA__` constants at build | No backend; values baked into the static bundle. Reuses the existing `define` mechanism already in `vite.config.ts`. |
| GitHub `issues/new` query-param API | github.com (live) | The submission target — opens a prefilled new-issue page | Already the decided mechanism; purely a URL the browser opens via anchor `href` / `window.open`. |

### Supporting Libraries

**None required.** Explicitly do not add a library for this (see "What NOT to Use").

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `git rev-parse --short HEAD` | Produce the short commit SHA at build time | Run inside `vite.config.ts` via `node:child_process`; fall back to GitHub Actions `$GITHUB_SHA`. |
| `package.json` `version` field | Human-readable app version | Currently `0.0.0` — bump to a real version (e.g. `1.2.0`) so the feedback body carries a meaningful version string. |

## GitHub `issues/new` Query-Param API (verified)

Base URL for this repo:
`https://github.com/cm-beilstein/explain-that-inchi/issues/new`

| Param | Effect | Encoding / format notes |
|-------|--------|-------------------------|
| `title` | Prefills issue title | Plain percent-encoded text. |
| `body` | Prefills issue body (markdown) | Markdown rendered. **Newlines must be `%0A`** (LF). `URLSearchParams` encodes `\n` → `%0A` automatically. Spaces encode as `+` (GitHub accepts both `+` and `%20`). |
| `labels` | Adds labels | **Comma-separated** in a single param: `labels=bug,feedback`. Each label must already exist in the repo AND the visitor needs triage permission for labels to stick — for anonymous public visitors, labels may be silently dropped. Also encode the category as a `title` prefix. |
| `template` | Selects a template from `.github/ISSUE_TEMPLATE/` | Value is the template filename, e.g. `template=feedback.yml`. |
| `assignees` | Comma-separated usernames | Permission-gated; not needed here. |
| `milestone` | Milestone number/name | Permission-gated; not needed here. |
| `projects` | Adds to a project | Not needed here. |

**Key behavioral facts (verified):**
- `labels`, `assignees`, `milestone`, `projects` only apply if the submitting user has the
  relevant repo permission. Anonymous / non-collaborator visitors → these are **dropped silently**.
  → **Do not rely on `labels` for categorization. Encode category in the `title` prefix and/or
  body, and treat `labels` as a best-effort nicety for maintainers.**
- `template` vs `body`: if you point at a YAML **issue form**, the `body` param is ignored and
  you instead prefill **individual form fields by their `id`** (e.g.
  `?template=feedback.yml&inchi=InChI%3D1S...&smiles=...`). With a plain markdown template or no
  template, use the single `body` param. (Confirmed via GitHub community discussion #15477.)
- The GitHub **mobile app**, if installed, can intercept the link and **fail to prefill** fields
  (community discussion #113726). Accepted known limitation; desktop web works correctly.

### URL length limit — THE constraint and its mitigation

- **Issue body storage limit:** 65,536 codepoints (NOT the binding constraint here).
- **Binding constraint — total request URL length:** GitHub's server (and intermediate
  proxies/browsers) reject overly long request URIs. The widely-reported practical ceiling is
  **~8,192 bytes (~8 KB) for the whole URL**, producing a "URL too long" / 414-class failure.
  GitHub's own docs issue (github/docs#5136) requests this be documented; it is **not officially
  documented**, so treat 8 KB as empirical (MEDIUM confidence on the exact number; HIGH
  confidence that a hard cap in this range exists).
- **Why it matters here:** A large/polymeric molecule's InChI plus full SMILES plus the
  user-agent string can each be hundreds–thousands of chars; percent-encoding roughly **triples**
  the byte cost of the many non-alphanumeric characters in InChI/SMILES (`=`, `/`, `(`, `)`, `+`
  all → `%XX`). Even a ~2.5 KB raw context block can approach the cap once encoded.

**Mitigation (implement all three, in this order):**
1. **Budget + measure:** After building the full URL string, check its **encoded byte length**
   (`new TextEncoder().encode(url).length`, not `.length`). Target a safe ceiling of **~7,000
   bytes** (headroom below the 8 KB cap).
2. **Graceful degradation of the context block:** If over budget, drop lowest-value fields first:
   (a) truncate/omit the SMILES, (b) truncate the InChI with a clear
   `…(truncated — paste full string below)` marker, (c) always keep the InChI prefix + formula.
   Never let the link silently break.
3. **Clipboard fallback:** If even the minimal body exceeds budget (rare), open the issue page
   with only `title` + a short note and copy the full context block to the clipboard (reuse the
   existing PLSH-04 clipboard pattern), instructing the user to paste it. Robust for any molecule
   size, zero backend.

### Issue forms (`.yml`) vs raw `?body=` — recommendation

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Raw `?body=` (markdown)** | Single param; full layout control; no repo file to maintain; works anonymously; trivial to assemble client-side | All context in one free-text blob; no enforced structure | **Recommended for v1.2.** Simplest, zero new repo surface, robust. |
| **YAML issue form (`?template=feedback.yml&field=…`)** | Structured fields; nicer triage; required-field validation | Must author + commit a `.yml` form; prefill is per-field-`id` (more URL plumbing); `body` ignored; same 8 KB cap; mobile interception still applies | Optional future polish; marginal gain. |

→ **Use raw `?body=` with a hand-authored markdown template string in code.** Optionally add a
`.github/ISSUE_TEMPLATE/config.yml` later if maintainers want a labeled chooser; not required.

## Build-time version/commit injection (Vite, no backend)

Extend the **existing** `define` block in `vite.config.ts` (it already uses `define` for the
process shim, so this is minimal and idiomatic):

```ts
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

function gitSha(): string {
  // Prefer CI-provided SHA (GitHub Actions sets GITHUB_SHA); fall back to local git.
  const ci = process.env.GITHUB_SHA;
  if (ci) return ci.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

const appMeta = {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __GIT_SHA__: JSON.stringify(gitSha()),
};
// then: defineConfig({ define: { ...processShim, ...appMeta }, ... })
```

Declare the globals once for TypeScript (e.g. `src/vite-env.d.ts`):
```ts
declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;
```

Usage: `` `v${__APP_VERSION__} (${__GIT_SHA__})` ``.

**Notes:**
- The default `actions/checkout` provides git for `git rev-parse`, but the `GITHUB_SHA` env
  fallback makes it robust to shallow/odd checkouts. HIGH confidence: `GITHUB_SHA` is always set
  in Actions.
- Alternative `import.meta.env`: only exposes `VITE_`-prefixed vars from `.env`/shell. You could
  do `VITE_GIT_SHA=$(git rev-parse --short HEAD) vite build`, but the `define` approach keeps
  everything self-contained in `vite.config.ts` with a local-dev fallback — prefer `define`.
- User-agent needs no build injection — read `navigator.userAgent` at runtime in the browser.

## Installation

```bash
# No runtime dependencies to install.
# No dev dependencies to install (git + node:child_process are already available).
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Native `URLSearchParams` | `new-github-issue-url` (sindresorhus) | Never for this project — a ~20-line wrapper over the same native API; adds a dependency + supply-chain surface for zero gain. |
| Vite `define` for version/SHA | `vite-plugin-package-version` / git plugins | Never needed — a 10-line inline function in the existing config is clearer and dependency-free. |
| Raw `?body=` markdown | `.yml` issue form + per-field prefill | If maintainers later want structured, validated triage fields. Adds repo files; defer. |
| `title`-prefix categorization | `labels=` param | Use `labels` additionally (best-effort) but never rely on it — dropped for anonymous visitors. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `new-github-issue-url` (npm) | Trivial native-API wrapper; unnecessary dependency + supply-chain risk | `URL` + `URLSearchParams` |
| `@octokit/*` / GitHub REST API client | Requires auth tokens + a backend/secret store — violates no-backend constraint | Plain prefilled-URL link (no API call) |
| `axios` / `fetch` to GitHub | No network call is made; the feature only opens a URL | `window.open(url, '_blank', 'noopener')` or anchor `href` |
| Analytics / error-reporting SDK (Sentry, etc.) | Out of scope; adds backend + privacy surface | The manual prefilled-issue link |
| `qs` / `query-string` npm packages | `URLSearchParams` covers all needed encoding natively | `URLSearchParams` |
| Hardcoding the commit SHA in source | Goes stale every commit; merge noise | Build-time `define` injection |
| Relying on `labels=` for category routing | Silently dropped for non-collaborator visitors | Encode category in `title` prefix + body; `labels` best-effort only |

## Stack Patterns by Variant

**If the encoded URL stays under ~7 KB:**
- Use a single `?title=…&body=…&labels=…` raw-body link. Simplest path.

**If the molecule is large (long InChI/SMILES) and the URL would exceed ~7 KB:**
- Truncate SMILES → then InChI (with explicit truncation marker) → finally fall back to
  clipboard-copy of full context + a minimal prefilled link.

**If maintainers later want structured triage:**
- Add `.github/ISSUE_TEMPLATE/feedback.yml` issue form, switch to
  `?template=feedback.yml&<fieldId>=…` per-field prefill (note: `body` param then ignored).

## Version Compatibility

| Item | Compatible With | Notes |
|------|-----------------|-------|
| `URLSearchParams` / `URL` | All target evergreen browsers | Same baseline Ketcher WASM already requires; no polyfill. |
| Vite `define` injection | Vite 8 (current) | Reuses existing `define` in `vite.config.ts`; no plugin needed. |
| `GITHUB_SHA` env | GitHub Actions (current CD) | Always set; safe CI fallback for `git rev-parse`. |
| GitHub query-param API | github.com (cm-beilstein/explain-that-inchi) | Live web feature; no pinning. Mobile-app interception is a known, accepted edge case. |

## Sources

- GitHub Docs — Creating an issue / automation with query parameters (title, body, labels, milestone, assignees, template, projects) — https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue — HIGH
- GitHub Docs issue #5136 "Document GitHub serverside limit on URL length" (confirms undocumented ~8 KB request-URL cap) — https://github.com/github/docs/issues/5136 — MEDIUM (exact byte number empirical)
- dead-claudia/github-limits (issue body max 65,536 codepoints; comment 262,144 bytes) — https://github.com/dead-claudia/github-limits — HIGH (body limits); does not document URL cap
- GitHub community discussion #15477 "Pre-populate issue forms HTTP supplied values" (issue-form field prefill via `template=` + field `id`; `body` ignored for forms) — https://github.com/orgs/community/discussions/15477 — HIGH
- GitHub community discussion #113726 (mobile app intercepts prefilled new-issue links; fields not prefilled) — https://github.com/orgs/community/discussions/113726 — MEDIUM
- sindresorhus/new-github-issue-url (reference impl confirming native-URL approach; cited as what NOT to add) — https://github.com/sindresorhus/new-github-issue-url — HIGH
- Vite `define` config (build-time constant injection) — existing project `vite.config.ts` + https://vite.dev/config/shared-options.html#define — HIGH

---
*Stack research for: in-app prefilled-GitHub-issue feedback (v1.2)*
*Researched: 2026-06-17*
