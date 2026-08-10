import { defineConfig, devices } from '@playwright/test';
import { ENV } from './config/env';

export default defineConfig({
  testDir: './tests',

  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,

  use: {
    baseURL: ENV.baseURL,
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],

  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'setup', testMatch: /setup\/auth\.setup\.ts/ },

    {
      name: 'practice',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /practice\/.*\.spec\.ts/,
    },

    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/api\//, /setup\//, /practice\//],
    },
    {
      name: 'firefox',
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [/api\//, /setup\//, /practice\//],
    },
    {
      name: 'webkit',
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'] },
      testIgnore: [/api\//, /setup\//, /practice\//],
    },
  ],
});
