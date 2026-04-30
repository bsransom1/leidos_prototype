#!/usr/bin/env node
/**
 * Validates outbound reachability + URL/key ref alignment (runs locally against .env.local).
 * Usage: node --env-file=.env.local scripts/check-supabase.mjs
 */
import dns from 'node:dns/promises';

function decodeJwtPayload(jwt) {
  const [, payload] = jwt.split('.');
  if (!payload) return null;
  const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
    'utf8',
  );
  return JSON.parse(json);
}

const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '');
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '');

if (!urlRaw || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

let hostRef;
try {
  hostRef = new URL(urlRaw).hostname.split('.')[0];
} catch {
  console.error('Invalid NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

const payload = decodeJwtPayload(anon);
const jwtRef = payload?.ref;
console.log(`URL project ref (hostname): ${hostRef}`);
console.log(`Anon JWT ref claim:           ${jwtRef ?? '(missing)'}`);
if (jwtRef && jwtRef !== hostRef) {
  console.warn('⚠ Mismatch — anon key belongs to a different project than the URL.');
}

let hostname;
try {
  hostname = new URL(urlRaw).hostname;
} catch {
  hostname = null;
}

if (hostname) {
  console.log(`\nDNS lookup: ${hostname}`);
  try {
    const r = await dns.lookup(hostname);
    console.log(`  → ${r.address} (${r.family === 4 ? 'IPv4' : 'IPv6'})`);
  } catch (e) {
    console.error(`  → FAILED: ${e.code ?? ''} ${e.message}`.trim());
    console.error(
      '  No A/AAAA record usually means the project ref is wrong, the project was removed, or DNS is blocked.',
    );
    process.exitCode = 1;
  }
}

console.log('');
try {
  const res = await fetch(`${urlRaw.replace(/\/$/, '')}/auth/v1/health`, {
    signal: AbortSignal.timeout(12000),
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
  console.log(`GET /auth/v1/health → ${res.status} ${res.statusText}`);
  if (!res.ok) process.exitCode = 1;
} catch (err) {
  console.error('HTTPS fetch failed:', err?.message ?? err);
  const c = err?.cause;
  if (c && typeof c === 'object' && 'code' in c) {
    console.error('  cause.code:', c.code, c.syscall ? `(${c.syscall})` : '');
  } else if (c) {
    console.error('  cause:', c);
  }
  console.error(
    '\nNext steps: Supabase Dashboard → Project Settings → API → copy "Project URL" and keys again.',
  );
  console.error(
    'If the dashboard has no project with this ref, create a project (or restore) and update .env.local.',
  );
  process.exitCode = 1;
}
