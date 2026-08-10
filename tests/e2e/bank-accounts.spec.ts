import { test, expect } from '../../fixtures/test';
import { BankAccountData } from '../../data/test-data';
import { ensureLoggedIn } from '../../utils/login.helper';

test.describe('Bank Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('should navigate to bank accounts via sidenav', async ({ page, sidenav, bankAccountPage }) => {
    await sidenav.navigateBankAccounts();
    await expect(page).toHaveURL(/\/bankaccounts/);
    await expect(bankAccountPage.list).toBeVisible();
  });

  test('should display existing bank accounts', async ({ bankAccountPage }) => {
    await bankAccountPage.open();
    await expect(bankAccountPage.list).toBeVisible();
  });

  test('should create a new bank account', async ({ bankAccountPage }) => {
    await bankAccountPage.open();
    await bankAccountPage.createAccount(
      BankAccountData.valid.bankName,
      BankAccountData.valid.routingNumber,
      BankAccountData.valid.accountNumber,
    );
    await expect(bankAccountPage.page).toHaveURL(/\/bankaccounts$/);
    await expect(bankAccountPage.list).toBeVisible();
  });

  test('should validate bank account form fields', async ({ page, bankAccountPage }) => {
    await page.goto('/bankaccounts/new');
    await bankAccountPage.bankName.fill('Test');
    await bankAccountPage.routingNumber.fill('123');
    await bankAccountPage.routingNumber.blur();
    await expect(bankAccountPage.routingNumberError).toBeVisible();
  });

  test('should delete a bank account', async ({ bankAccountPage }) => {
    await bankAccountPage.open();
    await bankAccountPage.deleteBtn.first().waitFor();
    await bankAccountPage.deleteFirstAccount();
    await expect(bankAccountPage.deletedLabel.first()).toBeVisible();
  });
});
