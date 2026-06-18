---
phase: 12-render-layout
plan: 02
subsystem: ui
tags: [react, zustand, css-modules, inchikey, explanation-panel]

# Dependency graph
requires:
  - phase: 12-render-layout/12-01
    provides: InChIKey strip with 5-segment hover state (keyHoverKind + setKeyHoverKind in store)
provides:
  - Explanation panel extended with D-04a precedence: keyHoverKind → hoverIdx → idle
  - Four key-zone explanation cards (skeleton, hash, flagVersion, protonation) with per-zone accent tokens
  - INKEY-04 fully satisfied: hovering any InChIKey segment surfaces a per-segment card without canvas highlighting
affects: [13-inchikey-content, any phase adding Explanation panel content]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-04a precedence: keyHoverKind check gates key-segment card before hoverIdx check; existing layer card and idle card branches unchanged"
    - "Key-zone accent map: skeleton→--c-conn, hash→--c-stereo, flagVersion→--c-version, protonation→--c-proton inline --accent style"
    - "Falsy-safe keyHoverKind read: `if (keyHoverKind)` handles undefined from store mocks that omit the field"

key-files:
  created: []
  modified:
    - src/components/Explanation.tsx

key-decisions:
  - "D-03 honoured: key-segment card is a branch inside the shared Explanation panel — no standalone card surface or new component introduced"
  - "D-07/D-08 honoured: exactly 4 key-zone cards; flag+version combine into single flagVersion card while the strip stays 5-segment granular"
  - "Invariant #2 enforced: Explanation.tsx contains zero setHover/setSubHover calls; key hover never reaches the canvas"
  - "Phase 12 supplies minimal placeholder prose (title + body per zone); Phase 13 fills real content"

patterns-established:
  - "Key-segment card branch: reuse styles.card/styles.active/.layerTag/.swatch/.layerTitle/.layerBody — no new CSS classes added to Explanation.module.css"

requirements-completed: [INKEY-04]

# Metrics
duration: ~30min
completed: 2026-06-18
---

# Phase 12 Plan 02: Explanation Panel InChIKey Card Summary

**Explanation panel extended with D-04a keyHoverKind precedence and four key-zone scaffold cards (skeleton, hash, flagVersion, protonation), completing INKEY-04 hover-to-card wiring without canvas highlighting**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-18T00:00:00Z
- **Completed:** 2026-06-18T00:30:00Z
- **Tasks:** 2 (1 code, 1 human-verify)
- **Files modified:** 1

## Accomplishments

- Added `keyHoverKind` selector to Explanation.tsx alongside existing `hoverIdx`/`layers` selectors
- Implemented D-04a precedence branch: key-segment card fires first when keyHoverKind is set, falling through to unchanged layer card and idle card branches
- Rendered 4 key-zone cards reusing existing CSS classes (`.card`, `.active`, `.layerTag`, `.swatch`, `.layerTitle`, `.layerBody`) with per-zone accent tokens inline
- Human verification confirmed: InChIKey strip hovers show per-segment card, siblings dim, canvas atoms/bonds unchanged, copy round-trips verbatim, placeholder on empty canvas

## Task Commits

Each task was committed atomically:

1. **Task 1: Read keyHoverKind and add D-04a precedence + key-segment card scaffolding** - `26fe664` (feat)
2. **Task 2: Human verify the full InChIKey strip end-to-end** - human-approved (no code commit)

## Files Created/Modified

- `src/components/Explanation.tsx` - Added keyHoverKind selector, D-04a precedence branch, 4 key-zone scaffold cards with accent tokens; idle and layer branches unchanged

## Decisions Made

- D-03 strictly followed: key-segment card lives inside the shared Explanation panel, not a new component
- D-07/D-08: flagVersion is a single card covering both flag (S/N) and version (A) zones — the InChIKey strip stays 5-segment granular for hover targets but the panel shows 4 cards
- Placeholder prose used per zone (e.g., title "Skeleton hash" / body "First 14-character block of the InChIKey.") to be replaced by Phase 13 with real content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- INKEY-04 complete: InChIKey strip is fully interactive end-to-end (strip rendering from 12-01, explanation cards from 12-02)
- Phase 13 can now fill in substantive prose for each of the 4 key-zone cards without any structural changes to Explanation.tsx
- Invariant #2 verified by human: canvas never highlights on key hover — the teaching-point behaviour is confirmed working

---
*Phase: 12-render-layout*
*Completed: 2026-06-18*
