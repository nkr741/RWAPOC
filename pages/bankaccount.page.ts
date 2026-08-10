import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class BankAccountPage extends BasePage {
  readonly path = '/bankaccounts';

  readonly list = this.page.getByTestId('bankaccount-list');
  readonly createBtn = this.page.getByTestId('bankaccount-new');
  readonly bankName = this.page.getByTestId('bankaccount-bankName-input').locator('input');
  readonly routingNumber = this.page.getByTestId('bankaccount-routingNumber-input').locator('input');
  readonly accountNumber = this.page.getByTestId('bankaccount-accountNumber-input').locator('input');
  readonly submitBtn = this.page.getByTestId('bankaccount-submit');
  readonly deleteBtn = this.page.getByTestId('bankaccount-delete');
  readonly deletedLabel = this.page.locator('text=(Deleted)');
  readonly routingNumberError = this.page.locator('text=Must contain a valid routing number');

  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await this.list.waitFor();
  }

  async createAccount(bank: string, routing: string, account: string): Promise<void> {
    await this.createBtn.click();
    await this.bankName.fill(bank);
    await this.routingNumber.fill(routing);
    await this.accountNumber.fill(account);
    await this.submitBtn.click();
  }

  async deleteFirstAccount(): Promise<void> {
    await this.deleteBtn.first().click();
  }
}
