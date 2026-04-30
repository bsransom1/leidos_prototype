import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole } from '@/lib/pm-access';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: proposal } = await supabase
    .from('proposals')
    .select('total_contract_value, cost_share_amount, total_invoiced')
    .eq('id', projectId)
    .single();

  const { data: phases } = await supabase
    .from('pm_phases')
    .select('*')
    .eq('proposal_id', projectId)
    .order('phase_number');

  const rows = (phases ?? []).map((p) => {
    const obligated = Number(p.obligated_amount ?? 0);
    const invoiced = Number(p.invoiced_amount ?? 0);
    const spent = Number(p.spent_to_date ?? 0);
    const remaining = Math.max(0, obligated - invoiced);
    const plan = Number(p.burn_rate_plan ?? 0);
    const actual = plan > 0 ? spent / plan : 0;
    let health: 'green' | 'yellow' | 'red' = 'green';
    if (actual > 1.2) health = 'red';
    else if (actual > 1.05) health = 'yellow';

    return {
      phaseId: p.id,
      phaseNumber: p.phase_number,
      title: p.title,
      obligated,
      invoiced,
      spent,
      remaining,
      burnRatePlan: plan,
      burnRateActual: spent > 0 ? spent / Math.max(1, 30) : 0,
      health,
      status: p.status,
    };
  });

  const totalObl = rows.reduce((s, r) => s + r.obligated, 0);
  const totalInv = rows.reduce((s, r) => s + r.invoiced, 0);
  const totalRem = rows.reduce((s, r) => s + r.remaining, 0);

  return NextResponse.json({
    proposal: {
      totalContractValue: proposal?.total_contract_value ?? 0,
      costShare: proposal?.cost_share_amount ?? 0,
      totalInvoiced: proposal?.total_invoiced ?? totalInv,
    },
    phases: rows,
    totals: {
      obligated: totalObl,
      invoiced: totalInv,
      remaining: totalRem,
    },
    role,
  });
}
