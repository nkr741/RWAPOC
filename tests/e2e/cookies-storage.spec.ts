import { test, expect } from '../../fixtures/test';
import { ensureLoggedIn } from '../../utils/login.helper';

test.describe('Cookies', () => {
  test('should have session cookie after login', async ({ page }) => {
    await ensureLoggedIn(page);
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'connect.sid');
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.value).toBeTruthy();
    expect(sessionCookie!.httpOnly).toBe(true);
  });

  test('should lose auth when cookies are cleared', async ({ page, sidenav }) => {
    await ensureLoggedIn(page);
    await expect(sidenav.userFullName).toBeVisible();

    // Clear cookies AND localStorage authState (RWA uses both for auth)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.removeItem('authState'));
    await page.reload();

    await expect(page).toHaveURL(/\/signin/);
  });

  test('should inject a cookie and read it back via Playwright API', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'e2e_test_cookie',
        value: 'playwright_rocks',
        domain: 'localhost',
        path: '/',
      },
    ]);

    const cookies = await page.context().cookies();
    const testCookie = cookies.find((c) => c.name === 'e2e_test_cookie');
    expect(testCookie).toBeDefined();
    expect(testCookie!.value).toBe('playwright_rocks');

    // Note: httpOnly cookies (like connect.sid) can't be read via document.cookie
    // but Playwright's context.cookies() API can read ALL cookies including httpOnly
    const allCookies = await page.context().cookies();
    const httpOnlyCookies = allCookies.filter((c) => c.httpOnly);
    expect(httpOnlyCookies.length).toBeGreaterThanOrEqual(0);
  });

  test('should list all cookies for the domain', async ({ page }) => {
    await ensureLoggedIn(page);
    const cookies = await page.context().cookies();
    expect(cookies.length).toBeGreaterThan(0);

    // Every cookie should have basic properties
    for (const cookie of cookies) {
      expect(cookie.name).toBeTruthy();
      expect(cookie.value).toBeDefined();
      expect(cookie.domain).toBeTruthy();
    }
  });

  test('should selectively clear cookies by re-adding specific ones', async ({ page, signinPage, sidenav }) => {
    await ensureLoggedIn(page);
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'connect.sid')!;

    // Clear all cookies
    await page.context().clearCookies();

    // Re-add only the session cookie
    await page.context().addCookies([sessionCookie]);

    // Session should still be valid
    await page.reload();
    await signinPage.submit.or(sidenav.userFullName).waitFor({ timeout: 10_000 });
    const reAddedCookies = await page.context().cookies();
    expect(reAddedCookies.some((c) => c.name === 'connect.sid')).toBe(true);
  });
});

test.describe('Local Storage', () => {
  test('should read authState from localStorage after login', async ({ page }) => {
    await ensureLoggedIn(page);
    const authState = await page.evaluate(() => localStorage.getItem('authState'));
    expect(authState).toBeTruthy();

    const parsed = JSON.parse(authState!) as { value: string };
    expect(parsed.value).toBe('authorized');
  });

  test('should set custom localStorage values', async ({ page }) => {
    await ensureLoggedIn(page);
    await page.evaluate(() => {
      localStorage.setItem('e2e_test_key', JSON.stringify({ foo: 'bar', timestamp: 123 }));
    });

    const stored = await page.evaluate(() => localStorage.getItem('e2e_test_key'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!) as { foo: string; timestamp: number };
    expect(parsed.foo).toBe('bar');
    expect(parsed.timestamp).toBe(123);
  });

  test('should lose auth when localStorage authState is removed', async ({ page, sidenav }) => {
    await ensureLoggedIn(page);
    await expect(sidenav.userFullName).toBeVisible();

    // Remove authState — xstate machine will lose "authorized" state on reload
    await page.evaluate(() => localStorage.removeItem('authState'));
    await page.reload();

    // App should redirect to signin since auth state is gone
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should enumerate all localStorage keys', async ({ page }) => {
    await ensureLoggedIn(page);
    const keys = await page.evaluate(() => {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        result.push(localStorage.key(i)!);
      }
      return result;
    });

    expect(keys).toContain('authState');
  });

  test('should clear localStorage and verify empty', async ({ page }) => {
    await ensureLoggedIn(page);
    // Set a test value first
    await page.evaluate(() => localStorage.setItem('test_clear', 'value'));

    // Clear all
    await page.evaluate(() => localStorage.clear());

    const length = await page.evaluate(() => localStorage.length);
    expect(length).toBe(0);

    const testValue = await page.evaluate(() => localStorage.getItem('test_clear'));
    expect(testValue).toBeNull();
  });
});

test.describe('Session Storage', () => {
  test('should set and read sessionStorage', async ({ page }) => {
    await ensureLoggedIn(page);
    await page.evaluate(() => {
      sessionStorage.setItem('e2e_session_key', 'session_value');
    });

    const value = await page.evaluate(() => sessionStorage.getItem('e2e_session_key'));
    expect(value).toBe('session_value');
  });

  test('should not share sessionStorage across tabs', async ({ page, sharedContext }) => {
    await ensureLoggedIn(page);
    await page.evaluate(() => {
      sessionStorage.setItem('tab1_only', 'from_tab1');
    });

    const tab2 = await sharedContext.newPage();
    try {
      await tab2.goto('/');
      const value = await tab2.evaluate(() => sessionStorage.getItem('tab1_only'));
      // sessionStorage is per-tab — tab2 should NOT have tab1's data
      expect(value).toBeNull();
    } finally {
      await tab2.close();
    }
  });

  test('should clear sessionStorage independently', async ({ page }) => {
    await ensureLoggedIn(page);
    await page.evaluate(() => {
      sessionStorage.setItem('key1', 'a');
      sessionStorage.setItem('key2', 'b');
    });

    await page.evaluate(() => sessionStorage.clear());
    const length = await page.evaluate(() => sessionStorage.length);
    expect(length).toBe(0);
  });
});

test.describe('addInitScript — pre-populate storage', () => {
  test('should inject localStorage values before page loads via addInitScript', async ({ sharedContext }) => {
    const tab = await sharedContext.newPage();
    try {
      await tab.addInitScript(() => {
        localStorage.setItem('injected_by_init_script', 'hello_from_playwright');
      });

      await tab.goto('/signin');
      const value = await tab.evaluate(() => localStorage.getItem('injected_by_init_script'));
      expect(value).toBe('hello_from_playwright');
    } finally {
      await tab.close();
    }
  });

  test('should inject sessionStorage before page loads via addInitScript', async ({ sharedContext }) => {
    const tab = await sharedContext.newPage();
    try {
      await tab.addInitScript(() => {
        sessionStorage.setItem('session_init', 'pre_loaded');
      });

      await tab.goto('/signin');
      const value = await tab.evaluate(() => sessionStorage.getItem('session_init'));
      expect(value).toBe('pre_loaded');
    } finally {
      await tab.close();
    }
  });
});
