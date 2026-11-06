import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base keeps production builds portable under any static host path.
  base: './',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Remote dev previews proxy requests with an arbitrary Host header.
    allowedHosts: true,
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Phaser 3 is a single ~1.2 MB engine chunk; splitting it adds no value.
    chunkSizeWarningLimit: 1500,
    // Pixel-art sprite sheets stay as real files instead of data URLs.
    assetsInlineLimit: 0,
  },
});
