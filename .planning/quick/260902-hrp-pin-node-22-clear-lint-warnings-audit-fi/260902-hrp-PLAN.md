---
quick_id: 260902-hrp
type: quick
description: Pin Node 22, clear lint warnings, audit fix dev deps
date: 2026-09-02
files_modified:
  - .nvmrc
  - package.json
  - package-lock.json
  - src/hooks/useKetcherHighlights.ts
  - src/lib/ketcherEditor.ts
---

# Quick Task 260902-hrp: Pin Node 22, clear lint warnings, audit fix dev deps

Follow-ups 3 and 4 from the 2026-09-02 review (plan `nested-painting-creek`).

## Task 1 — Lint clean
- `src/hooks/useKetcherHighlights.ts`: `react-hooks/exhaustive-deps` wants `ketcherRef` and
  `_isHighlightingRef` in the effect deps. Both are refs (stable identity), so listing them is
  free and removes the warning; replace the "intentionally not in deps" note accordingly.
- `src/lib/ketcherEditor.ts:44`: delete the unused `eslint-disable-next-line` directive.
- Verify: `npm run lint` → 0 problems.

## Task 2 — Match local Node to the Dockerfile
- Add `.nvmrc` containing `22` (the Dockerfile builds on `node:22-bookworm-slim`).
- Add `"engines": { "node": "22.x" }` to `package.json` so npm warns on a mismatched runtime.
- Change the `test` script to `NODE_OPTIONS=--no-experimental-webstorage vitest` so the suite is
  also correct on Node ≥ 25, where the built-in `localStorage` global shadows happy-dom's and fails
  `leaveWipe.test.ts` (14 tests). Node 22 accepts the flag (webstorage flag exists since 22.4).
- Verify: `npm test -- --run` green on the local Node 25 without any manual env var.

## Task 3 — Dev-tree audit
- `npm audit fix` (no `--force`): resolves `browserslist <=4.28.6` and `nanoid <3.3.18`, both high,
  both dev-only (`npm audit --omit=dev` is already clean). Lockfile-only change expected.
- Verify: `npm audit` → 0 vulnerabilities; `npx tsc -b`, lint, and the suite still green.

## Commits
One per task, code only; the orchestrator commits the docs.
