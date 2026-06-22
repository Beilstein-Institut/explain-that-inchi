# Phase 15: C-layer hover precision - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every connectivity-layer (c-layer) token highlight exactly the atom or bond(s)
it denotes on the Ketcher canvas — and nothing more. Specifically:

- An atom number highlights only that single atom (no bonds).
- A hyphen (`-`) highlights only the single bond joining its two atoms.
- A parenthesis (`(` / `)`) highlights all bonds of that branch.

This replaces today's behavior where a c-layer atom number highlights the atom **plus
all incident bonds**, and where hyphens/parentheses are inert (non-interactive) text.
Correctness must hold across multi-fragment (`;`-separated) and duplicated/repeated
fragment (`N*`-prefixed) molecules.

**In scope:** highlight-precision logic only — the parse/offset/spec-building pipeline
(`buildSubHoverSpecs` / `ConnectionText` token emission → `useKetcherHighlights`).
**Out of scope:** the verbatim InChI string is never re-rendered or re-joined; c-layer
explanation prose is unchanged unless found inaccurate; no changes to other layers'
hover behavior.

</domain>

<decisions>
## Implementation Decisions

### Atom-number hover (CLYR-01)
- **D-01:** Hovering a c-layer atom number highlights **only that single atom — no bonds**.
  This is a deliberate change from the current `buildSubHoverSpecs` `atom` case, which
  highlights the atom plus all incident bonds. Bonds are now reached via their own token
  triggers (hyphens), giving a clean "token = exactly what it denotes" mapping.

### Hyphen hover (CLYR-02)
- **D-02:** Hovering a hyphen highlights **only the bond** connecting the two atoms it
  joins — the two endpoint atoms are NOT filled. Endpoint atoms remain reachable via
  their own number tokens.

### Parenthesis / branch hover (CLYR-03)
- **D-03 (SUPERSEDED 2026-06-22):** ~~Hovering a parenthesis highlights the whole branch's
  bonds, including nested sub-branches, plus the "stem" bond ("this entire substituent").~~
  This was implemented (commit 22b8227) but rejected on live review: for real molecules
  (e.g. ciprofloxacin's piperazinyl branch) it lit up most of the molecule (10 bonds).
- **D-03b (current, user-confirmed 2026-06-22):** Hovering a parenthesis highlights the
  bonds **incident to the branch-point atom** (the atom the branch hangs off) — the
  chain-in bond, the bond into the branch, and the chain-out bond after the `)`. Typically
  exactly 3. (Mental model: "this is where the chain branches.") Implemented in commit 1d5afdf
  via `collectBranchPointBonds`.
- **D-04:** A matching `(` / `)` pair is **symmetric** — hovering either the opening or
  the closing parenthesis highlights the identical bond set for that branch. Both
  parentheses are interactive hover targets.

### Multi-fragment & duplicated fragments (CLYR-04, CLYR-05)
- **D-05:** All three token kinds (atom number, hyphen, parenthesis) must resolve within
  the correct fragment for `;`-separated multi-fragment c-layers and for `N*`-prefixed
  duplicated/repeated fragments. Reuse the existing canonical-offset machinery already
  proven for atom tokens (`ConnectionText` per-fragment `cumOffset`, the `canonicals`
  array for `N*` notation, and `canonRange` scoping) — extend it to hyphen/parenthesis
  tokens rather than inventing a parallel scheme.

### Claude's Discretion
- Color: reuse the existing `--c-conn` connection color for all c-layer hover highlights
  (atoms, hyphen-bonds, branch-bonds) for visual consistency — no new color tokens.
- Token affordance/styling: hyphens and parentheses become hoverable; give them the same
  `inchiSubtoken` hover/cursor affordance as atom numbers unless it reads poorly.
- Parse approach for branch detection and bond resolution (how `(`/`)` nesting is matched,
  how a hyphen's two endpoint canonicals are derived) is an implementation choice for the
  researcher/planner — must work off the canonical→Ketcher pool-ID `auxMap`, never by
  re-parsing the rendered string.
- New `SubHover` kinds: the current type is `'element' | 'atom' | 'stereo' | 'hAtoms' | 'mobileH'`.
  Adding bond-only and branch kinds (or extending the `atom` case) is the planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CLYR-01..CLYR-05 (the five c-layer precision requirements)
- `.planning/ROADMAP.md` §"Phase 15: C-layer hover precision" — goal, success criteria, notes

### Core pipeline (highlight precision lives here)
- `src/lib/highlightUtils.ts` — `buildSubHoverSpecs` (line 373; `atom` case at line 432 is
  what CLYR-01 changes) and `buildHighlightSpecs` (line 65, whole-layer hover)
- `src/components/LayerText.tsx` — `ConnectionText` (line 123) emits c-layer hover spans;
  currently only atom numbers get `subHoverProps`; hyphens/parens are plain text. The
  `;`-split and `N*` multiplier offset logic (lines 150–189) is the fragment-correctness machinery.
- `src/lib/parseInchi.ts` — `SubHover` interface (line 32); `Layer` type
- `src/hooks/useKetcherHighlights.ts` — consumes specs and applies highlights to Ketcher
- `src/lib/parseAuxMapping.ts` — canonical→Ketcher pool-ID mapping (`auxMap`) source

### Project invariants
- `CLAUDE.md` — tech stack, no-backend, fidelity constraints
- Memory `feedback_inchi_passthrough`: NEVER reconstruct/re-join the InChI string — display
  Ketcher's verbatim output; this phase touches offset/highlight logic ONLY.

### Tests to mirror
- `src/lib/__tests__/trace_benzene.test.ts` — existing c-layer spec tracing tests
- `src/hooks/__tests__/useKetcherHighlights.test.ts` — hook-level highlight assertions
- `src/__tests__/LayerText.mixedFragment.test.tsx` — multi-fragment c-layer rendering

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConnectionText` (LayerText.tsx:123): already tokenizes the c-layer and computes correct
  per-fragment / per-duplicate canonical IDs for atom numbers. The hyphen/paren work
  extends the same `renderSegment` loop (the chars currently buffered into plain text).
- `buildSubHoverSpecs` `atom` case (highlightUtils.ts:432): already maps canonical IDs →
  Ketcher pool IDs and finds incident bonds — the bond-finding code is directly reusable
  for hyphen (pick the one shared bond) and branch (collect bonds among a set of atoms).
- `subHoverProps` factory (LayerText.tsx:22): wires mouseenter/leave → `setSubHover`.

### Established Patterns
- Fragment scoping uses `canonRange: [lo, hi]` and `canonicals: number[]` on `SubHover`
  (already used by `element`/`atom` cases) — the model for CLYR-04/05.
- `N*` duplicated-fragment hovers emit a `canonicals` array (one canonical per fragment
  instance) so a single token highlights the same position in every duplicate.

### Integration Points
- New token kinds flow: `LayerText.ConnectionText` (emit subHover on `-` / `(` / `)`) →
  store `setSubHover` → `useKetcherHighlights` → `buildSubHoverSpecs` (new/extended cases) →
  Ketcher highlight API.

</code_context>

<specifics>
## Specific Ideas

The user consistently chose the most *precise / literal* reading of each requirement
(atom-only, bond-only, whole-branch-incl-stem, symmetric parens) — favoring a strict
"each token highlights exactly what it denotes" model over visually softer hybrids.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-c-layer-hover-precision*
*Context gathered: 2026-06-19*
