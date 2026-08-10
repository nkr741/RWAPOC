import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class SigninPage extends BasePage {
  readonly path = '/signin';

  readonly username = this.page.getByLabel('Username');
  readonly password = this.page.getByLabel('Password');
  readonly submit = this.page.getByRole('button', { name: 'Sign In' });
  readonly error = this.page.getByTestId('signin-error');
  readonly usernameRequired = this.page.locator('text=Username is required');
  readonly signupLink = this.page.getByTestId('signup');

  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await this.submit.waitFor();
  }

  async login(user: string, pass: string): Promise<void> {
    await this.username.fill(user);
    await this.password.fill(pass);
    await this.submit.click();
  }
}
