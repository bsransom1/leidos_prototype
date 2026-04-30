import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PmDashboardClient from './pm-dashboard-client';

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

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('id, title, status')
    .eq('id', projectId)
    .single();

  if (error || !proposal) redirect('/dashboard');

  if (proposal.status !== 'awarded') {
    redirect(`/dashboard/projects/${projectId}`);
  }

  return <PmDashboardClient projectId={projectId} title={proposal.title} />;
}
