# Architecture Research — v1.2 Feedback Feature

**Domain:** In-app prefilled-GitHub-issue feedback feature integrated into an existing React 18 + Zustand + Ketcher static SPA
**Researched:** 2026-06-17
**Confidence:** HIGH (grounded in the real source files; no external API dependency — pure client-side URL construction)

> NOTE: The existing `.planning/research/ARCHITECTURE.md` documents the v1.0 app architecture and is preserved. This file is the v1.2 feedback-feature slice.

## Summary verdict

The feature drops in cleanly. It is **additive** — one new leaf component (`FeedbackModal`), one trigger (`FeedbackButton`, or a button slot in `Header`), one **pure** library module (`lib/feedbackUrl.ts`), and one tiny config module (`lib/feedbackConfig.ts`). The only existing files that must change are `App.tsx` (mount the modal + provide a `getContext()` callback) and `vite.config.ts` + `vite-env.d.ts` (build-time version injection). **The Ketcher canvas, the store, the highlight pipeline, and the InChI parse path are untouched.**

The single non-obvious architectural decision: **where to read the current molecule context.** The live InChI is in the Zustand store; the preset name/SMILES is **not** — `selectedMolId` lives in `App.tsx` local `useState`, and SMILES comes from the `MOLECULES` array. See "Data Flow → Context capture" below.

## Standard Architecture

### System Overview (feature slice within the existing app)

```
┌──────────────────────────────────────────────────────────────────┐
│                         App.tsx (orchestrator)                     │
│   owns: ketcherRef, selectedMolId(useState), isReady, generationRef│
│                                                                    │
│   ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│   │  Header  │  │ KetcherPanel │  │ InchiSection │  │Explanation│ │
│   │ +feedback│  │ (NEVER       │  │ (store sel.) │  │(store sel)│ │
│   │  trigger │  │  remounts)   │  │              │  │           │ │
│   └────┬─────┘  └──────┬───────┘  └──────────────┘  └──────────┘ │
│        │ open()        │ onInit → ketcherRef                       │
│        ▼               │                                           │
│   ┌─────────────────────────────────────────┐                     │
│   │  FeedbackModal (NEW, leaf)               │                     │
│   │  local form state: message, category     │                     │
│   │  on submit → buildFeedbackUrl(...) →      │                     │
│   │  window.open(url, '_blank')               │                     │
│   └──────────────┬────────────────────────────┘                    │
│                  │ reads context via getFeedbackContext() callback   │
└──────────────────┼─────────────────────────────────────────────────┘
                   ▼
   ┌────────────────────────────────────────────────────────┐
   │  Context sources (read at SUBMIT time, not render time)  │
   │   • InChI string  ← useInchiStore.getState().inchi       │
   │   • SMILES         ← ketcherRef.current.getSmiles()      │
   │   • preset name    ← MOLECULES[selectedMolId] (App state)│
   │   • UA             ← navigator.userAgent                 │
   │   • app version    ← import.meta.env.VITE_APP_VERSION    │
   └────────────────────────────┬─────────────────────────────┘
                                ▼
   ┌────────────────────────────────────────────────────────┐
   │  lib/feedbackUrl.ts  (PURE — no DOM, no React, no async) │
   │   buildFeedbackUrl(input) → { url, truncated }           │
   │   + lib/feedbackConfig.ts (repo slug, labels, caps)      │
   └────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component / Module | Responsibility | New or Modified |
|--------------------|----------------|-----------------|
| `lib/feedbackUrl.ts` | **Pure** function: `(message, category, context) → encoded issues/new URL`. Owns title/body templating, label mapping, 8 KB truncation. No DOM, no async, no React. | **NEW** |
| `lib/feedbackConfig.ts` | Constants: repo slug `cm-beilstein/explain-that-inchi`, category→label map, URL byte cap, truncation limits. | **NEW** |
| `lib/getFeedbackContext.ts` | **Impure** collector: snapshots InChI, SMILES, preset name, UA, version at submit time. Thin; orchestrated from a callback App provides. | **NEW (optional — can inline in App)** |
| `components/FeedbackModal.tsx` | Dialog UI: textarea (message), category radio/select, privacy notice, "Open GitHub issue" button. Local form state only. Calls `buildFeedbackUrl` + opens URL. | **NEW** |
| `components/FeedbackButton.tsx` | Trigger control, on-brand. Toggles modal open state. (May live inside `Header` instead of standalone.) | **NEW** |
| `App.tsx` | Holds `feedbackOpen` useState, mounts `<FeedbackModal>` as a sibling of existing sections, passes a `getContext` callback that reads `ketcherRef` + `selectedMolId` + store. | **MODIFIED** |
| `Header.tsx` | Optionally hosts the feedback trigger button. | **MODIFIED (optional)** |
| `vite.config.ts` | Inject `VITE_APP_VERSION` / commit SHA via `define`. | **MODIFIED** |
| `vite-env.d.ts` | Type the new `import.meta.env.VITE_APP_VERSION`. | **MODIFIED** |

## Recommended Project Structure

```
src/
├── App.tsx                          # MODIFIED: feedbackOpen state + <FeedbackModal/> + getContext
├── components/
│   ├── Header.tsx                   # MODIFIED (optional): hosts FeedbackButton
│   ├── FeedbackButton.tsx           # NEW: trigger
│   ├── FeedbackModal.tsx            # NEW: form + submit
│   └── FeedbackModal.module.css     # NEW: oklch-token-styled dialog
├── lib/
│   ├── feedbackUrl.ts               # NEW: PURE builder (the testable core)
│   ├── feedbackConfig.ts            # NEW: repo slug, labels, caps
│   ├── getFeedbackContext.ts        # NEW (optional): impure snapshot collector
│   └── __tests__/
│       └── feedbackUrl.test.ts      # NEW: unit tests, no DOM
└── vite-env.d.ts                    # MODIFIED: VITE_APP_VERSION type
```

### Structure Rationale

- **`lib/feedbackUrl.ts` is the architectural keystone.** Everything hard (encoding, length cap, templating, label mapping) lives behind a pure boundary that takes a plain `FeedbackContext` object. This mirrors the existing project pattern: `parseInchi.ts`, `parseAuxMapping.ts`, `handleMolSelectLogic.ts`, `highlightUtils.ts` are all pure-ish logic modules with co-located `__tests__/`. The feedback feature follows the same shape.
- **Context collection stays out of the pure module.** `getSmiles()` is async and `navigator`/`import.meta.env` are environment reads — keep them in an impure collector (or inline in App's callback) so the URL builder stays trivially testable.
- **FeedbackModal is a leaf sibling, not a wrapper.** It mounts beside `KetcherPanel`, never around it — see the "never remount Ketcher" constraint below.

## Architectural Patterns

### Pattern 1: Pure URL builder behind a plain-object boundary

**What:** `buildFeedbackUrl` accepts `(message, category, context)` where `context` is a serializable struct, and returns a string + truncation flag. No `window`, no `navigator`, no `fetch`, no React.
**When to use:** Always — this is the unit-testable core and the 8 KB truncation logic lives here.
**Trade-offs:** Requires the caller to gather context first (async `getSmiles`), but that separation is exactly what makes the builder testable with zero mocks.

```typescript
// lib/feedbackUrl.ts
export type FeedbackCategory = 'bug' | 'suggestion' | 'unclear';

export interface FeedbackContext {
  inchi: string;        // '' when canvas empty
  smiles: string;       // '' when unavailable
  presetName: string | null;
  userAgent: string;
  appVersion: string;
}

export interface BuildFeedbackUrlResult {
  url: string;
  truncated: boolean;   // surfaced so UI can note "context was shortened"
}

export function buildFeedbackUrl(
  message: string,
  category: FeedbackCategory,
  ctx: FeedbackContext,
): BuildFeedbackUrlResult {
  // 1. title  = `${CATEGORY_PREFIX[category]} ${firstLine(message)}`
  // 2. body   = markdown template interleaving message + context block
  // 3. labels = CATEGORY_LABELS[category].join(',')
  // 4. assemble URL with encodeURIComponent on each query value
  // 5. if byteLength(url) > URL_BYTE_CAP → truncate inchi/smiles with ' …[truncated]'
  //    and rebuild; set truncated = true
}
```

### Pattern 2: Context read at submit time via `ketcherRef` + store `getState()` (stale-closure-safe)

**What:** Never capture InChI/SMILES into the modal's render closure. Read them imperatively at the moment the user clicks submit — exactly mirroring App.tsx's existing discipline (`useInchiStore.getState().setInchiData(...)` dispatched without subscribing, and `ketcherRef.current` read inside the debounced handler rather than from a closure).
**When to use:** For all auto-captured context. The modal can be open for a while and the user may keep drawing; submit-time reads guarantee freshness without re-renders.
**Trade-offs:** `getSmiles()` is async, so the submit handler is async — see Anti-Pattern 4 for the `window.open`-after-`await` popup-blocker caveat and the recommended `<a href>` mitigation.

```typescript
// In App.tsx — passed to <FeedbackModal getContext={...} />
const getFeedbackContext = useCallback(async (): Promise<FeedbackContext> => {
  const inchi = useInchiStore.getState().inchi;            // store snapshot
  const ketcher = ketcherRef.current;                       // ref, no closure staleness
  let smiles = '';
  try { smiles = ketcher ? await ketcher.getSmiles() : ''; } catch { /* empty canvas */ }
  const preset = MOLECULES.find(m => m.id === selectedMolId) ?? null;
  return {
    inchi,
    smiles,
    presetName: preset?.name ?? null,
    userAgent: navigator.userAgent,
    appVersion: import.meta.env.VITE_APP_VERSION ?? 'dev',
  };
}, [selectedMolId]); // selectedMolId is React state → legitimately a dependency
```

> **Source-of-truth decision (answers question 2):**
> - **InChI → read from the Zustand store** (`useInchiStore.getState().inchi`). It is the *verbatim* Ketcher output already validated/parsed by the live pipeline, and the MEMORY rule "never reconstruct InChI" applies — the store holds the canonical passthrough string. Calling `ketcher.getInchi(true)` again would re-run WASM, return the AuxInfo-concatenated form, and risk drift from what the user sees on screen. **Use the store.**
> - **SMILES → read from Ketcher** (`ketcher.getSmiles()`). SMILES is *not* in the store, and the stored preset SMILES (`MOLECULES[].smiles`) only reflects the last preset, not subsequent free-hand edits. `getSmiles()` reflects the actual current canvas. **Use Ketcher.**
> - **Preset name → `MOLECULES.find(id === selectedMolId)`**, reading `selectedMolId` from App state. Note `selectedMolId` becomes `null` the moment the user free-draws (App.tsx line 81), so a `null` preset name correctly means "user-modified / custom structure."

### Pattern 3: Modal as conditionally-rendered sibling, Ketcher as always-mounted

**What:** Gate only the modal on `feedbackOpen`. The `KetcherPanel` stays unconditionally in the tree.
**When to use:** Always here — the whole app architecture is built around the WASM editor never re-initializing (`structServiceProvider` at module scope, `ketcherRef` not state, `onInit` fires once).
**Trade-offs:** None. The modal is a leaf; toggling it cannot remount siblings.

```tsx
// App.tsx return — additive, KetcherPanel untouched
<div className="app">
  <Header onFeedbackClick={() => setFeedbackOpen(true)} />
  <KetcherPanel ... />            {/* unchanged, never conditional */}
  <InchiSection />
  <Explanation />
  {feedbackOpen && (
    <FeedbackModal
      getContext={getFeedbackContext}
      onClose={() => setFeedbackOpen(false)}
    />
  )}
</div>
```

## Data Flow

### Context capture flow (submit)

```
User clicks "Open GitHub issue"
    ↓
FeedbackModal.handleSubmit (async)
    ↓
await getContext()  ──→ store.getState().inchi
    │                ──→ ketcherRef.current.getSmiles()  (await)
    │                ──→ MOLECULES[selectedMolId].name
    │                ──→ navigator.userAgent
    │                ──→ import.meta.env.VITE_APP_VERSION
    ↓
buildFeedbackUrl(message, category, context)   [PURE]
    ↓  { url, truncated }
window.open(url) / navigate <a href>
    ↓
(optional) if truncated → show inline note in modal
```

### State management

```
Existing: useInchiStore  ── inchi/layers/hover ── (UNCHANGED; read-only access)
New (local to App):   feedbackOpen: useState<boolean>
New (local to Modal): message: useState<string>, category: useState<FeedbackCategory>
```

The feature deliberately **adds no fields to the Zustand store.** Feedback is ephemeral UI state; it has no business in the shared InChI store. This keeps `store.test.ts` invariants intact.

## Build-time version injection (answers question 4)

Repo slug and labels are **constants**, not env:

```typescript
// lib/feedbackConfig.ts
export const REPO_SLUG = 'cm-beilstein/explain-that-inchi';
export const ISSUE_NEW_URL = `https://github.com/${REPO_SLUG}/issues/new`;
export const CATEGORY_LABELS: Record<FeedbackCategory, string[]> = {
  bug:        ['bug', 'feedback'],
  suggestion: ['enhancement', 'feedback'],
  unclear:    ['documentation', 'feedback'],
};
export const CATEGORY_PREFIX: Record<FeedbackCategory, string> = {
  bug: '[Bug]', suggestion: '[Idea]', unclear: '[Unclear]',
};
export const URL_BYTE_CAP = 8000; // headroom under GitHub's ~8 KB practical limit
```

> **Label caveat (MEDIUM confidence):** GitHub silently drops `labels=` values that don't already exist in the repo — the issue still opens, just without the label. Verify the `feedback`/`bug`/`enhancement`/`documentation` labels exist in `cm-beilstein/explain-that-inchi`, or fall back to title-prefix-only categorization. One-line repo-settings action, not a code change.

App version via Vite `define` (consistent with the existing `processShim` define pattern already in `vite.config.ts`):

```typescript
// vite.config.ts  — add to defineConfig
import { execSync } from 'node:child_process';
const appVersion = (() => {
  try { return execSync('git describe --tags --always').toString().trim(); }
  catch { return 'dev'; }
})();

export default defineConfig({
  define: {
    ...processShim,
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  ...
});
```

```typescript
// vite-env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_APP_VERSION: string; }
interface ImportMeta { readonly env: ImportMetaEnv; }
```

> Note: `package.json` version is currently `0.0.0`. Recommend injecting `git describe --tags --always` (yields e.g. `v1.1-3-gabc1234` or a short SHA) since the repo ships by tag/CD, not by bumping `package.json`. Confirm during planning.

## 8 KB truncation strategy (answers question 3)

GitHub's new-issue URL has a practical browser cap around 8 KB; long InChI/SMILES (e.g. atorvastatin, large drawn structures) can blow past it.

Algorithm inside `buildFeedbackUrl` (all pure, byte-measured on the *encoded* string):
1. Build the full URL.
2. If `byteLength(url) <= URL_BYTE_CAP` → return `{ url, truncated: false }`.
3. Else truncate the two largest context fields (InChI, SMILES) to a budget, appending a literal ` …[truncated]` marker, and rebuild.
4. Message text is **never** truncated (it is the user's words) — only auto-captured context is shortened.
5. Return `{ url, truncated: true }` so the modal can show "Some context was shortened to fit GitHub's URL limit."

Measure bytes with `new TextEncoder().encode(url).length` (UTF-8 byte count, not `.length` which counts UTF-16 code units). `TextEncoder` is available in the jsdom test env.

## Suggested build order (answers question 5 — TDD-first)

Ordered by dependency; each step independently testable, matching the project's 206-test discipline.

1. **`lib/feedbackConfig.ts`** — constants only. No tests needed (or a trivial shape test). *No deps.*
2. **`lib/feedbackUrl.ts` + `lib/__tests__/feedbackUrl.test.ts`** — **TDD core.** Write tests first: encoding correctness, label mapping per category, title prefix, body template, the 8 KB truncation branch (feed an oversized InChI, assert `truncated === true` and `byteLength <= cap`), empty-canvas case (`inchi === ''`). **Fully DOM-free, fastest to land, highest value.** *Depends on: config.*
3. **`vite.config.ts` + `vite-env.d.ts`** — version injection. Verify with a quick `import.meta.env.VITE_APP_VERSION` log in dev; type-checks via `tsc`. *Independent.*
4. **`lib/getFeedbackContext.ts`** (or inline App callback) — impure collector. Optionally test with a mocked ketcher (`getSmiles` stub) + store seed, asserting it produces a well-formed `FeedbackContext`. *Depends on: store, MOLECULES, Ketcher API shape.*
5. **`components/FeedbackModal.tsx` + `.module.css`** — UI. Testable with RTL: renders fields, calls injected `getContext` + asserts the opened URL contains the message (mock `window.open`). The pure builder is already proven, so component tests stay light. *Depends on: builder, config.*
6. **`components/FeedbackButton.tsx`** (or Header slot) — trigger. Trivial. *Depends on: nothing structural.*
7. **`App.tsx` wiring** — add `feedbackOpen` state, `getFeedbackContext` callback, mount modal. Smallest diff, done last so all deps exist. *Depends on: all above.*

**Independently testable units:** steps 2 (pure, no DOM — the crown jewel), 4 (mocked deps), 5 (RTL with mocks). Steps 1, 3, 6, 7 are config/wiring with minimal or no dedicated tests.

## Anti-Patterns

### Anti-Pattern 1: Conditionally rendering anything that wraps KetcherPanel
**What people do:** Wrap the layout in a modal-aware container or move `KetcherPanel` behind a conditional/portal that toggles with feedback state.
**Why it's wrong:** Any remount re-runs Ketcher's `onInit`, re-initializing the WASM worker (the entire app architecture — module-level `structServiceProvider`, `ketcherRef`, once-only `onInit` — exists to prevent this) and would wipe the drawn molecule.
**Do this instead:** Mount `FeedbackModal` as a **leaf sibling** gated on its own `feedbackOpen` boolean. Use an overlay/portal for the modal *only*, never for the canvas.

### Anti-Pattern 2: Capturing context into render closures (stale data)
**What people do:** `const inchi = useInchiStore(s => s.inchi)` in the modal, then send that captured value on submit.
**Why it's wrong:** The modal can sit open while the user keeps editing; a subscribed value is fine for *display* but the **submit** must reflect the true current state. Reading `ketcherRef.current` from a stale closure repeats the exact bug class App.tsx already guards against (it deliberately reads `ketcherRef.current` and `useInchiStore.getState()` imperatively inside the debounced handler, not from closures).
**Do this instead:** Read everything imperatively at submit time via `getState()` and `ketcherRef.current` (Pattern 2). If you also want a live preview in the modal, subscribe for *display* but still re-read at submit.

### Anti-Pattern 3: Re-running `getInchi()` to populate feedback
**What people do:** Call `ketcher.getInchi(true)` in the feedback path to "get the freshest InChI."
**Why it's wrong:** Returns the AuxInfo-concatenated string, re-runs WASM, and can diverge from the verbatim string the user sees (violates the MEMORY "never reconstruct / always passthrough" rule).
**Do this instead:** Read `useInchiStore.getState().inchi` — already the verbatim, on-screen string.

### Anti-Pattern 4: `await` before `window.open` causing popup blocks
**What people do:** `await getContext()` (which awaits `getSmiles()`) then `window.open()` — some browsers treat the post-await `window.open` as non-user-initiated and block it.
**Why it's wrong:** The new tab silently fails to open.
**Do this instead:** Either (a) accept the minor risk and detect `window.open(...) === null`, then show a visible fallback link; or (b) **recommended** — pre-fetch SMILES into modal-local state when the modal opens, compute the href reactively, and render a real `<a href={url} target="_blank" rel="noopener noreferrer">` as the submit control. A real link is the most popup-blocker-proof and most accessible.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub Issues | Prefilled `issues/new?title=&body=&labels=` GET URL opened in new tab. No API, no auth, no token. | ~8 KB URL cap; nonexistent labels silently dropped; user needs a GitHub account to actually submit (accepted tradeoff per PROJECT.md). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| FeedbackModal ↔ App | `getContext()` callback prop (App owns ketcherRef + selectedMolId) | Keeps the modal ignorant of Ketcher/store internals; modal just calls a function. |
| getContext ↔ Zustand store | `useInchiStore.getState().inchi` (non-subscribing read) | Same pattern App.tsx uses to dispatch — read without becoming a subscriber. |
| getContext ↔ Ketcher | `ketcherRef.current.getSmiles()` (async) | Wrap in try/catch — throws on empty/disconnected canvas, same as `getInchi`. |
| buildFeedbackUrl ↔ everything | Plain `FeedbackContext` object in, `{ url, truncated }` out | Pure boundary — the testable seam. |
| version ↔ build | `import.meta.env.VITE_APP_VERSION` via Vite `define` | Reuses the existing `define` mechanism in vite.config.ts. |

## Sources

- `src/App.tsx` — orchestrator: `ketcherRef`, `selectedMolId` (useState), `isReady`, generation/highlighting refs, the debounced `getInchi(true)` + `getState().setInchiData` dispatch pattern, "never move provider inside component" comment. HIGH.
- `src/store.ts` — Zustand store shape; `inchi` field; non-subscribing `getState()` dispatch usage note. HIGH.
- `src/components/InchiSection.tsx` — confirms `inchi` read via store selector; `navigator.clipboard` try/catch precedent for graceful API-unavailable handling. HIGH.
- `src/components/Header.tsx` — current header markup; candidate host for the trigger. HIGH.
- `src/data/molecules.ts` — `MoleculePreset { id, name, formula, smiles }`; SMILES live here, not in the store. HIGH.
- `src/lib/handleMolSelectLogic.ts` — confirms `selectedMolId` lifecycle (set on preset, cleared on free-draw via App's handleChange). HIGH.
- `vite.config.ts` — existing `define`/`processShim` mechanism reused for version injection. HIGH.
- `.planning/PROJECT.md` — v1.2 milestone scope, repo slug `cm-beilstein/explain-that-inchi`, 8 KB cap constraint, GitHub-account tradeoff. HIGH.
- MEMORY: "never reconstruct InChI — always display verbatim Ketcher output." HIGH — drives the "read InChI from store, not re-run getInchi" decision.
- GitHub prefilled-issue URL params (`title`/`body`/`labels`) + ~8 KB practical URL limit + silent-drop of unknown labels — MEDIUM (well-established community behavior; verify labels exist in repo).

---
*Architecture research for: in-app prefilled-GitHub-issue feedback, integrated into the existing Explain-that-InChI SPA*
*Researched: 2026-06-17*
