import { test, expect } from '../../fixtures/test';
import { ENV } from '../../config/env';
import { ensureLoggedIn } from '../../utils/login.helper';
import type { RwaTransaction } from '../../utils/db.client';

test.describe('Transaction lifecycle — UI + API + DB', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test('creating a payment persists across all three layers @smoke', async ({
    transactionPage,
    topnav,
    authedApi,
    db,
  }) => {
    const users = db.users();
    const sender = users.find((u) => u.username === ENV.user.username)!;
    const receiver = users.find((u) => u.username !== ENV.user.username)!;
    const description = `Integration_${Date.now()}`;

    await test.step('LAYER 1 — send a payment via UI', async () => {
      await topnav.clickNewTransaction();
      await transactionPage.selectUser(receiver.firstName);
      await transactionPage.pay('5', description);
      await expect(transactionPage.alertSuccess).toBeVisible();
    });

    await test.step('LAYER 2 — API confirms the transaction', async () => {
      const data = await authedApi.get<{ results: Array<{ description: string }> }>(
        '/transactions',
      );
      const found = data.results.find((t) => t.description === description);
      expect(found, 'transaction must appear in API response').toBeDefined();
    });

    // eslint-disable-next-line @typescript-eslint/require-await
    await test.step('LAYER 3 — database persisted the transaction', async () => {
      const txns = db.transactionsForUser(sender.id);
      const match = txns.find((t: RwaTransaction) => t.description === description);
      expect(match, 'transaction must exist in DB file').toBeDefined();
      expect(match!.status).toBe('complete');
      expect(match!.senderId).toBe(sender.id);
      expect(match!.receiverId).toBe(receiver.id);
    });
  });
});
