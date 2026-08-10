import { test, expect } from '../../fixtures/test';

test.describe('Transactions API', () => {
  test('GET /transactions returns paginated results', async ({ authedApi }) => {
    const data = await authedApi.get<{ results: unknown[]; pageData: { totalPages: number } }>(
      '/transactions',
    );
    expect(data.results).toBeDefined();
    expect(data.pageData.totalPages).toBeGreaterThanOrEqual(1);
  });

  test('GET /transactions/public returns public feed', async ({ authedApi }) => {
    const data = await authedApi.get<{ results: unknown[] }>('/transactions/public');
    expect(data.results.length).toBeGreaterThan(0);
  });

  test('POST /transactions creates a payment', async ({ authedApi, db }) => {
    const users = db.users();
    const sender = users[0];
    const receiver = users[1];

    const data = await authedApi.post<{ transaction: { id: string; status: string } }>(
      '/transactions',
      {
        transactionType: 'payment',
        amount: 1000,
        description: 'API test payment',
        senderId: sender.id,
        receiverId: receiver.id,
      },
    );
    expect(data.transaction.id).toBeDefined();
    expect(data.transaction.status).toBe('complete');
  });

  test('GET /transactions/:id returns a specific transaction', async ({ authedApi, db }) => {
    const txns = db.transactions();
    const txn = txns[0];

    const data = await authedApi.get<{ transaction: { id: string } }>(
      `/transactions/${txn.id}`,
    );
    expect(data.transaction.id).toBe(txn.id);
  });
});
