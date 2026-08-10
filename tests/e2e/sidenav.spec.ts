import { test, expect } from '../../fixtures/test';
import { TestUsers } from '../../data/test-data';
import { ensureLoggedIn } from '../../utils/login.helper';

test.describe('Side Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('should display user info in sidenav', async ({ sidenav }) => {
    await expect(sidenav.userFullName).toContainText(TestUsers.default.firstName);
    await expect(sidenav.username).toContainText(`@${TestUsers.default.username}`);
    await expect(sidenav.userBalance).toBeVisible();
  });

  test('should navigate to Home', async ({ page, sidenav }) => {
    await page.goto('/user/settings');
    await sidenav.navigateHome();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should navigate to My Account', async ({ page, sidenav, settingsPage }) => {
    await sidenav.navigateMyAccount();
    await expect(page).toHaveURL(/\/user\/settings/);
    await expect(settingsPage.form).toBeVisible();
  });

  test('should navigate to Bank Accounts', async ({ page, sidenav }) => {
    await sidenav.navigateBankAccounts();
    await expect(page).toHaveURL(/\/bankaccounts/);
  });

  test('should navigate to Notifications', async ({ page, sidenav }) => {
    await sidenav.navigateNotifications();
    await expect(page).toHaveURL(/\/notifications/);
  });

  test('should logout and redirect to signin', async ({ page, sidenav }) => {
    await sidenav.logout();
    await expect(page).toHaveURL(/\/signin/);
  });
});
