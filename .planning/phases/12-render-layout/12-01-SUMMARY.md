---
phase: 12-render-layout
plan: "01"
subsystem: inchikey-render
tags: [react, zustand, css-modules, inchikey, hover, copy-button]
dependency_graph:
  requires: [11-02]
  provides: [KeyHoverZone-type, InchiKeySection-component, keyHoverKind-store-field]
  affects: [src/store.ts, src/components/InchiKeySection.tsx, src/components/InchiKeySection.module.css, src/App.tsx]
tech_stack:
  added: []
  patterns: [mountedRef-StrictMode-copy, segment-zone-mapping, inline-style-token-color, parseInchiKey-offset-slicing]
key_files:
  created:
    - src/components/InchiKeySection.tsx
    - src/components/InchiKeySection.module.css
  modified:
    - src/store.ts
    - src/App.tsx
    - src/lib/__tests__/parseInchiKey.test.ts
decisions:
  - "D-07/D-08: 4 hover zones (skeleton, hash, flagVersion, protonation) — flag+version share 'flagVersion' zone via SEGMENT_ZONE map while staying individually colored"
  - "D-11: copy button duplicated inline in InchiKeySection (not extracted to shared hook) — zero risk to green InchiSection"
  - "D-09: dimmed 'InChIKey' prefix (no =) identifies the strip before hover"
  - "Invariant #2: keyHoverKind never reaches useKetcherHighlights — verified by grep"
metrics:
  duration: "5m"
  completed: "2026-06-18T13:36:56Z"
  tasks_completed: 3
  files_changed: 5
---

# Phase 12 Plan 01: InChIKey Render Strip Summary

**One-liner:** InChIKey rendered as 5 color-coded segment spans (skeleton→--c-conn, hash→--c-stereo, flag/version→--c-version, protonation→--c-proton) with 4 hover zones, dimmed hyphens, StrictMode-safe copy button, and empty placeholder — pure leaf sibling, canvas never remounts.

## What Was Built

A complete `InchiKeySection` leaf component that renders the verbatim `inchiKey` store field (Phase 11) as a color-coded hoverable strip, visually consistent with `InchiSection`.

**Store contract (12-02 consumer ready):**
- `KeyHoverZone` exported type: `'skeleton' | 'hash' | 'flagVersion' | 'protonation'` (4 zones, flag+version combined per D-07/D-08)
- `keyHoverKind: KeyHoverZone | null` field + `setKeyHoverKind` setter in Zustand store
- `setInchiData` signature unchanged

**InchiKeySection.tsx (128 lines):**
- Reads `inchiKey` via selector, gates on `parseInchiKey(inchiKey).length === 0` (27-char gate / SC-4)
- 5 colored spans via `inchiKey.slice(seg.start, seg.end)` — never reconstructs (Invariant #1)
- Per-segment color from `SEGMENT_COLOR` const map (no `swatchVar()` — that takes a LayerType)
- 4 hover zones via `SEGMENT_ZONE` map — flag+version both map to `'flagVersion'`
- Dimmed hyphen spans (`.inchiSlash` class) at boundaries before `hash` and `protonation` segments
- Dimmed `InChIKey` prefix, no `=` (D-09)
- Copy button: `mountedRef` + 3s timeout, copies `inchiKey` verbatim, `aria-label="Copy InChIKey"` (D-11)
- Empty state: `data-empty="true"`, "Draw a molecule above to see its InChIKey." (D-10)
- Zero `setHover`/`setSubHover` calls (Invariant #2 preserved)

**InchiKeySection.module.css (119 lines):**
- Verbatim values from `InchiSection.module.css` (D-12), renamed roots `.inchiKeySection`/`.inchiKeyDisplay`
- No `.sectionLabel`, no sub-token/formula/parity/hydro rules (D-06)

**App.tsx:**
- `InchiKeySection` import added + `<InchiKeySection />` inserted between `<InchiSection />` and `<Explanation />` (D-05 order)
- `structServiceProvider` module-level line and `KetcherPanel` JSX untouched (D-13 / Invariant #3)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing unused import blocking build**
- **Found during:** Task 3 (build verification)
- **Issue:** `src/lib/__tests__/parseInchiKey.test.ts` had `import { parseInchiKey, InchiKeySegment } from '../parseInchiKey'` — `InchiKeySegment` was never used in the test body. TypeScript TS6133 error caused `npm run build` to exit 2.
- **Fix:** Removed unused `InchiKeySegment` from the import. All 120 existing test assertions pass unchanged.
- **Files modified:** `src/lib/__tests__/parseInchiKey.test.ts`
- **Commit:** 392a89e

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 |
| `src/__tests__/InchiSection.test.tsx` | PASS — 11/11 tests |
| `KeyHoverZone` exported from store | PASS |
| `setKeyHoverKind` in store | PASS |
| `useKetcherHighlights.ts` clean of `keyHoverKind` | PASS (Invariant #2) |
| InchiKeySection has no `setHover`/`setSubHover` calls | PASS |
| `navigator.clipboard.writeText(inchiKey)` verbatim | PASS |

## Known Stubs

None. The component is fully functional. Per-segment explanation card content (Phase 13) will be consumed via the `keyHoverKind` store field established here.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 7645318 | feat(12-01): add KeyHoverZone type + keyHoverKind/setKeyHoverKind to store |
| Task 2 | 326d39b | feat(12-01): build InchiKeySection component + CSS module |
| Task 3 | 392a89e | feat(12-01): wire InchiKeySection into App.tsx; fix unused import in parseInchiKey test |

## Self-Check: PASSED

All created files exist. All commits verified in git log.
