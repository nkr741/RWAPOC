import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { ENV } from '../config/env';
import { SigninPage } from '../pages/signin.page';
import { SignupPage } from '../pages/signup.page';
import { HomePage } from '../pages/home.page';
import { TransactionPage } from '../pages/transaction.page';
import { BankAccountPage } from '../pages/bankaccount.page';
import { NotificationPage } from '../pages/notification.page';
import { SettingsPage } from '../pages/settings.page';
import { SideNavComponent } from '../pages/components/sidenav.component';
import { TopNavComponent } from '../pages/components/topnav.component';
import { ApiClient } from '../utils/api.client';
import { DbClient } from '../utils/db.client';
import { registerOnboardingHandler } from '../utils/onboarding.helper';

type Fixtures = {
  signinPage: SigninPage;
  signupPage: SignupPage;
  homePage: HomePage;
  transactionPage: TransactionPage;
  bankAccountPage: BankAccountPage;
  notificationPage: NotificationPage;
  settingsPage: SettingsPage;
  sidenav: SideNavComponent;
  topnav: TopNavComponent;
  api: ApiClient;
  authedApi: ApiClient;
};

type WorkerFixtures = {
  db: DbClient;
  sharedContext: BrowserContext;
  sharedPage: Page;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  db: [
    async ({}, use) => {
      const client = new DbClient();
      await use(client);
      client.dispose();
    },
    { scope: 'worker' },
  ],

  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ baseURL: ENV.baseURL });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  sharedPage: [
    async ({ sharedContext }, use) => {
      const page = await sharedContext.newPage();
      await registerOnboardingHandler(page);
      await use(page);
    },
    { scope: 'worker' },
  ],

  page: async ({ sharedPage }, use) => {
    await use(sharedPage);
  },

  // Components (keyword-driven layer)
  sidenav: async ({ sharedPage }, use) => {
    await use(new SideNavComponent(sharedPage));
  },
  topnav: async ({ sharedPage }, use) => {
    await use(new TopNavComponent(sharedPage));
  },

  // Page Objects (POM layer)
  signinPage: async ({ sharedPage }, use) => {
    await use(new SigninPage(sharedPage));
  },
  signupPage: async ({ sharedPage }, use) => {
    await use(new SignupPage(sharedPage));
  },
  homePage: async ({ sharedPage }, use) => {
    await use(new HomePage(sharedPage));
  },
  transactionPage: async ({ sharedPage }, use) => {
    await use(new TransactionPage(sharedPage));
  },
  bankAccountPage: async ({ sharedPage }, use) => {
    await use(new BankAccountPage(sharedPage));
  },
  notificationPage: async ({ sharedPage }, use) => {
    await use(new NotificationPage(sharedPage));
  },
  settingsPage: async ({ sharedPage }, use) => {
    await use(new SettingsPage(sharedPage));
  },

  // API layer
  api: async ({ request }, use) => {
    await use(new ApiClient(request, ENV.apiURL));
  },
  authedApi: async ({ request }, use) => {
    const client = new ApiClient(request, ENV.apiURL);
    await client.login(ENV.user.username, ENV.user.password);
    await use(client);
  },
});

export { expect } from '@playwright/test';
