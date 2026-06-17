import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['src/__tests__/**/*.test.tsx', 'happy-dom'],
      ['src/components/__tests__/**/*.test.tsx', 'happy-dom'],
      ['src/hooks/__tests__/**/*.test.ts', 'happy-dom'],
    ],
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/.claude/worktrees/**'],
  },
});
