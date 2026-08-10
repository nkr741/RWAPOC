import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class SignupPage extends BasePage {
  readonly path = '/signup';

  readonly firstName = this.page.getByTestId('signup-first-name').locator('input');
  readonly lastName = this.page.getByTestId('signup-last-name').locator('input');
  readonly username = this.page.getByTestId('signup-username').locator('input');
  readonly password = this.page.getByTestId('signup-password').locator('input');
  readonly confirmPassword = this.page.getByTestId('signup-confirmPassword').locator('input');
  readonly submit = this.page.getByRole('button', { name: 'Sign Up' });
  readonly signinLink = this.page.getByRole('link', { name: /Sign In/i });

  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await this.submit.waitFor();
  }

  async signup(info: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
  }): Promise<void> {
    await this.firstName.fill(info.firstName);
    await this.lastName.fill(info.lastName);
    await this.username.fill(info.username);
    await this.password.fill(info.password);
    await this.confirmPassword.fill(info.password);
    await this.submit.click();
  }
}
