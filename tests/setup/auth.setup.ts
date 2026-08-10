import { test as setup, expect } from '@playwright/test';
import { ENV } from '../../config/env';
import { dismissOnboarding } from '../../utils/onboarding.helper';

const AUTH_FILE = 'playwright/.auth/user.json';

setup('authenticate once for the whole run', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill(ENV.user.username);
  await page.getByLabel('Password').fill(ENV.user.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL('**/');
  await dismissOnboarding(page);
  await expect(page.getByTestId('sidenav-user-full-name')).toBeVisible({ timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
