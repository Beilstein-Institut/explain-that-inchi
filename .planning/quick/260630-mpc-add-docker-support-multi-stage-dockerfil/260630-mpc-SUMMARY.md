---
quick_id: 260630-mpc
status: complete
date: 2026-06-30
---

# Summary: Docker support

Added a zero-config container deploy. Four new files at repo root:

- **Dockerfile** — multi-stage: `node:22-bookworm-slim` builds (`npm ci` +
  `npm run build -- --base=/`), `nginx:1.27-alpine` serves `dist/`.
- **nginx.conf** — COOP/COEP cross-origin-isolation headers (Ketcher WASM /
  SharedArrayBuffer) + SPA `try_files` fallback.
- **.dockerignore** — node_modules, dist, .git, .planning, *.log.
- **docker-compose.yml** — `web` service, `build: .`, `8080:80`,
  `restart: unless-stopped`.

## Deploy

```
docker compose up -d --build   # → http://localhost:8080
```

## Notes / decisions

- `--base=/` overrides the hardcoded `/explain-that-inchi/` GitHub-Pages base so
  the app serves from domain root. Verified locally: root-relative `/assets/...`
  paths, WASM copied to `dist/` root.
- COOP/COEP set at nginx (cleaner than the GitHub-Pages coi-serviceworker
  fallback, which then no-ops). Mirrors the Vite dev-server headers.
- `.git` excluded from build context → vite.config's git-describe falls back to
  commit `'dev'` (try/catch handles it); `App: v1.2.0 (dev)` in the footer.
- Google Fonts still load from their CDN at runtime (unchanged; needs internet).
- Docker build not executed here — no Docker daemon in this WSL distro. The
  `--base=/` build was verified locally.

## Verification

- `npm run build -- --base=/` → success, root-relative assets, WASM at dist root.
