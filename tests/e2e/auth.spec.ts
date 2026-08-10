import { test, expect } from '../../fixtures/test';
import { TestUsers, SignupData } from '../../data/test-data';
import { ensureLoggedOut } from '../../utils/login.helper';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test('should redirect unauthenticated user to signin', async ({ page }) => {
    await page.goto('/personal');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should sign in successfully', async ({ signinPage }) => {
    await signinPage.open();
    await signinPage.login(TestUsers.default.username, TestUsers.default.password);
    await signinPage.page.waitForURL('**/');
    await expect(signinPage.sidenav.userFullName).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ signinPage }) => {
    await signinPage.open();
    await signinPage.login(TestUsers.invalid.username, TestUsers.invalid.password);
    await expect(signinPage.error).toBeVisible();
    await expect(signinPage.error).toContainText('Username or password is invalid');
  });

  test('should show validation errors on empty submit', async ({ signinPage }) => {
    await signinPage.open();
    await signinPage.username.click();
    await signinPage.password.click();
    await signinPage.username.click();
    await expect(signinPage.usernameRequired).toBeVisible();
  });

  test('should allow signup, login, and logout', async ({ signinPage, signupPage, sidenav }) => {
    const newUser = SignupData.newUser();

    await signupPage.open();
    await signupPage.signup(newUser);

    await signinPage.username.waitFor();
    await signinPage.login(newUser.username, newUser.password);
    await signinPage.page.waitForURL('**/');

    await sidenav.logout();
    await expect(signinPage.page).toHaveURL(/\/signin/);
  });

  test('should navigate between signin and signup', async ({ signinPage, signupPage }) => {
    await signinPage.open();
    await signinPage.submit.waitFor();

    await expect(signinPage.signupLink).toBeVisible();
    await expect(signinPage.signupLink).toHaveAttribute('href', '/signup');

    await signupPage.open();
    await expect(signupPage.page).toHaveURL(/\/signup/);
    await expect(signupPage.submit).toBeVisible();

    await expect(signupPage.signinLink).toBeVisible();

    await signinPage.open();
    await expect(signinPage.page).toHaveURL(/\/signin/);
    await expect(signinPage.submit).toBeVisible();
  });
});
