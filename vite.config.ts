import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'external-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
          ],
        },
        manifest: {
          name: 'Printopia Digital Press',
          short_name: 'Printopia',
          description: 'Operations Terminal — Inventory, Jobs & Billing Management',
          theme_color: '#6366f1',
          background_color: '#0f0f1a',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/assets/printopia_logo_1783376948226-DJp49wdQ.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
            },
            {
              src: '/assets/printopia_logo_1783376948226-DJp49wdQ.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/server/**']
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: 'dist'
    }
  };
});
