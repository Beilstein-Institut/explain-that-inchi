---
phase: 09-feedback-url-builder-config-version-injection
plan: "01"
subsystem: build-config
tags: [version-injection, vite-define, ci, typescript]
dependency_graph:
  requires: []
  provides: [__APP_VERSION__, __APP_COMMIT__, package-version-1.2.0]
  affects: [vite.config.ts, src/vite-env.d.ts, package.json]
tech_stack:
  added: []
  patterns: [vite-define-raw-substitution, git-describe-sha-resolution, node-fs-json-parse]
key_files:
  created: []
  modified:
    - package.json
    - vite.config.ts
    - src/vite-env.d.ts
decisions:
  - "D-08: version bumped 0.0.0 -> 1.2.0"
  - "D-09: __APP_VERSION__ and __APP_COMMIT__ are the define key names"
  - "D-10: sha resolution order: git describe -> GITHUB_SHA -> dev"
  - "Tag-collision guard: git describe bare tag name re-resolved via git rev-parse --short HEAD"
  - "deploy.yml: no change needed — $GITHUB_SHA auto-provided by GitHub Actions runner"
metrics:
  duration_minutes: 1
  completed_date: "2026-06-17"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 09 Plan 01: Version/Commit Injection Summary

Build-time injection of `__APP_VERSION__` (`1.2.0`) and `__APP_COMMIT__` (short git sha or `dev`) via Vite `define`, with tag-collision guard, ambient TypeScript declarations, and CI sha fallback via `$GITHUB_SHA`.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Bump package version and resolve + inject version/commit defines | 600fe46 | package.json, vite.config.ts, src/vite-env.d.ts |
| 2 | Verify CI exposes the commit sha fallback | (no change) | .github/workflows/deploy.yml — no modification needed |

## What Was Built

**Task 1: Version/commit injection**

- `package.json` version bumped from `0.0.0` to `1.2.0` (D-08).
- `vite.config.ts` now reads the package version via `readFileSync` + `JSON.parse` (no `resolveJsonModule` needed — confirmed tsconfig.node.json lacks it).
- `resolveCommitSha()` function implements the D-10 locked fallback chain:
  1. `git describe --tags --always` — returns raw output
  2. Tag-collision guard: if raw output matches `/^[0-9a-f]{7,40}$/i` it is returned directly; if it is a decorated tag string (e.g. `v1.2.0-3-gabcdef0`) the trailing hash is extracted; if it is a bare tag name (exactly-tagged commit), `git rev-parse --short HEAD` is called to get the actual hash
  3. `process.env.GITHUB_SHA?.slice(0, 7)` as CI fallback
  4. Literal `'dev'` as local-dev-no-git fallback
- `__APP_VERSION__` and `__APP_COMMIT__` are added to the Vite `define` object as `JSON.stringify`'d strings (raw text substitution safety — T-09-02 mitigated).
- Both defines are NOT mirrored into `optimizeDeps.rolldownOptions.transform.define` — that mirror is for the `processShim` targeting Ketcher dep code; the new app-version globals only appear in our own source.
- `src/vite-env.d.ts` adds `declare const __APP_VERSION__: string;` and `declare const __APP_COMMIT__: string;` so `tsc -b` resolves the injected globals.
- `tsc -b` exits 0.

**Task 2: CI sha fallback verification**

`deploy.yml` was reviewed and requires **no change**. The workflow has:
- `actions/checkout@v4` (shallow clone by default) — `git describe --tags` may fail in CI, which correctly triggers the D-10 fallback path
- `npm run build` step — invokes the vite config which reads `process.env.GITHUB_SHA` directly from the GitHub Actions auto-provided environment variable

No `env:` block or `fetch-depth: 0` addition is needed. The auto-provided `$GITHUB_SHA` env var is the intended CI fallback per D-10.

## Verification Results

```
node -e "const p=require('./package.json'); if(p.version!=='1.2.0') process.exit(1)" -> OK (1.2.0)
grep __APP_VERSION__ vite.config.ts -> FOUND
grep __APP_COMMIT__ vite.config.ts -> FOUND
grep GITHUB_SHA vite.config.ts -> FOUND
grep "declare const __APP_VERSION__" src/vite-env.d.ts -> FOUND
grep "declare const __APP_COMMIT__" src/vite-env.d.ts -> FOUND
npx tsc -b -> exit 0 (clean)
grep "actions/checkout" .github/workflows/deploy.yml -> FOUND
grep "npm run build" .github/workflows/deploy.yml -> FOUND
```

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

No new security surface introduced. T-09-02 (define raw substitution) mitigated: all `__APP_VERSION__` and `__APP_COMMIT__` values are `JSON.stringify`'d. T-09-03 (git describe failure) mitigated: `execSync` wrapped in `try/catch` with full fallback chain. T-09-SC: zero new npm dependencies added (native `node:fs` and `node:child_process` only).

## Self-Check: PASSED

- [x] `package.json` version = 1.2.0 (verified by node -e)
- [x] `vite.config.ts` contains `__APP_VERSION__`, `__APP_COMMIT__`, `GITHUB_SHA` (grep confirmed)
- [x] `src/vite-env.d.ts` contains both `declare const` lines (grep confirmed)
- [x] `tsc -b` clean (exit 0)
- [x] Commit 600fe46 exists
- [x] `deploy.yml` unchanged, retains checkout + build steps (grep confirmed)
