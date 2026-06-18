---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: In-app feedback via prefilled GitHub issues
status: milestone_complete
last_updated: 2026-06-18T08:07:54.532Z
last_activity: 2026-06-18
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 6
  completed_plans: 6
  percent: 50
stopped_at: Milestone complete (Phase 10 was final phase)
---

# Project State

**Project:** Explain that InChI
**Milestone:** v1.2 — In-app feedback via prefilled GitHub issues (roadmap drafted; v1.1 shipped 2026-06-17)
**Status:** Milestone complete

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-17)

**Core value:** Every chunk of an InChI string is hoverable, explained, and linked back to the atoms in the drawing — demystifying a notation that most chemists treat as opaque.
**Current focus:** Milestone complete

## Milestone Archive

- v1.1 (patch): see `.planning/MILESTONES.md` — 70 commits since v1.0, tag `v1.1`. No separate roadmap/requirements (maintenance release; work logged in "Quick Tasks Completed").
- Full details: `.planning/MILESTONES.md`
- Roadmap archive: `.planning/milestones/v1.0-ROADMAP.md`
- Requirements archive: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Git tag: `v1.0`

## v1.2 Roadmap (Phases 9–10)

- **Phase 9: Feedback URL builder, config & version injection** — pure, DOM-free `buildFeedbackUrl()` (encoding, ~7.5 KB byte-budget guard + deterministic truncation, `@`-neutralization, category title-prefix) + build-time version injection. Requirements: FEED-04, FEED-05, FEED-07, FEED-09. Test-anchored keystone, built first.
- **Phase 10: Feedback dialog, context capture & entry point** — impure submit-time context collector (InChI from store verbatim, SMILES via `getSmiles()`, preset via `MOLECULES.find(selectedMolId)`, trimmed UA, version), native `<dialog>` modal, "Send feedback" entry point, App wiring. Requirements: FEED-01, FEED-02, FEED-03, FEED-06, FEED-08. UI phase.
- Non-code maintainer checklist (repo-side labels/issue-template/triage) surfaced in ROADMAP.md — not a code phase.

## v1.2 Key Decisions (carry-forward from research)

- Zero new npm dependencies — native `URL`/`URLSearchParams` + `TextEncoder` + one Vite `define`. Do NOT add `new-github-issue-url` or any feedback SaaS.
- #1 risk = GitHub's ~8 KB server-side URL cap; budget ~7.5 KB and validate truncation against the multi-fragment repro molecule, not short presets.
- Categorize via **title prefix** (labels silently drop for non-collaborators); pass `labels=` redundantly.
- Open the issue via a real `<a target="_blank" rel="noopener">` on the user gesture — no `await` before opening (popup blocker).
- Three-way context source-of-truth, read imperatively at submit time: InChI from `useInchiStore.getState().inchi` (verbatim, never re-run `getInchi`), SMILES from `ketcherRef.current.getSmiles()`, preset from `MOLECULES.find(m => m.id === selectedMolId)` (`null` = custom).
- Feedback is ephemeral UI state — add NO fields to the Zustand store. Never remount/wrap KetcherPanel; the modal is a leaf sibling.
- Fence ALL auto-context in code blocks; neutralize `@` in user prose.

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

## Known Open Items at v1.0 Close

- Phase 8 badge positioning: tweaked but not browser-verified before context exhaustion
- b-layer highlighting + legend hover trigger: landed in last commit — not browser-verified
- MAP-03 (shareable URL): deferred to v2

## Blockers

None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260610-cho | Fix preset-highlight guard timing and stale-result guard in handleChange | 2026-06-10 | 25ddba0 | [260610-cho-fix-preset-highlight-guard-timing-and-st](./quick/260610-cho-fix-preset-highlight-guard-timing-and-st/) |
| 260610-csa | Decouple LayerText rawText from positional rawParts index in InchiSection | 2026-06-10 | 4736a28 | [260610-csa-decouple-layertext-rawtext-from-position](./quick/260610-csa-decouple-layertext-rawtext-from-position/) |
| 260610-d2r | Fix mixed N*...;N*... hover-highlight bug in LayerText (c/h layers) — pre-existing v1.0 bug | 2026-06-10 | e212dde | [260610-d2r-fix-mixed-n-star-semicolon-hover-highlig](./quick/260610-d2r-fix-mixed-n-star-semicolon-hover-highlig/) |
| 260610-eci | Fix canonical→pool-ID remap for multi-component molecules (coordinate matching via AuxInfo /rC:) — fixes wrong-fragment canvas highlights | 2026-06-10 | 079d12c | [260610-eci-fix-canonical-to-pool-id-remap-for-multi](./quick/260610-eci-fix-canonical-to-pool-id-remap-for-multi/) |
| 260610-eoi | Fix readingFor multi-fragment explanation text (formula/c/h/t offsets) + t-layer `?` undefined stereocenters (highlight + interactivity) | 2026-06-10 | 4eb0fd6 | [260610-eoi-fix-readingfor-multi-fragment-text-and-t](./quick/260610-eoi-fix-readingfor-multi-fragment-text-and-t/) |

| 260610-fn1 | Scope formula-layer 'H' hover to the hovered fragment via canonRange (was highlighting explicit H in all fragments) | 2026-06-10 | 46cc077 | [260610-fn1-scope-formula-layer-h-hover-to-the-hover](./quick/260610-fn1-scope-formula-layer-h-hover-to-the-hover/) |
| 260610-ist | Unify H-hover: formula H-count + /h-layer tokens highlight explicit H atoms only and render implicit-H badges, fragment-scoped, no heavy-atom fill/bonds | 2026-06-10 | ff7c4ea | [260610-ist-unify-h-hover-formula-h-count-and-h-laye](./quick/260610-ist-unify-h-hover-formula-h-count-and-h-laye/) |
| 260610-ist (fix) | /gsd-fast follow-up: /h-layer hover resolves explicit H via bond traversal from heavy atoms (benzene /h1-6H with explicit H highlighted nothing) | 2026-06-10 | eda10f5 | (see 260610-ist) |

| copy-fix | /gsd-fast: "Copied!" auto-hide → 3s, then fixed mountedRef stuck-false under StrictMode (Copied! never disappeared) | 2026-06-10 | 49253d1 | (InchiSection) |
| 260610-jyj | Replace preset `cid` with hardcoded isomeric SMILES; load via setMolecule, drop runtime PubChem fetch (SMILES sourced once from PUG REST) | 2026-06-10 | 943bad1 | [260610-jyj-replace-preset-cid-with-hardcoded-smiles](./quick/260610-jyj-replace-preset-cid-with-hardcoded-smiles/) |

| 260610-ist (fix2) | /gsd-fast: formula-H badges now include mobile-H (H,5,6) groups — hovering H-count showed no "H?" badge for the OH/COOH proton (e.g. alanine) | 2026-06-10 | e655971 | (useKetcherHighlights) |

| stereo-hue | /gsd-verify-work 8 UAT fix: give undefined '?' parity a distinct hue (--c-stereo → lime 112; was identical to + red) | 2026-06-17 | f6e3dc6 | (src/styles.css) |

| coi+favicon | /gsd-fast: fix coi-serviceworker.js path (%BASE_URL% → relative; was 404) + add project favicon.svg (benzene ring, color-coded vertices) | 2026-06-17 | 7ffeec3 | (index.html, public/favicon.svg) |

Last activity: 2026-06-18

### Multi-fragment support (now complete)

The 4-task multi-component fix series (260610-d2r, -eci, -eoi) closed all known multi-fragment bugs: hover-highlight token offsets (d2r), canonical→pool-ID canvas mapping for non-sequential pools (eci), and explanation-card text + undefined-stereo handling (eoi). No outstanding multi-fragment follow-ups.

## Current Position

Phase: 10
Plan: Not started
Status: Executing Phase 10
Last activity: 2026-06-18 -- Phase 10 execution started
