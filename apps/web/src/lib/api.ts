const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('astra_token') ?? '';
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { message?: string };
      throw new Error(j.message ?? (text || res.statusText));
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
      throw new Error(text || res.statusText);
    }
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('astra_token', token);
}
