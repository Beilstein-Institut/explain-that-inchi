# Limitations

What *Explain that InChI* cannot do, and why. Most entries here are not defects
in this tool — they are the capability envelope of the standards and libraries it
sits on top of. Knowing which is which saves a bug report.

Three upstream layers bound everything below:

| Layer | What it decides |
|---|---|
| **Ketcher** (3.17.1) | what can be drawn, and what can be highlighted on the canvas |
| **InChI** (via indigo-ketcher 1.45.0) | which chemistry can be expressed as an identifier at all |
| **Standard vs non-standard InChI** | which layers of that identifier this tool ever sees |

---

## Bound by InChI's coverage

### Inorganics and organometallics — not supported yet

InChI disconnects metal–ligand bonds, so coordination compounds and
organometallics are represented as separate fragments rather than as one
entity. Cisplatin becomes `2ClH.2H3N.Pt` with the charge pushed into
`/q;;;;+2/p-2` — a valid InChI that says very little about the compound.

**This is being worked on upstream.** Integrating inorganics into InChI is
planned; version 1.06, which this tool uses, does not support it yet. So the
limitation is a matter of timing rather than a permanent boundary — expect it to
improve as the standard does, and expect this tool to inherit that improvement
only after indigo → ketcher-standalone → this app is upgraded.

In the meantime, the reconnected-metal layer that partly addresses it (`/r`, the
RecMet option) is **non-standard** InChI, and this tool only produces standard
InChI, so it is out of reach. Ferrocene and its relatives will not explain
usefully.

### Reactions — no RInChI

Reaction InChI is a separate IUPAC standard with its own structure (reactant /
product / agent groups, and its own key). It is not implemented here.

Ketcher will let you draw a reaction with arrows and agents; there is no InChI
for what you drew, so the tool reports an error rather than an identifier.

### Mixtures and formulations — no MInChI

Mixture InChI is still a draft standard. Solvates, salts as formulated,
component ratios and concentrations are outside the model. A two-component
structure gets a multi-component InChI (`.`-separated), which is not the same
thing as a described mixture.

### Polymers — behind a non-standard flag

The bundled InChI library does carry experimental polymer support — its option
list includes `Polymers`, `Polymers105`, `FoldCRU`, `NoFrameShift` and a full
copolymer vocabulary. All of it is non-standard InChI, and `getInchi()` returns
standard InChI, so a repeat unit or SRU drawn in Ketcher cannot be expressed.

### Generic and Markush structures — no InChI at all

R-groups, variable attachment points and atom lists describe a *set* of
compounds. A set has no InChI by definition.

### Very large molecules — capped

The bundled library exposes `LargeMolecules` ("treat molecules up to 32766
atoms (experimental)"). The existence of that opt-in is what tells you the
default path is capped well below it. Non-standard again, so unavailable here.

### Tautomers — only partly canonicalized

The mobile-H notation covers common cases. It does not guarantee that two
tautomers of one compound produce one InChI. The tool can explain the notation
faithfully; it cannot show you the ambiguity behind it.

### Some stereochemistry classes are not encoded

The stereo layers cover sp³ centres (`/t`, `/m`, `/s`) and double-bond geometry
(`/b`). Atropisomerism and axial or planar chirality are, to our reading, not
captured. Verify against the InChI technical manual before relying on this
entry — it is the least certain item on this page.

---

## Bound by the standard / non-standard split

This tool shows **standard InChI only**. Every non-standard variant is therefore
invisible, including the two that would answer the most common confusions:

- **`/f` (FixedH)** — the tautomer-explicit view, the direct answer to "why do
  these two structures give the same string?"
- **`/r` (RecMet)** — metal-reconnected, the direct answer to the organometallics
  entry above.
- `SaveOpt` and the stereo-perception options.

The version layer will consequently always read `1S`.

**The InChI version is inherited, not chosen.** Whatever InChI release the
bundled indigo `1.45.0` wraps is what you get. Capabilities added upstream
arrive only when indigo → ketcher-standalone → this app is upgraded, and the
three ketcher packages must move together.

### The string is not your drawing

Standard InChI normalizes, so it genuinely does not say what you drew:

- Draw acetate (CH₃COO⁻) and the formula layer reads `C2H4O2` — the neutral
  parent — with the charge moved into `/p-1`.
- Aromatic bonds are normalized; explicit vs implicit hydrogens are reconciled.

Both are correct InChI. This tool explains the string it is given, so it will
faithfully explain something that looks wrong.

---

## Bound by Ketcher

### The editor defines what can be drawn

Anything Ketcher cannot represent never reaches the InChI engine. Conversely,
Ketcher's macromolecules / sequence mode (HELM-style peptides and nucleotides) is
chemistry the small-molecule editor this app mounts cannot reach at all.

### Highlighting can only tint atoms and bonds

Ketcher's highlight API takes atom IDs and bond IDs. Anything a layer describes
that is not an atom or a bond has no honest representation on the canvas:

- **Implicit hydrogens have no atom to tint.** `h1H` says atom 1 carries one H;
  if you did not draw that H, no object exists for it. The app highlights the
  heavy atom and adds its own badge overlay.
- **Whole-molecule flags cannot be pointed at.** `/m1` and `/s1` are properties
  of the structure, not of any atom. The app borrows the `/t` layer's
  stereocentres — a deliberate approximation, not a mapping.
- **The version layer and the InChIKey are unhighlightable in principle.** `1S`
  names nothing, and the key is a one-way hash.

### Ketcher's data model differs from InChI's in small ways

Each difference is a silent wrong answer until someone looks. A worked example:
Ketcher labels deuterium `D`, not `H` with an isotope field, so a pool of
"explicit hydrogens" collected as `label === 'H'` silently excluded every
deuterium — affecting the isotope highlight, the formula `H` hover and the
hydrogen badge counts at once. Fixed; the shape of the problem recurs.

### The badge overlay writes into Ketcher's SVG

`renderHBadges` / `cleanHBadges` reach into Ketcher's render root, which is a
private detail. A Ketcher upgrade that changes that DOM breaks the badges
silently — the highlights would keep working, so nothing would look wrong.

---

## Bound by the canonical ↔ canvas mapping

Every highlight depends on `AuxInfo` to map InChI's canonical numbers onto
Ketcher's pool IDs, and that mapping degrades quietly. `remapAuxToPoolIds`
matches atoms by coordinate within `EPSILON = 0.05`, falling back to molfile rank
order. Rank order diverges from pool-ID order in multi-component structures —
which is exactly why the coordinate match exists. When it misses you get a
*wrong* highlight rather than none, and nothing announces it.

`formulaFragmentCounts` counts heavy atoms only, so a multi-fragment structure
whose **non-final** fragment carries bridging hydrogens gets short canonical
offsets. Marked in the source with its upgrade path.

### Known parser gap: isotopic sublayers

`/i` heads a block that may contain its own `/h`, `/t`, `/m`, `/s`, `/b`
sublayers. The parser types each `/`-separated part by its first character, so
heavy water (`InChI=1S/H2O/h1H2/i/hD2`) yields **two `h` layers** — the second
being the isotopic sublayer wearing the main hydrogen layer's identity. Not
reachable from the presets; a user can draw it.

---

## Bound by the InChIKey being a hash

One-way by construction. There is no key → structure lookup without an external
registry, and no atoms to highlight when hovering a key segment — which is why
those segments are deliberately inert. Collisions are astronomically unlikely
but not impossible: the key is a truncated hash, not an identifier with a
uniqueness guarantee.

---

## Bound by running entirely in the browser

- **COOP/COEP headers are mandatory.** InChI runs in WASM and needs
  `SharedArrayBuffer`. No headers, no InChI at all. Every nginx `location` block
  must repeat them — `add_header` does not inherit. The vendored
  `coi-serviceworker` is the fallback for hosts that cannot set them.
- **No backend**, so no server-side rendering, no shareable permalink for a
  structure, and the WASM bundle downloads before the first InChI appears.

---

## Not a limitation, a gap: no InChI input

There is no way to paste an InChI into the tool — the only route in is drawing
the molecule. The capability is already in the shipped bundle: converting
`InChI=1S/CHCl3/c2-1(3)4/h1H/i1D` back to a structure round-trips correctly,
deuterium included. It is simply not exposed.
