import { defineConfig, devices } from '@playwright/test';

const startDevServer = process.env.PLAYWRIGHT_START_SERVER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  // Setup-only smoke tests do not need a browser or app server. Set
  // PLAYWRIGHT_START_SERVER=1 for browser journeys that need the Vite server.
  webServer: startDevServer
    ? {
        command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
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
