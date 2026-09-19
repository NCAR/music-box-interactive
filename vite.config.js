import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
  plugins: [
    react(),
    injectVersionHtml,
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MusicBox Interactive',
        short_name: 'MusicBox',
        description: 'A tool to configure and run atmospheric chemistry simulations.',
        theme_color: '#0057c2',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wasm,avif,jpg,jpeg,JPEG}'],
        // The musica wasm module is ~1.1MB, above the default 2MiB workbox limit leaves little room to grow.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
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
