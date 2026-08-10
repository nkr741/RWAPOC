import { test, expect } from '../../fixtures/test';
import { ensureLoggedIn } from '../../utils/login.helper';

const wrap = (body: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;

test.describe('Iframes & Frames', () => {
  test('should interact with iframe content via frameLocator', async ({ page }) => {
    await page.route('**/test-fl-parent', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <h1 id="parent-heading">Parent</h1>
          <iframe id="child" name="child" src="/test-fl-child" style="width:400px;height:300px"></iframe>
        `),
      }),
    );
    await page.route('**/test-fl-child', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <h2 id="heading">Child Frame</h2>
          <input id="input" type="text">
          <button id="btn">Click</button>
          <script>document.getElementById('btn').onclick=()=>document.getElementById('heading').textContent='Clicked!'</script>
        `),
      }),
    );

    await page.goto('/test-fl-parent');
    await expect(page.locator('#parent-heading')).toHaveText('Parent');

    const frame = page.frameLocator('#child');
    await expect(frame.locator('#heading')).toHaveText('Child Frame');
    await frame.locator('#input').fill('Hello Playwright');
    await expect(frame.locator('#input')).toHaveValue('Hello Playwright');
    await frame.locator('#btn').click();
    await expect(frame.locator('#heading')).toHaveText('Clicked!');
  });

  test('should access frame by name via page.frame()', async ({ page }) => {
    await page.route('**/test-named-parent', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`<iframe name="my-frame" src="/test-named-child" style="width:300px;height:200px"></iframe>`),
      }),
    );
    await page.route('**/test-named-child', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`<p id="msg">Named Frame Content</p>`),
      }),
    );

    await page.goto('/test-named-parent');
    const frame = page.frame({ name: 'my-frame' });
    expect(frame).not.toBeNull();
    await expect(frame!.locator('#msg')).toHaveText('Named Frame Content');
  });

  test('should access frame by URL pattern', async ({ page }) => {
    await page.route('**/test-byurl-parent', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`<iframe src="/test-byurl-child-unique" style="width:300px;height:200px"></iframe>`),
      }),
    );
    await page.route('**/test-byurl-child-unique', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`<p id="found">Found by URL</p>`),
      }),
    );

    await page.goto('/test-byurl-parent');
    const frame = page.frame({ url: /test-byurl-child-unique/ });
    expect(frame).not.toBeNull();
    await expect(frame!.locator('#found')).toHaveText('Found by URL');
  });

  test('should enumerate all frames on the page', async ({ page }) => {
    await page.route('**/test-enum-parent', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <iframe name="frame-a" src="/test-enum-a" style="width:200px;height:100px"></iframe>
          <iframe name="frame-b" src="/test-enum-b" style="width:200px;height:100px"></iframe>
          <iframe name="frame-c" src="/test-enum-c" style="width:200px;height:100px"></iframe>
        `),
      }),
    );
    for (const id of ['a', 'b', 'c']) {
      await page.route(`**/test-enum-${id}`, (r) =>
        r.fulfill({ contentType: 'text/html', body: wrap(`<p>Frame ${id}</p>`) }),
      );
    }

    await page.goto('/test-enum-parent');
    const frames = page.frames();
    expect(frames.length).toBeGreaterThanOrEqual(4); // main + 3 iframes
    const names = frames.map((f) => f.name());
    expect(names).toContain('frame-a');
    expect(names).toContain('frame-b');
    expect(names).toContain('frame-c');
  });

  test('should interact with nested iframes (parent > outer > inner)', async ({ page }) => {
    await page.route('**/test-nest-parent', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <h1 id="top">Top Level</h1>
          <iframe id="outer" name="outer" src="/test-nest-outer" style="width:500px;height:400px"></iframe>
        `),
      }),
    );
    await page.route('**/test-nest-outer', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <h2 id="mid">Middle Level</h2>
          <iframe id="inner" name="inner" src="/test-nest-inner" style="width:300px;height:200px"></iframe>
        `),
      }),
    );
    await page.route('**/test-nest-inner', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <h3 id="deep">Deepest Level</h3>
          <button id="deep-btn">Deep Click</button>
          <script>document.getElementById('deep-btn').onclick=()=>document.getElementById('deep').textContent='Deep Clicked!'</script>
        `),
      }),
    );

    await page.goto('/test-nest-parent');
    await expect(page.locator('#top')).toHaveText('Top Level');

    const outer = page.frameLocator('#outer');
    await expect(outer.locator('#mid')).toHaveText('Middle Level');

    const inner = outer.frameLocator('#inner');
    await expect(inner.locator('#deep')).toHaveText('Deepest Level');
    await inner.locator('#deep-btn').click();
    await expect(inner.locator('#deep')).toHaveText('Deep Clicked!');
  });

  test('should handle cross-frame postMessage communication', async ({ page }) => {
    await page.route('**/test-msg-parent', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <div id="received"></div>
          <iframe id="msg-frame" name="msg-frame" src="/test-msg-child" style="width:400px;height:200px"></iframe>
          <script>window.addEventListener('message',e=>document.getElementById('received').textContent=e.data)</script>
        `),
      }),
    );
    await page.route('**/test-msg-child', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <button id="send">Send to Parent</button>
          <div id="child-received"></div>
          <script>
            document.getElementById('send').onclick=()=>parent.postMessage('hello from iframe','*');
            window.addEventListener('message',e=>document.getElementById('child-received').textContent=e.data);
          </script>
        `),
      }),
    );

    await page.goto('/test-msg-parent');
    const frame = page.frameLocator('#msg-frame');

    // iframe → parent
    await frame.locator('#send').click();
    await expect(page.locator('#received')).toHaveText('hello from iframe');

    // parent → iframe
    await page.evaluate(() => {
      const iframe = document.getElementById('msg-frame') as HTMLIFrameElement;
      iframe.contentWindow!.postMessage('hello from parent', '*');
    });
    await expect(frame.locator('#child-received')).toHaveText('hello from parent');
  });

  test('should embed real RWA page inside an iframe', async ({ page }) => {
    await ensureLoggedIn(page);

    await page.route('**/test-rwa-embed', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: wrap(`
          <h1 id="wrapper">RWA Embedded</h1>
          <iframe id="rwa" name="rwa" src="/bankaccounts" style="width:100%;height:600px;border:1px solid #ccc"></iframe>
        `),
      }),
    );

    await page.goto('/test-rwa-embed');
    await expect(page.locator('#wrapper')).toHaveText('RWA Embedded');

    const rwaFrame = page.frameLocator('#rwa');
    await expect(rwaFrame.locator('[data-test="bankaccount-list"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should handle iframes independently across multiple tabs', async ({
    page,
    sharedContext,
  }) => {
    const parentHtml = wrap(`
      <h1 id="tab-heading">Tab Page</h1>
      <iframe id="frame" name="tab-frame" src="/test-mtf-child" style="width:400px;height:200px"></iframe>
    `);
    const childHtml = wrap(`
      <input id="frame-input" type="text">
      <p id="frame-value"></p>
      <script>document.getElementById('frame-input').oninput=e=>document.getElementById('frame-value').textContent=e.target.value</script>
    `);

    await page.route('**/test-mtf-page', (r) =>
      r.fulfill({ contentType: 'text/html', body: parentHtml }),
    );
    await page.route('**/test-mtf-child', (r) =>
      r.fulfill({ contentType: 'text/html', body: childHtml }),
    );

    const tab2 = await sharedContext.newPage();
    try {
      await tab2.route('**/test-mtf-page', (r) =>
        r.fulfill({ contentType: 'text/html', body: parentHtml }),
      );
      await tab2.route('**/test-mtf-child', (r) =>
        r.fulfill({ contentType: 'text/html', body: childHtml }),
      );

      await page.goto('/test-mtf-page');
      await tab2.goto('/test-mtf-page');

      const frame1 = page.frameLocator('#frame');
      const frame2 = tab2.frameLocator('#frame');

      await frame1.locator('#frame-input').fill('Tab 1 typing');
      await frame2.locator('#frame-input').fill('Tab 2 typing');

      // Each tab's iframe maintains independent state
      await expect(frame1.locator('#frame-value')).toHaveText('Tab 1 typing');
      await expect(frame2.locator('#frame-value')).toHaveText('Tab 2 typing');
    } finally {
      await tab2.close();
    }
  });
});
