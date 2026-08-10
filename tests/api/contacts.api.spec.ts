import { test, expect } from '../../fixtures/test';
import { ENV } from '../../config/env';

test.describe('Contacts API', () => {
  test('GET /contacts/:username returns contacts list', async ({ authedApi }) => {
    const data = await authedApi.get<{ contacts: unknown[] }>(
      `/contacts/${ENV.user.username}`,
    );
    expect(Array.isArray(data.contacts)).toBe(true);
  });

  test('POST /contacts creates a contact', async ({ authedApi, db }) => {
    const users = db.users();
    const other = users.find((u) => u.username !== ENV.user.username)!;
    const res = await authedApi.postRaw('/contacts', { contactUserId: other.id });
    // 200 on success, or 422 if contact already exists
    expect([200, 422]).toContain(res.status());
  });
});
