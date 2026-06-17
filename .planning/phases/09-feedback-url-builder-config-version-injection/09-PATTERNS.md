# Phase 9: Feedback URL builder, config & version injection - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 6 (2 new, 4 modified)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Status | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|--------|------|-----------|----------------|---------------|
| `src/lib/buildFeedbackUrl.ts` | NEW | utility (pure lib) | transform | `src/lib/parseAuxMapping.ts` + `src/lib/handleMolSelectLogic.ts` | role-match (pure transform + object-return signature) |
| `src/lib/__tests__/buildFeedbackUrl.test.ts` | NEW | test | transform | `src/lib/__tests__/parseInchi.test.ts` | exact (colocated vitest, node env) |
| `vite.config.ts` | MODIFY | config | batch (build-time) | existing `processShim` define map (same file) | exact |
| `src/vite-env.d.ts` | MODIFY | config (types) | n/a | `src/vite-env.d.ts` (same file) | exact (add `declare const` for injected globals) |
| `package.json` | MODIFY | config | n/a | `package.json` (same file) | exact (version field bump) |
| `.github/workflows/deploy.yml` | MODIFY | config (CI) | n/a | `.github/workflows/deploy.yml` (same file) | exact (add env to Build step) |

> Note: `vitest.config.ts` is intentionally separate from `vite.config.ts` (Vite 8 + Vitest 3 plugin-type conflict — per CONTEXT.md code_context). Do NOT merge them. The new test runs under the `environment: 'node'` default; it needs no entry in `environmentMatchGlobs` (those are for `.tsx`/hooks happy-dom tests only). `globals: true` is set, but the established `src/lib/__tests__` files all import `{ describe, it, expect }` from `vitest` explicitly — follow that.

## Pattern Assignments

### `src/lib/buildFeedbackUrl.ts` (utility, transform — pure, DOM-free)

**Analog (signature/return shape):** `src/lib/handleMolSelectLogic.ts`
**Analog (file header + types + named-export style):** `src/lib/parseInchi.ts`, `src/lib/parseAuxMapping.ts`

**File-header comment pattern** — every pure lib opens with a purpose + provenance + decision-anchor comment block (`src/lib/parseInchi.ts` lines 1-3, `src/lib/parseAuxMapping.ts` lines 1-3):
```typescript
// AuxInfo parsing — pure module, no browser globals, Node-compatible for Vitest.
// Parses the N: field from Ketcher's getInchi(true) AuxInfo block.
// Based on CONTEXT.md D-10/D-11 and RESEARCH.md Pattern 3.
```
For the new file: state "pure, DOM-free" + cite the governing decisions (D-01..D-13) the same way.

**Exported-type + section-divider pattern** (`src/lib/parseInchi.ts` lines 5-30) — declare and `export` the public interfaces at the top, separated by banner comments:
```typescript
// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export type LayerType = 'version' | 'formula' | 'c' | /* ... */ ;

export interface Layer {
  type: LayerType;
  prefix: string;
  text: string;
  atoms: number[];   // canonical 1-based indices (per D-07)
  bonds: number[][];
}
```
Apply this for `FeedbackCategory` (a string-union of the five categories), the `context` param interface, and the `{ url: string; truncated: boolean }` result interface.

**Object-options / object-return signature pattern** (`src/lib/handleMolSelectLogic.ts` lines 5-12, 34-35) — when a function takes several related inputs, the codebase declares an `interface ...Opts` and destructures it. The result-as-object shape (`{ url, truncated }`) mirrors this convention:
```typescript
export interface HandleMolSelectOpts { id: string; molecules: MoleculePreset[]; /* ... */ }

export async function handleMolSelectLogic(opts: HandleMolSelectOpts): Promise<void> {
  const { id, molecules, ketcherRef, /* ... */ } = opts;
```
`buildFeedbackUrl` is synchronous (no `async`/`Promise`) — it is a pure transform like the parsers, not an effect like `handleMolSelectLogic`.

**Named-export-with-JSDoc pattern** (`src/lib/parseInchi.ts` lines 53-58, `src/lib/parseAuxMapping.ts` lines 8-13) — every exported function carries a `/** ... */` block describing behavior and citing the source decision. No default exports anywhere in `src/lib/`. Use `export function buildFeedbackUrl(...)`.

**Inline regex/string-machine style** (`src/lib/parseAuxMapping.ts` lines 23-47) — small inline IIFEs and explicit `for`/`while` loops with comments documenting each branch. Keep the byte-budget truncation loop (D-13: drop SMILES → trim InChI) explicit and commented the same way.

**Repo URL constant (NEW — no analog exists):** `grep` for `cm-beilstein` / `issues/new` returns nothing across the repo. Introduce a module-local `const` for the base issues URL (`https://github.com/cm-beilstein/explain-that-inchi/issues/new`) at the top of this module, per CONTEXT.md integration-points note.

**Encoding pattern (from RESEARCH.md / D-11, no codebase analog):** single `URLSearchParams` pass — build params, call `.toString()`, append to the base URL once. No nested `encodeURIComponent`. Use `new TextEncoder().encode(url).length` for the ~7.5 KB byte-budget check (D-13).

---

### `src/lib/__tests__/buildFeedbackUrl.test.ts` (test, transform)

**Analog:** `src/lib/__tests__/parseInchi.test.ts` (exact — same dir, same node env, same import style)

**Import + describe/it/expect pattern** (lines 1-10):
```typescript
import { describe, it, expect } from 'vitest';
import { parseInchi, parseConnectionBonds, /* ... */ } from '../parseInchi';

describe('parseInchi', () => {
  it('parses benzene InChI into 4 layers with correct types', () => {
    const layers = parseInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    expect(layers[0]).toMatchObject({ type: 'version', text: '1S' });
```
Import from `'../buildFeedbackUrl'` (sibling-up relative path). Import test API explicitly from `'vitest'` even though `globals: true` — matches every existing `src/lib/__tests__` file.

**Named-requirement describe-block pattern** (lines 103, 154, 197) — group tests under the requirement/decision they verify:
```typescript
describe('INCHI-06: multi-fragment enrichLayers', () => {
  const TOLUENE_BENZENE_INCHI = 'InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H';
  it('Test D: formulaLayer.atoms has 13 entries for toluene+benzene', () => { /* ... */ });
```
Map blocks to this phase's success criteria, e.g. `describe('FEED-04: title prefix + labels', ...)`, `describe('FEED-05: round-trip + - / ; , ( ) # =', ...)`, `describe('FEED-07: byte-budget truncation', ...)`, `describe('FEED-09: version string in context', ...)`.

**Shared fixture-as-const pattern** (line 104, 158) — hoist long input strings to a `const` at the top of the `describe`. For the truncation tests, use a long multi-fragment repro InChI/SMILES const (NOT a short preset — D-13 / specifics), so the byte-budget path actually fires.

**Round-trip assertion approach (FEED-05 / D-11):** parse the produced `url` back with `new URL(url)` + `.searchParams.get('body')` and assert the decoded body contains the literal special chars `+ / ; , ( ) # =` and newlines intact. There is no existing round-trip analog; model the test shape on the existing `expect(...).toContainEqual(...)` / `.toContain(...)` style (lines 34, 148-150).

---

### `vite.config.ts` (config, build-time injection)

**Analog:** the existing `processShim` define map in the same file (lines 8-35) — exact precedent.

**Define-map pattern** — a `Record<string, string>` of JSON-stringified replacements applied at BOTH `define` (transform-time) and `optimizeDeps.rolldownOptions.transform.define` (dep-optimization-time):
```typescript
const processShim: Record<string, string> = {
  global: 'globalThis',
  'process.env': JSON.stringify({ NODE_ENV: 'development', NODE_DEBUG: '' }),
  // ...
};

export default defineConfig({
  base: '/explain-that-inchi/',
  define: processShim,
  // ...
  optimizeDeps: { rolldownOptions: { transform: { define: processShim } } },
});
```
For version injection: add `__APP_VERSION__` / `__APP_COMMIT__` (names at Claude's discretion per D-09) as JSON-stringified values to the `define` object. CRITICAL: values must be `JSON.stringify(...)` — `define` does raw text substitution, so a bare string would be injected as an identifier. The version `define` only needs to be in the top-level `define`; the `optimizeDeps` transform mirror exists for the process shim (Ketcher dep code) and the new app-version globals appear only in our own source, so they do not need the `optimizeDeps` mirror (but adding them there too is harmless and consistent).

**Reading the sha + package version (NEW logic, D-10):** at the top of `vite.config.ts`, resolve the short sha via `child_process.execSync('git describe --tags --always')` (trimmed), falling back to `process.env.GITHUB_SHA?.slice(0, 7)`, then `'dev'` (D-09/D-10 order). Read the version from `package.json` (e.g. `import pkg from './package.json'` with `resolveJsonModule`, or `process.env.npm_package_version`). Wrap `execSync` in try/catch so local builds with no git/tags fall back cleanly to `(dev)`.

---

### `src/vite-env.d.ts` (config, type declarations)

**Analog:** the same file (currently just `/// <reference types="vite/client" />`).

The Vite `define` globals must be declared so TypeScript (`tsc -b` runs in the `build` script) sees them. Add ambient declarations:
```typescript
/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
```
(Match the exact `define` key names chosen in `vite.config.ts`.)

---

### `package.json` (config)

**Analog:** the same file (line 4).

Single-field bump (D-08), nothing else changes:
```json
{
  "name": "explain-that-inchi",
  "private": true,
  "version": "0.0.0",
```
Change `"version": "0.0.0"` → `"version": "1.2.0"`. If the builder/vite config reads the version via `import pkg from './package.json'`, ensure `tsconfig` has `resolveJsonModule` (verify; do not assume).

---

### `.github/workflows/deploy.yml` (config, CI)

**Analog:** the same file — the existing `Build` step (lines 29-30).

The current Build step:
```yaml
      - name: Build
        run: npm run build
```
`actions/checkout@v4` (line 18) does a shallow clone by default, so `git describe --tags` in CI may fail / find no tags — `$GITHUB_SHA` is the locked CI fallback (D-10). `$GITHUB_SHA` is already present in the GitHub Actions environment automatically; the vite config reads `process.env.GITHUB_SHA` directly, so NO workflow change is strictly required for the env var to exist. If `git describe` is preferred even in CI, add `with: { fetch-depth: 0 }` to the checkout step so tags are available. Keep the change minimal — prefer relying on the auto-provided `$GITHUB_SHA` fallback over fetching full history unless tags are needed.

---

## Shared Patterns

### Pure-module file header
**Source:** `src/lib/parseInchi.ts` lines 1-3, `src/lib/parseAuxMapping.ts` lines 1-3
**Apply to:** `src/lib/buildFeedbackUrl.ts`
Three-line block: what it does · "pure module, no browser globals, Node-compatible for Vitest" · the governing CONTEXT decisions (D-xx) it implements.

### Named exports + JSDoc, no default export
**Source:** all of `src/lib/*.ts`
**Apply to:** `src/lib/buildFeedbackUrl.ts`
Export functions and types by name with a `/** */` block citing the decision. No `export default`.

### Colocated vitest, explicit imports, requirement-named describes
**Source:** `src/lib/__tests__/parseInchi.test.ts` lines 1-10, 103, 154
**Apply to:** `src/lib/__tests__/buildFeedbackUrl.test.ts`
`import { describe, it, expect } from 'vitest'`; one `describe` per requirement (FEED-04/05/07/09); hoist long input strings to a `const`.

### JSON.stringify'd Vite define
**Source:** `vite.config.ts` lines 8-22
**Apply to:** version/commit injection in `vite.config.ts`
All `define` values are `JSON.stringify(...)`'d strings (raw text substitution semantics). Ambient `declare const` in `src/vite-env.d.ts` keeps `tsc -b` happy.

## No Analog Found

No file is fully without an analog, but these sub-patterns have NO existing codebase precedent and must come from RESEARCH.md / CONTEXT.md decisions:

| Concern | File | Source to use |
|---------|------|---------------|
| GitHub repo / `issues/new` URL constant | `buildFeedbackUrl.ts` | CONTEXT integration-points (`cm-beilstein/explain-that-inchi`); grep confirms none exists |
| Single-pass `URLSearchParams` encoding | `buildFeedbackUrl.ts` | RESEARCH.md / D-11 |
| `TextEncoder` ~7.5 KB byte-budget guard + deterministic truncation | `buildFeedbackUrl.ts` | RESEARCH.md PITFALLS #1 / D-13 |
| `@`-neutralization of user text | `buildFeedbackUrl.ts` | D-12 |
| `git describe` / `$GITHUB_SHA` / `dev` sha resolution | `vite.config.ts` | D-09 / D-10 |

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/__tests__/`, `vite.config.ts`, `vitest.config.ts`, `package.json`, `.github/workflows/`, `src/vite-env.d.ts`
**Files scanned:** 8 read in full or in part
**Pattern extraction date:** 2026-06-17
