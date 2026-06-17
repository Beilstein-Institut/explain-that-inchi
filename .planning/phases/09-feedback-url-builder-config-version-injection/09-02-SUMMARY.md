---
phase: 09-feedback-url-builder-config-version-injection
plan: 02
subsystem: testing
tags: [vitest, url-builder, github-issues, feedback, tdd, pure-function]

# Dependency graph
requires: []
provides:
  - "pure buildFeedbackUrl(opts) -> { url, truncated } with single-pass URLSearchParams encoding"
  - "FeedbackCategory union type and FeedbackContext interface for Phase 10 consumption"
  - "GitHub issues/new URL constant for cm-beilstein/explain-that-inchi"
  - "38 requirement-grouped vitest tests covering FEED-04, FEED-05, FEED-07"
affects: [phase 10 feedback dialog, any future feedback feature work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure DOM-free URL builder with object-options signature (object-in, object-out)"
    - "Single-pass URLSearchParams encoding no nested encodeURIComponent"
    - "TextEncoder byte-budget guard with deterministic drop-SMILES-then-trim-InChI truncation"
    - "@ neutralization via (at) substitution before URL assembly"

key-files:
  created:
    - src/lib/buildFeedbackUrl.ts
    - src/lib/__tests__/buildFeedbackUrl.test.ts
  modified: []

key-decisions:
  - "@ in user message replaced with (at) removes GitHub mention surface entirely no @ char remains"
  - "TextEncoder byte budget ~7680 bytes binary-search shrink loop for InChI trimming after SMILES drop"
  - "Test fixtures use 100x toluene+benzene InChI (~6400 chars) + 200x SMILES to reliably exceed budget"
  - "FeedbackCategory not imported in test file category strings are literals in each test case"

patterns-established:
  - "buildFeedbackUrl: pure transform, object-options signature, named export only, 3-line file header citing D-01..D-13"
  - "Truncation: explicit commented loop, drop SMILES first (null sentinel), then binary-search trim InChI"

requirements-completed: [FEED-04, FEED-05, FEED-07]

# Metrics
duration: 8min
completed: 2026-06-17
---

# Phase 09 Plan 02: buildFeedbackUrl URL Builder Summary

**Pure buildFeedbackUrl with single-pass URLSearchParams encoding, TextEncoder byte-budget guard, deterministic SMILES-drop+InChI-trim truncation, and 38 requirement-grouped vitest tests all green alongside the existing 206 tests with tsc -b clean.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-17T13:09:00Z
- **Completed:** 2026-06-17T13:14:00Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Implemented buildFeedbackUrl(opts) as a pure, DOM-free named export (no async, no DOM, no default export)
- Single-pass URLSearchParams encoding with no nested encodeURIComponent round-trip confirms + / ; , ( ) # = and newlines survive
- TextEncoder ~7.5 KB byte-budget guard with deterministic truncation: drop SMILES first, then binary-search trim InChI with ...[truncated] marker; user message never truncated
- @ in user-supplied message neutralized to (at) (D-12) no @ character remains in the output
- 38 requirement-grouped vitest tests covering FEED-04, FEED-05, FEED-07 and D-03 placeholders

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing exhaustive test suite for buildFeedbackUrl (RED)** - dfebadb (test)
2. **Task 2: Implement buildFeedbackUrl to pass the suite (GREEN)** - af22175 (feat)

## Files Created/Modified
- src/lib/buildFeedbackUrl.ts - pure URL builder: FeedbackCategory union, FeedbackContext/BuildFeedbackUrlOpts/BuildFeedbackUrlResult interfaces, REPO_ISSUES_URL const, CATEGORY_MAP (D-06), single-pass URLSearchParams (D-11), TextEncoder truncation loop (D-13)
- src/lib/__tests__/buildFeedbackUrl.test.ts - 38 tests in 6 requirement-named describe blocks; LONG_INCHI (100x toluene+benzene) and LONG_SMILES (200x) hoisted consts for truncation coverage

## Decisions Made
- @ neutralization via (at) substitution (not backslash-@): backslash-@ still contains the @ character. Using (at) removes the @ entirely (D-12).
- Binary-search shrink for InChI trim: halves trimLen repeatedly until under budget. O(log n) for any InChI length.
- Test fixture size: fixtures use BASE.repeat(100) (~6400 chars) + Cc1ccccc1. repeated 200 times (~2000 chars) which reliably produces a URL exceeding 7680 bytes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @ neutralization backslash-@ replaced with (at)**
- **Found during:** Task 2 (GREEN implementation)
- **Issue:** backslash-@ still contains @ character; test assertion not.toContain('@octocat') failed.
- **Fix:** Changed neutralizeMentions to replace @ with (at).
- **Files modified:** src/lib/buildFeedbackUrl.ts
- **Committed in:** af22175 (Task 2 commit)

**2. [Rule 1 - Bug] Test fixtures too short to trigger truncation**
- **Found during:** Task 2 (GREEN)
- **Issue:** Original fixtures ~650 chars total (~900 byte URL), far below 7680-byte budget.
- **Fix:** BASE.repeat(100) + Cc1ccccc1. x200 produces ~10,000 byte URL.
- **Files modified:** src/lib/__tests__/buildFeedbackUrl.test.ts
- **Committed in:** af22175 (Task 2 commit)

**3. [Rule 1 - Bug] TypeScript error: FeedbackCategory imported but unused in test**
- **Found during:** Task 2 (tsc -b check)
- **Issue:** noUnusedLocals flagged it as unused.
- **Fix:** Removed FeedbackCategory from test import.
- **Files modified:** src/lib/__tests__/buildFeedbackUrl.test.ts
- **Committed in:** af22175 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs)
**Impact on plan:** All three auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed bugs above.

## User Setup Required
None.

## Next Phase Readiness
- buildFeedbackUrl is ready for Phase 10 (feedback dialog) to import and call
- Phase 10 call contract: FeedbackCategory union and BuildFeedbackUrlOpts interface
- No blockers

## Self-Check

Commits: dfebadb (test RED), af22175 (feat GREEN) - FOUND
Tests: 244 (206 + 38) - PASS
tsc -b: PASS
Named export, repo URL const, URLSearchParams, TextEncoder: all PASS

## Self-Check: PASSED

---
*Phase: 09-feedback-url-builder-config-version-injection*
*Completed: 2026-06-17*
