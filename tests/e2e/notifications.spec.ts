import { test, expect } from '../../fixtures/test';
import { ensureLoggedIn } from '../../utils/login.helper';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('should navigate to notifications via sidenav', async ({ page, sidenav }) => {
    await sidenav.navigateNotifications();
    await expect(page).toHaveURL(/\/notifications/);
  });

  test('should navigate to notifications via top bar icon', async ({ page, topnav }) => {
    await topnav.clickNotifications();
    await expect(page).toHaveURL(/\/notifications/);
  });

  test('should display notifications list or empty state', async ({ notificationPage }) => {
    await notificationPage.open();
    await expect(notificationPage.list.or(notificationPage.emptyHeader)).toBeVisible();
  });

  test('should handle notification click', async ({ notificationPage }) => {
    await notificationPage.open();
    await notificationPage.notificationItems.first().waitFor();
    await notificationPage.clickFirstNotification();
    await expect(notificationPage.list.or(notificationPage.transactionDetailHeader)).toBeVisible();
  });
});
