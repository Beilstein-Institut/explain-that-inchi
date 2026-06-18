---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: InChIKey display & explanation
status: verifying
last_updated: "2026-06-18T12:35:59.378Z"
last_activity: 2026-06-18
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 33
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.3 — InChIKey display & explanation (roadmap drafted; Phases 11–13)
**Status:** Phase 11 verified — all plans complete

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-18)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Phase 11 — source-wiring

## v1.3 Roadmap (Phases 11–13)

3 phases, dependency-ordered (Source → Render → Content). All 12 INKEY requirements mapped; no orphans. No phase needs deeper research (the InChIKey source API is resolved with HIGH confidence — `ketcher.getInChIKey()`, zero new deps).

- **Phase 11: Source & Wiring** — Fetch `ketcher.getInChIKey()` via `Promise.all` alongside the existing debounced `getInchi(true)`; add a verbatim `inchiKey` store field; single atomic write; extend the `generationRef` stale-result guard and empty-canvas guard to the key; pure tested `parseInchiKey.ts` offset parser (returns index ranges only). Requirements: INKEY-01, INKEY-02, INKEY-06.
- **Phase 12: Render & Layout** — `InchiKeySection` leaf sibling (canvas never remounts); color-coded segment spans by slicing the verbatim string; dimmed hyphens; local `useState` hover index (NOT the Zustand subHover bus → no canvas highlight); copy button (PLSH-04 / StrictMode-safe `mountedRef`); 27-char format gate. Requirements: INKEY-03, INKEY-04, INKEY-05. UI phase.
- **Phase 13: Content & Explanation** — `inchiKeyInfo.ts` segment blurbs + `InchiKeyExplanation` card; block structure, purpose, one-way-hash (not reversible / no atom mapping / segments don't highlight), collision caveat, same-connectivity→same-first-block, standard-vs-non-standard flag + version detail, one-key-per-assembly. Requirements: INKEY-07–INKEY-12. UI phase.

## v1.3 Key Decisions (carry-forward from research, HIGH confidence)

- **Source:** `ketcher.getInChIKey(): Promise<string>` — a typed public method on installed `ketcher-core@3.12.0`, routing through the same WASM worker as `getInchi()`. Zero new npm deps. Never compute/hash the key in JS; never derive it from the displayed InChI (separate WASM command).
- **Verbatim passthrough invariant:** displayed key === copied key === raw `getInChIKey()` output. Parser returns `{kind,start,end}` offsets only; renderer slices the stored verbatim string; never re-join segments. (Direct analogue of the InChI `.`-drop passthrough bug — memory `feedback_inchi_passthrough.md`.)
- **Single pipeline:** fetch concurrently via `Promise.all([getInchi(true), getInChIKey()])` inside the existing 150ms debounced `handleChange`; re-check `thisGen` after the await; one atomic `setInchiData(..., inchiKey)` write; clear to `''` in the empty guard and catch path. No second subscription/timer/generation counter; no `getInChIKey()` in `handleMolSelectLogic`.
- **No canvas highlighting from key segments:** segments must NOT call `setHover`/`setSubHover` (wired to `useKetcherHighlights`). The absence of highlighting is the central teaching point (INKEY-09). Use a component-local hover index.
- **Canvas never remounts (D-13):** `InchiKeySection` is a leaf sibling after `InchiSection`; never touch `KetcherPanel` / module-level `structServiceProvider`. Add store fields, don't reshape `setInchiData`.
- **Segment layout (InChI Trust FAQ):** chars 0–13 skeleton hash, 14 hyphen, 15–22 remaining-layers hash, 23 flag (`S`/`N`), 24 version (`A`)… use verified offsets pinned by a slice-boundary test. (Note: research files vary slightly on the trailing flag/version char order; pin against the live key for presets — flag `S`, version `A` — during Phase 11/13.)
- **Copy button:** reuse the StrictMode-safe `mountedRef` reset-on-mount pattern (WR-02); a shared `useCopyButton` hook is recommended but optional.
- **Multi-component:** one key for the whole assembly; explanation must say so; test against an INCHI-06-style multi-fragment fixture.

## Key Decisions (carry-forward)

- Use `@vitejs/plugin-react` (esbuild), NOT the SWC variant — SWC crashes on Ketcher packages (issue #5565)
- All three Ketcher packages (`ketcher-react`, `ketcher-standalone`, `ketcher-core`) pinned to exactly 3.12.0
- `StandaloneStructServiceProvider` must be created at module level, never inside a component
- Ketcher `<Editor>` must never be conditionally rendered — WASM re-initializes on remount
- CSS Modules + CSS custom properties for styling — preserves the oklch token system from design handoff
- `vite-plugin-static-copy` required to copy WASM/worker assets; `assetsInlineLimit: 0` to prevent base64 inlining
- Separate `vitest.config.ts` for Vite 8 + Vitest 3 — Plugin type conflict if merged
- `getInchi(true)` returns concatenated string — split on `AuxInfo=`, not destructuring
- Stale closures in `editor.subscribe` — read state through `useRef` in handler

## Milestone Archive

- v1.2: see `.planning/MILESTONES.md` (Phases 9–10, shipped 2026-06-18, tag `v1.2`); roadmap `.planning/milestones/v1.2-ROADMAP.md`
- v1.1 (patch): `.planning/MILESTONES.md` — 70 commits since v1.0, tag `v1.1`
- v1.0: `.planning/milestones/v1.0-ROADMAP.md` / `v1.0-REQUIREMENTS.md`, tag `v1.0`

## Blockers

None

## Current Position

Phase: 11 (source-wiring) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-06-18

## Operator Next Steps

- Execute plan 11-02 with `/gsd-execute-phase`
