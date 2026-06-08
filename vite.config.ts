import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Read the version straight from package.json at build time so the
// About panel (and any other surface that wants to display it) is
// always in sync with the npm metadata. Bumping the version is then a
// single edit, ideally via `npm version <patch|minor|major>`.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string };

// User GitHub Pages site is served from the root, so base = '/'.
export default defineConfig({
  base: '/',
  define: {
    // Replaced at build time with a string literal of the current
    // package.json version. Bundle size stays tiny; no runtime fetch.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'bl-logo.png', 'bl-icon.png'],
      manifest: {
        name: 'Padel Mix & Match',
        short_name: 'Padel M&M',
        description:
          'Mix & Match for padel evenings — by Alex K. Random teams, configurable scoring, live ranking — all on your phone.',
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
