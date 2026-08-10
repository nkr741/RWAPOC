import { test, expect } from '../../fixtures/test';

test.describe('Bank Accounts API', () => {
  test('GET /bankAccounts returns user bank accounts', async ({ authedApi }) => {
    const data = await authedApi.get<{ results: unknown[] }>('/bankAccounts');
    expect(Array.isArray(data.results)).toBe(true);
  });

  test('POST /bankAccounts creates a bank account', async ({ authedApi }) => {
    const data = await authedApi.post<{ account: { bankName: string } }>('/bankAccounts', {
      bankName: `API Test Bank ${Date.now()}`,
      accountNumber: '111222333',
      routingNumber: '987654321',
    });
    expect(data.account.bankName).toContain('API Test Bank');
  });

  test('DELETE /bankAccounts/:id soft-deletes an account', async ({ authedApi }) => {
    // Create then delete
    const created = await authedApi.post<{ account: { id: string } }>('/bankAccounts', {
      bankName: 'Delete Me',
      accountNumber: '999888777',
      routingNumber: '123456789',
    });
    const res = await authedApi.delete(`/bankAccounts/${created.account.id}`);
    expect(res.ok()).toBe(true);
  });

  test('GET /bankAccounts requires authentication', async ({ api }) => {
    const res = await api.getRaw('/bankAccounts');
    expect(res.status()).toBe(401);
  });
});
