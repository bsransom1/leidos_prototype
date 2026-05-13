import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, type PmRole } from '@/lib/pm-access';
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
  let effectiveRole: PmRole = 'admin';

  if (params.id) {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error loading proposal:', error);
    }

    if (proposal) {
      if (proposal.status === 'awarded') {
        redirect(`/dashboard/projects/${proposal.id}/pm`);
      }
      proposalData = proposal;
      const r = await getPmRole(supabase, user.id, user.email ?? undefined, proposal.id);
      if (!r) {
        redirect('/dashboard');
      }
      effectiveRole = r;
      console.log('Loaded proposal:', {
        id: proposal.id,
        current_step: proposal.current_step,
        has_baa: !!proposal.baa_input,
        has_proposal: !!proposal.generated_output,
        effectiveRole,
      });
    }
  }

  return <CreateProposalClient user={user} existingProposal={proposalData} effectiveRole={effectiveRole} />;
}
