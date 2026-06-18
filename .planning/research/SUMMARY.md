# Project Research Summary

**Project:** Explain that InChI
**Domain:** In-browser InChIKey display & explanation (v1.3) — educational chemistry SPA
**Researched:** 2026-06-18
**Confidence:** HIGH

## Executive Summary

**The milestone's one open technical question is RESOLVED, and the answer is the cheapest possible one.** The InChIKey is already obtainable from the public Ketcher API the app ships today: `ketcher.getInChIKey(): Promise<string>` is a typed, public method on the same `Ketcher` instance the app already holds (verified directly in installed `ketcher-core@3.12.0` source, `ketcher.d.ts:52`). It routes through the same `StandaloneStructServiceProvider` WASM worker as the existing `getInchi()`, backed by the same already-loaded `indigo-ketcher@1.40.0` build. There is **no backend, no new npm dependency, no new WASM asset, no direct `indigo-ketcher` import** — this mirrors the "zero new deps" outcome of v1.2. This single fact reshapes nothing downstream and de-risks the entire milestone.

The recommended approach is a **clean additive leaf strip**: fetch the InChIKey concurrently with the existing debounced `getInchi(true)` via `Promise.all` inside the *same* `handleChange` tick, store one verbatim `inchiKey: string` field (committed atomically with the InChI), and render color-coded segments by **slicing the verbatim string by index offset** — never reconstructing it. The InChIKey is a fixed 27-char string `AAAAAAAAAAAAAA-BBBBBBBBFV-P` (14-char skeleton hash, hyphen, 8-char remaining-layers hash + flag char `S`/`N` + version char `A`, hyphen, protonation char) with exactly **two hyphens** and a **10-char visible middle segment**. Crucially, because the key is a one-way hash, its segments do **NOT** drive canvas highlights — and that deliberate divergence from the InChI strip is itself the central teaching moment.

The dominant risks are not technical-feasibility risks (those are gone) but **discipline risks** — repeating known project bugs in a new place. The standing no-reconstruct rule must hold (slice verbatim, never re-join segments); the key must ride the existing `generationRef` stale-result guard and empty-canvas guard (no parallel pipeline); the new strip must be a leaf sibling so the canvas never remounts (D-13); the copy button must reuse the StrictMode-safe `mountedRef` pattern; and the explanation prose must never imply the key is reversible, atom-mappable, or collision-proof. All of these have proven prevention patterns already in the codebase.

## Key Findings

### Recommended Stack

See [STACK.md](./STACK.md). **No new dependencies.** Everything needed already ships in the installed 3.12.0 Ketcher packages. The InChIKey comes from the exact same WASM module that already produces the InChI, so there is no second cheminformatics engine, no bundle growth, and no risk of a divergent key. Segment splitting is pure app-code string slicing on a fixed grammar — no parsing library required.

**Core technologies (confirm, don't add):**
- **ketcher-core 3.12.0** (installed): exposes `Ketcher.getInChIKey(): Promise<string>` and the `Ketcher` type — the InChIKey API lives here
- **ketcher-standalone 3.12.0** (installed): `StandaloneStructServiceProvider` → WASM `IndigoService.getInChIKey` (`Command.GetInChIKey = 11`) — WASM-backed, no backend
- **indigo-ketcher 1.40.0** (transitive, installed): underlying WASM that hashes structure → InChIKey — already loaded for `getInchi()`; **do NOT import directly**
- **React 18 / Zustand 5 / CSS Modules + oklch tokens** (all installed): one new `inchiKey: string` store field; reuse the existing token palette and Vitest setup

### Expected Features

See [FEATURES.md](./FEATURES.md). No existing tool teaches the *anatomy* of an InChIKey interactively — that gap is exactly this milestone's value. The InChIKey strip mirrors the InChI strip's hover/color/copy treatment but with fewer, simpler regions (5 colored segments + dimmed hyphens) because it is "just a hash."

**Must have (table stakes):**
- Live InChIKey displayed below the InChI strip, computed from the same WASM source
- Correct 27-char, 5-segment rendering with exact boundaries (two hyphens only; 10-char visible middle)
- Per-segment color-coding (reuse oklch tokens; echo the corresponding InChI layer color where one exists)
- Per-segment hover explanation cards (skeleton hash / remaining-layers hash / flag+version / protonation)
- Explanatory content: fixed-length & purpose, one-way hash (not reversible, no atom mapping), collision caveat
- Explicit "segments don't highlight atoms because it's a hash" teaching note
- Copy-to-clipboard parity (PLSH-04), verbatim key
- Empty/invalid structure → placeholder (PLSH-01 parity)

**Should have (competitive differentiators):**
- "First block = same skeleton" DB-search insight (one sentence in the block-1 card)
- Standard-vs-non-standard (`S`/`N`) and version (`A`) explained inside the flag/version card
- The hash-as-lesson framing that turns *absence* of highlighting into pedagogy

**Defer (v2+):**
- "Search this InChIKey on the web / PubChem" outbound link (trigger: users ask how to look it up)
- Charged-species preset to live-demo the protonation char (ties into CONT-01 preset expansion)
- First-block partial-match interactive / "how the hash is built" deep dive

**Anti-features (explicitly NOT built):** canvas highlight on key-segment hover (impossible & misleading), decode/reconstruct molecule from a pasted key (one-way hash), editable paste-in key field, in-app database/substructure search.

### Architecture Approach

See [ARCHITECTURE.md](./ARCHITECTURE.md). The feature is a clean additive strip that reuses the existing **CSS/visual pattern** but **NOT** the `LayerText`/highlight machinery (that exists only to drive canvas highlights, which the key has none). The no-reconstruct rule is enforced *by construction*: the parser returns only `{kind, start, end}` index ranges, and the renderer slices the stored verbatim string — there is no code path that joins segment text.

**Major components:**
1. **`App.tsx`** (modified) — add `getInChIKey()` via `Promise.all` alongside `getInchi(true)` in the existing debounced handler; pass key into `setInchiData`
2. **`store.ts`** (modified) — add `inchiKey: string` field; append optional arg to `setInchiData` for one atomic write per generation
3. **`lib/parseInchiKey.ts`** (new, pure) — `parseInchiKeySegments(key)` returns offset ranges only; unit-tested, no DOM, malformed-tolerant
4. **`lib/inchiKeyInfo.ts`** (new) — segment titles/blurbs/swatches map (mirrors `layerInfo.ts`)
5. **`components/InchiKeySection.tsx`** (new) — verbatim-slice render, color spans, local hover index, copy button — NO canvas coupling
6. **`components/InchiKeyExplanation.tsx`** (new) — per-segment card reusing `Explanation.module.css`

Key pattern: **local `useState` hover index**, NOT the Zustand `subHover` bus (which is observed by `useKetcherHighlights` and would fire spurious canvas highlights and collide with the InChI strip's `hoverIdx`).

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md). The top risks are all repeats of solved project bugs, now in a new surface:

1. **Reconstructing the key from segments** (repeat of the InChI `.`-drop passthrough bug) — slice the verbatim `getInChIKey()` output by fixed offset for coloring only; never re-join. Assert `displayed === raw` and `copyPayload === raw` in tests.
2. **Parallel pipeline / desync race** — issue `getInChIKey()` inside the *existing* `handleChange` debounce, in the same `generationRef` window, re-check `thisGen` after the await, write atomically. No second subscription, timer, or generation counter.
3. **Wrong/empty key on empty/disconnected/multi-component structures** — gate behind the same empty guard; clear key to `''` in the same atomic write and in the catch path; validate full 27-char format (`/^[A-Z]{14}-[A-Z]{8}-[A-Z]{3}$/`) before slicing; state that multi-component molecules get ONE key for the whole assembly.
4. **Canvas remount** (D-13 invariant) — add `InchiKeySection` as a leaf sibling after `InchiSection`; never touch `KetcherPanel`/`structServiceProvider`; add store fields, don't reshape existing ones.
5. **Implying reversibility / atom-mapping / collision-proof** — key segments must NOT call `setHover`/`setSubHover`; prose states one-way hash, not reversible, no atom mapping, collisions improbable-but-real.

Secondary: serial WASM cost (use `Promise.all`), StrictMode copy-confirmation bug (reuse `mountedRef` reset-on-mount), preset-load stale timing (inherited correctly by riding `handleChange`), mislabeled segment boundaries (pin offsets with constants + test).

## Implications for Roadmap

All four research files independently converged on the **same three-phase shape**: Source & wiring → Render & layout → Content & explanation. This ordering puts the (now de-risked) external-dependency piece first, the tested-pure-seam second, and the prose last.

### Phase 1: Source & Wiring
**Rationale:** Although the API is confirmed, fetching/storing/syncing the key gates everything downstream and carries every sync/race/empty-state pitfall. Lock the verbatim-passthrough invariant into the store contract *before* any rendering.
**Delivers:** `inchiKey` store field; `getInChIKey()` fetched via `Promise.all` inside the existing debounced `handleChange`; atomic write with the InChI; empty/invalid + catch-path clearing; stale-generation guard extended to the key.
**Addresses:** "Live InChIKey computed from the same source" (P1 table stakes); pure `parseInchiKey.ts` offset parser + tests (build the tested seam first, per the v1.2 precedent).
**Avoids:** Pitfalls 1 (reconstruct), 2 (derive-from-InChI mismatch), 3 (desync race), 4 (empty/multi-component), 5 (serial WASM cost), 10 (preset-load stale timing).

### Phase 2: Render & Layout
**Rationale:** With a verbatim key in the store and a tested parser, build the visible strip as a leaf sibling that cannot remount the canvas.
**Delivers:** `InchiKeySection` rendering verbatim slices as color-coded spans (reuse oklch tokens + `InchiSection.module.css`), dimmed hyphens, local hover index, copy button via a shared StrictMode-safe `useCopyButton` hook, empty-state placeholder, 27-char format gate before slicing.
**Uses:** React 18 local `useState`, existing CSS Modules token system, `navigator.clipboard`.
**Implements:** `InchiKeySection` + its CSS module; the no-canvas-coupling architecture edge.
**Avoids:** Pitfalls 6 (canvas remount / break InChI strip), 9 (copy confirmation StrictMode), and the rendering half of 4 (length validation) and 8 (no highlight wiring on key segments).

### Phase 3: Content & Explanation
**Rationale:** Prose depends on finalized segments; authored last against the verified spec.
**Delivers:** `inchiKeyInfo.ts` blurbs (skeleton hash / remaining-layers hash / flag `S`-`N` + version `A` / protonation `N`/`O…`/`M…`); `InchiKeyExplanation` card; cross-cutting "one-way hash, not reversible, no atom mapping, collision caveat, one key per whole assembly" copy; slice-boundary + label unit test.
**Addresses:** All explanatory-content table stakes + the hash-as-lesson differentiator.
**Avoids:** Pitfalls 7 (mislabeled boundaries/meaning) and 8 (false reversibility/atom-map/collision-proof claims).

### Phase Ordering Rationale
- **Dependency-driven:** the key value must exist in the store before it can be rendered, and segments must be finalized before prose is authored. Source → Render → Content is the only valid topological order.
- **Risk-front-loaded:** the single external-dependency step is first (now confirmed safe), so no surprise reshapes downstream work — and every sync/race/empty pitfall is contained in one phase with the existing generation-guard tests as the regression gate.
- **Reuse-aligned:** Phase 2 reuses CSS + copy pattern; Phase 3 reuses the explanation-card markup — neither requires new infrastructure, keeping the milestone LOW–MEDIUM complexity overall.

### Research Flags

Phases likely needing deeper research during planning:
- **None.** The one open question (how to obtain the key) is resolved with HIGH confidence against installed source. The InChIKey format spec is stable and triple-sourced. No phase warrants `--research-phase`.

Phases with standard patterns (skip research-phase):
- **Phase 1:** the debounce/generation-guard/atomic-store pipeline is established and tested (D-05); the API call is a one-line sibling to `getInchi(true)`.
- **Phase 2:** leaf-sibling layout (D-13), CSS token reuse, and the StrictMode copy pattern (WR-02) are all proven in the existing codebase.
- **Phase 3:** content authoring against the verified, citable spec in FEATURES.md Part 1 — no further research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | API verified by reading installed `ketcher-core`/`ketcher-standalone` 3.12.0 source directly, not just docs; zero new deps |
| Features | HIGH | InChIKey segment structure cross-verified across the IUPAC paper, Wikipedia, and the InChI Trust Technical FAQ |
| Architecture | HIGH | Designed against the real codebase (`App.tsx`, `store.ts`, `InchiSection.tsx`, `useKetcherHighlights.ts`); reuses proven v1.0–v1.2 patterns |
| Pitfalls | HIGH | Each pitfall mapped to a documented prior bug/decision (passthrough rule, D-05, D-13, WR-02, INCHI-06) with verified prevention |

**Overall confidence:** HIGH

### Gaps to Address

- **`getInChIKey()` behavior on empty/disconnected canvas** (reject vs `''` vs degenerate): wrap in the existing try/catch and clear-to-empty path; confirm the exact behavior in the Phase 1 smoke test rather than assuming. (LOW risk — same behavior class as `getInchi()`.)
- **Protonation char ±12 saturation to `A`** (extremely rare edge): footnote in content, not foreground; no test fixture required. (MEDIUM-confidence detail, negligible impact.)
- **Card placement** (inside the strip vs. its own panel row): a design-handoff decision deferred to Phase 2 planning, not a research gap.
- **Whether to extract a shared `useCopyButton` hook** (touches `InchiSection`, one extra modified file) vs. copy the helper: a Phase 2 implementation choice; extraction is recommended but optional.

## Sources

### Primary (HIGH confidence)
- Installed `ketcher-core@3.12.0` source — `ketcher.d.ts:52` (`getInChIKey(): Promise<string>`), `structService.types.d.ts:150`, `index.js:59610` (delegates to `structService.getInChIKey`)
- Installed `ketcher-standalone@3.12.0` source — `main.js:761` (`IndigoService.getInChIKey`, `Command.GetInChIKey=11`), `main.js:625` (maps `ChemicalMimeType.InChIKey`); `indigo-ketcher@1.40.0` (Apache-2.0, already vendored)
- IUPAC InChI paper (Heller et al., *J. Cheminformatics* 2015) — segment definitions & protonation mapping: https://jcheminf.biomedcentral.com/articles/10.1186/s13321-015-0068-4
- InChI Trust Technical FAQ — char counts, `S`/`N` flag, version `A`, protonation incl. ±12 saturation, one-way hash, real-world collisions: https://www.inchi-trust.org/technical-faq/
- Existing codebase patterns — `src/App.tsx` (debounce + `generationRef` D-05, `isHighlightingRef`, `isSettingMoleculeRef`, module-level `structServiceProvider` D-13), `src/components/InchiSection.tsx:28-44` (StrictMode `mountedRef` copy WR-02, verbatim slice), `src/store.ts`, `src/lib/handleMolSelectLogic.ts`
- Project memory `feedback_inchi_passthrough.md` (no-reconstruct rule); PROJECT.md Key Decisions

### Secondary (MEDIUM confidence)
- Wikipedia, *International Chemical Identifier* (InChIKey section) — format string, collision estimate (matches IUPAC paper): https://en.wikipedia.org/wiki/International_Chemical_Identifier
- InChIKey collision-resistance study, *J. Cheminformatics* 2012: https://jcheminf.biomedcentral.com/articles/10.1186/1758-2946-4-39
- NCI/CADD InChIKey resolver blog (real-world lookup use): https://cactus.nci.nih.gov/blog/?tag=inchikey-resolver

### Tertiary (LOW confidence)
- (none — all findings corroborated by at least two sources or installed source)

---
*Research completed: 2026-06-18*
*Ready for roadmap: yes*
