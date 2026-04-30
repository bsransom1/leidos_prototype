import { combineChunks, stringFromBase64URL } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

const BASE64_PREFIX = 'base64-';
/** Same margin idea as GoTrue (`EXPIRY_MARGIN_MS`); treat near-expiry as no session — layouts refresh separately. */
const EXPIRY_MARGIN_MS = 90_000;

type CookieList = Readonly<{ name: string; value: string }[]>;

function storageCookieKey(supabaseUrl: string): string | null {
  try {
    const host = new URL(supabaseUrl).hostname;
    const ref = host.split('.')[0];
    if (!ref) return null;
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

/**
 * Reads the Supabase session JSON from chunked cookies — no network calls.
 * Skips initializing GoTrueClient in middleware (avoids refresh storms + noisy console.errors when Auth is unreachable).
 */
export async function getUserStubFromCookies(
  getCookies: () => CookieList | Promise<CookieList>,
  supabaseUrl: string | undefined,
): Promise<{ id: string } | null> {
  if (!supabaseUrl) return null;

  const key = storageCookieKey(supabaseUrl);
  if (!key) return null;

  const all = await getCookies();
  const chunked = await combineChunks(key, async (chunkName: string) => {
    const c = all.find((x) => x.name === chunkName);
    return c?.value ?? null;
  });
  if (!chunked) return null;

  let json = chunked;
  if (chunked.startsWith(BASE64_PREFIX)) {
    try {
      json = stringFromBase64URL(chunked.slice(BASE64_PREFIX.length));
    } catch {
      return null;
    }
  }

  try {
    const session = JSON.parse(json) as { user?: { id?: string }; expires_at?: number };
    const id = session.user?.id;
    if (!id || typeof session.expires_at !== 'number') return null;

    const expiresAtMs = session.expires_at * 1000;
    if (Date.now() > expiresAtMs - EXPIRY_MARGIN_MS) return null;

    return { id };
  } catch {
    return null;
  }
}

export function middlewareCookieReader(request: NextRequest) {
  return () => request.cookies.getAll();
}
