import { test, expect } from '../../fixtures/test';
import { ENV } from '../../config/env';
import { TestUsers } from '../../data/test-data';

test.describe('Users API', () => {
  test('GET /users returns a list of users', async ({ authedApi }) => {
    const data = await authedApi.get<{ results: unknown[] }>('/users');
    expect(data.results.length).toBeGreaterThan(1);
  });

  test('GET /users/profile/:username returns public profile', async ({ authedApi }) => {
    const data = await authedApi.get<{ user: { firstName: string; lastName: string } }>(
      `/users/profile/${ENV.user.username}`,
    );
    expect(data.user.firstName).toBe(TestUsers.default.firstName);
    expect(data.user.lastName).toBe(TestUsers.default.lastName);
    expect(data.user).not.toHaveProperty('balance');
  });

  test('GET /users/search finds user by username', async ({ authedApi }) => {
    const data = await authedApi.get<{ results: Array<{ username: string }> }>(
      '/users/search?q=Arvilla_Hegmann',
    );
    expect(data.results.length).toBeGreaterThanOrEqual(1);
    expect(data.results[0].username).toContain('Arvilla');
  });

  test('POST /users creates a new user', async ({ authedApi }) => {
    const newUser = {
      firstName: 'Playwright',
      lastName: 'Tester',
      username: `pw_test_${Date.now()}`,
      password: 's3cret',
      email: `pw_${Date.now()}@test.com`,
      phoneNumber: '555-123-4567',
      avatar: 'https://example.com/avatar.png',
    };
    const data = await authedApi.post<{ user: { firstName: string } }>('/users', newUser);
    expect(data.user.firstName).toBe('Playwright');
  });

  test('POST /login authenticates a user', async ({ api }) => {
    const res = await api.postRaw('/login', {
      username: ENV.user.username,
      password: ENV.user.password,
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { user: { username: string } };
    expect(body.user.username).toBe(ENV.user.username);
  });

  test('POST /login rejects invalid credentials', async ({ api }) => {
    const res = await api.postRaw('/login', {
      username: ENV.user.username,
      password: 'wrong',
    });
    expect(res.status()).toBe(401);
  });
});
