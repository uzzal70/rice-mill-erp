const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type Session = {
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
  user: { id: string; email: string; fullName: string };
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem('rice-mill-session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    window.sessionStorage.removeItem('rice-mill-session');
    return null;
  }
}

export function writeSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (session) window.sessionStorage.setItem('rice-mill-session', JSON.stringify(session));
  else window.sessionStorage.removeItem('rice-mill-session');
}

async function decode<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { message?: string | string[]; data?: T } | T | null;
  if (!response.ok) {
    const raw = payload && typeof payload === 'object' && 'message' in payload ? payload.message : undefined;
    const message = Array.isArray(raw) ? raw.join(', ') : raw || 'The request could not be completed.';
    throw new ApiError(response.status, message);
  }
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) return payload.data as T;
  return payload as T;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const session = authenticated ? readSession() : null;
  const headers = new Headers(options.headers);
  if (options.body && !(typeof FormData !== 'undefined' && options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);

  let response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' });
  if (response.status === 401 && authenticated && session?.refreshToken && !path.includes('/auth/refresh')) {
    const refresh = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!refresh.ok) {
      writeSession(null);
      throw new ApiError(401, 'Your session expired. Please sign in again.');
    }
    const tokens = await decode<{ accessToken: string; refreshToken: string }>(refresh);
    const nextSession = { ...session, ...tokens };
    writeSession(nextSession);
    const retryHeaders = new Headers(headers);
    retryHeaders.set('Authorization', `Bearer ${tokens.accessToken}`);
    response = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders, cache: 'no-store' });
  }
  return decode<T>(response);
}

export async function apiDownload(path: string): Promise<Blob> {
  const session = readSession();
  const headers = new Headers();
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);

  let response = await fetch(`${API_URL}${path}`, { headers, cache: 'no-store' });
  if (response.status === 401 && session?.refreshToken && !path.includes('/auth/refresh')) {
    const refresh = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!refresh.ok) {
      writeSession(null);
      throw new ApiError(401, 'Your session expired. Please sign in again.');
    }
    const tokens = await decode<{ accessToken: string; refreshToken: string }>(refresh);
    const nextSession = { ...session, ...tokens };
    writeSession(nextSession);
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    response = await fetch(`${API_URL}${path}`, { headers, cache: 'no-store' });
  }
  if (!response.ok) {
    await decode(response);
    throw new ApiError(response.status, 'The file could not be downloaded.');
  }
  return response.blob();
}

export function queryString(values: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.toString();
}
