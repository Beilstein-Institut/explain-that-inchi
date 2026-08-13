---
id: 260813-exd
status: complete
date: 2026-08-13
commits: [bef41cd, 31f8f97, 5b394e2, 4b5f9dc, 338d797, 5f51c00, 8f421ef, a8e6d64, 76fd7bf, 9f7579c, b9a568a, 0943ae8, 6461386, af00049]
---

# Quick Task 260813-exd — Layer chips on the example molecules

Every preset in the picker may now carry one chip naming the InChI layer it is
the example of. Across the list each layer type is claimed **at most once** and
all 11 are claimed, so the chips are a map of the legend: click every chipped
preset and you have walked the whole notation.

## What changed

| Commit | Change |
|--------|--------|
| `bef41cd` | `LAYER_KEY` in `layerInfo.ts` — the short name of each layer (`1S`, `Hill`, `c`, `h`, `q`, `p`, `b`, `t`, `m`, `s`, `i`). `Legend.tsx` derives its key column from it instead of hardcoding the same eleven strings, keeping the `…` suffix, which is presentation and true only in that column. |
| `31f8f97` | `layer?: LayerType` on `MoleculePreset` + the 11 assignments; chip rendered in `KetcherPanel.tsx` tinted `--c-{swatch}` on `--c-{swatch}-bg` via `swatchVar`; `.mol-meta` / `.mol-layer` in `styles.css`. |
| `5b394e2` | Six new measured fixtures + three assertions in `presetLayerCoverage.test.ts`. |

## Assignments

`methane` 1S · `caffeine` Hill · `benzene` c · `ethanol` h · `choline` q ·
`acetate` p · `fumaric` b · `alanine` t · `nicotine` m · `pge2` s ·
`chloroformD` i

Each was chosen for what its InChI actually contains, not by association:

- **methane → version.** `InChI=1S/CH4/h1H4` has no connection layer at all —
  one heavy atom, no bonds. Version is the only thing it can be the example of,
  and it is the shortest InChI in the list, which is what makes it readable.
- **caffeine → formula.** `C8H10N4O2` is verbatim the legend's own formula
  example, so the row and the chip point at the same string.
- **pge2 → s.** It carries b, t and m too, but those are claimed by fumaric,
  alanine and nicotine. The chip names the one layer nothing else in the picker
  shows.
- **fumaric → b, maleic → nothing.** The two differ in one character of their
  InChI and only mean something as a pair, but a second `b` chip would break the
  one-per-layer rule that makes the chips a map. The chip points into the pair.

## What happened after the chips landed

The task did not stop at the chips. In the same session it became a picker cull
and a rewrite of the Limitations dialog, and one false alarm:

- **Presets cut from 33 to 20**, in five rounds: vanillin/metformin/warfarin/
  amoxicillin → acetic/naloxone/acetaminophen/maleic/sildenafil/epinephrine/
  serotonin → dopamine/fluoxetine/atorvastatin/ibuprofen → propranolol/diazepam.
  None was chipped, so all 11 layers stayed reachable throughout — asserted, not
  assumed. Maleic acid needed care: its InChI fixture stayed in
  `presetLayerCoverage` (out of `ALL_FIXTURES`, relabelled) because fumaric and
  maleic are identical up to one sign character, the sharpest available check on
  the b layer's sign. Empty category headings were removed with their last entry.
- **Chipped presets moved to the top in legend order** (version → formula → c →
  h → q → p → b → t → m → s → i), so the head of the picker walks the InChI left
  to right. A new assertion pins it: chips are a prefix, nothing chipped follows,
  sequence matches the legend.
- **Limitations dialog trimmed** to four entries and plainer copy: intro removed,
  closing line cut, `Standard InChI` dropped as a source tag, inorganics
  simplified (ferrocene out, upstream work in), 'The string is not your drawing'
  removed, experimental-polymer aside and the /m /s example dropped. The
  `LIMITATIONS.md` mention became a real link, pinned by a test.
- **A false alarm cost two rounds.** The app failed to mount in the browser
  (`createRoot` twice on `#root`, `RulerArea` throwing on `SVGLength`), and it
  was reported as caused by the chips. I asserted twice that it was not, from
  static evidence — a grep of the diff and a curl of the module graph — neither
  of which can distinguish innocent code from code that breaks the editor at
  runtime. Two hypotheses (stale HMR session, coi-serviceworker) were tested and
  both falsified: the dev server does send COOP/COEP, so the SW never registers.
  The chips were reverted (`4b5f9dc`) and restored (`338d797`) to enable a
  bisect that was never run. **The failure is still undiagnosed.**

## Verification

- `npx tsc --noEmit` clean; `npx vitest run` **596 passed** (38 files).
- `npm run build` clean.
- A render test now exists (`KetcherPanel.chips.test.tsx`): mounts the real
  panel with ketcher-react's `Editor` stubbed and asserts the 11 chips render
  with the right labels, tints and nesting. It was written mid-session, during
  the false alarm — the original data-only tests would have passed with the JSX
  completely broken, which is exactly why the browser report could not be
  answered from the test suite.
- Every chip pinned against an InChI **measured through indigo-ketcher WASM**
  from the SMILES in `molecules.ts` — the six new fixtures were produced the same
  way as the seven from 260811-kvl, never written from memory. The `t`/`m`
  assignments in particular came out of the measurement: alanine and nicotine
  both produce `/t…/m0/s1`, so which one advertises which is an editorial split
  of a shared set, not a property of either molecule alone.
- **Not visually verified in a browser.** No browser exists in this environment.
  The chip's placement in the sidebar row and the mobile pill strip has been
  reasoned about and asserted in jsdom, never seen rendered.

## Open for the operator

1. **The browser mount failure is undiagnosed** (see above). If it persists, it
   needs a real bisect: the chips are on `master`, and the pre-chip tree is
   `4b5f9dc`.
2. **The repo must be made public** or the new `LIMITATIONS.md` link 404s — and
   so does **Send feedback**, which already points at `issues/new` on the same
   private repo and is broken on the live site today. Verified anonymously.
3. `LIMITATIONS.md` still describes ferrocene and the RecMet `/r` layer, which
   the dialog dropped. The doc is now more detailed than the dialog; deliberate
   so far, worth a look if they should match.

## Decisions

- **Chip label = the Legend key**, not the full layer name (too wide for the
  sidebar, pushes the formula around) and not the slash form `/c` (breaks for
  version and formula, which have no prefix).
- **`LAYER_KEY` extracted rather than duplicated.** Eleven short strings is a
  small duplication, but a chip and its legend row naming the same layer
  differently is exactly the kind of drift nobody notices.
- **Chip is decoration on the button, not its own control.** It carries a
  `title` and no click handler — clicking anywhere on the preset already loads
  the molecule, which is what the chip is advertising.
