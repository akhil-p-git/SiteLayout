import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3015,
  },
  resolve: {
    alias: {
      // Resolve to root node_modules for hoisted dependencies
      'mapbox-gl': path.resolve(__dirname, '../node_modules/mapbox-gl'),
      '@mapbox/mapbox-gl-draw': path.resolve(__dirname, '../node_modules/@mapbox/mapbox-gl-draw'),
    },
  },
  optimizeDeps: {
    include: ['mapbox-gl', '@mapbox/mapbox-gl-draw'],
  },
});
