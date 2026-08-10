import { test, expect } from '@playwright/test';

const HEROKU = 'https://the-internet.herokuapp.com';

test.describe('Network Interception & Mocking', () => {
  test('should block images with route.abort', async ({ page }) => {
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'image') {
        await route.abort();
      } else {
        await route.continue();
      }
    });

    await page.goto(`${HEROKU}/broken_images`);

    const images = page.locator('img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const naturalWidth = await images
        .nth(i)
        .evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBe(0);
    }
  });

  test('should modify request headers with route.continue', async ({ page }) => {
    let modifiedHeaders: Record<string, string> = {};

    await page.route('**/todos/2', async (route) => {
      const headers = {
        ...route.request().headers(),
        'x-custom-header': 'added-by-playwright',
        'x-request-id': 'test-123',
      };
      modifiedHeaders = headers;
      await route.continue({ headers });
    });

    await page.goto('https://jsonplaceholder.typicode.com/todos/2');
    expect(modifiedHeaders['x-custom-header']).toBe('added-by-playwright');
    expect(modifiedHeaders['x-request-id']).toBe('test-123');
  });

  test('should mock API response with route.fulfill', async ({ page }) => {
    await page.route('**/api/mock-data', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: ['alpha', 'beta'], total: 2 }),
      }),
    );

    await page.goto(`${HEROKU}/`);

    const data = await page.evaluate(async () => {
      const res = await fetch('/api/mock-data');
      return res.json() as Promise<{ items: string[]; total: number }>;
    });

    expect(data.items).toEqual(['alpha', 'beta']);
    expect(data.total).toBe(2);
  });

  test('should intercept and modify response body via route.fetch', async ({ page }) => {
    await page.route('**/todos/1', async (route) => {
      const response = await route.fetch();
      const json = (await response.json()) as { title: string; userId: number };
      json.title = 'INTERCEPTED BY PLAYWRIGHT';
      await route.fulfill({ response, body: JSON.stringify(json) });
    });

    const response = await page.goto(
      'https://jsonplaceholder.typicode.com/todos/1',
    );
    const body = (await response!.json()) as { title: string; userId: number };
    expect(body.title).toBe('INTERCEPTED BY PLAYWRIGHT');
    expect(body.userId).toBe(1);
  });
});
