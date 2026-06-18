# Roadmap: Explain that InChI

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 (shipped 2026-06-05)
- ✅ **v1.1 Post-ship correctness & polish** — patch, no roadmap phases (shipped 2026-06-17)
- ✅ **v1.2 In-app feedback via prefilled GitHub issues** — Phases 9–10 (shipped 2026-06-18)
- 🚧 **v1.3 InChIKey display & explanation** — Phases 11–13 (in planning)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–8) — SHIPPED 2026-06-05</summary>

- [x] Phase 1: Scaffold and Ketcher Mount (2/2 plans) — completed 2026-05-19
- [x] Phase 2: Data Pipeline (3/3 plans) — completed 2026-05-20
- [x] Phase 3: InChI Display and Explanation UI (5/5 plans) — completed 2026-05-21
- [x] Phase 4: Hover-to-Highlight Integration (3/3 plans) — completed 2026-05-22
- [x] Phase 5: Mapping Strip and Preset Molecules (3/3 plans) — completed 2026-05-22
- [x] Phase 6: Hydrogen Highlight, Polish, and Deploy (4/4 plans) — completed 2026-06-01
- [x] Phase 7: Multi-Fragment Highlighting, p-Layer, and Copy (3/3 plans) — completed 2026-06-01
- [x] Phase 8: Hydrogen Implicit & Explicit Highlight (2/2 plans) — completed 2026-06-05

Full phase details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 In-app feedback via prefilled GitHub issues (Phases 9–10) — SHIPPED 2026-06-18</summary>

- [x] Phase 9: Feedback URL builder, config & version injection (2/2 plans) — completed 2026-06-17
- [x] Phase 10: Feedback dialog, context capture & entry point (4/4 plans) — completed 2026-06-18

Full phase details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### v1.3 InChIKey display & explanation (Phases 11–13)

**Milestone goal:** Display the molecule's InChIKey below the InChI, with each segment color-coded, hoverable, and explained — mirroring the existing InChI strip treatment, while deliberately teaching the one place the link breaks: a one-way hash cannot point back to atoms.

**Granularity:** standard · **Coverage:** 12/12 v1.3 requirements mapped

- [x] **Phase 11: Source & Wiring** - Fetch the verbatim InChIKey from the same WASM source, store it atomically with the InChI, ride the existing race/empty guards (completed 2026-06-18)
- [x] **Phase 12: Render & Layout** - Render the verbatim key as color-coded segments with dimmed hyphens, local-state hover, and a copy button — as a leaf sibling that never remounts the canvas (completed 2026-06-18)
- [ ] **Phase 13: Content & Explanation** - Author per-segment explanation cards and the one-way-hash / collision / standard-flag teaching content

## Phase Details (v1.3)

### Phase 11: Source & Wiring

**Goal**: The molecule's InChIKey is computed live from the same in-browser WASM source as the InChI, stored verbatim, and stays in sync with the molecule across rapid edits, preset loads, and empty/invalid states.
**Depends on**: Nothing (extends the existing v1.0 pipeline; v1.2 shipped)
**Requirements**: INKEY-01, INKEY-02, INKEY-06
**Success Criteria** (what must be TRUE):

  1. When a user draws or loads a molecule, an InChIKey value appears in the store, computed via `ketcher.getInChIKey()` from the same WASM source as the InChI, updating in sync with the molecule.
  2. The stored InChIKey is the verbatim library output string — a test asserts the stored value equals the raw `getInChIKey()` output, with no reconstruction or re-joining.
  3. Under rapid edits, the InChIKey never lags or overwrites with a stale value — it rides the existing `generationRef` stale-result guard and is fetched concurrently with `getInchi(true)` via `Promise.allSettled` in the same debounced `handleChange` tick.
  4. Clearing the canvas (or an empty/invalid/disconnected structure) resets the InChIKey to empty in the same atomic write and in the catch path — no lingering key, no error.
  5. A pure `parseInchiKey.ts` returns segment offset ranges only (`{kind, start, end}`) and tolerates malformed/short keys without throwing — unit-tested, never returns reassembled text.

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 11-01-PLAN.md — parseInchiKey.ts pure offset parser + 6-group unit test suite
- [x] 11-02-PLAN.md — Extend Zustand store with inchiKey field and setInchiData trailing arg

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 11-03-PLAN.md — Wire Promise.allSettled concurrent fetch in handleChange; propagate inchiKey to all setInchiData call sites

### Phase 12: Render & Layout

**Goal**: The user sees the InChIKey rendered below the InChI strip as color-coded segments they can hover and copy — visually consistent with the InChI strip but with no canvas highlighting, and without ever remounting the Ketcher canvas.
**Depends on**: Phase 11 (needs the verbatim key in the store and the tested offset parser)
**Requirements**: INKEY-03, INKEY-04, INKEY-05
**Success Criteria** (what must be TRUE):

  1. The InChIKey appears below the InChI strip as color-coded segments — skeleton hash (14), remaining-layers hash (8), flag + version chars, protonation char — rendered by slicing the verbatim stored string; the two hyphens are visually dimmed/de-emphasized.
  2. Hovering a segment surfaces a per-segment explanation card and dims sibling segments, driven by a component-local `useState` hover index — and hovering a segment does NOT highlight any atoms or bonds in the canvas.
  3. A copy-to-clipboard control copies the verbatim InChIKey and shows a "Copied!" confirmation that resets after 3s and survives StrictMode double-mount (PLSH-04 parity, `mountedRef` reset-on-mount pattern).
  4. The strip renders only when the key matches the full 27-char format; otherwise it shows the same placeholder treatment as the empty InChI strip.
  5. Mounting the new section does not remount the Ketcher canvas (WASM does not re-initialize) and the existing InChI strip and its tests remain green — the section is a leaf sibling.

**Plans**: 2 plans, 2 waves
- [x] 12-01-PLAN.md — Store keyHoverKind field + InchiKeySection strip (colored segments, dimmed hyphens, copy button, 27-char gate) + App wiring (INKEY-03, INKEY-05)
- [x] 12-02-PLAN.md — Extend shared Explanation panel with per-segment key card scaffolding + D-04a precedence (INKEY-04)
**UI hint**: yes

### Phase 13: Content & Explanation

**Goal**: A chemist hovering any InChIKey segment understands what that segment encodes, why the key exists, and the critical mental-model corrections — it is a one-way hash, not reversible, not atom-mapped, and not collision-proof.
**Depends on**: Phase 12 (prose is authored against the finalized segments and rendered card)
**Requirements**: INKEY-07, INKEY-08, INKEY-09, INKEY-10, INKEY-11, INKEY-12
**Success Criteria** (what must be TRUE):

  1. Each segment's card describes its block structure correctly — 14-char skeleton/connectivity hash, 8-char remaining-layers (stereo/isotope/proton) hash, standard/non-standard flag + version char, protonation char — with offsets pinned by a slice-boundary + label unit test.
  2. Content explains the InChIKey's purpose: a fixed 27-char, web/database-search-friendly hashed form of the InChI.
  3. Content states the InChIKey is a one-way hash — not reversible and not atom-mappable — and explicitly notes its segments deliberately do NOT highlight atoms (unlike InChI layers); content also includes the collision caveat (improbable but theoretically possible; for lookup/indexing, not proof of identity).
  4. The skeleton-hash card notes that molecules sharing the same connectivity share this first block — the basis for InChIKey database/web lookup; the flag/version card distinguishes standard (`S`) vs non-standard (`N`) and the version character (`A`).
  5. Content notes that a multi-component/salt structure yields one key for the entire drawn assembly (no per-fragment keys), and no prose implies reversibility, atom-mapping, or guaranteed uniqueness.

**Plans**: TBD
**UI hint**: yes

## Cross-Cutting Invariants (carry into every v1.3 phase)

Project-memory and research invariants that gate this milestone:

1. **Verbatim passthrough** — displayed key === copied key === raw `getInChIKey()` output. Never reconstruct or re-join from parsed segments. (Phase 11 store contract, Phase 12 render/copy.)
2. **No canvas highlighting from key segments** — segments must NOT call `setHover`/`setSubHover`; the absence of highlighting is the central teaching point. (Phases 12 + 13.)
3. **Canvas never remounts** (D-13) — the InChIKey strip is a leaf sibling; never touch `KetcherPanel` / module-level `structServiceProvider`. (Phase 12.)
4. **Single pipeline, single atomic write** — fetch via `Promise.allSettled` inside the existing debounced `handleChange`; extend `generationRef` and the empty-canvas guard; do not add a parallel subscription/timer or a `handleMolSelectLogic` key fetch. (Phase 11.)

**No phase needs deeper research.** The one open question (InChIKey source API) is resolved with HIGH confidence: `ketcher.getInChIKey(): Promise<string>` is a typed public method on the installed `ketcher-core@3.12.0`, routing through the same WASM worker as `getInchi()`. Zero new dependencies. Deferred to v2: INKEY-F1 (web/PubChem search link), INKEY-F2 (charged-species preset), INKEY-F3 (hash-build deep dive).

## Non-Code Maintainer Checklist (not a phase)

Surfaced here so it isn't mistaken for implementation work (per the v1.2 requirements Out-of-Scope — repo-side label/template/triage setup is maintainer GitHub config, not app code):

- [ ] Optional repo-side GitHub settings: create `bug` / `explanation` / `highlighting` / `feedback` / `suggestion` labels, an optional `.github/ISSUE_TEMPLATE/config.yml`, and interaction limits for spam. Categorization works via title prefix regardless, so this is best-effort.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Scaffold and Ketcher Mount | v1.0 | 2/2 | Complete | 2026-05-19 |
| 2. Data Pipeline | v1.0 | 3/3 | Complete | 2026-05-20 |
| 3. InChI Display and Explanation UI | v1.0 | 5/5 | Complete | 2026-05-21 |
| 4. Hover-to-Highlight Integration | v1.0 | 3/3 | Complete | 2026-05-22 |
| 5. Mapping Strip and Preset Molecules | v1.0 | 3/3 | Complete | 2026-05-22 |
| 6. Hydrogen Highlight, Polish, and Deploy | v1.0 | 4/4 | Complete | 2026-06-01 |
| 7. Multi-Fragment Highlighting, p-Layer, and Copy | v1.0 | 3/3 | Complete | 2026-06-01 |
| 8. Hydrogen Implicit & Explicit Highlight | v1.0 | 2/2 | Complete | 2026-06-05 |
| 9. Feedback URL builder, config & version injection | v1.2 | 2/2 | Complete | 2026-06-17 |
| 10. Feedback dialog, context capture & entry point | v1.2 | 4/4 | Complete | 2026-06-18 |
| 11. Source & Wiring | v1.3 | 3/3 | Complete   | 2026-06-18 |
| 12. Render & Layout | v1.3 | 2/2 | Complete   | 2026-06-18 |
| 13. Content & Explanation | v1.3 | 0/0 | Not started | - |

---
*Roadmap created: 2026-05-18*
*Updated: 2026-06-18 — v1.3 milestone (InChIKey display & explanation) roadmap added; Phases 11–13*
*Updated: 2026-06-18 — Phase 11 plans created (3 plans, 2 waves)*
*Updated: 2026-06-18 — Phase 12 plans created (2 plans, 2 waves)*
