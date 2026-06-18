# Phase 12: Render & Layout - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Render the verbatim InChIKey (from the Phase 11 store field) below the InChI strip as **color-coded, hoverable segments** with **dimmed hyphens** and a **copy button** — visually consistent with the InChI strip but with **no canvas highlighting** and **no canvas remount**. A new `InchiKeySection` leaf sibling slices the verbatim stored string by the offsets from `parseInchiKey()`; hovering a segment surfaces a per-segment explanation card and dims its siblings.

This phase is **render + layout + hover wiring + copy + the 27-char gate only** — the explanation *prose* for each segment is Phase 13. Phase 12 builds the rendered card surface that Phase 13 fills with content.

**Requirements:** INKEY-03, INKEY-04, INKEY-05.
</domain>

<decisions>
## Implementation Decisions

### Segment colors
- **D-01:** Reuse the **existing InChI layer color tokens** (no new `--c-key-*` palette). Semantic mapping: `skeleton → --c-conn` (connectivity green), `hash → --c-stereo`, `flag → --c-version`, `version → --c-version`, `protonation → --c-proton`. Reinforces the conceptual link between key blocks and InChI layers; zero new tokens. (Exact token-per-kind mapping is a starting point — Claude may refine for legibility, but stay within the existing oklch token set; do NOT introduce a new palette.)
- **D-02:** Each of the 5 parser segments is **distinctly colored** — including the three single-char segments (flag, version, protonation). Keeps all 5 segments visually granular, matching the 5-segment parser data and Phase 13's per-segment cards.

### Per-segment explanation card location
- **D-03:** **Extend the shared `Explanation` panel** to render key-segment cards (do NOT build a second standalone card surface inside `InchiKeySection`). The panel shows key-segment content when a key segment is hovered; otherwise it falls back to InChI-layer content / idle as today.
- **D-04 (CRITICAL — Invariant #2 preservation):** Key hover is routed through a **new, dedicated Zustand field** (suggested name `keyHoverKind`; exact name Claude's discretion) that is **NOT wired to `useKetcherHighlights`**. Key segments must NEVER call `setHover` / `setSubHover` (those drive canvas highlighting). The new field is read by the `Explanation` panel only. This is the *only* sanctioned way to "extend the shared panel" — it keeps Invariant #2 (key segments never highlight atoms/bonds) intact while letting the shared panel render key content.
- **D-04a:** Precedence when resolving what the shared panel shows is Claude's discretion, but the natural rule (only one strip can be hovered at a time; `onMouseLeave` clears each strip's own hover) is: key-hover content when `keyHoverKind` is set, else InChI-layer content when `hoverIdx` is set, else idle.

### Section placement & label
- **D-05:** Layout order in `App.tsx`: `KetcherPanel → InchiSection → InchiKeySection → Explanation`. The two string strips sit together above the shared explanation panel (natural reading order).
- **D-06:** **No section-label row** above the key strip (the `.sectionLabel` CSS class stays unused; do not retroactively add labels to the InChI strip either). The strip is identified by its dimmed inline prefix (D-09) + distinct colors + the explanation card.

### Hover zones (hit-target ergonomics)
- **D-07:** **4 hover zones**, NOT 5: `skeleton`, `hash`, **`flag+version` (combined)**, `protonation`. The flag+version pair (the trailing `SA` before the last hyphen) shares one hover zone and surfaces **one combined card**. D-09 of Phase 11 explicitly permits visual grouping while keeping the parser data granular.
- **D-08:** Parser data stays **5-segment granular** — the 5 colored spans are still individually colored (D-02); only the *hover targeting* groups flag+version. The combined flag+version card must cover both standard/non-standard flag (`S`/`N`) AND version (`A`) — this satisfies Phase 13's INKEY-12 in a single card.

### Distinguishing affordance & empty state
- **D-09:** Render a **dimmed, ink-faint inline `InChIKey` prefix** inside the box, mirroring how the InChI strip leads with a dimmed `InChI=` prefix (exact text/punctuation Claude's discretion — there is no `=` in the key format; `InChIKey` or `InChIKey:` are both fine). Cheap, consistent, identifies the strip before hover.
- **D-10:** **Empty state mirrors the InChI empty strip** (SC-4): always render the box, dimmed via the existing `data-empty="true"` treatment (0.45 opacity, soft border, `pointer-events: none`), with a parallel hint: **"Draw a molecule above to see its InChIKey."** The box shows whenever the stored key is not a valid 27-char format (i.e. `parseInchiKey()` returns `[]`).

### Copy button & transitions
- **D-11:** **Duplicate the proven copy pattern inline** inside `InchiKeySection` (copied-state + `mountedRef` StrictMode-safe reset + 3s timeout) rather than extracting a shared `useCopyButton` hook. Zero risk to the green `InchiSection`; "leaf sibling, don't touch what works." Copies the **verbatim stored `inchiKey`** (Invariant #1). Shows a "Copied!" confirmation that resets after 3s.
- **D-12:** Hover active/dim treatment **mirrors the InChI strip exactly**: 160ms background+color transition on the active segment, 0.35 opacity on dimmed siblings, same chip padding/radius. Maximum visual consistency.

### Claude's Discretion
- Exact `keyHoverKind` field name and its value encoding (per-kind vs per-hover-zone; e.g. a `'flagVersion'` zone value) (D-04, D-07).
- Exact token-per-segment-kind mapping within the existing palette, refined for legibility at the 19px mono size (D-01).
- Exact prefix text/punctuation (`InChIKey` vs `InChIKey:`) (D-09).
- Panel precedence rule implementation (D-04a).
- Whether the combined flag+version card and the protonation card are distinct slices or share rendering scaffolding (D-07/D-08) — as long as data stays granular.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope & contract
- `.planning/ROADMAP.md` § "Phase 12: Render & Layout" — goal + 5 success criteria (SC-1 segments/dimmed hyphens, SC-2 local hover + no canvas highlight, SC-3 copy + StrictMode, SC-4 27-char gate/placeholder, SC-5 no canvas remount / InChI tests green).
- `.planning/ROADMAP.md` § "Cross-Cutting Invariants (carry into every v1.3 phase)" — #1 verbatim passthrough, **#2 no canvas highlighting from key segments (CENTRAL to this phase — see D-04)**, #3 canvas never remounts (leaf sibling), #4 single pipeline (Phase 11, already wired).
- `.planning/REQUIREMENTS.md` § "v1.3 Requirements" — INKEY-03, INKEY-04, INKEY-05.

### Project decisions
- `.planning/PROJECT.md` § "Key Decisions" — esp. D-13 (provider at module level / canvas never remounts), CSS Modules + oklch token system (no new palette per D-01).
- `.planning/STATE.md` § "v1.3 Key Decisions" — verbatim passthrough invariant, no-canvas-highlight rationale, copy-button `mountedRef` (WR-02) pattern.

### Phase 11 contract (direct upstream)
- `.planning/phases/11-source-wiring/11-CONTEXT.md` — store field `inchiKey` (D-03), `parseInchiKey` returns offset ranges only (D-07/D-08/D-09), 5 segment kinds, hyphens not segments.

### Existing code (primary integration & visual-analog surface)
- `src/components/InchiSection.tsx` — the strip Phase 12 mirrors: layer-span mapping, active/dim classes, copy button + `mountedRef`/3s reset, `data-empty` empty state, `onMouseLeave` hover clear.
- `src/components/InchiSection.module.css` — verbatim visual values to mirror (D-12): `.inchiDisplay`, `.inchiLayer`, `.active`, `.dim` (0.35), `.prefix`/`.inchiPrefix` (dimmed prefix → D-09), `.copyBtn`/`.copiedFeedback`, `.inchiDisplay[data-empty="true"]`, `.emptyHint`.
- `src/components/Explanation.tsx` — the shared panel to extend (D-03/D-04); currently reads Zustand `hoverIdx` + `layers`; add a `keyHoverKind` read.
- `src/store.ts` — add the new `keyHoverKind` field + setter (NOT wired to highlights).
- `src/hooks/useKetcherHighlights.ts` — MUST stay driven only by `hoverIdx`/`subHoverIdx`; the new key-hover field must never reach it (Invariant #2).
- `src/App.tsx` lines 220–240 — render order; insert `<InchiKeySection />` between `<InchiSection />` and `<Explanation />` (D-05).
- `src/lib/parseInchiKey.ts` — the offset parser consumed here; segment kinds + `[]`-on-malformed (drives the 27-char gate / empty state, D-10).
- `src/lib/layerInfo.ts` — `swatchVar()` maps layer types → `--c-*` tokens; the analog for choosing key-segment tokens (D-01).

No external specs/ADRs beyond the `.planning/` docs above — requirements fully captured in decisions.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`InchiSection.tsx`** — near-complete template for `InchiKeySection`: span-mapping with `active`/`dim` classes, inline `style` color from a token, copy button with `mountedRef` + 3s reset, `data-empty` placeholder, `onMouseLeave` to clear hover. Duplicate inline (D-11), adapting hover to local/`keyHoverKind` wiring instead of `setHover`/`setSubHover`.
- **`InchiSection.module.css`** — copy the relevant rules into a new `InchiKeySection.module.css` with verbatim values (D-12).
- **`Explanation.tsx`** — extend to read `keyHoverKind` and render key-segment content (Phase 13 supplies the actual prose; Phase 12 wires the branch + scaffolding).
- **`parseInchiKey()`** — already tested; returns `[]` for non-27-char keys → drives the gate + empty state cleanly.

### Established Patterns
- Per-layer accent color via `swatchVar(type)` → `var(--c-<token>)` inline style; key segments follow the same pattern with the D-01 mapping.
- `data-empty="true"` attribute toggles the dimmed placeholder box (don't conditionally unmount the box — mirror InChI).
- Copy button: `mountedRef` reset-on-mount guards `setCopied(false)` against StrictMode double-mount (WR-02 / PLSH-04).
- Hover clear on `onMouseLeave` of the display box.

### Integration Points
- `store.ts` → new `keyHoverKind` field + setter (NOT wired to `useKetcherHighlights`).
- `Explanation.tsx` → reads `keyHoverKind`; precedence with existing `hoverIdx`.
- `App.tsx` → `<InchiKeySection />` inserted between InChI strip and Explanation panel.
- `InchiKeySection` (new) → reads `inchiKey` from store, slices verbatim via `parseInchiKey()` offsets, owns the 4 hover zones (D-07).

### Guardrails (do not violate)
- **Never** `setHover`/`setSubHover` from key segments (Invariant #2 — the absence of canvas highlighting is the teaching point).
- **Never** touch `KetcherPanel` / module-level `structServiceProvider` (canvas never remounts, D-13). `InchiKeySection` is a pure leaf sibling.
- **Never** reconstruct/re-join the key — slice the verbatim stored string only (Invariant #1). Displayed key === copied key === raw stored `inchiKey`.
- Existing `InchiSection` and its tests must remain green (SC-5) — duplicate inline rather than refactor (D-11).
</code_context>

<specifics>
## Specific Ideas

- Standard InChIKey layout being rendered: `AAAAAAAAAAAAAA-BBBBBBBBFV-P` = skeleton(14) `-` hash(8)+flag(1)+version(1) `-` protonation(1), 27 chars; hyphens at indices 14 and 25 (dimmed, NOT hoverable, NOT segments).
- Hover zones: `[skeleton] - [hash][flag+version] - [protonation]` = 4 targets. Color spans stay 5 (flag and version individually colored within the shared hover zone).
- Dimmed inline prefix reads like the InChI strip's `InChI=` — e.g. `InChIKey` in ink-faint.
- Empty hint text: "Draw a molecule above to see its InChIKey." (parallels the InChI strip's hint).
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Per-segment explanation *prose*, one-way-hash / collision / standard-flag teaching content → Phase 13. Web/PubChem search link, charged-species preset, hash-build deep dive → v2 per INKEY-F1/F2/F3.)
</deferred>

---

*Phase: 12-Render & Layout*
*Context gathered: 2026-06-18*
