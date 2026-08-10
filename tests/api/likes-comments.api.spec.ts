import { test, expect } from '../../fixtures/test';
import { ApiClient } from '../../utils/api.client';
import { ENV } from '../../config/env';

test.describe('Likes & Comments API', () => {
  let transactionId: string;

  test.beforeAll(async ({ request }) => {
    const client = new ApiClient(request, ENV.apiURL);
    await client.login(ENV.user.username, ENV.user.password);
    const data = await client.get<{ results: Array<{ id: string }> }>('/transactions/public');
    transactionId = data.results[0].id;
  });

  test('POST /likes/:transactionId likes a transaction', async ({ authedApi }) => {
    const res = await authedApi.postRaw(`/likes/${transactionId}`, {});
    expect([200, 201]).toContain(res.status());
  });

  test('GET /likes/:transactionId returns likes', async ({ authedApi }) => {
    const data = await authedApi.get<{ likes: unknown[] }>(`/likes/${transactionId}`);
    expect(Array.isArray(data.likes)).toBe(true);
  });

  test('POST /comments/:transactionId adds a comment', async ({ authedApi }) => {
    const res = await authedApi.postRaw(`/comments/${transactionId}`, {
      content: 'API test comment',
    });
    expect([200, 201]).toContain(res.status());
  });

  test('GET /comments/:transactionId returns comments', async ({ authedApi }) => {
    const data = await authedApi.get<{ comments: unknown[] }>(`/comments/${transactionId}`);
    expect(Array.isArray(data.comments)).toBe(true);
  });
});
