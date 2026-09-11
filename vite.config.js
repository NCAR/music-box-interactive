import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

// Replaces %APP_VERSION% in index.html with the version from package.json at build/dev time.
const injectVersionHtml = {
  name: 'inject-app-version-html',
  transformIndexHtml(html) {
    return html.replace(/%APP_VERSION%/g, pkg.version)
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), injectVersionHtml],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
