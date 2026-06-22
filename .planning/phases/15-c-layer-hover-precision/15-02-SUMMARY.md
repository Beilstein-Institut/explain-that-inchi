---
phase: 15-c-layer-hover-precision
plan: "02"
subsystem: component-tier
tags: [c-layer, tokenizer, subhover, layertext, tdd-green, checkpoint]
dependency_graph:
  requires: [tokenizeCLayerSeg, collectBranchHyphens, SubHover.bond, SubHover.branch]
  provides: [ConnectionText.renderSegment two-pass, hyphen-span-bond, paren-span-branch]
  affects: [src/components/LayerText.tsx]
tech_stack:
  added: []
  patterns: [two-pass-tokenize-then-render, discriminated-union-dispatch, conditional-interactive-span]
key_files:
  created: []
  modified:
    - src/components/LayerText.tsx
decisions:
  - CLYR-02: hyphen spans emit kind='bond' with endpointPairs=[leftCanonical, rightCanonical]; interactive only when both endpoints are non-null
  - CLYR-03/D-04: open and close paren spans emit identical kind='branch' bondPairs (symmetric); bondPairs stored on open token via _bondPairs side-channel for close to look up
  - D-03 comma-only: open/close parens with empty bondPairs render as plain non-interactive spans (no inchiSubtoken class, no subHoverProps)
  - CLayerToken type imported from parseInchi.ts for explicit annotation in the render loop
  - CLYR-04/05: existing cumOffset and canonicalFn machinery preserves multi-fragment and N* correctness for new token kinds without modification
metrics:
  duration_minutes: 4
  completed_date: "2026-06-19"
  tasks_completed: 1
  files_changed: 1
---

# Phase 15 Plan 02: Refactor ConnectionText.renderSegment to Two-Pass Token Rendering Summary

One-liner: ConnectionText.renderSegment refactored from single-pass character scan to two-pass tokenizeCLayerSeg + render-tokens loop, making every c-layer hyphen and parenthesis an interactive hover target emitting kind='bond'/'branch' SubHover payloads.

## What Was Built

### Task 1 — Refactor ConnectionText.renderSegment (GREEN)

Modified `src/components/LayerText.tsx`:

**Import change:** Added `CLayerToken`, `tokenizeCLayerSeg`, and `collectBranchHyphens` to the existing `parseInchi` import line.

**renderSegment body replaced:** The old single-pass `while (i < seg.length)` character scan (which only handled digit runs, buffering everything else as plain text) was replaced with a clean two-pass approach:

- **Pass 1 (tokenize):** `const tokens = tokenizeCLayerSeg(seg)` — produces a `CLayerToken[]` array in a single O(n) forward scan. Called once per segment; all local (pre-offset) integers stored in tokens.

- **Pass 2 (render-tokens loop):** `for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++)` dispatches on `token.type`:
  - `'atom'`: same behavior as before — `canonicalFn(n)` or `{canonical: n + offset}` → interactive span with `kind='atom'`.
  - `'hyphen'`: if either endpoint is null (malformed), emit plain span; otherwise build `endpointPairs` via `canonicalFn` zip (N* path) or `[leftLocal + offset, rightLocal + offset]` (single fragment) → interactive span with `kind='bond'`.
  - `'open'`: call `collectBranchHyphens(tokens, tokenIdx, token.closeTokenIdx)`, build `bondPairs` from all branch hyphens with same offset/canonicalFn logic; store bondPairs on `tokens[tokenIdx]._bondPairs` for the close-paren to retrieve; emit interactive span (or plain span if bondPairs is empty — comma-only branch) with `kind='branch'`.
  - `'close'`: retrieve `tokens[token.openTokenIdx]._bondPairs`; emit matching interactive span (or plain span if empty bondPairs) with same `bondPairs` as the open token (D-04 symmetry).
  - `'other'`: emit plain span with `token.slice`.

**Signature and outer structure preserved:** `renderSegment(seg, offset, canonicalFn?)` signature and all callers at lines 158, 177, 184 are unchanged. The `parts[]` and `key` outer variables are still mutated. The multMatch guard, cumOffset accumulation, and segMult per-segment handling in `ConnectionText` are unchanged.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (GREEN component) | 9f9358a | feat(15-02): refactor ConnectionText.renderSegment to two-pass token rendering |

## Checkpoint Status

Task 2 (`checkpoint:human-verify`) not yet approved — awaiting human verification on the live Ketcher canvas.

## Deviations from Plan

None — plan executed exactly as written. The `_bondPairs` side-channel on the open token object (via `(tokens[tokenIdx] as unknown as Record<string, unknown>)['_bondPairs']`) was the exact approach specified in the plan's action section.

## Test Results

| File | Tests | Status |
|------|-------|--------|
| src/__tests__/LayerText.clyr.test.tsx | 5/5 | GREEN (was RED before this task) |
| src/__tests__/LayerText.mixedFragment.test.tsx | 3/3 | GREEN (no regressions) |
| src/lib/__tests__/clyr.test.ts | 24/24 | GREEN (no regressions) |
| Full suite | 333/333 | GREEN |
| npx tsc --noEmit | — | CLEAN (zero errors) |

## Known Stubs

None — all token kinds are fully wired. The c-layer precision pipeline is complete end-to-end from `tokenizeCLayerSeg` through `ConnectionText.renderSegment` to `buildSubHoverSpecs` (implemented in Plan 15-01).

## Threat Flags

None — this plan is pure React rendering logic in `LayerText.tsx`. No new network endpoints, auth paths, file access patterns, or schema changes. CLayerToken values are derived from the verbatim InChI string (Ketcher WASM output); tokens carry only local integer atom indices. Threat register from plan frontmatter (T-15-05 through T-15-SC) — all accepted.

## Self-Check: PASSED

- `src/components/LayerText.tsx` — modified, tokenizeCLayerSeg + collectBranchHyphens imported, two-pass renderSegment in place
- Commit 9f9358a — verified in git log
- npx vitest run: 333/333 GREEN
- npx tsc --noEmit: zero errors
