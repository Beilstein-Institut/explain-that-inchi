# Phase 10: Feedback Dialog, Context Capture & Entry Point — Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/FeedbackDialog.tsx` | component | request-response | `src/components/InchiSection.tsx` | role-match |
| `src/components/FeedbackDialog.module.css` | config/styles | — | `src/components/InchiSection.module.css` + `src/components/Explanation.module.css` | role-match |
| `src/App.tsx` (modified) | component | request-response | `src/App.tsx` itself | exact |
| `src/lib/buildFeedbackUrl.ts` (modified) | utility | transform | `src/lib/buildFeedbackUrl.ts` itself | exact |
| `src/lib/__tests__/buildFeedbackUrl.test.ts` (modified) | test | — | `src/lib/__tests__/buildFeedbackUrl.test.ts` itself | exact |
| `src/components/__tests__/FeedbackDialog.test.tsx` (new) | test | — | `src/__tests__/InchiSection.test.tsx` | role-match |

---

## Pattern Assignments

### `src/components/FeedbackDialog.tsx` (component, request-response)

**Analog:** `src/components/InchiSection.tsx`

**Imports pattern** (`InchiSection.tsx` lines 8–13):
```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useInchiStore } from '../store';
import styles from './InchiSection.module.css';
```
For FeedbackDialog, adapt to:
```typescript
import { useRef, useState } from 'react';
import type { FeedbackCategory, FeedbackContext, BuildFeedbackUrlResult } from '../lib/buildFeedbackUrl';
import styles from './FeedbackDialog.module.css';
```

**Props interface pattern** — FeedbackDialog receives a submit callback (App assembles the context, D-14):
```typescript
interface FeedbackDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement>;
  onSubmit: (message: string, category: FeedbackCategory) => Promise<BuildFeedbackUrlResult>;
  contextPreview: FeedbackContext;  // live snapshot for always-visible preview (D-05)
}
```
The `dialogRef` is owned by App and passed down so App can call `dialogRef.current.showModal()` from the toolbar pill without remounting the dialog (D-02).

**Native dialog open/close pattern** — use `<dialog>` `showModal()` / `close()` (D-07). Reset form on non-truncated submit (D-09):
```typescript
// In submit handler:
const result = await onSubmit(message, category);
if (!result.truncated) {
  setCategory('General');
  setMessage('');
  dialogRef.current?.close();
} else {
  setLastResult(result);  // stays open, reveals truncation UI (D-10)
}
```

**Clipboard copy + transient feedback pattern** (mirrors `InchiSection.tsx` lines 26–44, `handleCopy`):
```typescript
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

async function handleCopyFullBody() {
  try {
    await navigator.clipboard.writeText(fullBody);
    setCopied(true);
    setTimeout(() => { if (mountedRef.current) setCopied(false); }, 3000);
  } catch {
    // Show selectable fallback <pre> if clipboard API unavailable
    setClipboardFailed(true);
  }
}
```
Confirmation message: `'Copied — now paste it into the issue.'` (UI-SPEC copywriting).

**Gesture anchor pattern for popup-safe open** (D-08 — no await before .click()):
```typescript
// Pre-capture context BEFORE the async getSmiles() so the user gesture
// and anchor click are synchronous. The submit handler resolves context
// asynchronously first, then clicks the anchor synchronously.
const anchorRef = useRef<HTMLAnchorElement>(null);

// In submit handler (called from App after context assembled):
function openUrl(url: string) {
  const a = anchorRef.current;
  if (!a) return;
  a.href = url;
  a.click();
}
// Render (hidden anchor):
<a ref={anchorRef} target="_blank" rel="noopener noreferrer" style={{ display: 'none' }} />
```

**Store selector pattern** (from `InchiSection.tsx` lines 16–18):
```typescript
// Read only the inchi slice — component re-renders only when inchi changes.
const inchi = useInchiStore(state => state.inchi);
```
FeedbackDialog itself does NOT read the store. The `contextPreview` prop is assembled by App at open time (D-14). App owns store reads for feedback context.

**Always-visible context preview rendering** — reuse `.layerEg` treatment from `Explanation.module.css` for monospace block. The preview is a read-only `<pre>` or `<div>` rendering the same field set as the submission body. Source this from `contextPreview` prop fields with Phase 9 placeholders for missing values (D-15):
```typescript
const previewInchi  = contextPreview.inchi     || '(no structure loaded)';
const previewSmiles = contextPreview.smiles    || '(none)';
const previewPreset = contextPreview.presetName || '(custom molecule)';
const previewApp    = contextPreview.appVersion || '';
const previewUA     = contextPreview.userAgent  || '';
```

---

### `src/components/FeedbackDialog.module.css` (styles)

**Primary analog:** `src/components/InchiSection.module.css` (copy button, copyBtn, copiedFeedback, sectionLabel, inchiDisplay patterns)
**Secondary analog:** `src/components/Explanation.module.css` (card, layerEg, layerTitle, layerBody, lbl patterns)

**Focus-visible pattern** (`InchiSection.module.css` lines 165–169 — verbatim for all focusable controls):
```css
.submitBtn:focus-visible,
.pillBtn:focus-visible,
.textarea:focus-visible,
.copyBodyBtn:focus-visible {
  outline: 2px solid var(--c-formula);
  outline-offset: 2px;
}
```

**Copy-button hover color** (`InchiSection.module.css` lines 161–163):
```css
.copyBtn:hover {
  color: var(--c-formula);
}
```

**Copied feedback** (`InchiSection.module.css` lines 177–188):
```css
.copiedFeedback {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--c-formula);
  white-space: nowrap;
  pointer-events: none;
}
```

**Context preview block** — verbatim `.layerEg` values from `Explanation.module.css` lines 102–111:
```css
.contextPreview {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--ink-soft);
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  max-height: 160px;
  overflow-y: auto;
}
```

**Section micro-label** — verbatim `.sectionLabel` from `InchiSection.module.css` lines 13–23:
```css
.fieldLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
  text-transform: uppercase;
}
```

**Dialog surface** — mirrors `.inchiDisplay` background/border/radius from `InchiSection.module.css` lines 33–47 and `.card` from `Explanation.module.css` lines 17–25:
```css
dialog.feedbackDialog {
  background: var(--bg-canvas);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 24px;
  max-width: 560px;
  width: min(560px, calc(100vw - 32px));
  margin: auto;
}

dialog.feedbackDialog::backdrop {
  background: oklch(0.2 0.015 255 / 0.32);
}
```

**Pill button fill + hover lightening** — matches the hover idiom already in `InchiSection.module.css` line 163 (`color: var(--c-formula)`) extended to background fill:
```css
.pillBtn {
  height: 32px;
  border-radius: 999px;
  background: var(--c-formula);
  color: var(--bg-canvas);
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 160ms;
}
.pillBtn:hover {
  background: oklch(from var(--c-formula) calc(l + 0.05) c h);
}
```

**Dialog title** — verbatim `.layerTitle` values from `Explanation.module.css` lines 83–90:
```css
.dialogTitle {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 500;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
```

**Body prose** — verbatim `.layerBody` values from `Explanation.module.css` lines 93–99:
```css
.dialogIntro {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ink-soft);
  margin: 0 0 14px;
}
```

**Radio row hover** — verbatim `.legendRow` hover from `Legend.module.css` lines 7–12:
```css
.radioRow {
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 120ms;
}
.radioRow:hover {
  background: var(--line-soft);
}
```

---

### `src/App.tsx` (modified — toolbar row, dialog mount, submit handler)

**Analog:** `src/App.tsx` itself

**Existing import + ref pattern** (lines 1–12, 23–30) — add dialog ref and open state alongside existing refs:
```typescript
// Existing pattern to follow:
const ketcherRef = useRef<Ketcher | null>(null);
const isHighlightingRef = useRef(false);

// New additions follow the same useRef/useState convention:
const dialogRef = useRef<HTMLDialogElement>(null);
// Dialog open/close is local state (D-02 — must NOT touch Zustand store)
// Note: if using showModal()/close() directly on the ref, useState is optional;
// the dialog's own open attribute is the source of truth.
```

**Store read without subscription** (App.tsx line 126 pattern — `useInchiStore.getState()`):
```typescript
// At submit time, read verbatim inchi without making App a subscriber (D-14):
const inchi = useInchiStore.getState().inchi;
```

**Submit-time context assembly** (D-14 — placed in a handler inside App alongside existing Ketcher glue):
```typescript
const handleFeedbackSubmit = async (
  message: string,
  category: FeedbackCategory,
): Promise<BuildFeedbackUrlResult> => {
  const inchi = useInchiStore.getState().inchi;
  let smiles: string | undefined;
  try {
    smiles = await ketcherRef.current?.getSmiles();
  } catch {
    smiles = undefined; // silent fallback to (none) — D-12 discretion
  }
  const presetName = MOLECULES.find(m => m.id === selectedMolId)?.name;
  const context: FeedbackContext = {
    inchi,
    smiles,
    presetName,
    userAgent: navigator.userAgent,
    appVersion: `v${__APP_VERSION__} (${__APP_COMMIT__.slice(0, 7)})`,
  };
  return buildFeedbackUrl({ message, category, context });
};
```

**Toolbar row in JSX** (placed between `<Header />` and `<KetcherPanel />`, D-01):
```tsx
return (
  <div className="app">
    <Header />
    {/* New: thin toolbar row between Header and KetcherPanel */}
    <div className={styles.feedbackToolbar}>
      <button
        className={styles.pillBtn}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        Send feedback
      </button>
    </div>
    <FeedbackDialog
      dialogRef={dialogRef}
      onSubmit={handleFeedbackSubmit}
      contextPreview={/* live FeedbackContext snapshot or lazy getter */}
    />
    <KetcherPanel ... />
    <InchiSection />
    <Explanation />
  </div>
);
```
The toolbar row style (`display:flex; justify-content:flex-end`) lives in App-level CSS or an inline style, matching the existing `.app` flat-layout pattern.

---

### `src/lib/buildFeedbackUrl.ts` (modified — D-11 fullBody extension)

**Analog:** `src/lib/buildFeedbackUrl.ts` itself

**Existing export pattern** (lines 41–47):
```typescript
/** Result returned by buildFeedbackUrl. */
export interface BuildFeedbackUrlResult {
  /** The fully-composed GitHub issues/new URL. */
  url: string;
  /** True if auto-context was reduced to fit the ~7.5 KB byte budget (D-13). */
  truncated: boolean;
}
```
D-11 extension — add `fullBody` field to `BuildFeedbackUrlResult` (preferred over a sibling export to keep the single call site pattern):
```typescript
export interface BuildFeedbackUrlResult {
  url: string;
  truncated: boolean;
  /** Full untruncated issue body (message + full context). Single source of truth
   *  for the clipboard fallback (D-11) — never re-assembled by the dialog. */
  fullBody: string;
}
```
The existing `buildBody()` internal function (lines 134–170) already produces this string. The return statement (line 258) needs `fullBody: initialBody` added (the full body before any truncation):
```typescript
// Compute initialBody once before the truncation loop (already done on line 205):
const initialBody = buildBody(category, message, context);
// ... truncation logic ...
return { url, truncated, fullBody: initialBody };
```

**Export style** — pure function exports only, no classes, no default exports (matching existing `buildFeedbackUrl` pattern). All types exported at module top (lines 9–47 pattern).

---

### `src/lib/__tests__/buildFeedbackUrl.test.ts` (modified — D-11 API coverage)

**Analog:** `src/lib/__tests__/buildFeedbackUrl.test.ts` itself

**Existing describe/it/expect pattern** (lines 1–3, 8):
```typescript
import { describe, it, expect } from 'vitest';
import { buildFeedbackUrl } from '../buildFeedbackUrl';

describe('D-11: fullBody field', () => {
  it('result includes fullBody for non-truncated input', () => {
    const { fullBody } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: { inchi: 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H', smiles: 'c1ccccc1' },
    });
    expect(fullBody).toBeDefined();
    expect(fullBody).toContain('Test');
    expect(fullBody).toContain('InChI=1S/C6H6');
  });

  it('fullBody contains the untruncated InChI even when url is truncated', () => {
    const LONG_INCHI = 'InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H'.repeat(100);
    const { truncated, fullBody } = buildFeedbackUrl({
      message: 'My feedback',
      category: 'Bug',
      context: { inchi: LONG_INCHI, smiles: 'Cc1ccccc1.'.repeat(200) },
    });
    expect(truncated).toBe(true);
    // fullBody must contain the FULL (untruncated) InChI
    expect(fullBody).toContain(LONG_INCHI);
  });
});
```

---

### `src/components/__tests__/FeedbackDialog.test.tsx` (new)

**Analog:** `src/__tests__/InchiSection.test.tsx`

**Import + mock pattern** (`InchiSection.test.tsx` lines 1–38):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FeedbackDialog } from '../FeedbackDialog';

// Mock buildFeedbackUrl so tests don't depend on its internals
vi.mock('../../lib/buildFeedbackUrl', () => ({
  buildFeedbackUrl: vi.fn(),
}));

// Mock store — selector pattern matching InchiSection.test.tsx lines 19–38
vi.mock('../../store', () => { ... });
```

**Dialog ref pattern** — tests must pass a real `useRef` or mock ref:
```typescript
import { createRef } from 'react';
// In each test:
const dialogRef = createRef<HTMLDialogElement>();
// Render with:
render(<FeedbackDialog dialogRef={dialogRef} onSubmit={mockSubmit} contextPreview={{}} />);
```

**Clipboard mock pattern** (verbatim from `InchiSection.test.tsx` lines 88–95):
```typescript
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});
```

**Fake timers for transient feedback** (verbatim from `InchiSection.test.tsx` lines 139–158):
```typescript
vi.useFakeTimers();
// ... click copy ...
await act(async () => { vi.advanceTimersByTime(3100); });
expect(screen.queryByText(/Copied/)).not.toBeInTheDocument();
vi.useRealTimers();
```

**Key test cases to cover** (mirroring `InchiSection.test.tsx` PLSH-04 pattern structure):
- Dialog renders with category radio list and textarea
- Default category is `General` (D-03)
- Submit calls `onSubmit` with message and category
- Non-truncated submit: dialog closes + form resets (D-09) — test by checking `close()` was called
- Truncated submit: truncation UI appears, dialog stays open (D-10)
- Copy full body button calls `navigator.clipboard.writeText` with fullBody (D-11)
- Clipboard success shows transient "Copied — now paste it into the issue." (D-10)
- Clipboard failure reveals selectable fallback `<pre>` (UI-SPEC)
- Always-visible context preview renders Phase 9 placeholders for empty context (D-15)

---

## Shared Patterns

### CSS custom property token system
**Source:** `src/styles.css` (all ~60+ tokens)
**Apply to:** `FeedbackDialog.module.css`, toolbar pill styles

Token list used in this phase (do NOT introduce literals where a token exists):
- `--bg-canvas` — dialog surface, textarea background
- `--bg-panel` — context preview block background
- `--line` — all borders
- `--line-soft` — radio row hover background
- `--ink`, `--ink-soft`, `--ink-faint` — text hierarchy
- `--font-sans`, `--font-mono`, `--font-serif` — type families
- `--c-formula` — pill fill, submit button fill, focus rings, selected radio, copy action
- `--c-el-O` — "public" warning emphasis

### Focus-visible ring
**Source:** `src/components/InchiSection.module.css` lines 165–169 (`.copyBtn:focus-visible`)
**Apply to:** All interactive controls in FeedbackDialog and the toolbar pill
```css
/* Exact values to replicate everywhere: */
outline: 2px solid var(--c-formula);
outline-offset: 2px;
```

### Transient "Copied!" clipboard feedback
**Source:** `src/components/InchiSection.tsx` lines 26–44 (`mountedRef` + `setCopied` + 3s `setTimeout`)
**Apply to:** `FeedbackDialog.tsx` "Copy full issue body" action (D-10)

Pattern: `mountedRef.current = true` on mount, `false` in cleanup; `setCopied(false)` guarded by `if (mountedRef.current)` inside `setTimeout`. 3000ms delay. Mirrors the 3s auto-hide "Copied!" from `InchiSection`.

### useInchiStore selector read
**Source:** `src/components/InchiSection.tsx` lines 16–18
```typescript
const inchi = useInchiStore(state => state.inchi);
```
**Apply to:** `App.tsx` submit handler (read `state.inchi` at submit time via `useInchiStore.getState().inchi` — the `.getState()` form avoids adding App as a subscriber to inchi changes, per the pattern in `App.tsx` line 126).

### Store mock in tests
**Source:** `src/__tests__/InchiSection.test.tsx` lines 19–38
```typescript
vi.mock('../store', () => {
  const useInchiStore = vi.fn((selector) => selector(storeState())) as ...;
  useInchiStore.getState = () => storeState();
  return { useInchiStore };
});
```
**Apply to:** `FeedbackDialog.test.tsx` — FeedbackDialog does not read the store directly (store reads happen in App), so the store mock may not be needed. Include it only if the component or its imports transitively depend on it.

### CSS module class naming convention
**Source:** `src/components/InchiSection.module.css`, `Explanation.module.css`, `Legend.module.css`
**Apply to:** `FeedbackDialog.module.css`

Convention: camelCase class names (e.g. `contextPreview`, `fieldLabel`, `submitBtn`), no BEM, no global class names. CSS variables used directly via `var(--token)`.

---

## No Analog Found

All files have close analogs. No novel patterns required.

---

## Metadata

**Analog search scope:** `src/components/`, `src/lib/`, `src/__tests__/`, `src/lib/__tests__/`, `src/App.tsx`, `src/store.ts`
**Files read:** 16
**Pattern extraction date:** 2026-06-17
