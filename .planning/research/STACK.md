# Stack Research — v1.5 Inorganic / Organometallic Capability

**Domain:** In-browser InChI explainer — extending an existing app to handle inorganic & organometallic species
**Researched:** 2026-06-22
**Confidence:** HIGH on the make-or-break facts (InChI string anatomy, no `/r` from ketcher 3.12.0, AuxInfo behavior); MEDIUM on Ketcher's practical drawing fidelity for coordination compounds (verified API exists; live-draw quality not exhaustively tested).

---

## TL;DR for the Roadmap

**Zero new dependencies are needed.** Everything is achievable with the existing ketcher 3.12.0 API + pure-TS parsing extensions to `parseInchi.ts` / `highlightUtils.ts`.

**The single most important finding:** ketcher-react 3.12.0's `getInchi(withAuxInfo?: boolean)` has **no parameter to request the reconnected `/RecMet` layer**. The app therefore receives the **Standard InChI (`InChI=1S/…`) with metal–ligand bonds DISCONNECTED and NO `/r` layer**. The original question's premise — "Standard InChI emits a reconnected `/r` layer by default" — is **false**. Standard InChI never contains `/r`; `/r` is a *non-standard* extension that requires the `/RecMet` switch, which ketcher does not expose. This reframes the whole milestone (see "What This Actually Means" below).

---

## What the InChI Library Actually Emits — Verified

### Version: Standard InChI v1.06 (`1S`)
ketcher-standalone 3.12.0 bundles the Indigo WASM toolkit, whose InChI plugin emits `InChI=1S/…` (the `S` = Standard). The Indigo test suite confirms the default `indigo.convert(mol, "inchi", …)` produces `InChI=1S/…` with no special flags (benzene → `InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H`). The app already handles `1S` strings throughout. **Confidence: HIGH** (Indigo source + ketcher README).

### Metal disconnection is automatic and unavoidable in Standard InChI
Standard InChI **always disconnects all metal atoms** from their ligands in the connection layer. Charges on disconnected halogens / O, S, Se, Te, N, P, As, B are adjusted by transferring charge to the metal where possible. The metal becomes its own dot-separated component. This is fixed behavior of the Standard InChI algorithm — not a toggle. **Confidence: HIGH** (InChI Trust technical FAQ + InChI Technical Manual).

### The `/r` reconnected layer requires `/RecMet` — NOT available via ketcher 3.12.0
- `/r` only appears when the InChI is generated with the `/RecMet` option.
- Turning on `/RecMet` produces a **non-standard** InChI: the prefix changes from `1S/` to `1/`, and a `/r…` block is appended containing a *complete second InChI* of the reconnected structure.
- Indigo *does* support `/RecMet` at the low level (`indigo.setOption("inchi-options", "/RecMet")`), but **ketcher-react's public `getInchi(withAuxInfo?)` and `getInChIKey()` accept no options string** — there is no plumbed path from the React component to set `inchi-options`. **Confidence: HIGH** (ketcher README API signature is `getInchi(withAuxInfo?: boolean): Promise<string>`, single boolean param only).

### Worked example strings (verified against a real source)

Standard InChI is what the app WILL see:

| Species | Standard InChI (what ketcher emits) |
|---------|--------------------------------------|
| Ferrocene | `InChI=1S/2C5H5.Fe/c2*1-2-4-5-3-1;/h2*1-5H;` |
| Ferrocyanide [Fe(CN)₆]⁴⁻ | `InChI=1S/6CN.Fe/c6*1-2;/q;;;;;;-4` |
| Prussian blue | `InChI=1S/18CN.7Fe/c18*1-2;;;;;;;/q;;;;;;;;;;;;;;;;;;3*-4;4*+3` |

The corresponding `/r` forms (which the app will **not** receive — shown only to define the anatomy):

```
Ferrocene  /r:  …/rC10H10Fe/c1-2-4-5-3(1)11(1,2,4,5)6-7(11)9(11)10(11)8(6)11/h1-10H
Ferrocyanide /r: …/rC6FeN6/c8-1-7(2-9,3-10,4-11,5-12)6-13/q-4
```

**Anatomy of `/r`:** it is literally a whole second InChI (formula `/c…/q…/h…` sub-layers) describing the metal-reconnected single entity, glued onto the end after the standard layers. Prefix is `1/` (non-standard). **Confidence: HIGH** (metallome.blogspot.com worked examples, cross-checked with the InChI Technical Manual description).

---

## What This Actually Means for the Existing Stack

The existing parser and highlighter already cover **most** of what inorganic Standard InChI throws at them, because inorganic Standard InChI is *just an aggressively multi-fragment, charged molecule* — and multi-fragment + `/q` + `/p` are already shipped (v1.0/v1.1).

### Question-by-question feasibility

**1. Metal disconnection & `/r` layer — REFRAME, don't build a reconnect feature.**
The app cannot get `/r` from ketcher 3.12.0. So there is nothing to *parse* for `/r` in practice. What the app *does* get is the disconnected form: the metal is a separate `.Fe` (etc.) component and the ligands are their own components. The teaching opportunity flips: the milestone's real value is **explaining to the user WHY the metal looks disconnected** — i.e., a dedicated explanation that Standard InChI deliberately severs metal–ligand bonds, with the `/r` form mentioned as the non-standard alternative the tool can't show. This is a *content/explanation* feature, not a parsing feature. **No `/r` parsing code required.**

**2. `/q` charge & `/p` proton layers — already handled; verify edge cases only.**
The `/q` handler (`highlightUtils.ts`) already splits per-component on `;` and maps charged fragments. Critically, the ferrocyanide example `/q;;;;;;-4` (7 slots) lines up exactly with `formulaFragmentCounts("6CN.Fe")` → `[2,2,2,2,2,2,1]` (7 components). The existing per-fragment cumulative-offset machinery resolves this correctly today. `/p` (mobile proton) is identical to existing salt handling. **Gap:** the *explanation copy* for `/q`/`/p` is written for organic ions; it should be extended to describe net-charge-per-component and metal charge transfer. **Highlighting: no new code. Explanation: copy edits in `layerInfo.ts`.**

**3. Multi-component salts — fully covered by existing machinery.**
Dot-separated components, the `N*` multiplier in formula (`6CN`), c-layer (`c6*1-2`), h-layer (`h2*1-5H`), and `/q` are all handled by `formulaFragmentCounts`, `expandLayerText`, and the cumulative-offset loops in `enrichLayers` / `buildHighlightSpecs`. The `c6*1-2;` form (multiplied component followed by an empty `;` for the bondless metal) parses fine — `expandLayerText` expands the `6*` and the trailing empty segment yields no bonds. **No new code; add inorganic test fixtures.**

**4. Ketcher drawing fidelity — usable but with honest limits.**
- ketcher-react 3.12.0 has a full periodic table (metals included), charge +/- tools, and a **dative/coordinate bond** type in the bond palette. So a user *can* draw a metal with coordinate bonds.
- **Limitation 1 (the big one):** regardless of how the user draws the metal–ligand bonds (covalent, dative, or none), Standard InChI **disconnects them anyway**. The canvas will show bonds the InChI string does not represent — inherent to Standard InChI, not a Ketcher bug, and must be explained in-app.
- **Limitation 2:** implicit-H perception on atoms bonded to a metal is unreliable (a known organometallic modeling issue); drawn structures may need explicit H or explicit charges to yield a sensible InChI.
- **Limitation 3 — AuxInfo mapping (make-or-break for highlighting):** `getInchi(true)` AuxInfo describes the **disconnected** structure (the same structure the InChI describes), because both come from the same normalization pass. The existing coordinate-matching remap (`remapAuxToPoolIds`, added in v1.1 for CuSO₄-style multi-component cases) already handles interleaved pool IDs across components by matching molfile `/rC:` coordinates to live-editor atom positions. **The metal atom, as its own single-atom component, is just another component the coordinate matcher will place.** The residual risk: a lone metal atom with no bonds is still an atom with coordinates, so it should map — but this needs one live verification (see gate below). **Confidence: MEDIUM — API path is sound, needs one live check.**

**5. New libraries — NONE.**
Confirmed: no RDKit, no OpenBabel, no server, no second WASM module. The whole milestone is (a) explanation-copy additions in `layerInfo.ts`, (b) a small amount of parser hardening + inorganic test fixtures in `parseInchi.ts`/`highlightUtils.ts`, and (c) optionally inorganic preset molecules in `molecules.ts`. **Zero-new-deps feasibility: CONFIRMED.**

---

## Recommended Stack (unchanged — this is the point)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ketcher-react / -standalone / -core | 3.12.0 (pinned) | Editor + WASM Standard InChI v1.06 | Already shipped; emits `1S` with automatic metal disconnection. No change. |
| Indigo WASM (transitive) | bundled in ketcher-standalone 3.12.0 | InChI/InChIKey generation | Standard InChI only via the exposed API. Do not import directly. |
| Pure-TS parsers (`parseInchi.ts`, `parseAuxMapping.ts`, `highlightUtils.ts`) | in-repo | Layer parsing, AuxInfo→pool-ID mapping, highlight specs | Already multi-fragment & `/q`/`/p` aware; extend for inorganic explanation + fixtures. |

### Supporting Libraries

**None added.** All new behavior lands in existing in-repo modules.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | unit-test new inorganic fixtures | Add ferrocene / ferrocyanide / Prussian blue as `1S` fixtures; assert per-component `/q` highlighting and that `.Fe` maps to a single atom. |

## Installation

```bash
# No new packages. v1.5 adds zero dependencies.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Explain the disconnected Standard InChI (no `/r`) | Plumb `/RecMet` through to expose `/r` | Would require forking/patching ketcher-react to pass `inchi-options` to the structService, producing a *non-standard* (`1/`) InChI. Off-brand (tool teaches *Standard* InChI), high-risk, and breaks InChIKey parity. **Reject for v1.5.** |
| Pure-TS parser extensions | RDKit-JS / OpenBabel-WASM second engine | Only if the product pivots to reconnect rendering. Adds a heavy WASM dep and a second source of truth that can disagree with ketcher — violates the verbatim-passthrough invariant. **Reject.** |

## What NOT to Use / NOT to Build

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `/r` reconnected-layer parser | ketcher 3.12.0 never emits `/r`; building a parser for output you can't produce is dead code | Explanation copy describing *why* the metal is disconnected + that `/r` is the non-standard alternative |
| Patching ketcher to send `/RecMet` | Produces non-standard `1/` InChI, breaks the "we explain Standard InChI" identity and InChIKey alignment | Keep `getInchi(true)` as-is |
| Importing `indigo-ketcher` directly to set `inchi-options` | Transitive dep; bypasses the public API; version-skew risk; CLAUDE.md explicitly forbids it | Only the ketcher public API |
| Reconstructing the reconnected structure in JS | Re-deriving connectivity = exactly the "never reconstruct InChI" anti-pattern in MEMORY.md | Display verbatim disconnected `1S` output |
| New charge/`/q` highlight logic | Already shipped and per-component correct (CuSO₄ verified v1.1) | Extend explanation copy only |
| 3D / coordination-geometry viewer | Out of scope (PROJECT.md); InChI is 2D notation | n/a |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| ketcher-react 3.12.0 | ketcher-standalone 3.12.0, ketcher-core 3.12.0 | Keep pinned in lockstep (existing decision). No bump needed for v1.5. |
| Standard InChI 1S | existing `parseInchi` layer split | `1S` already the only version handled; inorganic strings are still `1S`. |

---

## Concrete Roadmap Inputs

**API methods (exact, verified):**
- `ketcher.getInchi(true)` → `"InChI=1S/…\nAuxInfo=1/0/N:…/rC:…"` — unchanged; AuxInfo describes the disconnected structure.
- `ketcher.getInChIKey()` → 27-char key — unchanged; inorganic species hash fine.
- **No `inchi-options` / `/RecMet` parameter exists** on the React-level API. Do not design around `/r`.

**Worked anatomy to teach (ferrocyanide):** `InChI=1S/6CN.Fe/c6*1-2;/q;;;;;;-4`
- `6CN.Fe` — six cyanide components + one disconnected iron (the `.Fe` with no c-bonds).
- `c6*1-2;` — each CN is the bond `1-2`; the trailing `;` is iron's empty (bondless) connection slot.
- `/q;;;;;;-4` — six empty charge slots (neutral CN entries) then `-4` net charge on the final component slot.
- The metal–C dative bonds the user drew are **absent** — the headline teaching point.

**The one live verification gate (do this FIRST in the milestone):** draw or load ferrocene, call `getInchi(true)`, and confirm: (a) string is `1S` with the expected `2C5H5.Fe` form, (b) `remapAuxToPoolIds` resolves the Fe atom's pool ID, (c) hovering the `.Fe` formula component highlights the iron atom on canvas. If (b)/(c) hold, the highlighting feature is green; if not, the metal-as-lone-component is the only new mapping edge case to fix.

## Sources

- ketcher README — `getInchi(withAuxInfo?: boolean)` / `getInChIKey()` signatures (HIGH): https://github.com/epam/ketcher/blob/master/README.md
- Indigo InChI options list — `/RecMet`, `/FixedH`, etc. (HIGH): https://lifescience.opensource.epam.com/indigo/options/inchi.html
- Indigo WASM test suite — default `convert(…, "inchi")` emits `InChI=1S/…` (HIGH): https://github.com/epam/Indigo (api/wasm/indigo-ketcher tests)
- InChI Trust Technical FAQ — metal disconnection is automatic in Standard InChI; `/r` is non-standard (HIGH): https://www.inchi-trust.org/technical-faq/
- InChI Technical Manual — reconnected layer description (HIGH): https://www.ch.ic.ac.uk/rzepa/inchi/INChI_TechMan_beta11.pdf
- Metallome blog — verbatim ferrocene / ferrocyanide / Prussian blue `1S` and `/r` strings (HIGH for example strings): http://metallome.blogspot.com/2025/05/inchi-metal-reconnected-layer.html
- Ketcher help.md — bond palette includes dative/coordinate bonds; periodic table; charge tools (MEDIUM): https://github.com/epam/ketcher/blob/master/documentation/help.md
- ChemAxon "how to draw coordination compounds" — context on dative-bond modeling caveats (MEDIUM): https://docs.chemaxon.com/display/lts-europium/how-to-draw-coordination-compounds.md
