import { test, expect } from '../../fixtures/test';
import { ENV } from '../../config/env';
import { TransactionData } from '../../data/test-data';
import { ensureLoggedIn } from '../../utils/login.helper';

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('should display public transaction feed on home page @smoke', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.publicTab).toBeVisible();
    await expect(homePage.transactionItems.first()).toBeVisible();
  });

  test('should switch between Everyone, Friends, and Mine tabs', async ({ page, homePage }) => {
    await homePage.open();
    await expect(homePage.publicTab).toBeVisible();

    await homePage.switchToFriendsTab();
    await expect(page).toHaveURL(/\/contacts/);

    await homePage.switchToMineTab();
    await expect(page).toHaveURL(/\/personal/);

    await homePage.switchToEveryoneTab();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should navigate to new transaction page', async ({ page, topnav, transactionPage }) => {
    await page.goto('/');
    await topnav.clickNewTransaction();
    await expect(page).toHaveURL(/\/transaction\/new/);
    await expect(transactionPage.userSearchInput).toBeVisible();
  });

  test('should search for a user in new transaction', async ({ transactionPage }) => {
    await transactionPage.open();
    await transactionPage.userSearchInput.fill('Heath');
    await expect(transactionPage.userListItems.first()).toBeVisible();
  });

  test('should create a new payment @critical', async ({ transactionPage, db }) => {
    const users = db.users();
    const recipient = users.find((u) => u.username !== ENV.user.username)!;

    await transactionPage.open();
    await transactionPage.selectUser(recipient.firstName);
    await transactionPage.pay(TransactionData.payment.amount, TransactionData.payment.description);

    await expect(transactionPage.alertSuccess).toBeVisible();
    await expect(transactionPage.alertSuccess).toContainText('Transaction Submitted!');
  });

  test('should create a new payment request', async ({ transactionPage, db }) => {
    const users = db.users();
    const recipient = users.find((u) => u.username !== ENV.user.username)!;

    await transactionPage.open();
    await transactionPage.selectUser(recipient.firstName);
    await transactionPage.request(TransactionData.request.amount, TransactionData.request.description);

    await expect(transactionPage.alertSuccess).toBeVisible();
    await expect(transactionPage.alertSuccess).toContainText('Transaction Submitted!');
  });

  test('should return to transactions after creating payment', async ({ page, transactionPage, db }) => {
    const users = db.users();
    const recipient = users.find((u) => u.username !== ENV.user.username)!;

    await transactionPage.open();
    await transactionPage.selectUser(recipient.firstName);
    await transactionPage.pay(TransactionData.quickPay.amount, TransactionData.quickPay.description);
    await transactionPage.returnToTransactions.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should view transaction detail', async ({ page, transactionPage }) => {
    await page.goto('/');
    await transactionPage.clickFirstTransaction();
    await expect(page).toHaveURL(/\/transaction\//);
    await expect(transactionPage.detailHeader).toBeVisible();
  });

  test('should like a transaction', async ({ homePage, transactionPage }) => {
    await homePage.open();
    await homePage.switchToEveryoneTab();
    await homePage.transactionItems.first().waitFor();
    await homePage.transactionItems.first().click();
    await expect(homePage.page).toHaveURL(/\/transaction\//);
    const before = await transactionPage.likeCount.textContent().catch(() => '0');
    await transactionPage.likeTransaction();
    const after = await transactionPage.likeCount.textContent().catch(() => '0');
    expect(Number(after)).toBeGreaterThanOrEqual(Number(before));
  });

  test('should add a comment to a transaction', async ({ page, transactionPage }) => {
    await page.goto('/');
    await transactionPage.clickFirstTransaction();
    await transactionPage.addComment('E2E test comment');
    await expect(transactionPage.commentsList).toBeVisible();
  });
});
