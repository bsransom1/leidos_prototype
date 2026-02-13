import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProposalDetailClient from './proposal-detail-client';

export default async function ProposalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !proposal) {
    redirect('/dashboard');
  }

  return <ProposalDetailClient proposal={proposal} user={user} />;
}
