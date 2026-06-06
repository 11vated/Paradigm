import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'tests/property/**'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/kernel/**',
        'src/lib/gspl/**',
        'src/lib/sovereignty/**',
        'src/lib/friend/**',
        'src/lib/world/**',
        'src/lib/game/**',
        'src/lib/evolution/**',
        'src/lib/composition.ts',
        'src/seeds/**',
        'src/lib/quality-contract.ts',
        'src/lib/naming/**',
        'src/lib/federation/**',
        'src/lib/contracts/**',
      ],
      exclude: [
        '**/index.ts',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
      ],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 60,
        branches: 55,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
