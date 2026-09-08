import { test, expect, Locator, Page } from '@playwright/test';

class LocatorResolver {
  constructor(private page: Page) {}

  async resolve(elementName: string, strategies: Record<string, () => Locator>): Promise<Locator> {
    const tried: string[] = [];
    for (const [name, factory] of Object.entries(strategies)) {
      const loc = factory();
      try {
        if (await loc.count() > 0 && await loc.first().isVisible({ timeout: 1000 })) {
          if (tried.length > 0) {
            console.log(`[LocatorResolver] "${elementName}" — primary failed (${tried.join(', ')}), resolved via: ${name}`);
          }
          return loc.first();
        }
      } catch { /* strategy failed, try next */ }
      tried.push(name);
    }
    throw new Error(`[LocatorResolver] "${elementName}" — all strategies failed: ${tried.join(', ')}`);
  }
}

const loginButtonStrategies = (page: Page) => ({
  'data-test': () => page.getByTestId('signin-submit'),
  'id': () => page.locator('#signin-btn'),
  'role': () => page.getByRole('button', { name: /sign in|log in/i }),
  'type-selector': () => page.locator('form button[type="submit"]'),
});

const usernameStrategies = (page: Page) => ({
  'data-test': () => page.getByTestId('signin-username'),
  'id': () => page.locator('#username'),
  'aria-label': () => page.getByLabel('Username'),
  'placeholder': () => page.getByPlaceholder('Enter username'),
});

test.describe('Self-Healing: Custom LocatorResolver', () => {
  test('resolver finds elements on normal page', async ({ page }) => {
    await page.goto('/');
    const resolver = new LocatorResolver(page);

    const loginBtn = await resolver.resolve('Login Button', loginButtonStrategies(page));
    await expect(loginBtn).toBeVisible();

    const username = await resolver.resolve('Username Input', usernameStrategies(page));
    await expect(username).toBeEditable();
  });

  test('resolver cascades on broken page', async ({ page }) => {
    await page.goto('/?broken');
    const resolver = new LocatorResolver(page);

    const loginBtn = await resolver.resolve('Login Button', loginButtonStrategies(page));
    await expect(loginBtn).toBeVisible();

    const username = await resolver.resolve('Username Input', usernameStrategies(page));
    await expect(username).toBeEditable();
  });

  test('full login via resolver on broken page', async ({ page }) => {
    await page.goto('/?broken');
    const resolver = new LocatorResolver(page);

    const username = await resolver.resolve('Username', usernameStrategies(page));
    await username.fill('demo');

    const password = await resolver.resolve('Password', {
      'data-test': () => page.getByTestId('signin-password'),
      'label': () => page.getByLabel('Password'),
      'type': () => page.locator('input[type="password"]'),
    });
    await password.fill('password123');

    const submit = await resolver.resolve('Submit', loginButtonStrategies(page));
    await submit.click();

    await expect(page.locator('h1', { hasText: /welcome|hello/i })).toBeVisible();
  });
});
