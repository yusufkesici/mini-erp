const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  statusCode: number;
  messages: string[];

  constructor(statusCode: number, messages: string[]) {
    super(messages.join(', '));
    this.statusCode = statusCode;
    this.messages = messages;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    let messages: string[] = [`İstek başarısız oldu (HTTP ${res.status})`];
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) messages = body.message;
      else if (typeof body.message === 'string') messages = [body.message];
    } catch {
      // gövde JSON değilse varsayılan mesaj kullanılır
    }
    throw new ApiError(res.status, messages);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
