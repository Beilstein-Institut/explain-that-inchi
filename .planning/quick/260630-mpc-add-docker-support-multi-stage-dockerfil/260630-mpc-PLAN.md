---
quick_id: 260630-mpc
status: complete
date: 2026-06-30
---

# Quick Task 260630-mpc: Docker support for zero-config deploy

## Goal

Package the static build into a container so it deploys to any host with
`docker compose up` — no per-host configuration.

## Approach

Multi-stage Docker build: node compiles the Vite static site, nginx serves it
with the cross-origin-isolation headers Ketcher's WASM requires.

## Tasks

1. **Dockerfile** — `node:22` build stage (`npm ci` + `npm run build -- --base=/`
   to override the GitHub-Pages base path); `nginx:1.27-alpine` serve stage
   copying `dist/` + the nginx config.
2. **nginx.conf** — `Cross-Origin-Opener-Policy: same-origin` +
   `Cross-Origin-Embedder-Policy: require-corp` (mirrors the Vite dev-server
   headers; lets the bundled coi-serviceworker no-op) + SPA `try_files` fallback.
3. **.dockerignore** — exclude node_modules/dist/.git/.planning so the context
   stays small and the image rebuilds cleanly.
4. **docker-compose.yml** — single `web` service, `build: .`, host `8080:80`,
   `restart: unless-stopped`.

## Verification

- `npm run build -- --base=/` confirmed locally: emits root-relative
  `/assets/...` paths and copies WASM to `dist/` root.
- Docker build itself not run here (no Docker daemon in this WSL distro).
