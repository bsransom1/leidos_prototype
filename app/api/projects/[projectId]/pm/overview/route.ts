import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole } from '@/lib/pm-access';
import { isPostgrestMissingColumnError } from '@/lib/postgrest-helpers';
import { differenceInDays } from 'date-fns';

const PROPOSAL_PM_SELECT =
  'title, status, contract_number, period_of_performance_start, period_of_performance_end, cmmc_level, awarded_at, total_contract_value, cost_share_amount';

type ProposalPmOverview = {
  title: string;
  status: string;
  contract_number: string | null;
  period_of_performance_start: string | null;
  period_of_performance_end: string | null;
  cmmc_level: string | null;
  awarded_at: string | null;
  total_contract_value: number | null;
  cost_share_amount: number | null;
};

function emptyAwardColumns(base: { title: string; status: string }): ProposalPmOverview {
  return {
    title: base.title,
    status: base.status,
    contract_number: null,
    period_of_performance_start: null,
    period_of_performance_end: null,
    cmmc_level: null,
    awarded_at: null,
    total_contract_value: null,
    cost_share_amount: null,
  };
}

export async function GET(
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
  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let proposal: ProposalPmOverview | null = null;

  const full = await supabase
    .from('proposals')
    .select(PROPOSAL_PM_SELECT)
    .eq('id', projectId)
    .single();

  if (!full.error && full.data) {
    proposal = full.data as ProposalPmOverview;
  } else if (full.error && isPostgrestMissingColumnError(full.error)) {
    const minimal = await supabase
      .from('proposals')
      .select('title, status')
      .eq('id', projectId)
      .single();
    if (!minimal.error && minimal.data) {
      proposal = emptyAwardColumns(minimal.data);
    }
  }

  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (proposal.status !== 'awarded') {
    return NextResponse.json({ error: 'Project is not awarded' }, { status: 400 });
  }

  const { data: phases } = await supabase
    .from('pm_phases')
    .select('id, phase_number, title, start_date, end_date, obligated_amount, spent_to_date, invoiced_amount, burn_rate_plan, status')
    .eq('proposal_id', projectId)
    .order('phase_number');

  const phaseIds = (phases ?? []).map((p) => p.id);
  let milestones: Array<{
    id: string;
    phase_id: string;
    title: string;
    due_date: string;
    payment_amount: number;
    status: string;
    owner_id: string | null;
  }> = [];

  if (phaseIds.length) {
    const { data: ms } = await supabase
      .from('pm_milestones')
      .select('id, phase_id, title, due_date, payment_amount, status, owner_id')
      .in('phase_id', phaseIds);
    milestones = ms ?? [];
  }

  const { data: team } = await supabase
    .from('pm_team_members')
    .select('id, name, org_name')
    .eq('proposal_id', projectId);

  const teamMap = new Map((team ?? []).map((t) => [t.id, t]));

  const byStatus = (s: string) => milestones.filter((m) => m.status === s).length;
  const acceptedCount = byStatus('accepted');
  const atRisk = byStatus('at_risk');
  const missed = byStatus('missed');

  const popEndStr = proposal.period_of_performance_end;
  const popStartStr = proposal.period_of_performance_start;
  const popEnd = popEndStr ? new Date(popEndStr) : null;
  const popStart = popStartStr ? new Date(popStartStr) : popEnd ?? new Date();

  let daysRemaining: number | null = null;
  let popCompleted = false;
  if (popEnd) {
    const d = differenceInDays(popEnd, new Date());
    if (d < 0) {
      popCompleted = true;
    } else {
      daysRemaining = d;
    }
  }

  const phaseProgress = (phases ?? []).map((ph) => {
    const ms = milestones.filter((m) => m.phase_id === ph.id);
    const acc = ms.filter((m) => m.status === 'accepted').length;
    const pct = ms.length ? Math.round((acc / ms.length) * 100) : 0;
    return {
      phaseId: ph.id,
      phaseNumber: ph.phase_number,
      title: ph.title,
      start: ph.start_date,
      end: ph.end_date,
      status: ph.status,
      percentAccepted: pct,
      milestoneCount: ms.length,
    };
  });

  const upcoming = [...milestones]
    .filter((m) => new Date(m.due_date) >= new Date() || ['upcoming', 'in_progress', 'at_risk'].includes(m.status))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 12)
    .map((m) => {
      const ph = phases?.find((p) => p.id === m.phase_id);
      const owner = m.owner_id ? teamMap.get(m.owner_id) : null;
      return {
        id: m.id,
        title: m.title,
        phase: ph?.title ?? '',
        dueDate: m.due_date,
        paymentAmount: m.payment_amount,
        status: m.status,
        ownerName: owner?.name ?? '—',
      };
    });

  const totalSpent = (phases ?? []).reduce((s, p) => s + Number(p.spent_to_date ?? 0), 0);
  const totalObl = (phases ?? []).reduce((s, p) => s + Number(p.obligated_amount ?? 0), 0);
  const totalDays = Math.max(1, popEnd ? differenceInDays(popEnd, popStart) : 1);
  const burnActual = totalSpent / (totalDays / 30);
  const burnPlan =
    (phases ?? []).reduce((s, p) => s + Number(p.burn_rate_plan ?? 0), 0) / Math.max(1, phases?.length ?? 1);

  const nextMilestone = milestones
    .filter((m) => m.status !== 'accepted' && m.status !== 'missed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const daysToNext = nextMilestone
    ? Math.max(0, differenceInDays(new Date(nextMilestone.due_date), new Date()))
    : null;

  return NextResponse.json({
    proposal: {
      title: proposal.title,
      contractNumber: proposal.contract_number,
      popStart: proposal.period_of_performance_start,
      popEnd: proposal.period_of_performance_end,
      cmmcLevel: proposal.cmmc_level,
      daysRemaining,
      popCompleted,
      totalContractValue: proposal.total_contract_value,
      costShare: proposal.cost_share_amount,
    },
    metrics: {
      totalMilestones: milestones.length,
      accepted: acceptedCount,
      atRisk,
      missed,
      burnRateActual: burnActual,
      burnRatePlan: burnPlan,
      daysToNextMilestone: daysToNext,
    },
    phaseProgress,
    upcomingMilestones: upcoming,
    role,
  });
}
