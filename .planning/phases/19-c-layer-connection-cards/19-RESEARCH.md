# Phase 19: c-layer connection cards - Research

**Researched:** 2026-06-29
**Domain:** In-repo wiring — extend `SubHover` payloads + add three `subTokenInfo` cases. No new deps, no external docs.
**Confidence:** HIGH (verified against live source; design spec is approved and concrete)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Card intent:** Notation-first with a light connectivity clause. No element naming. Not chemistry-first.
- **Single atom (`'atom'`):** lists the canonical atoms it is bonded to (full adjacency neighbour set); one-neighbour and zero-neighbour ("no bonds recorded") forms handled.
- **Hyphen (`'bond'`):** names the two canonical atoms it joins as bonded.
- **Parenthesis (`'branch'`):** describes the branch off its branch-point atom and lists the canonical bond pairs it encodes.
- **Numbering (multi-component):** per-component, matching the printed string (reset after each `;`, with a `(component N)` marker) — GAP-2 precedent. `SubHover` payloads keep **global** canonicals so the existing highlight is unchanged. De-offset is display-only, NEVER on the auxMap lookup.
- **Neighbour listing:** list ALL neighbours/bonds however many — accuracy over brevity (GAP-1). No min–max range, no truncation. Empty list must not render "atoms  and undefined".
- **Titles:** generic fixed (`Atom`, `Bond`, `Branch`); specifics in the body.
- **Guards:** no bond order / hydrogen count / geometry claims. A hyphen is a separator; bonds come from adjacency (`parseConnectionBonds`), not the hyphen glyph.

### Claude's Discretion
- Exact body wording (within the spec's templates).
- Bond-pair list helper signature/placement in `subTokenInfo.ts`.

### Deferred Ideas (OUT OF SCOPE)
- None. (WR-04 empty-atom-list is folded in via the empty-list guard.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONN-01 | Single atom number → list every bonded canonical atom (full neighbour set, enumerated) or "no recorded bond" | The `'atom'` SubHover does NOT currently carry neighbours — §Pitfall 1. Must attach incident bond pairs at the LayerText atom-token site. Neighbour set derived in `subTokenInfo` by collecting the "other end" of each incident pair. |
| CONN-02 | Hyphen → name two joined atoms; parenthesis → describe branch + list bond pairs | `'bond'.endpointPairs` and `'branch'.bondPairs` ALREADY flow (verified). Only the card copy + de-offset display is missing. |
| CONN-03 | Multi-component per-component numbering with `(component N)`; payloads stay global; `buildSubHoverSpecs` guard proves highlight unchanged | `fragmentOffset`/`componentIndex` flow to h-layer kinds only today — §Pitfall 2. Extend to atom/bond/branch at the `cumOffset`/`fragIdx` sites in `ConnectionText`. Guard mirrors the existing `highlightUtils.test.ts:803` GAP-2 hAtoms test. |
| CONN-04 | No bond-order/H/geometry claims; pure module; real fixtures (1 single-component + 1 salt); empty-list guard | Pure `subTokenInfo` already enforced. Copy-safety test asserts absence of forbidden terms. Fixtures: ALANINE (single) + MELATONIN_TOLUENE (co-crystal, component 2 has real c-bonds). |
</phase_requirements>

## Summary

This is a pure in-repo wiring phase against code that already exists and is well-factored. Phase 15
made the c-layer highlight precise; Phase 17/18 built the `subTokenInfo` card module but left
`'atom' | 'bond' | 'branch'` returning `null`. This phase fills those three cases and wires the
SubHover fields they need. **No new dependencies, no external research, no architecture decisions** —
the approved design spec is the source of truth and it is concrete.

There is exactly **one non-trivial data-flow gap** the planner must address, and it is the crux of the
phase: the `'atom'` SubHover today carries only its own canonical index — **it does not carry its
neighbours.** The `'bond'` and `'branch'` SubHovers, by contrast, already carry `endpointPairs` /
`bondPairs` (verified in `LayerText.tsx:203` and `:238/:254`). So CONN-02 is mostly copy; CONN-01
requires attaching incident-bond data to the atom token; and CONN-03 requires threading
`fragmentOffset`/`componentIndex` onto all three kinds (they reach h-layer kinds today but not
c-layer kinds).

**Primary recommendation:** Reuse the branch's existing `collectBranchPointBonds`/`segmentBonds`
machinery to compute per-atom incident bonds at the `'atom'` construction site in `ConnectionText`,
attach them as a new optional `SubHover` field (global canonicals), and de-offset for display only —
exactly the GAP-2 pattern already proven for h-layer kinds. Mirror the existing
`highlightUtils.test.ts` GAP-2 guard for the highlight-invariance proof.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Compute per-atom incident bonds (global canonicals) | `LayerText.tsx` (`ConnectionText`) | `parseInchi.ts` (`segmentBonds`) | Offset context (`cumOffset`/`canonicalFn`) lives only at the render site; the pure parser supplies adjacency. Same split as the branch already uses. |
| Carry connectivity + display context | `parseInchi.ts` (`SubHover` type) | — | Type is the contract between renderer and card module. |
| Card prose (de-offset display) | `subTokenInfo.ts` | — | Pure value core; never reads strings; de-offset is display-only here. |
| Canvas highlight | `highlightUtils.ts` (`buildSubHoverSpecs`) | — | UNCHANGED. Resolves via global canonicals. The phase must prove it stays untouched. |

## Standard Stack

No new packages. Existing stack only.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^3.0.0 | Test runner (already configured) | Project standard; all `src/lib/__tests__/*.test.ts` use it. |

**Installation:** none. `## Package Legitimacy Audit` is **N/A — this phase installs no packages.**

## Architecture Patterns

### Data flow (where each field originates and where it is consumed)

```
ConnectionText (LayerText.tsx)            subTokenInfo.ts (pure)          highlightUtils.ts
─────────────────────────────            ─────────────────────          ─────────────────
tokenizeCLayerSeg(seg)
   │  per atom token:
   │    canonical = localN + cumOffset  ──► SubHover.canonical (GLOBAL) ──► buildSubHoverSpecs
   │    [NEW] incidentPairs (GLOBAL) ─────► [NEW] case 'atom':                resolves auxMap[canonical]
   │    [NEW] fragmentOffset = cumOffset      derive neighbours from pairs,   (UNCHANGED — global only)
   │    [NEW] componentIndex = fragIdx        de-offset for DISPLAY only
   │
   │  per hyphen token:
   │    endpointPairs (GLOBAL) ───────────► case 'bond': de-offset display ─► (UNCHANGED)
   │    [NEW] fragmentOffset/componentIndex
   │
   │  per open/close token:
   │    bondPairs (GLOBAL) ──────────────► case 'branch': branch-point =
   │    [NEW] fragmentOffset/componentIndex   shared left endpoint; de-offset ─► (UNCHANGED)
```

### Pattern 1: GAP-2 de-offset (the load-bearing pattern, already proven for h-layer)
**What:** SubHover stores GLOBAL canonicals (the auxMap key). The card subtracts `fragmentOffset`
for display only. `atomList(atoms, fragmentOffset)` and `componentMarker(sub)` already do this.
**When to use:** every numeric the new cards print.
**Example (verbatim from `subTokenInfo.ts:36-41`, reuse as-is):**
```typescript
function atomList(atoms: number[], fragmentOffset = 0): string {
  const local = fragmentOffset ? atoms.map((a) => a - fragmentOffset) : atoms;
  if (local.length === 1) return `atom ${local[0]}`;
  const head = local.slice(0, -1).join(', ');
  return `atoms ${head} and ${local[local.length - 1]}`;
}
```

### Pattern 2: deriving neighbours from incident pairs (the 'atom' case)
**What:** an atom's neighbour list = the "other endpoint" of each incident `[a,b]` pair.
```typescript
// In subTokenInfo case 'atom': sub.canonical is GLOBAL; sub.incidentPairs are GLOBAL.
const self = sub.canonical!;
const neighbours = (sub.incidentPairs ?? []).map(([a, b]) => (a === self ? b : a));
// neighbours stay global; atomList(neighbours, sub.fragmentOffset) de-offsets for display.
// dedupe + sort before atomList (ring closures can repeat a neighbour across pair directions).
```

### Pattern 3: bond-pair list helper (the 'branch' case — discretion item)
**What:** render `[[3,24],[24,11]]` as `3–24 and 24–11` with each endpoint de-offset.
```typescript
function bondPairList(pairs: [number, number][], off = 0): string {
  const fmt = ([a, b]: [number, number]) => `${a - off}–${b - off}`; // en-dash
  if (pairs.length === 1) return fmt(pairs[0]);
  return `${pairs.slice(0, -1).map(fmt).join(', ')} and ${fmt(pairs[pairs.length - 1])}`;
}
```
Branch-point atom = the shared LEFT endpoint of the incident pairs (the design's "atom 3" in
`3–24 and 24–11`). Derive it as the value common to all `bondPairs[i][0]`, or equivalently the
intersection of the pairs — but the simplest correct read is: the branch's `collectBranchPointBonds`
emits pairs as `[branchPoint, child]` direction first, so `bondPairs[0][0]` is the branch-point.
Verify this holds (see Pitfall 4) rather than assuming.

### Anti-Patterns to Avoid
- **De-offsetting before storing.** NEVER write a local number into `SubHover`. The highlight keys
  the global auxMap. De-offset is display-only, inside `subTokenInfo`.
- **Reconstructing connectivity from the hyphen glyph.** Bonds are adjacency (`parseConnectionBonds`/
  `segmentBonds`), not `-` characters. A branch like `(4)` has no internal hyphen but encodes a bond.
- **Inferring chemistry.** No bond order, no H, no element names, no geometry. Cards speak atom numbers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-atom incident bonds | A new adjacency walker | `segmentBonds(tokens)` + filter to the atom (the exact body of `collectBranchPointBonds`, generalised from "branch-point" to "any atom") | Already handles branches, ring closures, commas, nesting. Re-deriving it is the GAP-15 trap. |
| De-offset + comma grammar | New string join | `atomList(atoms, fragmentOffset)` | Exists, tested, GAP-1/GAP-2 correct. |
| `(component N)` marker | Inline ternary | `componentMarker(sub)` | Exists; 1-based; empty for single-fragment. |
| Bond → bond-pair display | — | small `bondPairList` helper (Pattern 3) | One new helper, ~4 lines; the only net-new code. |

**Key insight:** The branch already computes incident bonds for the branch-point atom
(`collectBranchPointBonds`, `parseInchi.ts:228`). The `'atom'` case needs the same computation for an
*arbitrary* atom. The lazy correct move is to compute incident pairs for the atom token using
`segmentBonds` (filter where `leftLocal === localN || rightLocal === localN`), apply the same
offset/`canonicalFn` the hyphen path already uses, and attach. Do NOT write a second adjacency parser.

## Runtime State Inventory

> Not a rename/refactor/migration phase. SKIPPED — pure additive card copy + type fields.

## Common Pitfalls

### Pitfall 1: The 'atom' SubHover carries NO neighbours today — CONN-01's core gap
**What goes wrong:** A planner reads "list bonded atoms" and assumes the data is already there (as it
is for `'bond'`/`'branch'`). It is not. `ConnectionText` builds `{ kind: 'atom', ...hover }` where
`hover` is only `{ canonical }` or `{ canonical, canonicals }` (`LayerText.tsx:181-182`). There is no
incident-bond data on the atom SubHover.
**Why:** Phase 15 deliberately made atom hover highlight ONLY the atom, no incident bonds
(`highlightUtils.ts:438`, CLYR-01). So nothing ever needed neighbours.
**How to avoid:** The plan MUST add a task that (a) adds an optional `incidentPairs?: [number,number][]`
field to `SubHover`, (b) computes it at the atom-token construction site in `ConnectionText` using
`segmentBonds(tokens)` filtered to `token.localN`, applying the same offset/`canonicalFn` the hyphen
path uses (`LayerText.tsx:194-202`), and (c) derives neighbours from it in `subTokenInfo`.
**Warning signs:** The atom card body is empty, or a plan task touches only `subTokenInfo.ts` for
CONN-01 — that cannot work; the data isn't in the payload.
[VERIFIED: src/components/LayerText.tsx:180-187, src/lib/highlightUtils.ts:432-442]

### Pitfall 2: fragmentOffset/componentIndex reach h-layer kinds ONLY — not c-layer kinds
**What goes wrong:** CONN-03's per-component numbering silently no-ops; cards print global numbers in
multi-component molecules.
**Why:** `fragmentOffset`/`componentIndex` are set in `HLayerText` (`LayerText.tsx:390,404,442,456,498,512`)
but the atom/bond/branch SubHovers in `ConnectionText` never set them. `componentMarker`/`atomList`
default to `0` → no de-offset, no marker.
**How to avoid:** At the two `ConnectionText` construction loops (the `multMatch` 2* branch and the
`;`-split branch), pass `cumOffset` as `fragmentOffset` and `fragIdx` as `componentIndex` into each
atom/bond/branch SubHover. `cumOffset`/`fragIdx` are already in scope at those sites
(`LayerText.tsx:289-307`). For the pure-`2*` branch (no `;`, `LayerText.tsx:273-283`), mirror the
h-layer choice: `fragmentOffset: 0, componentIndex: 0` (the design says single-component cards are
unchanged; identical-fragment copies share local numbering).
**Warning signs:** A co-crystal card shows "atoms 19, 20" instead of "atoms 2, 3 (component 2)".
[VERIFIED: src/components/LayerText.tsx:289-309 vs HLayerText:498-512]

### Pitfall 3: The GAP-2 trap — de-offset leaking into the highlight path
**What goes wrong:** Someone "simplifies" by storing local numbers, or `subTokenInfo` mutates the
SubHover. The canvas highlight (which keys the GLOBAL auxMap) breaks: `auxMap[localN]` is the wrong
atom or `undefined`.
**Why:** `buildSubHoverSpecs` resolves `auxMap[subHover.canonical]` / `auxMap[a]` for each pair with
NO offset arithmetic (`highlightUtils.ts:436,450-451,466-467`). It assumes globals.
**How to avoid:** SubHover fields are write-once-global at the LayerText site. `subTokenInfo` is the
ONLY place de-offset happens, and only into a local string variable — never back onto `sub`. The plan
MUST include a guard test (Pitfall 4 / Validation) that proves `buildSubHoverSpecs` still resolves via
globals for a c-layer atom/bond/branch carrying a non-zero `fragmentOffset`.
[VERIFIED: src/lib/highlightUtils.ts:432-474; mirror src/lib/__tests__/highlightUtils.test.ts:803-820]

### Pitfall 4: Branch-point direction assumption
**What goes wrong:** The branch card needs to name the branch-point atom (design: "branch hanging off
atom 3"). If the plan assumes `bondPairs[0][0]` is always the branch-point without verifying the emit
direction of `collectBranchPointBonds`/`segmentBonds`, the card may name the wrong atom.
**Why:** `segmentBonds` emits `[last, current]` and `collectBranchPointBonds` keeps first-seen
direction with a dedupe (`parseInchi.ts:191-247`). The branch-point IS `open.attachLocal`, but it is
not re-exposed on the `'branch'` SubHover — only `bondPairs` are.
**How to avoid:** Either (a) the branch-point is the atom common to every incident pair → compute it
as the intersection in `subTokenInfo` (robust, no direction assumption), or (b) add the branch-point
canonical as an explicit optional SubHover field at the construction site where `attachLocal` is known
(`LayerText.tsx:220`, `open.attachLocal + offset`). Option (b) is cleaner and avoids an inference;
recommend a `branchPoint?: number` (global) field. The plan should pick one and test it.
[VERIFIED: src/lib/parseInchi.ts:191-247, src/components/LayerText.tsx:212-246]

### Pitfall 5: Multi-component fixture must have c-layer bonds in component 2
**What goes wrong:** The obvious salt fixture `InChI=1S/CH5N.ClH/c1-2;/...` (already in the test file as
`SALT`) has an EMPTY second c-segment (HCl is one atom). Component 2 has no hoverable c-token and no
bonds — useless for proving CONN-03's per-component numbering.
**How to avoid:** Use `MELATONIN_TOLUENE` (already a const in `subTokenInfo.test.ts:20`): its c-layer
is `...;1-7-5-3-2-4-6-7` — component 2 (toluene, +17 offset) has a full ring of real c-bonds. A
component-2 hyphen/atom/branch hover de-offsets to the printed `1-7-5-...` numbers with `(component 2)`.
[VERIFIED: src/lib/__tests__/subTokenInfo.test.ts:11-20]

## Code Examples

### The three new subTokenInfo cases (shape — replace the `default: return null`)
```typescript
// Source: design spec docs/superpowers/specs/2026-06-29-c-layer-connection-cards-design.md §Card copy
case 'atom': {
  const self = sub.canonical!;
  const neighbours = [...new Set((sub.incidentPairs ?? []).map(([a, b]) => (a === self ? b : a)))]
    .sort((x, y) => x - y);
  const off = sub.fragmentOffset ?? 0;
  const selfLocal = self - off;
  if (neighbours.length === 0)
    return { title: 'Atom', body: `Atom ${selfLocal}${componentMarker(sub)} has no bonds recorded in the connection layer.` };
  const body = `Atom ${selfLocal} is bonded to ${atomList(neighbours, off)}${componentMarker(sub)} `
    + `in the heavy-atom skeleton. The connection layer lists which canonical atom numbers are joined `
    + `— it records connectivity only, not bond order, hydrogens, or 3-D shape.`;
  return { title: 'Atom', body };
}
case 'bond': {
  const off = sub.fragmentOffset ?? 0;
  const [a, b] = (sub.endpointPairs ?? [[0, 0]])[0];   // one canonical pair; N* repeats it
  const body = `Atoms ${a - off} and ${b - off}${componentMarker(sub)} are bonded — this hyphen joins `
    + `the canonical numbers on either side of it. It records that the two atoms are connected, not the bond order.`;
  return { title: 'Bond', body };
}
case 'branch': {
  const off = sub.fragmentOffset ?? 0;
  const pairs = sub.bondPairs ?? [];
  const bp = sub.branchPoint ?? pairs[0]?.[0] ?? 0;     // see Pitfall 4
  const body = `These parentheses are a branch hanging off atom ${bp - off}${componentMarker(sub)}, `
    + `adding the bonds ${bondPairList(pairs, off)}. InChI writes side-chains in parentheses so a `
    + `branched skeleton fits on one line; after the ) the main chain continues from atom ${bp - off}.`;
  return { title: 'Branch', body };
}
```
*(`!` non-null asserts mirror existing cases; `atomList`/`componentMarker` are reused verbatim;
`bondPairList` is the one new helper.)*

## State of the Art

Not applicable — no external library state to track. The "state of the art" is the in-repo GAP-2
pattern (display-only de-offset over global payloads), already shipped for h-layer kinds in Phase 18.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `collectBranchPointBonds` emits `[branchPoint, child]` direction, so `bondPairs[0][0]` is the branch-point | Pitfall 4 / branch case | Branch card names wrong atom. Mitigated by recommending an explicit `branchPoint` field instead of relying on direction. Plan should verify or use the explicit field. |
| A2 | `MELATONIN_TOLUENE` component-2 c-segment `1-7-5-3-2-4-6-7` is real getInchi() output (it is already a fixture const, provenance-confirmed in the test file comments) | Pitfall 5 / Validation | If fabricated, violates the no-fake-fixture rule. LOW risk — already vetted in Phase 17/18. |

All other claims are `[VERIFIED]` against the live source at the cited line numbers.

## Open Questions

1. **Explicit `branchPoint` field vs. intersection inference?**
   - What we know: branch-point = `open.attachLocal + offset`, known at `LayerText.tsx:220`.
   - What's unclear: whether to add a `branchPoint?: number` SubHover field or infer from `bondPairs`.
   - Recommendation: add the explicit field — one assignment at the construction site, removes the
     direction assumption (A1), and makes the branch card trivially correct. Cheaper than a test that
     pins emit-direction forever.

2. **Does the close-paren `'branch'` SubHover need the same new fields as the open-paren?**
   - What we know: both open and close build a `{ kind: 'branch', bondPairs }` hit
     (`LayerText.tsx:238,254`); close reads `_bondPairs` off the open token.
   - Recommendation: yes — attach `fragmentOffset`/`componentIndex`/`branchPoint` to BOTH so hovering
     either paren shows the identical card. The close site has `offset`/`canonicalFn` in scope too.

## Environment Availability

> No external dependencies. SKIPPED.

## Validation Architecture

> nyquist_validation is enabled (config.json). Section required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.0 |
| Config file | `vitest.config.ts` (separate from vite.config per project decision) |
| Quick run command | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/lib/__tests__/highlightUtils.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONN-01 | atom card lists full neighbour set (ALANINE atom 2 → `1, 3 and 4`) | unit | `npx vitest run src/lib/__tests__/subTokenInfo.test.ts -t "atom card"` | ✅ extend `subTokenInfo.test.ts` |
| CONN-01 | zero-neighbour atom → "no bonds recorded" (empty-list guard / WR-04) | unit | same file, `-t "no bonds recorded"` | ✅ extend |
| CONN-02 | hyphen card names the two joined atoms (ALANINE `1-2` → `Atoms 1 and 2`) | unit | `-t "bond card"` | ✅ extend |
| CONN-02 | branch card names branch-point + bond pairs (ALANINE `(4)` off atom 2 → bond `2–4`) | unit | `-t "branch card"` | ✅ extend |
| CONN-03 | component-2 atom/bond/branch de-offsets to printed numbers + `(component 2)` (MELATONIN_TOLUENE toluene ring) | unit | `-t "component"` | ✅ extend |
| CONN-03 | `buildSubHoverSpecs` guard: a c-layer SubHover with non-zero `fragmentOffset` still resolves the highlight via GLOBAL canonical | unit | `npx vitest run src/lib/__tests__/highlightUtils.test.ts -t "GAP-2 guard"` | ✅ extend (mirror `:803`) |
| CONN-04 | copy-safety: no card body contains "single", "double", "order", "geometry", or element words | unit | `-t "copy safety"` | ✅ extend |
| CONN-04 | c-layer kinds NO LONGER return null (the existing `:193` block must be updated/removed) | unit | `-t "atom kind"` | ⚠️ `subTokenInfo.test.ts:193-205` currently asserts null — must be REPLACED |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/subTokenInfo.test.ts` (fast, the value core)
- **Per wave merge:** `npx vitest run src/lib/__tests__/subTokenInfo.test.ts src/lib/__tests__/highlightUtils.test.ts`
- **Phase gate:** `npx vitest run` (full suite green) before `/gsd-verify-work`, then the **human
  chemical-accuracy gate** on the live card strings (the v1.5 load-bearing control — must NOT be bypassed).

### Wave 0 Gaps
- [ ] No NEW test files — extend `subTokenInfo.test.ts` and `highlightUtils.test.ts` in place.
- [ ] **REMOVE/REPLACE** `subTokenInfo.test.ts:193-205` ("c-layer kinds fall through to null") — that
      behaviour is exactly what this phase reverses. Wave 0 must update this block to the new contract,
      or the suite contradicts itself.
- [ ] Two fixtures already present (ALANINE, MELATONIN_TOLUENE) — no new fixtures needed. Derive the
      `SubHover` literals (incidentPairs/endpointPairs/bondPairs/fragmentOffset) as the parsed
      projection of those real strings (the precedent the file already uses for hAtoms — legitimate,
      not fabrication).
- [ ] The c-layer SubHover literals in `highlightUtils.test.ts` GAP-2 guard must carry a non-zero
      `fragmentOffset` AND a global canonical that maps in the mock `auxMap` (mirror `:803-820`).

### Highlight-invariance guard (the load-bearing CONN-03 assertion)
```typescript
// Mirror of highlightUtils.test.ts:803 (hAtoms GAP-2 guard) for c-layer kinds.
it('kind atom GAP-2 guard — resolves via GLOBAL canonical, fragmentOffset ignored on highlight path', () => {
  const struct = makeMockStruct();
  const specs = buildSubHoverSpecs(
    { kind: 'atom', canonical: 19, fragmentOffset: 17, componentIndex: 1, incidentPairs: [[19, 20]] },
    { 19: 0 },                 // GLOBAL 19 → pool 0; de-offset 2 would be auxMap[2] = undefined
    atomElements, [], cLayer, struct, resolveVarFn,
  );
  expect(specs.length).toBe(1);
  expect(specs[0].atoms).toContain(0);  // resolved via global 19, NOT local 2
});
```
The `'bond'`/`'branch'` highlight paths already exist and ignore `fragmentOffset` (they only read
`endpointPairs`/`bondPairs`), so adding the field cannot affect them — but include one bond-kind guard
for completeness.

## Security Domain

> `security_enforcement` not set to false; minimal applicability.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes (low) | Card bodies are plain strings rendered as React text children (no `dangerouslySetInnerHTML`); InChI is computed locally by WASM, not user-supplied free text. No new surface. |
| All others | no | Pure in-browser string assembly; no auth, network, crypto, storage, or access control. |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via card body | Tampering/Info-disclosure | Strings contain only digits, en-dashes, and fixed copy; rendered as text nodes (existing Phase 18 render path). No change. |

## Sources

### Primary (HIGH confidence)
- `docs/superpowers/specs/2026-06-29-c-layer-connection-cards-design.md` — approved design (card copy, touchpoints, edge cases).
- `src/lib/parseInchi.ts` — `SubHover` type, `segmentBonds`, `collectBranchPointBonds`, `tokenizeCLayerSeg` (read in full).
- `src/components/LayerText.tsx` — `ConnectionText` construction sites, `cumOffset`/`fragIdx` scope (read in full).
- `src/lib/subTokenInfo.ts` — `atomList`, `componentMarker`, the `null` fall-through to replace (read in full).
- `src/lib/highlightUtils.ts:432-474` — atom/bond/branch highlight resolution (global-only).
- `src/lib/__tests__/highlightUtils.test.ts:803-820` — the GAP-2 hAtoms guard to mirror.
- `src/lib/__tests__/subTokenInfo.test.ts` — fixtures (ALANINE, MELATONIN_TOLUENE), GAP-1/GAP-2 test precedents, the `:193` null-fallthrough block to replace.

### Secondary / Tertiary
- None. No web or external-doc research needed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; existing tooling verified.
- Architecture / data flow: HIGH — every touchpoint verified at cited line numbers.
- Pitfalls: HIGH — Pitfalls 1–3 verified directly in source; Pitfall 4 flagged with mitigation; Pitfall 5 verified against fixtures.

**Research date:** 2026-06-29
**Valid until:** stable (in-repo only) — re-verify line numbers only if `LayerText.tsx`/`parseInchi.ts`/`subTokenInfo.ts` change before planning.
