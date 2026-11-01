import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/studysync-ai/' : '/',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
  build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } }
});
