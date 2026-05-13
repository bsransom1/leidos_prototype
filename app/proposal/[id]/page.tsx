import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPmRole } from '@/lib/pm-access';
import ProposalDetailClient from './proposal-detail-client';

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !proposal) {
    redirect('/dashboard');
  }

  const effectiveRole = await getPmRole(supabase, user.id, user.email ?? undefined, id);
  if (!effectiveRole) {
    redirect('/dashboard');
  }

  return <ProposalDetailClient proposal={proposal} user={user} effectiveRole={effectiveRole} />;
}
