import { test, expect } from '@playwright/test';

const HEROKU = 'https://the-internet.herokuapp.com';

test.describe('Checkboxes — the-internet', () => {
  test('should check, uncheck, and verify checkbox state', async ({ page }) => {
    await page.goto(`${HEROKU}/checkboxes`);
    const checkbox1 = page.locator('#checkboxes input').first();
    const checkbox2 = page.locator('#checkboxes input').last();

    await expect(checkbox1).not.toBeChecked();
    await expect(checkbox2).toBeChecked();

    await checkbox1.check();
    await expect(checkbox1).toBeChecked();

    await checkbox2.uncheck();
    await expect(checkbox2).not.toBeChecked();

    await checkbox2.check();
    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).toBeChecked();
  });
});

test.describe('Dropdown — the-internet', () => {
  test('should select options by value, label, and index', async ({ page }) => {
    await page.goto(`${HEROKU}/dropdown`);
    const dropdown = page.locator('#dropdown');

    await dropdown.selectOption('1');
    await expect(dropdown).toHaveValue('1');

    await dropdown.selectOption({ label: 'Option 2' });
    await expect(dropdown).toHaveValue('2');

    await dropdown.selectOption({ index: 1 });
    await expect(dropdown).toHaveValue('1');
  });
});

test.describe('Radio Buttons', () => {
  test('should select and verify radio buttons', async ({ page }) => {
    await page.setContent(`
      <form>
        <label><input type="radio" name="color" value="red"> Red</label><br>
        <label><input type="radio" name="color" value="blue"> Blue</label><br>
        <label><input type="radio" name="color" value="green"> Green</label>
      </form>
    `);

    const red = page.locator('input[value="red"]');
    const blue = page.locator('input[value="blue"]');
    const green = page.locator('input[value="green"]');

    await red.check();
    await expect(red).toBeChecked();
    await expect(blue).not.toBeChecked();

    await green.check();
    await expect(green).toBeChecked();
    await expect(red).not.toBeChecked();
  });
});

test.describe('E-commerce sort dropdown', () => {
  test('should sort products using selectOption by value and label', async ({ page }) => {
    await page.setContent(`
      <select id="sort">
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="price-asc">Price (Low to High)</option>
        <option value="price-desc">Price (High to Low)</option>
      </select>
      <ul id="products">
        <li data-price="29.99" data-name="Backpack">Backpack - $29.99</li>
        <li data-price="9.99" data-name="Bike Light">Bike Light - $9.99</li>
        <li data-price="15.99" data-name="T-Shirt">T-Shirt - $15.99</li>
      </ul>
      <script>
        document.getElementById('sort').addEventListener('change', function(e) {
          var items = Array.from(document.querySelectorAll('#products li'));
          var val = e.target.value;
          items.sort(function(a, b) {
            if (val === 'name-asc') return a.dataset.name.localeCompare(b.dataset.name);
            if (val === 'name-desc') return b.dataset.name.localeCompare(a.dataset.name);
            if (val === 'price-asc') return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
            return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
          });
          var ul = document.getElementById('products');
          items.forEach(function(i) { ul.appendChild(i); });
        });
      </script>
    `);

    const sort = page.locator('#sort');

    await sort.selectOption('price-asc');
    const first = await page.locator('#products li').first().textContent();
    expect(first).toContain('9.99');

    await sort.selectOption({ label: 'Name (Z-A)' });
    const topName = await page.locator('#products li').first().textContent();
    expect(topName).toContain('T-Shirt');
  });
});
