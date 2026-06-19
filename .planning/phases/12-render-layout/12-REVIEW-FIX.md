---
phase: 12-render-layout
fixed_at: 2026-06-19T06:01:07Z
review_path: .planning/phases/12-render-layout/12-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-06-19T06:01:07Z
**Source review:** .planning/phases/12-render-layout/12-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03)
- Fixed: 4
- Skipped: 0

**Verification:** `npx tsc -b` passes (exit 0). `npx vitest run` passes — 278 tests across 16 files, all green. (The "Preset load failed: layout failed" line in test output is an intentionally-asserted failure path in `handleMolSelect.test.ts`, not a failure.)

## Fixed Issues

### CR-01: Stale `keyHoverKind` survives InChIKey clear — stale card masks panel indefinitely

**Files modified:** `src/store.ts`, `src/components/Explanation.tsx`
**Commit:** be1c259
**Status:** fixed: requires human verification (state-precedence logic change)
**Applied fix:** Primary fix — `setInchiData` now resets `keyHoverKind: null` on every data transition. Since `setInchiData` only fires after a debounced structure change, dropping any active key-hover at that point is correct, and this fixes both the empty-clear case and the preset-swap case. Added a defensive belt-and-suspenders derivation in `Explanation`: it reads `inchiKey` and computes `keyHoverKind = inchiKey ? rawKeyHoverKind : null`, so an empty key can never surface a key-segment card even if a stale value slipped through. Verbatim-passthrough invariant untouched.

### WR-01: `Explanation` precedence makes key-hover unconditionally win over InChI-layer hover

**Files modified:** `src/components/InchiSection.tsx`, `src/components/InchiKeySection.tsx`
**Commit:** 5201d74
**Status:** fixed: requires human verification (hover-precedence logic change)
**Applied fix:** Made the two hover sources mutually exclusive. `InchiSection`'s segment `onMouseEnter` now also calls `setKeyHoverKind(null)`; `InchiKeySection`'s segment `onMouseEnter` now also calls `setHover(null)` and `setSubHover(null)`. Per the project invariant note, the latter two are state-clearing writes only (setting existing hover state to `null`, not creating canvas highlights), so Invariant #2 (no canvas highlight from key segments) is preserved. Added an explicit "DO NOT remove" comment so a future reviewer does not strip them as apparent Invariant #2 violations.

### WR-02: `dangerouslySetInnerHTML` fallback can render unsanitized `layer.text`

**Files modified:** `src/components/Explanation.tsx`
**Commit:** 790e7cd
**Applied fix:** Split the example-block render so that `dangerouslySetInnerHTML` is used only for `readingFor()`/`info.eg` output (which emits known-safe `<b>`/`<span style>` tags), and the `layer.text` fallback is rendered as a plain React text child (`<span>{layer.text}</span>`), where React escapes any `<`/`>`. Implemented via a small IIFE that binds `const safeHtml = reading || info!.eg` so TypeScript narrows the `string | undefined` union correctly (the original suggested ternary failed `tsc` because `info.eg` is optional; the IIFE preserves the same runtime behavior while satisfying the type checker).

### WR-03: `parseInchiKey` accepts structurally-malformed keys

**Files modified:** `src/lib/parseInchiKey.ts`, `src/lib/__tests__/parseInchiKey.test.ts`
**Commit:** bf34594
**Applied fix:** Replaced the positional-only guard (`length === 27 && key[14] === '-' && key[25] === '-'`) with a full structural regex `^[A-Z]{14}-[A-Z]{10}-[A-Z]$` (equivalent to the reviewer's `[A-Z]{14}-[A-Z]{8}[A-Z]{2}-[A-Z]$`, the 10-char block being the 8-char hash plus the 2-char flag+version). This keeps the no-throw contract (T-11-01 / D-08) while rejecting non-conforming inputs. Added two test fixtures: a hyphen-positioned-but-non-alpha string (`--------------X--------XX-X`) and a digit-in-skeleton key, both asserting `[]`. All pre-existing valid-key tests (benzene, protonated `-L`, non-standard `-N` flag) still pass.

---

_Fixed: 2026-06-19T06:01:07Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
