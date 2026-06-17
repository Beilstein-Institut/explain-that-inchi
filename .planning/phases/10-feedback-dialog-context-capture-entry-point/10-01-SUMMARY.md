---
phase: "10"
plan: "01"
subsystem: feedback-url-builder
tags: [feedback, url-builder, typescript, fullbody, d-11]
dependency_graph:
  requires: []
  provides: [BuildFeedbackUrlResult.fullBody]
  affects: [src/components/FeedbackDialog.tsx (Plan 02)]
tech_stack:
  added: []
  patterns: [passthrough field on return type]
key_files:
  created: []
  modified:
    - src/lib/buildFeedbackUrl.ts
    - src/lib/__tests__/buildFeedbackUrl.test.ts
decisions:
  - "fullBody is assigned from initialBody (before truncation loop), ensuring clipboard fallback has untruncated content (D-11)"
  - "No logic changes to truncation loop — only the return type and return statement were modified"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-17"
  tasks_completed: 2
  files_modified: 2
---

# Phase 10 Plan 01: Add fullBody to BuildFeedbackUrlResult Summary

**One-liner:** Expose untruncated issue body on `BuildFeedbackUrlResult.fullBody` as the single source of truth for the D-11 clipboard fallback path.

## What Was Built

Extended `buildFeedbackUrl.ts` to include `fullBody: string` on the `BuildFeedbackUrlResult` interface. The return statement now includes `fullBody: initialBody` where `initialBody` is the body string built before the truncation loop — ensuring the clipboard fallback (Phase 10 FeedbackDialog, D-11) always has access to the full untruncated issue body without re-assembling the template.

Added a `describe('D-11: fullBody field')` block with two new tests to `buildFeedbackUrl.test.ts`:
1. `result includes fullBody for non-truncated input` — verifies fullBody is truthy, contains the user message, and contains the InChI.
2. `fullBody contains the untruncated InChI even when url is truncated` — verifies that even when the URL budget is exceeded and `truncated: true`, the fullBody contains the complete LONG_INCHI string.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add fullBody to BuildFeedbackUrlResult and return it | c1d3755 | src/lib/buildFeedbackUrl.ts |
| 2 | Add D-11 test coverage for the fullBody field | d7a959e | src/lib/__tests__/buildFeedbackUrl.test.ts |

## Verification Results

- `tsc -b --noEmit`: exits 0 (clean)
- `vitest run`: 246 tests pass (244 pre-existing + 2 new D-11 tests)
- `grep -n 'fullBody' src/lib/buildFeedbackUrl.ts`: lines 51 (interface field) and 263 (return statement)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. `fullBody` is a real passthrough from `initialBody`; no placeholder or mock data.

## Threat Flags

No new trust surface introduced. `fullBody` is an additional output field on an already-pure synchronous function — no DOM, no network, no auth. Caller usage for `navigator.clipboard.writeText` is addressed in Plan 02's threat model.

## Self-Check: PASSED

- [x] `src/lib/buildFeedbackUrl.ts` modified — interface and return statement verified
- [x] `src/lib/__tests__/buildFeedbackUrl.test.ts` modified — D-11 describe block appended
- [x] Commit c1d3755 exists (feat: add fullBody to BuildFeedbackUrlResult)
- [x] Commit d7a959e exists (test: add D-11 fullBody field test coverage)
- [x] 246 tests pass, 0 regressions
