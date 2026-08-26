> **ARCHIVED — this is the 2026-06-10 handoff, not the current one.**
>
> Kept because `.planning/milestones/v1.0-phases/08-hydrogen-implicit-explicit-highlight/08-UAT.md`
> cites it twice for the recurring multi-fragment repro molecule — see the
> "## The recurring test molecule" section. That UAT says "HANDOFF.md line 17"; this banner shifted
> the file, so go by the section heading, not the number. Nothing else here describes present state.
>
> Live handoff: `.planning/HANDOFF.json` + `.planning/.continue-here.md`.

# Handoff — Explain that InChI (2026-06-10)

## Where things stand
Working tree **clean**, on `master`. All work committed. Test suite: **202 passing**, `tsc -b` clean.
This session was a code review that turned into a chain of bug fixes, mostly around **multi-fragment / multi-component InChI** support. All routed through `/gsd-quick` (planner → executor in worktree → merge → docs commit), per the repo's GSD enforcement in CLAUDE.md.

## What got done this session (in order)
1. **Removed dead components** — `Footnote` (user: "was shit") and `MappingStrip` (Ketcher→InChI atom-mapping strip, unused). Both were built/tested but never mounted in `App.tsx`. Deleted components, helper (`deriveMappingPairs`), tests, and their CSS. Commit `d958df8`.
2. **260610-cho** — preset-highlight guard timing + stale-result guard in `App.tsx handleChange`. `isSettingMoleculeRef` was cleared in `handleMolSelectLogic`'s `finally` but read 150ms later in the debounce → preset button highlight cleared itself. Also added the `thisGen !== generationRef.current` guard to the `catch`.
3. **260610-csa** — `InchiSection` `rawText` now sourced from `l.text` instead of positional `rawParts[i]` (removed fragile index coupling). No-op for aligned cases; correct when segments would misalign.
4. **260610-d2r** — mixed `N*…;N*…` hover bug in `LayerText.tsx`: greedy `multMatch` regex ate across `;`. Guarded both sites (`ConnectionText`, `HLayerText`) with `!text.includes(';')`. Pre-existing v1.0 bug.
5. **260610-eci** — **canonical→Ketcher pool-ID remap** (the big one). `App.tsx` assumed molfile order == `molecule.atoms` iteration order; false for multi-component (getInchi groups atoms by component, pool IDs interleave) → ~25/31 atoms highlighted the wrong fragment. Fix: `parseInchiWithAux` now parses the AuxInfo `/rC:` field → `molfileCoords`; new pure helper `remapAuxToPoolIds` (in `parseAuxMapping.ts`) maps rank→poolId by **coordinate matching** (live atom `(x, -y)` vs `rC`), with fallback to old `poolIds[rank]` when `rC` absent. Has a fixture-backed test using the real repro molecule.
6. **260610-eoi** — `readingFor` (layerInfo.ts) made multi-fragment-aware: signature now `readingFor(layer, atomElements, fragCounts=[])`; formula separates components with `; `; c/h/t apply per-fragment canonical offsets (no more spurious cross-fragment bond, correct labels); `Explanation.tsx` passes `fragCounts`. Also fixed **`?` (undefined) stereocenters** end-to-end: `parseStereoAtoms`/`parseStereoParities` regexes include `?`, `parityColor('?')→var(--c-stereo)`, `highlightUtils` case `t` gets a third "undefined" group, `ParityText` renders `?` tokens interactive.
7. **260610-fn1** — formula-layer **`H` hover** now scopes to the hovered fragment via `canonRange` (was highlighting explicit H in all fragments). Fix in `buildSubHoverSpecs` `el==='H'` branch only.

## The recurring test molecule
`InChI=1S/C12H19N.C11H17N.C6H6/c1-9(11(3)13)10(2)12-7-5-4-6-8-12;1-9(10(2)12)8-11-6-4-3-5-7-11;1-2-4-6-5-3-1/h4-11H,13H2,1-3H3;3-7,9-10H,8,12H2,1-2H3;1-6H/t9?,10?,11-;9?,10-;/m11./s1`
- fragCounts `[13,12,6]`; canonical ranges: A(C12H19N)=1-13, C(C11H17N)=14-25, B(benzene)=26-31.
- Its real `getInchi(true)` AuxInfo + live atom dump are embedded in `src/lib/__tests__/remapAuxToPoolIds.realRepro.test.ts` (and the eci/eoi tests). Reuse those if you need ground truth.

## IMPORTANT — not yet verified in the live app
All fixes are proven by unit tests, but the **live Ketcher canvas rendering** was never exercised here (no WASM in this env). **The user should manually re-test that molecule in the running app** to confirm canvas highlighting, stereo, and per-fragment H now look right end-to-end. If something's still off, the most likely remaining surface is the `App.tsx`↔Ketcher glue (the `as any` internals), not the pure libs.

## Known watch-outs
- **Worktree base drift:** twice the gsd-executor's worktree forked from a stale commit (CC bug #2015); the dispatch prompt now pins the base + a `vitest` count sanity check, and I always verify `git merge-base` before merging. Keep doing this.
- **Open from the original review (not yet done):** the `App.tsx` Ketcher-internals `as any` adapter is fragile (a Ketcher bump could silently break highlighting). Flagged as a larger refactor, not a quick fix — not started.

## How to continue
- Repo uses GSD: route edits through `/gsd-quick` (or `/gsd-fast` for trivial). Quick tasks live in `.planning/quick/`; STATE.md "Quick Tasks Completed" table is the log.
- Verify with: `npx tsc -b` and `npx vitest run`.
- STATE.md notes the multi-fragment series as complete with no outstanding multi-fragment follow-ups.
