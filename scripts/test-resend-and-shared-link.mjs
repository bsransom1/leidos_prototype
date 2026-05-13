#!/usr/bin/env node
/**
 * Smoke test: Resend API + shared proposal invite link (BAA + generated proposal data).
 *
 * What this validates
 * -------------------
 * 1. Resend: GET /emails proves the API key is accepted (no spam send required).
 *    With RESEND_TEST_TO set, also POST a real message containing the same URL as invitations.
 * 2. Shared link payload: Supabase REST as `anon` loads `proposal_collaborators` + nested
 *    `proposals` by `invitation_token` — same access path as `/proposal/shared/[token]` for
 *    guests (requires `supabase/fix_shared_proposal_anon_access.sql` on the project).
 * 3. BAA / proposal document: JSON in `baa_input` and `generated_output` must parse and
 *    include fields the shared viewer UI needs (`shared-proposal-client.tsx`).
 * 4. Optional: HTTP GET the running app at `${NEXT_PUBLIC_APP_URL}/proposal/shared/<token>`
 *    must return 200 and must not contain the "Invalid or expired invitation" SSR branch.
 *
 * Usage
 * -----
 *   node --env-file=.env.local scripts/test-resend-and-shared-link.mjs
 *   node --env-file=.env.local scripts/test-resend-and-shared-link.mjs --token=<uuid>
 *
 * Env
 * ---
 *   SHARED_INVITE_TOKEN   (or --token=)  invitation_token from proposal_collaborators
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   RESEND_API_KEY        optional; if set, validates via Resend API
 *   RESEND_TEST_TO        optional; if set with RESEND_API_KEY, sends one test email
 *   RESEND_FROM_EMAIL     optional (default onboarding@resend.dev)
 *   NEXT_PUBLIC_APP_URL   optional; if set, fetches the shared page HTML (run `npm run dev`)
 */

function trimEnv(v) {
  return v?.trim().replace(/^["']|["']$/g, '') ?? '';
}

function fail(msg, code = 1) {
  console.error(`\n✖ ${msg}`);
  process.exit(code);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠ ${msg}`);
}

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) return [m[1], m[2]];
    return [a, true];
  }),
);

const token =
  trimEnv(process.env.SHARED_INVITE_TOKEN) ||
  (typeof argv.token === 'string' ? argv.token.trim() : '');

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!token || !uuidRe.test(token)) {
  fail(
    'Set SHARED_INVITE_TOKEN (UUID) or pass --token=<uuid>.\n' +
      '  Tip: invite a collaborator and copy `invitationLink` from the JSON response, or read `invitation_token` from Supabase.',
  );
}

const supabaseUrl = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
if (!supabaseUrl || !anonKey) {
  fail('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const appUrl = (trimEnv(process.env.NEXT_PUBLIC_APP_URL) || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const expectedPath = `/proposal/shared/${token}`;
const expectedUrl = `${appUrl}${expectedPath}`;

const resendKey = trimEnv(process.env.RESEND_API_KEY);
const resendTestTo = trimEnv(process.env.RESEND_TEST_TO);
const resendFrom = trimEnv(process.env.RESEND_FROM_EMAIL) || 'onboarding@resend.dev';

console.log('\n── Resend + shared proposal link smoke test ──\n');
console.log(`Token:     ${token}`);
console.log(`Link:      ${expectedUrl}\n`);

// ── 1) Supabase anon: same embed as SharedProposalPage ─────────────────────
const restUrl = new URL(
  `${supabaseUrl.replace(/\/$/, '')}/rest/v1/proposal_collaborators`,
);
restUrl.searchParams.set(
  'select',
  'email,status,invitation_token,proposals(title,baa_input,generated_output)',
);
restUrl.searchParams.set('invitation_token', `eq.${token}`);
restUrl.searchParams.set('status', 'in.(pending,accepted)');

const sbRes = await fetch(restUrl, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: 'application/json',
  },
  signal: AbortSignal.timeout(20000),
});

if (!sbRes.ok) {
  const t = await sbRes.text();
  fail(
    `Supabase REST failed (${sbRes.status}): ${t.slice(0, 500)}\n` +
      '  Check URL/key and that fix_shared_proposal_anon_access.sql policies exist.',
  );
}

const rows = await sbRes.json();
if (!Array.isArray(rows) || rows.length === 0) {
  fail(
    'No proposal_collaborators row for this token (or anon RLS blocked SELECT).\n' +
      '  Run supabase/fix_shared_proposal_anon_access.sql if external viewers cannot open links.',
  );
}

const row = rows[0];
const proposal = row.proposals;
if (!proposal || typeof proposal !== 'object') {
  fail('Nested `proposals` missing — FK embed failed or RLS blocked proposal row for anon.');
}

ok(`Anon read: collaborator ${row.email} (${row.status}) → proposal "${proposal.title}"`);

let baa;
let generated;
try {
  if (!proposal.baa_input || typeof proposal.baa_input !== 'string') {
    fail('proposals.baa_input is empty — shared page cannot show BAA metadata.');
  }
  baa = JSON.parse(proposal.baa_input);
} catch (e) {
  fail(`baa_input is not valid JSON: ${e?.message ?? e}`);
}

try {
  if (!proposal.generated_output || typeof proposal.generated_output !== 'string') {
    fail(
      'proposals.generated_output is empty — shared page shows "Generation in progress" only.',
    );
  }
  generated = JSON.parse(proposal.generated_output);
} catch (e) {
  fail(`generated_output is not valid JSON: ${e?.message ?? e}`);
}

if (baa == null || typeof baa !== 'object') {
  fail('Parsed baa_input must be an object.');
}
if (generated == null || typeof generated !== 'object') {
  fail('Parsed generated_output must be an object.');
}

if (!Array.isArray(generated.sections) || generated.sections.length === 0) {
  warn('generated_output.sections is missing or empty — document may look bare in the UI.');
} else {
  ok(`BAA JSON OK; generated proposal has ${generated.sections.length} section(s).`);
}

// ── 2) Resend API ───────────────────────────────────────────────────────────
if (!resendKey) {
  warn('RESEND_API_KEY not set — skipping Resend HTTP checks.');
} else {
  const listRes = await fetch('https://api.resend.com/emails', {
    method: 'GET',
    headers: { Authorization: `Bearer ${resendKey}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!listRes.ok) {
    const t = await listRes.text();
    fail(`Resend API key rejected (${listRes.status}): ${t.slice(0, 400)}`);
  }
  ok('Resend API key accepted (GET /emails).');

  if (resendTestTo) {
    const subject = `[P.A.S.S. smoke test] Shared proposal link — ${proposal.title || 'untitled'}`;
    const html = `<!DOCTYPE html><html><body>
<p>This is an automated smoke test. The invitation-style URL is:</p>
<p><a href="${expectedUrl}">${expectedUrl}</a></p>
<p>Open it in a private window (not logged in as owner) to confirm the BAA proposal viewer loads.</p>
</body></html>`;
    const text = `Smoke test shared link:\n${expectedUrl}\n\nOpen in a private window to verify the BAA proposal viewer.`;

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [resendTestTo],
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const sendBody = await sendRes.text();
    if (!sendRes.ok) {
      fail(`Resend POST /emails failed (${sendRes.status}): ${sendBody.slice(0, 600)}`);
    }
    let sendJson;
    try {
      sendJson = JSON.parse(sendBody);
    } catch {
      fail(`Resend returned non-JSON: ${sendBody.slice(0, 200)}`);
    }
    if (sendJson?.id) {
      ok(`Test email queued to ${resendTestTo} (id: ${sendJson.id}).`);
    } else {
      fail(`Unexpected Resend response: ${sendBody.slice(0, 400)}`);
    }

    if (!html.includes(`href="${expectedUrl}"`)) {
      fail('Internal error: outbound HTML missing expected href (script bug).');
    }
    ok('Outbound HTML contains the exact shared proposal URL (matches invite link shape).');
  } else {
    warn('RESEND_TEST_TO not set — skipped sending a test email (API key only validated).');
  }
}

// ── 3) Optional: running Next app ─────────────────────────────────────────
try {
  const pageUrl = `${appUrl}${expectedPath}`;
  const pageRes = await fetch(pageUrl, {
    redirect: 'manual',
    headers: { Accept: 'text/html' },
    signal: AbortSignal.timeout(20000),
  });
  if (pageRes.status >= 300 && pageRes.status < 400) {
    warn(`GET ${pageUrl} → ${pageRes.status} redirect (not followed).`);
  } else if (!pageRes.ok) {
    warn(`GET ${pageUrl} → ${pageRes.status} (is the dev server running?)`);
  } else {
    const html = await pageRes.text();
    if (html.includes('Invalid or expired invitation')) {
      fail(
        'Fetched shared page HTML contains "Invalid or expired invitation" — server could not load this token (cookies/session or RLS differ from REST?).',
      );
    }
    ok(`GET ${expectedPath} → ${pageRes.status} (no invalid-invitation SSR marker).`);
    if (html.includes('Loading proposal')) {
      ok('SSR includes client loading shell (expected before hydration).');
    }
  }
} catch (e) {
  warn(`Could not fetch ${appUrl}${expectedPath}: ${e?.message ?? e}`);
}

console.log('\n── All checks passed ──\n');
