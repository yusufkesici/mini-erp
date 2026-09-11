// VITE_API_BASE_URL açıkça verilmemişse aynı origin üzerinden /api'ye (bkz. vite.config.ts
// server.proxy) istek atılır — hem localhost'tan hem telefon/LAN IP'sinden erişimde, hem
// HTTP hem HTTPS altında doğru çalışır. Mutlak bir http://host:3000 URL'i kullanmak,
// frontend HTTPS (mkcert, kamera erişimi için) iken "mixed content" engeline takılıyordu:
// localhost tarayıcılarca güvenli sayıldığından PC'de fark edilmiyordu, ama telefon LAN
// IP'sinden bağlanınca tarayıcı insecure http:// isteğini sessizce engelliyordu.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_KEY_STORAGE_KEY = 'mini-erp-api-key';

export class ApiError extends Error {
  statusCode: number;
  messages: string[];

  constructor(statusCode: number, messages: string[]) {
    super(messages.join(', '));
    this.statusCode = statusCode;
    this.messages = messages;
  }
}

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

// 401 aldığımızda (geçersiz/eksik anahtar) ApiKeyGate'in yeniden anahtar istemesi için kayıtlı callback
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearApiKey();
    onUnauthorized?.();
  }

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
