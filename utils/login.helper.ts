import type { Page } from '@playwright/test';
import { ENV } from '../config/env';

export async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto('/');

  // Wait for either the signin form or the sidenav (logged in state) to appear
  const signinBtn = page.getByRole('button', { name: 'Sign In' });
  const sidenav = page.getByTestId('sidenav-user-full-name');

  await signinBtn.or(sidenav).waitFor({ timeout: 10_000 });

  if (await signinBtn.isVisible()) {
    await page.getByLabel('Username').fill(ENV.user.username);
    await page.getByLabel('Password').fill(ENV.user.password);
    await signinBtn.click();
    await sidenav.waitFor({ timeout: 15_000 });
  }
}

export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // page might be about:blank
  }
  await page.goto('/signin');
  await page.getByLabel('Username').waitFor({ timeout: 10_000 });
}
