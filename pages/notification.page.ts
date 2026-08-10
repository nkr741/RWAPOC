import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class NotificationPage extends BasePage {
  readonly path = '/notifications';

  readonly list = this.page.getByTestId('notifications-list');
  readonly emptyHeader = this.page.getByTestId('empty-list-header');

  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await this.list.or(this.emptyHeader).waitFor();
  }

  readonly notificationItems = this.page.locator('[data-test*="notification-list-item"]');
  readonly transactionDetailHeader = this.page.getByTestId('transaction-detail-header');

  async clickFirstNotification(): Promise<void> {
    await this.notificationItems.first().click();
  }
}
