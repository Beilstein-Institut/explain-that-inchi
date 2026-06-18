# Phase 11: Source & Wiring - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Compute the molecule's InChIKey live from the **same in-browser WASM source** as the InChI (`ketcher.getInChIKey()`), store it **verbatim and atomically** alongside the InChI, and keep it in sync across rapid edits, preset loads, and empty/invalid states. Also deliver a pure, offset-only `parseInchiKey.ts` that segments a key without ever reassembling text.

This phase is **source & wiring + the parser contract only** — no rendering, no hover, no copy button, no explanation content (those are Phases 12–13).

**Requirements:** INKEY-01, INKEY-02, INKEY-06.
</domain>

<decisions>
## Implementation Decisions

### Concurrent fetch & independent-failure handling
- **D-01:** Fetch `getInchi(true)` and `getInChIKey()` concurrently in the **existing debounced `handleChange` tick** (`src/App.tsx`), riding the existing `generationRef` stale-result guard (one `++generationRef.current` per tick; discard if `thisGen !== generationRef.current` after both resolve).
- **D-02:** Use **`Promise.allSettled`**, NOT `Promise.all`. If the key call rejects but the InChI call succeeds (or vice versa), the succeeding result still renders — a key-only failure must never blank a valid InChI. The key falls back to empty (`''`) and Phase 12 shows its placeholder.
- **D-02a — REFINEMENT NOTE for planner/checker:** ROADMAP Phase 11 Success Criterion #3 and Cross-Cutting Invariant #4 say the key is fetched "via `Promise.all`". This is a **deliberate, intentional refinement to `Promise.allSettled`** — same concurrent-fetch-in-one-tick, same `generationRef` guard, same single debounced subscription. Do NOT treat `allSettled` as a contradiction of the roadmap; the substance of the criterion (concurrent, single tick, stale-guarded, atomic write) is fully preserved. The only change is graceful degradation instead of all-or-nothing.

### Store shape (atomic write — Invariant #4)
- **D-03:** Extend the **existing `setInchiData` action** with a trailing `inchiKey: string` argument and add an `inchiKey: string` field (initial `''`) to `InchiState` in `src/store.ts`. This guarantees a **single `set()` call** so the key and InChI can never be out of sync. Mirrors how `hAtomPoolIds` was appended in Phase 6.
- **D-04:** Do NOT add a separate `setInchiKey` action or a second `set()` call. One atomic write only.

### Empty / invalid threshold
- **D-05:** Reuse the **existing empty guard** — wherever the current pipeline blanks the InChI (the `result.layers.length < 2` empty-canvas branch AND the `catch` path), also write `inchiKey: ''` in the **same `setInchiData` call**. One source of truth for "empty"; key and InChI go empty together. No lingering stale key.
- **D-06:** Do NOT independently validate the 27-char format inside the wiring/store path. Format-gating of the *rendered* strip is a Phase 12 concern (`parseInchiKey` returns `[]` for non-conforming keys — see D-08).

### `parseInchiKey.ts` parser contract
- **D-07:** Pure function, lives at `src/lib/parseInchiKey.ts` alongside `parseInchi.ts`. Returns **offset ranges only** — `{ kind, start, end }[]` — and NEVER returns reassembled/sliced text. Verbatim passthrough (Invariant #1) is preserved because callers slice the stored string themselves using these offsets.
- **D-08:** For any string that is **not a well-formed 27-char key**, return an **empty array `[]`** (never throws). Phase 12 already gates render on the 27-char format, so `[]` cleanly maps to "show placeholder". No best-effort partial segments.
- **D-09:** Segment `kind`s are **fully split**: `'skeleton'` (offsets 0–14, 14 chars), `'hash'` (15–23, 8 chars), `'flag'` (23–24, the `S`/`N` char), `'version'` (24–25, the `A` char), `'protonation'` (26–27, trailing char). This keeps INKEY-12 (teach `S` vs `N` flag AND version `A` distinctly, Phase 13) a clean single-segment slice. Phase 12 MAY visually group flag+version, but the data stays granular.
- **D-10:** Hyphens are **NOT** segments — `parseInchiKey` emits only the 5 content segments. The two hyphens (fixed offsets 14 and 25) are presentation: Phase 12 renders the verbatim string and styles those positions as dimmed separators (INKEY-03). Parser stays minimal; presentation concerns stay out of the data contract.
- **D-11:** Follow `parseInchi.ts`'s convention — `kind` is a string-literal union type (exported), analogous to `LayerType`. Exact type name is Claude's discretion (suggest `InchiKeySegmentKind` / `InchiKeySegment`).

### Claude's Discretion
- Exact exported type names in `parseInchiKey.ts` (D-11).
- Internal structure of the `allSettled` result destructuring, and whether the empty-canvas guard reads the key result before or after the `layers.length < 2` check (as long as the single atomic write holds).
- Test fixtures for `parseInchiKey` unit tests — but MUST cover: valid neutral 27-char key, charged/protonated key, non-standard (`N`) flag, empty string, short/malformed key (→ `[]`), and an assertion that no segment value equals reassembled text.
- The store test asserting verbatim equality (`stored inchiKey === raw getInChIKey()` output) per Success Criterion #2.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope & contract
- `.planning/ROADMAP.md` § "Phase 11: Source & Wiring" — goal, 5 success criteria.
- `.planning/ROADMAP.md` § "Cross-Cutting Invariants (carry into every v1.3 phase)" — the 4 invariants; #1 (verbatim passthrough), #2 (no canvas highlighting from key segments — relevant downstream, not this phase), #3 (canvas never remounts), #4 (single pipeline, single atomic write). **Note D-02a: invariant #4's `Promise.all` is refined to `Promise.allSettled`.**
- `.planning/REQUIREMENTS.md` § "v1.3 Requirements" — INKEY-01, INKEY-02, INKEY-06 (this phase); full INKEY list for context.

### Project decisions
- `.planning/PROJECT.md` § "Key Decisions" — esp. D-05 (generationRef stale guard), D-13 (provider at module level / canvas never remounts), D-12 (empty/disconnected canvas resets to empty).

### Existing code (primary integration surface)
- `src/App.tsx` lines 122–207 — the debounced `handleChange`, `generationRef`, empty-canvas guard, catch path, and `editor.subscribe('change')`. **All key wiring goes here.**
- `src/store.ts` — `InchiState` + `setInchiData` (extend per D-03).
- `src/lib/parseInchi.ts` lines 9–28 — `LayerType` string-literal-union + `Layer` interface; the convention `parseInchiKey.ts` mirrors.

No external specs/ADRs beyond the `.planning/` docs above — requirements fully captured in decisions.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/App.tsx` `handleChange` debounce + `generationRef`**: the single pipeline the key fetch joins. No new subscription, timer, or `handleMolSelectLogic` key fetch (Invariant #4).
- **`src/store.ts` `setInchiData`**: extend its signature (trailing arg) rather than adding a new action — proven pattern from Phase 6's `hAtomPoolIds`.
- **`src/lib/parseInchi.ts`**: model for a pure, unit-tested, string-literal-union-typed parser in `src/lib/`.
- **`ketcher.getInChIKey(): Promise<string>`**: typed public method on `ketcher-core@3.12.0`, routes through the same WASM worker as `getInchi()`. **Zero new dependencies.**

### Established Patterns
- Stale-result guard: `const thisGen = ++generationRef.current;` then `if (thisGen !== generationRef.current) return;` after await — applies to the combined `allSettled` resolution.
- Empty/error → atomic reset to empty (D-12 in PROJECT.md). Key joins this reset.
- Pure lib functions get a sibling `__tests__/*.test.ts` (see `parseInchi.test.ts`).

### Integration Points
- `App.tsx` `handleChange` → `getInChIKey()` added to a `Promise.allSettled` with `getInchi(true)`.
- `store.ts` `setInchiData(..., inchiKey)` → new `inchiKey` field.
- `src/lib/parseInchiKey.ts` (new) → consumed by Phase 12 render.
</code_context>

<specifics>
## Specific Ideas

- Standard InChIKey layout the parser targets: `AAAAAAAAAAAAAA-BBBBBBBBFV-P` = skeleton(14) `-` hash(8)+flag(1)+version(1) `-` protonation(1), total 27 chars. Hyphens at indices 14 and 25.
- The trailing protonation char (commonly `N` for neutral species) is always present in a well-formed 27-char key and is always its own `'protonation'` segment.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Render/hover/copy → Phase 12; explanation content → Phase 13; web/PubChem search link, charged-species preset, hash-build deep dive → v2 per INKEY-F1/F2/F3.)
</deferred>

---

*Phase: 11-Source & Wiring*
*Context gathered: 2026-06-18*
