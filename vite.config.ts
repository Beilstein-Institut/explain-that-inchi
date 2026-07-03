import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// App version + commit sha (D-08, D-09, D-10)
// ---------------------------------------------------------------------------

// Read package version without import (tsconfig.node.json lacks resolveJsonModule).
const pkgVersion: string = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }
).version;

// Resolve short commit sha: git describe -> GITHUB_SHA -> 'dev' (D-10 locked order).
// Tag-collision guard: git describe returns the bare tag name on an exactly-tagged commit,
// which would produce App: v1.2.0 (v1.2.0). Re-resolve to the actual short hash in that case.
function resolveCommitSha(): string {
  const SHA_RE = /^[0-9a-f]{7,40}$/i;

  // Step 1: try git describe
  let sha: string;
  try {
    const raw = execSync('git describe --tags --always', { encoding: 'utf-8' }).trim();
    if (SHA_RE.test(raw)) {
      return raw;
    }
    // raw is a tag name or decorated string (e.g. "v1.2.0" or "v1.2.0-3-gabcdef0")
    // Extract the trailing hash from decorated output, or re-resolve via rev-parse.
    const decorated = raw.match(/-g([0-9a-f]{7,40})$/);
    if (decorated) {
      return decorated[1];
    }
    // Exactly-tagged commit: raw is a pure tag name — re-resolve to hash (D-10 guard).
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    if (SHA_RE.test(sha)) {
      return sha;
    }
  } catch {
    // git not available or no commits yet — fall through
  }

  // Step 2: CI-provided env var ($GITHUB_SHA)
  const envSha = process.env.GITHUB_SHA;
  if (envSha) {
    return envSha.slice(0, 7);
  }

  // Step 3: dev fallback
  return 'dev';
}

const appVersion: string = pkgVersion;
const appCommit: string = resolveCommitSha();

// Ketcher bundles Node.js code without browser guards — shim process.* at
// dep-optimization time (esbuildOptions) so pre-bundled chunks compile correctly,
// and at transform time (define) for any source-level references.
const processShim: Record<string, string> = {
  global: 'globalThis',
  'process.env': JSON.stringify({ NODE_ENV: 'development', NODE_DEBUG: '' }),
  'process.pid': '0',
  'process.throwDeprecation': 'false',
  'process.traceDeprecation': 'false',
  'process.noDeprecation': 'false',
  'process.stderr': 'null',
  'process.emitWarning': 'console.warn',
  'process.nextTick': '(fn, ...args) => setTimeout(() => fn(...args), 0)',
};

// App-version globals injected into our own source only (not mirrored in optimizeDeps
// transform — those shims target Ketcher dep code; these appear only in app source).
const appDefines: Record<string, string> = {
  __APP_VERSION__: JSON.stringify(appVersion),
  __APP_COMMIT__: JSON.stringify(appCommit),
};

export default defineConfig({
  base: '/explain-that-inchi/',
  define: { ...processShim, ...appDefines },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    rolldownOptions: {
      transform: {
        define: processShim,
      },
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/ketcher-standalone/dist/binaryWasm/*.{wasm,js}',
          dest: '',
          rename: { stripBase: true },
        },
      ],
    }),
  ],
  build: {
    assetsInlineLimit: 0,
  },
});
