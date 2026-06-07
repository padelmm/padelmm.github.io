/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Replaced at build time with the current package.json#version
 * (see `define` in vite.config.ts). Use this anywhere the UI needs
 * to display the app version — never hardcode a version string in
 * components, or it will drift from npm metadata.
 */
declare const __APP_VERSION__: string;
