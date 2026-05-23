import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        crypto: path.resolve(__dirname, './src/lib/kernel/browser-crypto-shim.ts'),
        'node:crypto': path.resolve(__dirname, './src/lib/kernel/browser-crypto-shim.ts'),
        fs: path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        'node:fs': path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        url: path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        'node:url': path.resolve(__dirname, './src/lib/kernel/browser-node-shim.ts'),
        os: path.resolve(__dirname, './src/lib/kernel/browser-os-shim.ts'),
        'node:os': path.resolve(__dirname, './src/lib/kernel/browser-os-shim.ts'),
        './gspl-module-resolver': path.resolve(__dirname, './src/lib/kernel/gspl-module-resolver-stub.ts'),
      },
    },
    server: {
      host: true,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/data/**', '**/node_modules/**'],
      },
    },
    build: isProduction ? {
        rollupOptions: {
          output: {
            // Aggressive chunking strategy for large app
            manualChunks(id) {
              // React core
              if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
                return 'react';
              }
              // Three.js - split into smaller chunks
              if (id.includes('node_modules/three/build/three.min.js')) {
                return 'three-core';
              }
              if (id.includes('node_modules/three/examples/jsm/')) {
                return 'three-examples';
              }
              if (id.includes('node_modules/three-stdlib')) {
                return 'three-stdlib';
              }
              if (id.includes('node_modules/three')) {
                return 'three-misc';
              }
              // UI components - split by component type
              if (id.includes('node_modules/@radix-ui/react-dialog') || 
                  id.includes('node_modules/@radix-ui/react-dropdown-menu') ||
                  id.includes('node_modules/@radix-ui/react-popover')) {
                return 'ui-overlays';
              }
              if (id.includes('node_modules/@radix-ui')) {
                return 'ui-core';
              }
              // Data visualization
              if (id.includes('node_modules/d3') || id.includes('node_modules/recharts')) {
                return 'visualization';
              }
              // Animation
              if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) {
                return 'animation';
              }
              // Kernel
              if (id.includes('src/lib/kernel')) {
                return 'kernel';
              }
              // GSPL
              if (id.includes('src/lib/gspl') || id.includes('src/gspl')) {
                return 'gspl';
              }
              // Rendering
              if (id.includes('src/lib/rendering')) {
                return 'rendering';
              }
              // Asset pipeline
              if (id.includes('src/lib/asset_pipeline')) {
                return 'asset-pipeline';
              }
            },
          },
        },
        chunkSizeWarningLimit: 800,
        target: 'esnext',
        minify: 'esbuild',
        esbuildOptions: {
          drop: ['console', 'debugger'],
        },
      } : undefined,
    optimizeDeps: {
      include: [],
      exclude: ['gspl-module-resolver'],
    },
  };
});
