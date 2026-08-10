import { test, expect } from '../../fixtures/test';

test.describe('Notifications API', () => {
  test('GET /notifications returns user notifications', async ({ authedApi }) => {
    const data = await authedApi.get<{ results: unknown[] }>('/notifications');
    expect(Array.isArray(data.results)).toBe(true);
  });

  test('GET /notifications requires authentication', async ({ api }) => {
    const res = await api.getRaw('/notifications');
    expect(res.status()).toBe(401);
  });
});
