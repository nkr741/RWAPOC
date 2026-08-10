import type { Page, Locator } from '@playwright/test';

export class TopNavComponent {
  readonly newTransactionBtn: Locator;
  readonly notificationsLink: Locator;
  readonly notificationCount: Locator;

  constructor(page: Page) {
    this.newTransactionBtn = page.getByTestId('nav-top-new-transaction');
    this.notificationsLink = page.getByTestId('nav-top-notifications-link');
    this.notificationCount = page.getByTestId('nav-top-notifications-count');
  }

  async clickNewTransaction() {
    await this.newTransactionBtn.click();
  }

  async clickNotifications() {
    await this.notificationsLink.click();
  }
}
