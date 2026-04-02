import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow linked @ncar/music-box and nested @ncar/musica wasm assets from monorepo roots.
      allow: [path.resolve(__dirname, '..')],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      
    },
  },
  optimizeDeps: {
    exclude: ['@ncar/musica', '@ncar/music-box']
  },
})
