import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4200',
    testIdAttribute: 'data-test',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npx serve demo-app -l 4200 --no-clipboard',
    port: 4200,
    reuseExistingServer: true,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
