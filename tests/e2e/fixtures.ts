import { test as base, expect } from '@playwright/test';

export type AppFixtures = {
  viewportKind: 'mobile' | 'desktop';
};

export const test = base.extend<AppFixtures>({
  viewportKind: async ({ browserName }, use, testInfo) => {
    void browserName;
    await use(testInfo.project.name === 'mobile-chrome' ? 'mobile' : 'desktop');
  },
});

export { expect };
