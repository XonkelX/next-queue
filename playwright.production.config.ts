import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/production',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL:
      process.env.PRODUCTION_BASE_URL ?? 'https://next-queue-omega.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
