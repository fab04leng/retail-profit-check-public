/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

/**
 * Content-Security-Policy for the built site: the page may load only its own files
 * and cannot open any network connection (connect-src 'none'), so file contents
 * cannot be sent anywhere. Added at build time only, because Vite's dev server
 * needs inline scripts and a WebSocket.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "worker-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'rpc-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

/**
 * `--mode offline` builds dist-offline/: one classic (non-module) script so the site
 * opens by double-clicking index.html (browsers block module scripts on file://).
 * Workers cannot start from file://, so that build analyses on the page instead.
 */
function classicScriptPlugin(): Plugin {
  return {
    name: 'rpc-classic-script',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/<script type="module" crossorigin/g, '<script defer').replace(/ crossorigin/g, '');
    },
  };
}

// base './' so the built site works from any folder.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), cspPlugin(), ...(mode === 'offline' ? [classicScriptPlugin()] : [])],
  worker: { format: 'es' },
  define: { 'import.meta.env.RPC_LOCAL': JSON.stringify(mode === 'offline') },
  build:
    mode === 'offline'
      ? { target: 'es2022', sourcemap: false, outDir: 'dist-offline', modulePreload: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } }
      : { target: 'es2022', sourcemap: false },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
    testTimeout: 60000,
  },
}));
