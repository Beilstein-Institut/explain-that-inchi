---
status: complete
phase: 08-hydrogen-implicit-explicit-highlight
source: [08-00-SUMMARY.md, 08-01-SUMMARY.md]
note: Also covers post-v1.0 quick-fix series (260610-eci/-eoi/-fn1/-ist, e655971) that re-touched the H-highlight + multi-fragment subsystem and were never browser-verified (per .planning/HANDOFF.md).
started: 2026-06-17T05:43:33Z
updated: 2026-06-17T05:43:33Z
---

## Current Test

[testing complete]

## Side Findings (non-Phase-8, track separately)

- coi-serviceworker.js 404 in dev: index.html references `%BASE_URL%coi-serviceworker.js` but `%BASE_URL%` is not a Vite substitution. Harmless on localhost (Vite dev sets COOP/COEP), but would break the header-injection service worker on GitHub Pages. Fix candidate: use `%MODE%`-style or Vite `base`-aware path, or `import.meta.env.BASE_URL`. Not a Phase 8 regression.
- No favicon file in repo → favicon.ico 404 (cosmetic).

## Tests

### 1. App cold-start smoke test
expected: Start the dev server fresh (`npm run dev`) and open the app. Ketcher editor mounts, WASM initialises (loading state clears), and drawing/loading any molecule produces a live InChI string in the section below. No console errors on boot.
result: pass
note: WASM loaded, InChI generates, editor functional. Console showed benign cairo WASM log + favicon 404 (cosmetic) + coi-serviceworker.js 404 (see Side Findings — infra, not Phase 8).

### 2. Implicit-H badge rendering (badge position — Assumption A1)
expected: On a simple molecule (e.g. ethanol), hover the formula H-count (or an /h-layer token for implicit H). Each affected heavy atom gets a small "H" / "H2" / "H3" badge rendered near the atom on the canvas — positioned at/just below the atom, not floating in a random corner. No bonds are drawn for implicit H.
result: pass
note: Assumption A1 (getBBox badge positioning) confirmed correct in live canvas.

### 3. Explicit-H bond highlight
expected: On a molecule with an explicit H atom drawn, hover the matching /h-layer H token. The explicit H atom AND its bond to the heavy atom both highlight (atom + bond coloured), distinct from the implicit case which highlights no bond.
result: pass

### 4. Mobile-H "H?" italic badge (alanine OH/COOH proton)
expected: Load/draw alanine. Hover the formula H-count. The mobile/exchangeable proton (the (H,5,6)-style group, e.g. the OH/COOH proton) shows an italic "H?" badge — not a numbered "Hn" badge, and not nothing. (This was the last fix, e655971.)
result: pass

### 5. Multi-fragment: correct-fragment highlighting
expected: Load the recurring repro molecule (3 components: C12H19N · C11H17N · benzene — see HANDOFF.md line 17). Hover a c- or h-layer segment for one fragment. The atoms/bonds highlighted on the canvas belong to the CORRECT fragment — not scattered across the wrong component. (Validates the 260610-eci coordinate-matching pool-ID remap.)
result: pass

### 6. Per-fragment H scoping
expected: On the same multi-fragment molecule, hover the formula H-count (or an H sub-token) for one fragment. Only that fragment's explicit/implicit H atoms light up — H atoms in the other two fragments stay un-highlighted. (Validates 260610-fn1/-ist canonRange scoping.)
result: pass

### 7. Undefined stereocenters (t-layer `?`)
expected: On the repro molecule (t-layer `/t9?,10?,11-;9?,10-;`), the `?` (undefined) stereocenter tokens render as interactive coloured spans, and hovering them highlights the corresponding stereocenter atoms on the canvas — they are not skipped or rendered as dead text. (Validates 260610-eoi undefined-stereo handling.)
result: issue
reported: "+ and ? should have different colors (currently --c-stereo and --c-stereo-plus are both oklch(0.58 0.16 25), so undefined and plus-parity are visually identical). The 260610-eoi interactivity/rendering itself works; this is a design-palette collision."
severity: cosmetic
note: Not a Phase 8 code regression — parityColor() correctly maps to 3 separate tokens; two tokens (--c-stereo, --c-stereo-plus) share the same oklch value in the handoff palette. Fix = give --c-stereo a distinct hue in src/styles.css.

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Undefined (?) stereocenters are visually distinguishable from defined-plus (+) stereocenters"
  status: failed
  reason: "User reported: + and ? should have different colors"
  severity: cosmetic
  test: 7
  root_cause: "Design-palette token collision: --c-stereo and --c-stereo-plus are both oklch(0.58 0.16 25) in src/styles.css (inherited from design_handoff styles.css). parityColor() maps correctly to 3 distinct tokens; the token VALUES collide."
  artifacts:
    - path: "src/styles.css"
      issue: "--c-stereo (line 18) duplicates --c-stereo-plus value (line 45)"
  missing:
    - "Assign --c-stereo a distinct hue from --c-stereo-plus so undefined ? reads differently from + parity"
  debug_session: ""
  resolution: "FIXED — --c-stereo / --c-stereo-bg retuned to hue 112 (lime/yellow-green), chosen as the palette's emptiest band: max angular separation from + (red 25) and − (blue 265), no collision with any other token (nearest neighbor S-gold at 27°, conn-green at 43°). tsc clean, 206 tests pass. Live-confirmed distinct."
