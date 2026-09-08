import { test, expect, Page, Locator } from '@playwright/test';

interface ElementFingerprint {
  tag: string;
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  role?: string;
  textContent?: string;
  parentTag?: string;
}

async function captureFingerprint(locator: Locator): Promise<ElementFingerprint> {
  return locator.evaluate(el => ({
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') ?? undefined,
    placeholder: el.getAttribute('placeholder') ?? undefined,
    ariaLabel: el.getAttribute('aria-label') ?? undefined,
    role: el.getAttribute('role') ?? el.tagName.toLowerCase() === 'button' ? 'button' : undefined,
    textContent: el.textContent?.trim().slice(0, 50) || undefined,
    parentTag: el.parentElement?.tagName.toLowerCase() ?? undefined,
  }));
}

function rebuildLocator(page: Page, fp: ElementFingerprint): Locator {
  if (fp.ariaLabel) return page.getByLabel(fp.ariaLabel);
  if (fp.placeholder) return page.getByPlaceholder(fp.placeholder);
  // Prefer type attribute for buttons — text content changes across redesigns
  if (fp.type) return page.locator(`${fp.tag}[type="${fp.type}"]`);
  if (fp.role && fp.textContent) return page.getByRole(fp.role as 'button', { name: fp.textContent });
  return page.locator(fp.tag);
}

test.describe('Self-Healing: Dynamic Locator Builder', () => {
  test('capture fingerprint and rebuild locator', async ({ page }) => {
    await page.goto('/');
    const original = page.getByTestId('signin-username');
    const fp = await captureFingerprint(original);

    expect(fp.tag).toBe('input');
    expect(fp.placeholder).toBe('Enter username');

    // Rebuild from fingerprint — works even after data-test removed
    await page.goto('/?broken');
    const rebuilt = rebuildLocator(page, fp);
    await expect(rebuilt).toBeVisible();
    await rebuilt.fill('demo');
    await expect(rebuilt).toHaveValue('demo');
  });

  test('fingerprint captures button and rebuilds via role', async ({ page }) => {
    await page.goto('/');
    const original = page.getByTestId('signin-submit');
    const fp = await captureFingerprint(original);

    expect(fp.tag).toBe('button');

    await page.goto('/?broken');
    const rebuilt = rebuildLocator(page, fp);
    await expect(rebuilt.first()).toBeVisible();
  });

  test('full login using fingerprint-rebuilt locators', async ({ page }) => {
    // Phase 1: capture fingerprints from working page
    await page.goto('/');
    const userFp = await captureFingerprint(page.getByTestId('signin-username'));
    const passFp = await captureFingerprint(page.getByTestId('signin-password'));
    const btnFp = await captureFingerprint(page.getByTestId('signin-submit'));

    // Phase 2: use rebuilt locators on broken page
    await page.goto('/?broken');
    await rebuildLocator(page, userFp).fill('demo');
    await rebuildLocator(page, passFp).fill('password123');
    await rebuildLocator(page, btnFp).first().click();

    await expect(page.locator('h1', { hasText: /welcome|hello/i })).toBeVisible();
  });
});
