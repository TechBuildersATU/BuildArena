/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// `--mode android` builds the web app for the APK (npm run apk): the files ship inside the app,
// so the offline service worker is left out there.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Offline launch + full screen kiosk (document §13.2, WP-02)
    VitePWA({
      disable: mode === 'android',
      registerType: 'autoUpdate',
      includeAssets: [
        'logo/atu_techbuilders_logo.png',
        'icons/favicon-48.png',
        'icons/icon-180.png',
      ],
      manifest: {
        name: 'BuildArena · ATÜ TechBuilders',
        short_name: 'BuildArena',
        description: 'Gereksinim Düellosu ve Senaryo Oyunu',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#FFF4E6',
        theme_color: '#FFF4E6',
        // the club's icon pack (TechBuilders_App_Icons); store icons are in store/
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,json,mp3}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // One chunk is fine for an offline kiosk: the service worker precaches everything (~200 KB gzip).
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}))
