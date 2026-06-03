import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const _isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'paradigm-node-builtin-guard',
        enforce: 'pre',
        transform(code, id) {
          if (id.includes('node_modules')) return null;
          // Auto-inject /* @vite-ignore */ on any remaining dynamic Node builtin imports
          // so Vite never tries to analyze fs/path/child_process etc. in the browser bundle.
          const patterns = [
            /import\(["']fs(\/promises)?["']\)/g,
            /import\(["']path["']\)/g,
            /import\(["']node:fs(\/promises)?["']\)/g,
            /import\(["']node:path["']\)/g,
            /import\(["']child_process["']\)/g,
            /require\(["']fs["']\)/g,
            /require\(["']path["']\)/g,
            /import\(["']os["']\)/g,
            /import\(["']node:os["']\)/g,
            /await import\(["']fs["']\)/g,
            /await import\(["']path["']\)/g,
          ];
          let out = code;
          for (const re of patterns) {
            out = out.replace(re, (m) => {
              if (m.includes('@vite-ignore')) return m;
              return m.replace('import(', 'import(/* @vite-ignore */ ').replace('require(', 'require(/* @vite-ignore */ ');
            });
          }
          return out !== code ? { code: out, map: null } : null;
        }
      },
      {
        name: 'paradigm-heavy-generator-stub',
        enforce: 'pre',
        resolveId(id, importer) {
          // Extremely defensive: catch ANY import that resolves to a heavy generator implementation
          // (not the registration *-contract.ts files). Works with absolute Windows paths, relative,
          // with or without query params. Never touches quality-contract or any contract registration surface.
          const norm = id.replace(/\\/g, '/').replace(/^file:\/\//i, '');
          const isHeavyGen = norm.includes('/kernel/generators/') && !norm.includes('-contract');
          if (!isHeavyGen) return null;

          const importerNorm = importer ? importer.replace(/\\/g, '/') : '';
          const isClient = !importerNorm.includes('/server/') && !importerNorm.includes('node_modules');

          if (isClient) {
            // Return the real stub file as the resolution target. Vite will load the stub
            // (which has every named export the heavy code expects) instead of the real generator.
            const stubPath = path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts');
            return stubPath + '?heavy-stub';
          }
          return null;
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        fs: path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        'fs/promises': path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        'node:fs': path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        'node:fs/promises': path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        path: path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        'node:path': path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        module: path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        'node:module': path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        os: path.resolve(__dirname, './src/lib/kernel/browser-os-shim.ts'),
        'node:os': path.resolve(__dirname, './src/lib/kernel/browser-os-shim.ts'),
        process: path.resolve(__dirname, './src/lib/browser/process-shim.ts'),
        'node:process': path.resolve(__dirname, './src/lib/browser/process-shim.ts'),
        crypto: path.resolve(__dirname, './src/lib/kernel/browser-crypto-shim.ts'),
        'node:crypto': path.resolve(__dirname, './src/lib/kernel/browser-crypto-shim.ts'),

        // === CRITICAL: Prevent any heavy generator implementation from ever reaching the browser ===
        // These real modules contain fs, canvas, WAV emission, gltf writers, etc.
        // All static imports from domain-config.ts, engine-dispatcher, quality-contract bridges, etc.
        // are redirected here. The *-contract.ts registration files are intentionally NOT aliased
        // so registerContract and the 15_ QualityContract system continue to work.
        '../generators/character': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        '../generators/geometry3d': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        '../generators/fullgame': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        '../generators/narrative': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        '../generators/app': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        '../generators/website': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        '../generators/audio': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        '../generators/agent': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
        // Broad catch for any other generator pulled by domain-config or similar client paths
        // (we deliberately do NOT catch *-contract files)
        '../generators/': path.resolve(__dirname, './src/lib/kernel/browser-heavy-generators-stub.ts'),
      }
    },
    server: {
      host: true,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      headers: {
        'X-Frame-Options': 'ALLOWALL',
        // CSP note (Phase 24+ security audit prep item 9): dev-only permissive for Vite HMR/Three.js; basic 'default-src self' is the prod baseline
        // (enforced via server middleware in prod; full policy "default-src 'self'; ..." in src/lib/security/middleware.ts).
        // This dev header is intentionally loose (frame-ancestors *) and does not affect prod builds.
        'Content-Security-Policy': "frame-ancestors *;",
      }
    },
    optimizeDeps: { exclude: ['gspl-module-resolver'] },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
              return 'vendor-three';
            }
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router')
            ) {
              return 'vendor-react';
            }
            if (
              id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/motion/') ||
              id.includes('node_modules/motion-dom') ||
              id.includes('node_modules/motion-utils') ||
              id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3')
            ) {
              return 'vendor-viz';
            }
          }
        }
      }
    }
  };
});
