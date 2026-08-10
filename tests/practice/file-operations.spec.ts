import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

const HEROKU = 'https://the-internet.herokuapp.com';

test.describe('File Upload — the-internet', () => {
  test('should upload a file using setInputFiles with buffer', async ({ page }) => {
    await page.goto(`${HEROKU}/upload`);

    await page.locator('#file-upload').setInputFiles({
      name: 'playwright-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Uploaded via Playwright setInputFiles'),
    });

    await page.locator('#file-submit').click();
    await expect(page.locator('#uploaded-files')).toContainText('playwright-test.txt');
  });

  test('should upload a file from disk path', async ({ page }) => {
    const tempFile = path.join(os.tmpdir(), 'pw-disk-upload.txt');
    fs.writeFileSync(tempFile, 'File content from disk');

    try {
      await page.goto(`${HEROKU}/upload`);
      await page.locator('#file-upload').setInputFiles(tempFile);
      await page.locator('#file-submit').click();
      await expect(page.locator('#uploaded-files')).toContainText('pw-disk-upload.txt');
    } finally {
      fs.rmSync(tempFile, { force: true });
    }
  });
});

test.describe('File Download', () => {
  test('should download a file and verify on disk', async ({ page }) => {
    await page.goto(`${HEROKU}/`);

    await page.evaluate(() => {
      const a = document.createElement('a');
      a.href = 'data:text/plain;charset=utf-8,Hello%20from%20Playwright';
      a.download = 'playwright-test.txt';
      a.id = 'test-dl';
      a.textContent = 'Download';
      document.body.prepend(a);
    });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#test-dl').click(),
    ]);

    expect(download.suggestedFilename()).toBe('playwright-test.txt');

    const savePath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(savePath);
    expect(fs.existsSync(savePath)).toBe(true);

    fs.unlinkSync(savePath);
  });
});
