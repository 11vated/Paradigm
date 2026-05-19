import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Paradigm Absolute — ESLint configuration.
 *
 * Phase 0 introduces the **determinism boundary**: any code under
 * `src/lib/kernel/`, `src/seeds/`, or `src/lib/evolution/` is on the
 * deterministic side of the substrate. The whole point of Paradigm is
 * that same seed in → same artifact out, byte-identical, across machines
 * and time. That invariant breaks the moment any of these non-deterministic
 * sources of entropy leak in:
 *
 *   - `Math.random()`            — non-deterministic
 *   - `Date.now()` / `new Date()` — wall-clock entropy
 *   - `crypto.randomBytes()` etc — OS entropy
 *   - `performance.now()`        — high-res clock entropy
 *
 * The kernel must source ALL randomness from `Xoshiro256StarStar` (see
 * src/lib/kernel/rng.ts) seeded by the artifact hash, and must NEVER
 * read the wall clock for anything that lands in a deterministic
 * artifact. CI fails if any of these appear in kernel-side code.
 */
export default tseslint.config(
  { ignores: ['dist', 'data', 'coverage', 'repo_copy', 'repo_latest', 'node_modules', 'artifacts', 'cache'] },

  // Base config: applies to all source.
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // --- DETERMINISM BOUNDARY ---
  // Hard ban on entropy sources inside the kernel + seed types +
  // evolution algorithms. These layers MUST be reproducible from a seed.
  //
  // Math.random = HARD ERROR (true non-determinism, breaks artifact hashes).
  // Date.now / new Date = WARN (wall-clock metadata stamping; doesn't break
  //   artifact hashes today but should route through a deterministic clock —
  //   see Documents/Paradigm-Vision/06_CLEANUP_PHASE0.md "Wall-clock Sprint").
  {
    files: [
      'src/lib/kernel/**/*.{ts,tsx}',
      'src/seeds/**/*.{ts,tsx}',
      'src/lib/evolution/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Deterministic boundary: Math.random() is forbidden. Use Xoshiro256StarStar from src/lib/kernel/rng.',
        },
        {
          object: 'crypto',
          property: 'randomBytes',
          message:
            'Deterministic boundary: use Xoshiro256StarStar from src/lib/kernel/rng instead of crypto.random*.',
        },
        {
          object: 'crypto',
          property: 'getRandomValues',
          message:
            'Deterministic boundary: use Xoshiro256StarStar from src/lib/kernel/rng instead of crypto.random*.',
        },
      ],
      'no-restricted-syntax': [
        'warn',
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message:
            'Deterministic boundary (WARN): wall-clock entropy. Pass timestamps in or use kernel.now() (sprint pending).',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            'Deterministic boundary (WARN): `new Date()` reads wall-clock entropy. Pass timestamps in (sprint pending).',
        },
        {
          selector: "MemberExpression[object.name='performance'][property.name='now']",
          message:
            'Deterministic boundary: performance.now() is forbidden. Pass timings in.',
        },
      ],
    },
  },

  // Carve-out: the RNG implementation itself, seed types initial mixing,
  // and any test files (which legitimately use sample-data randomness).
  {
    files: [
      'src/lib/kernel/rng.ts',
      'src/lib/kernel/rng-contract.ts',
      'src/seeds/types.ts',
      // tests are excluded from the boundary — they need sample data
      'src/lib/kernel/**/__tests__/**',
      'src/lib/kernel/**/*.test.{ts,tsx}',
      'src/lib/evolution/**/__tests__/**',
      'src/lib/evolution/**/*.test.{ts,tsx}',
      'src/seeds/**/__tests__/**',
      'src/seeds/**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-globals': 'off',
    },
  },
);
