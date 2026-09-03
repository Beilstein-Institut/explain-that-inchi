# Audience Toggle + Glossary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A header toggle switches every explanation between a Blue-Book-aligned chemist register and a plain-language register; chemistry terms in card text are clickable and show a definition.

**Architecture:** One store field `audience` (read from `?mode=plain`, written back with `replaceState`). Every switching string becomes a `{ chemist, plain }` pair at its current site, resolved at render with `pick()`. A pure `markTerms()` splits card text on glossary terms; a `<Prose>` component renders the segments with clickable term buttons and an inline definition block.

**Tech Stack:** Vite, React 18, TypeScript, Zustand 5, Vitest 3 + happy-dom + @testing-library/react, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-09-03-audience-toggle-design.md`

**Spec deviation (decided here):** `Explanation.module.css` `.card` has `overflow: hidden`, so a floating popover would be clipped. The definition renders as an inline block directly under the paragraph inside the card instead of floating. Same trigger (click), same close paths (second click, Esc, outside click), no positioning code.

## Global Constraints

- Mode ids are exactly `'chemist'` and `'plain'`; UI labels are exactly `Chemist` and `Plain language`; URL parameter is `mode`, value `plain`; chemist has no parameter.
- Nothing is written to localStorage / sessionStorage / IndexedDB (privacy policy §3; `leaveWipe.ts`).
- The "Reads as" line (`readingFor`) and `egLabel`/`eg` stay single strings, identical in both registers.
- Verbatim passthrough (Invariant #1, project memory): never reconstruct InChI text from parsed fields.
- Invariant #2: InChIKey cards never drive canvas highlights.
- Chemist register: every entry cites its Blue Book anchor in a source comment, or says `// Gold Book: <term>` / `// InChI-specific: no IUPAC nomenclature term`.
- Plain register: no `sp³`, `parity`, `stereodescriptor`, `canonical`, `Hill`, `CIP`, `ligand`, `tautomer`, `enantiomer`; sentences ≤ 20 words; same caveats as the chemist text; atom numbers kept.
- Both registers for one entry sit adjacent in source.
- Real InChI fixtures only in tests (project memory); the fixtures already in the test files are reused.
- Coding conventions from `~/.claude/CLAUDE.md`: braces on every `if`, early return, no magic strings (extract constants), minimal diff, don't touch unrelated blocks.
- Commit after every task. Subject ≤ 50 chars, imperative, no trailing period.
- Run `npm test -- --run` (all), `npx tsc -b`, `npm run lint` before claiming a task done.

---

### Task 1: Audience type, URL sync, store field

**Files:**
- Create: `src/lib/audience.ts`
- Create: `src/lib/audienceUrl.ts`
- Create: `src/lib/__tests__/audience.test.ts`
- Create: `src/lib/__tests__/audienceUrl.test.ts`
- Modify: `src/store.ts`
- Modify: `src/__tests__/store.test.ts`

**Interfaces:**
- Produces: `type Audience = 'chemist' | 'plain'`, `type Copy = Record<Audience, string>`, `pick(copy: Copy, audience: Audience): string`, `DEFAULT_AUDIENCE`, `readAudience(): Audience`, `writeAudience(a: Audience): void`, store `audience: Audience`, `setAudience(a: Audience): void`.

- [ ] **Step 1: Write failing tests**

`src/lib/__tests__/audience.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pick, DEFAULT_AUDIENCE } from '../audience';
import type { Copy } from '../audience';

const COPY: Copy = { chemist: 'stereogenic unit', plain: 'handed atom' };

describe('pick', () => {
  it('returns the chemist register', () => {
    expect(pick(COPY, 'chemist')).toBe('stereogenic unit');
  });
  it('returns the plain register', () => {
    expect(pick(COPY, 'plain')).toBe('handed atom');
  });
  it('default audience is chemist', () => {
    expect(DEFAULT_AUDIENCE).toBe('chemist');
  });
});
```

`src/lib/__tests__/audienceUrl.test.ts` (node env: `window` is undefined here, so the guard path is what gets tested; the happy-dom path is covered in Task 2's Header test):
```ts
import { describe, it, expect } from 'vitest';
import { readAudience, writeAudience } from '../audienceUrl';

describe('audienceUrl without a window', () => {
  it('reads chemist when there is no window', () => {
    expect(readAudience()).toBe('chemist');
  });
  it('write is a no-op without a window', () => {
    expect(() => writeAudience('plain')).not.toThrow();
  });
});
```

Add to `src/__tests__/store.test.ts` inside the top-level describe:
```ts
  describe('audience', () => {
    it('defaults to chemist', () => {
      expect(useInchiStore.getState().audience).toBe('chemist');
    });
    it('setAudience switches and resetAll leaves it alone', () => {
      useInchiStore.getState().setAudience('plain');
      useInchiStore.getState().resetAll();
      expect(useInchiStore.getState().audience).toBe('plain');
      useInchiStore.getState().setAudience('chemist');
    });
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/lib/__tests__/audience.test.ts src/lib/__tests__/audienceUrl.test.ts src/__tests__/store.test.ts`
Expected: FAIL — cannot resolve `../audience`, `../audienceUrl`; `audience` undefined on state.

- [ ] **Step 3: Implement**

`src/lib/audience.ts`:
```ts
// Two explanation registers. Every user-facing string that differs between
// them is stored as a Copy pair at its own site and resolved with pick().
export type Audience = 'chemist' | 'plain';
export type Copy = Record<Audience, string>;

export const DEFAULT_AUDIENCE: Audience = 'chemist';

export function pick(copy: Copy, audience: Audience): string {
  return copy[audience];
}
```

`src/lib/audienceUrl.ts`:
```ts
// The chosen register lives in the URL (?mode=plain), never in browser storage:
// leaveWipe.ts clears every store on pagehide and privacy policy §3 promises
// nothing persists. Chemist is the default and has no parameter.
import { DEFAULT_AUDIENCE } from './audience';
import type { Audience } from './audience';

const PARAM = 'mode';
const PLAIN = 'plain';

export function readAudience(): Audience {
  if (typeof window === 'undefined') {
    return DEFAULT_AUDIENCE;
  }
  const mode = new URLSearchParams(window.location.search).get(PARAM);
  return mode === PLAIN ? 'plain' : DEFAULT_AUDIENCE;
}

export function writeAudience(audience: Audience): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const url = new URL(window.location.href);
    if (audience === 'plain') {
      url.searchParams.set(PARAM, PLAIN);
    } else {
      url.searchParams.delete(PARAM);
    }
    window.history.replaceState(null, '', url);
  } catch {
    // Sandboxed frame: the state still switches, only the URL is not updated.
  }
}
```

`src/store.ts` — add imports:
```ts
import type { Audience } from './lib/audience';
import { readAudience, writeAudience } from './lib/audienceUrl';
```
Add to `InchiState` after `inchiError: string | null;`:
```ts
  // Explanation register. A preference, not molecule data: resetAll and
  // setInchiFailure leave it alone. Mirrored to ?mode= by setAudience.
  audience: Audience;
```
and after `resetAll: () => void;`:
```ts
  setAudience: (audience: Audience) => void;
```
In the initialiser, after `inchiError: null,` (the first one, in the initial state):
```ts
      audience: readAudience(),
```
and after `setLegendHover: ...`:
```ts
      setAudience: (audience) => { writeAudience(audience); set({ audience }); },
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/lib/__tests__/audience.test.ts src/lib/__tests__/audienceUrl.test.ts src/__tests__/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audience.ts src/lib/audienceUrl.ts src/lib/__tests__/audience.test.ts src/lib/__tests__/audienceUrl.test.ts src/store.ts src/__tests__/store.test.ts
git commit -m "Add audience register to the store, synced to ?mode"
```

---

### Task 2: Header toggle

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/styles.css` (after the `.header .meta b` rule)
- Create: `src/components/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: store `audience`, `setAudience` (Task 1).

- [ ] **Step 1: Write failing test**

`src/components/__tests__/Header.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { useInchiStore } from '../../store';

describe('Header audience toggle', () => {
  beforeEach(() => {
    useInchiStore.getState().setAudience('chemist');
  });

  it('renders a radiogroup with Chemist checked by default', () => {
    render(<Header />);
    const group = screen.getByRole('radiogroup', { name: 'Explanation style' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Chemist' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Plain language' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking Plain language switches the store and the URL', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Plain language' }));
    expect(useInchiStore.getState().audience).toBe('plain');
    expect(screen.getByRole('radio', { name: 'Plain language' })).toHaveAttribute('aria-checked', 'true');
    expect(window.location.search).toContain('mode=plain');
  });

  it('clicking Chemist removes the URL parameter', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Plain language' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Chemist' }));
    expect(useInchiStore.getState().audience).toBe('chemist');
    expect(window.location.search).not.toContain('mode=');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/components/__tests__/Header.test.tsx`
Expected: FAIL — no radiogroup.

- [ ] **Step 3: Implement**

`src/components/Header.tsx`:
```tsx
import { useInchiStore } from '../store';
import type { Audience } from '../lib/audience';

// Order = display order. Labels are the spec's exact words.
const MODES: { id: Audience; label: string }[] = [
  { id: 'chemist', label: 'Chemist' },
  { id: 'plain', label: 'Plain language' },
];

export function Header() {
  const audience = useInchiStore(state => state.audience);
  const setAudience = useInchiStore(state => state.setAudience);

  return (
    <header className="header">
      <h1>
        Explain that <em>InChI</em>
      </h1>
      <div className="meta">
        <div>InChI v<b>1.06</b> · standard</div>
        <div><a href="https://www.inchi-trust.org/" target="_blank" rel="noopener noreferrer">International Chemical Identifier</a></div>
        {/* Register switch. Radios, not a checkbox: both options are always
            visible and neither is "off". */}
        <div className="audience" role="radiogroup" aria-label="Explanation style">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={audience === m.id}
              onClick={() => setAudience(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
```

`src/styles.css` — insert after the `.header .meta b { ... }` rule:
```css
/* Register switch under the header meta. Inherits the mono micro style of
   .meta; the checked option is drawn in ink, the other stays faint. */
.header .audience {
  display: inline-flex;
  margin-top: 4px;
  border: 1px solid var(--line-control);
  border-radius: 4px;
  overflow: hidden;
}
.header .audience button {
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: var(--ink-faint);
  background: transparent;
  border: 0;
  padding: 2px 10px;
  cursor: pointer;
  min-height: 24px;
}
.header .audience button + button {
  border-left: 1px solid var(--line-control);
}
.header .audience button[aria-checked="true"] {
  color: var(--ink-inverse);
  background: var(--ink);
  cursor: default;
}
.header .audience button:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: -2px;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/components/__tests__/Header.test.tsx`
Expected: PASS. Also run `npm test -- --run src/__tests__/touchTargets.test.ts` — if it scans header buttons for a 32px minimum, raise `min-height` to 32px and `padding` to `0 10px`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/styles.css src/components/__tests__/Header.test.tsx
git commit -m "Add Chemist / Plain language toggle to header"
```

---

### Task 3: Layer card copy in both registers

**Files:**
- Modify: `src/lib/layerInfo.ts` (`LayerInfoEntry`, `LAYER_INFO`, `DEFAULT_INFO`, `EMPTY_INFO`)
- Modify: `src/components/Explanation.tsx`
- Modify: `src/components/KetcherPanel.tsx:117`
- Modify: `src/lib/__tests__/layerInfo.test.ts`
- Modify: `src/components/__tests__/Explanation.test.tsx`

**Interfaces:**
- Consumes: `Copy`, `pick`, `Audience` (Task 1).
- Produces: `LayerInfoEntry.title: Copy`, `LayerInfoEntry.blurb: Copy`; `DEFAULT_INFO`/`EMPTY_INFO` `{ title: Copy; blurb: Copy; accent: string }`.

- [ ] **Step 1: Update tests to the Copy shape (they fail until Step 3)**

`src/lib/__tests__/layerInfo.test.ts` — change the `LAYER_INFO` and `DEFAULT_INFO` blocks (around lines 190–202) to:
```ts
describe('LAYER_INFO', () => {
  it('has an entry for every layer type with both registers', () => {
    for (const key of Object.keys(LAYER_INFO)) {
      const e = LAYER_INFO[key as keyof typeof LAYER_INFO];
      expect(e.title.chemist).toBeTruthy();
      expect(e.title.plain).toBeTruthy();
      expect(e.blurb.chemist.length).toBeGreaterThan(10);
      expect(e.blurb.plain.length).toBeGreaterThan(10);
      expect(e.blurb.plain).not.toBe(e.blurb.chemist);
    }
  });
});

describe('DEFAULT_INFO', () => {
  it('has title "Hover any layer"', () => expect(DEFAULT_INFO.title.chemist).toBe('Hover any layer'));
  it('has non-empty blurbs', () => {
    expect(DEFAULT_INFO.blurb.chemist.length).toBeGreaterThan(10);
    expect(DEFAULT_INFO.blurb.plain.length).toBeGreaterThan(10);
  });
});
```
Keep whatever else those describes held; only the field accesses change.

`src/components/__tests__/Explanation.test.tsx`:
- add `audience: 'chemist' | 'plain';` to the `mock` type and `audience: 'chemist'` to its initial object;
- in the `storeState()` factory add `audience: m.audience ?? 'chemist',` and `setAudience: vi.fn(),`;
- in `beforeEach` add `mock.audience = 'chemist';`;
- lines 225–226 and 232: `EMPTY_INFO.title` → `EMPTY_INFO.title.chemist`, `EMPTY_INFO.blurb` → `EMPTY_INFO.blurb.chemist`, `DEFAULT_INFO.title` → `DEFAULT_INFO.title.chemist`;
- add a new test at the end:
```tsx
  it('plain audience swaps the layer card title and blurb', () => {
    mock.audience = 'plain';
    mock.hoverIdx = FORMULA_IDX;
    render(<Explanation />);
    expect(screen.getByText(LAYER_INFO.formula.title.plain)).toBeInTheDocument();
    expect(screen.queryByText(LAYER_INFO.formula.title.chemist)).toBeNull();
  });
```
and import `LAYER_INFO` from `'../../lib/layerInfo'`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/lib/__tests__/layerInfo.test.ts src/components/__tests__/Explanation.test.tsx`
Expected: FAIL — `.chemist` undefined on strings.

- [ ] **Step 3: Rewrite `LAYER_INFO`, `DEFAULT_INFO`, `EMPTY_INFO`**

In `src/lib/layerInfo.ts` add `import type { Copy } from './audience';` and replace the interface and the three constants with:

```ts
export interface LayerInfoEntry {
  title: Copy;
  accent: string;
  blurb: Copy;
  egLabel: string;
  eg?: string;
}

// Chemist register cites the IUPAC Blue Book (2013) section that owns the term;
// where the Blue Book has none the comment names the Gold Book term or says the
// concept is InChI-specific. Plain register: same claims, no jargon.
export const LAYER_INFO: Record<LayerType, LayerInfoEntry> = {
  version: {
    // InChI-specific: no IUPAC nomenclature term.
    title: { chemist: 'Version', plain: 'Version' },
    accent: 'var(--c-version)',
    blurb: {
      chemist:
        "Identifies the InChI version. '1' is version 1; the trailing 'S' marks the Standard InChI — the fixed option set most databases store.",
      plain:
        "Which edition of the InChI rules made this text. The 1 is the version. The S means the standard settings were used, which is what most databases store.",
    },
    egLabel: 'Reads as',
    eg: 'version <b>1</b>, <b>S</b>tandard',
  },
  formula: {
    // Gold Book: molecular formula. Hill order is a CAS convention, not IUPAC.
    title: { chemist: 'Molecular formula', plain: 'What it is made of' },
    accent: 'var(--c-formula)',
    blurb: {
      chemist:
        'The molecular formula of every atom, hydrogen included, in Hill order: carbon first, then hydrogen, then the remaining elements alphabetically. It states what the molecule contains before any structure is described.',
      plain:
        'A list of the atoms in the molecule. Each capital letter, or letter pair, is one element, such as C for carbon. The number after it says how many of that atom there are. No number means one.',
    },
    egLabel: 'Reads as',
  },
  c: {
    // InChI-specific: canonical numbering and the connection layer have no
    // nomenclature counterpart. Gold Book: connectivity.
    title: { chemist: 'Connection layer', plain: 'How the atoms are joined' },
    accent: 'var(--c-conn)',
    blurb: {
      chemist:
        'The connectivity of the non-hydrogen atoms, using canonical atom numbers. Hyphens represent bonds; parentheses open and close branches. Hydrogens are normally left out here and counted in the h-layer instead — the exception is a hydrogen bonded to two atoms at once, such as the bridging H of a borane: it cannot be written as a per-atom count, so it gets its own canonical number and appears in this layer.',
      plain:
        'Every atom except hydrogen gets a number. This layer lists which numbered atoms are joined. A dash is a bond. Brackets mark a side branch. Hover a number to light up that atom in the drawing.',
    },
    egLabel: 'Reads as',
  },
  h: {
    // Gold Book: tautomerism. InChI-specific: the per-atom H count.
    title: { chemist: 'Hydrogen layer', plain: 'Where the hydrogens are' },
    accent: 'var(--c-hydro)',
    blurb: {
      chemist:
        "Where the hydrogens left out of the connection layer are recorded — as a count stored per atom, not something you deduce from valence. '1H3' means atom 1 carries three H. Ranges like '1-6H' indicate that atoms 1-6 each carry one H. Parenthesised groups like '(H,3,4)' are mobile hydrogens: tautomerism lets them sit on any of the listed atoms, so InChI records them as shared. Hydrogens you have not drawn are shown as badges on the canvas when you hover this layer.",
      plain:
        "Hydrogen atoms are not in the layer above, so this layer counts them. '1H3' means atom 1 has three hydrogens. '1-6H' means atoms 1 to 6 have one each. A group in brackets like '(H,3,4)' is a hydrogen that can move between the listed atoms. Hover to see them as badges on the drawing.",
    },
    egLabel: 'Reads as',
  },
  q: {
    // Blue Book P-72 anions, P-73 cations, P-74 zwitterions.
    title: { chemist: 'Net charge', plain: 'Overall charge' },
    accent: 'var(--c-charge)',
    blurb: {
      chemist:
        'The net charge of the species — the sum of all formal charges, as carried by an anion, cation or zwitterion. Absent when the species is neutral.',
      plain:
        'Molecules can carry an electric charge, positive or negative. This layer gives the total. It is left out when the molecule is neutral, which is the usual case.',
    },
    egLabel: 'Reads as',
  },
  p: {
    // Blue Book P-81.3 Table 8.1: 'hydron' is the generic H⁺; 'proton' is ¹H⁺.
    title: { chemist: 'Proton balance', plain: 'Hydrogen ions gained or lost' },
    accent: 'var(--c-proton)',
    blurb: {
      chemist:
        "Hydrons (H⁺) added to or removed from the neutral form: 'p+1' is one added, 'p-1' one removed. A protonated or deprotonated species thereby shares every other layer with its neutral parent.",
      plain:
        "Some molecules have gained or lost a hydrogen ion, which gives them a charge. This layer says how many. 'p+1' means one gained, 'p-1' means one lost. Everything else is written as if the molecule were neutral.",
    },
    egLabel: 'Reads as',
  },
  b: {
    // Blue Book P-93.4.2.1.1: 'E'/'Z' stereodescriptors for double bonds.
    title: { chemist: 'Double-bond stereo', plain: 'Which side of a double bond' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        'Configuration of stereogenic double bonds — what a name expresses with E/Z. Each entry names the two atoms of a double bond and a + or − parity. The parity is taken over canonical atom numbers, not CIP priorities, so it is not the E/Z stereodescriptor itself.',
      plain:
        'Some double bonds hold their neighbouring groups rigidly on one side or the other. This layer records which side for each such bond, as a plus or minus. Swapping sides gives a different substance made of the same atoms.',
    },
    egLabel: 'Reads as',
  },
  t: {
    // Blue Book P-92.1.1 chirality centre; P-91.2.1.1 R/S stereodescriptors.
    title: { chemist: 'Tetrahedral stereo', plain: 'Left- or right-handed atoms' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        "Tetrahedral chirality centres, the stereogenic units of a name's R/S descriptors. Each entry is a canonical atom number followed by + or −: the parity of its four ligands under InChI's canonical ordering. It is not the CIP R/S stereodescriptor; /m and /s fix the absolute configuration.",
      plain:
        'An atom joined to four different groups can be arranged two ways, like a left and a right hand. This layer lists such atoms with a plus or minus for their arrangement. The two mirror forms can behave very differently, for example in the body.',
    },
    egLabel: 'Reads as',
  },
  m: {
    // Blue Book P-93.1.1 absolute configuration; Gold Book: enantiomer.
    title: { chemist: 'Enantiomer marker', plain: 'Mirror-image flag' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        "One bit choosing between the two enantiomers the /t parities could describe. '1' means the parities are as written; '0' means take the inverted set, the mirror image. Together with /s1 this fixes the absolute configuration.",
      plain:
        'The layer before this can describe a molecule or its mirror image. This single digit says which one is meant. 0 and 1 are the two mirror twins.',
    },
    egLabel: 'Reads as',
  },
  s: {
    // Blue Book P-93.1.1 absolute, P-93.1.2 relative ('rel'), P-91.2.1.1 racemate ('rac').
    title: { chemist: 'Stereo flag', plain: 'How exact the 3-D shape is' },
    accent: 'var(--c-stereo)',
    blurb: {
      chemist:
        "How the stereo layers are to be read. '1' = absolute configuration; '2' = relative configuration, the 'rel' of a name; '3' = racemate, the 'rac' of a name.",
      plain:
        'Says how to read the handedness information. 1: the exact 3-D form is known. 2: only how the handed atoms relate to each other is known. 3: a 50:50 mix of both mirror forms.',
    },
    egLabel: 'Reads as',
  },
  i: {
    // Blue Book P-82 isotopically substituted compounds; P-81.4 natural composition.
    title: { chemist: 'Isotope layer', plain: 'Heavier or lighter atoms' },
    accent: 'var(--c-isotope)',
    blurb: {
      chemist:
        'Isotopic substitution: atoms whose nuclide differs from natural composition — deuterium (D), tritium (T), or a mass shift such as +1 for ¹³C. Atoms not listed have natural isotopic composition.',
      plain:
        'Atoms of one element can come in slightly different weights, called isotopes. This layer lists atoms that are not the everyday kind, such as heavy hydrogen (D). Any atom not listed is the ordinary kind.',
    },
    egLabel: 'Reads as',
  },
};

export const DEFAULT_INFO = {
  title: { chemist: 'Hover any layer', plain: 'Hover any layer' },
  blurb: {
    chemist:
      'Move your cursor over a coloured layer of the InChI string above to see what it encodes and watch the structure light up.',
    plain:
      'Move your mouse over a coloured part of the InChI text above. This card explains it and the drawing lights up.',
  },
  accent: 'var(--ink-faint)',
};

// Shown in place of DEFAULT_INFO while the canvas is empty: there are no layers to
// hover yet, so the card names the prerequisite instead of prompting for a gesture
// that cannot succeed. Deliberately not a second copy of the InChI box's placeholder
// — that one promises the string, this one promises the explanation.
export const EMPTY_INFO = {
  title: { chemist: 'Nothing to explain yet', plain: 'Nothing to explain yet' },
  blurb: {
    chemist:
      'Draw a molecule in the editor above. Its InChI appears below, split into colour-coded layers — hover any one to see what it encodes.',
    plain:
      'Draw a molecule in the editor above. Its InChI text appears below in coloured pieces. Hover a piece to learn what it means.',
  },
  accent: 'var(--ink-faint)',
};
```

- [ ] **Step 4: Resolve the pairs at render**

`src/components/Explanation.tsx`:
- add `import { pick } from '../lib/audience';`
- add selector after `const subHover = ...`: `const audience = useInchiStore(state => state.audience);`
- replace `{info!.title}` → `{pick(info!.title, audience)}`, `{info!.blurb}` → `{pick(info!.blurb, audience)}`
- replace `{legendInfo!.title}` → `{pick(legendInfo!.title, audience)}`, `{legendInfo!.blurb}` → `{pick(legendInfo!.blurb, audience)}`
- replace `{idleInfo.title}` → `{pick(idleInfo.title, audience)}`, `{idleInfo.blurb}` → `{pick(idleInfo.blurb, audience)}`

`src/components/KetcherPanel.tsx` line 117: the tooltip is a mouse-only hint, keep it in the chemist register (no store read added to the preset list):
```tsx
                    title={`Shows the ${LAYER_INFO[m.layer].title.chemist.toLowerCase()} layer`}
```

- [ ] **Step 5: Run tests, typecheck**

Run: `npm test -- --run && npx tsc -b`
Expected: PASS; tsc clean (tsc is what finds any remaining `.title` string use).

- [ ] **Step 6: Commit**

```bash
git add src/lib/layerInfo.ts src/components/Explanation.tsx src/components/KetcherPanel.tsx src/lib/__tests__/layerInfo.test.ts src/components/__tests__/Explanation.test.tsx
git commit -m "Write layer card copy in chemist and plain registers"
```

---

### Task 4: InChIKey card copy in both registers

**Files:**
- Modify: `src/lib/inchiKeyInfo.ts`
- Modify: `src/components/Explanation.tsx` (key branch)
- Modify: `src/lib/__tests__/inchiKeyInfo.test.ts`
- Modify: `src/components/__tests__/Explanation.test.tsx`

**Interfaces:**
- Produces: `KEY_ZONE_COPY[zone]: { label: string; title: Copy; body: Copy }`.

- [ ] **Step 1: Update tests**

`src/lib/__tests__/inchiKeyInfo.test.ts`: every `.title` → `.title.chemist`, every `.body` → `.body.chemist` in existing assertions. Add:
```ts
describe('plain register', () => {
  it('every zone has a distinct non-empty plain title and body', () => {
    for (const key of Object.keys(KEY_ZONE_COPY) as (keyof typeof KEY_ZONE_COPY)[]) {
      expect(KEY_ZONE_COPY[key].title.plain.length).toBeGreaterThan(0);
      expect(KEY_ZONE_COPY[key].body.plain.length).toBeGreaterThan(0);
      expect(KEY_ZONE_COPY[key].body.plain).not.toBe(KEY_ZONE_COPY[key].body.chemist);
    }
  });
  it('plain skeleton body still states the 14-character block', () => {
    expect(KEY_ZONE_COPY.skeleton.body.plain).toContain('14');
  });
});
```

`src/components/__tests__/Explanation.test.tsx` line 169 area ("Skeleton hash" test): keep as is (chemist default). Add:
```tsx
  it('plain audience swaps the key-zone card', () => {
    mock.audience = 'plain';
    mock.inchiKey = 'RYYVLZVUVIJVGH-UHFFFAOYSA-N';
    mock.keyHoverKind = 'skeleton';
    render(<Explanation />);
    expect(screen.getByText(KEY_ZONE_COPY.skeleton.title.plain)).toBeInTheDocument();
  });
```
(import `KEY_ZONE_COPY` from `'../../lib/inchiKeyInfo'`; the key above is caffeine's real InChIKey.)

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/lib/__tests__/inchiKeyInfo.test.ts src/components/__tests__/Explanation.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `KEY_ZONE_COPY`**

In `src/lib/inchiKeyInfo.ts` add `import type { Copy } from './audience';` and replace the `KEY_ZONE_COPY` declaration with:

```ts
// InChI-specific throughout: hashing has no IUPAC nomenclature term.
// Chemist bodies end with SHARED_TAGLINE (D-02 / INKEY-09); plain bodies
// carry the same one-way-hash lesson in their own words.
const PLAIN_TAGLINE =
  'It cannot be turned back into the drawing, so nothing lights up when you hover it.';

export const KEY_ZONE_COPY: Record<KeyHoverZone, { label: string; title: Copy; body: Copy }> = {

  // INKEY-07 (block structure), INKEY-08 (27-char purpose), INKEY-11 (lookup basis), D-03, D-04.
  skeleton: {
    label: 'skeleton hash',
    title: { chemist: 'Skeleton hash', plain: 'Skeleton code' },
    body: {
      chemist:
        'This 14-character block is a hash of the connectivity (skeleton) layer of the InChI — ' +
        'the InChIKey as a whole is the fixed 27-character, web- and database-search-friendly hashed form of the full InChI. ' +
        'Molecules that share the same connectivity share this first block, making it the basis for InChIKey database and web lookup; ' +
        'a multi-component or salt structure yields one key for the whole drawn assembly, not separate keys per fragment. ' +
        SHARED_TAGLINE,
      plain:
        'These 14 characters are a fingerprint of how the atoms are joined. ' +
        'Two molecules with the same joins share these 14 characters, so databases use this block to look molecules up. ' +
        'A drawing with several parts, such as a salt, gets one key for the whole drawing. ' +
        PLAIN_TAGLINE,
    },
  },

  // INKEY-07 (block structure), INKEY-10 (collision caveat), D-03.
  hash: {
    label: 'remaining-layers hash',
    title: { chemist: 'Remaining-layers hash', plain: 'Details code' },
    body: {
      chemist:
        'This 8-character block hashes the remaining InChI layers — stereo, isotope, and proton information. ' +
        'Collisions are improbable but theoretically possible, so the key is suited for lookup and indexing, not as proof of identity. ' +
        SHARED_TAGLINE,
      plain:
        'These 8 characters are a fingerprint of everything else: 3-D shape, isotopes and hydrogen ions. ' +
        'Two different molecules could in theory share it, so the key is for searching, not proof. ' +
        PLAIN_TAGLINE,
    },
  },

  // INKEY-07 (block structure), INKEY-12 (S/N flag + version A), D-03.
  flagVersion: {
    label: 'flag + version',
    title: { chemist: 'Standard flag & version', plain: 'Type and version' },
    body: {
      chemist:
        'S indicates a standard InChI; N indicates a non-standard InChI. ' +
        'The following character A identifies InChIKey version 1. ' +
        SHARED_TAGLINE,
      plain:
        'S means the standard InChI settings were used; N means custom settings. ' +
        'The A says which version of the key format this is. ' +
        PLAIN_TAGLINE,
    },
  },

  // INKEY-07 (block structure), D-03.
  protonation: {
    label: 'protonation',
    title: { chemist: 'Protonation flag', plain: 'Hydrogen-ion flag' },
    body: {
      chemist:
        'This single character encodes the protonation state of the drawn assembly (N = neutral is the standard preset). ' +
        SHARED_TAGLINE,
      plain:
        'One letter recording whether hydrogen ions were added or removed. N means none, the usual case. ' +
        PLAIN_TAGLINE,
    },
  },
};
```

- [ ] **Step 4: Resolve at render**

`src/components/Explanation.tsx` key branch: `{KEY_ZONE_COPY[keyHoverKind].title}` → `{pick(KEY_ZONE_COPY[keyHoverKind].title, audience)}`; same for `.body`.

- [ ] **Step 5: Run tests, typecheck**

Run: `npm test -- --run && npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/inchiKeyInfo.ts src/components/Explanation.tsx src/lib/__tests__/inchiKeyInfo.test.ts src/components/__tests__/Explanation.test.tsx
git commit -m "Write InChIKey card copy in both registers"
```

---

### Task 5: Sub-token card copy in both registers

**Files:**
- Modify: `src/lib/subTokenInfo.ts`
- Modify: `src/components/Explanation.tsx` (`subTokenInfo(...)` call)
- Modify: `src/lib/__tests__/subTokenInfo.test.ts`
- Modify: `src/components/__tests__/Explanation.test.tsx`

**Interfaces:**
- Produces: `subTokenInfo(sub: SubHover, atomElements: Record<number,string>, audience: Audience): SubTokenCopy | null` — return shape unchanged (`{ title, body }` already resolved).

- [ ] **Step 1: Update tests**

`src/lib/__tests__/subTokenInfo.test.ts`: add a third argument `'chemist'` to every existing `subTokenInfo(` call (34 calls; `sed -i "s/subTokenInfo(\(.*\), {})/subTokenInfo(\1, {}, 'chemist')/"` if every call ends with `{}`, otherwise edit by hand). Add at the end:
```ts
describe('plain register', () => {
  // Same ALANINE projections used above: element C, hAtoms 2H, mobileH (H,5,6), stereo t2-.
  const cases: [string, Parameters<typeof subTokenInfo>[0]][] = [
    ['element', { kind: 'element', el: 'C' }],
    ['hAtoms', { kind: 'hAtoms', atoms: [2], count: 1 }],
    ['mobileH', { kind: 'mobileH', atoms: [5, 6] }],
    ['stereo', { kind: 'stereo', sign: '-' }],
    ['bondStereo', { kind: 'bondStereo', stereoBond: [6, 9], sign: '+' }],
    ['atom', { kind: 'atom', canonical: 2, incidentPairs: [[1, 2], [2, 4], [2, 3]] }],
    ['bond', { kind: 'bond', endpointPairs: [[1, 2]] }],
    ['siblings', { kind: 'siblings', siblingPairs: [[4, 3]] }],
    ['branch', { kind: 'branch', branchPoint: 2, bondPairs: [[2, 4]] }],
  ];
  it.each(cases)('%s: plain differs from chemist, both non-empty', (_name, sub) => {
    const c = subTokenInfo(sub, {}, 'chemist')!;
    const p = subTokenInfo(sub, {}, 'plain')!;
    expect(c.body.length).toBeGreaterThan(0);
    expect(p.body.length).toBeGreaterThan(0);
    expect(p.body).not.toBe(c.body);
  });
  it('plain stereo keeps the not-R/S caveat and the sign', () => {
    const p = subTokenInfo({ kind: 'stereo', sign: '-' }, {}, 'plain')!;
    expect(p.body).toContain('-');
    expect(p.body).toMatch(/not the R or S/);
  });
  it('plain atom card keeps the atom numbers', () => {
    const p = subTokenInfo({ kind: 'atom', canonical: 2, incidentPairs: [[1, 2], [2, 4], [2, 3]] }, {}, 'plain')!;
    expect(p.body).toContain('Atom 2');
    expect(p.body).toContain('atoms 1, 3 and 4');
  });
});
```
If the `SubHover` type requires more fields than shown, copy the exact object literals already used earlier in this test file for the same kinds.

`src/components/__tests__/Explanation.test.tsx`: any `subTokenInfo(x, y)` calls used to compute expected `body` gain `, 'chemist'`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/lib/__tests__/subTokenInfo.test.ts`
Expected: FAIL — plain equals chemist (third arg ignored) and tsc arity error.

- [ ] **Step 3: Add the audience parameter and plain templates**

In `src/lib/subTokenInfo.ts`:
- imports: `import { pick } from './audience'; import type { Audience } from './audience';`
- signature:
```ts
export function subTokenInfo(
  sub: SubHover,
  // Available for element-prefixed atom labels (Phase 18); the current bare "atom N"
  // phrasing is the D-08-safest reading, so it is intentionally unconsumed here.
  _atomElements: Record<number, string>,
  audience: Audience,
): SubTokenCopy | null {
```
- Update the module header comment's "Voice" paragraph to: `// Voice: two registers (see lib/audience.ts). Chemist: Blue Book terms, caveats first. Plain: same claims, no jargon. Both registers of one template sit side by side.`
- Rewrite each case so `title` and `body` are `pick({ chemist, plain }, audience)`. The chemist strings are the existing ones except `stereo` (Blue Book term swap). The `componentMarker` / `multiplicityClause` helpers stay single-register ("component" is defined in the glossary).

```ts
    case 'element': {
      const el = sub.el!;
      const name = ELEMENT_NAMES[el] ?? el;
      let body = pick({
        chemist: `This symbol is ${name}; the number after it counts how many ${name} atoms the structure contains.`,
        plain: `This letter is ${name}. The number after it says how many ${name} atoms the molecule has; no number means one.`,
      }, audience);
      if (sub.canonRange) {
        // Presence only — never compute the count here (Pitfall 2 / D-14).
        body += pick({
          chemist: ' In a multi-component formula that count is the number in this component.',
          plain: ' In a drawing with several parts, the count is for this part only.',
        }, audience);
      }
      if (el === 'C' || el === 'H') {
        // Hill order is a CAS convention (not Blue Book).
        body += pick({
          chemist: ' The molecular formula is written in Hill order — carbon first, then hydrogen, then the remaining elements alphabetically.',
          plain: ' Carbon is always listed first, then hydrogen, then the rest in alphabetical order.',
        }, audience);
      }
      return { title: elementTitle(el), body };
    }

    case 'hAtoms': {
      const mult = sub.fragMult ?? 1;
      const atoms = firstFragment(sub.atoms ?? [], mult);
      const count = sub.count ?? 1;
      const h = count === 1 ? 'one hydrogen' : `${count} hydrogens`;
      const verb = atoms.length === 1 ? pick({ chemist: 'bears', plain: 'has' }, audience)
                                      : pick({ chemist: 'each bear', plain: 'each have' }, audience);
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const who = capitalise(atomList(atoms, sub.fragmentOffset ?? 0));
      // Plain "atom N" — never infer a functional group from an H-count (D-08).
      const lead = mult > 1 ? `${who} ${verb} ${h}${ctx}.` : `${who}${ctx} ${verb} ${h}.`;
      const body = `${lead} ` + pick({
        chemist: 'This is a count of attached hydrogens, nothing about what kind of group the atom is part of.',
        plain: 'This only counts hydrogens. It says nothing about what the atom is doing in the molecule.',
      }, audience);
      return { title: `Hydrogen count: ${count}`, body };
    }

    case 'mobileH': {
      // Gold Book: tautomerism. Reads sub.atoms ONLY (Pitfall 3 / D-10).
      const mult = sub.fragMult ?? 1;
      const where = atomList(firstFragment(sub.atoms ?? [], mult), sub.fragmentOffset ?? 0);
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const place = mult > 1 ? `${where} rather than fixed to one of them${ctx}` : `${where}${ctx} rather than fixed to one of them`;
      const body = pick({
        chemist:
          `A mobile hydrogen is shared across ${place}: tautomerism lets it sit on any of them. ` +
          `InChI records one identifier per set of tautomers, so this hydrogen is written as shared between these positions instead of drawn as a single fixed bond.`,
        plain:
          `A hydrogen is shared between ${place}; it can sit on any of them. ` +
          `InChI writes it as shared instead of picking one place, so every version of the molecule gets the same text.`,
      }, audience);
      return {
        title: pick({ chemist: 'Mobile hydrogen', plain: 'Movable hydrogen' }, audience),
        body,
      };
    }

    case 'stereo': {
      // Blue Book P-92.1.1 chirality centre; P-91.2.1.1 R/S. D-05: the not-R/S caveat
      // is the load-bearing content and survives in both registers.
      const sign = sub.sign ?? '';
      const body = pick({
        chemist:
          `A chirality centre: a tetrahedral atom whose four distinguishable ligands make the molecule nonsuperposable on its mirror image. ` +
          `The ${sign} here is the parity of those ligands under InChI's canonical neighbour ordering — it is NOT the CIP R/S stereodescriptor (+ is not R, − is not S). ` +
          `The /m and /s layers fix which enantiomer this parity corresponds to.`,
        plain:
          `This atom is joined to four different groups, so it can exist in two mirror-image forms, like a left and a right hand. ` +
          `The ${sign} records which arrangement this is. It is InChI's own label, not the R or S used in chemical names.`,
      }, audience);
      return {
        title: pick({ chemist: 'Tetrahedral stereocenter', plain: 'Handed atom' }, audience),
        body,
      };
    }

    case 'bondStereo': {
      // Blue Book P-93.4.2.1.1 E/Z. Parity ≠ E/Z (canonical numbers, not CIP priorities).
      const off = sub.fragmentOffset ?? 0;
      const [a, b] = sub.stereoBond ?? [0, 0];
      const sign = sub.sign ?? '';
      const where = `Atoms ${a - off} and ${b - off}${componentMarker(sub)}`;
      const body = sign === '?'
        ? pick({
            chemist: `${where} are joined by a double bond whose configuration is unspecified or unknown — the ? records that no E/Z assignment is made for this bond.`,
            plain: `${where} share a double bond whose sides are not specified. The ? says so.`,
          }, audience)
        : pick({
            chemist:
              `${where} are the two ends of a double bond whose configuration is fixed: the groups on each end cannot rotate past each other. ` +
              `The ${sign} is the parity of the substituents under InChI's canonical neighbour numbering — it is NOT the E/Z stereodescriptor itself. ` +
              `For simple alkenes + often coincides with E and − with Z, but that follows from the canonical numbers, not from CIP priorities, so it is not guaranteed.`,
            plain:
              `${where} share a double bond that holds its groups on fixed sides. ` +
              `The ${sign} records which side each group sits on. It is InChI's own label, not the E or Z used in chemical names.`,
          }, audience);
      return {
        title: pick({ chemist: 'Double-bond stereo', plain: 'Double-bond side' }, audience),
        body,
      };
    }

    case 'atom': {
      const self = sub.canonical!;
      const off = sub.fragmentOffset ?? 0;
      const neighbours = [...new Set((sub.incidentPairs ?? []).map(([a, b]) => (a === self ? b : a)))].sort(
        (x, y) => x - y,
      );
      const selfLocal = self - off;
      const mult = sub.fragMult ?? 1;
      const title = pick({ chemist: 'Connection layer - Atom', plain: 'Joins - Atom' }, audience);
      if (neighbours.length === 0) {
        const tail = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
        return {
          title,
          body: pick({
            chemist: `Atom ${selfLocal}${tail} has no bonds recorded in the connection layer.`,
            plain: `Atom ${selfLocal}${tail} has no bonds listed here.`,
          }, audience),
        };
      }
      const skeleton = pick({ chemist: 'in the connection skeleton', plain: 'in this layer' }, audience);
      // Not "heavy-atom skeleton": the hovered atom is itself a hydrogen when a
      // bridging H carries a canonical number (boranes).
      const tail = mult > 1 ? ` ${skeleton},${multiplicityClause(sub)}` : `${componentMarker(sub)} ${skeleton}`;
      const body = pick({
        chemist:
          `Atom ${selfLocal} is bonded to ${atomList(neighbours, off)}${tail}. ` +
          `The connection layer lists which canonical atom numbers are joined — it records connectivity only, not bond order or 3-D shape.`,
        plain:
          `Atom ${selfLocal} is joined to ${atomList(neighbours, off)}${tail}. ` +
          `This layer only says which atoms touch, not how strongly or in what shape.`,
      }, audience);
      return { title, body };
    }

    case 'bond': {
      const off = sub.fragmentOffset ?? 0;
      const [a, b] = (sub.endpointPairs ?? [[0, 0]])[0];
      const mult = sub.fragMult ?? 1;
      const pair = `Atoms ${a - off} and ${b - off}`;
      const body = mult > 1
        ? pick({
            chemist: `${pair} are bonded — this hyphen joins the canonical numbers on either side of it —${multiplicityClause(sub)}. It records that the two atoms are connected, not the bond order.`,
            plain: `${pair} are joined — this dash links the two numbers on either side of it —${multiplicityClause(sub)}. It does not say whether the bond is single or double.`,
          }, audience)
        : pick({
            chemist: `${pair}${componentMarker(sub)} are bonded — this hyphen joins the canonical numbers on either side of it. It records that the two atoms are connected, not the bond order.`,
            plain: `${pair}${componentMarker(sub)} are joined. This dash links the two numbers on either side of it. It does not say whether the bond is single or double.`,
          }, audience);
      return { title: pick({ chemist: 'Connection layer - Bond', plain: 'Joins - Bond' }, audience), body };
    }

    case 'siblings': {
      const off = sub.fragmentOffset ?? 0;
      const [a, b] = (sub.siblingPairs ?? [[0, 0]])[0];
      const pair = `Atoms ${a - off} and ${b - off}${componentMarker(sub)}`;
      const body = pick({
        chemist:
          `${pair} are not bonded to each other — this comma separates two branches hanging off the same atom. ` +
          `Each one continues from the atom before the opening parenthesis.`,
        plain:
          `${pair} are not joined to each other. The comma separates two branches that both hang off the same atom, the one before the opening bracket.`,
      }, audience);
      return { title: pick({ chemist: 'Connection layer - Branch separator', plain: 'Joins - Branch separator' }, audience), body };
    }

    case 'branch': {
      const off = sub.fragmentOffset ?? 0;
      const mult = sub.fragMult ?? 1;
      const allPairs = sub.bondPairs ?? [];
      const pairs = firstFragment(allPairs, mult);
      const bp = sub.branchPoint ?? pairs[0]?.[0] ?? 0;
      const ctx = mult > 1 ? `,${multiplicityClause(sub)}` : componentMarker(sub);
      const body = pick({
        chemist:
          `These parentheses are a branch hanging off atom ${bp - off}${ctx}, adding the bonds ${bondPairList(pairs, off)}. ` +
          `InChI writes side-chains in parentheses so a branched skeleton fits on one line; after the ) the main chain continues from atom ${bp - off}.`,
        plain:
          `The brackets are a side branch hanging off atom ${bp - off}${ctx}, adding the bonds ${bondPairList(pairs, off)}. ` +
          `After the closing bracket the main chain carries on from atom ${bp - off}.`,
      }, audience);
      return { title: pick({ chemist: 'Connection layer - Branch', plain: 'Joins - Branch' }, audience), body };
    }
```
Keep every existing explanatory comment inside the cases that the rewrite above omitted for brevity (GAP-19, GAP-2, WR-03 notes) — move them, do not delete them.

`src/components/Explanation.tsx`: `subTokenInfo(effSub, atomElements)` → `subTokenInfo(effSub, atomElements, audience)`.

- [ ] **Step 4: Run tests, typecheck**

Run: `npm test -- --run && npx tsc -b`
Expected: PASS. If an existing chemist assertion in `subTokenInfo.test.ts` breaks on the `mobileH` or `stereo` rewording, update that assertion to the new chemist text — those two are the only chemist bodies whose wording changed, and the change is intentional (Blue Book terms).

- [ ] **Step 5: Commit**

```bash
git add src/lib/subTokenInfo.ts src/components/Explanation.tsx src/lib/__tests__/subTokenInfo.test.ts src/components/__tests__/Explanation.test.tsx
git commit -m "Write sub-token card copy in both registers"
```

---

### Task 6: Help tour copy in both registers

**Files:**
- Modify: `src/components/HelpTour.tsx` (`TourStep`, `STEPS`, render at lines ~310–311)
- Modify: `src/components/__tests__/HelpTour.test.tsx`

**Interfaces:**
- Produces: `TourStep { title: Copy; body: Copy; selector: string }`.

- [ ] **Step 1: Update tests**

`src/components/__tests__/HelpTour.test.tsx`: `STEPS.map(s => s.title)` → `STEPS.map(s => s.title.chemist)`; `it.each(STEPS.map((s) => [s.title, s.selector]))` → `[s.title.chemist, s.selector]`. Add:
```tsx
describe('HelpTour — plain register', () => {
  it('shows the plain title when the store audience is plain', () => {
    useInchiStore.getState().setAudience('plain');
    render(<HelpTour open={true} onClose={vi.fn()} />);
    expect(screen.getByText(STEPS[0].title.plain)).toBeInTheDocument();
    useInchiStore.getState().setAudience('chemist');
  });
});
```
(import `useInchiStore` from `'../../store'`; this file uses the real store.)

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/components/__tests__/HelpTour.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/components/HelpTour.tsx`:
- imports: `import { useInchiStore } from '../store'; import { pick } from '../lib/audience'; import type { Copy } from '../lib/audience';`
- `TourStep`: `title: Copy; body: Copy;`
- `STEPS`:
```ts
export const STEPS: TourStep[] = [
  {
    title: { chemist: 'The molecule editor', plain: 'The drawing area' },
    body: {
      chemist: 'Draw or edit a structure here. The InChI updates live as you draw.',
      plain: 'Draw or change a molecule here. The text below updates as you draw.',
    },
    selector: '[data-tour-id="editor"]',
  },
  {
    title: { chemist: 'Presets list', plain: 'Example molecules' },
    body: {
      chemist: 'Click an example molecule to load it instantly into the editor.',
      plain: 'Click a name to load a ready-made molecule.',
    },
    selector: '.mol-list',
  },
  {
    title: { chemist: 'The InChI string', plain: 'The InChI text' },
    body: {
      chemist: 'The InChI is displayed here, colour-coded by layer. Each colour represents a different kind of chemical information.',
      plain: 'This is the molecule written as text. Each colour is one kind of information.',
    },
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: { chemist: 'Hovering', plain: 'Hovering' },
    body: {
      chemist: 'Hover any coloured chunk to highlight the matching atoms or bonds in the drawing above.',
      plain: 'Point at a coloured piece to light up the matching atoms in the drawing.',
    },
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: { chemist: 'Pinning (click to freeze)', plain: 'Pinning' },
    body: {
      chemist: 'Click a chunk to lock the highlight — the view freezes so you can inspect the drawing. Click anywhere or press Esc to release.',
      plain: 'Click a piece to freeze the highlight. Click anywhere or press Esc to release it.',
    },
    selector: '[data-tour-id="inchi-string"]',
  },
  {
    title: { chemist: 'The InChIKey', plain: 'The InChIKey' },
    body: {
      chemist: 'The InChIKey is a fixed-length, hashed form of the InChI — useful for database searches and comparisons.',
      plain: 'A short fixed-length fingerprint of the text above, handy for searching databases.',
    },
    selector: '[data-tour-id="inchikey"]',
  },
  {
    // Between the InChIKey and the legend, matching where the card sits on screen
    // — the tour reads down the page. It is also the step that explains where the
    // output of steps 4 and 5 actually appears, which was previously left implied.
    title: { chemist: 'The explanation card', plain: 'The explanation card' },
    body: {
      chemist: 'Whatever you point at is explained here — a whole layer, or a single character inside one. The text names the atoms it refers to, so you can read it against the drawing above. Click any underlined term for a definition.',
      plain: 'Whatever you point at is explained here in plain words. The text names the atoms it means. Click any underlined word for its meaning.',
    },
    selector: '[data-tour-id="explanation"]',
  },
  {
    title: { chemist: 'The legend', plain: 'The legend' },
    body: {
      chemist: 'Every layer type is listed here with its colour and a description of what chemical information it encodes. Hovering a row explains that layer in the card to its left, even for layers this molecule does not have.',
      plain: 'Every kind of layer is listed here with its colour. Hover a row to read about it, even if this molecule does not have it.',
    },
    selector: '[data-tour-id="legend"]',
  },
  {
    title: { chemist: 'Reset / Help buttons', plain: 'Reset / Help buttons' },
    body: {
      chemist: 'Reset clears the canvas. Help reopens this tour at any time.',
      plain: 'Reset clears the drawing. Help reopens this tour.',
    },
    selector: '.section-label-actions',
  },
];
```
- Inside the component, next to `const step = STEPS[stepIndex];` add `const audience = useInchiStore(state => state.audience);` (hooks must run unconditionally — place it with the other hooks at the top of the component, before any early `return`).
- Render: `{step.title}` → `{pick(step.title, audience)}`, `{step.body}` → `{pick(step.body, audience)}`.

- [ ] **Step 4: Run tests, typecheck**

Run: `npm test -- --run src/components/__tests__ && npx tsc -b`
Expected: PASS. `HelpTour.position.test.ts` asserts a body height; if it fails because the chemist step-7 body grew by one sentence, raise the asserted height to the measured value and note why in the test comment.

- [ ] **Step 5: Commit**

```bash
git add src/components/HelpTour.tsx src/components/__tests__/HelpTour.test.tsx src/components/__tests__/HelpTour.position.test.ts
git commit -m "Write help tour copy in both registers"
```

---

### Task 7: Legend copy in both registers

**Files:**
- Modify: `src/components/Legend.tsx` (`LegendLayerDef`, `ALL_LAYERS`, render)
- Modify: `src/components/__tests__/Legend.touch.test.tsx` (only if it asserts a name/desc literal)
- Create: `src/components/__tests__/Legend.audience.test.tsx`

**Interfaces:**
- Produces: `ALL_LAYERS[i].name: Copy`, `.desc: Copy`.

- [ ] **Step 1: Write failing test**

`src/components/__tests__/Legend.audience.test.tsx`:
```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Legend } from '../Legend';
import { useInchiStore } from '../../store';

describe('Legend register', () => {
  afterEach(() => useInchiStore.getState().setAudience('chemist'));

  it('chemist names by default', () => {
    render(<Legend activeType={undefined} />);
    expect(screen.getByText('Tetrahedral')).toBeInTheDocument();
    expect(screen.getByText('Chirality centres')).toBeInTheDocument();
  });

  it('plain names when the audience is plain', () => {
    useInchiStore.getState().setAudience('plain');
    render(<Legend activeType={undefined} />);
    expect(screen.getByText('Handedness')).toBeInTheDocument();
    expect(screen.queryByText('Tetrahedral')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/components/__tests__/Legend.audience.test.tsx`
Expected: FAIL — "Chirality centres" not found.

- [ ] **Step 3: Implement**

`src/components/Legend.tsx`:
- imports: `import { pick } from '../lib/audience'; import type { Copy } from '../lib/audience';`
- `LegendLayerDef`: `name: Copy; desc: Copy;`
- `ALL_LAYERS` (comment above it stays):
```ts
const ALL_LAYERS: LegendLayerDef[] = [
  { type: 'version', name: { chemist: 'Version',           plain: 'Version' },        desc: { chemist: 'Which InChI specification',     plain: 'Which rule set' },               eg: '1S' },
  { type: 'formula', name: { chemist: 'Formula',           plain: 'Ingredients' },    desc: { chemist: 'Atoms by element & count',      plain: 'Which atoms, how many' },        eg: 'C8H10N4O2' },
  { type: 'c',       name: { chemist: 'Connection',        plain: 'Joins' },          desc: { chemist: 'Heavy-atom connectivity',       plain: 'Which atoms are bonded' },       eg: 'c1-2(4)3-5' },
  { type: 'h',       name: { chemist: 'Hydrogen',          plain: 'Hydrogens' },      desc: { chemist: 'H count per atom + mobile H',   plain: 'Hydrogen count per atom' },      eg: 'h2H,1H3,(H,3,4)' },
  { type: 'q',       name: { chemist: 'Charge',            plain: 'Charge' },         desc: { chemist: 'Net formal charge',             plain: 'Overall electric charge' },      eg: 'q+1' },
  { type: 'p',       name: { chemist: 'Proton',            plain: 'Hydrogen ions' },  desc: { chemist: 'Hydrons added or removed',      plain: 'Gained or lost H⁺' },            eg: 'p+1' },
  { type: 'b',       name: { chemist: 'Double-bond stereo', plain: 'Double-bond sides' }, desc: { chemist: 'E/Z configuration',         plain: 'Which side groups sit' },        eg: 'b6-9+' },
  { type: 't',       name: { chemist: 'Tetrahedral',       plain: 'Handedness' },     desc: { chemist: 'Chirality centres',             plain: 'Left- or right-handed atoms' },  eg: 't2-,4+' },
  { type: 'm',       name: { chemist: 'Enantiomer',        plain: 'Mirror image' },   desc: { chemist: 'Mirror-image choice',           plain: 'Which twin is meant' },          eg: 'm0 or m1' },
  { type: 's',       name: { chemist: 'Stereo flag',       plain: 'Shape certainty' }, desc: { chemist: 'Absolute / relative / racemic', plain: 'Exact, relative or mixed' },    eg: 's1' },
  { type: 'i',       name: { chemist: 'Isotope',           plain: 'Isotopes' },       desc: { chemist: 'Isotopic substitution',         plain: 'Unusual atom weights' },         eg: 'i2D,5+1' },
];
```
- In the component add `const audience = useInchiStore(state => state.audience);` after the `layers` selector.
- Render: `{l.name}` → `{pick(l.name, audience)}`, `{l.desc}` → `{pick(l.desc, audience)}`.

- [ ] **Step 4: Run tests, typecheck**

Run: `npm test -- --run src/components/__tests__ && npx tsc -b`
Expected: PASS. If `Legend.touch.test.tsx` or `legendPresence.test.ts` asserts an old literal ("Heavy-atom skeleton", "sp³ stereocenters"), update to the new chemist text.

- [ ] **Step 5: Commit**

```bash
git add src/components/Legend.tsx src/components/__tests__/Legend.audience.test.tsx src/components/__tests__/Legend.touch.test.tsx
git commit -m "Write legend copy in both registers"
```

---

### Task 8: Register discipline test

**Files:**
- Create: `src/lib/__tests__/copyTables.test.ts`

**Interfaces:**
- Consumes: `LAYER_INFO`, `DEFAULT_INFO`, `EMPTY_INFO`, `KEY_ZONE_COPY`, `STEPS`, and the legend table. `ALL_LAYERS` is module-private in `Legend.tsx`; export it (`export const ALL_LAYERS`) — a read-only data table, not behaviour, so no visibility approval is needed beyond this note.

- [ ] **Step 1: Write the test (it should pass immediately if Tasks 3–7 respected the rules; any failure is a copy bug to fix in the copy, not in the test)**

```ts
import { describe, it, expect } from 'vitest';
import { LAYER_INFO, DEFAULT_INFO, EMPTY_INFO } from '../layerInfo';
import { KEY_ZONE_COPY } from '../inchiKeyInfo';
import { STEPS } from '../../components/HelpTour';
import { ALL_LAYERS } from '../../components/Legend';
import type { Copy } from '../audience';

// Words that mark the plain register as having leaked chemist jargon.
const BANNED_IN_PLAIN = [/sp³/, /\bparit(y|ies)\b/, /stereodescriptor/, /\bcanonical\b/, /\bHill\b/, /\bCIP\b/, /\bligand/, /\btautomer/, /\benantiomer/];
const MAX_PLAIN_SENTENCE_WORDS = 20;

function allCopies(): [string, Copy][] {
  const out: [string, Copy][] = [];
  for (const [k, e] of Object.entries(LAYER_INFO)) { out.push([`layer ${k} title`, e.title], [`layer ${k} blurb`, e.blurb]); }
  out.push(['DEFAULT title', DEFAULT_INFO.title], ['DEFAULT blurb', DEFAULT_INFO.blurb]);
  out.push(['EMPTY title', EMPTY_INFO.title], ['EMPTY blurb', EMPTY_INFO.blurb]);
  for (const [k, e] of Object.entries(KEY_ZONE_COPY)) { out.push([`key ${k} title`, e.title], [`key ${k} body`, e.body]); }
  STEPS.forEach((s, i) => out.push([`tour ${i} title`, s.title], [`tour ${i} body`, s.body]));
  ALL_LAYERS.forEach(l => out.push([`legend ${l.type} name`, l.name], [`legend ${l.type} desc`, l.desc]));
  return out;
}

describe('copy tables', () => {
  it.each(allCopies())('%s: both registers non-empty', (_n, c) => {
    expect(c.chemist.trim().length).toBeGreaterThan(0);
    expect(c.plain.trim().length).toBeGreaterThan(0);
  });

  it.each(allCopies().filter(([n]) => /blurb|body|desc/.test(n)))('%s: plain differs from chemist', (_n, c) => {
    expect(c.plain).not.toBe(c.chemist);
  });

  it.each(allCopies())('%s: plain has no banned jargon', (_n, c) => {
    for (const re of BANNED_IN_PLAIN) {
      expect(c.plain).not.toMatch(re);
    }
  });

  it.each(allCopies().filter(([n]) => /blurb|body/.test(n)))('%s: plain sentences are short', (_n, c) => {
    for (const s of c.plain.split(/(?<=[.!?])\s+/)) {
      const words = s.trim().split(/\s+/).filter(Boolean).length;
      expect(words, s).toBeLessThanOrEqual(MAX_PLAIN_SENTENCE_WORDS);
    }
  });
});
```

- [ ] **Step 2: Run**

Run: `npm test -- --run src/lib/__tests__/copyTables.test.ts`
Expected: PASS. Any failure names the exact string; shorten or de-jargon that plain string in its source file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/copyTables.test.ts src/components/Legend.tsx
git commit -m "Enforce register rules across all copy tables"
```

---

### Task 9: Glossary data and term matcher

**Files:**
- Create: `src/lib/glossary.ts`
- Create: `src/lib/__tests__/glossary.test.ts`

**Interfaces:**
- Produces: `GLOSSARY: Record<string, string>` (lower-case term → plain definition), `type Segment = { text: string; term?: string }`, `markTerms(text: string): Segment[]`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { GLOSSARY, markTerms } from '../glossary';

describe('GLOSSARY', () => {
  it('keys are lower-case, trimmed, unique; definitions non-empty', () => {
    const keys = Object.keys(GLOSSARY);
    for (const k of keys) {
      expect(k).toBe(k.toLowerCase().trim());
      expect(GLOSSARY[k].trim().length).toBeGreaterThan(0);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('markTerms', () => {
  it('returns one plain segment when nothing matches', () => {
    expect(markTerms('nothing here')).toEqual([{ text: 'nothing here' }]);
  });

  it('marks a term, preserving surrounding text and casing', () => {
    expect(markTerms('An Atom joined')).toEqual([
      { text: 'An ' }, { text: 'Atom', term: 'atom' }, { text: ' joined' },
    ]);
  });

  it('matches plurals and whole words only', () => {
    expect(markTerms('atoms')).toEqual([{ text: 'atoms', term: 'atom' }]);
    expect(markTerms('diatoms')).toEqual([{ text: 'diatoms' }]);
  });

  it('marks only the first occurrence of each term', () => {
    const segs = markTerms('atom then atom');
    expect(segs.filter(s => s.term)).toHaveLength(1);
  });

  it('longest term wins', () => {
    const segs = markTerms('a mobile hydrogen here');
    expect(segs).toContainEqual({ text: 'mobile hydrogen', term: 'mobile hydrogen' });
  });

  it('handles terms with slashes', () => {
    expect(markTerms('the E/Z label')).toContainEqual({ text: 'E/Z', term: 'e/z' });
  });

  it('concatenates back to the input', () => {
    const text = 'Atoms 1 and 2 share a double bond; the parity is not the E/Z stereodescriptor.';
    expect(markTerms(text).map(s => s.text).join('')).toBe(text);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/lib/__tests__/glossary.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`src/lib/glossary.ts`:
```ts
// Plain-language glossary. One register only (spec §4): the definitions are
// for the reader who does not know the word, whichever mode the card is in.
// Keys are lower-case; markTerms matches case-insensitively and allows a
// trailing 's'. Definitions are rendered as plain text — never re-marked.
export const GLOSSARY: Record<string, string> = {
  'atom': 'The smallest piece of an element, such as one carbon or one oxygen. Molecules are atoms joined together.',
  'bond': 'A link holding two atoms together in a molecule.',
  'double bond': 'Two bonds between the same pair of atoms. It is stiff and cannot rotate.',
  'heavy atom': 'Any atom that is not hydrogen. InChI numbers only these.',
  'non-hydrogen atom': 'Any atom that is not hydrogen. InChI numbers only these.',
  'hydrogen': 'The lightest and most common atom. Chemists often leave it out of drawings because it is so common.',
  'molecular formula': 'A count of each kind of atom in a molecule, such as C8H10N4O2 for caffeine.',
  'hill order': 'The rule for writing a formula: carbon first, hydrogen second, then the other elements alphabetically.',
  'canonical': "InChI's fixed way of numbering the atoms so the same molecule always gets the same numbers, however it is drawn.",
  'connectivity': 'Which atoms are joined to which, ignoring shape and bond strength.',
  'branch': 'A side chain of atoms hanging off the main chain, written inside brackets.',
  'component': 'One separate molecule in a drawing of several, such as the two halves of a salt.',
  'valence': 'How many bonds an atom normally makes. Carbon makes four, oxygen two, hydrogen one.',
  'formal charge': "The charge written on one atom in a drawing, positive or negative. Adding them up gives the molecule's total charge.",
  'net charge': 'The total electric charge of the whole molecule.',
  'anion': 'A negatively charged molecule or atom.',
  'cation': 'A positively charged molecule or atom.',
  'zwitterion': 'A molecule carrying both a positive and a negative charge that cancel out overall.',
  'hydron': 'A hydrogen atom that has lost its electron, written H⁺. Adding or removing one changes a molecule’s charge.',
  'proton': 'A hydrogen atom that has lost its electron, written H⁺. Adding or removing one changes a molecule’s charge.',
  'hydrogen ion': 'A hydrogen atom that has lost its electron, written H⁺. Adding or removing one changes a molecule’s charge.',
  'protonated': 'Having gained a hydrogen ion (H⁺).',
  'deprotonated': 'Having lost a hydrogen ion (H⁺).',
  'tautomer': 'One of two or more forms of a molecule that differ only in where a hydrogen sits. They swap back and forth in solution.',
  'tautomerism': 'A hydrogen moving between two places in a molecule, so the molecule flips between forms.',
  'mobile hydrogen': 'A hydrogen that can sit on more than one atom. InChI records it as shared.',
  'chirality centre': 'An atom joined to four different groups. It can be arranged in two mirror-image ways.',
  'stereocenter': 'An atom joined to four different groups. It can be arranged in two mirror-image ways.',
  'stereogenic': 'Able to exist in more than one 3-D arrangement, such as a handed atom or a rigid double bond.',
  'stereogenic unit': 'A part of a molecule that can exist in more than one 3-D arrangement, such as a handed atom or a rigid double bond.',
  'chiral': 'Not matching its own mirror image, like a hand.',
  'chirality': 'The property of not matching your own mirror image, like a hand. Chiral molecules come in left and right forms.',
  'nonsuperposable': 'Cannot be laid exactly on top of the other, however you turn it. Your two hands are nonsuperposable.',
  'enantiomer': 'One of the two mirror-image forms of a chiral molecule.',
  'mirror image': 'The form you would see holding the molecule up to a mirror. For handed molecules it is a different substance.',
  'parity': "A plus or minus that InChI gives a 3-D arrangement. It is InChI's own label, not the R/S or E/Z used in names.",
  'cip': 'Cahn–Ingold–Prelog: the rules chemists use to label a 3-D arrangement as R or S, or E or Z.',
  'r/s': 'The two labels chemists give a handed atom, from the Cahn–Ingold–Prelog rules.',
  'e/z': 'The two labels for which side groups sit on a rigid double bond. Z: same side. E: opposite sides.',
  'stereodescriptor': 'A label such as R, S, E or Z placed in a chemical name to state a 3-D arrangement.',
  'configuration': 'The 3-D arrangement of the atoms in a molecule.',
  'absolute configuration': 'The true 3-D arrangement of a molecule, as opposed to only knowing how its parts relate.',
  'relative configuration': 'How the handed atoms in one molecule are arranged relative to each other, without knowing the true mirror form.',
  'racemate': 'A 50:50 mixture of the two mirror-image forms of a molecule.',
  'racemic': 'A 50:50 mixture of the two mirror-image forms of a molecule.',
  'ligand': 'A group attached to an atom.',
  'substituent': 'A group attached to an atom.',
  'tetrahedral': 'Shaped like a four-cornered pyramid: an atom with four groups pointing to the corners.',
  'isotope': 'Atoms of the same element with different weights. Deuterium is a heavy form of hydrogen.',
  'isotopic substitution': 'Swapping an atom for a heavier or lighter version of the same element.',
  'nuclide': 'A specific kind of atom defined by its element and its weight, such as carbon-13.',
  'deuterium': 'Hydrogen that weighs twice the usual. Written D.',
  'tritium': 'Hydrogen that weighs three times the usual. Written T.',
  'hash': 'A short fixed-length code computed from longer data. It cannot be run backwards to recover the original.',
  'inchikey': 'A 27-character hashed form of an InChI, used for searching and comparing.',
  'standard inchi': 'An InChI made with the default options, marked by the S. What most databases store.',
  'borane': 'A compound of boron and hydrogen. Some have a hydrogen bridging two boron atoms.',
  'alkene': 'A molecule containing a carbon–carbon double bond.',
};

export type Segment = { text: string; term?: string };

// Longest term first so "mobile hydrogen" beats "hydrogen". Special characters
// (E/Z, R/S) are escaped. \b on both sides keeps "atom" out of "diatoms"; the
// optional s picks up plurals. Built once at module load.
const TERM_RE = new RegExp(
  `\\b(${Object.keys(GLOSSARY)
    .sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
    .join('|')})s?\\b`,
  'gi',
);

export function markTerms(text: string): Segment[] {
  const out: Segment[] = [];
  const seen = new Set<string>();
  let last = 0;

  for (const m of text.matchAll(TERM_RE)) {
    const term = m[1].toLowerCase();
    // Only the first occurrence of each term is a button; later ones stay text.
    if (seen.has(term)) {
      continue;
    }
    seen.add(term);
    if (m.index! > last) {
      out.push({ text: text.slice(last, m.index) });
    }
    out.push({ text: m[0], term });
    last = m.index! + m[0].length;
  }

  if (last < text.length) {
    out.push({ text: text.slice(last) });
  }
  return out.length ? out : [{ text }];
}
```
Note: `matchAll` with a `g` regex is stateless per call; no `lastIndex` reset needed.

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/lib/__tests__/glossary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/glossary.ts src/lib/__tests__/glossary.test.ts
git commit -m "Add plain-language glossary and term matcher"
```

---

### Task 10: Prose component and wiring

**Files:**
- Create: `src/components/Prose.tsx`
- Create: `src/components/Prose.module.css`
- Create: `src/components/__tests__/Prose.test.tsx`
- Modify: `src/components/Explanation.tsx` (five `<p className={styles.layerBody}>` sites)
- Modify: `src/components/HelpTour.tsx` (`<p className={styles.stepBody}>`)
- Modify: `src/components/Legend.tsx` (`<span className={styles.desc}>`)
- Modify: `src/components/__tests__/Explanation.test.tsx` (`getByText(body)` assertions)

**Interfaces:**
- Consumes: `markTerms`, `GLOSSARY` (Task 9).
- Produces: `<Prose text={string} className={string} as="p" | "span" />`.

- [ ] **Step 1: Write failing tests**

`src/components/__tests__/Prose.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Prose } from '../Prose';
import { GLOSSARY } from '../../lib/glossary';

const TEXT = 'An atom and a bond. Another atom.';

describe('Prose', () => {
  it('renders the full text and one button per first term occurrence', () => {
    const { container } = render(<Prose text={TEXT} />);
    expect(container.firstChild).toHaveTextContent(TEXT);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('click opens the definition, second click closes it', () => {
    render(<Prose text={TEXT} />);
    const btn = screen.getByRole('button', { name: 'atom' });
    fireEvent.click(btn);
    expect(screen.getByRole('note')).toHaveTextContent(GLOSSARY['atom']);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(btn);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('only one definition open at a time', () => {
    render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.click(screen.getByRole('button', { name: 'bond' }));
    expect(screen.getAllByRole('note')).toHaveLength(1);
    expect(screen.getByRole('note')).toHaveTextContent(GLOSSARY['bond']);
  });

  it('Escape closes', () => {
    render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('click outside closes', () => {
    render(<div><Prose text={TEXT} /><span>outside</span></div>);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('text change closes an open definition', () => {
    const { rerender } = render(<Prose text={TEXT} />);
    fireEvent.click(screen.getByRole('button', { name: 'atom' }));
    rerender(<Prose text="A bond." />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/components/__tests__/Prose.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`src/components/Prose.tsx`:
```tsx
// Card prose with clickable glossary terms. The definition renders as a block
// directly under the text (not a floating popover): .card is overflow:hidden,
// and an in-flow block needs no positioning and works on touch.
import { useEffect, useRef, useState } from 'react';
import { GLOSSARY, markTerms } from '../lib/glossary';
import styles from './Prose.module.css';

interface ProseProps {
  text: string;
  className?: string;
  /** Wrapper element. 'p' for card bodies, 'span' where the parent is inline. */
  as?: 'p' | 'span';
}

const ESCAPE = 'Escape';

export function Prose({ text, className, as = 'p' }: ProseProps) {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  // New text = new card; an open definition from the old card must not linger.
  useEffect(() => setOpen(null), [text]);

  // Esc and outside click close. Listeners exist only while something is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === ESCAPE) { setOpen(null); } };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) { setOpen(null); }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const Tag = as;
  const segments = markTerms(text);

  return (
    <Tag ref={rootRef as never} className={className}>
      {segments.map((s, i) =>
        s.term ? (
          <button
            key={i}
            type="button"
            className={styles.term}
            aria-expanded={open === s.term}
            onClick={() => setOpen(open === s.term ? null : s.term!)}
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
      {open && (
        <span role="note" className={styles.def}>
          <b>{open}</b> {GLOSSARY[open]}
        </span>
      )}
    </Tag>
  );
}
```

`src/components/Prose.module.css`:
```css
/* Glossary term: reads as text with a dotted underline; no button chrome. */
.term {
  all: unset;
  cursor: pointer;
  text-decoration: underline dotted;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  color: inherit;
  font: inherit;
}
.term:hover,
.term[aria-expanded="true"] {
  text-decoration-style: solid;
}
.term:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 1px;
  border-radius: 2px;
}

/* Definition block under the paragraph. In-flow, so nothing is clipped. */
.def {
  display: block;
  margin-top: 6px;
  padding: 6px 10px;
  border-left: 2px solid var(--line-control);
  font-size: var(--fs-micro);
  line-height: 1.5;
  color: var(--ink-soft);
}
.def b {
  color: var(--ink);
  font-weight: 500;
  text-transform: capitalize;
}
```

- [ ] **Step 4: Wire into the three consumers**

`src/components/Explanation.tsx`: import `Prose`; replace each
`<p className={styles.layerBody}>{X}</p>` with `<Prose className={styles.layerBody} text={X} />` — five sites (key zone, sub-token, layer, legend-hover, idle). Titles stay as `<h3>`. The "Reads as" block is untouched.

`src/components/HelpTour.tsx`: `<p className={styles.stepBody}>{pick(step.body, audience)}</p>` → `<Prose className={styles.stepBody} text={pick(step.body, audience)} />`.

`src/components/Legend.tsx`: `<span className={styles.desc}>{pick(l.desc, audience)}</span>` → `<Prose as="span" className={styles.desc} text={pick(l.desc, audience)} />`. Because a legend row has `onClick={show}`, a term click would also fire `show`; that is acceptable (it shows the same layer's card) — but the row's `onMouseLeave` must not close the definition, and it does not (Prose owns that state). If the nested button breaks `Legend.touch.test.tsx` tap assertions, keep the legend desc as a plain span instead and note the omission in the final report.

`src/components/__tests__/Explanation.test.tsx`: `expect(screen.getByText(body)).toBeInTheDocument()` (lines ~181 and ~215, and the EMPTY/DEFAULT blurb lines) become
```tsx
    expect(container.querySelector('p')).toHaveTextContent(body);
```
using `const { container } = render(<Explanation />);` — the text is now split across spans and buttons, and `toHaveTextContent` reads the concatenated text. If the card has more than one `<p>`, select by class: `container.querySelector('[class*="layerBody"]')`.

- [ ] **Step 5: Run everything**

Run: `npm test -- --run && npx tsc -b && npm run lint`
Expected: all PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/Prose.tsx src/components/Prose.module.css src/components/__tests__/Prose.test.tsx src/components/Explanation.tsx src/components/HelpTour.tsx src/components/Legend.tsx src/components/__tests__/Explanation.test.tsx
git commit -m "Render card prose with clickable glossary terms"
```

---

### Task 11: Human verify gate, docs, review

**Files:**
- Modify: `CLAUDE.md` (one line under Rationale, only if the URL parameter needs recording — it does: `?mode=plain` is not derivable from code comments alone for a deployer)
- No other code changes expected.

- [ ] **Step 1: Run the app and check both registers by hand**

```bash
npm run dev
```
Open the printed URL. Check, and record the result of each line in the final report:
1. Header shows `Chemist | Plain language`, Chemist selected, URL has no `mode`.
2. Load caffeine preset. Hover the formula, c, h layers and a sub-token in each; the card text is the chemist text and underlined terms appear.
3. Click a term: definition block appears under the paragraph; click again closes; Esc closes; clicking elsewhere closes.
4. Click `Plain language`: URL gains `?mode=plain`; every card, the legend names, and the tour (Help) switch to plain wording. Reload: still plain.
5. Load L-alanine; hover `/t2-`, `/m0`, `/s1` in both registers; the plain stereo text keeps the "not the R or S" caveat.
6. Load the melatonin+toluene preset (or paste `InChI=1S/C13H16N2O2.C7H8/...` via a preset that has it); hover a component-2 sub-token in plain mode; atom numbers are per-component and "(component 2)" appears.
7. Hover an InChIKey block in plain mode; nothing highlights on canvas (Invariant #2).
8. Keyboard: Tab to a term button, Enter opens, Esc closes; Tab to the toggle, Enter switches.
9. Narrow the window to ~400px: header toggle wraps without overflow; definition block stays inside the card.

- [ ] **Step 2: Chemistry review of the chemist register**

Open `src/lib/layerInfo.ts`, `src/lib/subTokenInfo.ts`, `src/components/Legend.tsx`. For each Blue Book citation, confirm the cited section exists and owns the term (the PDFs are at https://iupac.qmul.ac.uk/BlueBook/PDF/P7.pdf, P8.pdf, P9.pdf; text extracts from this session sit in the scratchpad as `P7.txt`, `P8.txt`, `P9.txt`). Fix any wording that misuses a term. This step is the gate the spec requires; do not skip it.

- [ ] **Step 3: Record the URL parameter in CLAUDE.md**

Under `## Rationale`, add:
```
### Explanation register lives in the URL
`?mode=plain` switches every explanation to the plain-language register (`src/lib/audienceUrl.ts`). Not localStorage: `leaveWipe.ts` clears all storage on leave and privacy policy §3 says nothing persists.
```

- [ ] **Step 4: Full verification**

```bash
npm test -- --run && npx tsc -b && npm run lint && npm run build
```
Expected: all green; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "Document the ?mode URL parameter"
```

- [ ] **Step 6: Final review**

Dispatch `fable-advisor:fable-advisor` with `git diff dev...feat/audience-toggle`, the spec path, and this plan path. Ask for: copy accuracy against the Blue Book anchors, register discipline, accessibility of the toggle and term buttons, any Invariant #1/#2 breach. Address findings, re-run Step 4, then report.
