import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'public/coi-serviceworker.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      // Project convention: _-prefixed args/vars are deliberately unused.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // react-hooks 7 ships the react-compiler rule suite (immutability, ref access
      // during render, setState-in-effect). This codebase doesn't opt into the compiler
      // and these patterns are intentional and tested. Classic rules-of-hooks and
      // exhaustive-deps stay on.
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // Tests legitimately reach into Ketcher's untyped struct with `any`.
  { files: ['**/__tests__/**'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
);
