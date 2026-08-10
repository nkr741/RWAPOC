import type { Page } from '@playwright/test';

export async function dismissOnboarding(page: Page): Promise<void> {
  const dialog = page.getByTestId('user-onboarding-dialog');
  if (!(await dialog.isVisible({ timeout: 2_000 }).catch(() => false))) return;

  // Step 1: welcome screen → Next
  await page.getByTestId('user-onboarding-next').click();

  // Step 2: bank account form
  const bankName = page.getByTestId('bankaccount-bankName-input').locator('input');
  if (await bankName.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await bankName.fill('Test Bank');
    await page.getByTestId('bankaccount-routingNumber-input').locator('input').fill('123456789');
    await page.getByTestId('bankaccount-accountNumber-input').locator('input').fill('987654321');
    await page.getByTestId('bankaccount-submit').click();
  }

  // Step 3: finished → Done
  const doneBtn = page.getByTestId('user-onboarding-next');
  if (await doneBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await doneBtn.click();
  }

  await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

export async function registerOnboardingHandler(page: Page): Promise<void> {
  await page.addLocatorHandler(
    page.getByTestId('user-onboarding-dialog'),
    async () => {
      // Step 1: click Next on welcome screen
      const nextBtn = page.getByTestId('user-onboarding-next');
      if (await nextBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await nextBtn.click();
      }

      // Step 2: fill bank account form if shown
      const bankName = page.getByTestId('bankaccount-bankName-input').locator('input');
      if (await bankName.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await bankName.fill('Test Bank');
        await page.getByTestId('bankaccount-routingNumber-input').locator('input').fill('123456789');
        await page.getByTestId('bankaccount-accountNumber-input').locator('input').fill('987654321');
        await page.getByTestId('bankaccount-submit').click();
      }

      // Step 3: click Done
      if (await nextBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await nextBtn.click();
      }
    },
  );
}
