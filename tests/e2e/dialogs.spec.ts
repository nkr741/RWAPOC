import { test, expect } from '../../fixtures/test';
import { ensureLoggedIn } from '../../utils/login.helper';

test.describe('Dialogs, Alerts & Pop-ups', () => {
  test.beforeEach(async ({ page }) => {
    // Clear stacked dialog handlers from previous tests (shared page)
    page.removeAllListeners('dialog');
    await ensureLoggedIn(page);
  });

  test('should auto-accept a native alert dialog', async ({ page }) => {
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await page.evaluate(() => window.alert('Test alert message'));
    expect(dialogMessage).toBe('Test alert message');
  });

  test('should accept a native confirm dialog', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    const result = await page.evaluate(() => window.confirm('Accept this?'));
    expect(result).toBe(true);
  });

  test('should dismiss a native confirm dialog', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    const result = await page.evaluate(() => window.confirm('Dismiss this?'));
    expect(result).toBe(false);
  });

  test('should handle a native prompt dialog with input', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toBe('Enter your name:');
      await dialog.accept('Naveen');
    });

    const result = await page.evaluate(() => window.prompt('Enter your name:'));
    expect(result).toBe('Naveen');
  });

  test('should dismiss a native prompt dialog returning null', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    const result = await page.evaluate(() => window.prompt('Enter something:'));
    expect(result).toBeNull();
  });

  test('should auto-dismiss onboarding overlay via addLocatorHandler', async ({ homePage, sidenav }) => {
    await homePage.page.goto('/');
    await sidenav.userFullName.waitFor({ timeout: 10_000 });
    await expect(homePage.onboardingDialog).toBeHidden();
  });

  test('should handle multiple sequential dialogs', async ({ page }) => {
    const messages: string[] = [];

    page.on('dialog', async (dialog) => {
      messages.push(dialog.message());
      await dialog.accept();
    });

    // Trigger dialogs one at a time (synchronous alerts block JS execution)
    await page.evaluate(() => window.alert('First dialog'));
    await page.evaluate(() => window.alert('Second dialog'));
    await page.evaluate(() => window.alert('Third dialog'));

    expect(messages).toEqual(['First dialog', 'Second dialog', 'Third dialog']);
  });
});
