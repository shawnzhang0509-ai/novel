import type { SimpleStore } from '@/types/simple';

const SYNC_CODE_KEY = 'snake-sync-code-v1';

export function loadSyncCode(): string {
  try {
    return localStorage.getItem(SYNC_CODE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveSyncCode(code: string) {
  localStorage.setItem(SYNC_CODE_KEY, code.trim());
}

/** 生成可读同步码（本机记住；换设备手动输入同一串即可拉回） */
export function generateSyncCode(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export async function cloudPull(code: string): Promise<{
  ok: boolean;
  data?: SimpleStore | null;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/store?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: { 'x-sync-code': code },
    });
    const json = (await res.json()) as { data?: SimpleStore | null; error?: string };
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return { ok: true, data: json.data ?? null };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function cloudPush(
  code: string,
  store: SimpleStore
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/store', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-code': code,
      },
      body: JSON.stringify(store),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
