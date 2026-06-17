# Phase 9: Feedback URL builder, config & version injection - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a **pure, DOM-free** `buildFeedbackUrl(message, category, context) -> { url, truncated }`
that turns a feedback message + category + context snapshot into a correct, length-safe GitHub
`issues/new` URL for `cm-beilstein/explain-that-inchi`, fully unit-tested — **plus** build-time
injection of a real app version string that the context block carries.

Requirements covered: **FEED-04, FEED-05, FEED-07, FEED-09**.

In scope: the pure builder (encoding, byte-budget guard + deterministic truncation,
`@`-neutralization, category title-prefix + redundant `labels=`, body/title composition) and the
Vite `define` version-injection plumbing (incl. `package.json` bump and CI/dev fallbacks).

Out of scope (Phase 10): the feedback dialog/modal, the "Send feedback" entry point, submit-time
context capture (InChI from store, `getSmiles()`, preset lookup, UA), and the clipboard fallback UX.
This phase only *reports* `truncated: true`; consuming it is Phase 10.
</domain>

<decisions>
## Implementation Decisions

### Issue body template (FEED-04, FEED-05)
- **D-01:** Body is **message-first, context-below**. Layout:
  ```
  **Feedback ({Category})**

  <user message>

  ---

  ### Context

  InChI:
  ```
  <inchi or placeholder>
  ```
  SMILES:
  ```
  <smiles or placeholder>
  ```
  Preset: <name or placeholder>
  App: v1.2.0 (<shortSha>)
  User agent:
  ```
  <ua>
  ```
  ```
  `{Category}` is the human label (e.g. "Bug", "Explanation wrong/confusing").
- **D-02:** **All** auto-context values are wrapped in fenced code blocks (InChI, SMILES, user-agent).
  Preset and App version are short single-line labeled fields (no fence needed). Keeps `@`, `#`,
  backticks, and InChI punctuation from being interpreted as Markdown / mentions.
- **D-03:** Missing context renders as **inline placeholder text**, keeping the labeled line/shape stable:
  - InChI absent → `(no structure loaded)`
  - SMILES absent → `(none)`
  - Preset absent (custom molecule) → `(custom molecule)`
  Never omit the field; the block shape is constant.

### Issue title composition (FEED-04)
- **D-04:** Title = `[{CategoryPrefix}] {excerpt}` where `{excerpt}` is the user's message,
  newlines collapsed to single spaces, trimmed, truncated to **~60 chars** with a trailing `…`
  when longer. Example: `[Bug] Highlighting wrong for benzene ring atoms`.
- **D-05:** When the message is empty/whitespace-only, fall back to static title text
  (e.g. `[{CategoryPrefix}] Explain that InChI feedback`) — never a bare `[Bug]`.

### Categories & labels (FEED-02 set, FEED-04 mapping)
- **D-06:** Five categories with title prefix (source of truth) + redundant lowercase `labels=` slug:
  | Category | Title prefix | `labels=` slug |
  |---|---|---|
  | Bug | `[Bug]` | `bug` |
  | Explanation wrong/confusing | `[Explanation]` | `explanation` |
  | Highlighting wrong | `[Highlighting]` | `highlighting` |
  | Suggestion | `[Suggestion]` | `suggestion` |
  | General | `[General]` | `feedback` |
- **D-07:** Pass each category's slug via `labels=` redundantly; the **title prefix is the
  categorizer of record** (labels silently drop for non-collaborators). Slugs match the
  ROADMAP non-code maintainer-checklist label names.

### Version injection (FEED-09)
- **D-08:** Bump `package.json` `version` from `0.0.0` → **`1.2.0`** (matches the v1.2 milestone).
- **D-09:** Surfaced version string format = **`v{pkgVersion} ({shortSha})`**, e.g. `v1.2.0 (abc1234)`.
  When no commit sha is resolvable (local dev with no CI/git info), fall back to
  **`v1.2.0 (dev)`**.
- **D-10:** Sha source order (locked by research): build-time `git describe --tags --always`
  short hash, with `$GITHUB_SHA` (truncated to 7 chars) as the CI fallback, injected via a single
  Vite `define`. Reuse the existing `define` mechanism in `vite.config.ts` (do NOT add a plugin).

### Encoding, byte budget & truncation (FEED-05, FEED-07 — locked by research)
- **D-11:** Single `URLSearchParams` encoding pass; no manual `encodeURIComponent` stacking
  (avoid double-encoding). Round-trip must survive `+ / ; , ( ) # =` and newlines.
- **D-12:** `@` in **user-supplied** text (message) is neutralized so submissions can't ping
  GitHub users. Auto-context is fenced (D-02) which already defuses mentions there.
- **D-13:** Byte budget ≈ **7.5 KB** measured with `TextEncoder` on the final URL. When exceeded,
  reduce auto-context **deterministically**: drop SMILES first, then trim InChI with a
  `...[truncated]` marker. The **user message is never truncated.** Return `truncated: true`
  whenever any reduction occurred. Validate against the multi-fragment repro molecule, not a short preset.

### Claude's Discretion
- Exact excerpt length constant (60 is the target; ±a few chars to avoid mid-word cuts is fine).
- The literal `...[truncated]` vs `…[truncated]` marker spelling, and exact placeholder casing —
  follow the values above unless a test reveals a reason to differ.
- The Vite `define` variable name (e.g. `__APP_VERSION__` / `__APP_COMMIT__`) and how
  `package.json` version is read at build time (import vs env).
- Internal module location/name for the builder (suggest `src/lib/buildFeedbackUrl.ts` alongside
  existing pure parsers, with a colocated `__tests__` file — see code context).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — FEED-04, FEED-05, FEED-07, FEED-09 (this phase's locked requirements);
  also the Out-of-Scope table (no backend, no SaaS, no auth).
- `.planning/ROADMAP.md` §"Phase 9" — goal + 5 success criteria (the verification target).
- `.planning/STATE.md` §"v1.2 Key Decisions (carry-forward from research)" — the locked mechanism
  decisions (native URL/TextEncoder, title-prefix categorization, gesture-anchor open, etc.).

### Research (v1.2 feedback feature)
- `.planning/research/SUMMARY.md` — synthesized approach & decision rationale.
- `.planning/research/PITFALLS.md` — #1 risk = GitHub ~8 KB server-side URL cap; double-encoding;
  unencoded `#` truncating the body; labels dropping for non-collaborators.
- `.planning/research/ARCHITECTURE.md` — pure-builder vs impure-capture split (Phase 9 vs 10).
- `.planning/research/STACK.md` / `.planning/research/FEATURES.md` — supporting context.

### Build config & version
- `vite.config.ts` — existing `define` shim (`processShim`); version `define` slots in here.
  Note `base: '/explain-that-inchi/'` and `assetsInlineLimit: 0`.
- `package.json` — `version` currently `0.0.0`; bump to `1.2.0`.
- `.github/workflows/deploy.yml` — CI build; `$GITHUB_SHA` fallback source for the commit hash.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/` pure modules (`parseInchi.ts`, `parseAuxMapping.ts`, `highlightUtils.ts`) — the
  established home for DOM-free, unit-tested logic. `buildFeedbackUrl` belongs here.
- `src/lib/__tests__/` (vitest) — colocated test pattern; add `buildFeedbackUrl.test.ts` here.
- `vitest.config.ts` is separate from `vite.config.ts` (Vite 8 + Vitest 3 Plugin-type conflict) —
  do not merge them.
- `vite.config.ts` `processShim` `define` map — the precedent for adding `define` entries;
  version `define` follows the same shape (applied at both `define` and `optimizeDeps` transform).

### Established Patterns
- Pure parsers ported and TypeScript-ified with exhaustive tests — Phase 9 follows the same
  "test-anchored keystone" discipline (builder is fully covered before Phase 10 consumes it).
- 206 existing tests pass; TypeScript clean — keep both green.

### Integration Points
- `buildFeedbackUrl` is consumed in **Phase 10** by the dialog's submit handler (gesture anchor).
  The injected version `define` is read by Phase 10's context collector and passed into `context`.
- No GitHub repo URL constant exists yet (`grep` for `cm-beilstein`/`issues/new` is empty) —
  introduce one (e.g. in the builder module or a small config constant) this phase.
</code_context>

<specifics>
## Specific Ideas

- Body, title, version, and category mappings are pinned by the previews the user approved during
  discussion (see D-01, D-04, D-06, D-09). Treat those previews as the visual contract.
- Truncation must be validated against the **multi-fragment repro molecule** (long InChI/SMILES),
  not a short preset like ethanol — short inputs never exercise the byte-budget path.
- Open-issue mechanics (real `<a target="_blank" rel="noopener">`, no `await` before open) are a
  **Phase 10** concern; Phase 9 only returns the `url` string.
</specifics>

<deferred>
## Deferred Ideas

- **FEED-F1** contextual "report this layer/explanation" pre-fill — future requirement, not this milestone.
- **FEED-F2** optional GitHub @handle / contact field — future requirement.
- **FEED-F3** anonymous (no-GitHub-account) path via third-party form — future requirement.
- Repo-side label/issue-template/triage setup — non-code maintainer checklist in ROADMAP, not a
  code phase. Categorization works via title prefix regardless.

None of these arose as scope creep during discussion — discussion stayed within phase scope.
</deferred>

---

*Phase: 9-feedback-url-builder-config-version-injection*
*Context gathered: 2026-06-17*
