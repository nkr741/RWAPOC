import type { Page, Locator } from '@playwright/test';

export class SideNavComponent {
  readonly userFullName: Locator;
  readonly username: Locator;
  readonly userBalance: Locator;
  private readonly homeLink: Locator;
  private readonly settingsLink: Locator;
  private readonly bankAccountsLink: Locator;
  private readonly notificationsLink: Locator;
  private readonly logoutLink: Locator;

  constructor(page: Page) {
    this.userFullName = page.getByTestId('sidenav-user-full-name');
    this.username = page.getByTestId('sidenav-username');
    this.userBalance = page.getByTestId('sidenav-user-balance');
    this.homeLink = page.getByTestId('sidenav-home');
    this.settingsLink = page.getByTestId('sidenav-user-settings');
    this.bankAccountsLink = page.getByTestId('sidenav-bankaccounts');
    this.notificationsLink = page.getByTestId('sidenav-notifications');
    this.logoutLink = page.getByTestId('sidenav-signout');
  }

  async navigateHome() {
    await this.homeLink.click();
  }

  async navigateMyAccount() {
    await this.settingsLink.click();
  }

  async navigateBankAccounts() {
    await this.bankAccountsLink.click();
  }

  async navigateNotifications() {
    await this.notificationsLink.click();
  }

  async logout() {
    await this.logoutLink.click();
  }
}
