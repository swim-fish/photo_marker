/// <reference types="vitest/config" />

import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { createWebAppManifest } from './src/infrastructure/pwa/manifest.ts';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'PHOTO_MARKER_');
  const enableShareTarget = environment.PHOTO_MARKER_SHARE_TARGET_VALIDATED === 'true';
  const base = environment.PHOTO_MARKER_BASE_PATH || '/';
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(version) },
    publicDir: 'static',
    resolve: {
      conditions: ['browser'],
    },
    plugins: [
      svelte(),
      VitePWA({
        registerType: 'prompt',
        strategies: 'injectManifest',
        srcDir: 'src/infrastructure/pwa',
        filename: 'serviceWorker.ts',
        includeAssets: ['icons/icon.svg', 'icons/icon-maskable.svg'],
        manifest: createWebAppManifest(enableShareTarget, base),
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      include: ['tests/**/*.{test,spec}.{js,ts}'],
      exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
      globals: true,
      clearMocks: true,
      restoreMocks: true,
    },
  };
});
