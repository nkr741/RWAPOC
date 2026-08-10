import { test, expect } from '@playwright/test';

const HEROKU = 'https://the-internet.herokuapp.com';

test.describe('Hover — the-internet', () => {
  test('should reveal hidden content on hover', async ({ page }) => {
    await page.goto(`${HEROKU}/hovers`);

    const firstFigure = page.locator('.figure').first();
    await expect(firstFigure.locator('.figcaption')).toBeHidden();

    await firstFigure.hover();
    await expect(firstFigure.locator('.figcaption')).toBeVisible();
    await expect(firstFigure.locator('h5')).toContainText('user1');
  });
});

test.describe('Keyboard', () => {
  test('should detect individual key presses', async ({ page }) => {
    await page.goto(`${HEROKU}/key_presses`);
    const result = page.locator('#result');

    await page.locator('#target').click();

    await page.keyboard.press('a');
    await expect(result).toHaveText(/You entered/);

    await page.keyboard.press('b');
    await expect(result).toHaveText(/You entered/);

    await expect(result).toHaveText(/You entered/);
    await page.keyboard.press('1');
    await expect(result).toHaveText(/You entered/);
  });

  test('should type text and use keyboard shortcuts', async ({ page }) => {
    await page.setContent('<input id="input" type="text">');
    const input = page.locator('#input');

    await input.click();
    await page.keyboard.type('Hello World', { delay: 30 });
    await expect(input).toHaveValue('Hello World');

    await page.keyboard.press('Control+A');
    await page.keyboard.type('Replaced');
    await expect(input).toHaveValue('Replaced');
  });
});

test.describe('Drag and Drop — the-internet', () => {
  test('should drag column A to column B', async ({ page }) => {
    await page.goto(`${HEROKU}/drag_and_drop`);

    await expect(page.locator('#column-a header')).toHaveText('A');
    await expect(page.locator('#column-b header')).toHaveText('B');

    await page.locator('#column-a').dragTo(page.locator('#column-b'));

    await expect(page.locator('#column-a header')).toHaveText('B');
    await expect(page.locator('#column-b header')).toHaveText('A');
  });
});

test.describe('Mouse Actions', () => {
  test('should click at specific coordinates using mouse API', async ({ page }) => {
    await page.setContent(`
      <div id="canvas" style="width:300px;height:300px;background:#f0f0f0;position:relative">
        <span id="coords" style="position:absolute;bottom:4px;left:4px;font-size:12px"></span>
      </div>
      <script>
        document.getElementById('canvas').addEventListener('click', function(e) {
          document.getElementById('coords').textContent =
            Math.round(e.offsetX) + ',' + Math.round(e.offsetY);
        });
      </script>
    `);

    const box = await page.locator('#canvas').boundingBox();
    await page.mouse.click(box!.x + 150, box!.y + 100);

    await expect(page.locator('#coords')).toContainText('150,100');
  });
});
