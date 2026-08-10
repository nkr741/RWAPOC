import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class SettingsPage extends BasePage {
  readonly path = '/user/settings';

  readonly form = this.page.getByTestId('user-settings-form');
  readonly firstName = this.page.getByTestId('user-settings-firstName-input');
  readonly lastName = this.page.getByTestId('user-settings-lastName-input');
  readonly email = this.page.getByTestId('user-settings-email-input');
  readonly phone = this.page.getByTestId('user-settings-phoneNumber-input');
  readonly submitBtn = this.page.getByTestId('user-settings-submit');

  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await this.form.waitFor();
  }

  async updateProfile(email: string, phone: string): Promise<void> {
    await this.email.clear();
    await this.email.fill(email);
    await this.phone.clear();
    await this.phone.fill(phone);
    await this.submitBtn.click();
  }
}
