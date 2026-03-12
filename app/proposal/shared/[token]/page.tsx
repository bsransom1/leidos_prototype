import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SharedProposalView from './shared-proposal-client';

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Get collaborator by token (allow both pending and accepted)
  const { data: collaborator, error: collaboratorError } = await supabase
    .from('proposal_collaborators')
    .select('*, proposals(*)')
    .eq('invitation_token', token)
    .in('status', ['pending', 'accepted'])
    .single();

  if (collaboratorError || !collaborator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="bg-white border border-[#d1d5db] p-6 max-w-md w-full">
          <h1 className="text-lg font-semibold text-[#1a1a1a] mb-2">Invalid Invitation</h1>
          <p className="text-sm text-[#6b7280]">
            This invitation link is invalid or has expired. Please contact the proposal owner for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // Mark invitation as accepted if user is logged in with matching email
  const { data: { user } } = await supabase.auth.getUser();
  let isAuthenticated = false;
  
  if (user && user.email?.toLowerCase() === collaborator.email.toLowerCase()) {
    isAuthenticated = true;
    // Update status to accepted if still pending
    if (collaborator.status === 'pending') {
      await supabase
        .from('proposal_collaborators')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', collaborator.id);
    }
  }

  const proposal = collaborator.proposals as any;

  return (
    <SharedProposalView 
      proposal={proposal}
      collaboratorEmail={collaborator.email}
      invitationToken={token}
      isAuthenticated={isAuthenticated}
    />
  );
}
