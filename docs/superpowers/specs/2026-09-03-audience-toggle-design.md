# Audience toggle + glossary — design

Date: 2026-09-03. Branch: `feat/audience-toggle` (off `dev`).

## Goal

Let a visitor switch every explanation in the app between two registers:

- **Chemist** — terminology aligned with the IUPAC Blue Book (2013
  Recommendations, https://iupac.qmul.ac.uk/BlueBook/PDF/). Default.
- **Plain language** — for a reader with no chemistry background.

Independently of the register, chemistry terms inside any card text are
highlighted; clicking one opens a short plain-language definition.

## Non-goals

- Naming the molecule (no IUPAC name generation).
- Persisting the choice in browser storage. `leaveWipe.ts` clears every store
  on `pagehide` and privacy policy §3 promises nothing persists. The URL
  carries the choice instead.
- Translating the literal "Reads as" line (`readingFor`). It is the same in
  both registers.
- Changing highlight behaviour, the store gating (`pinned`), or Invariant #2
  (InChIKey never drives canvas highlights).

## 1. State

`src/store.ts` gains:

```ts
export type Audience = 'chemist' | 'plain';
audience: Audience;              // default 'chemist'
setAudience: (a: Audience) => void;
```

Initial value comes from `new URLSearchParams(location.search).get('mode')`:
`'plain'` selects plain language; anything else is chemist. `setAudience`
writes `?mode=plain` via `history.replaceState`, and removes the parameter
when switching back to chemist (chemist is the default, so the canonical URL
has no parameter). One small module `src/lib/audienceUrl.ts` owns
read/write so store and tests do not touch `window` directly.

`resetAll` and `setInchiFailure` do **not** touch `audience`. It is a
preference, not molecule data.

## 2. Toggle UI

`Header.tsx`: a segmented control in the right-hand `.meta` block, under the
existing two lines.

```
 Explain that InChI            InChI v1.06 · standard
                               International Chemical Identifier
                               [ Chemist ] [ Plain language ]
```

- `<div role="radiogroup" aria-label="Explanation style">` holding two
  `<button role="radio" aria-checked>`.
- Styling in `styles.css` next to `.header .meta`, using existing tokens
  (`--ink`, `--ink-faint`, `--line`, mono label style). No new tokens.
- Clicking dispatches `setAudience`. No other side effects.

## 3. Copy model

Every switching string becomes a pair at its current site:

```ts
export type Copy = Record<Audience, string>;
```

A helper `pick(copy: Copy, audience: Audience): string` lives in
`src/lib/audience.ts` (pure, no React). Sites and what changes:

| Site | File | Fields that become `Copy` |
|---|---|---|
| Layer cards | `lib/layerInfo.ts` `LAYER_INFO` | `title`, `blurb` |
| Idle / empty card | `lib/layerInfo.ts` `DEFAULT_INFO`, `EMPTY_INFO` | `title`, `blurb` |
| Sub-token cards | `lib/subTokenInfo.ts` | `subTokenInfo(sub, atomElements, audience)` returns already-picked `{title, body}`. Templates hold both registers inline. |
| InChIKey cards | `lib/inchiKeyInfo.ts` `KEY_ZONE_COPY` | `title`, `body` (`label` unchanged — it is a data-attribute hook) |
| Help tour | `components/HelpTour.tsx` `STEPS` | `title`, `body` |
| Legend | `components/Legend.tsx` `LEGEND` | `name`, `desc` |

`egLabel` ("Reads as") and `eg` stay single strings. `accent`, `selector`,
`type`, `label` are untouched.

Components read `audience` from the store and call `pick` at render. No
component stores copy in local state.

### Register rules

**Chemist.** Terms follow the Blue Book where it has a term, cited in a
source comment per entry:

| Concept | Blue Book anchor |
|---|---|
| stereogenic unit, chirality centre, chirality (nonsuperposable mirror image) | P-92.1.1 |
| stereodescriptor; R/S, r/s, M/P, seqCis/seqTrans | P-91.2.1.1 |
| absolute configuration | P-93.1.1 |
| relative configuration, `rel`; racemate, `rac` | P-93.1.2, P-91.2.1.1 |
| E/Z, cis/trans on double bonds | P-93.4.2.1.1 |
| CIP priority / Sequence Rules | P-92 |
| isotopically modified / substituted compound; nuclide symbol | P-81.5, P-82, P-81.1 |
| hydron / proton / deuteron; protium / deuterium / tritium | P-81.3 Table 8.1 |
| anion, cation, zwitterion; ionic centre | P-72, P-73, P-74 |

Where the Blue Book is silent (connection table, canonical numbering, mobile
hydrogen, Hill order, InChIKey hashing) the entry uses the IUPAC Gold Book
term when one exists (e.g. *tautomer*, *molecular formula*) and says
`// Gold Book: <term>` or `// InChI-specific: no IUPAC nomenclature term`
in the comment. The InChI Technical Manual is a cross-check only; a claim
sourced from it must agree with the Blue Book, or the Blue Book wins.

Existing accuracy caveats survive verbatim in meaning: `t` parity is not
R/S; `b` parity is not E/Z; H-count implies nothing about functional group;
mobile H group is discrete atoms.

**Plain language.** No symbols the reader has not been shown, no element
jargon beyond "atom", "bond", "hydrogen", "carbon". Every sentence ≤ 20
words. Analogies allowed if literally true. Same factual claims as the
chemist register, restated — never fewer caveats. Atom numbers stay: they
are what the highlight points at.

Both registers for one entry are adjacent in source so a change to one is
reviewed against the other.

## 4. Glossary

`src/lib/glossary.ts`:

```ts
export const GLOSSARY: Record<string, string> = {
  'stereocenter': '…',   // key = display term, value = plain definition
  …
};
```

About 25 terms, plain-language definitions only (one register), each ≤ 2
sentences. Initial list: atom, bond, heavy atom, hydrogen, molecular
formula, Hill order, canonical numbering, connection table, branch,
valence, formal charge, proton, hydron, tautomer, mobile hydrogen,
stereocenter, stereogenic unit, chirality, enantiomer, mirror image,
parity, CIP / R and S, E/Z, racemic, absolute configuration, relative
configuration, isotope, deuterium, hash, InChIKey.

Matcher (`markTerms(text): Segment[]`, pure):

- Case-insensitive, whole-word (`\b`), longest term first.
- Marks the **first** occurrence of each term per text; later ones stay
  plain.
- Terms may include a space or hyphen ("mobile hydrogen", "heavy atom").
- Returns `{ text }` and `{ term, text }` segments; no HTML.

Component `<Prose text={string} />` (`src/components/Prose.tsx`):

- Renders segments; a term segment is
  `<button type="button" class="term" aria-expanded>`, dotted underline.
- Click toggles a popover `<span role="tooltip">` positioned below the
  button. One open at a time per `Prose` instance. Esc or click outside
  closes. Focus stays on the button.
- Definitions are rendered as plain text (no nested marking).
- CSS module `Prose.module.css`; reuses `--ink`, `--paper`, `--line`
  tokens; `z-index` above the card only.

Used at: all five card branches in `Explanation.tsx` (replacing the
`<p>{…}</p>` bodies), tour step bodies in `HelpTour.tsx`, legend `desc`.
Titles are **not** marked. The `dangerouslySetInnerHTML` "Reads as" block
is untouched.

## 5. Data flow

```
 URL ?mode ──► audienceUrl.read() ──► store.audience ◄── Header toggle
                                          │                    │
                                          │                    └─► audienceUrl.write()
                                          ▼
       pick(copy, audience) in Explanation / HelpTour / Legend / subTokenInfo
                                          │
                                          ▼
                              <Prose text> ──► markTerms ──► term buttons ──► popover
```

## 6. Error handling

- Unknown `?mode` value → chemist, parameter left as is.
- `history.replaceState` throwing (sandboxed iframe) → caught, state still
  updates.
- A copy entry missing a register is a type error at compile time
  (`Record<Audience, string>`), not a runtime fallback.

## 7. Testing

Vitest + jsdom, existing setup.

- `audience.test.ts`: `pick` returns the right register; `audienceUrl`
  read/write round-trips and strips the default.
- `glossary.test.ts`: every key is non-empty and unique
  case-insensitively; `markTerms` — longest match wins, whole words only
  ("atoms" does not match inside "diatoms"), first occurrence only, text
  without terms returns one segment, output concatenates back to input.
- `copyTables.test.ts`: for every `Copy` in LAYER_INFO, DEFAULT/EMPTY,
  KEY_ZONE_COPY, STEPS, LEGEND: both registers present, non-empty,
  different; plain register contains none of a banned-jargon list
  (`sp³`, `parity`, `stereodescriptor`, `canonical`, `Hill`, `CIP`).
- `subTokenInfo.test.ts`: extend existing cases with `audience: 'plain'`;
  atom numbers and caveats present in both.
- `Explanation.test.tsx`: card body switches when `setAudience` fires;
  title switches; "Reads as" HTML identical across registers.
- `Header.test.tsx`: two radios, `aria-checked` follows store, click
  dispatches.
- `Prose.test.tsx`: renders button per marked term, click opens tooltip
  with definition, Esc closes, second click closes, only one open.
- `HelpTour.test.tsx`, `Legend` tests: existing assertions read titles via
  `pick(..., 'chemist')` instead of raw strings.
- Existing 731 tests stay green.

## 8. Files

New: `lib/audience.ts`, `lib/audienceUrl.ts`, `lib/glossary.ts`,
`components/Prose.tsx`, `components/Prose.module.css`, tests above.

Modified: `store.ts`, `Header.tsx`, `styles.css`, `layerInfo.ts`,
`subTokenInfo.ts`, `inchiKeyInfo.ts`, `HelpTour.tsx`, `Legend.tsx`,
`Explanation.tsx`, existing tests that assert raw copy strings.

## 9. Implementation notes

- Copy writing is the bulk of the work and is chemistry-reviewed: each
  chemist entry cites its Blue Book anchor; the plan includes a human
  verify gate for copy before merge (lesson from Phase 15 — do not skip).
- Implementation lane: Opus subagents per task; final review by
  fable-advisor before reporting done.

## Amendment 2026-09-03 (during implementation)

User request: the toggle sits on the section-label row, immediately left of
the Help button, styled like the Reset / Help pills, with labels **Expert**
and **Simple**. This replaces §2 (header placement, "Chemist" / "Plain
language" labels). The header returns to its original two meta lines.

Unchanged: mode ids `chemist` / `plain`, the store field, `?mode=plain`,
the radiogroup semantics, and every copy table. Tour step 9 now introduces
the toggle alongside Reset and Help.

## Amendment 2 (2026-09-03)

User request: the glossary definition is a floating tooltip over the clicked
word, not an in-flow block. Implemented as a `position: fixed` element
portaled to `document.body` (immune to the card's `overflow: hidden`),
centred on the word, above it by default and below when there is no headroom.
Scroll or resize closes it. Same open/close semantics otherwise (§4).
