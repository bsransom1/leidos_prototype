import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';
import { seedPmFromIngest } from '@/lib/pm-seed-from-ingest';

/** Reseed PM tables from the proposal's own BAA + org JSON ingest data. */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!isAdmin(role)) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const { data: proposal, error: pErr } = await supabase
    .from('proposals')
    .select('id, status')
    .eq('id', projectId)
    .single();

  if (pErr || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (proposal.status !== 'awarded') {
    return NextResponse.json({ error: 'Proposal must be awarded to reseed PM data' }, { status: 400 });
  }

  const result = await seedPmFromIngest(supabase, projectId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Reseed failed' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'PM data reseeded from proposal ingest',
    pm_profile: result.profile,
  });
}
