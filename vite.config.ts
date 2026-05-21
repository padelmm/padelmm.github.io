import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// User GitHub Pages site is served from the root, so base = '/'.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'bl-logo.png', 'bl-icon.png'],
      manifest: {
        name: 'Padel Mix & Match',
        short_name: 'Padel M&M',
        description:
          'Mix & Match for padel evenings — by Alex K. Random teams, sum-to-24 scoring, ranking — all on your phone.',
        theme_color: '#0c1a36',
        background_color: '#0c1a36',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'bl-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'bl-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,jpeg,jpg,png,webp}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
