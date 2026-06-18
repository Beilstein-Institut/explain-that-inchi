# Stack Research

**Domain:** In-browser InChIKey display & explanation (v1.3) for the "Explain that InChI" single-page tool
**Researched:** 2026-06-18
**Confidence:** HIGH (verified against the actual installed `ketcher-core` / `ketcher-standalone` 3.12.0 source in `node_modules`, not just docs)

## TL;DR — The Critical Answer

**The InChIKey is already obtainable from the Ketcher public API you ship today. ZERO new dependencies required.**

The `Ketcher` class (the same object returned from `<Editor onInit={(ketcher) => …}>`) exposes:

```ts
getInChIKey(): Promise<string>
```

This is a typed, public method (`ketcher-core/dist/application/ketcher.d.ts:52`). It is fully wired through the standalone WASM worker — it does **not** require a backend, and it does **not** require importing `indigo-ketcher` directly. It is the exact in-browser analogue of the `getInchi()` method the project already uses.

```ts
// Already available on the ketcher instance the app holds:
const inchiKey = await ketcher.getInChIKey(); // e.g. "RYYVLZVUVIJVGH-UHFFFAOYSA-N"
```

Verdict: **Use `ketcher.getInChIKey()`. Add nothing.** This mirrors the v1.2 "zero new npm deps" outcome.

## How It Works (verified call chain)

Traced through the installed 3.12.0 source:

1. **`Ketcher.getInChIKey()`** — `ketcher-core/dist/index.js:59610`
   Serializes the current editor struct to KET, then delegates to `this.structService.getInChIKey(struct)`.
   ```js
   value: function getInChIKey() {
     // ... await getStructure(..., SupportedFormat.ket)
     return this.structService.getInChIKey(struct);
   }
   ```

2. **`StructService.getInChIKey(struct)`** interface — `ketcher-core/dist/domain/services/struct/structService.types.d.ts:150`
   ```ts
   getInChIKey: (struct: string) => Promise<string>;
   ```

3. **Standalone (WASM) implementation** — `ketcher-standalone/dist/main.js:761` (`IndigoService.getInChIKey`)
   Posts `{ type: Command.GetInChIKey, data: { struct } }` to the Indigo web worker and resolves with `msg.payload` (the InChIKey string). `Command.GetInChIKey = 11`; `WorkerEvent.GetInChIKey = "getInChIKey"`.

4. **Worker → indigo-ketcher 1.40.0 WASM** — the worker maps `ChemicalMimeType.InChIKey` → `SupportedFormat.InChIKey` (`"inchi-key"`) and runs the conversion via the same Indigo WASM module that already produces your InChI (`ketcher-standalone/dist/main.js:625`).

So the InChIKey comes from the **same indigo-ketcher 1.40.0 WASM build** that is already loaded for `getInchi()`. Same provider, same `StandaloneStructServiceProvider`, same module-level instance, same worker. No new WASM, no new asset to copy, no new bundle weight.

> Note: There is also a `RemoteStructService.getInChIKey` (posts to `indigo/convert` with `output_format: InChIKey`). That is the **backend** path and is irrelevant here — the project uses `StandaloneStructServiceProvider`, which routes to the WASM `IndigoService` above. No backend is invoked.

## Recommended Stack

### Core Technologies (all already installed — confirm, don't add)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ketcher-core | 3.12.0 (installed) | Provides `Ketcher.getInChIKey(): Promise<string>` and the `Ketcher` type | The InChIKey API lives here; already a direct dependency |
| ketcher-standalone | 3.12.0 (installed) | `StandaloneStructServiceProvider` → WASM `IndigoService.getInChIKey` | WASM-backed InChIKey, no backend; already wired and initialized at module level |
| indigo-ketcher (transitive) | 1.40.0 (installed) | Underlying WASM that hashes InChI → InChIKey | Already loaded for `getInchi()`; **do NOT import directly** (see What NOT to Use) |
| React | ^18.2 (installed) | UI for the InChIKey strip + explanation cards | Existing |
| Zustand | ^5.0 (installed) | Hold `inchiKey` string in the existing store | Existing — add at most one field |
| CSS Modules + oklch tokens | built-in (installed) | Segment color-coding + hover cards matching the InChI strip | Existing token system; no new styling dep |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | **No new library is needed for v1.3.** |

The InChIKey is a fixed, well-known **27-character format** (`AAAAAAAAAAAAAA-BBBBBBBBFV-P`) that you split **for display/coloring only** — never compute. Segment parsing is pure string slicing on a fixed grammar; do it in app code, mirroring the existing InChI parsers ported from `molecules.js`. No parsing library required.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest 3 | Unit-test the InChIKey segment splitter + store wiring | Use the existing `vitest.config.ts`; mock `getInChIKey` in component tests as you already mock `getInchi` |
| TypeScript ^5 | `getInChIKey` is already typed `(): Promise<string>` | No `@types` shim needed |

## Installation

```bash
# Core
# (nothing — getInChIKey ships in the ketcher-core/ketcher-standalone 3.12.0 you already have)

# Supporting
# (none)

# Dev dependencies
# (none — reuse existing Vitest setup)
```

## InChIKey Segment Structure (for the display layer — informational, HIGH confidence)

The InChIKey is **27 characters**, `AAAAAAAAAAAAAA-BBBBBBBBFV-P`, three hyphen-separated blocks:

| Segment | Chars | Name | Meaning (for the explanation cards) |
|---------|-------|------|-------------------------------------|
| Block 1 | 14 (positions 1–14) | Skeleton hash | Truncated SHA-256 of the **connectivity layer** (the molecular skeleton). Uppercase A–Z only. |
| Block 2 | first 8 of block 2 (positions 16–23) | Remaining-layers hash | Truncated SHA-256 of the **remaining InChI layers** (proton/stereo/isotope/charge etc.). Uppercase A–Z only. |
| Flag chars | positions 24–25 (`FV`) | Version + flags | One char encodes which **layers/flags** were present; the next encodes the InChI **version** (`S` = standard InChI v1, current). |
| Block 3 | position 27 (`P`) | Protonation char | Single char encoding net **(de)protonation** of the InChI; `N` = no adjustment (neutral). |

Key teaching points for the explanation content (matches PROJECT.md target features):
- It is a **one-way hash** (SHA-256 based) — **not reversible**, cannot be decoded back to a structure, and its segments do **NOT** map to canvas atoms (unlike the InChI layers). This is the central UX distinction from the InChI strip.
- It is **fixed-length** (always 27 chars) — useful for databases/URLs where the full InChI is too long.
- **Collision caveat**: the skeleton hash is a truncation, so collisions are theoretically possible (astronomically rare in practice); the InChIKey is a lookup/index key, not a guaranteed-unique identifier.

> Recommendation: derive segment boundaries by splitting on `-` and slicing — never by re-hashing. And, consistent with the project memory rule ("never reconstruct InChI"), **display the verbatim `getInChIKey()` output string**; only slice it for coloring, never rebuild it.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `ketcher.getInChIKey()` | Import `indigo-ketcher` WASM directly and call its conversion API | **Never for this project** — violates the CLAUDE.md "no direct indigo-ketcher import" constraint, duplicates an already-loaded WASM module, and bloats the bundle. Only relevant if you were *not* using ketcher-standalone. |
| `ketcher.getInChIKey()` | A standalone JS InChIKey lib (e.g. the official InChI Emscripten/WASM build, or `openchemlib`'s InChI support) | Only if Ketcher did not expose the key. It does, so adding any of these is pure dead weight (extra MB of WASM, extra init, second source of truth that could disagree with the InChI you already show). |
| Compute key in app | Hard-code/derive the key from the displayed InChI string by hand | **Impossible** — it's a SHA-256-derived hash; it cannot be computed without a hashing implementation. The library must produce it. `getInChIKey()` does. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Direct `import` of `indigo-ketcher` | Forbidden by CLAUDE.md ("only the ketcher public API"); it's already loaded transitively, so importing it duplicates a multi-MB WASM module and creates a second InChI source that can drift from the displayed InChI | `ketcher.getInChIKey()` |
| `openchemlib` / `openchemlib-js` for InChIKey | Adds a large second cheminformatics engine + WASM just to re-hash a structure Ketcher already hashed; risk of producing a *different* InChIKey than the InChI shown | `ketcher.getInChIKey()` |
| Official InChI library WASM (inchi-wasm / Emscripten InChI build) | Same problem: a second InChI engine to compute one string already available; extra bundle/init cost; potential version mismatch with indigo's InChI | `ketcher.getInChIKey()` |
| Any pure-JS "InChIKey from InChI" snippet | The key is a truncated SHA-256 of normalized InChI sub-strings with flag/protonation encoding — non-trivial and easy to get subtly wrong; reimplementing it is a correctness liability | `ketcher.getInChIKey()` |
| `RemoteStructService.getInChIKey` / `indigo/convert` HTTP path | That's the **backend** code path; the project is backend-free and uses `StandaloneStructServiceProvider` | `ketcher.getInChIKey()` (resolves to the WASM `IndigoService`) |
| A new Zustand store or store refactor | Overkill; v1.2 added a whole feature with no store growth | Add at most one `inchiKey: string` field (or derive it alongside the existing InChI fetch) |

## Stack Patterns by Variant

**If computing InChIKey alongside the existing live InChI (recommended):**
- In the same debounced handler that calls `getInchi(true)` on the `editor.subscribe('change', …)` event, also `await ketcher.getInChIKey()`.
- Run them concurrently (`Promise.all([ketcher.getInchi(true), ketcher.getInChIKey()])`) so the InChIKey adds no extra latency to the existing ≤150ms debounce.
- Because both go to the same single WASM worker, they will be serialized by the worker regardless — `Promise.all` just avoids an extra round-trip in app code. Either way it is cheap (the structure is already loaded).

**If the structure is empty/invalid:**
- `getInChIKey()` will reject or return empty for an empty canvas (same behavior class as `getInchi()` on empty). Reuse the existing PLSH-01 placeholder pattern — show the empty/invalid placeholder, do not surface an error.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| ketcher-core@3.12.0 | ketcher-standalone@3.12.0 | `getInChIKey` is present and identically typed in both; keep all ketcher packages pinned to 3.12.0 as already decided |
| ketcher-standalone@3.12.0 | indigo-ketcher@1.40.0 | The InChIKey is produced by this exact WASM build (already used for InChI); no version action needed |
| ketcher.getInChIKey() | React 18, Zustand 5, Vite 8 | API-surface only (returns `Promise<string>`); no framework constraints |

## Sources

- **Installed `ketcher-core` 3.12.0 source** (authoritative — read directly):
  - `node_modules/ketcher-core/dist/application/ketcher.d.ts:52` — `getInChIKey(): Promise<string>` on the `Ketcher` class — **HIGH**
  - `node_modules/ketcher-core/dist/domain/services/struct/structService.types.d.ts:150` — `getInChIKey: (struct: string) => Promise<string>` interface — **HIGH**
  - `node_modules/ketcher-core/dist/index.js:59610` — implementation (serialize KET → `structService.getInChIKey`) — **HIGH**
- **Installed `ketcher-standalone` 3.12.0 source** (authoritative):
  - `node_modules/ketcher-standalone/dist/main.js:761` — `IndigoService.getInChIKey` posts `Command.GetInChIKey` to the WASM worker — **HIGH**
  - `node_modules/ketcher-standalone/dist/main.js:625` — worker maps `ChemicalMimeType.InChIKey` → `SupportedFormat.InChIKey` (`"inchi-key"`) — **HIGH**
  - `node_modules/ketcher-standalone/package.json` — `"indigo-ketcher": "1.40.0"` — **HIGH**
- `node_modules/indigo-ketcher/package.json` — version 1.40.0, license **Apache-2.0** (already vendored; no new license obligation) — **HIGH**
- InChIKey 27-char block structure (skeleton/remaining hash, version+flag, protonation char) — IUPAC InChI technical manual / widely documented standard — **HIGH** (stable spec, not version-sensitive)

---
*Stack research for: in-browser InChIKey display & explanation (v1.3)*
*Researched: 2026-06-18*
