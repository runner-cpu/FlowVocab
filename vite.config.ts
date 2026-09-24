import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, host: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
})
