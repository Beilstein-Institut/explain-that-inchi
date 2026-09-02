---
quick_id: 260902-hrp
status: complete
date: 2026-09-02
commits:
  - 9806032 Clear the last two lint warnings
  - af47f98 Pin Node 22 and make the test script correct on newer Node
  - 73359c3 npm audit fix: browserslist and nanoid (dev tree)
tests: 726 passed
---

# Quick Task 260902-hrp — Summary

- **Lint (9806032):** `npm run lint` → 0 problems (was 0 errors / 2 warnings). The two refs are
  now listed in the `useKetcherHighlights` effect deps; the stale `eslint-disable` in
  `ketcherEditor.ts` is gone.
- **Node (af47f98):** `.nvmrc` = `22`, `engines.node` = `22.x` (matches the Dockerfile's
  `node:22-bookworm-slim`). `npm test` now runs vitest with `NODE_OPTIONS=--no-experimental-webstorage`,
  so on the local Node 25 a plain `npm test -- --run` gives 726/726 with no manual env var.
- **Audit (73359c3):** `npm audit fix` removed 16 and changed 7 packages, lockfile only; `npm audit`
  → 0 vulnerabilities (was 2 high, dev-only).

Verified after all three: `npx tsc -b` clean, lint clean, 726 tests green.
