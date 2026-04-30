import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CreateProposalClient from './create-client';

export default async function CreateProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;
  
  // If id is provided, load existing proposal
  let proposalData = null;
  if (params.id) {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error loading proposal:', error);
    }

    if (proposal) {
      if (proposal.status === 'awarded') {
        redirect(`/dashboard/projects/${proposal.id}/pm`);
      }
      proposalData = proposal;
      console.log('Loaded proposal:', {
        id: proposal.id,
        current_step: proposal.current_step,
        has_baa: !!proposal.baa_input,
        has_proposal: !!proposal.generated_output,
      });
    }
  }

  return <CreateProposalClient user={user} existingProposal={proposalData} />;
}
