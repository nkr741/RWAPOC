import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class TransactionPage extends BasePage {
  readonly path = '/transaction/new';

  readonly userSearchInput = this.page.getByTestId('user-list-search-input');
  readonly amountInput = this.page.getByTestId('transaction-create-amount-input').locator('input');
  readonly descriptionInput = this.page.getByTestId('transaction-create-description-input').locator('input');
  readonly payBtn = this.page.getByTestId('transaction-create-submit-payment');
  readonly requestBtn = this.page.getByTestId('transaction-create-submit-request');
  readonly alertSuccess = this.page.getByTestId('alert-bar-success');
  readonly returnToTransactions = this.page.getByTestId('new-transaction-return-to-transactions');
  readonly detailHeader = this.page.getByTestId('transaction-detail-header');
  readonly commentInput = this.page.locator('[data-test*="transaction-comment-input"]');
  readonly commentsList = this.page.getByTestId('comments-list');
  readonly transactionItems = this.page.locator('[data-test*="transaction-item"]');
  readonly userListItems = this.page.locator('[data-test*="user-list-item"]');
  readonly likeCount = this.page.locator('[data-test*="transaction-like-count"]');

  constructor(page: Page) {
    super(page);
  }

  async waitForLoaded(): Promise<void> {
    await this.userSearchInput.waitFor();
  }

  async selectUser(name: string): Promise<void> {
    await this.userSearchInput.fill(name);
    await this.page.locator('[data-test*="user-list-item"]').filter({ hasText: name }).first().click();
  }

  async pay(amount: string, description: string): Promise<void> {
    await this.amountInput.fill(amount);
    await this.descriptionInput.fill(description);
    await this.payBtn.click();
  }

  async request(amount: string, description: string): Promise<void> {
    await this.amountInput.fill(amount);
    await this.descriptionInput.fill(description);
    await this.requestBtn.click();
  }

  getTransactionItem(index = 0) {
    return this.page.locator('[data-test*="transaction-item"]').nth(index);
  }

  async clickFirstTransaction() {
    await this.page.locator('[data-test*="transaction-item"]').first().click();
  }

  async likeTransaction() {
    const likeBtn = this.page.locator('[data-test*="transaction-like-button"]').first();
    await likeBtn.click({ force: true });
  }

  async addComment(text: string) {
    await this.commentInput.fill(text);
    await this.commentInput.press('Enter');
  }
}
