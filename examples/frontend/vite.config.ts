import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'kalp-relayer-sdk': path.resolve(__dirname, '../../sdk/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['ethers'],
  },
});
