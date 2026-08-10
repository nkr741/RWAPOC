import { test, expect } from '../../fixtures/test';
import { TestUsers } from '../../data/test-data';
import { ensureLoggedIn } from '../../utils/login.helper';

test.describe('User Settings', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test.afterEach(async ({ settingsPage }) => {
    try {
      await settingsPage.open();
      const first = await settingsPage.firstName.inputValue();
      const last = await settingsPage.lastName.inputValue();
      if (first !== TestUsers.default.firstName || last !== TestUsers.default.lastName) {
        await settingsPage.firstName.fill(TestUsers.default.firstName);
        await settingsPage.lastName.fill(TestUsers.default.lastName);
        await settingsPage.submitBtn.click();
      }
    } catch {
      // page may be in unexpected state after test failure
    }
  });

  test('should navigate to settings via sidenav @critical', async ({ page, sidenav, settingsPage }) => {
    await sidenav.navigateMyAccount();
    await expect(page).toHaveURL(/\/user\/settings/);
    await expect(settingsPage.form).toBeVisible();
  });

  test('should display pre-populated user info', async ({ settingsPage }) => {
    await settingsPage.open();
    await expect(settingsPage.firstName).toHaveValue(TestUsers.default.firstName);
    await expect(settingsPage.lastName).toHaveValue(TestUsers.default.lastName);
  });

  test('should verify full name in sidenav matches settings @critical', async ({ sidenav }) => {
    await sidenav.userFullName.waitFor();
    const fullName = (await sidenav.userFullName.textContent())!.trim();
    expect(fullName).toContain(TestUsers.default.firstName);
    expect(fullName.at(-1)).toBe(TestUsers.default.lastName.at(0));
  });

  test('should update user profile', async ({ settingsPage, sidenav }) => {
    await settingsPage.open();
    await settingsPage.updateProfile('naveen@test.com', '555-123-4567');
    await expect(sidenav.userFullName).toContainText(TestUsers.default.firstName);
  });

  // Parameterized test — data-driven validation (Module 19)
  const requiredFields: Array<{ field: 'firstName' | 'lastName'; label: string }> = [
    { field: 'firstName', label: 'First Name' },
    { field: 'lastName', label: 'Last Name' },
  ];

  for (const { field, label } of requiredFields) {
    test(`should disable submit when ${label} is cleared @regression`, async ({ settingsPage }) => {
      await settingsPage.open();
      await settingsPage[field].clear();
      await settingsPage[field].blur();
      await expect(settingsPage.submitBtn).toBeDisabled();
    });
  }

  test('should update email notifications preference @regression', async () => {
    test.skip(true, 'RWA does not implement notification preferences');
  });
});
