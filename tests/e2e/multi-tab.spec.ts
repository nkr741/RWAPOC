import { test, expect } from '../../fixtures/test';
import { ENV } from '../../config/env';
import { TestUsers } from '../../data/test-data';
import { ensureLoggedIn } from '../../utils/login.helper';
import { SideNavComponent } from '../../pages/components/sidenav.component';
import { HomePage } from '../../pages/home.page';

test.describe('Multiple Tabs & Windows', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('should open a second tab sharing the same auth session', async ({ sharedContext }) => {
    const secondTab = await sharedContext.newPage();
    try {
      await secondTab.goto('/');
      const tab2Sidenav = new SideNavComponent(secondTab);
      await expect(tab2Sidenav.userFullName).toBeVisible();
      await expect(tab2Sidenav.userFullName).toContainText(TestUsers.default.firstName);
    } finally {
      await secondTab.close();
    }
  });

  test('should maintain independent navigation across tabs', async ({ page, sharedContext, sidenav }) => {
    await page.goto('/');
    const secondTab = await sharedContext.newPage();
    try {
      await secondTab.goto('/bankaccounts');

      // Tab 1 on home, tab 2 on bank accounts
      await expect(page).toHaveURL(/\/$/);
      await expect(secondTab).toHaveURL(/\/bankaccounts/);

      // Navigate tab 1 to notifications — tab 2 stays on bank accounts
      await sidenav.navigateNotifications();
      await expect(page).toHaveURL(/\/notifications/);
      await expect(secondTab).toHaveURL(/\/bankaccounts/);
    } finally {
      await secondTab.close();
    }
  });

  test('should reflect data changes across tabs after refresh', async ({ sharedContext, db, topnav, transactionPage }) => {
    const users = db.users();
    const recipient = users.find((u) => u.username !== ENV.user.username)!;

    // Tab 2 watching the personal feed
    const secondTab = await sharedContext.newPage();
    try {
      await secondTab.goto('/personal');
      const tab2Home = new HomePage(secondTab);
      await tab2Home.personalTab.waitFor();

      // Tab 1 creates a payment via POM
      await topnav.clickNewTransaction();
      await transactionPage.selectUser(recipient.firstName);
      await transactionPage.pay('1', 'Multi-tab test');
      await expect(transactionPage.alertSuccess).toBeVisible();

      // Tab 2 refreshes and sees the new transaction
      await secondTab.reload();
      await expect(tab2Home.transactionItems.first()).toBeVisible();
    } finally {
      await secondTab.close();
    }
  });

  test('should enumerate all open pages in the context', async ({ page, sharedContext }) => {
    const tab2 = await sharedContext.newPage();
    const tab3 = await sharedContext.newPage();
    try {
      const pages = sharedContext.pages();
      // At least 3 pages: shared page + 2 new tabs
      expect(pages.length).toBeGreaterThanOrEqual(3);
      expect(pages).toContain(page);
      expect(pages).toContain(tab2);
      expect(pages).toContain(tab3);
    } finally {
      await tab3.close();
      await tab2.close();
    }
  });

  test('should handle popup window from target=_blank link', async ({ page }) => {
    await page.goto('/');
    // Inject a target=_blank link and click it to trigger a popup
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '/bankaccounts';
      link.target = '_blank';
      link.textContent = 'Open in new tab';
      link.id = 'test-popup-link';
      document.body.appendChild(link);
    });

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#test-popup-link').click(),
    ]);

    await popup.waitForLoadState();
    await expect(popup).toHaveURL(/\/bankaccounts/);
    await popup.close();
  });
});
