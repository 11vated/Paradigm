import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'tests/property/**'],
    environment: 'jsdom', // Changed from 'node' to support React component tests
    globals: true,
    testTimeout: 30000,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        // Core kernel and GSPL
        'src/lib/kernel/**',
        'src/lib/gspl/**',
        
        // Substrates
        'src/lib/sovereignty/**',
        'src/lib/friend/**',
        'src/lib/world/**',
        'src/lib/game/**',
        
        // Evolution and composition
        'src/lib/evolution/**',
        'src/lib/composition.ts',
        
        // Seeds and quality
        'src/seeds/**',
        'src/lib/quality-contract.ts',
        
        // Supporting systems
        'src/lib/naming/**',
        'src/lib/federation/**',
        'src/lib/economics/**',
        'src/lib/contracts/**',
        
        // Phase 15: Web3 integration
        'src/lib/web3/**',
        'src/components/web3/**',
        
        // Phase 16: Queue system
        'src/server/queue/**',
        'src/server/routes/jobs.ts',
        
        // Authentication and middleware
        'src/lib/auth/**',
        'src/server/middleware/**',
      ],
      exclude: [
        '**/index.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/types.ts',
        '**/*.config.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
        // Per-file thresholds for critical modules
        'src/lib/auth/**': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 90,
        },
        'src/lib/kernel/rng.ts': {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 100,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
