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
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: isProduction ? {
      rollupOptions: {
        output: {
          // Chunking strategy for large app
          manualChunks: {
            vendor: ['react', 'react-dom', 'three'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            kernel: ['./src/lib/kernel/index.ts'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    } : undefined,
  };
});
