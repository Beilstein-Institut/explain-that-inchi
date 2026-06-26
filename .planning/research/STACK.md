# Technology Stack — Milestone v1.5 "Sub-token-specific explanations"

**Project:** Explain that InChI
**Researched:** 2026-06-26
**Verdict:** ZERO new dependencies. Pure TS data + one React rendering branch + existing CSS Modules.
**Overall confidence:** HIGH (verified against repo source, not assumed)

> NOTE: This file replaces an earlier STACK.md authored 2026-06-22 for an abandoned
> v1.5 direction ("inorganic / organometallic capability"). The active v1.5 per
> `.planning/PROJECT.md` (line 13) is **Sub-token-specific explanations**. That prior
> research is superseded and not relevant to this milestone.

## Recommended Stack

### Core (unchanged — DO NOT touch)

The validated stack is already in place and working. No version bumps, no additions.

| Layer | Choice | Version | Status |
|-------|--------|---------|--------|
| Build tool | Vite | ^8.0.0 | In place |
| UI framework | React | ^18.3.1 | In place |
| Language | TypeScript | ~5.7.2 | In place |
| Molecule editor | ketcher-react / -standalone / -core | 3.12.0 | In place |
| State | Zustand | 5.0.13 | In place |
| Styling | CSS Modules + oklch custom properties | built-in | In place |
| Test | vitest | ^3.0.0 | In place |

### New dependencies required for v1.5

**NONE.** Confirmed below against the three sub-questions.

## Why zero new dependencies — the three questions answered

### (1) Does a ~118-entry periodic-table element-name lookup warrant a dependency?

**No.** A hand-authored `Record<string, string>` is the correct tool.

- The data is ~118 `Symbol: 'name'` pairs — a single static literal, ~2-3 KB, tree-shaken into the bundle with zero runtime cost.
- Every npm periodic-table package (`periodic-table`, `chemical-elements`, `mendeleev`, etc.) bundles atomic weights, electron configurations, group/period/category metadata, CAS numbers, discovery dates — **none of which this feature uses.** The card needs `symbol → English name` plus (optionally) a one-clause role. That is it.
- Adding a dep for a flat string map fails ladder rung 5 (already-installed / few lines) and rung 1 (does the extra payload need to exist — no).
- The repo already establishes this exact pattern: `ELEMENT_NAMES` in `src/lib/layerInfo.ts:180-183` is a hand-authored 10-element Record. v1.5 extends it; it does not change the approach.
- Verbatim/hand-authored static data is a load-bearing project convention (parsers ported verbatim from `molecules.js`; `LAYER_INFO`, `KEY_ZONE_COPY` are hand-authored prose modules). A dependency would break that consistency and add an external source of chemical-name truth that can drift from the rest of the hand-authored copy.

**Recommendation:** Extend `ELEMENT_NAMES` to the full periodic table in place. Names sourced from IUPAC's official element list when authoring — this is COPY work owned by the roadmap's content phase, not a code dependency.

### (2) Existing utility to extend rather than replace?

**Yes — extend, do not replace.** Named integration points:

| Existing artifact | File:line | What v1.5 does to it |
|-------------------|-----------|----------------------|
| `ELEMENT_NAMES: Record<string,string>` (10 elements) | `src/lib/layerInfo.ts:180-183` | Extend to ~118 entries. Already consumed by `formulaSegmentReading` (`layerInfo.ts:150`) — extending it improves existing formula readings for free. |
| `LAYER_INFO` / `DEFAULT_INFO` (hand-authored prose) | `src/lib/layerInfo.ts:21-110` | Pattern to mirror for the new sub-token copy table. |
| `KEY_ZONE_COPY` (parallel prose module) | `src/lib/inchiKeyInfo.ts` | Direct template for the new sub-token copy module — title/body shape, pinned via an offset/label test (v1.3 SC-1 pattern). |
| `SubHover` union (kinds: element / hAtoms / mobileH / stereo / atom / bond / branch) | `src/lib/parseInchi.ts` (type) | Read-only. The discriminated union is the key the new copy lookup switches on. Already emitted by `LayerText.tsx`. |
| `LayerText.tsx` sub-token emission | `src/components/LayerText.tsx:25-39` (`subHoverProps`) + per-renderer `hit` constructions | No change needed. Already emits the right `SubHover` on `onMouseEnter → setSubHover` and pins via `setPinned({ idx, sub })`. Data already flows. |
| `Explanation.tsx` precedence chain | `src/components/Explanation.tsx:46,71-136` | Add ONE branch: read `subHover`/`pinned.sub`, render sub-token copy ABOVE the existing `layer` branch. The cascade (`keyHoverKind → layer → legendHover → idle`) is the established pattern; v1.5 inserts a `subHover` tier. |
| Store `subHover` / `pinned.sub` | `src/store.ts` (set by `LayerText`, read by `Explanation`) | Already exists and populated. `Explanation.tsx` simply does not READ `subHover` yet — that is the entire gap. |

The store already carries the sub-token data; `LayerText` already sets it; only `Explanation.tsx` fails to read it. The feature is "wire the existing signal into the existing card + author the copy."

### (3) Confirm no new dep is justified

**Confirmed.** Climbing the ladder against the zero-dep project value:

- Rung 1 (need to exist?): the rendering branch and copy must exist — but no NEW capability (no markdown renderer, no i18n lib, no data lib) is implied.
- Rung 2 (already in codebase?): `subHover`/`pinned.sub` plumbing, the precedence-cascade pattern, the prose-module pattern, `ELEMENT_NAMES`, the `<b>`-only `dangerouslySetInnerHTML` reading path — all present.
- Rung 5 (installed dep solves it?): React renders the branch; CSS Modules style it; TS holds the data. Nothing missing.
- Project precedent: v1.2 (feedback), v1.3 (InChIKey), v1.4 (reset/c-layer), Phase 16 (8-step guided tour — explicitly "zero new runtime dependencies, pure React + CSS Modules", HELP-08) all shipped zero-dep. v1.5 is strictly smaller in scope than the Phase 16 tour.

## Suggested data shape for the new sub-token copy module

A new prose module `src/lib/subTokenInfo.ts`, parallel to `inchiKeyInfo.ts`. Pure data + a pure lookup keyed on the `SubHover` discriminant. No DOM, unit-testable in isolation (the v1.2 `buildFeedbackUrl` / v1.3 `parseInchiKey` seam pattern).

```ts
// src/lib/subTokenInfo.ts
import type { SubHover } from './parseInchi';
import { ELEMENT_NAMES } from './layerInfo';

export interface SubTokenCard { title: string; body: string; } // body may contain <b> only

// Full periodic table — extends the existing 10-entry ELEMENT_NAMES.
// Option A (preferred): grow ELEMENT_NAMES in layerInfo.ts in place — one source of
//   truth; formulaSegmentReading already consumes it, so formula readings improve for free.
// Option B: a separate ELEMENT_NAMES_FULL here. Prefer A.

// Optional: one-clause role per element family (covers "name and role" without a
// per-element essay). ponytail: family map, expand per-element only if a reviewer asks.
export function subTokenCard(sub: SubHover): SubTokenCard | null {
  switch (sub.kind) {
    case 'element': /* ELEMENT_NAMES[sub.el] + role clause */ return /* ... */;
    case 'hAtoms':  /* "<b>N</b>H — these atoms each carry N hydrogen(s)" */ return /* ... */;
    case 'mobileH': /* mobile / tautomeric proton copy */ return /* ... */;
    case 'stereo':  /* sp3 handedness + caveat: +/- is canonical-ordering parity, NOT R/S */ return /* ... */;
    default: return null; // atom/bond/branch: fall through to the existing layer card
  }
}
```

`Explanation.tsx` integration (one new branch, top of the cascade):

```ts
const subHover = useInchiStore(s => s.subHover);
const effSub = pinned?.sub ?? subHover;       // pinned sub wins, mirrors effIdx logic (line 46)
const subCard = effSub ? subTokenCard(effSub) : null;
// order: subCard ? <sub card> : keyHoverKind ? ... : layer ? ... : legendHover ? ... : idle
```

`ponytail:` not every `SubHover` kind needs copy — `atom`/`bond`/`branch` (c-layer) return `null` and fall through to the existing connection-layer card, which is already correct. Author copy only for the kinds the milestone names (element, hAtoms, mobileH, stereo); add the rest when a reviewer asks.

## Installation

```bash
# none
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Element names | Extend `ELEMENT_NAMES` Record in TS | npm periodic-table package | Pulls in unused atomic weights/configs/categories; breaks verbatim-data convention; ~2KB hand map vs a dep |
| Sub-token copy | New `subTokenInfo.ts` prose module | Inline strings in `Explanation.tsx` | Mirrors tested `inchiKeyInfo.ts` seam; keeps copy unit-testable and the component thin |
| Rendering | One new branch in existing card | New sub-token card / surface | Milestone goal is explicitly "same card, no new surface" (PROJECT.md line 15) |
| Copy markup | `<b>`-only via existing `dangerouslySetInnerHTML` path, or plain React children | markdown renderer dep | `readingFor` already emits `<b>`/`<span>` only; key-segment card uses plain React children. No markdown needed |

## Open Questions

None affecting the stack. All open v1.5 questions are CONTENT questions (exact element-name list, exact wording of the stereo +/- vs R/S caveat, element "role" granularity) — owned by the roadmap's authoring phase, not by tooling.

## Sources

- Repo source (HIGH — direct read): `src/lib/layerInfo.ts` (`ELEMENT_NAMES` :180, `formulaSegmentReading` :150), `src/components/Explanation.tsx` (precedence cascade :46/:71-136), `src/components/LayerText.tsx` (`subHover` emission :25-39 + `SubHover` constructions), `src/lib/inchiKeyInfo.ts` (`KEY_ZONE_COPY` parallel module), `package.json` (current deps)
- `.planning/PROJECT.md` (HIGH): milestone goal/mechanism (lines 13-22), zero-dep precedent across v1.2/v1.3/v1.4/Phase 16 (Key Decisions table; HELP-08 line 100)
- IUPAC periodic table / element names — authoring source for the extended `ELEMENT_NAMES` (content task, not a dependency)
