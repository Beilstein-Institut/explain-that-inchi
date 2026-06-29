# Phase 18: Explanation-card wiring + live chemist gate - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the existing explanation card (`src/components/Explanation.tsx`) sub-token-aware by inserting **one** precedence branch: when a sub-token is hovered or pinned, the card shows its Phase-17 `subTokenInfo()` copy; otherwise it falls through to the existing whole-layer card. Then a human chemist verifies the live card strings on real molecules before the milestone closes.

**Requirements:** SUBEX-01, SUBEX-02, SUBEX-07, SUBEX-09 (see ROADMAP.md Phase 18 success criteria 1–5).

In scope: the new render branch in `Explanation.tsx`, the `effSub` derivation, accent wiring, and the live chemist gate. Out of scope: any store change, any new card/surface, any change to `subTokenInfo.ts` copy logic, any canvas/provider/highlight file.
</domain>

<decisions>
## Implementation Decisions

### Card accent color
- **D-01:** The sub-token card's left accent strip **inherits the parent layer's swatch color** (formula-element card → formula color, h-layer sub-token → h color, t-layer stereo → stereo color), consistent with how the layer card already derives accent via `swatchVar`.
- **D-01a (planner note):** Parent layer is obtained from `effIdx` (`pinned ? pinned.idx : hoverIdx`). On **pin**, `pinned.idx` is exact. On **hover**, `setSubHover(hit)` is called without `setHover`, but `hoverIdx` normally remains the parent layer index because React `onMouseEnter`/`onMouseLeave` do not fire a parent-leave when the cursor enters a child span (verified in `LayerText.tsx:25-28`). If `hoverIdx` proves unreliable in practice, fall back to a `sub.kind → layer type` mapping (`element`→formula, `hAtoms`/`mobileH`→h, `stereo`→t). Do NOT add a store field to carry this.

### Visual distinction
- **D-02:** The sub-token card is **structurally identical** to the existing cards — title + body only, same `styles.card`/`styles.active` markup as the key-segment branch. No breadcrumb, no parent-layer label, no new CSS element. The title (`Tetrahedral stereocenter`, `Carbon (C)`, `Hydrogen count`, `Mobile hydrogen`) already signals specificity.

### Atom-label specificity
- **D-03:** Keep the bare **`atom N`** phrasing already produced by `subTokenInfo.ts` (Phase-17 D-08-safest). Do NOT consume `atomElements` for element-prefixed labels. This means **`subTokenInfo.ts` and its tests are not reopened** — Phase 18 only wires the existing module output into the card.

### Chemist accuracy gate (SC#5 — load-bearing control)
- **D-04:** The gate runs as part of `/gsd-verify-work 18`. Claude selects a real-molecule set covering all four cases — **tetrahedral stereo, mobile-H, H-count, multi-fragment element** — the user (a chemist at the Beilstein-Institut) hovers each live in the running app and confirms the card strings are chemically accurate. Sign-off is recorded as UAT items in `18-UAT.md`. The gate must not be bypassed before the phase is marked verified (this closes Phase 17's deferred SUBEX-10 prose gate, folded here per the Phase-17 HANDOFF).
- **D-04a (planner note):** The molecule set must produce real `getInchi()` output exercising each case (e.g. a stereocenter molecule with `/t/m/s`, a tautomer with a mobile-H `(H,X,Y)` group, a heteroatom bearing explicit H, and a multi-component/salt formula). No fabricated InChI — repeat-offense risk from v1.4.

### Claude's Discretion
- Exact placement/formatting of the new JSX branch (must sit **between** the `keyHoverKind` branch and the `layer` branch per the locked precedence).
- The precise real-molecule choices for the chemist gate (subject to D-04a constraints).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked invariants & precedence (this milestone)
- `.planning/STATE.md` "Key Decisions (carry-forward)" — v1.5 invariants (verbatim-passthrough, no-remount, read-only card tier), v1.5 precedence (insert sub-token branch BETWEEN `keyHoverKind` and `layer`; guard on the `subTokenInfo` **result**, not `effSub`, so c-layer kinds → `null` → fall through), and v1.5 chemical-correctness pins.
- `.planning/ROADMAP.md` Phase 18 — success criteria 1–5 (the acceptance contract).

### Code to modify / consume
- `src/components/Explanation.tsx` — the single file to edit; insert the sub-token branch in the existing precedence ladder (currently keyHoverKind → layer → legend → idle, lines 71-136).
- `src/lib/subTokenInfo.ts` — Phase-17 pure module; `subTokenInfo(sub, atomElements)` returns `{title, body, reading?} | null`. Consume as-is (D-03: not reopened).
- `src/store.ts` — `subHover` (line 39) and `pinned.sub` (line 42) already exist and are written by `LayerText`; **zero store changes** (no-remount invariant). `setInchiData` already resets `pinned: null`.
- `src/components/LayerText.tsx:25-38` — `subHoverProps` writes `subHover` on enter / clears on leave / pins on click; threads `layerIdx`. Source of the D-01a hover-vs-pin accent behavior.
- `src/lib/layerInfo.ts` — `swatchVar` + `ELEMENT_NAMES` (Phase-17 full periodic table).

### Lesson docs
- `.planning/phases/17-sub-token-copy-core-element-table-pure-module-tests/17-REVIEW.md` — WR-01/WR-02 guard suggestions; optionally land before/with this phase.
- Memory `feedback_real_domain_fixtures_and_gates` / `feedback_inchi_passthrough` — real fixtures + verbatim passthrough; do not bypass the human gate.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Explanation.tsx` key-segment branch (lines 71-83): exact template for the new sub-token branch — `styles.card styles.active`, `--accent` via inline style, title + body as React text children (no innerHTML). Copy this shape.
- `swatchVar(layer.type)` → `var(--c-${...})`: existing accent derivation; reuse for D-01.
- `effIdx = pinned ? pinned.idx : hoverIdx` (line 46): mirror this exact pattern for `effSub = pinned ? pinned.sub : subHover`.

### Established Patterns
- Precedence ladder is a single chained ternary in JSX; the new branch is inserted as one more `cond ? (...) :` link.
- Cards render prose as React text children only (security/D-07) — sub-token strings are HTML-free by Phase-17 design.
- Card tier is read-only: never call `setHover`/`setSubHover`/highlight APIs from `Explanation.tsx`.

### Integration Points
- New branch reads `subHover`, `pinned`, `atomElements`, and (for accent) the parent `layer` already derived from `effIdx`. Guard: compute `const subCopy = effSub ? subTokenInfo(effSub, atomElements) : null;` and branch on `subCopy` so c-layer kinds (`atom`/`bond`/`branch` → `null`) fall through to the layer card.
- InChIKey-segment hover (`keyHoverKind`) must still win over a sub-token (branch stays above the new one).

</code_context>

<specifics>
## Specific Ideas

- Sub-token card should feel like the same card "zooming in" — same chrome, layer-colored strip, only the prose changes. No new surface, no breadcrumb.
- Chemist reviewer is the user themselves (domain expert at the Beilstein-Institut), reviewing live in the running app during verify-work.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Element-prefixed atom labels via `atomElements` were considered and explicitly declined for this milestone; the param stays available for a future phase if ever wanted.)

</deferred>

---

*Phase: 18-explanation-card-wiring-live-chemist-gate*
*Context gathered: 2026-06-29*
