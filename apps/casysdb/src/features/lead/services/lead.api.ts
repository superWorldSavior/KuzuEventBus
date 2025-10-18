export const DEFAULT_API_BASE: string =
  // Prefer new key if defined in astro.config.mjs define
  (import.meta.env as unknown as Record<string, string | undefined>).CASYS_API_URL
  // Backward compatible public keys
  ?? (import.meta.env as unknown as Record<string, string | undefined>).PUBLIC_CASYS_API_URL
  ?? (import.meta.env as unknown as Record<string, string | undefined>).PUBLIC_API_BASE
  // Local fallback
  ?? 'http://localhost:3001';

export async function getResult<T = unknown>(id: string, apiBase?: string): Promise<T> {
  const base = apiBase ?? DEFAULT_API_BASE;
  const r = await fetch(`${base}/api/lead/result/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('result');
  return (await r.json()) as T;
}

export async function getPreview<T = unknown>(id: string, apiBase?: string): Promise<T> {
  const base = apiBase ?? DEFAULT_API_BASE;
  const r = await fetch(`${base}/api/lead/preview/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('preview');
  return (await r.json()) as T;
}

export async function subscribeLead(domain: string, email: string, apiBase?: string): Promise<unknown> {
  const base = apiBase ?? DEFAULT_API_BASE;
  const r = await fetch(`${base}/api/lead/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ domain, email }),
  });
  if (!r.ok) throw new Error('subscribe');
  return (await r.json()) as unknown;
}

export async function getFull<T = unknown>(id: string, email: string, apiBase?: string): Promise<T> {
  const base = apiBase ?? DEFAULT_API_BASE;
  const r = await fetch(`${base}/api/lead/full/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`, {
    credentials: 'include',
  });
  if (!r.ok) throw new Error('full');
  return (await r.json()) as T;
}
