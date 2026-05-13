import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isPostgrestMissingColumnError } from '@/lib/postgrest-helpers';
import { repairPmSeedIfBroken } from '@/lib/pm-seed';
import PmDashboardClient from './pm-dashboard-client';

const AWARD_DATE_SELECT =
  'id, title, status, contract_number, period_of_performance_start, period_of_performance_end';

export default async function PmDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const full = await supabase.from('proposals').select(AWARD_DATE_SELECT).eq('id', projectId).single();

  let proposal: { id: string; title: string; status: string };
  let seedMeta: {
    contract_number: string | null;
    period_of_performance_start: string | null;
    period_of_performance_end: string | null;
  } = {
    contract_number: null,
    period_of_performance_start: null,
    period_of_performance_end: null,
  };

  if (!full.error && full.data) {
    proposal = full.data;
    seedMeta = {
      contract_number: full.data.contract_number ?? null,
      period_of_performance_start: full.data.period_of_performance_start ?? null,
      period_of_performance_end: full.data.period_of_performance_end ?? null,
    };
  } else if (full.error && isPostgrestMissingColumnError(full.error)) {
    const minimal = await supabase.from('proposals').select('id, title, status').eq('id', projectId).single();
    if (minimal.error || !minimal.data) redirect('/dashboard');
    proposal = minimal.data;
  } else {
    redirect('/dashboard');
  }

  if (proposal.status !== 'awarded') {
    redirect(`/dashboard/projects/${projectId}`);
  }

  const repair = await repairPmSeedIfBroken(supabase, projectId, seedMeta);
  if (!repair.ok) {
    console.error('[pm/page] repairPmSeedIfBroken failed', repair.error);
  }

  return <PmDashboardClient projectId={projectId} title={proposal.title} />;
}
