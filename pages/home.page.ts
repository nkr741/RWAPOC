import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly path = '/';

  readonly personalTab = this.page.getByTestId('nav-personal-tab');
  readonly publicTab = this.page.getByTestId('nav-public-tab');
  readonly contactsTab = this.page.getByTestId('nav-contacts-tab');
  readonly onboardingDialog = this.page.getByTestId('user-onboarding-dialog');
  readonly transactionItems = this.page.locator('[data-test*="transaction-item"]');

  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await this.page.waitForURL(/\/(|personal|public|contacts)/);
  }

  async switchToEveryoneTab() {
    await this.publicTab.click();
  }

  async switchToFriendsTab() {
    await this.contactsTab.click();
  }

  async switchToMineTab() {
    await this.personalTab.click();
  }
}
