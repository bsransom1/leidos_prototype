import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';
import { deletePmDataForProposal, insertLeidosPmDemoSeed } from '@/lib/pm-seed';
import { addMonths, subMonths } from 'date-fns';
import { isPostgrestMissingColumnError } from '@/lib/postgrest-helpers';

/** Demo-only: reset PM tables and reload Leidos/DARPA I2O seed. */
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

  const del = await deletePmDataForProposal(supabase, projectId);
  if (!del.ok) {
    return NextResponse.json({ error: del.error ?? 'Delete failed' }, { status: 500 });
  }

  const now = new Date();
  const popStart = subMonths(now, 6);
  const popEnd = addMonths(now, 30);
  const contractNumber = 'HR001126C0042';

  const ins = await insertLeidosPmDemoSeed(supabase, projectId, { contractNumber, popStart, popEnd });
  if (!ins.ok) {
    return NextResponse.json({ error: ins.error ?? 'Insert failed' }, { status: 500 });
  }

  const awardPatch = {
    contract_number: contractNumber,
    period_of_performance_start: popStart.toISOString().slice(0, 10),
    period_of_performance_end: popEnd.toISOString().slice(0, 10),
    total_contract_value: 4_750_000,
    cost_share_amount: 0,
    total_invoiced: 1_240_000,
    cmmc_level: 'Level 2',
  };

  const { error: updErr } = await supabase.from('proposals').update(awardPatch).eq('id', projectId);
  if (updErr && !isPostgrestMissingColumnError(updErr)) {
    return NextResponse.json(
      { success: true, message: 'PM data reseeded; proposal metadata update failed', warning: updErr.message },
      { status: 200 }
    );
  }

  return NextResponse.json({ success: true, message: 'PM data reseeded' });
}
