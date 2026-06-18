# Pitfalls Research

**Domain:** Adding a live InChIKey display + per-segment hover explanations + copy button to the existing in-browser InChI explainer (Vite 8 + React 18 + TS + Ketcher 3.12.0 WASM + Zustand 5 + CSS Modules, static GitHub Pages, no backend)
**Researched:** 2026-06-18
**Confidence:** HIGH (API + InChIKey structure verified against ketcher-core/ketcher-standalone source and InChI Trust FAQ; integration pitfalls verified against current `App.tsx` / `InchiSection.tsx` / `store.ts`)

## Key verified facts (read these first)

- **The API exists and is independent.** `ketcher.getInChIKey(): Promise<string>` is declared in `node_modules/ketcher-core/dist/application/ketcher.d.ts:52` and routes to `StandaloneStructServiceProvider`'s WASM worker as a **separate command** (`Command.GetInChIKey = 11` in `ketcher-standalone/dist/main.js:38`). It is `output_format: 'inchi-key'` — Indigo computes the key from the current struct, **not** from the InChI string the app already holds. This is the load-bearing fact for the whole feature: the key is fetched, never derived in JS.
- **Standard InChIKey is a fixed 27-char string:** `AAAAAAAAAAAAAA-BBBBBBBB-FVP` → 14-char skeleton hash, hyphen, 8-char "remaining layers" hash (stereo/isotope/protonation-ish), hyphen, then **F** = standard flag (`S` standard / `N` non-standard), **V** = version (`A` = InChI v1), **P** = protonation indicator (`N` neutral, then `O`, `M`, etc.). One-way hash: **not reversible, not atom-mappable.** Collisions are improbable but **do occur** in practice.
- **No store fields exist for the key yet.** `store.ts` has `inchi`, `layers`, `auxMap`, `atomElements`, `hAtomPoolIds`, `hoverIdx`, `subHover`. Adding the key means a deliberate store-shape decision (see Pitfall 5 / 6).
- **The existing debounce+generation guard lives in `App.tsx` `handleChange`** (150 ms timer, `generationRef` stale-result guard, `isHighlightingRef`, `isSettingMoleculeRef`). The InChIKey must ride this same pipeline, not a parallel one.

## Critical Pitfalls

### Pitfall 1: Reconstructing the InChIKey from parsed segments (violates the standing no-reconstruct rule)

**What goes wrong:**
The team renders the key as four color-coded spans, then "helpfully" rebuilds the displayed/copied string by concatenating the parsed `block1 + '-' + block2 + '-' + flags`. Any off-by-one in segment boundaries, a dropped hyphen, or a non-standard `N` flag the slicer didn't anticipate produces a corrupted key shown/copied to the user.

**Why it happens:**
Direct analogue of the documented InChI bug (memory `feedback_inchi_passthrough.md`): InChI mixtures contain `.` characters the layer parsers don't model, and re-joining `layer.text` silently drops them. The InChIKey is even more seductive because it *looks* perfectly regular (fixed 27 chars), tempting a "just rebuild it" shortcut.

**How to avoid:**
Treat the verbatim string from `getInChIKey()` as the single source of truth for both **display text** and **copy payload**. Slice it **by fixed byte offset** for coloring only (chars 0–13 skeleton, 15–22 second block, 24 flag, 25 version, 26 protonation), exactly like `InchiSection` slices the raw `inchi`. Never join segment text back into a string. Add a unit test asserting `displayedKey === rawKeyFromLibrary` and `copyPayload === rawKeyFromLibrary`.

**Warning signs:**
A function named `buildInchiKey`, `joinKeySegments`, or any code path where the rendered/copied value is derived from segment arrays rather than the raw string.

**Phase to address:**
Earliest phase — the source/store phase. Bake the verbatim-passthrough invariant into the store contract and the copy handler before any rendering work.

---

### Pitfall 2: Assuming the key derives from the displayed InChI (standard vs non-standard mismatch)

**What goes wrong:**
The team computes the key client-side from the already-displayed InChI string, or assumes `getInChIKey()` always returns an `S`-flagged (standard) key matching the `getInchi(true)` output. If the two WASM calls ever use different option sets (e.g. one standard, one not), the key's flag char (`S`/`N`) and even its hash can disagree with the InChI strip directly above it — the user sees an internally inconsistent pair.

**Why it happens:**
`getInchi()` and `getInChIKey()` are **two separate WASM commands** computed independently from the struct (verified in `ketcher-standalone/dist/main.js`). Developers assume "the key is just a hash of the InChI" and don't realize they're two independent Indigo conversions that *should* agree but are produced separately.

**How to avoid:**
Always obtain the key from `ketcher.getInChIKey()` — never hash or transform the InChI string in JS. Both calls are issued against the same struct in the same `handleChange` tick (after `setMolecule`/draw settles), so they describe the same molecule. In the explanation copy, state that this is the **Standard InChIKey** and surface the flag character (`S`) as the live proof. Add an assertion/test that for the preset molecules the returned key's flag char is `S` and version char is `A`.

**Warning signs:**
Any code importing a JS hashing/base-something library; an explanation card that claims "the key is computed from the InChI above."

**Phase to address:**
Source phase — lock in `getInChIKey()` as the only key source; verification in the same phase.

---

### Pitfall 3: Key not in sync with the debounced InChI (parallel pipeline / race)

**What goes wrong:**
A separate `useEffect`/subscription or its own debounce timer is added for the key. Result: the InChI strip and the InChIKey update on different ticks — the strip shows molecule B while the key still shows molecule A for a frame or longer. Worse, a slow `getInChIKey()` call for an old struct resolves *after* a newer draw and overwrites the store with a stale key.

**Why it happens:**
`getInChIKey()` is async and the obvious first instinct is "give it its own effect." The app already solved this exact class of bug for InChI with the `generationRef` stale-result guard in `App.tsx` (D-05), but a new contributor may not extend that guard to the key.

**How to avoid:**
Issue `getInChIKey()` **inside the existing `handleChange` debounce**, in the same `thisGen = ++generationRef.current` window as `getInchi(true)`. Run both with `Promise.all`, then re-check `if (thisGen !== generationRef.current) return;` **after** the await before writing to the store, and write inchi + key in a **single `setInchiData`-style action** so they commit atomically. Do not add a second subscription, second debounce timer, or second generation counter.

**Warning signs:**
A new `ketcher.editor.subscribe('change', ...)`; a second `setTimeout` debounce; a `setInchiKey` action called from a different tick than `setInchiData`; the key visibly lagging the strip by a frame when dragging atoms.

**Phase to address:**
Source/wiring phase — extend the existing pipeline, verified with a "rapid edit" stale-result test mirroring the existing generation-guard tests.

---

### Pitfall 4: Wrong/empty key on empty, invalid, or disconnected structures

**What goes wrong:**
On an empty canvas or a structure Indigo can't key, `getInChIKey()` either rejects, returns `''`, or returns a degenerate key. If unhandled, the segment renderer slices an empty/short string and shows garbled spans or throws; or a stale key persists after the canvas is cleared. Multi-component/salt structures (the project's historical correctness sore spot, INCHI-06) compute a **single** key for the whole mixture — there is no per-component key, and the protonation char reflects net charge of the assembly.

**Why it happens:**
The existing empty-canvas guard in `App.tsx` keys off `result.layers.length < 2` and resets the InChI store to empty — but a naively added key fetch may not be inside that guard, so it runs (and can throw) even when the InChI path already bailed. Disconnected structures historically broke atom mapping; the key path has its own edge behavior.

**How to avoid:**
Gate the key fetch behind the **same** empty/disconnected guard already used for InChI: if the InChI path resets to empty, the key must reset to empty in the same atomic write. Wrap `getInChIKey()` in the existing try/catch and, on throw, write empty key (do not blank under a stale generation — reuse the `thisGen` check in the catch, exactly as the InChI path does). Render the segment strip only when the key is a full 27-char standard key (`/^[A-Z]{14}-[A-Z]{8}-[A-Z]{3}$/`); otherwise show the same placeholder treatment as the empty InChI strip. For multi-component molecules, explicitly state in the explanation that the key represents the **entire** drawn assembly (one key, no per-fragment keys) — and add a multi-component preset to the test matrix.

**Warning signs:**
Console errors on canvas clear; a key lingering after "erase all"; `key.slice(15,23)` producing `undefined`/short spans; assuming each `.`-separated InChI component would yield its own key.

**Phase to address:**
Source phase (guard + empty handling) and rendering phase (length validation before slicing). Multi-component correctness verified in the same phase that closed INCHI-06.

---

### Pitfall 5: Recomputing the key adds WASM cost / blocks the existing InChI on every keystroke

**What goes wrong:**
Adding `getInChIKey()` as a second sequential `await` after `getInchi(true)` in `handleChange` roughly doubles WASM round-trips per edit and can make the InChI strip feel laggier under rapid drawing, even though both are debounced at 150 ms.

**Why it happens:**
Sequential `await getInchi(); await getInChIKey();` serializes two independent worker calls. Each is a postMessage round-trip to the WASM worker (`ketcher-standalone/dist/main.js`).

**How to avoid:**
Fire both concurrently with `Promise.all([ketcher.getInchi(true), ketcher.getInChIKey()])` inside the single debounce tick, so the added latency is `max(a,b)` not `a+b`. Keep the 150 ms debounce; do not lower it. The atom-mapping/`render.ctab` work already in `handleChange` runs after, unchanged. At this app's scale (one molecule, interactive single user) this is the only performance concern that matters — no need to cache or memoize keys.

**Warning signs:**
Visible input lag while dragging; profiler showing two serial worker messages per debounce tick; a `getInChIKey()` call placed outside the debounce (e.g. on every `change` synchronously).

**Phase to address:**
Source/wiring phase — concurrent fetch is the default implementation, not an optimization to retrofit.

---

### Pitfall 6: Remounting the Ketcher canvas or breaking the existing InChI strip

**What goes wrong:**
Restructuring the layout to fit the new key strip causes `KetcherPanel` to remount, which re-initializes the WASM worker (multi-second reload, lost canvas state). Or store-shape changes ripple into selectors that `InchiSection` depends on, breaking the working InChI strip / highlight wiring.

**Why it happens:**
The project has an explicit, hard-won invariant: the `StandaloneStructServiceProvider` is module-level and `KetcherPanel` must never remount (D-13, and the v1.2 feedback feature was deliberately built as a leaf sibling for exactly this reason — "Feedback is ephemeral UI state, dialog is a leaf sibling… canvas never remounts"). A new InChIKey section sibling to `InchiSection` is safe; restructuring the `App` tree around the canvas is not.

**How to avoid:**
Add the InChIKey display as a **new sibling component** (e.g. `InchiKeySection`) placed after `InchiSection` in `App.tsx`, reading from the store via its own selectors — mirroring how `InchiSection` and `FeedbackDialog` are independent leaves. Do not touch `KetcherPanel`, the `structServiceProvider`, or the `onInit` path. When extending the store, **add** fields (`inchiKey`) rather than changing existing field shapes/actions; keep `setInchiData`'s existing signature working (add an optional param or a sibling `setInchiKey` written in the same atomic tick).

**Warning signs:**
The canvas flashes/reloads when the new section appears; WASM "initializing" state re-triggers after the key feature lands; existing `InchiSection.test.tsx` starts failing.

**Phase to address:**
Rendering/layout phase — establish the leaf-sibling structure first; the existing canvas-never-remounts tests are the regression gate.

---

### Pitfall 7: Mislabeling segment boundaries / meaning of the flag/version/protonation chars

**What goes wrong:**
The explanation cards state wrong lengths or wrong meanings: e.g. calling the second block "stereochemistry only" (it also carries isotope + protonation-derived info), calling `V` the protonation char, or slicing 13/8/3 instead of 14/8/3 — producing both wrong color spans and wrong prose.

**Why it happens:**
The 27-char layout is dense and the trailing `FVP` triplet is easy to mis-attribute. Training-data summaries of InChIKey are often vague about which block holds what.

**How to avoid:**
Use the verified layout (InChI Trust FAQ): chars **0–13** = 14-char skeleton hash (connectivity / Mobile-H layer); char **14** = hyphen; chars **15–22** = 8-char hash of the remaining layers (stereo + isotope + protonation-state contributions); char **23** = hyphen; char **24** = **F** flag (`S` standard / `N` non-standard); char **25** = **V** version (`A` = InChI v1); char **26** = **P** protonation indicator (`N` neutral net charge, other letters for ±1, ±2…). Encode these offsets as named constants with a unit test pinning each segment's slice and label. Keep prose factual and source-cited.

**Warning signs:**
Color spans that don't align with the hyphens; a card calling char 25 "protonation"; segment lengths that don't sum to 27.

**Phase to address:**
Content/explanation phase — segment offsets and copy authored against the verified spec, with a slice-boundary unit test.

---

### Pitfall 8: Implying the key is reversible, atom-mappable, or collision-proof

**What goes wrong:**
The explanation says or implies the InChIKey can be decoded back to a structure, or — fatal for this app's mental model — that hovering a key segment highlights atoms (as InChI layers do). Or it overstates uniqueness ("guaranteed unique, no two molecules share a key").

**Why it happens:**
By analogy with the existing InChI strip, where every layer hover highlights canvas atoms (INCHI-03), users/devs expect the same of the key. But the key is a **one-way hash** — segments correspond to *hashed* layers, not to atoms.

**How to avoid:**
Explicitly design the key segments to **not** wire into `useKetcherHighlights`/`setHover` — they have no `auxMap` and must not call the highlight store actions. The hover cards explain meaning only. Copy must state: one-way hash, **not reversible** (recovery needs a lookup database), **no atom mapping**, and collisions are *highly improbable but not impossible* (FAQ confirms real-world collisions exist, especially for stereochemically complex molecules). This is called out as a first-class design constraint in PROJECT.md milestone notes ("its segments do NOT highlight canvas atoms").

**Warning signs:**
Key segment `onMouseEnter` calling `setHover`/`setSubHover`; canvas atoms lighting up on key hover; copy using the words "unique" or "decode" without qualification.

**Phase to address:**
Content/explanation phase (prose) and rendering phase (ensure no highlight wiring on key segments).

---

### Pitfall 9: Copy-button confirmation timing under React StrictMode

**What goes wrong:**
The new "copy key" button's "Copied!" state either never resets, or `setCopied(false)` fires on an unmounted component. Under React 18 StrictMode dev double-invoke (mount → cleanup → mount), a naive `mountedRef` left `false` after the first cleanup blocks the reset — the exact v1.1 bug (WR-02) already fixed in `InchiSection`.

**Why it happens:**
Copy-pasting the existing `handleCopy`/`setTimeout` pattern without copying the StrictMode-safe `mountedRef` reset-on-mount logic. The fix in `InchiSection.tsx:28-32` sets `mountedRef.current = true` **on every mount** (not just once) precisely to survive the double-invoke.

**How to avoid:**
Reuse the exact proven pattern from `InchiSection`: a `mountedRef` set to `true` in a `useEffect` mount callback (so StrictMode's remount re-arms it), cleanup sets it `false`, and the 3 s `setTimeout` reset checks `if (mountedRef.current)` before `setCopied(false)`. Better: extract the copy-with-confirmation into a shared hook (`useCopyButton`) so both the InChI and InChIKey buttons share one tested implementation. Copy the **verbatim** key string (Pitfall 1).

**Warning signs:**
"Copied!" never disappears in dev; a React "setState on unmounted component" warning; the confirmation getting stuck after toggling the section.

**Phase to address:**
Rendering phase — ideally via a shared `useCopyButton` hook authored with a StrictMode-double-mount test.

---

### Pitfall 10: Preset-load stale timing (mirroring the prior preset-highlight bug)

**What goes wrong:**
After clicking a preset, the key briefly shows the previous molecule's key, or the key fails to update because the `change` event fired during `setMolecule()` was treated as a free-draw and bailed. This is the same class as the prior preset-highlight timing bug (`isSettingMoleculeRef`).

**Why it happens:**
`setMolecule()` triggers a `change` event that `handleChange` must process to fetch InChI **and** the key. The `isSettingMoleculeRef` guard exists to prevent the preset selection from being cleared by that event — but the key fetch must still run on that tick.

**How to avoid:**
Because the key fetch is added **inside** the same `handleChange` (Pitfall 3), it automatically inherits the correct preset-load behavior — the guard only suppresses `setSelectedMolId(null)`, not the InChI/key fetch. Do **not** add a manual `getInChIKey()` call inside `handleMolSelectLogic` (the doc comment there explicitly warns a manual `getInchi` call would create a race — the same applies to the key). Verify with the preset-load test path that already exists for InChI.

**Warning signs:**
Key lags one molecule behind after preset clicks; a `getInChIKey()` call added to `handleMolSelectLogic`; flicker of the old key on preset switch.

**Phase to address:**
Source/wiring phase — verified against the existing preset-load + generation-guard tests.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reconstruct key string from parsed segments for display/copy | "Cleaner" render code | Corrupted key shown/copied (repeat of the InChI `.`-drop bug); silent data integrity loss | **Never** — verbatim passthrough is a project invariant |
| Separate `useEffect`/debounce for the key | Decoupled, easy to reason about in isolation | InChI/key desync + stale-result races; duplicates the generation-guard logic | **Never** — ride the existing `handleChange` |
| Sequential `await getInchi(); await getInChIKey();` | Trivial to write | Doubles per-edit latency | Acceptable only as a throwaway spike; ship `Promise.all` |
| New copy button without the StrictMode `mountedRef` reset-on-mount | Fewer lines | Re-introduces the v1.1 WR-02 stuck-confirmation bug in dev | Never — reuse the proven pattern / shared hook |
| Wire key segments into the highlight store "for consistency" | Visual parity with InChI strip | Implies false reversibility/atom-mapping; misleads chemists | Never — key is a one-way hash |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `ketcher.getInChIKey()` (WASM worker) | Assuming it derives from the displayed InChI string | It's an independent Indigo conversion (`output_format: 'inchi-key'`); call it directly, never hash the InChI in JS |
| Existing `handleChange` debounce in `App.tsx` | Adding a parallel subscription/timer for the key | Fetch key inside the same debounce tick with `Promise.all`; reuse `generationRef` + empty-canvas guard; commit atomically |
| Zustand store | Mutating `setInchiData` signature or field shapes | Add an `inchiKey` field + write it in the same atomic action; keep existing selectors/tests green |
| `App` component tree / `KetcherPanel` | Restructuring layout in a way that remounts the canvas | Add `InchiKeySection` as a leaf sibling after `InchiSection`; never touch `KetcherPanel`/`structServiceProvider` (D-13) |
| Clipboard copy | Copying a re-joined segment string | Copy the verbatim key from the library; reuse the StrictMode-safe copy pattern |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Serial WASM calls per edit | Input lag while dragging atoms | `Promise.all([getInchi(true), getInChIKey()])` in one debounce tick | Noticeable during rapid free-draw even with one user |
| Key fetch outside the debounce | Worker flooded on every `change` | Key fetch lives inside the 150 ms `setTimeout`, behind the highlight guard | Immediately, on any continuous drag |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| (Low relevance — static, no backend, no user input beyond the molecule) | n/a | The key is a derived hash of in-browser data; no new attack surface. Do not log keys to any external endpoint. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Key segments look hoverable-into-canvas like InChI layers | Chemists expect atom highlight, get nothing, assume it's broken | Visually/behaviorally distinguish: explanation-only hover cards; copy states "one-way hash, no atom mapping" |
| Showing a stale/blank/garbled key on empty or mid-load canvas | Looks buggy; undermines trust in a teaching tool | Validate full 27-char standard format before rendering; reuse the empty-strip placeholder |
| Implying uniqueness/reversibility | Chemists are the expert audience; overstatement damages credibility | State collisions are improbable-but-real and the key is not decodable without a database |
| No indication the key covers the whole multi-component assembly | Confusion on salts/mixtures (the app's historical weak spot) | Explanation explicitly notes: one key for the entire drawing, no per-fragment keys |

## "Looks Done But Isn't" Checklist

- [ ] **Verbatim passthrough:** displayed text AND copy payload both equal the raw `getInChIKey()` output — verify with a `displayed === raw` test, not eyeballing.
- [ ] **Sync:** key and InChI always describe the same molecule even under rapid edits — verify stale-result generation guard covers the key.
- [ ] **Empty/clear:** clearing the canvas resets the key (no lingering key) — verify it rides the existing empty guard.
- [ ] **Multi-component:** a salt/mixture preset shows one valid standard key and the explanation says so — verify against an INCHI-06-style fixture.
- [ ] **No canvas remount:** the canvas does not reload when the key section mounts — verify WASM init does not re-trigger.
- [ ] **Copy confirmation:** "Copied!" resets after 3 s and survives StrictMode double-mount — verify in dev.
- [ ] **No highlight wiring:** hovering a key segment does NOT light up canvas atoms — verify the segments don't call `setHover`/`setSubHover`.
- [ ] **Segment boundaries:** color spans align exactly with the two hyphens (14/8/3) — verify slice constants with a test.
- [ ] **Flag/version chars:** for preset molecules the flag is `S` and version is `A` — verify with a fixture assertion.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Reconstructed/corrupted key shipped | MEDIUM | Replace render+copy source with raw string; add `displayed === raw` regression test (same fix shape as the InChI passthrough fix) |
| InChI/key desync or stale key | MEDIUM | Move key fetch into `handleChange`; extend `generationRef` post-await check to the key; commit atomically |
| Canvas remount introduced | HIGH | Revert layout change; reinstate `InchiKeySection` as a leaf sibling; confirm `structServiceProvider` stays module-level |
| Copy confirmation stuck (StrictMode) | LOW | Port the `mountedRef` reset-on-mount pattern from `InchiSection`; ideally extract `useCopyButton` |
| False reversibility/atom-map UX | LOW | Remove highlight wiring from key segments; correct explanation prose |

## Pitfall-to-Phase Mapping

Suggested phase shape: **(A) Source & wiring** → **(B) Render & layout** → **(C) Content & explanation**. Mapping below uses these labels.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — Reconstructing key from segments | A (Source) | `displayed === raw` and `copyPayload === raw` unit tests |
| 2 — Derive-from-InChI / standard mismatch | A (Source) | Flag char `S`, version `A` asserted on presets; key sourced only from `getInChIKey()` |
| 3 — Key not in sync (race) | A (Source) | Rapid-edit stale-result test reusing the generation guard |
| 4 — Wrong/empty key on empty/disconnected/multi-component | A (Source) + B (Render) | Empty-canvas reset test; 27-char regex gate before slicing; multi-component fixture |
| 5 — WASM recompute cost | A (Source) | `Promise.all` concurrent fetch; no lag in manual drag test |
| 6 — Canvas remount / break InChI strip | B (Render/layout) | Canvas-never-remounts regression; existing `InchiSection.test.tsx` stays green |
| 7 — Mislabeled segment boundaries/meaning | C (Content) | Slice-boundary + label unit test against verified 14/8/3 layout |
| 8 — Implying reversible/atom-map/collision-proof | C (Content) + B (Render) | Key segments verified to NOT call highlight actions; prose review against FAQ facts |
| 9 — Copy confirmation under StrictMode | B (Render) | StrictMode double-mount test; shared `useCopyButton` hook |
| 10 — Preset-load stale timing | A (Source) | Preset-load path test; no manual key fetch in `handleMolSelectLogic` |

## Sources

- ketcher-core API surface — `node_modules/ketcher-core/dist/application/ketcher.d.ts:51-52` (`getInchi`, `getInChIKey`) and `dist/index.js:58366` / `:59610` (`getInChIKey(struct)` → `structService`); `output_format: ChemicalMimeType.InChIKey`. HIGH.
- ketcher-standalone worker — `node_modules/ketcher-standalone/dist/main.js:38,55,68,761` (`Command.GetInChIKey`, `WorkerEvent.GetInChIKey`, `SupportedFormat.InChIKey`, async `getInChIKey`). Confirms key is a separate WASM command, not derived from InChI. HIGH.
- InChIKey structure / reversibility / collisions — InChI Trust Technical FAQ (https://www.inchi-trust.org/technical-faq/): 27-char `AAAAAAAAAAAAAA-BBBBBBBB-FVP`, one-way hash, real-world collisions. HIGH.
- Existing implementation patterns — `src/App.tsx` (debounce + `generationRef` D-05, `isHighlightingRef`, `isSettingMoleculeRef`, module-level `structServiceProvider` D-13), `src/components/InchiSection.tsx:28-44` (StrictMode `mountedRef` copy pattern WR-02, verbatim slice rendering), `src/store.ts` (store shape), `src/lib/handleMolSelectLogic.ts` (preset-load guard, "no manual getInchi" race warning). HIGH.
- Project history — `.planning/PROJECT.md` Key Decisions (D-13 canvas-never-remount, feedback-as-leaf-sibling, INCHI-06 multi-fragment correctness, getInChIKey open question in v1.3 milestone notes); memory `feedback_inchi_passthrough.md` (no-reconstruct rule). HIGH.

---
*Pitfalls research for: adding live InChIKey display to the InChI explainer*
*Researched: 2026-06-18*
