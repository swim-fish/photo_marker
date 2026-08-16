import { defineConfig, devices } from '@playwright/test';

const startDevServer = process.env.PLAYWRIGHT_START_SERVER === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const devServerPort = new URL(baseURL).port || '4173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Setup-only smoke tests do not need a browser or app server. Set
  // PLAYWRIGHT_START_SERVER=1 for browser journeys that need the Vite server.
  webServer: startDevServer
    ? {
        command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${devServerPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
