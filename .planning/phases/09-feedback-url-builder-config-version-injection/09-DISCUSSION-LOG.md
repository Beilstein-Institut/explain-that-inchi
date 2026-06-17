# Phase 9: Feedback URL builder, config & version injection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 9-feedback-url-builder-config-version-injection
**Areas discussed:** Issue body template, Issue title composition, Version string format, Category set & labels

---

## Issue body template — ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Message first, context below | User prose at top under a heading, then `### Context` block with InChI/SMILES/preset/UA/version | ✓ |
| Context in `<details>` fold | Message first, context wrapped in a collapsed `<details>` block | |
| Context first | Environment/InChI block at top, message below | |

**User's choice:** Message first, context below (approved the previewed layout).
**Notes:** Reads like a normal bug report; context follows after a `---` divider under `### Context`.

## Issue body template — empty/missing state

| Option | Description | Selected |
|--------|-------------|----------|
| Inline placeholder text | Keep the labeled line, show a marker: `(no structure loaded)`, `(none)`, `(custom molecule)` | ✓ |
| Omit empty fields entirely | Drop the whole line when a value is absent | |

**User's choice:** Inline placeholder text.
**Notes:** Stable block shape preferred over variable shape.

## Issue title composition

| Option | Description | Selected |
|--------|-------------|----------|
| Trimmed message excerpt | `[Bug] <first ~60 chars of message, newlines collapsed>`, static fallback if empty | ✓ |
| Static text | `[Bug] Explain that InChI feedback` constant suffix | |
| Prefix only | `[Bug]` with empty remainder | |

**User's choice:** Trimmed message excerpt.
**Notes:** Static fallback used when message is empty/whitespace-only.

## Version string format

| Option | Description | Selected |
|--------|-------------|----------|
| 1.2.0 + 'v1.2.0 (sha)' | Bump package.json to 1.2.0; display `v1.2.0 (abc1234)`, dev fallback `v1.2.0 (dev)` | ✓ |
| Raw git describe | Surface `git describe --tags --always` verbatim (e.g. `v1.1-5-gabc1234`) | |
| Short SHA only | Just the 7-char commit hash | |

**User's choice:** 1.2.0 + `v1.2.0 (sha)`.
**Notes:** package.json → 1.2.0; dev build with no resolvable sha shows `v1.2.0 (dev)`.

## Category set & labels

| Option | Description | Selected |
|--------|-------------|----------|
| Use this mapping | 5 categories, title prefix + per-category lowercase `labels=` slug (bug/explanation/highlighting/suggestion/feedback) | ✓ |
| Single 'feedback' label | Keep 5 title prefixes but pass only one `labels=feedback` for all | |

**User's choice:** Use this mapping.
**Notes:** Title prefix is the categorizer of record; slugs match the ROADMAP maintainer-checklist label names.

---

## Claude's Discretion

- Exact excerpt-length constant (60 target; minor variance to avoid mid-word cuts).
- `...[truncated]` vs `…[truncated]` marker spelling; exact placeholder casing.
- Vite `define` variable name(s) and how package.json version is read at build time.
- Internal builder module location/name (suggested `src/lib/buildFeedbackUrl.ts`).

## Deferred Ideas

- FEED-F1 contextual "report this layer" pre-fill — future requirement.
- FEED-F2 optional @handle/contact field — future requirement.
- FEED-F3 anonymous no-account path via form service — future requirement.
- Repo-side label/template/triage setup — non-code maintainer checklist (ROADMAP), not a code phase.

No scope creep arose; discussion stayed within phase scope.
