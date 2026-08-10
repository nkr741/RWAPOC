import type { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  async login(username: string, password: string): Promise<void> {
    const res = await this.request.post(`${this.baseUrl}/login`, {
      data: { username, password },
    });
    if (!res.ok()) throw new ApiError(`Login failed for ${username}`, res.status(), '/login');
  }

  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.request.get(url);
    if (!res.ok()) throw new ApiError(`GET ${url} -> ${res.status()}`, res.status(), url);
    return (await res.json()) as T;
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.request.post(url, { data });
    if (!res.ok()) throw new ApiError(`POST ${url} -> ${res.status()}`, res.status(), url);
    return (await res.json()) as T;
  }

  async patch(path: string, data: unknown): Promise<APIResponse> {
    return this.request.patch(`${this.baseUrl}${path}`, { data });
  }

  async delete(path: string): Promise<APIResponse> {
    return this.request.delete(`${this.baseUrl}${path}`);
  }

  async getRaw(path: string): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}${path}`);
  }

  async postRaw(path: string, data: unknown): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}${path}`, { data });
  }
}
