import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

const DEFAULT_API = 'https://xnrrpsi8wu.ap-south-1.awsapprunner.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || DEFAULT_API;

  return {
    // Shown on About / Settings (utils/support.js)
    define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'HomeTown OnTrack',
          short_name: 'OnTrack',
          description: 'Smart retail workforce platform for HomeTown store teams.',
          theme_color: '#0e2d57',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell is precached; authenticated API data is cached by the app
          // itself (per user, wiped on logout) rather than by the service worker.
          globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'ontrack-images',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      // In dev, requests go through this proxy so browser CORS never gets in the way.
      proxy: { '/api': { target, changeOrigin: true, secure: true } },
    },
    build: {
      target: 'es2019',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
